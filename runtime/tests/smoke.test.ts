import { test } from "node:test";
import assert from "node:assert/strict";
import { fixtures } from "../src/fixtures/load";
import { IllegalTransition, transition } from "../src/state/machine";
import { detectFieldMention, isAffirmative, isNegative, isStopCommand, matchChoice, wantsChange } from "../src/state/parse";
import { slotChoices, contactChoices } from "../src/state/questions";
import { evaluate, mayExecute } from "../src/countersign/evaluate";
import { tierFor } from "../src/countersign/policy";
import { resetTools, tools } from "../src/tools/index";
import { makeTask } from "./helpers";
import type { ActionProposal } from "../src/contracts/domain";

const proposal = (over: Partial<ActionProposal>): ActionProposal => ({
  action_id: "a",
  action_type: "submit_form",
  target: "Demo Clinic",
  payload: {},
  payload_hash: "h",
  risk_tier: 2,
  reversible: false,
  proof_obligations: [],
  summary_lines: [],
  sensitive_fields: [],
  idempotency_key: "k",
  ...over,
});

test("fixtures load from ../demo-data", () => {
  assert.equal(fixtures.userProfile().user_id, "demo-evelyn");
  assert.equal(fixtures.clinicForm().fields.length, 12);
  assert.equal(fixtures.agentRegistry().agents.length, 5);
});

test("state machine rejects illegal transitions", () => {
  assert.equal(transition("START", "UNDERSTAND_TASK"), "UNDERSTAND_TASK");
  assert.throws(() => transition("START", "EXECUTE"), IllegalTransition);
  assert.throws(() => transition("RECEIPT", "EXECUTE"), IllegalTransition);
});

test("deterministic parsing: stop, yes/no, field mentions, choices", () => {
  assert.ok(isStopCommand("RELAY, stop"));
  assert.ok(isStopCommand("don't do that"));
  assert.ok(isStopCommand("stop by the pharmacy is my reason"), "a sentence that starts with stop cancels: user control wins");
  assert.ok(!isStopCommand("I can't stop laughing"));
  assert.ok(isAffirmative("Yes, use those"));
  assert.ok(isNegative("no thanks"));
  assert.equal(detectFieldMention("what about my date of birth"), "dob");
  assert.equal(wantsChange("actually my phone number changed"), "phone");
  assert.equal(wantsChange("my phone number"), null);
  assert.equal(matchChoice("the second one", slotChoices())?.id, "slot-2");
  assert.equal(matchChoice("2:30", slotChoices())?.id, "slot-1");
  assert.equal(matchChoice("my daughter", contactChoices())?.id, "Maya Brooks");
  assert.equal(matchChoice("someone else", contactChoices())?.id, "someone_else");
  assert.equal(matchChoice("purple", slotChoices()), null);
});

test("COUNTERSIGN: tier 2 asks, tier 0 allows, tier 3 money is denied, unknown types are tier 2", () => {
  const profile = fixtures.userProfile();
  const task = makeTask();
  assert.equal(evaluate(proposal({ action_type: "submit_form" }), task, profile).verdict, "ASK_USER");
  assert.equal(evaluate(proposal({ action_type: "explain", risk_tier: 0 }), task, profile).verdict, "ALLOW");
  assert.equal(evaluate(proposal({ action_type: "money_transfer", risk_tier: 3 }), task, profile).verdict, "DENY_POLICY");
  assert.equal(evaluate(proposal({ action_type: "create_calendar_event", risk_tier: 1 }), task, profile).verdict, "ALLOW_WITH_NOTICE");
  assert.equal(tierFor("something_new"), 2);
});

test("COUNTERSIGN: unresolved field, unverified destination, or conflict -> HOLD", () => {
  const profile = fixtures.userProfile();
  assert.equal(evaluate(proposal({}), makeTask({ unresolved_fields: ["insurance_back"] }), profile).verdict, "HOLD_UNRESOLVED");
  assert.equal(evaluate(proposal({}), makeTask({ destination_verified: false }), profile).verdict, "HOLD_UNRESOLVED");
  const conflicted = makeTask({ conflicts: [{ field: "full_name", profile_value: "A", document_value: "B", resolved: false }] });
  assert.equal(evaluate(proposal({}), conflicted, profile).verdict, "HOLD_UNRESOLVED");
});

test("executor guard: ASK_USER needs confirmation and all obligations", () => {
  const p = proposal({ verdict: "ASK_USER", proof_obligations: [{ id: "payload_shown", description: "", satisfied: false }] });
  assert.equal(mayExecute(p).ok, false);
  p.confirmed_by_user = true;
  assert.equal(mayExecute(p).ok, false);
  p.proof_obligations[0].satisfied = true;
  assert.equal(mayExecute(p).ok, true);
  assert.equal(mayExecute(proposal({ verdict: "DENY_POLICY" })).ok, false);
});

test("tools: missing back-card error, then idempotent submit", async () => {
  resetTools();
  await tools.open_demo_form("sess");
  await tools.fill_form("sess", { insurance_front: "img" });
  const r = await tools.submit_form("sess", "key-1");
  assert.equal(r.ok, false);
  assert.equal(r.error_code, "DOCUMENT_SIDE_REQUIRED_1029");
  await tools.fill_form("sess", { insurance_front: "img", insurance_back: "img" });
  const ok1 = await tools.submit_form("sess", "key-2");
  const ok2 = await tools.submit_form("sess", "key-2");
  assert.equal(ok1.ok, true);
  assert.equal(ok2.data?.confirmation_code, ok1.data?.confirmation_code);
  assert.equal(ok2.data?.duplicate, true);
  const cal = await tools.create_calendar_event("x", "slot-3");
  assert.equal(cal.data?.accessible_entry_confirmed, false);
  assert.equal((await tools.create_calendar_event("x", "nope")).ok, false);
});
