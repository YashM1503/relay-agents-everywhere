"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Notice } from "@/components/Notice";
import { SessionControls } from "@/components/SessionControls";
import { TaskCard } from "@/components/TaskCard";
import { useSession } from "@/components/SessionProvider";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { COPY } from "@/lib/copy";

export default function SessionPage() {
  const router = useRouter();
  const {
    state,
    startSession,
    endSession,
    pauseSession,
    explainSession,
    stopSession,
    beginGuidedQuestions,
    submitTextObservation,
    refreshState,
    isActive,
    isDemoMode,
  } = useSession();

  useEffect(() => {
    if (!state.sessionId) {
      void startSession();
    }
  }, [state.sessionId, startSession]);

  const handleEnd = async () => {
    await endSession();
    router.push("/");
  };

  const handleStop = async () => {
    await stopSession();
    router.push("/");
  };

  const handleContinue = () => {
    if (state.status === "guided") {
      router.push("/session/guided");
    } else if (state.status === "capture") {
      router.push("/session/capture");
    } else if (state.status === "confirm") {
      router.push("/session/confirm");
    } else if (state.status === "complete") {
      router.push("/session/receipt");
    } else {
      void beginGuidedQuestions();
      router.push("/session/guided");
    }
  };

  if (!state.sessionId) {
    return (
      <main aria-busy="true" aria-label="Starting session">
        <p className="text-center text-lg text-relay-text-muted">
          Starting your session…
        </p>
      </main>
    );
  }

  return (
    <main aria-labelledby="session-heading">
      <header className="relay-page-head">
        <Link
          href="/"
          className="inline-flex min-h-[var(--relay-tap-min)] items-center text-sm font-medium text-relay-olive"
        >
          ← Home
        </Link>
        <h1 id="session-heading" className="mt-3 text-relay-text">
          {COPY.session.heading}
        </h1>
        <p className="relay-support mt-2">{COPY.session.support}</p>
      </header>

      <div className="space-y-6">
        <TaskCard
          title={state.taskTitle}
          step={state.taskStep}
          doingSummary={state.doingSummary}
        />

        {state.status === "paused" && (
          <Notice variant="warning" role="status">
            <strong>{COPY.session.paused}</strong>
            <p className="mt-1">{COPY.session.pausedDetail}</p>
          </Notice>
        )}

        {state.error && (
          <Notice variant="error">
            {state.error.includes("other side")
              ? COPY.capture.recovery.hint
              : state.error}
          </Notice>
        )}

        {isActive && state.status === "active" && isDemoMode && (
          <button
            type="button"
            onClick={handleContinue}
            className="relay-btn-primary w-full"
          >
            Let&apos;s begin
          </button>
        )}

        {isActive &&
          state.status === "active" &&
          !isDemoMode &&
          state.taskStep === "Getting started" && (
            <div className="space-y-4">
              <VoiceRecorder
                sessionId={state.sessionId ?? undefined}
                submitLabel="Tell me with your voice"
                onComplete={() => void refreshState()}
              />
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem(
                    "intent",
                  ) as HTMLInputElement;
                  void submitTextObservation(input.value).then(() => {
                    input.value = "";
                    void refreshState();
                  });
                }}
              >
                <label htmlFor="session-intent" className="sr-only">
                  Describe what you need help with
                </label>
                <input
                  id="session-intent"
                  name="intent"
                  type="text"
                  placeholder="Or type what you're working on…"
                  className="w-full rounded-xl border border-relay-border px-4 py-3 text-lg"
                />
                <button type="submit" className="relay-btn-primary w-full">
                  Send
                </button>
              </form>
            </div>
          )}

        {isActive &&
          state.status === "active" &&
          !isDemoMode &&
          state.taskStep !== "Getting started" && (
            <button
              type="button"
              onClick={handleContinue}
              className="relay-btn-primary w-full"
            >
              Continue
            </button>
          )}

        {(state.status === "guided" ||
          state.status === "capture" ||
          state.status === "confirm" ||
          state.status === "complete") && (
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-[var(--relay-tap-min)] w-full rounded-xl bg-relay-primary px-6 text-lg font-semibold text-white hover:bg-relay-primary-hover focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-active"
          >
            {state.status === "complete"
              ? "View receipt"
              : "Return to current step"}
          </button>
        )}

        <SessionControls
          paused={state.status === "paused"}
          onEnd={handleEnd}
          onPause={pauseSession}
          onExplain={explainSession}
          onStop={handleStop}
        />
      </div>
    </main>
  );
}
