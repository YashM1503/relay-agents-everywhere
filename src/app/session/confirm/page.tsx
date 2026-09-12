"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CountersignCard } from "@/components/CountersignCard";
import { SessionControls } from "@/components/SessionControls";
import { useSession } from "@/components/SessionProvider";

export default function ConfirmPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    state,
    confirmSubmit,
    cancelSubmit,
    reviewSubmit,
    endSession,
    pauseSession,
    explainSession,
    stopSession,
  } = useSession();

  useEffect(() => {
    if (!state.sessionId) {
      router.replace("/session");
      return;
    }
    if (!state.countersign && state.status !== "complete") {
      router.replace("/session/capture");
    }
  }, [state.sessionId, state.countersign, state.status, router]);

  useEffect(() => {
    if (state.status === "complete") {
      router.push("/session/receipt");
    }
  }, [state.status, router]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await confirmSubmit();
    setSubmitting(false);
  };

  const handleReview = () => {
    reviewSubmit();
    router.push("/session/guided");
  };

  const handleCancel = async () => {
    await cancelSubmit();
    router.push("/session");
  };

  const handleStop = async () => {
    await stopSession();
    router.push("/");
  };

  const handleEnd = async () => {
    await endSession();
    router.push("/");
  };

  if (!state.countersign) {
    return (
      <main aria-busy="true">
        <p className="text-center text-lg text-relay-text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main aria-labelledby="confirm-heading">
      <header className="mb-6">
        <Link
          href="/session"
          className="inline-flex min-h-[var(--relay-tap-min)] items-center text-sm font-medium text-relay-primary focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-active"
        >
          ← Session
        </Link>
        <h1
          id="confirm-heading"
          className="mt-2 text-2xl font-bold text-relay-primary"
        >
          Confirm before sending
        </h1>
      </header>

      <div className="space-y-6">
        <CountersignCard
          data={state.countersign}
          onSubmit={() => void handleSubmit()}
          onReview={handleReview}
          onCancel={() => void handleCancel()}
          loading={submitting}
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
