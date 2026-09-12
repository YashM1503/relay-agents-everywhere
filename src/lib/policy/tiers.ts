import { loadDemoJson } from "@/lib/tools/demo-data";

export type ActionTier = 0 | 1 | 2 | 3;

export type ActionPolicyData = {
  tier0: string[];
  tier1: string[];
  tier2: string[];
  tier3: string[];
  default_tier3?: string;
};

/** Demo action names mapped to explicit tiers (overrides action_policy.json where noted). */
const DEMO_ACTION_TIERS: Record<string, ActionTier> = {
  explain: 0,
  read: 0,
  read_document: 0,
  add_reminder: 1,
  upload_insurance: 2,
  submit_registration: 2,
  send_money: 3,
};

/** Map demo/runtime action names to action_policy.json keys. */
const ACTION_ALIASES: Record<string, string> = {
  read: "explain",
  read_document: "explain",
  add_reminder: "create_calendar_event",
  upload_insurance: "share_document",
  submit_registration: "submit_form",
  send_money: "money_transfer",
};

let cachedPolicy: ActionPolicyData | null = null;

export function getActionPolicyData(): ActionPolicyData {
  if (!cachedPolicy) {
    cachedPolicy = loadDemoJson<ActionPolicyData>("action_policy.json");
  }
  return cachedPolicy;
}

export function normalizeActionType(actionType: string): string {
  const normalized = actionType.toLowerCase().replace(/-/g, "_");
  return ACTION_ALIASES[normalized] ?? normalized;
}

export function classifyActionTier(actionType: string): ActionTier {
  const normalized = actionType.toLowerCase().replace(/-/g, "_");

  const demoTier = DEMO_ACTION_TIERS[normalized];
  if (demoTier !== undefined) {
    return demoTier;
  }

  const policyKey = normalizeActionType(normalized);
  const policy = getActionPolicyData();

  if (policy.tier0.includes(policyKey)) return 0;
  if (policy.tier1.includes(policyKey)) return 1;
  if (policy.tier2.includes(policyKey)) return 2;
  if (policy.tier3.includes(policyKey)) return 3;

  // Unknown actions default to T2 — require confirmation.
  return 2;
}

export function tierRequiresConfirmation(tier: ActionTier): boolean {
  return tier >= 2;
}

export function tierNeverAutoRuns(tier: ActionTier): boolean {
  return tier >= 3;
}
