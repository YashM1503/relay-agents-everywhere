import type { AgentAdapter, AgentRegistryEntry, AgentRequest, AgentScoreBreakdown } from "@/lib/agents/types";

/** Scoring weights (must sum to 1.0). */
export const SCORING_WEIGHTS = {
  capabilityMatch: 0.3,
  privacy: 0.15,
  multimodal: 0.1,
  tools: 0.1,
  latency: 0.1,
  cost: 0.05,
  availability: 0.15,
  reliability: 0.05,
} as const;

function scoreCapabilityMatch(
  adapter: AgentAdapter,
  request: AgentRequest,
): number {
  const required = request.requiredCapabilities;
  if (required.length === 0) return 100;

  const matched = required.filter((cap) =>
    adapter.capabilities.includes(cap),
  ).length;
  return (matched / required.length) * 100;
}

function scorePrivacy(
  entry: AgentRegistryEntry,
  request: AgentRequest,
): number {
  const requirement = request.privacyRequirement ?? "any";
  if (requirement === "any") return 100;

  if (requirement === "device") {
    return entry.privacy_class === "device" ? 100 : entry.privacy_class === "unknown" ? 40 : 0;
  }

  if (requirement === "cloud") {
    return entry.privacy_class === "cloud" ? 100 : entry.privacy_class === "unknown" ? 50 : 20;
  }

  return 50;
}

function scoreMultimodal(
  entry: AgentRegistryEntry,
  request: AgentRequest,
): number {
  const required = request.requiredModalities ?? [];
  if (required.length === 0) return 100;

  const supported = new Set(entry.modalities ?? []);
  if (entry.capabilities.includes("vision")) {
    supported.add("image");
  }
  supported.add("text");

  const matched = required.filter((modality) => supported.has(modality)).length;
  return (matched / required.length) * 100;
}

function scoreTools(entry: AgentRegistryEntry, request: AgentRequest): number {
  if (!request.requiresTools) return 100;
  const supportsTools =
    entry.tools_supported ?? entry.capabilities.includes("tool_use");
  return supportsTools ? 100 : 0;
}

function scoreLatency(
  entry: AgentRegistryEntry,
  request: AgentRequest,
): number {
  const target = request.latencyTarget ?? "medium";
  const agentClass = entry.latency_class ?? "medium";

  if (target === agentClass) return 100;

  const order: Record<string, number> = { fast: 0, medium: 1, slow: 2 };
  const delta = Math.abs(order[target]! - order[agentClass]!);
  return Math.max(0, 100 - delta * 40);
}

function scoreCost(entry: AgentRegistryEntry, request: AgentRequest): number {
  const preference = request.costPreference ?? "medium";
  const agentClass = entry.cost_class ?? "medium";

  if (preference === agentClass) return 100;

  const order: Record<string, number> = { low: 0, medium: 1, high: 2 };
  const delta = Math.abs(order[preference]! - order[agentClass]!);
  return Math.max(0, 100 - delta * 35);
}

function scoreAvailability(isAvailable: boolean): number {
  return isAvailable ? 100 : 0;
}

function scoreReliability(entry: AgentRegistryEntry): number {
  if (typeof entry.reliability_score === "number") {
    return Math.min(100, Math.max(0, entry.reliability_score * 100));
  }

  switch (entry.status) {
    case "live":
      return 100;
    case "mock":
      return 70;
    case "adapter_placeholder":
      return 0;
    default:
      return 30;
  }
}

export function scoreAgent(
  adapter: AgentAdapter,
  entry: AgentRegistryEntry,
  request: AgentRequest,
  isAvailable: boolean,
): AgentScoreBreakdown {
  const capabilityMatch = scoreCapabilityMatch(adapter, request);
  const privacy = scorePrivacy(entry, request);
  const multimodal = scoreMultimodal(entry, request);
  const tools = scoreTools(entry, request);
  const latency = scoreLatency(entry, request);
  const cost = scoreCost(entry, request);
  const availability = scoreAvailability(isAvailable);
  const reliability = scoreReliability(entry);

  const total =
    capabilityMatch * SCORING_WEIGHTS.capabilityMatch +
    privacy * SCORING_WEIGHTS.privacy +
    multimodal * SCORING_WEIGHTS.multimodal +
    tools * SCORING_WEIGHTS.tools +
    latency * SCORING_WEIGHTS.latency +
    cost * SCORING_WEIGHTS.cost +
    availability * SCORING_WEIGHTS.availability +
    reliability * SCORING_WEIGHTS.reliability;

  return {
    capabilityMatch,
    privacy,
    multimodal,
    tools,
    latency,
    cost,
    availability,
    reliability,
    total,
  };
}
