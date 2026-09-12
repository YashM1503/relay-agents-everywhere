"use client";

import Link from "next/link";

const actions = [
  {
    id: "talk",
    label: "Talk",
    href: "#",
    disabled: true,
    hint: "Coming soon",
  },
  {
    id: "show",
    label: "Show",
    href: "#",
    disabled: true,
    hint: "Coming soon",
  },
  {
    id: "stay",
    label: "Stay with me",
    href: "/session",
    disabled: false,
    hint: "Here with you. On your terms.",
    featured: true,
  },
  {
    id: "watching",
    label: "Watching",
    href: "#",
    disabled: true,
    hint: "Coming soon",
  },
] as const;

export function HomeScreen() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <header className="relay-page-head mb-10 text-center">
        <p className="relay-eyebrow">{demoMode ? "Demo mode" : "Ready when you need me"}</p>
        <h1 className="mt-3 text-relay-text">A little help. A lighter day.</h1>
        <p className="relay-support mt-3 text-lg">
          Hello, Evelyn. What can I help you with?
        </p>
      </header>

      <nav aria-label="Primary actions" className="flex flex-1 flex-col gap-3">
        {actions.map((action) =>
          action.disabled ? (
            <button
              key={action.id}
              type="button"
              disabled
              aria-disabled="true"
              className="relay-card flex min-h-[var(--relay-tap-min)] flex-col items-start justify-center px-6 py-5 text-left opacity-60"
            >
              <span className="text-xl font-semibold text-relay-text-muted">
                {action.label}
              </span>
              <span className="relay-support mt-1 text-sm">{action.hint}</span>
            </button>
          ) : (
            <Link
              key={action.id}
              href={action.href}
              className={`flex min-h-[var(--relay-tap-min)] flex-col items-start justify-center px-6 py-5 text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-relay-active ${
                action.featured
                  ? "rounded-2xl border border-relay-border bg-relay-accent"
                  : "relay-card"
              }`}
            >
              <span className="font-serif text-2xl text-relay-text">
                {action.label}
              </span>
              <span className="relay-support mt-1 text-base">{action.hint}</span>
            </Link>
          ),
        )}
      </nav>

      <footer className="relay-support mt-8 text-center text-sm">
        <p>Always your choice. Nothing shared without your say.</p>
        <nav
          aria-label="Secondary actions"
          className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2"
        >
          <span aria-disabled="true" className="opacity-60">
            Activity
          </span>
          <span aria-hidden="true">·</span>
          <span aria-disabled="true" className="opacity-60">
            Connections
          </span>
          <span aria-hidden="true">·</span>
          <span aria-disabled="true" className="opacity-60">
            Preferences
          </span>
        </nav>
      </footer>
    </main>
  );
}
