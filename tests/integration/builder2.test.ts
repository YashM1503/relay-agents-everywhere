import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelProposal,
  confirmAction,
  createSession,
  enrichCaptureWithVision,
  executeAction,
  getSession,
  observeSession,
  proposeAction,
  resetDemoState,
} from "@/lib/session";
import { normalize } from "@/lib/agents/normalize";
import type { RunOutcome } from "@/lib/agents/execute";
import { completeRegistrationInputs } from "../adversarial/helpers";

const decision = { primary_agent: "fake", fallback_agents: [], reason_code: "test", max_runtime_seconds: 1, scores: {} };

function fakeRun(findings: Array<{ key: string; value: string }>, agentId = "openai-default", status: "completed" | "failed" = "completed") {
  return async (): Promise<RunOutcome> => ({
    result: normalize({ status, summary: "fake", findings }),
    agentId,
    attempts: status === "failed" ? ["openai-default: failed"] : [],
    decision,
  });
}

async function readySession(): Promise<string> {
  const { session } = createSession({ demo: true });
  observeSession(session.sessionId, { type: "qr", value: "demo-clinic-registration" });
  await completeRegistrationInputs(session.sessionId);
  return session.sessionId;
}

describe("Builder 2: server-side proposal cancel", () => {
  beforeEach(() => {
    resetDemoState();
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  });

  it("clears the pending proposal so it can never be executed later", async () => {
    const sid = await readySession();
    const { proposal } = (await proposeAction(sid, "submitRegistration"))!;
    expect(getSession(sid)!.pendingProposal?.action_id).toBe(proposal.action_id);

    const record = cancelProposal(proposal.action_id)!;
    expect(record.pendingProposal).toBeNull();
    expect(record.userConfirmed).toBe(false);
    expect(executeAction(proposal.action_id)).toBeNull();
    expect(cancelProposal("a_nope")).toBeNull();

    // The session is still usable: a fresh proposal works.
    const again = await proposeAction(sid, "submitRegistration");
    expect(again?.proposal.action_id).not.toBe(proposal.action_id);
  });
});

describe("Builder 2: COUNTERSIGN hold cannot be overridden by tapping Submit", () => {
  beforeEach(() => {
    resetDemoState();
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  });

  it("refuses execution while proof obligations are unmet, even after confirmation", async () => {
    const { session } = createSession({ demo: true });
    observeSession(session.sessionId, { type: "qr", value: "demo-clinic-registration" });
    // No answers, no captures: unresolved fields remain.
    const { proposal } = (await proposeAction(session.sessionId, "submitRegistration"))!;
    confirmAction(proposal.action_id);
    const result = executeAction(proposal.action_id)!;
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/proof obligations|Holding/);
    expect(result.record.receipt).toBeNull();
  });

  it("still executes the normal confirmed path", async () => {
    const sid = await readySession();
    const { proposal } = (await proposeAction(sid, "submitRegistration"))!;
    confirmAction(proposal.action_id);
    expect(executeAction(proposal.action_id)?.success).toBe(true);
  });
});

describe("Builder 2: live vision enrichment", () => {
  beforeEach(() => {
    resetDemoState();
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  });

  it("replaces synthetic card values with what the vision agent read", async () => {
    const sid = await readySession();
    const out = await enrichCaptureWithVision(sid, "front", "data:image/jpeg;base64,real", fakeRun([
      { key: "member_name", value: "Evelyn Brooks" },
      { key: "member_id", value: "REAL-123" },
      { key: "plan", value: "RealCare Gold" },
    ]));
    expect(out?.used).toBe("live");
    expect(out?.contradiction).toBeUndefined();
    const task = getSession(sid)!.task;
    expect(task.known_fields.member_id).toBe("REAL-123");
    expect(task.known_fields.plan).toBe("RealCare Gold");
    expect(getSession(sid)!.selectedAgentId).toBe("openai-default");
  });

  it("keeps synthetic values when the agent failed, fell back to the mock, or read nothing legible", async () => {
    const sid = await readySession();
    const before = getSession(sid)!.task.known_fields.member_id;
    expect((await enrichCaptureWithVision(sid, "front", "img", fakeRun([], "openai-default", "failed")))?.used).toBe("synthetic");
    expect((await enrichCaptureWithVision(sid, "front", "img", fakeRun([{ key: "member_id", value: "X" }], "local-fallback")))?.used).toBe("synthetic");
    expect((await enrichCaptureWithVision(sid, "front", "img", fakeRun([{ key: "plan", value: "no id" }])))?.used).toBe("synthetic");
    expect(getSession(sid)!.task.known_fields.member_id).toBe(before);
    expect(await enrichCaptureWithVision("nope", "front", "img", fakeRun([]))).toBeNull();
  });

  it("records a card/profile name mismatch as a contradiction, which holds submission", async () => {
    const sid = await readySession();
    const out = await enrichCaptureWithVision(sid, "front", "img", fakeRun([
      { key: "member_name", value: "Evelyn Brookes" },
      { key: "member_id", value: "REAL-123" },
    ]));
    expect(out?.contradiction).toContain("Evelyn Brookes");
    expect(getSession(sid)!.task.contradictions?.[0]?.field).toBe("full_name");
    expect(getSession(sid)!.lastToolError).toContain("check with the desk");

    const { proposal, record } = (await proposeAction(sid, "submitRegistration"))!;
    expect(record.countersignDecision?.verdict).toBe("hold");
    confirmAction(proposal.action_id);
    expect(executeAction(proposal.action_id)?.success).toBe(false);
  });
});

describe("Builder 2: shared messages are untrusted data", () => {
  beforeEach(() => {
    resetDemoState();
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  });

  it("leaves a payment request untouched and offers verification, without changing the task", async () => {
    const { session } = createSession({ demo: true });
    observeSession(session.sessionId, { type: "qr", value: "demo-clinic-registration" });
    const before = getSession(session.sessionId)!;
    const stateBefore = before.machineState;
    const record = observeSession(session.sessionId, {
      type: "message",
      value: "Urgent — pay $350 now to keep your appointment.",
    })!;
    expect(record.lastToolError).toContain("asks for money");
    expect(record.lastToolError).toContain("left it untouched");
    expect(record.machineState).toBe(stateBefore);
    expect(record.task.status).toBe("in_progress");
    expect(record.pendingProposal).toBeNull();
    expect(record.debugLog.at(-1)?.label).toBe("Payment request left untouched");

    const other = observeSession(session.sessionId, { type: "message", value: "See you at 2:30" })!;
    expect(other.debugLog.at(-1)?.label).toBe("Shared message noted");
  });
});
