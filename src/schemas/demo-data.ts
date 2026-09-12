import { z } from "zod";
import { agentCapabilitySchema } from "./agent";

const demoAccessibilityPreferencesSchema = z.object({
  large_text: z.boolean(),
  voice_first: z.boolean(),
  one_question_at_a_time: z.boolean(),
  language: z.string().min(1),
  read_important_choices_aloud: z.boolean().optional(),
  step_free_preferred: z.boolean().optional(),
});

const demoPermissionPolicySchema = z.object({
  draft: z.enum(["auto", "ask", "always_ask", "never_auto"]).optional(),
  calendar: z.enum(["auto", "ask", "always_ask", "never_auto"]).optional(),
  send_message: z.enum(["auto", "ask", "always_ask", "never_auto"]).optional(),
  share_document: z.enum(["auto", "ask", "always_ask", "never_auto"]).optional(),
  submit_form: z.enum(["auto", "ask", "always_ask", "never_auto"]).optional(),
  purchase: z.enum(["auto", "ask", "always_ask", "never_auto"]).optional(),
  money_transfer: z.enum(["auto", "ask", "always_ask", "never_auto"]).optional(),
});

export const demoUserProfileSchema = z.object({
  user_id: z.string().min(1),
  display_name: z.string().min(1),
  synthetic: z.boolean(),
  preferences: demoAccessibilityPreferencesSchema,
  contact: z.object({
    phone: z.string().min(1),
    email: z.string().email(),
    address: z.string().min(1),
  }),
  action_policy: demoPermissionPolicySchema,
});

export const demoTrustedContactsSchema = z.object({
  trusted_contacts: z.array(
    z.object({
      name: z.string().min(1),
      relationship: z.string().min(1),
      permissions: z.array(z.string().min(1)),
      silent_monitoring: z.boolean(),
    }),
  ),
});

export const demoInsuranceCardSchema = z.object({
  synthetic: z.boolean(),
  member_name: z.string().min(1),
  plan: z.string().min(1),
  member_id: z.string().min(1),
  group: z.string().min(1),
  rx_bin: z.string().min(1),
  note: z.string().min(1),
});

export const demoScenarioEdgeCaseSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  expected: z.string().min(1),
});

export const demoScenariosSchema = z.object({
  primary: z.object({
    name: z.string().min(1),
    start: z.string().min(1),
    expected_end: z.string().min(1),
  }),
  edge_cases: z.array(demoScenarioEdgeCaseSchema),
});

export const demoClinicFormFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  source: z.enum(["profile", "ask_user", "camera", "choose"]),
  sensitive: z.boolean(),
});

export const demoClinicFormSchema = z.object({
  form_id: z.string().min(1),
  organization: z.string().min(1),
  purpose: z.string().min(1),
  fields: z.array(demoClinicFormFieldSchema),
  deliberate_error: z.object({
    trigger: z.string().min(1),
    machine_message: z.string().min(1),
    relay_translation: z.string().min(1),
  }),
});

export const demoAppointmentSlotsSchema = z.object({
  slots: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      accessible_entry_confirmed: z.boolean(),
    }),
  ),
});

export const demoAgentRegistryEntrySchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  capabilities: z.array(agentCapabilitySchema),
  status: z.enum(["live", "mock", "adapter_placeholder", "unavailable"]),
  privacy_class: z.enum(["cloud", "device", "hybrid", "unknown"]),
});

export const demoAgentRegistrySchema = z.object({
  agents: z.array(demoAgentRegistryEntrySchema),
  note: z.string().min(1),
});

export const demoActionPolicySchema = z.object({
  tier0: z.array(z.string().min(1)),
  tier1: z.array(z.string().min(1)),
  tier2: z.array(z.string().min(1)),
  tier3: z.array(z.string().min(1)),
  default_tier3: z.string().min(1),
});

export const demoDataSchemas = {
  "user_profile.json": demoUserProfileSchema,
  "trusted_contacts.json": demoTrustedContactsSchema,
  "insurance_card.json": demoInsuranceCardSchema,
  "demo_scenarios.json": demoScenariosSchema,
  "clinic_form.json": demoClinicFormSchema,
  "appointment_slots.json": demoAppointmentSlotsSchema,
  "agent_registry.json": demoAgentRegistrySchema,
  "action_policy.json": demoActionPolicySchema,
} as const;

export type DemoDataFileName = keyof typeof demoDataSchemas;
