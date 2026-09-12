/**
 * Loads the synthetic fixtures in ../demo-data. Everything the demo needs is here;
 * no live external system is required for the happy path.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEMO_DATA_DIR = path.resolve(here, "../../../demo-data");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(DEMO_DATA_DIR, name), "utf8")) as T;
}

export interface ClinicFormField {
  key: string;
  label: string;
  source: "profile" | "ask_user" | "camera" | "choose";
  sensitive: boolean;
}

export interface ClinicForm {
  form_id: string;
  organization: string;
  purpose: string;
  fields: ClinicFormField[];
  deliberate_error: { trigger: string; machine_message: string; relay_translation: string };
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  preferences: Record<string, boolean | string>;
  contact: { phone: string; email: string; address: string };
  action_policy: Record<string, "auto" | "ask" | "always_ask" | "never_auto">;
}

export interface ActionPolicy {
  tier0: string[];
  tier1: string[];
  tier2: string[];
  tier3: string[];
  default_tier3: string;
}

export interface AgentRegistryEntry {
  id: string;
  display_name: string;
  capabilities: string[];
  status: "live" | "mock" | "adapter_placeholder";
  privacy_class: string;
}

export const fixtures = {
  userProfile: () => readJson<UserProfile>("user_profile.json"),
  clinicForm: () => readJson<ClinicForm>("clinic_form.json"),
  insuranceCard: () => readJson<Record<string, unknown>>("insurance_card.json"),
  appointmentSlots: () =>
    readJson<{ slots: Array<{ id: string; label: string; accessible_entry_confirmed: boolean }> }>(
      "appointment_slots.json",
    ),
  actionPolicy: () => readJson<ActionPolicy>("action_policy.json"),
  agentRegistry: () => readJson<{ agents: AgentRegistryEntry[] }>("agent_registry.json"),
  trustedContacts: () => readJson<Record<string, unknown>>("trusted_contacts.json"),
  scenarios: () => readJson<Record<string, unknown>>("demo_scenarios.json"),
};
