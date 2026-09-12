"use client";

import type { CountersignData } from "./useSessionFlow";
import { COPY } from "@/lib/copy";

type CountersignCardProps = {
  data: CountersignData;
  onSubmit: () => void;
  onReview: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function CountersignCard({
  data,
  onSubmit,
  onReview,
  onCancel,
  loading = false,
}: CountersignCardProps) {
  return (
    <section
      aria-labelledby="countersign-title"
      className="relay-card p-5 shadow-sm"
    >
      <header className="relay-page-head">
        <h2 id="countersign-title" className="text-relay-text">
          {COPY.countersign.heading}
        </h2>
        <p className="relay-support mt-2">{COPY.countersign.support}</p>
      </header>

      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-relay-text-muted">
          This will share
        </h3>
        <ul
          className="mt-2 space-y-2"
          aria-label="Information to be shared"
        >
          {data.sensitiveFields.map((field) => (
            <li
              key={field}
              className="flex items-center gap-2 rounded-lg border border-relay-border bg-relay-surface px-4 py-3 text-base text-relay-text"
            >
              <span aria-hidden="true" className="text-relay-olive">
                ●
              </span>
              {field}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-xl bg-relay-accent p-4">
        <h3 className="text-sm font-semibold text-relay-olive">With</h3>
        <p className="mt-1 font-serif text-xl text-relay-text">
          {data.recipient}
        </p>
        <p className="relay-support mt-1 text-sm">{data.purpose}</p>
      </div>

      {data.evidence.length > 0 && (
        <details className="mt-4">
          <summary className="min-h-[var(--relay-tap-min)] cursor-pointer text-sm font-medium text-relay-text-muted">
            Why RELAY is ready to share this
          </summary>
          <ul className="relay-support mt-2 space-y-1 pl-4 text-sm">
            {data.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      <div
        className="mt-6 flex flex-col gap-3"
        role="group"
        aria-label="Confirmation actions"
      >
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="relay-btn-primary w-full disabled:opacity-50"
        >
          {loading ? "Submitting…" : COPY.countersign.submit}
        </button>
        <button
          type="button"
          onClick={onReview}
          disabled={loading}
          className="relay-btn-secondary w-full"
        >
          {COPY.countersign.review}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="relay-btn-secondary w-full text-relay-danger"
        >
          {COPY.countersign.notYet}
        </button>
      </div>
    </section>
  );
}
