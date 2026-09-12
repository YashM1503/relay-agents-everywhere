import { fixtures, type AgentRegistryEntry } from "../fixtures/load";
import type { AgentAdapter } from "./adapters/types";
import { mockAdapter } from "./adapters/mock";
import { createOpenAIAdapter } from "./adapters/openai";

export interface RegisteredAgent extends AgentRegistryEntry {
  adapter: AgentAdapter | null;
}

/** Registry = fixture metadata + the adapter that actually runs it (null for placeholders). */
export function loadRegistry(): RegisteredAgent[] {
  const adapters: Record<string, AgentAdapter> = {
    "openai-default": createOpenAIAdapter(),
    "local-fallback": mockAdapter,
  };
  return fixtures.agentRegistry().agents.map((a) => ({ ...a, adapter: adapters[a.id] ?? null }));
}

let cache: RegisteredAgent[] | null = null;

export function getRegistry(): RegisteredAgent[] {
  cache ??= loadRegistry();
  return cache;
}

export function resetRegistry(): void {
  cache = null;
}
