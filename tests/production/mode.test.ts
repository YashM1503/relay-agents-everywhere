import { afterEach, describe, expect, it } from "vitest";
import { createSession, resetDemoState } from "@/lib/session";
import { loadUserProfile } from "@/lib/tools/profile";
import { confirmAction, executeAction, proposeAction } from "@/lib/session";
import {
  answerQuestion,
  captureInsurance,
  observeSession,
} from "@/lib/session";

describe("production mode", () => {
  afterEach(() => {
    resetDemoState();
    delete process.env.RELAY_APP_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it("does not seed Evelyn demo profile in production", () => {
    process.env.RELAY_APP_MODE = "production";
    const profile = loadUserProfile();
    expect(profile.synthetic).toBe(false);
    expect(profile.display_name).not.toBe("Evelyn Brooks");
  });

  it("creates general session without clinic scenario", () => {
    process.env.RELAY_APP_MODE = "production";
    const record = createSession({ demo: false });
    expect(record.scenario).toBe("general");
    expect(record.task.goal).toContain("what you are doing");
  });

  it("demo mode still runs clinic path", async () => {
    process.env.RELAY_APP_MODE = "demo";
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    const record = createSession({ demo: true });
    expect(record.scenario).toBe("clinic");

    observeSession(record.session.sessionId, {
      type: "qr",
      value: "demo-clinic-registration",
    });
    answerQuestion(record.session.sessionId, "dob", "1948-03-12");
    answerQuestion(record.session.sessionId, "emergency_contact", "Alex");
    answerQuestion(record.session.sessionId, "sms_reminders", "Yes");
    answerQuestion(record.session.sessionId, "reason_for_visit", "Checkup");
    captureInsurance(record.session.sessionId, "front", "data:image/jpeg;base64,f");
    captureInsurance(record.session.sessionId, "back", "data:image/jpeg;base64,b1");
    captureInsurance(record.session.sessionId, "back", "data:image/jpeg;base64,b2");

    const proposed = await proposeAction(
      record.session.sessionId,
      "submitRegistration",
    );
    expect(proposed?.proposal.action_type).toBe("submit_registration");

    confirmAction(proposed!.proposal.action_id);
    const executed = executeAction(proposed!.proposal.action_id);
    expect(executed?.success).toBe(true);
  });

  it("consequential actions still require COUNTERSIGN confirm", async () => {
    process.env.RELAY_APP_MODE = "demo";
    const record = createSession({ demo: true });
    const sessionId = record.session.sessionId;
    observeSession(sessionId, { type: "qr", value: "demo-clinic-registration" });
    answerQuestion(sessionId, "dob", "1948-03-12");
    answerQuestion(sessionId, "emergency_contact", "Alex");
    answerQuestion(sessionId, "sms_reminders", "Yes");
    answerQuestion(sessionId, "reason_for_visit", "Checkup");
    captureInsurance(sessionId, "front", "data:image/jpeg;base64,f");
    captureInsurance(sessionId, "back", "data:image/jpeg;base64,b1");
    captureInsurance(sessionId, "back", "data:image/jpeg;base64,b2");
    const { proposal } = (await proposeAction(sessionId, "submitRegistration"))!;
    const blocked = executeAction(proposal.action_id);
    expect(blocked?.success).toBe(false);
  });
});
