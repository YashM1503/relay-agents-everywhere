/**
 * COUNTERSIGN evaluation: deterministic checks -> verdict.
 * Core question: what must be true for this action to be justified right now?
 * Not "ask a second LLM whether the first LLM is right".
 */
import type { ActionProposal, ProofObligation, Task } from "../contracts/domain";
import type { Verdict } from "../contracts/builderA";
import { tierFor, userPolicyFor } from "./policy";
import type { UserProfile } from "../fixtures/load";

export interface Evaluation {
  verdict: Verdict;
  tier: 0 | 1 | 2 | 3;
  obligations: ProofObligation[];
  reason: string;
}

export const PAYLOAD_SHOWN = "payload_shown";

export function buildProofObligations(proposal: ActionProposal, task: Task | null): ProofObligation[] {
  const payloadKeys = Object.keys(proposal.payload);
  const unknown = task ? Object.values(task.known_fields).filter((f) => f.provenance === "unknown" && payloadKeys.includes(f.key)) : [];
  const conflicts = task ? task.conflicts.filter((c) => !c.resolved) : [];
  const unresolved = task ? [...task.unresolved_fields, ...(task.current_question && !task.current_question.startsWith("__") ? [task.current_question] : [])] : [];
  return [
    {
      id: "destination_verified",
      description: "intended destination verified",
      satisfied: !!task?.destination_verified,
      evidence: task?.target_domain,
    },
    { id: "user_requested", description: "user requested/accepted task", satisfied: task?.status === "in_progress" },
    {
      id: "fields_sourced",
      description: "fields come from known sources or user input",
      satisfied: unknown.length === 0,
      evidence: unknown.map((f) => f.key).join(",") || undefined,
    },
    {
      id: "no_unresolved",
      description: "no unresolved field",
      satisfied: unresolved.length === 0,
      evidence: unresolved.join(",") || undefined,
    },
    {
      id: "no_conflict",
      description: "no unresolved document/profile contradiction",
      satisfied: conflicts.length === 0,
      evidence: conflicts.map((c) => c.field).join(",") || undefined,
    },
    { id: PAYLOAD_SHOWN, description: "final payload shown to user and confirmed", satisfied: false },
  ];
}

export function evaluate(proposal: ActionProposal, task: Task | null, profile: UserProfile): Evaluation {
  const tier = tierFor(proposal.action_type);
  const obligations = buildProofObligations(proposal, task);
  const policy = userPolicyFor(profile, proposal.action_type);

  if (tier === 3 || policy === "never_auto") {
    return { verdict: "DENY_POLICY", tier, obligations, reason: tier === 3 ? "tier3_never_automatic" : "user_policy_never_auto" };
  }
  const blocking = obligations.filter((o) => !o.satisfied && o.id !== PAYLOAD_SHOWN);
  if (blocking.length > 0) {
    return { verdict: "HOLD_UNRESOLVED", tier, obligations, reason: blocking.map((o) => o.id).join(",") };
  }
  if (tier === 0) return { verdict: "ALLOW", tier, obligations, reason: "tier0" };
  if (tier === 1 && policy === "auto") return { verdict: "ALLOW_WITH_NOTICE", tier, obligations, reason: "tier1_user_policy_auto" };
  return { verdict: "ASK_USER", tier, obligations, reason: `tier${tier}_${policy}` };
}

/** Executor guard: may this proposal run right now? */
export function mayExecute(proposal: ActionProposal): { ok: boolean; reason: string } {
  const v = proposal.verdict;
  if (v === "ALLOW" || v === "ALLOW_WITH_NOTICE") return { ok: true, reason: v };
  if (v === "ASK_USER") {
    if (!proposal.confirmed_by_user) return { ok: false, reason: "not confirmed by user" };
    const unmet = proposal.proof_obligations.filter((o) => !o.satisfied);
    if (unmet.length) return { ok: false, reason: "unmet obligations: " + unmet.map((o) => o.id).join(",") };
    return { ok: true, reason: "confirmed" };
  }
  return { ok: false, reason: v ?? "no verdict" };
}
