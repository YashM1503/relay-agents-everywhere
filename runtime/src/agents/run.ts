/**
 * runAgent: route a task, try the primary adapter, fall back in order. Never throws.
 */
import type { NormalizedAgentResult } from "../contracts/domain";
import { failedResult } from "./adapters/types";
import { getRegistry, type RegisteredAgent } from "./registry";
import { route } from "./router";

export interface RunOptions {
  required_capabilities: string[];
  timeout_ms?: number;
  privacy_requirement?: "cloud_ok" | "device_only";
}

export async function runAgent(
  kind: string,
  input: Record<string, unknown>,
  context: Record<string, unknown>,
  opts: RunOptions,
  agents: RegisteredAgent[] = getRegistry(),
): Promise<NormalizedAgentResult> {
  const timeout_ms = opts.timeout_ms ?? 15_000;
  const decision = route(agents, { required_capabilities: opts.required_capabilities, privacy_requirement: opts.privacy_requirement });
  const order = [decision.primary_agent, ...decision.fallback_agents];
  const reasons: string[] = [];

  for (const id of order) {
    const agent = agents.find((a) => a.id === id);
    if (!agent?.adapter) continue;
    try {
      const result = await withTimeout(agent.adapter.run({ kind, input, context, timeout_ms }), timeout_ms + 1000);
      if (result.status !== "failed") {
        return { ...result, metadata: { ...result.metadata, agent_id: id, route_reason: decision.reason_code, fallback_from: reasons } };
      }
      reasons.push(`${id}: ${result.summary}`);
    } catch (err) {
      reasons.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return failedResult("router", `all agents failed: ${reasons.join(" | ")}`);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
