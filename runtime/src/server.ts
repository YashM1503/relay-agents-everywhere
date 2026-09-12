/**
 * Standalone HTTP server (node:http, no framework) so Builder 2 can develop and test without
 * Builder A's Next.js app, and Builder A can point the phone at http://<laptop-ip>:8787 early.
 * Routes mirror docs/architecture/06_API_AND_DATA_MODELS.md. GET /demo serves a dev harness.
 */
import "./env";
import http from "node:http";
import os from "node:os";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSession, endSession, getSession, handleConfirm, handleObservation, opening } from "./index";
import { getRegistry } from "./agents/registry";
import { resolveProvider } from "./agents/adapters/openai";
import { listReceipts, getReceipt } from "./receipts/store";

const PORT = Number(process.env.RELAY_RUNTIME_PORT ?? 8787);
const here = path.dirname(fileURLToPath(import.meta.url));
const DEMO_HTML = path.resolve(here, "../demo/index.html");

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

function send(res: http.ServerResponse, status: number, body: unknown, type = "application/json") {
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  res.end(type === "application/json" ? JSON.stringify(body) : (body as string));
}

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (p === "/health") return send(res, 200, { ok: true, service: "relay-runtime" });
    if (p === "/" ) return send(res, 200, { service: "relay-runtime", demo: "/demo", routes: ["POST /api/sessions", "POST /api/sessions/:id/observations", "POST /api/sessions/:id/end", "GET /api/sessions/:id", "POST /api/actions/:id/confirm", "GET /api/receipts", "GET /api/receipts/:id", "GET /api/agents"] });
    if (p === "/demo" || p === "/demo/") return send(res, 200, readFileSync(DEMO_HTML, "utf8"), "text/html; charset=utf-8");

    if (p === "/api/agents" && req.method === "GET") {
      const agents = await Promise.all(
        getRegistry().map(async (a) => {
          const health = a.adapter ? await a.adapter.health() : "n/a";
          return { id: a.id, status: a.status, health, detail: a.adapter?.lastError?.() };
        }),
      );
      const { label, model, apiKey } = resolveProvider();
      return send(res, 200, { provider: { endpoint: label, model, key_present: !!apiKey }, agents });
    }
    if (p === "/api/sessions" && req.method === "POST") {
      const body = await readJson(req);
      const s = createSession(String(body.user_id ?? "demo-evelyn"), (body.mode as never) ?? "stay_with_me");
      return send(res, 201, { session_id: s.session_id, state: s.state, opening: opening(s) });
    }
    let m = p.match(/^\/api\/sessions\/([^/]+)\/observations$/);
    if (m && req.method === "POST") {
      const body = await readJson(req);
      return send(res, 200, await handleObservation({ ...(body as object), session_id: m[1] } as never));
    }
    m = p.match(/^\/api\/sessions\/([^/]+)\/end$/);
    if (m && req.method === "POST") {
      endSession(m[1]);
      return send(res, 200, { ok: true });
    }
    m = p.match(/^\/api\/sessions\/([^/]+)$/);
    if (m && req.method === "GET") {
      const s = getSession(m[1]);
      return s ? send(res, 200, s) : send(res, 404, { error: "SESSION_NOT_FOUND" });
    }
    m = p.match(/^\/api\/actions\/([^/]+)\/confirm$/);
    if (m && req.method === "POST") {
      const body = await readJson(req);
      return send(res, 200, await handleConfirm({ ...(body as object), action_id: m[1] } as never));
    }
    if (p === "/api/receipts" && req.method === "GET") return send(res, 200, { receipts: listReceipts() });
    m = p.match(/^\/api\/receipts\/([^/]+)$/);
    if (m && req.method === "GET") {
      const r = getReceipt(m[1]);
      return r ? send(res, 200, r) : send(res, 404, { error: "RECEIPT_NOT_FOUND" });
    }
    return send(res, 404, { error: "NOT_FOUND", path: p });
  } catch (err) {
    // Fail safely: never guess, preserve state, tell the client.
    const message = err instanceof Error ? err.message : String(err);
    return send(res, message === "SESSION_NOT_FOUND" ? 404 : 500, { error: message, degraded: true });
  }
});

function lanAddress(): string | undefined {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list ?? []) if (i.family === "IPv4" && !i.internal) return i.address;
  }
  return undefined;
}

if (process.argv[1] && process.argv[1].endsWith("server.ts")) {
  server.listen(PORT, () => {
    const lan = lanAddress();
    console.log(`relay-runtime listening on http://localhost:${PORT}`);
    console.log(`demo page:            http://localhost:${PORT}/demo${lan ? `   (phone on same Wi-Fi: http://${lan}:${PORT}/demo)` : ""}`);
  });
}
