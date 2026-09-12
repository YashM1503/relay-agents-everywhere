"use client";

import { useState } from "react";
import type { DebugEvent } from "./useSessionFlow";

type DebugPanelProps = {
  events: DebugEvent[];
  visible?: boolean;
};

const PHASE_COLORS: Record<DebugEvent["phase"], string> = {
  observation: "bg-blue-100 text-blue-900",
  intent: "bg-purple-100 text-purple-900",
  agent: "bg-indigo-100 text-indigo-900",
  proposal: "bg-amber-100 text-amber-900",
  countersign: "bg-orange-100 text-orange-900",
  tool: "bg-green-100 text-green-900",
};

export function DebugPanel({ events, visible }: DebugPanelProps) {
  const [open, setOpen] = useState(true);

  if (!visible) return null;

  return (
    <aside
      aria-label="Debug panel — demo mode only"
      className="fixed bottom-0 left-0 right-0 z-40 max-h-[40vh] overflow-hidden border-t-2 border-relay-active bg-relay-text text-white shadow-2xl"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="debug-panel-content"
        className="flex min-h-[var(--relay-tap-min)] w-full items-center justify-between px-4 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-relay-active"
      >
        <span>Debug · Observation → Intent → Agent → Proposal → COUNTERSIGN → Tool</span>
        <span aria-hidden="true">{open ? "▼" : "▲"}</span>
      </button>

      {open && (
        <div
          id="debug-panel-content"
          className="overflow-y-auto px-4 pb-4"
          style={{ maxHeight: "calc(40vh - var(--relay-tap-min))" }}
        >
          {events.length === 0 ? (
            <p className="text-sm text-gray-400">No events yet.</p>
          ) : (
            <ol className="space-y-2" aria-label="Debug event log">
              {events.map((event, i) => (
                <li
                  key={`${event.phase}-${i}`}
                  className="rounded-lg bg-gray-800 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${PHASE_COLORS[event.phase]}`}
                    >
                      {event.phase}
                    </span>
                    <span className="text-gray-400">{event.timestamp}</span>
                  </div>
                  <p className="mt-1 font-medium">{event.label}</p>
                  <p className="text-gray-400">{event.detail}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </aside>
  );
}
