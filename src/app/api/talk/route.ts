import { NextResponse } from "next/server";
import { answerFromTranscript } from "@/lib/agents/interact";
import { transcribeAudioBuffer } from "@/lib/transcribe/openai";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let transcript: string | undefined;
  let observation:
    | {
        source: "voice";
        timestamp: string;
        content: { transcript: string };
        confidence?: number;
      }
    | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const text = form.get("transcript");
    if (typeof text === "string" && text.trim()) {
      transcript = text.trim();
    } else {
      const file = form.get("audio");
      if (!(file instanceof Blob)) {
        return NextResponse.json({ error: "Provide audio or transcript" }, { status: 400 });
      }
      const mimeType = file.type || "audio/webm";
      const filename = file instanceof File ? file.name : "recording.webm";
      const buffer = Buffer.from(await file.arrayBuffer());
      const transcribed = await transcribeAudioBuffer(buffer, filename, mimeType);
      if (!transcribed) {
        return NextResponse.json(
          { error: "Transcription unavailable. Configure OPENAI_API_KEY on the server." },
          { status: 503 },
        );
      }
      transcript = transcribed.text;
      observation = transcribed.observation;
    }
  } else {
    const body = (await request.json()) as {
      transcript?: string;
      audio?: string;
      mimeType?: string;
    };
    if (body.transcript?.trim()) {
      transcript = body.transcript.trim();
    } else if (body.audio) {
      const raw = body.audio.includes(",") ? body.audio.split(",")[1]! : body.audio;
      const buffer = Buffer.from(raw, "base64");
      const transcribed = await transcribeAudioBuffer(
        buffer,
        "recording.webm",
        body.mimeType ?? "audio/webm",
      );
      if (!transcribed) {
        return NextResponse.json(
          { error: "Transcription unavailable. Configure OPENAI_API_KEY on the server." },
          { status: 503 },
        );
      }
      transcript = transcribed.text;
      observation = transcribed.observation;
    }
  }

  if (!transcript) {
    return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
  }

  const answer = await answerFromTranscript(transcript);

  return NextResponse.json({
    observation: observation ?? {
      source: "voice",
      timestamp: new Date().toISOString(),
      content: { transcript },
      confidence: 0.85,
    },
    transcript,
    answer: answer.answer,
    status: answer.status,
  });
}
