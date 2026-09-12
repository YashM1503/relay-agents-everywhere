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

const OPENAI_CAPABILITIES: AgentCapability[] = [
  "vision",
  "forms",
  "conversation",
  "tool_use",
];

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function selectOpenAiModel(task: AgentRequest): string {
  if (
    task.requiredModalities?.includes("image") &&
    process.env.OPENAI_MODEL_VISION
  ) {
    return process.env.OPENAI_MODEL_VISION;
  }
  if (process.env.OPENAI_MODEL_GENERAL) {
    return process.env.OPENAI_MODEL_GENERAL;
  }
  return "gpt-4o-mini";
}

export const openAiAdapter: AgentAdapter = {
  id: "openai-default",
  capabilities: OPENAI_CAPABILITIES,

  async canHandle(task: AgentRequest): Promise<boolean> {
    if (task.requiredCapabilities.length === 0) return true;
    return task.requiredCapabilities.every((cap) =>
      OPENAI_CAPABILITIES.includes(cap),
    );
  },

  async health(): Promise<{ available: boolean; reason?: string }> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        available: false,
        reason: "OPENAI_API_KEY not configured",
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
        summary: "OpenAI adapter is unavailable: API key not configured.",
      });
    }

    return runStructuredCompletion(
      client,
      selectOpenAiModel(task),
      task,
      context,
      "default multimodal agent",
    );
  },
};
