import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmLast, fresh, photo, say, share, toCardStep, toProposal } from "./helpers";
import { handleObservation } from "../src/flow/orchestrator";
import { getSession, endSession } from "../src/state/sessionStore";
import { listReceipts } from "../src/receipts/store";
import { listCalendar } from "../src/tools/index";

test("happy path: profile reuse, one question at a time, card, back-card error, confirm, receipt", async () => {
  const sid = fresh();
  let r = await say(sid, "RELAY, stay with me. The clerk wants me to register.");
  assert.equal(r.state, "COLLECT_MISSING");
  assert.equal(r.field, "__confirm_profile");
  assert.equal(r.next_input, "choice");
  assert.match(r.assistant_message, /Evelyn Brooks/);

  r = await say(sid, "yes");
  assert.equal(r.field, "dob");
  assert.equal(r.next_input, "voice");
  r = await say(sid, "12 March 1950");
  assert.equal(r.field, "emergency_contact");
  r = await say(sid, "Maya");
  assert.equal(r.field, "sms_reminders");
  r = await say(sid, "yes");
  assert.equal(r.field, "reason_for_visit");
  r = await say(sid, "annual check-up");
  assert.equal(r.field, "insurance_front");
  assert.equal(r.next_input, "camera");
  r = await photo(sid, "fixture:insurance_front");
  assert.equal(r.field, "appointment_slot");
  assert.equal(r.choices.length, 3);

  r = await say(sid, "the first one");
  assert.equal(r.state, "WAIT_CONFIRMATION");
  assert.equal(r.next_input, "confirm");
  assert.ok(r.action_proposal);
  assert.equal(r.action_proposal.verdict, "ASK_USER");
  assert.equal(r.action_proposal.risk_tier, 2);
  assert.ok(r.action_proposal.sensitive_fields.includes("Date of birth"));
  assert.ok(r.action_proposal.payload_summary.some((l) => l.startsWith("Full name: Evelyn Brooks (from your profile, confirmed)")));
  const firstHash = r.action_proposal.payload_hash;

  // Confirm -> clinic rejects: back of card missing -> translated, re-asked, nothing submitted.
  r = await confirmLast(sid, r);
  assert.equal(r.state, "COLLECT_MISSING");
  assert.equal(r.field, "insurance_back");
  assert.match(r.assistant_message, /back of your insurance card/);
  assert.match(r.assistant_message, /Nothing was submitted yet/);
  assert.equal(listReceipts().filter((x) => x.result === "success").length, 0);

  r = await photo(sid, "fixture:insurance_back");
  assert.equal(r.state, "WAIT_CONFIRMATION");
  assert.notEqual(r.action_proposal?.payload_hash, firstHash, "payload changed, so the hash and confirmation must change");

  r = await confirmLast(sid, r);
  assert.equal(r.state, "RECEIPT");
  assert.equal(r.next_input, "none");
  assert.ok(r.receipt?.confirmation_code?.startsWith("DEMO-"));
  assert.match(r.receipt?.follow_up ?? "", /Calendar: Sep 18/);
  assert.equal(listCalendar().length, 1);
  const success = listReceipts().filter((x) => x.result === "success");
  assert.equal(success.length, 1);
  assert.equal(success[0].confirmed_by_user, true);
  assert.ok(!JSON.stringify(success[0]).includes("12 March 1950"), "receipts reference, never copy, sensitive answers");
});

test("stop cancels a pending action; continue resumes at the same question; a direct answer also resumes", async () => {
  const sid = fresh();
  let r = await toProposal(sid);
  assert.equal(r.state, "WAIT_CONFIRMATION");
  r = await say(sid, "stop");
  assert.equal(r.state, "CANCELLED");
  assert.equal(getSession(sid)?.pending_action, null);
  r = await say(sid, "continue");
  assert.equal(r.state, "WAIT_CONFIRMATION");
  assert.ok(r.action_proposal);

  const sid2 = fresh();
  r = await toCardStep(sid2);
  assert.equal(r.field, "insurance_front");
  await say(sid2, "hold on");
  r = await say(sid2, "I don't have the card with me");
  assert.equal(r.state, "COLLECT_MISSING");
  assert.match(r.assistant_message, /pause here/);
});

test("changing an answer while reviewing forces a new proposal with a new hash", async () => {
  const sid = fresh();
  let r = await toProposal(sid);
  const before = r.action_proposal!.payload_hash;
  r = await say(sid, "actually my phone number changed");
  assert.equal(r.state, "COLLECT_MISSING");
  assert.equal(r.field, "phone");
  r = await say(sid, "+1-555-999-0000");
  assert.equal(r.state, "WAIT_CONFIRMATION");
  assert.notEqual(r.action_proposal!.payload_hash, before);
  assert.ok(r.action_proposal!.payload_summary.some((l) => l === "Phone: +1-555-999-0000 (you told me)"));
});

test("stale confirmation hash re-presents the current proposal instead of executing", async () => {
  const sid = fresh();
  let r = await toProposal(sid);
  const id = r.action_proposal!.action_id;
  r = await confirmLast(sid, r, "confirm", "stale");
  assert.equal(r.state, "WAIT_CONFIRMATION");
  assert.notEqual(r.action_proposal!.action_id, id);
  assert.match(r.assistant_message, /details changed/);
  assert.equal(listReceipts().length, 0);
});

