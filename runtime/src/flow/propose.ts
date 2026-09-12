/**
 * PREPARE_ACTION + COUNTERSIGN: build the exact payload, hash it, evaluate, then either ask the
 * user, execute, or hold. The user only ever confirms the payload they were shown.
 */
import type { RelayResponse } from "../contracts/builderA";
import type { ActionProposal, Session } from "../contracts/domain";
import { evaluate } from "../countersign/evaluate";
import { fixtures } from "../fixtures/load";
import { moveTo } from "../state/machine";
import { Q } from "../state/questions";
import { tools } from "../tools/index";
import { hashPayload, newId } from "../util/ids";
import { execute } from "./execute";
import { askCurrent, holdForToolError, presentProposal, respond } from "./respond";
import { addSpecialQuestion, buildPayload, reopenField, sensitiveLabels, summaryLines } from "./task";

export async function propose(session: Session, prefix = ""): Promise<RelayResponse> {
  const task = session.task;
  if (!task) throw new Error("propose without task");
  const form = fixtures.clinicForm();
  const profile = fixtures.userProfile();

  const payload = buildPayload(task, form);
  await tools.open_demo_form(session.session_id);
  const filled = await tools.fill_form(session.session_id, payload);
  if (!filled.ok) return holdForToolError(session, filled.error_message ?? "the form isn't available.");

  const payload_hash = hashPayload(payload);
  const proposal: ActionProposal = {
    action_id: newId("a"),
    action_type: "submit_form",
    target: form.organization,
    target_domain: task.target_domain,
    payload,
    payload_hash,
    risk_tier: 2,
    reversible: false,
    proof_obligations: [],
    summary_lines: summaryLines(task, form),
    sensitive_fields: sensitiveLabels(task, form),
    idempotency_key: `${session.session_id}:${payload_hash}`,
  };
  const ev = evaluate(proposal, task, profile);
  proposal.verdict = ev.verdict;
  proposal.risk_tier = ev.tier;
  proposal.proof_obligations = ev.obligations;
  session.pending_action = proposal;
  moveTo(session, "COUNTERSIGN");

  switch (ev.verdict) {
    case "ASK_USER":
      moveTo(session, "WAIT_CONFIRMATION");
      return presentProposal(session, prefix);
    case "ALLOW":
    case "ALLOW_WITH_NOTICE":
      moveTo(session, "EXECUTE");
      return execute(session, prefix);
    case "HOLD_UNRESOLVED": {
      session.pending_action = null;
      if (!task.destination_verified) {
        moveTo(session, "HOLD");
        session.hold = {
          reason: "wrong_destination",
          message: `I can't submit this: the destination ${task.target_domain} is not ${form.organization}.`,
          choices: [
            { id: "rescan", label: "Scan again" },
            { id: "cancel", label: "Stop" },
          ],
        };
        return respond(session, { assistant_message: prefix + session.hold.message + " Do you want to scan again, or stop?", next_input: "choice", choices: session.hold.choices });
      }
      const unknown = Object.values(task.known_fields).find((f) => f.provenance === "unknown");
      if (unknown) reopenField(task, unknown.key);
      else if (task.conflicts.some((c) => !c.resolved)) addSpecialQuestion(task, Q.RESOLVE_NAME);
      moveTo(session, "COLLECT_MISSING");
      return askCurrent(session, prefix + "Before I can submit, I still need one thing. ");
    }
    default: {
      session.pending_action = null;
      moveTo(session, "HOLD");
      session.hold = {
        reason: "policy",
        message: `Your settings don't allow me to ${proposal.action_type.replace(/_/g, " ")} on my own (${ev.reason}).`,
        choices: [{ id: "cancel", label: "Stop" }],
      };
      return respond(session, { assistant_message: prefix + session.hold.message + " I've stopped here.", next_input: "choice", choices: session.hold.choices });
    }
  }
}
