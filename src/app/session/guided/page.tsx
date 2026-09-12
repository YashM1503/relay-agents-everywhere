"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { COPY } from "@/lib/copy";
import { SessionControls } from "@/components/SessionControls";
import { useSession } from "@/components/SessionProvider";

export default function GuidedPage() {
  const router = useRouter();
  const {
    state,
    beginGuidedQuestions,
    answerQuestion,
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
    if (state.questions.length === 0) {
      void beginGuidedQuestions();
    }
  }, [state.sessionId, state.questions.length, beginGuidedQuestions, router]);

  useEffect(() => {
    if (state.status === "capture") {
      router.push("/session/capture");
    }
  }, [state.status, router]);

  const currentQuestion = state.questions[state.currentQuestionIndex];

  const handleStop = async () => {
    await stopSession();
    router.push("/");
  };

  const handleEnd = async () => {
    await endSession();
    router.push("/");
  };

  if (!state.sessionId || !currentQuestion) {
    return (
      <main aria-busy="true">
        <p className="text-center text-lg text-relay-text-muted">
          Loading questions…
        </p>
      </main>
    );
  }

  if (state.currentQuestionIndex >= state.questions.length) {
    return (
      <main>
        <p className="text-center text-lg text-relay-text">
          All questions answered. Moving to insurance capture…
        </p>
      </main>
    );
  }

  return (
    <main aria-labelledby="guided-heading">
      <header className="mb-6">
        <Link
          href="/session"
          className="inline-flex min-h-[var(--relay-tap-min)] items-center text-sm font-medium text-relay-primary focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-active"
        >
          ← Session
        </Link>
        <h1 id="guided-heading" className="mt-3 font-serif text-relay-text">
          {COPY.session.understanding}
        </h1>
        <p className="relay-support mt-2">{COPY.session.understandingDetail}</p>
      </header>

      <div className="space-y-6">
        <QuestionCard
          question={currentQuestion}
          index={state.currentQuestionIndex}
          total={state.questions.length}
          filledCount={state.filledCount}
          totalFields={state.totalFields}
          onAnswer={(answer) => void answerQuestion(answer)}
          onSkip={handleStop}
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
