/**
 * Deterministic demo tools (docs/builders/09 step 4). Each is a plain async function returning
 * ToolResult. Tier 2+ effects are only reachable from flow/execute.ts with a confirmed proposal;
 * that guard lives in the executor, not here.
 */
import type { ToolResult } from "../contracts/domain";
import { fixtures } from "../fixtures/load";

export interface DemoFormState {
  form_id: string;
  organization: string;
  values: Record<string, unknown>;
  submitted: boolean;
}

/** In-memory "browser tab" per session for the demo clinic form. */
const openForms = new Map<string, DemoFormState>();
/** Idempotency: submission key -> confirmation code. A retry never submits twice. */
const submissions = new Map<string, string>();
const calendar: Array<{ event_id: string; title: string; slot_id: string; label: string }> = [];

export const tools = {
  async lookup_profile(userId: string): Promise<ToolResult> {
    const profile = fixtures.userProfile();
    if (profile.user_id !== userId) return { ok: false, tool: "lookup_profile", error_code: "PROFILE_NOT_FOUND", error_message: "I couldn't find your profile." };
    return { ok: true, tool: "lookup_profile", data: profile };
  },

  async open_demo_form(sessionId: string): Promise<ToolResult<DemoFormState>> {
    const form = fixtures.clinicForm();
    const existing = openForms.get(sessionId);
    if (existing && !existing.submitted) return { ok: true, tool: "open_demo_form", data: existing };
    const state: DemoFormState = { form_id: form.form_id, organization: form.organization, values: {}, submitted: false };
    openForms.set(sessionId, state);
    return { ok: true, tool: "open_demo_form", data: state };
  },

  async fill_form(sessionId: string, values: Record<string, unknown>): Promise<ToolResult<DemoFormState>> {
    const state = openForms.get(sessionId);
    if (!state) return { ok: false, tool: "fill_form", error_code: "FORM_NOT_OPEN", error_message: "The registration form isn't open." };
    state.values = { ...values };
    return { ok: true, tool: "fill_form", data: state };
  },

  async submit_form(sessionId: string, idempotencyKey: string): Promise<ToolResult<{ confirmation_code: string; duplicate?: boolean }>> {
    const prior = submissions.get(idempotencyKey);
    if (prior) return { ok: true, tool: "submit_form", data: { confirmation_code: prior, duplicate: true } };
    const state = openForms.get(sessionId);
    if (!state) return { ok: false, tool: "submit_form", error_code: "FORM_NOT_OPEN", error_message: "The registration form isn't open." };
    const form = fixtures.clinicForm();
    // Deliberate demo error: the clinic validates that both card sides are attached.
    if (!state.values.insurance_back) {
      return {
        ok: false,
        tool: "submit_form",
        error_code: form.deliberate_error.machine_message,
        error_message: form.deliberate_error.relay_translation,
      };
    }
    const code = `DEMO-${idempotencyKey.replace(/[^a-z0-9]/gi, "").slice(-5).toUpperCase()}`;
    state.submitted = true;
    submissions.set(idempotencyKey, code);
    return { ok: true, tool: "submit_form", data: { confirmation_code: code } };
  },

  async create_calendar_event(title: string, slotId: string): Promise<ToolResult<{ event_id: string; label: string; accessible_entry_confirmed: boolean }>> {
    const slot = fixtures.appointmentSlots().slots.find((s) => s.id === slotId);
    if (!slot) return { ok: false, tool: "create_calendar_event", error_code: "SLOT_NOT_FOUND", error_message: "That appointment time is no longer available." };
    const event_id = `evt_${slotId}_${calendar.length + 1}`;
    calendar.push({ event_id, title, slot_id: slotId, label: slot.label });
    return { ok: true, tool: "create_calendar_event", data: { event_id, label: slot.label, accessible_entry_confirmed: slot.accessible_entry_confirmed } };
  },
};

export function getOpenForm(sessionId: string): DemoFormState | undefined {
  return openForms.get(sessionId);
}

export function listCalendar() {
  return [...calendar];
}

export function resetTools(): void {
  openForms.clear();
  submissions.clear();
  calendar.length = 0;
}
