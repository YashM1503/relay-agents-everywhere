import { NextResponse } from "next/server";
import { transcribeAudioBuffer } from "@/lib/transcribe/openai";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  let buffer: Buffer;
  let mimeType = "audio/webm";
  let filename = "recording.webm";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }
    mimeType = file.type || mimeType;
    filename = file instanceof File ? file.name : filename;
    buffer = Buffer.from(await file.arrayBuffer());
  } else {
    const body = (await request.json()) as {
      audio?: string;
      mimeType?: string;
    };
    if (!body.audio) {
      return NextResponse.json({ error: "Missing audio payload" }, { status: 400 });
    }
    const raw = body.audio.includes(",") ? body.audio.split(",")[1]! : body.audio;
    buffer = Buffer.from(raw, "base64");
    mimeType = body.mimeType ?? mimeType;
  }

  const result = await transcribeAudioBuffer(buffer, filename, mimeType);
  if (!result) {
    return NextResponse.json(
      { error: "Transcription unavailable. Configure OPENAI_API_KEY on the server." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    observation: result.observation,
    transcript: result.text,
  });
}
