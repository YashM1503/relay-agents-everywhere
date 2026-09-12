/**
 * EXECUTE: the only place a Tier 2 tool is called. Guarded by COUNTERSIGN's verdict and the user's
 * confirmation of the exact payload hash. Idempotent per action.
 */
import type { RelayResponse } from "../contracts/builderA";
import type { ActionProposal, Session, Task } from "../contracts/domain";
import { evaluate, mayExecute } from "../countersign/evaluate";
import { fixtures } from "../fixtures/load";
import { createReceipt, findReceiptByAction, toView } from "../receipts/store";
import { moveTo } from "../state/machine";
import { tools } from "../tools/index";
import { hashPayload, newId } from "../util/ids";
import { askCurrent, holdForToolError, respond, stepInfo } from "./respond";
import { reopenField } from "./task";

export async function execute(session: Session, prefix = ""): Promise<RelayResponse> {
  const p = session.pending_action;
  const task = session.task;
  if (!p || !task) throw new Error("execute without proposal");
  const guard = mayExecute(p);
  if (!guard.ok) throw new Error(`EXECUTE_REFUSED: ${guard.reason}`);

  const existing = findReceiptByAction(p.action_id);
  if (existing) {
    session.pending_action = null;
    return respond(session, { assistant_message: "That was already submitted. Here is your receipt.", next_input: "none", receipt: toView(existing) });
  }

  const form = fixtures.clinicForm();
  const profile = fixtures.userProfile();
  const result = await tools.submit_form(session.session_id, p.idempotency_key);

  if (result.ok && result.data) {
    session.executed_action_ids.push(p.action_id);

    // Tier 1 follow-up: the appointment goes on the calendar. Auto only if the user's policy says so.
    const followUps = [...session.follow_ups];
    let calendarNote = "";
    const slotId = task.known_fields.appointment_slot?.value;
    if (typeof slotId === "string") {
      const cal: ActionProposal = {
        action_id: newId("a"),
        action_type: "create_calendar_event",
        target: "your calendar",
        payload: { slot_id: slotId, title: `${form.organization} appointment` },
        payload_hash: hashPayload({ slotId }),
        risk_tier: 1,
        reversible: true,
        proof_obligations: [],
        summary_lines: [],
        sensitive_fields: [],
        idempotency_key: `${session.session_id}:cal:${slotId}`,
      };
      const ev = evaluate(cal, task, profile);
      if (ev.verdict === "ALLOW" || ev.verdict === "ALLOW_WITH_NOTICE") {
        const created = await tools.create_calendar_event(`${form.organization} appointment`, slotId);
        if (created.ok && created.data) {
          calendarNote = ` I added ${created.data.label} to your calendar${created.data.accessible_entry_confirmed ? "; the entrance is step-free" : ""}.`;
          followUps.unshift(`Calendar: ${created.data.label} (${created.data.accessible_entry_confirmed ? "step-free entrance confirmed" : "step-free entrance not confirmed"})`);
        }
      } else {
        followUps.unshift(`Add the appointment to your calendar (needs your OK: ${ev.reason})`);
      }
    }

    task.status = "complete";
    const receipt = createReceipt({
      action_id: p.action_id,
      session_id: session.session_id,
      action_type: p.action_type,
      target: p.target,
      verdict: p.verdict ?? "ASK_USER",
      confirmed_by_user: !!p.confirmed_by_user,
      payload_hash: p.payload_hash,
      key_evidence: evidence(task),
      result: "success",
      confirmation_code: result.data.confirmation_code,
      follow_up: followUps.join(" · ") || undefined,
    });
    session.receipts.push(receipt.receipt_id);
    session.pending_action = null;
    moveTo(session, "RECEIPT");
    return respond(session, {
      assistant_message: prefix + `Done. ${p.target} accepted your registration. Your confirmation code is ${result.data.confirmation_code}.${calendarNote}`,
      next_input: "none",
      receipt: toView(receipt),
      step: stepInfo(session, "Complete"),
    });
  }

  // Failure: record it, void the confirmed proposal (it did not happen), recover.
  createReceipt({
    action_id: p.action_id,
    session_id: session.session_id,
    action_type: p.action_type,
    target: p.target,
    verdict: p.verdict ?? "ASK_USER",
    confirmed_by_user: !!p.confirmed_by_user,
    payload_hash: p.payload_hash,
    key_evidence: [`clinic response: ${result.error_code ?? "error"}`],
    result: "failed",
  });
  session.pending_action = null;

  if (result.error_code === form.deliberate_error.machine_message) {
    // Translate the clinic's machine error and ask for exactly what is missing.
    reopenField(task, "insurance_back");
    moveTo(session, "COLLECT_MISSING");
    return askCurrent(session, prefix + `${result.error_message} Nothing was submitted yet. `);
  }
  return holdForToolError(session, result.error_message ?? result.error_code ?? "unknown error.");
}

function evidence(task: Task): string[] {
  const ev: string[] = [];
  if (task.profile_confirmed) ev.push("profile details confirmed by user");
  const docs = Object.keys(task.documents);
  if (docs.length) ev.push(`documents captured: ${docs.join(", ")}` + (Object.values(task.documents).some((d) => d.demo_extraction) ? " (demo extraction)" : ""));
  const userFields = Object.values(task.known_fields).filter((f) => f.provenance === "user").map((f) => f.key);
  if (userFields.length) ev.push(`answered by user: ${userFields.join(", ")}`);
  ev.push(`destination: ${task.target_domain} (${task.destination_verified ? "verified" : "unverified"})`);
  return ev;
}
