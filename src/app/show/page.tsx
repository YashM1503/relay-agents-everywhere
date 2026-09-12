"use client";

import Link from "next/link";
import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { Notice } from "@/components/Notice";
import { isClientDemoMode } from "@/lib/config/app-mode";

export default function ShowPage() {
  const [capturing, setCapturing] = useState(true);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCapture = async (imageDataUrl: string) => {
    setCapturing(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageDataUrl,
          prompt:
            "Explain what the user is showing in plain language. Suggest one or two helpful next steps. Never mention AI providers or model names.",
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Could not interpret the image");
      }
      const data = (await res.json()) as { explanation: string };
      setExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCapturing(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <header className="relay-page-head mb-6">
        <Link
          href="/"
          className="inline-flex min-h-[var(--relay-tap-min)] items-center text-sm font-medium text-relay-olive"
        >
          ← Home
        </Link>
        <h1 className="mt-3 text-relay-text">Show</h1>
        <p className="relay-support mt-2">
          Point your camera at a letter, form, sign, or screen. RELAY will explain
          what it sees.
        </p>
      </header>

      {error && <Notice variant="error">{error}</Notice>}

      {capturing && !busy && (
        <CameraCapture
          side="front"
          demoMode={isClientDemoMode()}
          onCapture={(img) => void handleCapture(img)}
          onCancel={() => setCapturing(false)}
        />
      )}

      {busy && (
        <p className="relay-support text-center" role="status" aria-busy="true">
          Looking at what you showed me…
        </p>
      )}

      {explanation && (
        <section className="relay-card mt-4 space-y-2 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-relay-text-muted">
            What I see
          </h2>
          <p className="text-lg text-relay-text">{explanation}</p>
          <button
            type="button"
            onClick={() => {
              setExplanation(null);
              setCapturing(true);
            }}
            className="relay-btn-primary mt-4 w-full"
          >
            Show something else
          </button>
        </section>
      )}
    </main>
  );
}
