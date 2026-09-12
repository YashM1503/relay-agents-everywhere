"use client";

import Link from "next/link";
import { isClientDemoMode } from "@/lib/config/app-mode";

type HomeAction = {
  id: string;
  label: string;
  href: string;
  hint: string;
  featured?: boolean;
  hidden?: boolean;
  disabled?: boolean;
};

function getActions(demoMode: boolean): HomeAction[] {
  const core: HomeAction[] = [
    {
      id: "talk",
      label: "Talk",
      href: "/talk",
      hint: "Ask with your voice.",
    },
    {
      id: "show",
      label: "Show",
      href: "/show",
      hint: "Show me something to explain.",
    },
    {
      id: "stay",
      label: "Stay with me",
      href: "/session",
      hint: "Here with you. On your terms.",
      featured: true,
    },
  ];

  if (demoMode) {
    return [
      ...core,
      {
        id: "watching",
        label: "Watching",
        href: "#",
        hint: "Coming soon",
        disabled: true,
      },
    ];
  }

  return core;
}

export function HomeScreen() {
  const demoMode = isClientDemoMode();
  const actions = getActions(demoMode).filter((a) => !a.hidden);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <header className="relay-page-head mb-10 text-center">
        {!demoMode && (
          <p className="relay-eyebrow">Ready when you need me</p>
        )}
        {demoMode && (
          <p className="relay-eyebrow">Demo mode</p>
        )}
        <h1 className="mt-3 text-relay-text">A little help. A lighter day.</h1>
        <p className="relay-support mt-3 text-lg">
          {demoMode
            ? "Hello, Evelyn. What can I help you with?"
            : "What can I help you with?"}
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
      </footer>
    </main>
  );
}
