import { describe, expect, it } from "vitest";
import { createOpenAiAdapter, resolveProvider, type ChatClient } from "@/lib/agents/adapters/openai";
import { runWithFallback } from "@/lib/agents/execute";
import { normalize } from "@/lib/agents/normalize";
import type { AgentAdapter, AgentRequest, RelayContext, RoutingDecision } from "@/lib/agents/types";

const ctx: RelayContext = {
  userPreferences: {},
  currentEnvironment: [],
  currentTask: { taskId: "t", goal: "Complete clinic registration", status: "in_progress" },
  conversationContext: [],
  connectedSources: [],
  permissions: {},
};

const req: AgentRequest = {
  taskType: "extract_document",
  requiredCapabilities: ["vision"],
  prompt: "read the card",
  timeoutMs: 50,
};

const fake = (id: string, execute: AgentAdapter["execute"]): AgentAdapter => ({
  id,
  capabilities: ["vision"],
  canHandle: async () => true,
  health: async () => ({ available: true }),
  execute,
});

const decision = (primary: string, fallbacks: string[]): RoutingDecision => ({
  primary_agent: primary,
  fallback_agents: fallbacks,
  reason_code: "test",
  max_runtime_seconds: 1,
  scores: {},
});

const completed = (summary: string, findings: Array<{ key: string; value: string }> = []) =>
  normalize({ status: "completed", summary, findings });

describe("runWithFallback", () => {
  it("uses the next adapter when the primary fails, throws, or hangs", async () => {
    const adapters = {
      failing: fake("failing", async () => normalize({ status: "failed", summary: "boom" })),
      throwing: fake("throwing", async () => { throw new Error("network down"); }),
      hanging: fake("hanging", () => new Promise(() => {})),
      "local-fallback": fake("local-fallback", async () => completed("mock ok")),
    };
    const out = await runWithFallback(req, ctx, { adapters, decision: decision("failing", ["throwing", "hanging"]) });
    expect(out.agentId).toBe("local-fallback");
    expect(out.result.status).toBe("completed");
    expect(out.attempts).toHaveLength(3);
    expect(out.attempts[0]).toContain("boom");
    expect(out.attempts[1]).toContain("network down");
    expect(out.attempts[2]).toContain("timeout");
  });

  it("returns a failed result, never throws, when every adapter fails", async () => {
    const adapters = { only: fake("only", async () => normalize({ status: "failed", summary: "no" })) };
    const out = await runWithFallback(req, ctx, { adapters, decision: decision("only", []) });
    expect(out.agentId).toBe("none");
    expect(out.result.status).toBe("failed");
    expect(out.result.summary).toContain("All agents failed");
  });
});

function fakeClient(responder: (params: Record<string, unknown>) => string | Promise<string>) {
  const calls: Record<string, unknown>[] = [];
  const client: ChatClient & { calls: Record<string, unknown>[] } = {
    calls,
    chat: {
      completions: {
        async create(params) {
          calls.push(params);
          return { choices: [{ message: { content: await responder(params) } }] };
        },
      },
    },
  };
  return client;
}

const cfg = () => ({ apiKey: "test", model: "test-model", label: "fake" });

describe("openai adapter (Builder 2)", () => {
  it("sends image attachments as image parts and returns normalized findings", async () => {
    const client = fakeClient(() =>
      JSON.stringify({ status: "completed", summary: "ok", findings: [{ key: "member_id", value: "DEMO-77104" }] }),
    );
    const adapter = createOpenAiAdapter(cfg, client);
    const result = await adapter.execute(
      { ...req, attachments: [{ type: "image", dataUrl: "data:image/png;base64,AAAA" }] },
      ctx,
    );
    expect(result.status).toBe("completed");
    expect(result.findings[0]?.value).toBe("DEMO-77104");
    const messages = client.calls[0]?.messages as Array<{ role: string; content: unknown }>;
    expect(Array.isArray(messages[1]?.content)).toBe(true);
    expect((client.calls[0]?.response_format as { type: string }).type).toBe("json_schema");
  });

  it("fails cleanly on non-JSON or off-schema output and unwraps fenced JSON", async () => {
    const bad = createOpenAiAdapter(cfg, fakeClient(() => "sure!"));
    expect((await bad.execute(req, ctx)).status).toBe("failed");
    const off = createOpenAiAdapter(cfg, fakeClient(() => JSON.stringify({ status: "banana" })));
    expect((await off.execute(req, ctx)).status).toBe("failed");
    const fenced = createOpenAiAdapter(cfg, fakeClient(() => "```json\n" + JSON.stringify({ status: "completed", summary: "s" }) + "\n```"));
    expect((await fenced.execute(req, ctx)).status).toBe("completed");
  });

  it("retries with json_object when json_schema is rejected, and backs off after a 401", async () => {
    let n = 0;
    const strictThenLoose = fakeClient((p) => {
      n++;
      if ((p.response_format as { type: string }).type === "json_schema") {
        const e = new Error("response_format not supported") as Error & { status: number };
        e.status = 400;
        throw e;
      }
      return JSON.stringify({ status: "completed", summary: "loose ok" });
    });
    const a = createOpenAiAdapter(cfg, strictThenLoose);
    expect((await a.execute(req, ctx)).status).toBe("completed");
    expect(n).toBe(2);

    let calls = 0;
    const unauthorized = fakeClient(() => {
      calls++;
      const e = new Error("Incorrect API key") as Error & { status: number };
      e.status = 401;
      throw e;
    });
    const b = createOpenAiAdapter(cfg, unauthorized);
    expect((await b.execute(req, ctx)).status).toBe("failed");
    expect((await b.execute(req, ctx)).summary).toContain("disabled after auth error");
    expect(calls).toBe(1);
    const health = await b.health();
    expect(health.available).toBe(false);
    expect(health.reason).toContain("auth error");
    expect(b.lastError()).not.toContain("test");
  });

  it("resolves the provider from the environment: OpenAI, OpenRouter, or a custom base URL", () => {
    expect(resolveProvider({ OPENAI_API_KEY: "k" }).label).toBe("api.openai.com");
    const or = resolveProvider({ OPENROUTER_API_KEY: "k", RELAY_MODEL: "google/gemma-4-31b-it:free" });
    expect(or.label).toBe("openrouter.ai");
    expect(or.model).toBe("google/gemma-4-31b-it:free");
    expect(resolveProvider({ OPENAI_API_KEY: "ollama", OPENAI_BASE_URL: "http://localhost:11434/v1" }).label).toBe("localhost:11434");
    expect(resolveProvider({}).apiKey).toBeUndefined();
  });
});
