import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  hermesAdapter,
  localFallbackAdapter,
  openAiAdapter,
} from "@/lib/agents/adapters";
import { normalize } from "@/lib/agents/normalize";
import { getRegisteredAdapters, getRegistryEntry } from "@/lib/agents/registry";
import type { AgentRequest, RelayContext } from "@/lib/agents/types";
import { dispatch, scoreAllAgents } from "@/lib/router/dispatch";
import { SCORING_WEIGHTS, scoreAgent } from "@/lib/router/score";

const baseContext: RelayContext = {
  userPreferences: { largeText: true, language: "en" },
  currentEnvironment: [],
  currentTask: {
    taskId: "t_001",
    goal: "Complete clinic registration",
    status: "in_progress",
    unresolvedFields: ["insurance_member_id"],
  },
  conversationContext: [],
  connectedSources: [],
  permissions: {
    submitForms: "ask",
    shareDocuments: "ask",
    moneyTransfer: "never_auto",
  },
};

function makeRequest(overrides: Partial<AgentRequest> = {}): AgentRequest {
  return {
    taskType: "clinic_registration",
    requiredCapabilities: ["forms", "conversation"],
    prompt: "Help me fill out this registration form.",
    ...overrides,
  };
}

describe("normalize", () => {
  it("normalizes provider aliases and snake_case fields", () => {
    const result = normalize({
      status: "complete",
      summary: "Done",
      facts: [{ fact: "Member ID missing" }],
      proposed_actions: [
        {
          id: "a1",
          action: "upload_insurance",
          description: "Upload insurance card",
          tier: 2,
        },
      ],
    });

    expect(result.status).toBe("completed");
    expect(result.findings).toHaveLength(1);
    expect(result.proposedActions[0]?.actionType).toBe("upload_insurance");
  });

  it("returns failed result for invalid payloads", () => {
    const result = normalize(null);
    expect(result.status).toBe("failed");
    expect(result.summary).toContain("invalid");
  });
});

describe("scoreAgent", () => {
  it("scores capability match proportionally", () => {
    const entry = getRegistryEntry("openai-default")!;
    const request = makeRequest({
      requiredCapabilities: ["forms", "conversation", "research"],
    });

    const breakdown = scoreAgent(openAiAdapter, entry, request, true);
    expect(breakdown.capabilityMatch).toBeCloseTo(66.67, 1);
  });

  it("zeroes availability when adapter is unavailable", () => {
    const entry = getRegistryEntry("hermes")!;
    const request = makeRequest({ requiredCapabilities: ["research"] });

    const breakdown = scoreAgent(hermesAdapter, entry, request, false);
    expect(breakdown.availability).toBe(0);
    expect(breakdown.reliability).toBe(0);
  });

  it("prefers device privacy when required", () => {
    const localEntry = getRegistryEntry("local-fallback")!;
    const openAiEntry = getRegistryEntry("openai-default")!;
    const request = makeRequest({
      requiredCapabilities: ["basic_summary"],
      privacyRequirement: "device",
    });

    const localScore = scoreAgent(
      localFallbackAdapter,
      localEntry,
      request,
      true,
    );
    const openAiScore = scoreAgent(openAiAdapter, openAiEntry, request, true);

    expect(localScore.privacy).toBe(100);
    expect(openAiScore.privacy).toBe(0);
    expect(localScore.total).toBeGreaterThan(openAiScore.total);
  });

  it("uses defined scoring weights that sum to 1", () => {
    const sum = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe("dispatch", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("selects local-fallback when OpenAI key is missing", async () => {
    const request = makeRequest({
      requiredCapabilities: ["forms", "conversation"],
    });

    const decision = await dispatch(request, baseContext);

    expect(decision.primary_agent).toBe("local-fallback");
    expect(decision.fallback_agents.length).toBeLessThanOrEqual(2);
    expect(decision.max_runtime_seconds).toBe(20);
    expect(decision.reason_code).toContain("primary:local-fallback");
  });

  it("ranks vision+tool tasks toward openai when key is present", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const request = makeRequest({
      requiredCapabilities: ["vision", "forms", "tool_use"],
      requiredModalities: ["image"],
      requiresTools: true,
    });

    const scored = await scoreAllAgents(request);
    const openAi = scored.find((item) => item.adapterId === "openai-default");

    expect(openAi?.available).toBe(true);
    expect(openAi?.score).toBeGreaterThan(0);

    const decision = await dispatch(request, baseContext);
    expect(decision.primary_agent).toBe("openai-default");
  });

  it("never selects placeholder adapters as primary", async () => {
    const request = makeRequest({
      requiredCapabilities: ["research", "reasoning"],
    });

    const decision = await dispatch(request, baseContext);
    expect(decision.primary_agent).not.toBe("hermes");
    expect(decision.primary_agent).not.toBe("ori");
    expect(decision.primary_agent).not.toBe("pace");
  });

  it("includes score map for all registered adapters", async () => {
    const request = makeRequest();
    const decision = await dispatch(request, baseContext);
    const registered = getRegisteredAdapters();

    expect(Object.keys(decision.scores)).toHaveLength(registered.length);
  });
});

describe("adapter health", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("marks OpenAI unavailable without API key", async () => {
    delete process.env.OPENAI_API_KEY;
    const health = await openAiAdapter.health();
    expect(health.available).toBe(false);
    expect(health.reason).toContain("OPENAI_API_KEY");
  });

  it("marks Hermes/Ori/Pace as unavailable placeholders", async () => {
    const { oriAdapter, paceAdapter } = await import("@/lib/agents/adapters");

    for (const adapter of [hermesAdapter, oriAdapter, paceAdapter]) {
      const health = await adapter.health();
      expect(health.available).toBe(false);
      expect(health.reason).toContain("placeholder");
    }
  });

  it("local fallback executes mock summary", async () => {
    const result = await localFallbackAdapter.execute(
      makeRequest({ requiredCapabilities: ["basic_summary"] }),
      baseContext,
    );

    expect(result.status).toBe("completed");
    expect(result.summary).toContain("Local fallback summary");
    expect(result.findings.some((f) => f.key === "source")).toBe(true);
  });
});
