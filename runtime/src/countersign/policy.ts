/**
 * COUNTERSIGN policy tiers (docs/architecture/05). Hard-coded in code + fixtures.
 * Do NOT outsource this to an LLM.
 */
import { fixtures, type UserProfile } from "../fixtures/load";

export type Tier = 0 | 1 | 2 | 3;

export function tierFor(actionType: string): Tier {
  const p = fixtures.actionPolicy();
  if (p.tier3.includes(actionType)) return 3;
  if (p.tier2.includes(actionType)) return 2;
  if (p.tier1.includes(actionType)) return 1;
  if (p.tier0.includes(actionType)) return 0;
  // Unknown action types are treated as consequential.
  return 2;
}

/** Map action type -> user's own policy key in user_profile.json action_policy. */
const POLICY_KEY: Record<string, keyof UserProfile["action_policy"]> = {
  submit_form: "submit_form",
  share_document: "share_document",
  send_message: "send_message",
  create_calendar_event: "calendar",
  draft: "draft",
  money_transfer: "money_transfer",
  book_appointment: "purchase",
};

export function userPolicyFor(profile: UserProfile, actionType: string): "auto" | "ask" | "always_ask" | "never_auto" {
  const key = POLICY_KEY[actionType];
  return (key && profile.action_policy[key]) || "ask";
}
