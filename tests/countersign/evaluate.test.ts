import { describe, expect, it, beforeEach } from "vitest";
import { evaluateCountersign } from "@/lib/countersign/evaluate";
import type { ActionProposal, TaskState, UserActionPolicy } from "@/lib/countersign/types";
import {
  classifyActionTier,
  tierNeverAutoRuns,
  tierRequiresConfirmation,
} from "@/lib/policy/tiers";
import {
  resetClinicFormSubmissions,
  submitRegistration,
} from "@/lib/tools/clinic-form";
import { getUserActionPolicy } from "@/lib/tools/profile";

const baseTask: TaskState = {
  task_id: "t_demo",
  goal: "Complete clinic registration",
  status: "in_progress",
  accepted_by_user: true,
  destination_verified: true,
  known_fields: {
    dob: "1948-03-12",
    address: "125 Example Ave, Brooklyn, NY 11211",
    insurance_front: "capture-front-1",
    insurance_back: "capture-back-1",
    reason_for_visit: "Annual checkup",
  },
  unresolved_fields: [],
};

const demoPolicy = getUserActionPolicy();

function proposal(overrides: Partial<ActionProposal>): ActionProposal {
  return {
    action_id: "a_test",
    action_type: "submit_registration",
    target: "demo-clinic",
    purpose: "New patient registration",
    recipient: "Demo Clinic",
    payload_summary: "registration",
    sensitive_fields: ["dob", "address", "insurance_front", "insurance_back", "reason_for_visit"],
    destination_verified: true,
    ...overrides,
  };
}

describe("classifyActionTier", () => {
  it("maps demo actions to T0–T3", () => {
    expect(classifyActionTier("explain")).toBe(0);
    expect(classifyActionTier("read")).toBe(0);
    expect(classifyActionTier("add_reminder")).toBe(1);
    expect(classifyActionTier("upload_insurance")).toBe(2);
    expect(classifyActionTier("submit_registration")).toBe(2);
    expect(classifyActionTier("send_money")).toBe(3);
  });

  it("loads tiers from action_policy.json for canonical keys", () => {
    expect(classifyActionTier("summarize")).toBe(0);
    expect(classifyActionTier("create_calendar_event")).toBe(1);
    expect(classifyActionTier("submit_form")).toBe(2);
    expect(classifyActionTier("money_transfer")).toBe(3);
  });

  it("flags confirmation and no-auto-run helpers", () => {
    expect(tierRequiresConfirmation(2)).toBe(true);
    expect(tierRequiresConfirmation(0)).toBe(false);
    expect(tierNeverAutoRuns(3)).toBe(true);
    expect(tierNeverAutoRuns(2)).toBe(false);
  });
});

describe("evaluateCountersign", () => {
  it("auto-allows tier 0 explain actions", () => {
    const decision = evaluateCountersign(
      proposal({ action_type: "explain", purpose: "Explain registration form" }),
      baseTask,
      demoPolicy,
    );
    expect(decision.verdict).toBe("allow");
  });

  it("requires confirm for tier 2 submit_registration", () => {
    const decision = evaluateCountersign(
      proposal({ action_type: "submit_registration" }),
      baseTask,
      demoPolicy,
    );
    expect(decision.verdict).toBe("confirm");
    expect(decision.dataShared.length).toBeGreaterThan(0);
    expect(decision.unresolved).toHaveLength(0);
  });

  it("never auto-runs tier 3 send_money", () => {
    const decision = evaluateCountersign(
      proposal({
        action_type: "send_money",
        target: "unknown-recipient",
        purpose: "Urgent payment",
        recipient: "Unknown",
      }),
      baseTask,
      demoPolicy,
    );
    expect(decision.verdict).not.toBe("allow");
    expect(["hold", "confirm"]).toContain(decision.verdict);
  });

  it("holds submit_registration when destination is unverified", () => {
    const decision = evaluateCountersign(
      proposal({ destination_verified: false }),
      { ...baseTask, destination_verified: false },
      demoPolicy,
    );
    expect(decision.verdict).toBe("hold");
    expect(decision.unresolved.some((item) => item.includes("destination_verified"))).toBe(true);
  });

  it("holds when contradictions remain", () => {
    const decision = evaluateCountersign(
      proposal({}),
      {
        ...baseTask,
        contradictions: [{ field: "full_name", sources: ["profile", "insurance_ocr"] }],
      },
      demoPolicy,
    );
    expect(decision.verdict).toBe("hold");
  });

  it("allows after explicit user confirmation for tier 2", () => {
    const decision = evaluateCountersign(
      proposal({ user_confirmed: true }),
      baseTask,
      demoPolicy,
    );
    expect(decision.verdict).toBe("allow");
  });
});

describe("submitRegistration tool", () => {
  beforeEach(() => {
    resetClinicFormSubmissions();
  });

  it("returns DOCUMENT_SIDE_REQUIRED_1029 when insurance_back is missing", () => {
    const result = submitRegistration({
      action_id: "a_missing_back",
      insurance_front: "front-image",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error_code).toBe("DOCUMENT_SIDE_REQUIRED_1029");
      expect(result.relay_translation).toContain("back of your insurance card");
    }
  });

  it("is idempotent for the same action_id", () => {
    const payload = {
      action_id: "a_idempotent",
      insurance_front: "front-image",
      insurance_back: "back-image",
    };

    const first = submitRegistration(payload);
    const second = submitRegistration(payload);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(second.idempotent).toBe(true);
      expect(second.confirmation_code).toBe(first.confirmation_code);
    }
  });
});

describe("user policy defaults", () => {
  it("blocks money_transfer auto execution via never_auto", () => {
    const policy: UserActionPolicy = getUserActionPolicy();
    expect(policy.money_transfer).toBe("never_auto");
  });
});
