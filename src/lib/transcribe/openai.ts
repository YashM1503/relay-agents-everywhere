import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { normalizeVoiceObservation } from "@/lib/observation/voice";

function getTranscriptionModel(): string {
  return process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1";
}

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseURL = process.env.OPENAI_BASE_URL;
  return baseURL ? new OpenAI({ apiKey, baseURL }) : new OpenAI({ apiKey });
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<{ observation: ReturnType<typeof normalizeVoiceObservation>; text: string } | null> {
  const client = getClient();
  if (!client) return null;

  const file = await toFile(buffer, filename, { type: mimeType });
  const result = await client.audio.transcriptions.create({
    file,
    model: getTranscriptionModel(),
    response_format: "verbose_json",
  });

  const text = result.text?.trim() ?? "";
  if (!text) return null;

  const segments = (result as { segments?: Array<{ avg_logprob?: number }> })
    .segments;
  const logprob = segments?.[0]?.avg_logprob;
  const confidence =
    typeof logprob === "number"
      ? Math.min(1, Math.max(0, 1 + logprob))
      : 0.85;

  const observation = normalizeVoiceObservation(text, confidence);
  return { observation, text };
}
