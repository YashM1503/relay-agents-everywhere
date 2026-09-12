/**
 * Verifies the configured model provider end to end: key present, endpoint reachable, model
 * answers. This is the one check that needs credit / a working key.
 */
import "../src/env";
import { createOpenAIAdapter, resolveProvider } from "../src/agents/adapters/openai";

const cfg = resolveProvider();
console.log(`endpoint: ${cfg.label}`);
console.log(`model:    ${cfg.model}`);
console.log(`key:      ${cfg.apiKey ? "present" : "MISSING"}`);
const adapter = createOpenAIAdapter();
const health = await adapter.health();
console.log(`health:   ${health}`);
if (health !== "ok") {
  console.log(`reason:   ${adapter.lastError?.() ?? "unknown"}`);
  process.exit(1);
}
