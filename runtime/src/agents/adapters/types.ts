/**
 * Adapter contract (docs/architecture/04). The UI and the state machine never see a vendor.
 */
import type { NormalizedAgentResult } from "../../contracts/domain";

export interface AgentTask {
  /** "interpret_transcript" | "extract_document" (see agents/schemas.ts) */
  kind: string;
  input: Record<string, unknown>;
  /** Data-minimized context only. Never the whole session. */
  context: Record<string, unknown>;
  timeout_ms: number;
}

export interface AgentAdapter {
  id: string;
  health(): Promise<"ok" | "degraded" | "down">;
  /** Why the last health() or run() was not ok. Never includes secrets. */
  lastError?(): string | undefined;
  capabilities(): string[];
  run(task: AgentTask): Promise<NormalizedAgentResult>;
  cancel(runId: string): Promise<void>;
}

export function failedResult(adapter: string, reason: string): NormalizedAgentResult {
  return {
    status: "failed",
    summary: reason,
    facts: [],
    uncertainties: [reason],
    proposed_actions: [],
    artifacts: [],
    citations: [],
    metadata: { adapter },
  };
}
