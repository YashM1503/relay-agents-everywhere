"use client";

type SessionControlsProps = {
  paused?: boolean;
  onEnd: () => void;
  onPause: () => void;
  onExplain: () => void;
  onStop: () => void;
};

export function SessionControls({
  paused = false,
  onEnd,
  onPause,
  onExplain,
  onStop,
}: SessionControlsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Session controls"
      className="flex flex-wrap gap-3"
    >
      <ControlButton
        label="End session"
        variant="secondary"
        onClick={onEnd}
      />
      <ControlButton
        label={paused ? "Resume" : "Pause"}
        variant="secondary"
        onClick={onPause}
        ariaPressed={paused}
      />
      <ControlButton
        label="Explain"
        variant="secondary"
        onClick={onExplain}
      />
      <ControlButton
        label="Stop"
        variant="danger"
        onClick={onStop}
      />
    </div>
  );
}

type ControlButtonProps = {
  label: string;
  variant: "secondary" | "danger";
  onClick: () => void;
  ariaPressed?: boolean;
};

function ControlButton({
  label,
  variant,
  onClick,
  ariaPressed,
}: ControlButtonProps) {
  const base =
    "inline-flex min-h-[var(--relay-tap-min)] min-w-[var(--relay-tap-min)] flex-1 items-center justify-center rounded-xl px-4 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2";

  const styles =
    variant === "danger"
      ? `${base} border-2 border-relay-danger bg-white text-relay-danger hover:bg-red-50 focus-visible:outline-relay-danger`
      : `${base} border-2 border-relay-border bg-relay-surface text-relay-text hover:bg-relay-accent focus-visible:outline-relay-active`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={styles}
      aria-label={label}
      aria-pressed={ariaPressed}
    >
      {label}
    </button>
  );
}
