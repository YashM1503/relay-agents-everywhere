/**
 * Internal runtime models (docs/architecture/04, 05, 06).
 */
import type { Choice, RelayResponse, Verdict } from "./builderA";

export const STATES = [
  "START",
  "UNDERSTAND_TASK",
  "COLLECT_MISSING",
  "PREPARE_ACTION",
  "COUNTERSIGN",
  "WAIT_CONFIRMATION",
  "EXECUTE",
  "RECEIPT",
  "CANCELLED",
  "HOLD",
] as const;
export type State = (typeof STATES)[number];

/** Where a field value came from. "unknown" always means: ask the user. */
export type Provenance = "profile" | "user" | "document" | "external" | "unknown";

export interface FieldValue {
  key: string;
  value: string | boolean | null;
  provenance: Provenance;
  sensitive: boolean;
  /** Short evidence note, e.g. "confirmed by user", "member ID ending 7104". */
  note?: string;
}

export interface DocumentRecord {
  /** Reference only (hash). The raw image is never stored in the session. */
  ref: string;
  kind: string;
  extracted: FieldValue[];
  uncertainties: string[];
  /** True when values came from the sample card because no live vision model was available. */
  demo_extraction?: boolean;
}

export interface Conflict {
  field: string;
  profile_value: string;
  document_value: string;
  resolved: boolean;
}

export interface Task {
  task_id: string;
  goal: string;
  status: "in_progress" | "blocked" | "complete" | "cancelled";
  known_fields: Record<string, FieldValue>;
  unresolved_fields: string[];
  /** Field (or special question id) currently being asked. One question at a time. */
  current_question?: string;
  target_org: string;
  target_domain: string;
  destination_verified: boolean;
  profile_confirmed: boolean;
  documents: Record<string, DocumentRecord>;
  conflicts: Conflict[];
  questions_asked: number;
  total_questions: number;
  /** Set when a choice question fell through to free text ("someone else"). */
  expect_free_text?: boolean;
}

export interface Observation {
  type: "voice" | "image" | "text" | "document" | "event";
  source: "phone" | "connector";
  content_ref: string;
  timestamp: string;
}

export interface Turn {
  at: string;
  role: "user" | "relay";
  text: string;
}

export interface Hold {
  reason: "wrong_destination" | "tool_error" | "policy" | "missing_document";
  message: string;
  choices: Choice[];
}

export interface Interjection {
  kind: "payment_request";
  excerpt: string;
}

export interface Session {
  session_id: string;
  user_id: string;
  mode: "ask" | "show" | "stay_with_me" | "watch";
  status: "active" | "ended";
  state: State;
  started_at: string;
  task: Task | null;
  observations: Observation[];
  turns: Turn[];
  pending_action: ActionProposal | null;
  hold: Hold | null;
  interjection: Interjection | null;
  follow_ups: string[];
  receipts: string[];
  /** Idempotency: action_ids already executed. */
  executed_action_ids: string[];
  last_response?: RelayResponse;
}

export interface ActionProposal {
  action_id: string;
  action_type: string;
  target: string;
  target_domain?: string;
  payload: Record<string, unknown>;
  payload_hash: string;
  risk_tier: 0 | 1 | 2 | 3;
  reversible: boolean;
  proof_obligations: ProofObligation[];
  summary_lines: string[];
  sensitive_fields: string[];
  verdict?: Verdict;
  confirmed_by_user?: boolean;
  idempotency_key: string;
}

export interface ProofObligation {
  id: string;
  description: string;
  satisfied: boolean;
  evidence?: string;
}

export interface DecisionReceipt {
  receipt_id: string;
  action_id: string;
  session_id: string;
  action_type: string;
  target: string;
  verdict: Verdict;
  confirmed_by_user: boolean;
  payload_hash: string;
  /** Reference sensitive data; never copy it into the receipt. */
  key_evidence: string[];
  executed_at: string;
  result: "success" | "failed" | "cancelled" | "denied";
  confirmation_code?: string;
  follow_up?: string;
}

/** Normalized output every agent adapter must return (docs/architecture/04). */
export interface NormalizedAgentResult {
  status: "complete" | "partial" | "failed";
  summary: string;
  facts: FieldValue[];
  uncertainties: string[];
  proposed_actions: Array<{ action_type: string; target?: string; payload?: Record<string, unknown> }>;
  artifacts: string[];
  citations: string[];
  metadata: Record<string, unknown>;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  tool: string;
  data?: T;
  /** Machine error code, e.g. DOCUMENT_SIDE_REQUIRED_1029. */
  error_code?: string;
  /** Plain-language translation for the user. */
  error_message?: string;
}
