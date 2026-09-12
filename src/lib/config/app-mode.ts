export type AppMode = "demo" | "production";

/** Server-authoritative app mode (never expose secrets). */
export function getServerAppMode(): AppMode {
  const mode = process.env.RELAY_APP_MODE?.toLowerCase();
  if (mode === "production") return "production";
  if (mode === "demo") return "demo";
  // Legacy fallback
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return "demo";
  return "production";
}

/** Client-visible mode for UI branching. */
export function getClientAppMode(): AppMode {
  if (typeof process.env.NEXT_PUBLIC_RELAY_APP_MODE === "string") {
    const mode = process.env.NEXT_PUBLIC_RELAY_APP_MODE.toLowerCase();
    if (mode === "production" || mode === "demo") return mode;
  }
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return "demo";
  return "production";
}

export function isDemoMode(): boolean {
  return getServerAppMode() === "demo";
}

export function isProductionMode(): boolean {
  return getServerAppMode() === "production";
}

export function isClientDemoMode(): boolean {
  return getClientAppMode() === "demo";
}

/** Debug panel: demo mode or explicit dev flag only. */
export function isDebugPanelEnabled(): boolean {
  if (isClientDemoMode()) return true;
  return process.env.NEXT_PUBLIC_RELAY_DEBUG === "true";
}
