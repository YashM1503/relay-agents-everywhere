/**
 * Mock adapter ("local-fallback"). Always available, deterministic, fixture-backed, no network.
 * The router falls back to it when the live provider fails. It is what you demo if the API is down.
 */
import type { NormalizedAgentResult } from "../../contracts/domain";
import { fixtureExtraction } from "../../ingest/fixtureDocs";
import { isTaskStart } from "../../state/parse";
import type { AgentAdapter, AgentTask } from "./types";

export const mockAdapter: AgentAdapter = {
  id: "local-fallback",
  async health() {
    return "ok";
  },
  capabilities() {
    return ["basic_summary"];
  },
  async run(task: AgentTask): Promise<NormalizedAgentResult> {
    const base = { facts: [], proposed_actions: [], artifacts: [], citations: [] };
    switch (task.kind) {
      case "interpret_transcript": {
        const transcript = String(task.input.transcript ?? "");
        const parsed = isTaskStart(transcript)
          ? { kind: "start_task", goal: "Complete clinic registration", field: null, value: null, uncertainties: [] }
          : { kind: "unknown", goal: null, field: null, value: null, uncertainties: ["no live model: deterministic parsing only"] };
        return { ...base, status: "complete", summary: `mock intent: ${parsed.kind}`, uncertainties: parsed.uncertainties, metadata: { adapter: this.id, parsed } };
      }
      case "extract_document": {
        const hint = String(task.input.field_hint ?? "");
        if (hint !== "insurance_front" && hint !== "insurance_back") {
          return { ...base, status: "partial", summary: "mock vision cannot decode this", uncertainties: ["no live vision model"], metadata: { adapter: this.id, parsed: { document_kind: "unknown", fields: [], uncertainties: ["no live vision model"], decoded_url: null } } };
        }
        const ex = fixtureExtraction(`fixture:${hint}`);
        const parsed = {
          document_kind: ex.document_kind,
          fields: ex.fields.map((f) => ({ key: f.key, value: String(f.value) })),
          uncertainties: ["demo extraction: no live vision model, values from the sample card"],
          decoded_url: null,
        };
        return { ...base, status: "complete", summary: "mock extraction from sample card", uncertainties: parsed.uncertainties, metadata: { adapter: this.id, parsed, demo_extraction: true } };
      }
      default:
        return { ...base, status: "partial", summary: `mock adapter has no handler for ${task.kind}`, uncertainties: [`unsupported task ${task.kind}`], metadata: { adapter: this.id } };
    }
  },
  async cancel() {},
};
