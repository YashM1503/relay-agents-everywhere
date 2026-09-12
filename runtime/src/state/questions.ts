/**
 * The questions RELAY asks, one at a time, and how each is answered.
 * Prompts are short, plain, and voice-friendly (docs/product/02 UX rules).
 */
import type { Choice, NextInput } from "../contracts/builderA";
import type { Task } from "../contracts/domain";
import { fixtures, type ClinicForm, type UserProfile } from "../fixtures/load";

/** Special (non-form) question ids. */
export const Q = {
  CONFIRM_PROFILE: "__confirm_profile",
  PICK_FIELD: "__pick_field",
  RESOLVE_NAME: "__resolve_name",
} as const;

export const PROFILE_FIELDS = ["full_name", "phone", "email", "address", "preferred_language"];

/**
 * The clinic form lists both card sides, but the scripted demo has the clinic only reveal it
 * needs the back at submit time (DOCUMENT_SIDE_REQUIRED_1029). So we do not ask for it up front.
 */
export const DEFERRED_FIELDS = ["insurance_back"];

const LANGUAGE_NAMES: Record<string, string> = { en: "English", es: "Spanish", zh: "Chinese", fr: "French" };

export function profileValue(profile: UserProfile, key: string): string | null {
  switch (key) {
    case "full_name":
      return profile.display_name;
    case "phone":
      return profile.contact.phone;
    case "email":
      return profile.contact.email;
    case "address":
      return profile.contact.address;
    case "preferred_language": {
      const code = String(profile.preferences.language ?? "en");
      return LANGUAGE_NAMES[code] ?? code;
    }
    default:
      return null;
  }
}

/** Ask-user fields first (form order), then camera, then choices. */
export function questionOrder(form: ClinicForm): string[] {
  const ask = form.fields.filter((f) => f.source === "ask_user").map((f) => f.key);
  const cam = form.fields.filter((f) => f.source === "camera" && !DEFERRED_FIELDS.includes(f.key)).map((f) => f.key);
  const choose = form.fields.filter((f) => f.source === "choose").map((f) => f.key);
  return [...ask, ...cam, ...choose];
}

export function fieldLabel(form: ClinicForm, key: string): string {
  return form.fields.find((f) => f.key === key)?.label ?? key;
}

export function slotChoices(): Choice[] {
  return fixtures.appointmentSlots().slots.map((s) => ({
    id: s.id,
    label: s.label,
    note: s.accessible_entry_confirmed ? "step-free entrance confirmed" : "step-free entrance not confirmed",
  }));
}

export function contactChoices(): Choice[] {
  const tc = fixtures.trustedContacts().trusted_contacts as Array<{ name: string; relationship: string }>;
  return [...tc.map((c) => ({ id: c.name, label: `${c.name} (${c.relationship})` })), { id: "someone_else", label: "Someone else" }];
}

export const YES_NO: Choice[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
];

export const CONFIRM_PROFILE_CHOICES: Choice[] = [
  { id: "yes", label: "Yes, use those" },
  { id: "change", label: "Something changed" },
];

export interface QuestionPrompt {
  label: string;
  message: string;
  next_input: NextInput;
  choices: Choice[];
}

export function promptFor(task: Task, key: string, profile: UserProfile, form: ClinicForm): QuestionPrompt {
  switch (key) {
    case Q.CONFIRM_PROFILE: {
      const parts = PROFILE_FIELDS.map((k) => task.known_fields[k]?.value).filter(Boolean);
      return {
        label: "Confirm your details",
        next_input: "choice",
        choices: CONFIRM_PROFILE_CHOICES,
        message: `I opened ${form.organization}'s ${form.purpose.toLowerCase()}. I can fill in your name, phone, email, address and language from your profile: ${parts.join(", ")}. Is that still correct?`,
      };
    }
    case Q.PICK_FIELD:
      return {
        label: "What changed",
        next_input: "choice",
        choices: PROFILE_FIELDS.map((k) => ({ id: k, label: fieldLabel(form, k) })),
        message: "Which one should I change?",
      };
    case Q.RESOLVE_NAME: {
      const c = task.conflicts.find((x) => x.field === "full_name" && !x.resolved);
      return {
        label: "Name check",
        next_input: "choice",
        choices: [
          { id: "profile", label: c?.profile_value ?? "Profile name" },
          { id: "document", label: c?.document_value ?? "Card name" },
        ],
        message: `The insurance card says "${c?.document_value}" but your profile says "${c?.profile_value}". Which name should I use?`,
      };
    }
    case "dob":
      return { label: "Date of birth", next_input: "voice", choices: [], message: "What is your date of birth?" };
    case "emergency_contact":
      return { label: "Emergency contact", next_input: "choice", choices: contactChoices(), message: "Who should the clinic contact in an emergency?" };
    case "sms_reminders":
      return { label: "Reminders", next_input: "choice", choices: YES_NO, message: "Would you like appointment reminders by text message?" };
    case "reason_for_visit":
      return { label: "Reason for visit", next_input: "voice", choices: [], message: "In a few words, what is the reason for your visit?" };
    case "insurance_front":
      return { label: "Insurance card, front", next_input: "camera", choices: [], message: "Please take a photo of the front of your insurance card." };
    case "insurance_back":
      return { label: "Insurance card, back", next_input: "camera", choices: [], message: "Take a photo of the back of your insurance card when you're ready." };
    case "appointment_slot":
      return {
        label: "Appointment",
        next_input: "choice",
        choices: slotChoices(),
        message: profile.preferences.step_free_preferred
          ? "Which appointment works for you? I've marked which ones have a step-free entrance."
          : "Which appointment works for you?",
      };
    default:
      return {
        label: fieldLabel(form, key),
        next_input: "voice",
        choices: [],
        message: `What is your ${fieldLabel(form, key).toLowerCase()}?`,
      };
  }
}
