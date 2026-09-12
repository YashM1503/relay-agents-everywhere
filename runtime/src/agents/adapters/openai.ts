/**
 * Live adapter for any OpenAI-compatible chat endpoint (registry id "openai-default").
 * Works with OpenAI, OpenRouter (free models included), Ollama, or a sponsor gateway by config only.
 *
 * Rules:
 * - Always request structured JSON output. Validate with zod.
 * - Hard timeout (task.timeout_ms). On timeout or invalid JSON: return status "failed" and let
 *   the router fall back. Never throw into the state machine.
 * - Send only task.input/context, never the full session (data minimization).
 * - After an auth error, stop calling the provider for a while (no point retrying 401s).
 */
import OpenAI from "openai";
import type { NormalizedAgentResult } from "../../contracts/domain";
import { TASK_SCHEMAS } from "../schemas";
import { failedResult, type AgentAdapter, type AgentTask } from "./types";

export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model: string;
  /** Hostname shown in logs and /api/agents. Never the key. */
  label: string;
}

/** The slice of the OpenAI client we use, so tests can inject a fake. */
export interface ChatClient {
  chat: {
    completions: {
      create(
        params: Record<string, unknown>,
        options?: { timeout?: number },
      ): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

export function resolveProvider(env: NodeJS.ProcessEnv = process.env): ProviderConfig {
  const apiKey = env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || undefined;
  const viaOpenRouter = !env.OPENAI_API_KEY && !!env.OPENROUTER_API_KEY;
  const baseURL = env.OPENAI_BASE_URL || (viaOpenRouter ? "https://openrouter.ai/api/v1" : undefined);
  const model = env.RELAY_MODEL || "gpt-4o-mini";
  let label = "api.openai.com";
  if (baseURL) {
    try {
      label = new URL(baseURL).host;
    } catch {
      label = baseURL;
    }
  }
  return { apiKey, baseURL, model, label };
}

const AUTH_BACKOFF_MS = 5 * 60_000;
const RATE_LIMIT_RETRY_MS = 1_500;

export function createOpenAIAdapter(cfg: ProviderConfig = resolveProvider(), injected?: ChatClient): AgentAdapter {
  let lastError: string | undefined;
  let disabledUntil = 0;
  const client: ChatClient | null =
    injected ?? (cfg.apiKey ? (new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, maxRetries: 0 }) as unknown as ChatClient) : null);
  const id = "openai-default";

  async function complete(messages: unknown[], schemaName: string, json: Record<string, unknown>, timeout: number): Promise<string> {
    try {
      return await completeOnce(messages, schemaName, json, timeout);
    } catch (err) {
      // Free tiers rate-limit per minute; one short retry recovers most 429s without hiding real outages.
      if (statusOf(err) !== 429) throw err;
      await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_MS));
      return completeOnce(messages, schemaName, json, timeout);
    }
  }

  async function completeOnce(messages: unknown[], schemaName: string, json: Record<string, unknown>, timeout: number): Promise<string> {
    if (!client) throw new Error("no client");
    const params = { model: cfg.model, messages, temperature: 0 };
    try {
      const r = await client.chat.completions.create(
        { ...params, response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema: json } } },
        { timeout },
      );
      return r.choices[0]?.message.content ?? "";
    } catch (err) {
      // Some OpenAI-compatible providers (OpenRouter free models, Ollama) reject json_schema. Retry with json_object.
      if (statusOf(err) === 400 && /response_format|json_schema|schema/i.test(messageOf(err))) {
        const r = await client.chat.completions.create({ ...params, response_format: { type: "json_object" } }, { timeout });
        return r.choices[0]?.message.content ?? "";
      }
      throw err;
    }
  }

  return {
    id,
    async health() {
      if (!client) {
        lastError = "no API key (set OPENAI_API_KEY or OPENROUTER_API_KEY in runtime/.env)";
        return "down";
      }
      try {
        // A real completion, not a models.list: a key with zero credit lists models fine but
        // fails here with insufficient_quota, which is what we need to know.
        await client.chat.completions.create(
          { model: cfg.model, messages: [{ role: "user", content: "Reply with the single word OK." }] },
          { timeout: 10_000 },
        );
        lastError = undefined;
        disabledUntil = 0;
        return "ok";
      } catch (err) {
        lastError = describe(err);
        return "down";
      }
    },
    lastError: () => lastError,
    capabilities() {
      return ["vision", "forms", "conversation", "tool_use"];
    },
    async run(task: AgentTask): Promise<NormalizedAgentResult> {
      if (!client) return failedResult(id, "no API key");
      if (Date.now() < disabledUntil) return failedResult(id, `provider disabled after auth error: ${lastError ?? "401"}`);
      const schema = TASK_SCHEMAS[task.kind];
      if (!schema) return failedResult(id, `unknown task kind ${task.kind}`);

      const imageUrl = schema.image?.(task.input);
      const userContent: unknown = imageUrl
        ? [
            { type: "text", text: schema.user(task.input) },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ]
        : schema.user(task.input);
      const messages = [
        { role: "system", content: schema.system + " Schema: " + JSON.stringify(schema.json) },
        { role: "user", content: userContent },
      ];
      try {
        const raw = await complete(messages, schema.name, schema.json, task.timeout_ms);
        let data: unknown;
        try {
          data = JSON.parse(stripFences(raw));
        } catch {
          return failedResult(id, "model returned non-JSON output");
        }
        const parsed = schema.zod.safeParse(data);
        if (!parsed.success) return failedResult(id, "model output did not match schema: " + parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; "));
        const out = parsed.data as { uncertainties?: string[] };
        lastError = undefined;
        return {
          status: "complete",
          summary: `${task.kind} via ${cfg.label}/${cfg.model}`,
          facts: [],
          uncertainties: out.uncertainties ?? [],
          proposed_actions: [],
          artifacts: [],
          citations: [],
          metadata: { adapter: id, model: cfg.model, endpoint: cfg.label, parsed: parsed.data },
        };
      } catch (err) {
        lastError = describe(err);
        const status = statusOf(err);
        if (status === 401 || status === 403) disabledUntil = Date.now() + AUTH_BACKOFF_MS;
        return failedResult(id, lastError);
      }
    },
    async cancel() {},
  };
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? Number((err as { status?: unknown }).status) : undefined;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function describe(err: unknown): string {
  if (err instanceof OpenAI.APIError) return `${err.status ?? "?"} ${err.code ?? err.name}: ${err.message}`;
  const status = statusOf(err);
  return (status ? `${status} ` : "") + messageOf(err);
}
