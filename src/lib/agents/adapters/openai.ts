/**
 * OpenAI adapter (registry id "openai-default"). Any OpenAI-compatible endpoint via OPENAI_BASE_URL
 * (Ollama, a sponsor gateway). OpenRouter has its own adapter: see ./openrouter.ts.
 *
 * - Config is read per call so tests and .env changes take effect without a restart.
 * - Model: OPENAI_MODEL_VISION for image tasks, else OPENAI_MODEL_GENERAL, else gpt-4o-mini.
 * - After a 401/403 the provider is skipped for a while so the router falls back fast.
 * - Structured output, images, timeouts and retries live in ./structured-completion.ts.
 */
import OpenAI from "openai";
import { normalize } from "../normalize";
import { runStructuredCompletionDetailed, type ChatClient } from "./structured-completion";
import type {
  AgentAdapter,
  AgentCapability,
  AgentRequest,
  AgentResult,
  RelayContext,
} from "../types";

export type { ChatClient } from "./structured-completion";

const OPENAI_CAPABILITIES: AgentCapability[] = [
  "vision",
  "forms",
  "conversation",
  "tool_use",
];

export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  /** General model; image tasks may use a different one via selectOpenAiModel. */
  model: string;
  visionModel?: string;
  /** Hostname for logs and status. Never the key. */
  label: string;
}

export type EnvMap = Record<string, string | undefined>;

export function resolveProvider(env: EnvMap = process.env): ProviderConfig {
  const apiKey = env.OPENAI_API_KEY || undefined;
  const baseURL = env.OPENAI_BASE_URL || undefined;
  const model = env.OPENAI_MODEL_GENERAL || env.RELAY_MODEL || "gpt-4o-mini";
  const visionModel = env.OPENAI_MODEL_VISION || undefined;
  let label = "api.openai.com";
  if (baseURL) {
    try {
      label = new URL(baseURL).host;
    } catch {
      label = baseURL;
    }
  }
  return { apiKey, baseURL, model, visionModel, label };
}

/** Pick the model from env based on the task: no UI coupling. */
export function selectOpenAiModel(task: AgentRequest, cfg: ProviderConfig = resolveProvider()): string {
  const needsVision = task.requiredModalities?.includes("image") || (task.attachments ?? []).some((a) => a.type === "image");
  return needsVision && cfg.visionModel ? cfg.visionModel : cfg.model;
}

const AUTH_BACKOFF_MS = 5 * 60_000;

export function createOpenAiAdapter(
  config: () => ProviderConfig = () => resolveProvider(),
  injected?: ChatClient,
): AgentAdapter & { lastError(): string | undefined } {
  let disabledUntil = 0;
  let lastError: string | undefined;

  function client(cfg: ProviderConfig): ChatClient | null {
    if (injected) return injected;
    if (!cfg.apiKey) return null;
    return new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, maxRetries: 0 }) as unknown as ChatClient;
  }

  return {
    id: "openai-default",
    capabilities: OPENAI_CAPABILITIES,
    lastError: () => lastError,

    async canHandle(task: AgentRequest): Promise<boolean> {
      if (task.requiredCapabilities.length === 0) return true;
      return task.requiredCapabilities.every((cap) => OPENAI_CAPABILITIES.includes(cap));
    },

    async health(): Promise<{ available: boolean; reason?: string }> {
      const cfg = config();
      if (!cfg.apiKey && !injected) {
        return { available: false, reason: "OPENAI_API_KEY not configured" };
      }
      if (Date.now() < disabledUntil) {
        return { available: false, reason: `provider disabled after auth error: ${lastError ?? "401"}` };
      }
      return { available: true };
    },

    async execute(task: AgentRequest, context: RelayContext): Promise<AgentResult> {
      const cfg = config();
      const c = client(cfg);
      if (!c) {
        return normalize({
          status: "failed",
          summary: "OpenAI adapter is unavailable: API key not configured.",
        });
      }
      if (Date.now() < disabledUntil) {
        return normalize({ status: "failed", summary: `Provider disabled after auth error: ${lastError ?? "401"}` });
      }

      const { result, error } = await runStructuredCompletionDetailed(
        c,
        selectOpenAiModel(task, cfg),
        task,
        context,
        "default multimodal agent",
      );
      if (error) {
        lastError = `${error.status ? error.status + " " : ""}${error.message}`;
        if (error.status === 401 || error.status === 403) disabledUntil = Date.now() + AUTH_BACKOFF_MS;
      } else {
        lastError = undefined;
      }
      return result;
    },
  };
}

export const openAiAdapter: AgentAdapter = createOpenAiAdapter();
