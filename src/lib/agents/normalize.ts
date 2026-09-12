import { z } from "zod";
import type { AgentResult, AgentResultStatus } from "./types";

const findingSchema = z.object({
  key: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

const artifactSchema = z.object({
  type: z.string(),
  ref: z.string(),
  label: z.string().optional(),
});

const actionProposalSchema = z.object({
  actionId: z.string(),
  actionType: z.string(),
  description: z.string(),
  tier: z.number().optional(),
});

const agentResultSchema = z.object({
  status: z.enum(["completed", "needs_input", "failed"]),
  summary: z.string(),
  findings: z.array(findingSchema).default([]),
  artifacts: z.array(artifactSchema).default([]),
  proposedActions: z.array(actionProposalSchema).default([]),
  confidence: z.number().min(0).max(1).optional(),
});

/** Provider aliases mapped to normalized AgentResult status. */
const STATUS_ALIASES: Record<string, AgentResultStatus> = {
  completed: "completed",
  complete: "completed",
  success: "completed",
  needs_input: "needs_input",
  needsInput: "needs_input",
  pending: "needs_input",
  failed: "failed",
  error: "failed",
};

function coerceStatus(value: unknown): AgentResultStatus {
  if (typeof value === "string") {
    const normalized = STATUS_ALIASES[value] ?? STATUS_ALIASES[value.toLowerCase()];
    if (normalized) return normalized;
  }
  return "failed";
}

function coerceFindings(raw: unknown): AgentResult["findings"] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (typeof item === "string") {
      return [{ key: "note", value: item }];
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if ("key" in obj && "value" in obj) {
        return [
          {
            key: String(obj.key),
            value: String(obj.value),
            confidence:
              typeof obj.confidence === "number" ? obj.confidence : undefined,
          },
        ];
      }
      if ("fact" in obj || "text" in obj) {
        return [
          {
            key: "fact",
            value: String(obj.fact ?? obj.text),
          },
        ];
      }
    }
    return [];
  });
}

function coerceProposedActions(raw: unknown): AgentResult["proposedActions"] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const obj = item as Record<string, unknown>;
    const actionType = String(obj.actionType ?? obj.action ?? obj.type ?? "unknown");
    return [
      {
        actionId: String(obj.actionId ?? obj.id ?? `action-${index}`),
        actionType,
        description: String(obj.description ?? obj.summary ?? actionType),
        tier: typeof obj.tier === "number" ? obj.tier : undefined,
      },
    ];
  });
}

/**
 * Normalize any provider output into a validated AgentResult.
 */
export function normalize(raw: unknown): AgentResult {
  if (!raw || typeof raw !== "object") {
    return {
      status: "failed",
      summary: "Agent returned an invalid response.",
      findings: [],
      artifacts: [],
      proposedActions: [],
    };
  }

  const obj = raw as Record<string, unknown>;

  const candidate = {
    status: coerceStatus(obj.status),
    summary: String(obj.summary ?? obj.message ?? ""),
    findings: coerceFindings(obj.findings ?? obj.facts ?? obj.uncertainties),
    artifacts: Array.isArray(obj.artifacts) ? obj.artifacts : [],
    proposedActions: coerceProposedActions(
      obj.proposedActions ?? obj.proposed_actions,
    ),
    confidence: typeof obj.confidence === "number" ? obj.confidence : undefined,
  };

  const parsed = agentResultSchema.safeParse(candidate);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    status: candidate.summary ? candidate.status : "failed",
    summary:
      candidate.summary ||
      "Agent response could not be normalized to the expected schema.",
    findings: candidate.findings,
    artifacts: [],
    proposedActions: candidate.proposedActions,
    confidence: candidate.confidence,
  };
}
