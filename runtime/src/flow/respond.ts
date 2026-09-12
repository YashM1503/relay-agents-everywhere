/**
 * Building RelayResponse objects for the phone. Everything the UI sees goes through respond().
 */
import type { ActionProposalView, Choice, RelayResponse, StepInfo } from "../contracts/builderA";
import type { ActionProposal, Session } from "../contracts/domain";
import { fixtures } from "../fixtures/load";
import { moveTo } from "../state/machine";
import { promptFor } from "../state/questions";
import { saveSession } from "../state/sessionStore";

export function stepInfo(session: Session, label: string): StepInfo | undefined {
  const t = session.task;
  if (!t) return undefined;
  return { index: Math.min(t.questions_asked + 1, t.total_questions), total: t.total_questions, label };
}

export function respond(session: Session, partial: Partial<RelayResponse>): RelayResponse {
  const r: RelayResponse = {
    session_id: session.session_id,
    task: session.task?.goal ?? "",
    state: session.state,
    assistant_message: "",
    next_input: "voice",
    choices: [],
    action_proposal: null,
    receipt: null,
    ...partial,
  };
  if (r.assistant_message) session.turns.push({ at: new Date().toISOString(), role: "relay", text: r.assistant_message });
  session.last_response = r;
  saveSession(session);
  return r;
}

/** Ask the current question (one at a time). */
export function askCurrent(session: Session, prefix = ""): RelayResponse {
  const task = session.task;
  if (!task) throw new Error("askCurrent without task");
  const key = task.current_question ?? task.unresolved_fields[0];
  if (!key) throw new Error("askCurrent with nothing to ask");
  task.current_question = key;
  const p = promptFor(task, key, fixtures.userProfile(), fixtures.clinicForm());
  return respond(session, {
    assistant_message: prefix + p.message,
    next_input: p.next_input,
    choices: p.choices,
    field: key,
    step: stepInfo(session, p.label),
  });
}

export function proposalView(p: ActionProposal): ActionProposalView {
  return {
    action_id: p.action_id,
    action_type: p.action_type,
    target: p.target,
    risk_tier: p.risk_tier,
    verdict: p.verdict ?? "ASK_USER",
    payload_summary: p.summary_lines,
    sensitive_fields: p.sensitive_fields,
    payload_hash: p.payload_hash,
  };
}

export function proposalMessage(p: ActionProposal): string {
  const sens = p.sensitive_fields.length ? ` It includes sensitive details: ${p.sensitive_fields.join(", ").toLowerCase()}.` : "";
  return `Here is what I'll submit to ${p.target}.${sens} Shall I submit it?`;
}

export function presentProposal(session: Session, prefix = ""): RelayResponse {
  const p = session.pending_action;
  if (!p) throw new Error("presentProposal without pending action");
  return respond(session, {
    assistant_message: prefix + proposalMessage(p),
    next_input: "confirm",
    action_proposal: proposalView(p),
    step: stepInfo(session, "Review and confirm"),
  });
}

export function opening(session: Session): RelayResponse {
  return respond(session, { assistant_message: "I'm here. Tell me what you need, or scan the code the clerk gave you.", next_input: "voice" });
}

export function choicesPrompt(choices: Choice[]): string {
  return choices.length ? `You can say: ${choices.map((c) => c.label).join(", or ")}.` : "";
}

/** A tool failed. Hold, preserve state, offer retry. Never guess. */
export function holdForToolError(session: Session, message: string): RelayResponse {
  session.pending_action = null;
  moveTo(session, "HOLD");
  session.hold = {
    reason: "tool_error",
    message: `I couldn't complete that: ${message} Nothing was submitted.`,
    choices: [
      { id: "retry", label: "Try again" },
      { id: "cancel", label: "Stop" },
    ],
  };
  return respond(session, {
    assistant_message: session.hold.message + " Want me to try again?",
    next_input: "choice",
    choices: session.hold.choices,
    degraded: true,
  });
}
