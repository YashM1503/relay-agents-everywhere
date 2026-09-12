"use client";

import { useCallback, useEffect, useState } from "react";

export type SessionStatus =
  | "idle"
  | "active"
  | "paused"
  | "guided"
  | "capture"
  | "confirm"
  | "complete";

export type GuidedQuestion = {
  id: string;
  label: string;
  type: "text" | "date" | "tel" | "select" | "boolean";
  options?: string[];
  placeholder?: string;
  prefilled?: string;
};

export type CountersignData = {
  actionId: string;
  recipient: string;
  purpose: string;
  sensitiveFields: string[];
  evidence: string[];
};

export type AuditStep = {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
};

export type ReceiptData = {
  receiptId: string;
  confirmationCode: string;
  appointment: string;
  calendarAdded: boolean;
  summary: string;
  auditSteps: AuditStep[];
};

export type DebugEvent = {
  phase:
    | "observation"
    | "intent"
    | "agent"
    | "proposal"
    | "countersign"
    | "tool";
  label: string;
  detail: string;
  timestamp: string;
};

export type SessionState = {
  sessionId: string | null;
  status: SessionStatus;
  taskTitle: string;
  taskStep: string;
  doingSummary: string;
  questions: GuidedQuestion[];
  currentQuestionIndex: number;
  filledCount: number;
  totalFields: number;
  countersign: CountersignData | null;
  receipt: ReceiptData | null;
  debugEvents: DebugEvent[];
  captureSide: "front" | "back";
  captures: { front?: string; back?: string };
  error: string | null;
};

const MOCK_QUESTIONS: GuidedQuestion[] = [
  {
    id: "dob",
    label: "What is your date of birth?",
    type: "date",
    placeholder: "MM/DD/YYYY",
  },
  {
    id: "emergency_contact",
    label: "Who should we call in an emergency?",
    type: "text",
    placeholder: "Name and phone number",
  },
  {
    id: "sms_reminders",
    label: "Would you like appointment reminders by text?",
    type: "boolean",
    options: ["Yes", "No"],
  },
  {
    id: "reason_for_visit",
    label: "What is the reason for your visit?",
    type: "text",
    placeholder: "Brief description",
  },
];

const MOCK_COUNTERSIGN: CountersignData = {
  actionId: "action-demo-001",
  recipient: "Demo Clinic",
  purpose: "New patient registration",
  sensitiveFields: [
    "Full name",
    "Date of birth",
    "Phone number",
    "Insurance card image",
  ],
  evidence: ["Clinic QR code scanned", "Insurance card captured"],
};

const MOCK_RECEIPT: ReceiptData = {
  receiptId: "receipt-demo-001",
  confirmationCode: "DEMO-48291",
  appointment: "Sep 18, 2:30 PM",
  calendarAdded: true,
  summary: "Registration submitted.",
  auditSteps: [
    {
      id: "1",
      label: "Observed clinic QR code",
      detail: "Detected registration form at demo-clinic.example.com",
      timestamp: "2:14 PM",
    },
    {
      id: "2",
      label: "Interpreted intent",
      detail: "Clinic registration — new patient signup",
      timestamp: "2:14 PM",
    },
    {
      id: "3",
      label: "Filled profile fields",
      detail: "Used 6 saved fields from your profile",
      timestamp: "2:15 PM",
    },
    {
      id: "4",
      label: "Collected missing information",
      detail: "Asked 4 questions one at a time",
      timestamp: "2:16 PM",
    },
    {
      id: "5",
      label: "Captured insurance card",
      detail: "Front and back photos uploaded",
      timestamp: "2:17 PM",
    },
    {
      id: "6",
      label: "You confirmed submission",
      detail: "COUNTERSIGN approved — shared with Demo Clinic",
      timestamp: "2:18 PM",
    },
    {
      id: "7",
      label: "Submitted registration",
      detail: "Confirmation DEMO-48291 · Appointment Sep 18, 2:30 PM",
      timestamp: "2:18 PM",
    },
  ],
};

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function pushDebug(
  events: DebugEvent[],
  phase: DebugEvent["phase"],
  label: string,
  detail: string,
): DebugEvent[] {
  return [...events, { phase, label, detail, timestamp: nowLabel() }];
}

