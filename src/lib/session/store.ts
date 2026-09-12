import { evaluateCountersign } from "@/lib/countersign/evaluate";
import type {
  ActionProposal,
  CountersignDecision,
  TaskState,
} from "@/lib/countersign/types";
import { dispatch } from "@/lib/router/dispatch";
import type { AgentRequest, RelayContext } from "@/lib/agents/types";
import {
  addAppointment,
  addReminder,
  loadClinicForm,
  resetClinicFormSubmissions,
  submitRegistration,
} from "@/lib/tools";
import { loadUserProfile } from "@/lib/tools/profile";
import { parseSyntheticInsurance } from "@/lib/tools/insurance";
import type { RelaySession } from "@/types";

export type GuidedQuestion = {
  id: string;
  label: string;
  type: "text" | "date" | "tel" | "select" | "boolean";
  options?: string[];
  placeholder?: string;
  prefilled?: string;
};

export type AuditStep = {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
};

export type SessionRecord = {
  session: RelaySession;
  task: TaskState;
  machineState:
    | "IDLE"
    | "ACTIVE_SESSION"
    | "OBSERVE"
    | "INTERPRET"
    | "ASSIST"
    | "WAIT"
    | "ACTION_PROPOSED"
    | "COUNTERSIGN"
    | "ACT"
    | "ASK"
    | "HOLD"
    | "TASK_COMPLETE";
  answers: Record<string, string>;
  captures: { front?: string; back?: string };
  backCaptureAttempts: number;
  pendingProposal: ActionProposal | null;
  countersignDecision: CountersignDecision | null;
  userConfirmed: boolean;
  executed: boolean;
  receipt: {
    receiptId: string;
    confirmationCode: string;
    appointment: string;
    calendarAdded: boolean;
    summary: string;
    auditSteps: AuditStep[];
  } | null;
  debugLog: Array<{
    phase: string;
    label: string;
    detail: string;
    timestamp: string;
  }>;
  selectedAgentId: string | null;
  lastToolError: string | null;
};

const sessions = new Map<string, SessionRecord>();

