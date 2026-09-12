import { isDemoMode } from "@/lib/config/app-mode";
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
  if (isDemoMode()) {
    return loadDemoJson<UserProfile>("user_profile.json");
  }
  return {
    user_id: "user",
    display_name: "",
    synthetic: false,
    preferences: {
      large_text: true,
      voice_first: true,
      one_question_at_a_time: true,
      language: "en",
    },
    contact: { phone: "", email: "", address: "" },
    action_policy: {
      draft: "auto",
      calendar: "auto",
      send_message: "ask",
      share_document: "ask",
      submit_form: "ask",
      purchase: "always_ask",
      money_transfer: "always_ask",
    } satisfies UserActionPolicy,
  };
}

export function getUserActionPolicy(): UserActionPolicy {
  return loadUserProfile().action_policy;
}
