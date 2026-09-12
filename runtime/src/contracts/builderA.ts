/**
 * Contract with Builder A (docs/builders/08_BUILDER_A_EXPERIENCE_RUNBOOK.md).
 * Do not change these shapes without telling Builder A. Optional fields are additive.
 */

export type ObservationType = "voice" | "image" | "text" | "document" | "event";

/**
 * What the phone sends.
 * - voice / text: a transcript or typed text from the user (the phone does speech-to-text)
 * - image: a data: URL from the camera (or "fixture:<name>" in tests/demo)
 * - document: content the user shared with RELAY, e.g. a forwarded message. Treated as untrusted.
 */
export interface ObservationRequest {
  session_id: string;
  observation_type: ObservationType;
  content: string;
  /** Optional hint for images, e.g. "insurance_back" or "qr". Defaults to the field being asked. */
  field_hint?: string;
}

export type NextInput = "voice" | "camera" | "choice" | "confirm" | "none";

export interface Choice {
  id: string;
  label: string;
  /** Extra info the UI may show or read aloud, e.g. "step-free entrance confirmed". */
  note?: string;
}

export interface StepInfo {
  index: number;
  total: number;
  label: string;
}

/** What the phone renders. Exactly one question at a time. */
export interface RelayResponse {
  session_id: string;
  task: string;
  state: string;
  assistant_message: string;
  next_input: NextInput;
  choices: Choice[];
  action_proposal: ActionProposalView | null;
  receipt: ReceiptView | null;
  /** True when the runtime could not verify something. UI should show retry / manual help. */
  degraded?: boolean;
  /** Progress through the current task, for the task-state display. */
  step?: StepInfo;
  /** The form field currently being asked about, if any. Echo it back as field_hint for images. */
  field?: string;
}

export interface ActionProposalView {
  action_id: string;
  action_type: string;
  target: string;
  risk_tier: 0 | 1 | 2 | 3;
  verdict: Verdict;
  /** Human-readable lines the UI shows before the user confirms. */
  payload_summary: string[];
  /** Labels of sensitive fields in the payload. The UI should not read these aloud by default. */
  sensitive_fields: string[];
  /** Confirmation must echo this back; it binds approval to this exact payload. */
  payload_hash: string;
}

export interface ReceiptView {
  receipt_id: string;
  summary: string;
  confirmation_code?: string;
  follow_up?: string;
}

export type Verdict = "ALLOW" | "ALLOW_WITH_NOTICE" | "ASK_USER" | "HOLD_UNRESOLVED" | "DENY_POLICY";

export interface ConfirmRequest {
  session_id: string;
  action_id: string;
  payload_hash: string;
  decision: "confirm" | "reject";
}
