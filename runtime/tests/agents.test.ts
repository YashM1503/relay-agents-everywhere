import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers";
import { route } from "../src/agents/router";
import { runAgent } from "../src/agents/run";
import { createOpenAIAdapter, resolveProvider, type ChatClient } from "../src/agents/adapters/openai";
import { mockAdapter } from "../src/agents/adapters/mock";
import { failedResult, type AgentAdapter } from "../src/agents/adapters/types";
import type { RegisteredAgent } from "../src/agents/registry";
import { extractFromImage } from "../src/ingest/vision";
import { interpretTranscript } from "../src/ingest/voice";

const reg = (id: string, status: RegisteredAgent["status"], caps: string[], adapter: AgentAdapter | null, privacy = "cloud"): RegisteredAgent => ({
  id,
  display_name: id,
  capabilities: caps,
  status,
  privacy_class: privacy,
  adapter,
});

const stub = (id: string, run: AgentAdapter["run"]): AgentAdapter => ({
  id,
  async health() { return "ok"; },
  capabilities() { return ["vision", "conversation"]; },
  run,
  async cancel() {},
});

test("router: capability fit first, live before mock, placeholders never called, privacy respected", () => {
  const agents = [
    reg("hermes", "adapter_placeholder", ["research"], null),
    reg("local-fallback", "mock", ["basic_summary"], mockAdapter, "device"),
    reg("openai-default", "live", ["vision", "conversation"], stub("openai-default", async () => failedResult("x", "no"))),
  ];
  const d = route(agents, { required_capabilities: ["vision"] });
  assert.equal(d.primary_agent, "openai-default");
  assert.deepEqual(d.fallback_agents, ["local-fallback"]);
  assert.equal(d.reason_code, "vision");
  const dev = route(agents, { required_capabilities: ["vision"], privacy_requirement: "device_only" });
  assert.equal(dev.primary_agent, "local-fallback");
  assert.equal(dev.reason_code, "no_capability_fit:fallback_only");
});

test("runAgent falls back when the primary fails, throws, or times out", async () => {
  const good = stub("good", async (t) => ({ ...failedResult("good", ""), status: "complete", summary: "ok", metadata: { parsed: { kind: "unknown", uncertainties: [] }, k: t.kind } }));
  const failing = stub("bad", async () => failedResult("bad", "boom"));
  const throwing = stub("throws", async () => { throw new Error("network"); });
  const hanging = stub("hangs", () => new Promise(() => {}));
  const agents = [reg("bad", "live", ["vision"], failing), reg("throws", "live", ["vision"], throwing), reg("hangs", "live", ["vision"], hanging), reg("good", "mock", ["vision"], good)];
  const r = await runAgent("interpret_transcript", {}, {}, { required_capabilities: ["vision"], timeout_ms: 50 }, agents);
  assert.equal(r.status, "complete");
  assert.equal(r.metadata.agent_id, "good");
  const from = r.metadata.fallback_from as string[];
  assert.equal(from.length, 3);
  assert.match(from[0], /bad: boom/);
  assert.match(from[1], /network/);
  assert.match(from[2], /timeout/);

  const none = await runAgent("x", {}, {}, { required_capabilities: [] }, [reg("bad", "live", [], failing)]);
  assert.equal(none.status, "failed");
});

function fakeClient(responder: (params: Record<string, unknown>) => string | Promise<string>): ChatClient & { calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    chat: { completions: { async create(params) { calls.push(params); return { choices: [{ message: { content: await responder(params) } }] }; } } },
  };
}

const cfg = { apiKey: "test", model: "test-model", label: "fake" };

test("live adapter: valid JSON -> complete with parsed output; image tasks send an image part", async () => {
  const client = fakeClient(() => JSON.stringify({ document_kind: "insurance_card_front", fields: [{ key: "member_id", value: "DEMO-1" }], uncertainties: ["glare"], decoded_url: null }));
  const a = createOpenAIAdapter(cfg, client);
  const r = await a.run({ kind: "extract_document", input: { image_data_url: "data:image/png;base64,AAAA", field_hint: "insurance_front" }, context: {}, timeout_ms: 1000 });
  assert.equal(r.status, "complete");
  assert.deepEqual(r.uncertainties, ["glare"]);
  assert.equal((r.metadata.parsed as { document_kind: string }).document_kind, "insurance_card_front");
  const msgs = client.calls[0].messages as Array<{ role: string; content: unknown }>;
  assert.ok(Array.isArray(msgs[1].content), "image tasks use a content array");
  assert.equal((client.calls[0].response_format as { type: string }).type, "json_schema");
});

