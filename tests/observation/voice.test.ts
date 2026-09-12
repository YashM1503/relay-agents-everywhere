import { describe, expect, it } from "vitest";
import { normalizeVoiceObservation } from "@/lib/observation/voice";
import { createSession, observeSession, resetDemoState } from "@/lib/session";

describe("voice observation", () => {
  it("normalizes transcript into observation contract", () => {
    const obs = normalizeVoiceObservation("What does this letter mean?", 0.9);
    expect(obs.source).toBe("voice");
    expect(obs.content.transcript).toBe("What does this letter mean?");
    expect(obs.confidence).toBe(0.9);
    expect(obs.timestamp).toBeTruthy();
  });

  it("observeSession records voice intent in production scenario", () => {
    resetDemoState();
    process.env.RELAY_APP_MODE = "production";
    const record = createSession({ demo: false, scenario: "general" });
    const updated = observeSession(record.session.sessionId, {
      type: "voice",
      transcript: "Help me register at the clinic desk",
    });
    expect(updated?.task.known_fields.user_intent).toContain("register");
    expect(updated?.machineState).toBe("ASSIST");
    delete process.env.RELAY_APP_MODE;
  });
});
