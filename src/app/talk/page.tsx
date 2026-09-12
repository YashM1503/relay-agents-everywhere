"use client";

import Link from "next/link";
import { useState } from "react";
import { VoiceRecorder } from "@/components/VoiceRecorder";

export default function TalkPage() {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  const readAloud = () => {
    if (!answer || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(answer);
    window.speechSynthesis.speak(utter);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <header className="relay-page-head mb-8">
        <Link
          href="/"
          className="inline-flex min-h-[var(--relay-tap-min)] items-center text-sm font-medium text-relay-olive"
        >
          ← Home
        </Link>
        <h1 className="mt-3 text-relay-text">Talk</h1>
        <p className="relay-support mt-2">
          Ask RELAY out loud. Your words stay on the server — nothing is shared
          without your say.
        </p>
      </header>

      <VoiceRecorder
        submitLabel="Tap to talk"
        onTranscript={setTranscript}
        onComplete={(result) => {
          setTranscript(result.transcript);
          setAnswer(result.answer);
        }}
      />

      {transcript && (
        <section className="relay-card mt-6 space-y-2 p-5" aria-labelledby="you-said">
          <h2 id="you-said" className="text-sm font-semibold uppercase tracking-wide text-relay-text-muted">
            You said
          </h2>
          <p className="text-lg text-relay-text">{transcript}</p>
        </section>
      )}

      {answer && (
        <section className="relay-card mt-4 space-y-3 p-5" aria-labelledby="relay-said">
          <h2 id="relay-said" className="text-sm font-semibold uppercase tracking-wide text-relay-text-muted">
            RELAY
          </h2>
          <p className="text-lg text-relay-text">{answer}</p>
          <button
            type="button"
            onClick={readAloud}
            className="min-h-[var(--relay-tap-min)] rounded-xl border border-relay-border px-4 text-base font-medium"
          >
            Read aloud
          </button>
        </section>
      )}
    </main>
  );
}
