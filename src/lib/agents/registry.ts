import registryData from "../../../demo-data/agent_registry.json";
import {
  hermesAdapter,
  localFallbackAdapter,
  openAiAdapter,
  openRouterAdapter,
  oriAdapter,
  paceAdapter,
} from "./adapters";
import type { AgentAdapter, AgentRegistryEntry } from "./types";

const ADAPTER_MAP: Record<string, AgentAdapter> = {
  "openai-default": openAiAdapter,
  "openrouter-default": openRouterAdapter,
  hermes: hermesAdapter,
  ori: oriAdapter,
  pace: paceAdapter,
  "local-fallback": localFallbackAdapter,
};

interface AgentRegistryFile {
  agents: AgentRegistryEntry[];
  note?: string;
}

const parsedRegistry = registryData as AgentRegistryFile;

/** Registry entries loaded from demo-data/agent_registry.json. */
export function getRegistryEntries(): AgentRegistryEntry[] {
  return parsedRegistry.agents;
}

/** All registered adapter instances keyed by id. */
export function getAdapterMap(): Record<string, AgentAdapter> {
  return { ...ADAPTER_MAP };
}

/** Resolve a single adapter by registry id. */
export function getAdapterById(id: string): AgentAdapter | undefined {
  return ADAPTER_MAP[id];
}

/** All adapters that exist in both registry and runtime map. */
export function getRegisteredAdapters(): AgentAdapter[] {
  return parsedRegistry.agents
    .map((entry) => ADAPTER_MAP[entry.id])
    .filter((adapter): adapter is AgentAdapter => adapter !== undefined);
}

/** Lookup registry metadata for an adapter id. */
export function getRegistryEntry(id: string): AgentRegistryEntry | undefined {
  return parsedRegistry.agents.find((entry) => entry.id === id);
}
