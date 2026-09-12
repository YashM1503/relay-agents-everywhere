/**
 * Voice ingestion.
 * The PHONE does speech-to-text and sends a transcript as observation_type "voice". The runtime
 * never receives or stores raw audio (privacy test: raw microphone recording not retained).
 *
 * interpretTranscript() layers: deterministic parsing first (stop, choices, change-answer,
 * task start), then the routed model for anything else. Control never depends on the model.
 */
import type { Choice } from "../contracts/builderA";
import { runAgent } from "../agents/run";
import { VoiceIntentSchema, type VoiceIntent } from "../agents/schemas";
import { isStopCommand, isTaskStart, matchChoice, wantsChange } from "../state/parse";

export type { VoiceIntent } from "../agents/schemas";

export interface TranscriptContext {
  has_task: boolean;
  current_question?: string;
  choices?: Choice[];
}

export async function interpretTranscript(transcript: string, ctx: TranscriptContext): Promise<VoiceIntent> {
  if (isStopCommand(transcript)) return { kind: "stop", uncertainties: [] };
  if (!ctx.has_task && isTaskStart(transcript)) return { kind: "start_task", goal: "Complete clinic registration", uncertainties: [] };
  if (ctx.choices?.length) {
    const c = matchChoice(transcript, ctx.choices);
    if (c) return { kind: "answer", field: ctx.current_question, value: c.id, uncertainties: [] };
  }
  const changed = wantsChange(transcript);
  if (changed) return { kind: "change_answer", field: changed, uncertainties: [] };

  const result = await runAgent(
    "interpret_transcript",
    {
      transcript,
      current_question: ctx.current_question ?? null,
      choices: (ctx.choices ?? []).map((c) => ({ id: c.id, label: c.label })),
    },
    { language: "en" },
    { required_capabilities: ["conversation"], timeout_ms: 8_000 },
  );
  if (result.status !== "failed") {
    const parsed = VoiceIntentSchema.safeParse(result.metadata.parsed);
    if (parsed.success) return parsed.data;
  }
  return { kind: "unknown", uncertainties: [result.summary || "model unavailable"] };
}

/** True when the intent came back without a live model (so the UI can say voice understanding is limited). */
export function intentIsDegraded(intent: VoiceIntent): boolean {
  return intent.kind === "unknown" && intent.uncertainties.some((u) => /no live model|unavailable|failed|no api key|disabled/i.test(u));
}
