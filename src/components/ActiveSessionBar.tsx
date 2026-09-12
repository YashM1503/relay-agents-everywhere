"use client";

type ActiveSessionBarProps = {
  active: boolean;
  paused?: boolean;
  taskTitle?: string;
};

export function ActiveSessionBar({
  active,
  paused = false,
  taskTitle = "Stay with me",
}: ActiveSessionBarProps) {
  if (!active) return null;

  const statusLabel = paused ? "Paused" : "Here with you";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${statusLabel}: ${taskTitle}`}
      className="sticky top-0 z-50 flex min-h-[var(--relay-tap-min)] items-center gap-3 border-b border-relay-border bg-relay-primary px-4 py-2 text-white"
    >
      <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
        {!paused && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
        )}
        <span
          className={`relative inline-flex h-3 w-3 rounded-full ${
            paused ? "bg-amber-300" : "bg-emerald-300"
          }`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {paused ? "Take your time" : "Here with you"} · {taskTitle}
        </p>
      </div>
      <span
        className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold tracking-wide"
        style={{ background: "rgba(255,255,255,0.15)" }}
        aria-hidden="true"
      >
        {paused ? "PAUSED" : "ACTIVE"}
      </span>
    </div>
  );
}
