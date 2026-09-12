import { evaluateCountersign } from "@/lib/countersign/evaluate";
import type {
  ActionProposal,
  CountersignDecision,
  TaskState,
} from "@/lib/countersign/types";
import { dispatch } from "@/lib/router/dispatch";
import { runWithFallback } from "@/lib/agents/execute";
import type { AgentRequest, RelayContext } from "@/lib/agents/types";
import {
  addAppointment,
  addReminder,
  loadClinicForm,
  resetClinicFormSubmissions,
  submitRegistration,
} from "@/lib/tools";
import { isDemoMode } from "@/lib/config/app-mode";
import { loadUserProfile } from "@/lib/tools/profile";
import { parseSyntheticInsurance } from "@/lib/tools/insurance";
import type { RelaySession } from "@/types";

export type SessionScenario = "general" | "clinic";

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
  scenario: SessionScenario;
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

function buildGuidedQuestions(scenario: SessionScenario = "clinic"): GuidedQuestion[] {
  if (scenario !== "clinic") return [];
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

function buildInitialTask(
  sessionId: string,
  scenario: SessionScenario = "general",
): TaskState {
  if (scenario === "clinic") {
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
      known_fields: isDemoMode() ? seedKnownFields() : {},
      unresolved_fields: [...askFields, ...cameraFields, "appointment_slot"],
      dependencies: [],
    };
  }

  return {
    task_id: `task_${sessionId}`,
    goal: "Help with what you are doing right now",
    status: "pending",
    accepted_by_user: false,
    destination_verified: false,
    known_fields: {},
    unresolved_fields: [],
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

export function createSession(options?: {
  demo?: boolean;
  scenario?: SessionScenario;
}): SessionRecord {
  const demo = options?.demo ?? isDemoMode();
  const scenario: SessionScenario =
    options?.scenario ?? (demo ? "clinic" : "general");

  if (demo) {
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
    task: buildInitialTask(sessionId, scenario),
    machineState: "ACTIVE_SESSION",
    scenario,
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

const MONEY_REQUEST = /\$\s?\d+|\b\d+\s?(dollars|usd|bucks)\b|\b(pay|payment|send money|transfer|wire|venmo|zelle|gift card)\b/i;

/** A message the user shared with RELAY (forwarded text, screenshot text). Untrusted data. */
function observeSharedMessage(record: SessionRecord, value: string): SessionRecord {
  if (MONEY_REQUEST.test(value)) {
    record.lastToolError =
      "This message asks for money and does not match the registration we are completing. I left it untouched. If you like, I can help you verify it with the clinic.";
    pushDebug(record, "countersign", "Payment request left untouched", value.slice(0, 80));
  } else {
    pushDebug(record, "observation", "Shared message noted", "Not acted on");
  }
  return record;
}

export type ObservePayload = {
  type: string;
  value?: string;
  transcript?: string;
  confidence?: number;
  imageRef?: string;
};

export function observeSession(
  sessionId: string,
  observation: ObservePayload,
): SessionRecord | null {
  const record = sessions.get(sessionId);
  if (!record) return null;

  if (observation.type === "message" || observation.type === "document") {
    return observeSharedMessage(record, observation.value ?? "");
  }

  record.machineState = "OBSERVE";
  pushDebug(
    record,
    "observation",
    `Received ${observation.type}`,
    observation.transcript ?? observation.value ?? "",
  );

  if (observation.type === "voice") {
    const transcript = (observation.transcript ?? observation.value ?? "").trim();
    record.task.known_fields = {
      ...record.task.known_fields,
      user_intent: transcript,
      voice_confidence: observation.confidence,
    };

    const clinicSignal =
      /clinic|registration|register|appointment|check.?in/i.test(transcript);

    if (record.scenario === "general") {
      record.task.status = "in_progress";
      record.task.accepted_by_user = true;
      if (transcript) record.task.goal = transcript.slice(0, 160);
      record.machineState = "ASSIST";
      record.session.state = "ASSIST";
      record.lastToolError = null;
      pushDebug(record, "intent", "Voice input understood", transcript.slice(0, 80));
      return record;
    }

    if (clinicSignal) {
      record.task.status = "in_progress";
      record.task.accepted_by_user = true;
      record.machineState = "ASSIST";
      record.session.state = "ASSIST";
      pushDebug(record, "intent", "Clinic intent from voice", transcript.slice(0, 80));
      return record;
    }

    pushDebug(record, "observation", "Voice noted", transcript.slice(0, 80) || "No transcript");
    return record;
  }

  if (observation.type === "image") {
    const ref = observation.imageRef ?? observation.value ?? "";
    record.task.known_fields = { ...record.task.known_fields, last_image: ref };
    record.task.status = "in_progress";
    record.machineState = "ASSIST";
    record.session.state = "ASSIST";
    pushDebug(record, "observation", "Image received", "Ready to help");
    return record;
  }

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

    record.scenario = "clinic";
    const clinicTask = buildInitialTask(record.session.sessionId, "clinic");
    record.task = {
      ...clinicTask,
      known_fields: {
        ...clinicTask.known_fields,
        ...record.task.known_fields,
      },
      status: "in_progress",
      accepted_by_user: true,
      destination_verified: true,
    };
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
  const questions = buildGuidedQuestions(record.scenario);
  const profileFields =
    record.scenario === "clinic"
      ? form.fields.filter((f) => f.source === "profile").length
      : 0;
  const filledCount =
    profileFields +
    Object.keys(record.answers).length +
    (record.captures.front ? 1 : 0) +
    (record.captures.back ? 1 : 0);

  return {
    sessionId: record.session.sessionId,
    status: mapMachineToUiStatus(record),
    taskTitle:
      record.scenario === "clinic" ? "Clinic registration" : "Stay with me",
    taskStep: taskStepLabel(record),
    doingSummary: doingSummary(record),
    questions,
    currentQuestionIndex: Object.keys(record.answers).length,
    filledCount,
    totalFields: record.scenario === "clinic" ? form.fields.length : 0,
    scenario: record.scenario,
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
  if (record.scenario === "clinic") {
    if (record.captures.front && !record.captures.back) return "capture";
    const questions = buildGuidedQuestions(record.scenario);
    if (Object.keys(record.answers).length < questions.length) {
      return "guided";
    }
  }
  if (record.session.status === "paused") return "paused";
  return "active";
}

function taskStepLabel(record: SessionRecord): string {
  if (record.receipt) return "Done";
  if (record.pendingProposal) return "Ready to submit";
  if (record.scenario === "general") {
    if (record.task.known_fields.user_intent) return "Working with you";
    return "Getting started";
  }
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
    return record.scenario === "clinic"
      ? "Registration submitted successfully."
      : "Done. Here is your receipt.";
  }
  if (record.pendingProposal) {
    return "Please review what will be shared before I submit.";
  }
  if (record.scenario === "general") {
    if (record.task.known_fields.user_intent) {
      return "I'm with you. Tell me more, or tap Stop if you want to end this session.";
    }
    return "Tell me what you're working on. You can speak or type — I'm listening.";
  }
  if (record.captures.front && !record.captures.back) {
    return "Now flip your card and capture the back. The clinic needs both sides.";
  }
  if (
    Object.keys(record.answers).length >=
    buildGuidedQuestions(record.scenario).length
  ) {
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

  const questions = buildGuidedQuestions(record.scenario);
  if (questions.length > 0 && Object.keys(record.answers).length >= questions.length) {
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

    // A hold or deny is never overridden by tapping Submit. Confirmation resolves "confirm" only;
    // unmet proof obligations (destination, contradictions, missing fields) must be fixed first.
    if (decision.verdict === "hold" || decision.verdict === "deny") {
      record.lastToolError = decision.explanation;
      pushDebug(
        record,
        "countersign",
        "Execution refused",
        decision.unresolved.join("; ") || decision.explanation,
      );
      return { record, success: false, error: decision.explanation };
    }
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


// ---- Builder 2: proposal cancel, live vision, provider status -----------------------------------

/** Server-side cancel of a pending proposal (QA case 11). Nothing is shared; the session continues. */
export function cancelProposal(actionId: string): SessionRecord | null {
  for (const record of sessions.values()) {
    if (record.pendingProposal?.action_id !== actionId) continue;
    record.pendingProposal = null;
    record.countersignDecision = null;
    record.userConfirmed = false;
    record.machineState = "ASSIST";
    record.session.state = "ASSIST";
    pushDebug(record, "countersign", "Submission cancelled", "Pending proposal cleared; nothing was shared");
    return record;
  }
  return null;
}

export function isLiveVisionEnabled(): boolean {
  return process.env.RELAY_LIVE_VISION === "true";
}

function nameKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export type VisionEnrichment = {
  record: SessionRecord;
  used: "live" | "synthetic";
  agentId: string;
  contradiction?: string;
};

/**
 * Read a captured card photo with the routed vision agent and replace the synthetic OCR values.
 * Falls back to the synthetic card when no live agent is available or nothing legible came back.
 * A card name that differs from the profile is recorded as a contradiction: COUNTERSIGN will hold.
 */
export async function enrichCaptureWithVision(
  sessionId: string,
  side: "front" | "back",
  image: string,
  run: typeof runWithFallback = runWithFallback,
): Promise<VisionEnrichment | null> {
  const record = sessions.get(sessionId);
  if (!record) return null;

  const request: AgentRequest = {
    taskType: "extract_document",
    requiredCapabilities: ["vision"],
    requiredModalities: ["text", "image"],
    prompt:
      side === "front"
        ? "Read the FRONT of an insurance card. Return findings with keys member_name, member_id, plan, group. Only include values that are clearly legible."
        : "Read the BACK of an insurance card. Return findings with keys rx_bin, customer_service_phone. Only include values that are clearly legible.",
    attachments: [{ type: "image", dataUrl: image, label: `insurance_${side}` }],
    timeoutMs: 20_000,
  };
  const context: RelayContext = {
    userPreferences: {},
    currentEnvironment: [{ type: "image", source: "phone" }],
    currentTask: {
      taskId: record.task.task_id,
      goal: record.task.goal,
      status: record.task.status,
      unresolvedFields: record.task.unresolved_fields,
    },
    conversationContext: [],
    connectedSources: [],
    permissions: {},
  };

  const { result, agentId, attempts } = await run(request, context);
  const findings = Object.fromEntries(result.findings.map((f) => [f.key, f.value]));
  const legible = side === "front" ? Boolean(findings.member_id) : Boolean(findings.rx_bin);

  if (result.status !== "completed" || agentId === "local-fallback" || agentId === "none" || !legible) {
    pushDebug(record, "agent", `Card ${side}: synthetic values`, attempts.join(" | ") || `${agentId}: ${result.summary}`);
    return { record, used: "synthetic", agentId };
  }

  record.selectedAgentId = agentId;
  if (side === "front") {
    if (findings.member_id) record.task.known_fields.member_id = findings.member_id;
    if (findings.plan) record.task.known_fields.plan = findings.plan;
    if (findings.group) record.task.known_fields.group = findings.group;
  } else if (findings.rx_bin) {
    record.task.known_fields.rx_bin = findings.rx_bin;
  }
  pushDebug(
    record,
    "agent",
    `Card ${side} read by ${agentId}`,
    Object.entries(findings).map(([k, v]) => `${k}=${v}`).join(" · "),
  );

  let contradiction: string | undefined;
  const profileName = loadUserProfile().display_name;
  if (side === "front" && findings.member_name && nameKey(findings.member_name) !== nameKey(profileName)) {
    contradiction = `The card says "${findings.member_name}" but your profile says "${profileName}".`;
    record.task.contradictions = [
      ...(record.task.contradictions ?? []).filter((c) => c.field !== "full_name"),
      { field: "full_name", sources: [`profile: ${profileName}`, `card: ${findings.member_name}`] },
    ];
    record.lastToolError = `${contradiction} Please check with the desk before I submit anything.`;
    pushDebug(record, "countersign", "Name mismatch", contradiction);
  }
  return { record, used: "live", agentId, contradiction };
}
