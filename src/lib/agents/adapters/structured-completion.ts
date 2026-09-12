import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { normalize } from "../normalize";
import type { AgentRequest, AgentResult, RelayContext } from "../types";
import type OpenAI from "openai";

export const structuredAgentResultSchema = z.object({
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

export function buildSystemPrompt(context: RelayContext, providerLabel: string): string {
  return [
    `You are RELAY's ${providerLabel}.`,
    "Respond with structured JSON matching the required schema.",
    "Be concise, helpful, and never invent verified facts.",
    `Current task: ${context.currentTask.goal}`,
    `Task status: ${context.currentTask.status}`,
  ].join("\n");
}

export function buildUserPrompt(task: AgentRequest, context: RelayContext): string {
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

export async function runStructuredCompletion(
  client: OpenAI,
  model: string,
  task: AgentRequest,
  context: RelayContext,
  providerLabel: string,
): Promise<AgentResult> {
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(context, providerLabel) },
        { role: "user", content: buildUserPrompt(task, context) },
      ],
      response_format: zodResponseFormat(
        structuredAgentResultSchema,
        "agent_result",
      ),
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
        const parsed = structuredAgentResultSchema.parse(JSON.parse(rawContent));
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
      summary: "Model returned an empty response.",
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown provider error";
    return normalize({
      status: "failed",
      summary: `Agent request failed: ${reason}`,
    });
  }
}
