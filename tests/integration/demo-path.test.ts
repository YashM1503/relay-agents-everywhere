import { describe, expect, it, beforeEach } from "vitest";
import {
  answerQuestion,
  captureInsurance,
  confirmAction,
  createSession,
  executeAction,
  observeSession,
  proposeAction,
  resetDemoState,
} from "@/lib/session";

describe("clinic registration demo path", () => {
  beforeEach(() => {
    resetDemoState();
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  });

  it("completes happy path with back-card retry", async () => {
    const record = createSession({ demo: true });
    const sessionId = record.session.sessionId;

    observeSession(sessionId, {
      type: "qr",
      value: "demo-clinic-registration",
    });

    answerQuestion(sessionId, "dob", "1948-03-12");
    answerQuestion(sessionId, "emergency_contact", "Alex Brooks 555-010-9999");
    answerQuestion(sessionId, "sms_reminders", "Yes");
    answerQuestion(sessionId, "reason_for_visit", "Annual checkup");

    captureInsurance(sessionId, "front", "data:image/jpeg;base64,front");
    const firstBack = captureInsurance(
      sessionId,
      "back",
      "data:image/jpeg;base64,back1",
    );
    expect(firstBack?.error).toBeTruthy();

    captureInsurance(sessionId, "back", "data:image/jpeg;base64,back2");

    const { proposal } = (await proposeAction(
      sessionId,
      "submitRegistration",
    ))!;
    expect(proposal.action_type).toBe("submit_registration");

    confirmAction(proposal.action_id);
    const executed = executeAction(proposal.action_id);

    expect(executed?.success).toBe(true);
    expect(executed?.record.receipt?.confirmationCode).toMatch(/^DEMO-/);
    expect(executed?.record.receipt?.appointment).toContain("Sep 18");
  });

  it("blocks execution without user confirmation", async () => {
    resetDemoState();
    const record = createSession({ demo: true });
    const sessionId = record.session.sessionId;
    observeSession(sessionId, { type: "qr", value: "demo-clinic-registration" });

    const { proposal } = (await proposeAction(
      sessionId,
      "submitRegistration",
    ))!;
    const result = executeAction(proposal.action_id);
    expect(result?.success).toBe(false);
  });
});
