import { loadDemoJson } from "./demo-data";
import type { UserActionPolicy } from "@/lib/countersign/types";

export type UserProfile = {
  user_id: string;
  display_name: string;
  synthetic: boolean;
  preferences: {
    large_text: boolean;
    voice_first: boolean;
    one_question_at_a_time: boolean;
    language: string;
    read_important_choices_aloud?: boolean;
    step_free_preferred?: boolean;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
  };
  action_policy: UserActionPolicy;
};

export function loadUserProfile(): UserProfile {
  return loadDemoJson<UserProfile>("user_profile.json");
}

export function getUserActionPolicy(): UserActionPolicy {
  return loadUserProfile().action_policy;
}
