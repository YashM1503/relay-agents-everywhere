/**
 * Local contract shapes until src/schemas lands (Sub-agent A).
 * Mirrors IMPLEMENTATION_PLAN.md + 05_COUNTERSIGN_SPEC.md.
 */

export type CountersignVerdict = "allow" | "confirm" | "hold" | "deny";

export type ActionProposal = {
  action_id: string;
  action_type: string;
  target: string;
  payload_summary?: string;
  purpose?: string;
  recipient?: string;
  payload?: Record<string, unknown>;
  sensitive_fields?: string[];
  risk_tier?: number;
  reversible?: boolean;
  proof_obligations?: string[];
  destination_verified?: boolean;
  user_confirmed?: boolean;
};

export type TaskState = {
  task_id: string;
  goal: string;
  status: string;
  accepted_by_user?: boolean;
  destination_verified?: boolean;
  known_fields: Record<string, unknown>;
  unresolved_fields: string[];
  contradictions?: Array<{ field: string; sources: string[] }>;
  dependencies?: string[];
};

export type UserActionPolicy = {
  draft?: "auto" | "ask" | "never_auto";
  calendar?: "auto" | "ask" | "never_auto";
  send_message?: "auto" | "ask" | "never_auto";
  share_document?: "auto" | "ask" | "never_auto";
  submit_form?: "auto" | "ask" | "never_auto";
  purchase?: "auto" | "ask" | "never_auto" | "always_ask";
  money_transfer?: "auto" | "ask" | "never_auto" | "always_ask";
  [key: string]: string | undefined;
};

export type CountersignDecision = {
  verdict: CountersignVerdict;
  action: string;
  recipient: string;
  purpose: string;
  dataShared: string[];
  evidence: string[];
  unresolved: string[];
  explanation: string;
};

export type ProofCheck = {
  obligation: string;
  passed: boolean;
  message: string;
};

export type ProofCheckResult = {
  passed: boolean;
  checks: ProofCheck[];
};
