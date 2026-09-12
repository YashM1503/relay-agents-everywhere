import type { RelayResponse } from "../contracts/builderA";
import type { Session } from "../contracts/domain";
import { moveTo } from "../state/machine";
import { askCurrent } from "./respond";
import { propose } from "./propose";

/** After any answer: ask the next question, or move on to proposing the action. */
export async function advance(session: Session, prefix = ""): Promise<RelayResponse> {
  const task = session.task;
  if (!task) throw new Error("advance without task");
  if (task.current_question || task.unresolved_fields.length) {
    moveTo(session, "COLLECT_MISSING");
    return askCurrent(session, prefix);
  }
  moveTo(session, "PREPARE_ACTION");
  return propose(session, prefix);
}