test("reject prevents the action; duplicate confirm returns the receipt without a second submit", async () => {
  const sid = fresh();
  let r = await toProposal(sid);
  r = await confirmLast(sid, r, "reject");
  assert.equal(r.state, "CANCELLED");
  assert.equal(listReceipts().length, 0);

  r = await say(sid, "continue");
  await photo(sid, "fixture:insurance_back").catch(() => undefined); // not asked yet; ignored below
  r = await say(sid, "continue");
  assert.equal(r.state, "WAIT_CONFIRMATION");
  r = await confirmLast(sid, r); // back-card error path
  r = await photo(sid, "fixture:insurance_back");
  const finalProposal = r;
  r = await confirmLast(sid, finalProposal);
  assert.equal(r.state, "RECEIPT");
  const again = await confirmLast(sid, finalProposal);
  assert.match(again.assistant_message, /already submitted/);
  assert.equal(again.receipt?.receipt_id, r.receipt?.receipt_id);
  assert.equal(listReceipts().filter((x) => x.result === "success").length, 1);
});

test("wrong QR destination holds before anything is shared; a correct scan then proceeds", async () => {
  const sid = fresh();
  let r = await say(sid, "https://evil-example.net/register");
  assert.equal(r.state, "HOLD");
  assert.match(r.assistant_message, /evil-example.net/);
  assert.equal(getSession(sid)?.task, null);
  r = await say(sid, "scan again");
  assert.equal(r.state, "START");
  r = await say(sid, "https://demo-clinic.example/register");
  assert.equal(r.state, "COLLECT_MISSING");
  assert.equal(getSession(sid)?.task?.target_domain, "demo-clinic.example");

  const sid2 = fresh();
  r = await photo(sid2, "fixture:qr:https://evil-example.net/x", "qr");
  assert.equal(r.state, "HOLD");
  r = await photo(sid2, "fixture:qr:https://demo-clinic.example/x", "qr");
  assert.equal(r.state, "COLLECT_MISSING");
});

test("unreadable photo and wrong card side are re-asked, never guessed", async () => {
  const sid = fresh();
  let r = await toCardStep(sid);
  r = await photo(sid, "fixture:unreadable");
  assert.equal(r.field, "insurance_front");
  assert.match(r.assistant_message, /couldn't read/);
  r = await photo(sid, "fixture:insurance_back");
  assert.equal(r.field, "insurance_front");
  assert.match(r.assistant_message, /looks like the back/);
  r = await say(sid, "here you go");
  assert.equal(r.next_input, "camera");
});

test("document/profile name conflict is asked, not guessed", async () => {
  const sid = fresh();
  let r = await toCardStep(sid);
  r = await photo(sid, "fixture:insurance_front:mismatch");
  assert.equal(r.field, "__resolve_name");
  assert.match(r.assistant_message, /Evelyn Brookes/);
  r = await say(sid, "Evelyn Brooks");
  assert.equal(r.field, "appointment_slot");
  assert.equal(getSession(sid)?.task?.known_fields.full_name.provenance, "user");
  assert.equal(getSession(sid)?.task?.conflicts[0].resolved, true);
});

test("a shared payment message is left untouched and offered for verification; a voice payment order is denied", async () => {
  const sid = fresh();
  let r = await toCardStep(sid);
  r = await share(sid, "Urgent — pay $350 now to keep your appointment.");
  assert.match(r.assistant_message, /asks for money/);
  assert.equal(r.next_input, "choice");
  assert.equal(r.state, "COLLECT_MISSING");
  r = await say(sid, "verify");
  assert.match(r.assistant_message, /front desk/);
  assert.equal(r.field, "insurance_front", "returns to the open question");
  assert.equal(getSession(sid)?.follow_ups.length, 1);

  r = await say(sid, "pay 350 dollars to them now");
  assert.match(r.assistant_message, /never do on my own/);
  assert.equal(r.field, "insurance_front");
  assert.equal(listReceipts().filter((x) => x.result === "denied" && x.verdict === "DENY_POLICY").length, 1);
  assert.equal(listCalendar().length, 0);
});

test("profile correction path: something changed -> pick field -> new value", async () => {
  const sid = fresh();
  let r = await say(sid, "help me register at the clinic");
  r = await say(sid, "something changed");
  assert.equal(r.field, "__pick_field");
  r = await say(sid, "email");
  assert.equal(r.field, "email");
  r = await say(sid, "new@example.com");
  assert.equal(r.field, "dob");
  assert.equal(getSession(sid)?.task?.known_fields.email.value, "new@example.com");
  assert.equal(getSession(sid)?.task?.known_fields.email.provenance, "user");
});

test("start over, ended sessions, unknown sessions, and after-receipt behaviour", async () => {
  const sid = fresh();
  await toCardStep(sid);
  let r = await say(sid, "start over");
  assert.equal(r.state, "START");
  assert.equal(getSession(sid)?.task, null);

  r = await say(sid, "what's the weather");
  assert.equal(r.state, "START");
  assert.match(r.assistant_message, /not sure what you need/);

  endSession(sid);
  r = await say(sid, "hello");
  assert.match(r.assistant_message, /session has ended/);
  assert.equal(getSession(sid)?.observations.length, 0);

  await assert.rejects(() => handleObservation({ session_id: "nope", observation_type: "text", content: "hi" }), /SESSION_NOT_FOUND/);
});

test("step info counts questions and never exceeds the total", async () => {
  const sid = fresh();
  let r = await say(sid, "register me please");
  assert.equal(r.step?.index, 1);
  const total = r.step!.total;
  r = await say(sid, "yes");
  assert.equal(r.step?.index, 2);
  r = await toProposal(sid).catch(() => r);
  for (const s of getSession(sid)?.turns ?? []) assert.ok(s.text.length > 0);
  assert.ok((getSession(sid)?.task?.questions_asked ?? 0) <= (getSession(sid)?.task?.total_questions ?? 0));
  assert.ok(total >= 7);
});
