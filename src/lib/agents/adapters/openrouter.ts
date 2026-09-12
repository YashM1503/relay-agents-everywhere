import OpenAI from "openai";
import { normalize } from "../normalize";
import { runStructuredCompletion } from "./structured-completion";
import type {
  AgentAdapter,
  AgentCapability,
  AgentRequest,
  AgentResult,
  RelayContext,
} from "../types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const OPENROUTER_CAPABILITIES: AgentCapability[] = [
  "vision",
  "forms",
  "conversation",
  "tool_use",
  "research",
  "reasoning",
];

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "https://relay.demo",
      "X-Title": "RELAY Hackathon Demo",
    },
  });
}

/** Pick model from env based on task capabilities — no UI coupling. */
export function selectOpenRouterModel(task: AgentRequest): string {
  const vision = task.requiredModalities?.includes("image");
  const reasoning = task.requiredCapabilities.some((cap) =>
    ["research", "reasoning"].includes(cap),
  );

  if (vision && process.env.OPENROUTER_MODEL_VISION) {
    return process.env.OPENROUTER_MODEL_VISION;
  }
  if (reasoning && process.env.OPENROUTER_MODEL_REASONING) {
    return process.env.OPENROUTER_MODEL_REASONING;
  }
  if (process.env.OPENROUTER_MODEL_GENERAL) {
    return process.env.OPENROUTER_MODEL_GENERAL;
  }
  return "openrouter/auto";
}

export const openRouterAdapter: AgentAdapter = {
  id: "openrouter-default",
  capabilities: OPENROUTER_CAPABILITIES,

  async canHandle(task: AgentRequest): Promise<boolean> {
    if (task.requiredCapabilities.length === 0) return true;
    return task.requiredCapabilities.every((cap) =>
      OPENROUTER_CAPABILITIES.includes(cap),
    );
  },

  async health(): Promise<{ available: boolean; reason?: string }> {
    if (!process.env.OPENROUTER_API_KEY) {
      return {
        available: false,
        reason: "OPENROUTER_API_KEY not configured",
      };
    }
    return { available: true };
  },

  async execute(
    task: AgentRequest,
    context: RelayContext,
  ): Promise<AgentResult> {
    const client = getClient();
    if (!client) {
      return normalize({
        status: "failed",
        summary: "OpenRouter adapter is unavailable: API key not configured.",
      });
    }

    const model = selectOpenRouterModel(task);
    return runStructuredCompletion(
      client,
      model,
      task,
      context,
      "OpenRouter-backed agent",
    );
  },
};
