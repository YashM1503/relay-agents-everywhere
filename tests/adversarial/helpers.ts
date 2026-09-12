import {
  answerQuestion,
  captureInsurance,
  confirmAction,
  createSession,
  observeSession,
  proposeAction,
  type SessionRecord,
} from "@/lib/session";

/** Completes guided questions and insurance capture (with demo back-card retry). */
export async function completeRegistrationInputs(
  sessionId: string,
): Promise<SessionRecord> {
  answerQuestion(sessionId, "dob", "1948-03-12");
  answerQuestion(sessionId, "emergency_contact", "Alex Brooks 555-010-9999");
  answerQuestion(sessionId, "sms_reminders", "Yes");
  answerQuestion(sessionId, "reason_for_visit", "Annual checkup");

  captureInsurance(sessionId, "front", "data:image/jpeg;base64,demo-front");
  captureInsurance(sessionId, "back", "data:image/jpeg;base64,demo-back-fail");
  const last = captureInsurance(
    sessionId,
    "back",
    "data:image/jpeg;base64,demo-back-ok",
  );
  return last!.record;
}

export async function proposeRegistration(sessionId: string) {
  return proposeAction(sessionId, "submitRegistration");
}
