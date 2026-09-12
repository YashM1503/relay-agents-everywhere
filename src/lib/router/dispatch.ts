import {
  getRegisteredAdapters,
  getRegistryEntry,
} from "@/lib/agents/registry";
import type {
  AgentRequest,
  RelayContext,
  RoutingDecision,
} from "@/lib/agents/types";
import { scoreAgent } from "./score";

const DEFAULT_MAX_RUNTIME_SECONDS = 20;
const MAX_FALLBACKS = 2;

function buildReasonCode(
  request: AgentRequest,
  primaryId: string,
): string {
  const parts: string[] = [];

  if (request.requiredCapabilities.length > 0) {
    parts.push(request.requiredCapabilities.join("+"));
  } else {
    parts.push("general");
  }

  if (request.requiredModalities?.includes("image")) {
    parts.push("vision");
  }
  if (request.requiresTools) {
    parts.push("tool");
  }

  parts.push(`primary:${primaryId}`);
  return parts.join("+");
}

export interface ScoredAgent {
  adapterId: string;
  score: number;
  available: boolean;
}

/**
 * Score all registered agents for a request.
 */
export async function scoreAllAgents(
  request: AgentRequest,
): Promise<ScoredAgent[]> {
  const adapters = getRegisteredAdapters();
  const scored: ScoredAgent[] = [];

  for (const adapter of adapters) {
    const entry = getRegistryEntry(adapter.id);
    if (!entry) continue;

    const health = await adapter.health();
    const canHandle = health.available ? await adapter.canHandle(request) : false;
    const isAvailable = health.available && canHandle;

    const breakdown = scoreAgent(adapter, entry, request, isAvailable);
    scored.push({
      adapterId: adapter.id,
      score: breakdown.total,
      available: isAvailable,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}

function isEligiblePrimary(adapterId: string, available: boolean): boolean {
  const entry = getRegistryEntry(adapterId);
  if (!entry || !available) return false;
  return entry.status !== "adapter_placeholder";
}

/**
 * Select primary and fallback agents for a task.
 */
export async function dispatch(
  request: AgentRequest,
  _context: RelayContext,
): Promise<RoutingDecision> {
  const scored = await scoreAllAgents(request);

  const eligible = scored.filter((item) =>
    isEligiblePrimary(item.adapterId, item.available),
  );

  const primary = eligible[0] ?? {
    adapterId: "local-fallback",
    score: scored.find((item) => item.adapterId === "local-fallback")?.score ?? 0,
    available: true,
  };

  const fallback_agents = eligible
    .slice(1)
    .filter((item) => item.adapterId !== primary.adapterId)
    .slice(0, MAX_FALLBACKS)
    .map((item) => item.adapterId);

  const scores = Object.fromEntries(
    scored.map((item) => [item.adapterId, item.score]),
  );

  return {
    primary_agent: primary.adapterId,
    fallback_agents,
    reason_code: buildReasonCode(request, primary.adapterId),
    max_runtime_seconds: DEFAULT_MAX_RUNTIME_SECONDS,
    scores,
  };
}
