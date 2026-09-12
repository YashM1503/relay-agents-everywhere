"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { SessionControls } from "@/components/SessionControls";
import { TaskCard } from "@/components/TaskCard";
import { useSession } from "@/components/SessionProvider";

export default function CapturePage() {
  const router = useRouter();
  const {
    state,
    beginCapture,
    submitCapture,
    endSession,
    pauseSession,
    explainSession,
    stopSession,
    isDemoMode,
  } = useSession();

  useEffect(() => {
    if (!state.sessionId) {
      router.replace("/session");
      return;
    }
    if (state.status !== "capture" && state.status !== "confirm") {
      beginCapture();
    }
  }, [state.sessionId, state.status, beginCapture, router]);

  useEffect(() => {
    if (state.status === "confirm") {
      router.push("/session/confirm");
    }
  }, [state.status, router]);

  const handleStop = async () => {
    await stopSession();
    router.push("/");
  };

  const handleEnd = async () => {
    await endSession();
    router.push("/");
  };

  if (!state.sessionId) {
    return (
      <main aria-busy="true">
        <p className="text-center text-lg text-relay-text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main aria-labelledby="capture-heading">
      <header className="mb-6">
        <Link
          href="/session"
          className="inline-flex min-h-[var(--relay-tap-min)] items-center text-sm font-medium text-relay-primary focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-active"
        >
          ← Session
        </Link>
        <h1
          id="capture-heading"
          className="mt-2 text-2xl font-bold text-relay-primary"
        >
          Show your card
        </h1>
      </header>

      <div className="space-y-6">
        <TaskCard
          title={state.taskTitle}
          step={state.taskStep}
          doingSummary={state.doingSummary}
        />

        <CameraCapture
          side={state.captureSide}
          onCapture={(img, side) => void submitCapture(img, side)}
          onCancel={handleStop}
          demoMode={isDemoMode}
        />

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
