/**
 * Capability router (docs/architecture/04). Policy order:
 * 1 capability fit, 2 privacy, 3 risk permission, 4 latency/cost, 5 diversity for fallback.
 * Never "agents vote". One primary, ordered fallbacks. Placeholders are never called.
 */
import type { RegisteredAgent } from "./registry";

export interface RouteRequest {
  required_capabilities: string[];
  privacy_requirement?: "cloud_ok" | "device_only";
  max_runtime_seconds?: number;
}

export interface RouteDecision {
  primary_agent: string;
  fallback_agents: string[];
  reason_code: string;
  max_runtime_seconds: number;
}

export function route(agents: RegisteredAgent[], req: RouteRequest): RouteDecision {
  const usable = agents.filter((a) => a.adapter !== null && a.status !== "adapter_placeholder");
  const privacyOk = (a: RegisteredAgent) => req.privacy_requirement !== "device_only" || a.privacy_class === "device";
  const fits = usable.filter((a) => privacyOk(a) && req.required_capabilities.every((c) => a.capabilities.includes(c)));
  const rank = (a: RegisteredAgent) => (a.status === "live" ? 0 : 1);
  const ordered = [...fits].sort((a, b) => rank(a) - rank(b));
  const rest = usable.filter((a) => !fits.includes(a) && privacyOk(a)).sort((a, b) => rank(a) - rank(b));
  const all = [...ordered, ...rest];
  const primary = all[0];
  return {
    primary_agent: primary?.id ?? "local-fallback",
    fallback_agents: all.slice(1).map((a) => a.id),
    reason_code: fits.length ? req.required_capabilities.join("+") || "default" : "no_capability_fit:fallback_only",
    max_runtime_seconds: req.max_runtime_seconds ?? 20,
  };
}
