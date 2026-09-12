/**
 * runWithFallback: route a request, run the primary adapter, fall back in order, and always end
 * with local-fallback. Never throws. The router chooses; this is what actually runs an agent.
 */
import { dispatch } from "@/lib/router/dispatch";
import { normalize } from "./normalize";
import { getAdapterMap } from "./registry";
import type { AgentAdapter, AgentRequest, AgentResult, RelayContext, RoutingDecision } from "./types";

export interface RunOutcome {
  result: AgentResult;
  /** Adapter that produced the result, or "none" when every attempt failed. */
  agentId: string;
  /** One line per failed attempt, for the debug panel and receipts. */
  attempts: string[];
  decision: RoutingDecision;
}

export interface RunOptions {
  adapters?: Record<string, AgentAdapter>;
  decision?: RoutingDecision;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export async function runWithFallback(
  request: AgentRequest,
  context: RelayContext,
  opts: RunOptions = {},
): Promise<RunOutcome> {
  const adapters = opts.adapters ?? getAdapterMap();
  const decision = opts.decision ?? (await dispatch(request, context));
  const order = [...new Set([decision.primary_agent, ...decision.fallback_agents, "local-fallback"])];
  const timeoutMs = (request.timeoutMs ?? DEFAULT_TIMEOUT_MS) + 1_000;
  const attempts: string[] = [];

  for (const id of order) {
    const adapter = adapters[id];
    if (!adapter) continue;
    try {
      const result = await withTimeout(adapter.execute(request, context), timeoutMs);
      if (result.status !== "failed") return { result, agentId: id, attempts, decision };
      attempts.push(`${id}: ${result.summary}`);
    } catch (err) {
      attempts.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return {
    result: normalize({ status: "failed", summary: `All agents failed: ${attempts.join(" | ")}` }),
    agentId: "none",
    attempts,
    decision,
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}