test("live adapter: non-JSON, schema mismatch, fenced JSON, and unknown task kinds", async () => {
  const bad = createOpenAIAdapter(cfg, fakeClient(() => "sure thing!"));
  assert.equal((await bad.run({ kind: "interpret_transcript", input: { transcript: "x" }, context: {}, timeout_ms: 10 })).status, "failed");
  const mismatch = createOpenAIAdapter(cfg, fakeClient(() => JSON.stringify({ kind: "nonsense" })));
  const m = await mismatch.run({ kind: "interpret_transcript", input: { transcript: "x" }, context: {}, timeout_ms: 10 });
  assert.equal(m.status, "failed");
  assert.match(m.summary, /did not match schema/);
  const fenced = createOpenAIAdapter(cfg, fakeClient(() => "```json\n" + JSON.stringify({ kind: "answer", goal: null, field: "dob", value: "1950-03-12", uncertainties: [] }) + "\n```"));
  assert.equal((await fenced.run({ kind: "interpret_transcript", input: { transcript: "x" }, context: {}, timeout_ms: 10 })).status, "complete");
  assert.match((await fenced.run({ kind: "nope", input: {}, context: {}, timeout_ms: 10 })).summary, /unknown task kind/);
});

test("live adapter: 400 on response_format retries with json_object; 401 disables further calls", async () => {
  let n = 0;
  const strictThenLoose = fakeClient((p) => {
    n++;
    if ((p.response_format as { type: string }).type === "json_schema") { const e = new Error("response_format json_schema not supported") as Error & { status: number }; e.status = 400; throw e; }
    return JSON.stringify({ kind: "unknown", goal: null, field: null, value: null, uncertainties: [] });
  });
  const a = createOpenAIAdapter(cfg, strictThenLoose);
  const r = await a.run({ kind: "interpret_transcript", input: { transcript: "x" }, context: {}, timeout_ms: 10 });
  assert.equal(r.status, "complete");
  assert.equal(n, 2);

  let calls = 0;
  const unauthorized = fakeClient(() => { calls++; const e = new Error("Incorrect API key") as Error & { status: number }; e.status = 401; throw e; });
  const b = createOpenAIAdapter(cfg, unauthorized);
  const r1 = await b.run({ kind: "interpret_transcript", input: { transcript: "x" }, context: {}, timeout_ms: 10 });
  const r2 = await b.run({ kind: "interpret_transcript", input: { transcript: "x" }, context: {}, timeout_ms: 10 });
  assert.equal(r1.status, "failed");
  assert.match(r2.summary, /disabled after auth error/);
  assert.equal(calls, 1, "no second network call after a 401");
  assert.equal(await b.health(), "down");
  assert.match(b.lastError?.() ?? "", /401/);
  assert.ok(!(b.lastError?.() ?? "").includes("test"), "errors never include the key");
});

test("resolveProvider: OpenAI by default, OpenRouter when only that key is set, explicit base URL wins", () => {
  assert.equal(resolveProvider({ OPENAI_API_KEY: "k" } as NodeJS.ProcessEnv).label, "api.openai.com");
  const or = resolveProvider({ OPENROUTER_API_KEY: "k", RELAY_MODEL: "google/gemma-4-31b-it:free" } as NodeJS.ProcessEnv);
  assert.equal(or.label, "openrouter.ai");
  assert.equal(or.model, "google/gemma-4-31b-it:free");
  const local = resolveProvider({ OPENAI_API_KEY: "ollama", OPENAI_BASE_URL: "http://localhost:11434/v1" } as NodeJS.ProcessEnv);
  assert.equal(local.label, "localhost:11434");
  assert.equal(resolveProvider({} as NodeJS.ProcessEnv).apiKey, undefined);
});

test("ingestion without a live model: fixtures resolve locally, real photos fall back to demo extraction, transcripts stay deterministic", async () => {
  const fx = await extractFromImage("fixture:insurance_back");
  assert.equal(fx.document_kind, "insurance_card_back");
  const real = await extractFromImage("data:image/jpeg;base64,/9j/4AAQ", "insurance_front");
  assert.equal(real.document_kind, "insurance_card_front");
  assert.equal(real.demo_extraction, true);
  const qr = await extractFromImage("data:image/jpeg;base64,/9j/4AAQ", "qr");
  assert.equal(qr.document_kind, "unknown");

  assert.equal((await interpretTranscript("stop", { has_task: true })).kind, "stop");
  assert.equal((await interpretTranscript("I need to register", { has_task: false })).kind, "start_task");
  const pick = await interpretTranscript("the second one", { has_task: true, current_question: "appointment_slot", choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }] });
  assert.equal(pick.value, "b");
  const unknown = await interpretTranscript("blue skies", { has_task: true });
  assert.equal(unknown.kind, "unknown");
});