function nowIso(): string {
  return new Date().toISOString();
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

function isTrustedClinicObservation(
  observation: { type: string; value?: string },
  formId: string,
): boolean {
  const value = (observation.value ?? "").toLowerCase();
  if (!value) return observation.type === "qr" && isDemoMode();

  const trustedPatterns = [
    formId.toLowerCase(),
    "demo-clinic",
    "demo-clinic-registration",
    "demo-clinic.example",
  ];

  if (trustedPatterns.some((pattern) => value.includes(pattern))) {
    return true;
  }

  if (value.includes("clinic") && !value.includes("evil") && !value.includes("random")) {
    return true;
  }

  return false;
}

function buildGuidedQuestions(): GuidedQuestion[] {
  const form = loadClinicForm();
  const profile = loadUserProfile();

  return form.fields
    .filter((field) => field.source === "ask_user")
    .map((field) => {
      const base = {
        id: field.key,
        label: field.label,
        prefilled: undefined as string | undefined,
      };

      switch (field.key) {
        case "dob":
          return { ...base, type: "date" as const, placeholder: "MM/DD/YYYY" };
        case "sms_reminders":
          return {
            ...base,
            type: "boolean" as const,
            options: ["Yes", "No"],
          };
        case "emergency_contact":
          return {
            ...base,
            type: "text" as const,
            placeholder: "Name and phone number",
          };
        default:
          return {
            ...base,
            type: "text" as const,
            placeholder: `Enter ${field.label.toLowerCase()}`,
          };
      }
    })
    .filter((q) => q.id !== "appointment_slot");
}

function seedKnownFields(): Record<string, unknown> {
  const profile = loadUserProfile();
  return {
    full_name: profile.display_name,
    phone: profile.contact.phone,
    email: profile.contact.email,
    address: profile.contact.address,
    preferred_language: profile.preferences.language,
  };
}

function buildInitialTask(sessionId: string): TaskState {
  const form = loadClinicForm();
  const askFields = form.fields
    .filter((f) => f.source === "ask_user" && f.key !== "appointment_slot")
    .map((f) => f.key);
  const cameraFields = form.fields
    .filter((f) => f.source === "camera")
    .map((f) => f.key);

  return {
    task_id: `task_${sessionId}`,
    goal: `Complete ${form.purpose} at ${form.organization}`,
    status: "pending",
    accepted_by_user: false,
    destination_verified: false,
    known_fields: seedKnownFields(),
    unresolved_fields: [...askFields, ...cameraFields, "appointment_slot"],
    dependencies: [],
  };
}

function pushDebug(
  record: SessionRecord,
  phase: string,
  label: string,
  detail: string,
): void {
  record.debugLog.push({ phase, label, detail, timestamp: nowLabel() });
}

export function resetDemoState(): void {
  resetClinicFormSubmissions();
  sessions.clear();
}

export function createSession(options?: { demo?: boolean }): SessionRecord {
  if (options?.demo || isDemoMode()) {
    resetClinicFormSubmissions();
  }

  const sessionId = newId("s");
  const session: RelaySession = {
    sessionId,
    mode: "stay_with_me",
    status: "active",
    state: "ACTIVE_SESSION",
    startedAt: nowIso(),
    taskId: `task_${sessionId}`,
    userId: loadUserProfile().user_id,
  };

  const record: SessionRecord = {
    session,
    task: buildInitialTask(sessionId),
    machineState: "ACTIVE_SESSION",
    answers: {},
    captures: {},
    backCaptureAttempts: 0,
    pendingProposal: null,
    countersignDecision: null,
    userConfirmed: false,
    executed: false,
    receipt: null,
    debugLog: [],
    selectedAgentId: null,
    lastToolError: null,
  };

  pushDebug(record, "observation", "Session started", "User tapped Stay with me");
  sessions.set(sessionId, record);
  return record;
}

export function getSession(sessionId: string): SessionRecord | undefined {
  return sessions.get(sessionId);
}

export function findSessionByActionId(
  actionId: string,
): SessionRecord | undefined {
  for (const record of sessions.values()) {
    if (record.pendingProposal?.action_id === actionId) {
      return record;
    }
  }
  return undefined;
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function observeSession(
  sessionId: string,
  observation: { type: string; value?: string },
): SessionRecord | null {
  const record = sessions.get(sessionId);
  if (!record) return null;

  record.machineState = "OBSERVE";
  pushDebug(
    record,
    "observation",
    `Received ${observation.type}`,
    observation.value ?? "",
  );

  const form = loadClinicForm();
  const trusted = isTrustedClinicObservation(observation, form.form_id);

  if (observation.type === "qr" || observation.value?.includes("clinic")) {
    record.machineState = "INTERPRET";
    record.session.state = "INTERPRET";

    if (!trusted) {
      record.task.destination_verified = false;
      record.task.status = "pending";
      pushDebug(
        record,
        "intent",
        "Unverified destination",
        observation.value ?? "Unknown QR target",
      );
      record.machineState = "HOLD";
      record.session.state = "HOLD";
      record.lastToolError =
        "This QR code does not match Demo Clinic. I will not proceed until the destination is verified.";
      return record;
    }

    record.task.status = "in_progress";
    record.task.accepted_by_user = true;
    record.task.destination_verified = true;

    pushDebug(
      record,
      "intent",
      "Task recognized",
      `${form.purpose} at ${form.organization}`,
    );

    record.machineState = "ASSIST";
    record.session.state = "ASSIST";
  }

  return record;
}

export function getSessionStateForClient(sessionId: string) {
  const record = sessions.get(sessionId);
  if (!record) return null;

  const form = loadClinicForm();
  const profileFields = form.fields.filter((f) => f.source === "profile").length;
  const filledCount =
    profileFields +
    Object.keys(record.answers).length +
    (record.captures.front ? 1 : 0) +
    (record.captures.back ? 1 : 0);

  return {
    sessionId: record.session.sessionId,
    status: mapMachineToUiStatus(record),
    taskTitle: "Clinic registration",
    taskStep: taskStepLabel(record),
    doingSummary: doingSummary(record),
    questions: buildGuidedQuestions(),
    currentQuestionIndex: Object.keys(record.answers).length,
    filledCount,
    totalFields: form.fields.length,
    countersign: record.pendingProposal
      ? {
          actionId: record.pendingProposal.action_id,
          recipient:
            record.pendingProposal.recipient ?? record.pendingProposal.target,
          purpose:
            record.pendingProposal.purpose ??
            record.pendingProposal.payload_summary ??
            "",
          sensitiveFields: record.pendingProposal.sensitive_fields ?? [],
          evidence: record.countersignDecision?.evidence ?? [],
        }
      : null,
    receipt: record.receipt,
    debugEvents: record.debugLog,
    captureSide: record.captures.front ? "back" : "front",
    captures: record.captures,
    error: record.lastToolError,
    lastToolError: record.lastToolError,
  };
}

function mapMachineToUiStatus(record: SessionRecord): string {
  if (record.receipt) return "complete";
  if (record.pendingProposal && !record.executed) return "confirm";
  if (record.captures.front && !record.captures.back) return "capture";
  if (
    Object.keys(record.answers).length <
    buildGuidedQuestions().length
  ) {
    return "guided";
  }
  if (record.session.status === "paused") return "paused";
  return "active";
}

function taskStepLabel(record: SessionRecord): string {
  if (record.receipt) return "Done";
  if (record.pendingProposal) return "Ready to submit";
  if (record.captures.front && !record.captures.back) return "Insurance card — back";
  if (record.captures.front) return "Insurance card — front";
  if (Object.keys(record.answers).length > 0) return "Collecting information";
  if (record.task.destination_verified) return "Registration detected";
  return "Getting started";
}

function doingSummary(record: SessionRecord): string {
  if (record.lastToolError) {
    return record.lastToolError;
  }
  if (record.receipt) {
    return "Registration submitted successfully.";
  }
  if (record.pendingProposal) {
    return "Please review what will be shared before I submit.";
  }
  if (record.captures.front && !record.captures.back) {
    return "Now flip your card and capture the back. The clinic needs both sides.";
  }
  if (Object.keys(record.answers).length >= buildGuidedQuestions().length) {
    return "Great — now I need photos of your insurance card, front and back.";
  }
  if (record.task.destination_verified) {
    return "I found a clinic registration form. I'll walk you through it step by step.";
  }
  return "I'm getting ready to help you register.";
}

export function answerQuestion(
  sessionId: string,
  questionId: string,
  answer: string,
): SessionRecord | null {
  const record = sessions.get(sessionId);
  if (!record) return null;

  record.answers[questionId] = answer;
  record.task.known_fields[questionId] = answer;
  record.task.unresolved_fields = record.task.unresolved_fields.filter(
    (f) => f !== questionId,
  );

  pushDebug(
    record,
    "agent",
    "Answer recorded",
    `${questionId}: ${answer.slice(0, 40)}`,
  );

  const questions = buildGuidedQuestions();
  if (Object.keys(record.answers).length >= questions.length) {
    record.task.status = "waiting_input";
    pushDebug(record, "agent", "Guided questions complete", "Proceed to capture");
  }

  return record;
}

export function captureInsurance(
  sessionId: string,
  side: "front" | "back",
  image: string,
): { record: SessionRecord; error?: string } | null {
  const record = sessions.get(sessionId);
  if (!record) return null;

  record.lastToolError = null;

  if (side === "front") {
    record.captures.front = image;
    record.task.known_fields.insurance_front = image;
    record.task.unresolved_fields = record.task.unresolved_fields.filter(
      (f) => f !== "insurance_front",
    );

    const ocr = parseSyntheticInsurance();
    record.task.known_fields.member_id = ocr.fields.member_id;
    record.task.known_fields.plan = ocr.fields.plan;

    pushDebug(
      record,
      "tool",
      "Insurance front captured",
      `Member ${ocr.fields.member_id} · ${ocr.fields.plan}`,
    );
    return { record };
  }

  record.backCaptureAttempts += 1;

  if (isDemoMode() && record.backCaptureAttempts === 1) {
    record.lastToolError =
      "The clinic also needs a photo of the back of your insurance card.";
    pushDebug(
      record,
      "tool",
      "Back capture incomplete",
      "DOCUMENT_SIDE_REQUIRED_1029",
    );
    return { record, error: record.lastToolError };
  }

  record.captures.back = image;
  record.task.known_fields.insurance_back = image;
  record.task.unresolved_fields = record.task.unresolved_fields.filter(
    (f) => f !== "insurance_back",
  );

  record.task.known_fields.appointment_slot = "slot-1";
  record.task.unresolved_fields = record.task.unresolved_fields.filter(
    (f) => f !== "appointment_slot",
  );
  record.task.status = "ready_to_submit";

  pushDebug(record, "tool", "Insurance back captured", "Both sides ready");
  return { record };
}

export async function proposeAction(
  sessionId: string,
  actionType: string,
): Promise<{ record: SessionRecord; proposal: ActionProposal } | null> {
  const record = sessions.get(sessionId);
  if (!record) return null;

  const form = loadClinicForm();
  const actionId = newId("a");

  const sensitiveFields = form.fields
    .filter((f) => f.sensitive)
    .map((f) => f.label);

  const proposal: ActionProposal = {
    action_id: actionId,
    action_type: actionType === "submitRegistration" ? "submit_registration" : actionType,
    target: form.form_id,
    recipient: form.organization,
    purpose: form.purpose,
    payload_summary: "New patient registration with insurance",
    sensitive_fields: sensitiveFields,
    destination_verified: true,
    payload: {
      ...record.task.known_fields,
      insurance_front: record.captures.front,
      insurance_back: record.captures.back,
    },
  };

  record.pendingProposal = proposal;
  record.machineState = "ACTION_PROPOSED";
  record.session.state = "ACTION_PROPOSED";

  const agentRequest: AgentRequest = {
    taskType: "forms",
    requiredCapabilities: ["forms", "vision"],
    privacyRequirement: "cloud",
    requiredModalities: ["text", "image"],
    requiresTools: true,
    prompt: record.task.goal,
  };
  const routing = await dispatch(agentRequest, {} as RelayContext);
  record.selectedAgentId = routing.primary_agent;

  const decision = evaluateCountersign(
    proposal,
    record.task,
    loadUserProfile().action_policy,
  );
  record.countersignDecision = decision;
  record.machineState = "COUNTERSIGN";
  record.session.state = "COUNTERSIGN";

  pushDebug(
    record,
    "proposal",
    "Submit registration proposed",
    `Tier-2 · verdict: ${decision.verdict}`,
  );
  pushDebug(
    record,
    "agent",
    "Agent selected",
    routing.primary_agent,
  );

  return { record, proposal };
}

export function confirmAction(actionId: string): SessionRecord | null {
  for (const record of sessions.values()) {
    if (record.pendingProposal?.action_id === actionId) {
      record.userConfirmed = true;
      if (record.pendingProposal) {
        record.pendingProposal.user_confirmed = true;
      }
      pushDebug(record, "countersign", "User confirmed", "Explicit approval received");
      return record;
    }
  }
  return null;
}

export function executeAction(actionId: string): {
  record: SessionRecord;
  success: boolean;
  error?: string;
} | null {
  for (const record of sessions.values()) {
    if (record.pendingProposal?.action_id !== actionId) continue;
    if (record.executed) {
      return { record, success: true };
    }

    if (!record.userConfirmed) {
      return { record, success: false, error: "User confirmation required" };
    }

    const proposal = record.pendingProposal;
    const decision = evaluateCountersign(
      proposal,
      record.task,
      loadUserProfile().action_policy,
    );

    if (decision.verdict !== "allow" && proposal.user_confirmed !== true) {
      return { record, success: false, error: decision.explanation };
    }

    const result = submitRegistration({
      action_id: actionId,
      insurance_front: record.captures.front,
      insurance_back: record.captures.back,
      ...record.task.known_fields,
    });

    if (!result.success) {
      record.lastToolError = result.relay_translation;
      pushDebug(record, "tool", "Submit failed", result.error_code);
      return { record, success: false, error: result.relay_translation };
    }

    const appointment = addAppointment("slot-1");
    addReminder({
      title: `Appointment at Demo Clinic — ${appointment.slot.label}`,
      slot_id: "slot-1",
    });

    record.executed = true;
    record.task.status = "completed";
    record.machineState = "TASK_COMPLETE";
    record.session.state = "TASK_COMPLETE";
    record.session.status = "ended";

    record.receipt = {
      receiptId: newId("r"),
      confirmationCode: result.confirmation_code,
      appointment: appointment.slot.label,
      calendarAdded: true,
      summary: "Registration submitted.",
      auditSteps: buildAuditTrail(record, result.confirmation_code),
    };

    pushDebug(
      record,
      "tool",
      "Registration submitted",
      `Confirmation ${result.confirmation_code}`,
    );

    return { record, success: true };
  }
  return null;
}

function buildAuditTrail(
  record: SessionRecord,
  confirmationCode: string,
): AuditStep[] {
  return [
    {
      id: "1",
      label: "Understood clinic request",
      detail: "Detected registration form at Demo Clinic",
      timestamp: nowLabel(),
    },
    {
      id: "2",
      label: "Opened registration",
      detail: "Started new patient registration workflow",
      timestamp: nowLabel(),
    },
    {
      id: "3",
      label: "Reused known fields",
      detail: `Used ${Object.keys(seedKnownFields()).length} saved profile fields`,
      timestamp: nowLabel(),
    },
    {
      id: "4",
      label: "Asked guided questions",
      detail: `Collected ${Object.keys(record.answers).length} answers one at a time`,
      timestamp: nowLabel(),
    },
    {
      id: "5",
      label: "Captured insurance card",
      detail: "Front and back photos processed",
      timestamp: nowLabel(),
    },
    ...(record.backCaptureAttempts > 1
      ? [
          {
            id: "6",
            label: "Fixed document error",
            detail: "Retried back-of-card capture after clinic validation",
            timestamp: nowLabel(),
          },
        ]
      : []),
    {
      id: "7",
      label: "Asked before sharing personal data",
      detail: "COUNTERSIGN confirmation received",
      timestamp: nowLabel(),
    },
    {
      id: "8",
      label: "Submitted registration",
      detail: `Confirmation ${confirmationCode}`,
      timestamp: nowLabel(),
    },
  ];
}

export function cancelSession(sessionId: string): boolean {
  const record = sessions.get(sessionId);
  if (!record) return false;
  record.session.status = "ended";
  record.machineState = "IDLE";
  record.pendingProposal = null;
  pushDebug(record, "observation", "Session cancelled", "User stopped assistance");
  sessions.delete(sessionId);
  return true;
}

export function pauseSession(sessionId: string, paused: boolean): SessionRecord | null {
  const record = sessions.get(sessionId);
  if (!record) return null;
  record.session.status = paused ? "paused" : "active";
  return record;
}
