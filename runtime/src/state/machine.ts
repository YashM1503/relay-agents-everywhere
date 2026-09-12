/**
 * Deterministic session state machine (docs/builders/09, build order step 1).
 * Prefer this over a generic planner: the demo must pass 3x in a row.
 */
import type { Session, State } from "../contracts/domain";

export { isStopCommand, STOP_WORDS } from "./parse";

export const TRANSITIONS: Record<State, State[]> = {
  START: ["UNDERSTAND_TASK", "HOLD", "CANCELLED"],
  UNDERSTAND_TASK: ["COLLECT_MISSING", "PREPARE_ACTION", "HOLD", "CANCELLED"],
  COLLECT_MISSING: ["COLLECT_MISSING", "PREPARE_ACTION", "HOLD", "CANCELLED"],
  PREPARE_ACTION: ["COUNTERSIGN", "COLLECT_MISSING", "HOLD", "CANCELLED"],
  COUNTERSIGN: ["WAIT_CONFIRMATION", "EXECUTE", "HOLD", "COLLECT_MISSING", "CANCELLED"],
  WAIT_CONFIRMATION: ["EXECUTE", "PREPARE_ACTION", "COLLECT_MISSING", "CANCELLED"],
  EXECUTE: ["RECEIPT", "COLLECT_MISSING", "HOLD", "CANCELLED"],
  RECEIPT: ["START"],
  HOLD: ["START", "COLLECT_MISSING", "PREPARE_ACTION", "CANCELLED"],
  CANCELLED: ["START"],
};

export class IllegalTransition extends Error {
  constructor(from: State, to: State) {
    super(`Illegal transition ${from} -> ${to}`);
  }
}

export function transition(from: State, to: State): State {
  if (!TRANSITIONS[from].includes(to)) throw new IllegalTransition(from, to);
  return to;
}

export function moveTo(session: Session, to: State): void {
  session.state = transition(session.state, to);
}

/** Hard reset to START, keeping receipts and history. Used for "start over" and "new task". */
export function hardReset(session: Session): void {
  session.task = null;
  session.pending_action = null;
  session.hold = null;
  session.interjection = null;
  session.state = "START";
}
