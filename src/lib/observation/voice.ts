import { z } from "zod";

export const voiceObservationSchema = z.object({
  source: z.literal("voice"),
  timestamp: z.string(),
  content: z.object({
    transcript: z.string(),
  }),
  confidence: z.number().min(0).max(1).optional(),
});

export type VoiceObservation = z.infer<typeof voiceObservationSchema>;

export function normalizeVoiceObservation(
  transcript: string,
  confidence?: number,
): VoiceObservation {
  return {
    source: "voice",
    timestamp: new Date().toISOString(),
    content: { transcript: transcript.trim() },
    confidence: confidence ?? 0.85,
  };
}
