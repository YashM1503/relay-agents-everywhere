"use client";

import { useState } from "react";
import type { ReceiptData } from "./useSessionFlow";
import { COPY } from "@/lib/copy";

type ReceiptCardProps = {
  data: ReceiptData;
  onDone?: () => void;
};

export function ReceiptCard({ data, onDone }: ReceiptCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      aria-labelledby="receipt-title"
      className="relay-card border-relay-olive/30 p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-relay-olive text-2xl text-white"
          aria-hidden="true"
        >
          ✓
        </span>
        <div>
          <h2 id="receipt-title" className="text-relay-text">
            {COPY.receipt.heading}
          </h2>
          <p className="relay-support mt-1">{COPY.receipt.support}</p>
          <p className="mt-2 text-lg text-relay-text">{data.summary}</p>
        </div>
      </div>

      <dl className="mt-6 space-y-4">
        <div className="rounded-xl bg-relay-accent p-4">
          <dt className="text-sm font-semibold text-relay-olive">
            Confirmation
          </dt>
          <dd className="mt-1 font-mono text-2xl font-bold text-relay-text">
            {data.confirmationCode}
          </dd>
        </div>
        <div className="rounded-xl border border-relay-border p-4">
          <dt className="text-sm font-semibold text-relay-text-muted">
            Appointment
          </dt>
          <dd className="mt-1 font-serif text-xl text-relay-text">
            {data.appointment}
          </dd>
          {data.calendarAdded && (
            <p className="mt-2 text-sm text-relay-olive" role="status">
              Added to calendar
            </p>
          )}
        </div>
      </dl>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="audit-trail"
          className="relay-btn-secondary flex w-full items-center justify-between text-left"
        >
          {COPY.receipt.audit}
          <span aria-hidden="true">{expanded ? "▲" : "▼"}</span>
        </button>

        {expanded && (
          <ol
            id="audit-trail"
            className="mt-3 space-y-3 border-l-2 border-relay-olive pl-4"
            aria-label="Audit trail of actions taken"
          >
            {data.auditSteps.map((step, i) => (
              <li key={step.id} className="relative">
                <span
                  className="absolute -left-[calc(1rem+5px)] top-1 h-2.5 w-2.5 rounded-full bg-relay-olive"
                  aria-hidden="true"
                />
                <p className="text-sm text-relay-text-muted">
                  Step {i + 1} · {step.timestamp}
                </p>
                <p className="font-medium text-relay-text">{step.label}</p>
                <p className="relay-support text-sm">{step.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {onDone && (
        <button type="button" onClick={onDone} className="relay-btn-primary mt-6 w-full">
          Back to home
        </button>
      )}
    </section>
  );
}
