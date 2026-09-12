"use client";

import { useId, useState } from "react";
import type { GuidedQuestion } from "./useSessionFlow";
import { questionHint, questionLabel } from "@/lib/copy";

type QuestionCardProps = {
  question: GuidedQuestion;
  index: number;
  total: number;
  filledCount: number;
  totalFields: number;
  onAnswer: (answer: string) => void;
  onSkip?: () => void;
};

export function QuestionCard({
  question,
  index,
  total,
  filledCount,
  totalFields,
  onAnswer,
  onSkip,
}: QuestionCardProps) {
  const inputId = useId();
  const [value, setValue] = useState(question.prefilled ?? "");
  const label = questionLabel(question.id, question.label);
  const hint = questionHint(question.id);
  const booleanOptions =
    question.id === "sms_reminders"
      ? ["Yes, text reminders are helpful", "No, thank you"]
      : question.options;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onAnswer(value.trim());
  };

  return (
    <section
      aria-labelledby={`${inputId}-label`}
      className="relay-card p-5"
    >
      <p className="text-sm font-medium text-relay-olive">
        Question {index + 1} of {total}
      </p>
      <p className="relay-support mt-1 text-sm" role="status">
        I already have {filledCount} of {totalFields} fields
      </p>

      <h2
        id={`${inputId}-label`}
        className="mt-4 font-serif text-3xl leading-snug text-relay-text"
      >
        {label}
      </h2>
      {hint && (
        <p className="relay-support mt-2 text-base">{hint}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {question.type === "boolean" && booleanOptions ? (
          <div
            role="group"
            aria-labelledby={`${inputId}-label`}
            className="flex flex-col gap-3"
          >
            {booleanOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onAnswer(opt.startsWith("Yes") ? "Yes" : "No")}
                className={`min-h-[var(--relay-tap-min)] rounded-lg border px-6 text-left text-lg transition-colors ${
                  value === opt
                    ? "border-relay-primary bg-relay-primary text-white"
                    : "border-relay-border bg-relay-surface text-relay-text hover:bg-relay-accent"
                }`}
                aria-pressed={value === opt}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            id={inputId}
            type={question.type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={question.placeholder}
            required
            className="min-h-[var(--relay-tap-min)] w-full rounded-lg border border-relay-border bg-white px-4 text-lg text-relay-text placeholder:text-relay-text-muted"
            aria-required="true"
          />
        )}

        {question.type !== "boolean" && (
          <button
            type="submit"
            disabled={!value.trim()}
            className="relay-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        )}

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="relay-btn-secondary w-full text-relay-text-muted"
          >
            Stop
          </button>
        )}
      </form>
    </section>
  );
}
