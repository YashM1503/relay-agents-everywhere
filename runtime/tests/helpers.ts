import type { ConfirmRequest, RelayResponse } from "../src/contracts/builderA";
import type { Task } from "../src/contracts/domain";
import { handleConfirm, handleObservation } from "../src/flow/orchestrator";
import { resetRegistry } from "../src/agents/registry";
import { resetReceipts } from "../src/receipts/store";
import { createSession, resetStore } from "../src/state/sessionStore";
import { resetTools } from "../src/tools/index";

/** No live provider in tests: the router must fall back to the mock without touching the network. */
process.env.OPENAI_API_KEY = "";
process.env.OPENROUTER_API_KEY = "";
process.env.OPENAI_BASE_URL = "";

export function fresh(): string {
  resetStore();
  resetTools();
  resetReceipts();
  resetRegistry();
  return createSession("demo-evelyn").session_id;
}

export const say = (sid: string, text: string) => handleObservation({ session_id: sid, observation_type: "voice", content: text });
export const photo = (sid: string, ref: string, hint?: string) => handleObservation({ session_id: sid, observation_type: "image", content: ref, field_hint: hint });
export const share = (sid: string, text: string) => handleObservation({ session_id: sid, observation_type: "document", content: text });

export function confirmLast(sid: string, r: RelayResponse, decision: ConfirmRequest["decision"] = "confirm", hash?: string) {
  if (!r.action_proposal) throw new Error("no proposal to confirm");
  return handleConfirm({ session_id: sid, action_id: r.action_proposal.action_id, payload_hash: hash ?? r.action_proposal.payload_hash, decision });
}

/** Start the clinic task and answer everything up to (not including) the insurance card photo. */
export async function toCardStep(sid: string): Promise<RelayResponse> {
  await say(sid, "RELAY, stay with me. I need to register at the clinic.");
  await say(sid, "yes");
  await say(sid, "12 March 1950");
  await say(sid, "Maya");
  await say(sid, "yes");
  return say(sid, "annual check-up");
}

/** Everything up to the first proposal (front card + slot answered). */
export async function toProposal(sid: string): Promise<RelayResponse> {
  await toCardStep(sid);
  await photo(sid, "fixture:insurance_front");
  return say(sid, "the first one");
}

export function makeTask(over: Partial<Task> = {}): Task {
  return {
    task_id: "t_test",
    goal: "test",
    status: "in_progress",
    known_fields: {},
    unresolved_fields: [],
    target_org: "Demo Clinic",
    target_domain: "demo-clinic.example",
    destination_verified: true,
    profile_confirmed: true,
    documents: {},
    conflicts: [],
    questions_asked: 0,
    total_questions: 0,
    ...over,
  };
}
