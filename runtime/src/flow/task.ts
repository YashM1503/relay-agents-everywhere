/**
 * Task construction and field bookkeeping. Every field carries provenance; "unknown" means ask.
 */
import type { FieldValue, Provenance, Task } from "../contracts/domain";
import { fixtures, type ClinicForm, type UserProfile } from "../fixtures/load";
import { newId } from "../util/ids";
import { Q, profileValue, questionOrder } from "../state/questions";

export const DEMO_CLINIC_DOMAIN = "demo-clinic.example";

export function buildTask(profile: UserProfile, form: ClinicForm, opts: { target_domain?: string; destination_verified: boolean }): Task {
  const known: Record<string, FieldValue> = {};
  for (const f of form.fields) {
    if (f.source !== "profile") continue;
    const v = profileValue(profile, f.key);
    known[f.key] = { key: f.key, value: v, provenance: v == null ? "unknown" : "profile", sensitive: f.sensitive };
  }
  const unresolved = questionOrder(form);
  return {
    task_id: newId("t"),
    goal: `${form.purpose} at ${form.organization}`,
    status: "in_progress",
    known_fields: known,
    unresolved_fields: unresolved,
    current_question: Q.CONFIRM_PROFILE,
    target_org: form.organization,
    target_domain: opts.target_domain ?? DEMO_CLINIC_DOMAIN,
    destination_verified: opts.destination_verified,
    profile_confirmed: false,
    documents: {},
    conflicts: [],
    questions_asked: 0,
    total_questions: unresolved.length + 1,
  };
}

export function isFormField(key: string): boolean {
  return fixtures.clinicForm().fields.some((f) => f.key === key);
}

export function isSensitive(key: string): boolean {
  return fixtures.clinicForm().fields.find((f) => f.key === key)?.sensitive ?? true;
}

export function recordAnswer(task: Task, key: string, value: string | boolean | null, provenance: Provenance, note?: string): void {
  task.known_fields[key] = { key, value, provenance, sensitive: isSensitive(key), note };
  task.unresolved_fields = task.unresolved_fields.filter((k) => k !== key);
  if (task.current_question === key) task.current_question = undefined;
  task.expect_free_text = false;
  task.questions_asked++;
}

/** A special question (confirm profile, pick field, name check) was answered. */
export function answeredSpecial(task: Task): void {
  task.current_question = undefined;
  task.questions_asked++;
}

export function addSpecialQuestion(task: Task, key: string): void {
  task.current_question = key;
  task.total_questions++;
}

/** Put a field back on the queue: the user changed their mind, or the clinic asked for more. */
export function reopenField(task: Task, key: string): void {
  if (!task.unresolved_fields.includes(key)) {
    task.unresolved_fields.unshift(key);
    task.total_questions++;
  }
  task.current_question = key;
}

export function buildPayload(task: Task, form: ClinicForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const f of form.fields) {
    const fv = task.known_fields[f.key];
    if (fv && fv.value !== null && fv.value !== undefined) payload[f.key] = fv.value;
  }
  return payload;
}

function sourceText(task: Task, fv: FieldValue): string {
  switch (fv.provenance) {
    case "profile":
      return task.profile_confirmed ? "from your profile, confirmed" : "from your profile";
    case "user":
      return "you told me";
    case "document":
      return "from your card";
    case "external":
      return "from the clinic";
    default:
      return "unknown";
  }
}

export function displayValue(task: Task, key: string): string {
  const fv = task.known_fields[key];
  if (!fv || fv.value === null) return "";
  if (key === "insurance_front" || key === "insurance_back") {
    const memberId = task.documents[key]?.extracted.find((x) => x.key === "member_id")?.value;
    return "photo attached" + (memberId ? `, member ID ending ${String(memberId).slice(-4)}` : "");
  }
  if (key === "appointment_slot") {
    return fixtures.appointmentSlots().slots.find((s) => s.id === fv.value)?.label ?? String(fv.value);
  }
  if (typeof fv.value === "boolean") return fv.value ? "Yes" : "No";
  return String(fv.value);
}

/** One line per field, shown to the user before they confirm. */
export function summaryLines(task: Task, form: ClinicForm): string[] {
  const lines: string[] = [];
  for (const f of form.fields) {
    const fv = task.known_fields[f.key];
    if (!fv || fv.value === null) continue;
    lines.push(`${f.label}: ${displayValue(task, f.key)} (${sourceText(task, fv)})`);
  }
  return lines;
}

export function sensitiveLabels(task: Task, form: ClinicForm): string[] {
  return form.fields.filter((f) => f.sensitive && task.known_fields[f.key]?.value != null).map((f) => f.label);
}
