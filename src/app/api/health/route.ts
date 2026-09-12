import { NextResponse } from "next/server";
import { getServerAppMode } from "@/lib/config/app-mode";
import { RELAY_REPLIT_URL } from "@/lib/config/hosts";
import { openAiAdapter } from "@/lib/agents/adapters/openai";
import { openRouterAdapter } from "@/lib/agents/adapters/openrouter";

export async function GET() {
  const [openai, openrouter] = await Promise.all([
    openAiAdapter.health(),
    openRouterAdapter.health(),
  ]);

  const configured = [openai.available, openrouter.available].filter(Boolean).length;

  return NextResponse.json({
    ok: true,
    appMode: getServerAppMode(),
    demoMode: getServerAppMode() === "demo",
    providers: {
      openai: {
        available: openai.available,
        reason: openai.reason ?? null,
      },
      openrouter: {
        available: openrouter.available,
        reason: openrouter.reason ?? null,
      },
    },
    routing: {
      note: "Agent selected at propose time; falls back to local-fallback if no provider is configured.",
      configuredProviders: configured,
    },
    ios: {
      architecture: "Capacitor WebView → hosted Next.js (API keys stay on server)",
      syncEnv: "CAPACITOR_SERVER_URL",
      replitUrl: RELAY_REPLIT_URL,
      syncCommand: "npm run ios:replit",
    },
    replit: {
      url: RELAY_REPLIT_URL,
      docs: "REPLIT.md",
    },
  });
}
