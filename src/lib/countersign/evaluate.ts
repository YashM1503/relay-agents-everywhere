import { classifyActionTier, normalizeActionType } from "@/lib/policy/tiers";
import {
  checkSubmitRegistrationProof,
  enumerateSensitiveFields,
  isSubmitRegistrationAction,
} from "./proof";
import type {
  ActionProposal,
  CountersignDecision,
  TaskState,
  UserActionPolicy,
} from "./types";

const POLICY_KEY_BY_ACTION: Record<string, string> = {
  explain: "draft",
  read: "draft",
  read_document: "draft",
  draft: "draft",
  summarize: "draft",
  search: "draft",
  add_reminder: "calendar",
  create_reminder: "calendar",
  create_calendar_event: "calendar",
  request_availability: "calendar",
  upload_insurance: "share_document",
  share_document: "share_document",
  submit_registration: "submit_form",
  submit_form: "submit_form",
  send_money: "money_transfer",
  money_transfer: "money_transfer",
};

function policyKeyForAction(actionType: string): string {
  const normalized = actionType.toLowerCase().replace(/-/g, "_");
  return POLICY_KEY_BY_ACTION[normalized] ?? normalizeActionType(normalized);
}

function policyAllowsAuto(policy: UserActionPolicy, actionType: string): boolean {
  const key = policyKeyForAction(actionType);
  const setting = policy[key];
  return setting === "auto";
}

function policyBlocksAuto(policy: UserActionPolicy, actionType: string): boolean {
  const key = policyKeyForAction(actionType);
  const setting = policy[key];
  return setting === "never_auto" || setting === "always_ask";
}

function buildExplanation(
  verdict: CountersignDecision["verdict"],
  tier: number,
  actionType: string,
  unresolved: string[],
): string {
  if (unresolved.length > 0) {
    return `Holding "${actionType}" until proof obligations are resolved.`;
  }

  switch (verdict) {
    case "allow":
      return `Tier ${tier} action "${actionType}" may proceed automatically under current policy.`;
    case "confirm":
      return `Tier ${tier} action "${actionType}" requires explicit user confirmation before execution.`;
    case "hold":
      return `Tier ${tier} action "${actionType}" cannot auto-run; strong verification or explicit approval is required.`;
    case "deny":
      return `Action "${actionType}" is blocked by user policy.`;
    default:
      return `Evaluated "${actionType}" at tier ${tier}.`;
  }
}

function resolveVerdict(
  tier: ReturnType<typeof classifyActionTier>,
  policy: UserActionPolicy,
  actionType: string,
  unresolved: string[],
  proposal: ActionProposal,
): CountersignDecision["verdict"] {
  if (unresolved.length > 0) {
    return "hold";
  }

  if (proposal.user_confirmed === true && tier <= 2) {
    return "allow";
  }

  if (tier === 0) {
    return "allow";
  }

  if (tier === 1) {
    if (policyBlocksAuto(policy, actionType)) return "confirm";
    return policyAllowsAuto(policy, actionType) ? "allow" : "confirm";
  }

  if (tier === 2) {
    return "confirm";
  }

  // Tier 3 — never auto-runs.
  if (policyBlocksAuto(policy, actionType)) {
    return "hold";
  }
  return "confirm";
}

export function evaluateCountersign(
  proposal: ActionProposal,
  task: TaskState,
  userPolicy: UserActionPolicy,
): CountersignDecision {
  const tier = classifyActionTier(proposal.action_type);
  const action = proposal.action_type;
  const recipient = proposal.recipient ?? proposal.target;
  const purpose =
    proposal.purpose ?? proposal.payload_summary ?? task.goal ?? "Unspecified purpose";

  let evidence: string[] = [];
  let unresolved: string[] = [];

  if (isSubmitRegistrationAction(action)) {
    const proof = checkSubmitRegistrationProof(proposal, task);
    evidence = proof.checks.filter((check) => check.passed).map((check) => check.message);
    unresolved = proof.checks
      .filter((check) => !check.passed)
      .map((check) => `${check.obligation}: ${check.message}`);
  } else if (proposal.destination_verified ?? task.destination_verified) {
    evidence.push(`Destination "${recipient}" verified`);
  }

  const dataShared = enumerateSensitiveFields(proposal, task);
  const verdict = resolveVerdict(tier, userPolicy, action, unresolved, proposal);

  return {
    verdict,
    action,
    recipient,
    purpose,
    dataShared,
    evidence,
    unresolved,
    explanation: buildExplanation(verdict, tier, action, unresolved),
  };
}
