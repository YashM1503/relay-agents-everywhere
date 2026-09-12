import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { normalize } from "../normalize";
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

const openAiResultSchema = z.object({
  status: z.enum(["completed", "needs_input", "failed"]),
  summary: z.string(),
  findings: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .default([]),
  artifacts: z
    .array(
      z.object({
        type: z.string(),
        ref: z.string(),
        label: z.string().optional(),
      }),
    )
    .default([]),
  proposedActions: z
    .array(
      z.object({
        actionId: z.string(),
        actionType: z.string(),
        description: z.string(),
        tier: z.number().optional(),
      }),
    )
    .default([]),
  confidence: z.number().min(0).max(1).optional(),
});

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function buildSystemPrompt(context: RelayContext): string {
  return [
    "You are RELAY's default multimodal agent.",
    "Respond with structured JSON matching the required schema.",
    "Be concise, helpful, and never invent verified facts.",
    `Current task: ${context.currentTask.goal}`,
    `Task status: ${context.currentTask.status}`,
  ].join("\n");
}

function buildUserPrompt(task: AgentRequest, context: RelayContext): string {
  const lines = [
    `Task type: ${task.taskType}`,
    `User request: ${task.prompt}`,
  ];

  if (context.conversationContext.length > 0) {
    const recent = context.conversationContext.slice(-5);
    lines.push(
      "Recent conversation:",
      ...recent.map((item) => `${item.role}: ${item.content}`),
    );
  }

  if (context.currentTask.unresolvedFields?.length) {
    lines.push(
      `Unresolved fields: ${context.currentTask.unresolvedFields.join(", ")}`,
    );
  }

  return lines.join("\n");
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
        findings: [],
        artifacts: [],
        proposedActions: [],
      });
    }

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: buildSystemPrompt(context) },
          { role: "user", content: buildUserPrompt(task, context) },
        ],
        response_format: zodResponseFormat(openAiResultSchema, "agent_result"),
      });

      const message = completion.choices[0]?.message;
      if (message?.refusal) {
        return normalize({
          status: "failed",
          summary: message.refusal,
        });
      }

      const rawContent = message?.content;
      if (rawContent) {
        try {
          const parsed = openAiResultSchema.parse(JSON.parse(rawContent));
          return normalize(parsed);
        } catch {
          return normalize({
            status: "completed",
            summary: rawContent,
            findings: [],
            artifacts: [],
            proposedActions: [],
          });
        }
      }

      return normalize({
        status: "failed",
        summary: "OpenAI returned an empty response.",
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unknown OpenAI error";
      return normalize({
        status: "failed",
        summary: `OpenAI request failed: ${reason}`,
      });
    }
  },
};
