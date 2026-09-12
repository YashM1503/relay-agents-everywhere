import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { openRouterAdapter, selectOpenRouterModel } from "@/lib/agents/adapters/openrouter";
import type { AgentRequest } from "@/lib/agents/types";

describe("openRouterAdapter", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.OPENROUTER_API_KEY;
  });

  afterEach(() => {
    process.env = env;
  });

  it("reports unavailable when OPENROUTER_API_KEY is missing", async () => {
    const health = await openRouterAdapter.health();
    expect(health.available).toBe(false);
  });

  it("selects vision model from env when image modality required", () => {
    process.env.OPENROUTER_MODEL_VISION = "test/vision-model";
    const task: AgentRequest = {
      taskType: "forms",
      requiredCapabilities: ["vision", "forms"],
      requiredModalities: ["image"],
      prompt: "Read this card",
    };
    expect(selectOpenRouterModel(task)).toBe("test/vision-model");
  });

  it("selects reasoning model when research capability required", () => {
    process.env.OPENROUTER_MODEL_REASONING = "test/reason-model";
    const task: AgentRequest = {
      taskType: "research",
      requiredCapabilities: ["research"],
      prompt: "Analyze",
    };
    expect(selectOpenRouterModel(task)).toBe("test/reason-model");
  });
});