const INITIAL: SessionState = {
  sessionId: null,
  status: "idle",
  taskTitle: "Clinic registration",
  taskStep: "Getting started",
  doingSummary: "I'm getting ready to help you register.",
  questions: [],
  currentQuestionIndex: 0,
  filledCount: 6,
  totalFields: 12,
  countersign: null,
  receipt: null,
  debugEvents: [],
  captureSide: "front",
  captures: {},
  error: null,
};

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useSessionFlow() {
  const [state, setState] = useState<SessionState>(INITIAL);

  const update = useCallback((patch: Partial<SessionState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const startSession = useCallback(async () => {
    const result = await apiFetch<{ sessionId: string }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ demo: true }),
    });

    const sessionId = result?.sessionId ?? `demo-${Date.now()}`;
    setState({
      ...INITIAL,
      sessionId,
      status: "active",
      taskStep: "Scanning context",
      doingSummary: "I'm looking at what's around you to understand the task.",
      debugEvents: pushDebug(
        [],
        "observation",
        "Session started",
        "User tapped Stay with me",
      ),
    });

    await apiFetch(`/api/sessions/${sessionId}/observe`, {
      method: "POST",
      body: JSON.stringify({ type: "qr", value: "demo-clinic-registration" }),
    });

    setState((prev) => ({
      ...prev,
      taskStep: "Registration detected",
      doingSummary:
        "I found a clinic registration form. I'll walk you through it step by step.",
      debugEvents: pushDebug(
        prev.debugEvents,
        "intent",
        "Task recognized",
        "Clinic registration at Demo Clinic",
      ),
    }));
  }, []);

  const endSession = useCallback(async () => {
    if (state.sessionId) {
      await apiFetch(`/api/sessions/${state.sessionId}`, { method: "DELETE" });
    }
    setState(INITIAL);
  }, [state.sessionId]);

  const pauseSession = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: prev.status === "paused" ? "active" : "paused",
      doingSummary:
        prev.status === "paused"
          ? "Welcome back. Picking up where we left off."
          : "Take your time. Camera and microphone are off. Your progress is saved.",
    }));
  }, []);

  const explainSession = useCallback(() => {
    setState((prev) => ({
      ...prev,
      doingSummary:
        "I'm helping you register as a new patient at Demo Clinic. I'll ask a few questions, capture your insurance card, and get your confirmation before submitting anything.",
    }));
  }, []);

  const stopSession = useCallback(async () => {
    if (state.sessionId) {
      await apiFetch(`/api/sessions/${state.sessionId}/cancel`, {
        method: "POST",
      });
    }
    setState(INITIAL);
  }, [state.sessionId]);

  const beginGuidedQuestions = useCallback(async () => {
    const remote = state.sessionId
      ? await apiFetch<{ questions: GuidedQuestion[] }>(
          `/api/sessions/${state.sessionId}/state`,
        )
      : null;

    setState((prev) => ({
      ...prev,
      status: "guided",
      questions: remote?.questions ?? MOCK_QUESTIONS,
      currentQuestionIndex: 0,
      taskStep: "Collecting information",
      doingSummary: `I already have ${prev.filledCount} of ${prev.totalFields} fields. I need a few things from you.`,
      debugEvents: pushDebug(
        prev.debugEvents,
        "agent",
        "Guided questions started",
        `${MOCK_QUESTIONS.length} questions remaining`,
      ),
    }));
  }, [state.sessionId]);

  const answerQuestion = useCallback(
    async (answer: string) => {
      if (state.sessionId) {
        await apiFetch(`/api/sessions/${state.sessionId}/answer`, {
          method: "POST",
          body: JSON.stringify({
            questionId: state.questions[state.currentQuestionIndex]?.id,
            answer,
          }),
        });
      }

      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) {
        setState((prev) => ({
          ...prev,
          currentQuestionIndex: nextIndex,
          filledCount: prev.filledCount + prev.questions.length,
          taskStep: "Insurance card needed",
          doingSummary:
            "Great — now I need photos of your insurance card, front and back.",
          status: "capture",
          captureSide: "front",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          currentQuestionIndex: nextIndex,
          filledCount: prev.filledCount + 1,
        }));
      }
    },
    [state.sessionId, state.questions, state.currentQuestionIndex],
  );

  const beginCapture = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: "capture",
      captureSide: "front",
      taskStep: "Insurance card — front",
      doingSummary: "Position the front of your insurance card in the frame.",
    }));
  }, []);

  const submitCapture = useCallback(
    async (imageDataUrl: string, side: "front" | "back") => {
      let apiError: string | null = null;
      let remoteState: Partial<SessionState> | null = null;

      if (state.sessionId) {
        const res = await apiFetch<
          Partial<SessionState> & { ok?: boolean; error?: string }
        >(`/api/sessions/${state.sessionId}/capture`, {
          method: "POST",
          body: JSON.stringify({ side, image: imageDataUrl }),
        });
        if (res?.error) apiError = res.error;
        if (res && !res.error) remoteState = res;
      }

      const captures =
        side === "back" && apiError
          ? state.captures
          : { ...state.captures, [side]: imageDataUrl };

      if (side === "front") {
        setState((prev) => ({
          ...prev,
          ...(remoteState ?? {}),
          captures,
          captureSide: "back",
          taskStep: "Insurance card — back",
          doingSummary:
            "Now flip your card and capture the back. The clinic needs both sides.",
          error: null,
          debugEvents: pushDebug(
            prev.debugEvents,
            "tool",
            "Insurance front captured",
            "Processing card image",
          ),
        }));
        return;
      }

      if (apiError) {
        setState((prev) => ({
          ...prev,
          captures,
          status: "capture",
          captureSide: "back",
          taskStep: "Insurance card — back",
          doingSummary: apiError,
          error: apiError,
          debugEvents: pushDebug(
            prev.debugEvents,
            "tool",
            "Back capture incomplete",
            "DOCUMENT_SIDE_REQUIRED_1029",
          ),
        }));
        return;
      }

      let countersign = MOCK_COUNTERSIGN;
      if (state.sessionId) {
        const proposed = await apiFetch<{
          actionId: string;
          state?: Partial<SessionState>;
        }>("/api/actions/propose", {
          method: "POST",
          body: JSON.stringify({
            sessionId: state.sessionId,
            action: "submitRegistration",
          }),
        });
        if (proposed?.state?.countersign) {
          countersign = proposed.state.countersign;
        } else if (proposed?.actionId) {
          countersign = { ...MOCK_COUNTERSIGN, actionId: proposed.actionId };
        }
        if (proposed?.state) remoteState = proposed.state;
      }

      setState((prev) => ({
        ...prev,
        ...(remoteState ?? {}),
        captures,
        status: "confirm",
        taskStep: "Ready to submit",
        doingSummary: "Please review what will be shared before I submit.",
        countersign,
        error: null,
        debugEvents: pushDebug(
          prev.debugEvents,
          "proposal",
          "Submit registration proposed",
          "Tier-2 action requires your confirmation",
        ),
      }));
    },
    [state.sessionId, state.captures],
  );

  const confirmSubmit = useCallback(async () => {
    const actionId = state.countersign?.actionId ?? "action-demo-001";
    let receipt = MOCK_RECEIPT;

    if (state.sessionId) {
      await apiFetch(`/api/actions/${actionId}/confirm`, { method: "POST" });
      const executed = await apiFetch<{
        ok: boolean;
        receipt?: ReceiptData;
        error?: string;
      }>(`/api/actions/${actionId}/execute`, { method: "POST" });

      if (executed?.receipt) {
        receipt = executed.receipt;
      } else if (executed?.error) {
        setState((prev) => ({
          ...prev,
          error: executed.error ?? "Submission failed",
          doingSummary: executed.error ?? "Something went wrong. Please try again.",
        }));
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      status: "complete",
      taskStep: "Done",
      doingSummary: "Registration submitted successfully.",
      receipt,
      error: null,
      debugEvents: pushDebug(
        pushDebug(
          prev.debugEvents,
          "countersign",
          "User confirmed",
          "Explicit approval received",
        ),
        "tool",
        "Registration submitted",
        receipt.confirmationCode,
      ),
    }));
  }, [state.sessionId, state.countersign]);

  const cancelSubmit = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: "active",
      countersign: null,
      taskStep: "Submission cancelled",
      doingSummary:
        "Submission cancelled. Nothing was shared. You can review or stop anytime.",
    }));
  }, []);

  const reviewSubmit = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: "guided",
      currentQuestionIndex: 0,
      taskStep: "Reviewing answers",
      doingSummary: "Let's review your answers before submitting.",
    }));
  }, []);

  const refreshState = useCallback(async () => {
    if (!state.sessionId) return;
    const remote = await apiFetch<Partial<SessionState>>(
      `/api/sessions/${state.sessionId}/state`,
    );
    if (remote) {
      setState((prev) => ({ ...prev, ...remote }));
    }
  }, [state.sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true" && !state.sessionId) {
      void startSession();
    }
  }, [startSession, state.sessionId]);

  return {
    state,
    startSession,
    endSession,
    pauseSession,
    explainSession,
    stopSession,
    beginGuidedQuestions,
    answerQuestion,
    beginCapture,
    submitCapture,
    confirmSubmit,
    cancelSubmit,
    reviewSubmit,
    refreshState,
    isActive: state.status !== "idle" && state.status !== "complete",
    isDemoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
  };
}

export type SessionFlow = ReturnType<typeof useSessionFlow>;
