"use client";

import { useCallback, useRef, useState } from "react";
import { Notice } from "./Notice";

type VoiceRecorderProps = {
  onTranscript?: (transcript: string) => void;
  onComplete?: (result: {
    transcript: string;
    answer: string;
    observation: unknown;
  }) => void;
  /** When set, posts to session observe instead of /api/talk */
  sessionId?: string;
  submitLabel?: string;
};

export function VoiceRecorder({
  onTranscript,
  onComplete,
  sessionId,
  submitLabel = "Tap to talk",
}: VoiceRecorderProps) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Microphone not available on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone permission is required to use Talk.");
    }
  }, []);

  const stopAndSend = useCallback(async () => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setRecording(false);
    setBusy(true);
    setError(null);

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "recording.webm");

    try {
      if (sessionId) {
        const transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        if (!transcribeRes.ok) throw new Error("Transcription failed");
        const transcribed = (await transcribeRes.json()) as {
          transcript: string;
          observation: unknown;
        };
        onTranscript?.(transcribed.transcript);
        const observeRes = await fetch(`/api/sessions/${sessionId}/observe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "voice",
            transcript: transcribed.transcript,
            confidence: (transcribed.observation as { confidence?: number })
              ?.confidence,
          }),
        });
        if (!observeRes.ok) throw new Error("Could not save observation");
        const state = await observeRes.json();
        onComplete?.({
          transcript: transcribed.transcript,
          answer: (state as { doingSummary?: string }).doingSummary ?? "",
          observation: transcribed.observation,
        });
      } else {
        const talkRes = await fetch("/api/talk", { method: "POST", body: form });
        if (!talkRes.ok) {
          const err = (await talkRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(err.error ?? "Talk request failed");
        }
        const data = (await talkRes.json()) as {
          transcript: string;
          answer: string;
          observation: unknown;
        };
        onTranscript?.(data.transcript);
        onComplete?.(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
      mediaRef.current = null;
    }
  }, [onComplete, onTranscript, sessionId]);

  return (
    <div className="space-y-4">
      {error && <Notice variant="error">{error}</Notice>}
      <button
        type="button"
        disabled={busy}
        onClick={recording ? () => void stopAndSend() : () => void startRecording()}
        className="relay-btn-primary w-full min-h-[var(--relay-tap-min)]"
        aria-pressed={recording}
      >
        {busy
          ? "Working on it…"
          : recording
            ? "Tap when finished"
            : submitLabel}
      </button>
      {recording && (
        <p className="relay-support text-center text-sm" role="status">
          Listening… tap again when you are done speaking.
        </p>
      )}
    </div>
  );
}
