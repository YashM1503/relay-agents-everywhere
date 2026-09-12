import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers";

test("HTTP: sessions, observations, confirm, agents, demo page, and error handling", async () => {
  process.env.OPENAI_API_KEY = "";
  const { server } = await import("../src/server");
  await new Promise<void>((r) => server.listen(0, r));
  const addr = server.address();
  const base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  const json = async (path: string, body?: unknown, method = body ? "POST" : "GET") => {
    const res = await fetch(base + path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() };
  };
  try {
    const health = await json("/health");
    assert.equal(health.body.ok, true);

    const demo = await fetch(base + "/demo");
    assert.equal(demo.status, 200);
    assert.match(demo.headers.get("content-type") ?? "", /text\/html/);
    assert.match(await demo.text(), /RELAY/);

    const agents = await json("/api/agents");
    assert.equal(agents.body.provider.key_present, false);
    const live = agents.body.agents.find((a: { id: string }) => a.id === "openai-default");
    assert.equal(live.health, "down");
    assert.match(live.detail, /no API key/);
    assert.equal(agents.body.agents.find((a: { id: string }) => a.id === "local-fallback").health, "ok");

    const s = await json("/api/sessions", { user_id: "demo-evelyn" });
    assert.equal(s.status, 201);
    assert.match(s.body.opening.assistant_message, /I'm here/);
    const sid = s.body.session_id as string;

    let r = await json(`/api/sessions/${sid}/observations`, { observation_type: "voice", content: "help me register at the clinic" });
    assert.equal(r.body.state, "COLLECT_MISSING");
    assert.equal(r.body.field, "__confirm_profile");

    const missing = await json("/api/sessions/nope/observations", { observation_type: "voice", content: "hi" });
    assert.equal(missing.status, 404);

    const nothing = await json("/api/actions/a_none/confirm", { session_id: sid, payload_hash: "x", decision: "confirm" });
    assert.match(nothing.body.assistant_message, /nothing waiting/);

    const receipts = await json("/api/receipts");
    assert.deepEqual(receipts.body.receipts, []);

    const end = await json(`/api/sessions/${sid}/end`, {});
    assert.equal(end.body.ok, true);
    r = await json(`/api/sessions/${sid}/observations`, { observation_type: "voice", content: "hi" });
    assert.match(r.body.assistant_message, /ended/);

    const nf = await json("/api/whatever");
    assert.equal(nf.status, 404);
  } finally {
    server.close();
  }
});
