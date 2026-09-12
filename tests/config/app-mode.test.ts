import { afterEach, describe, expect, it } from "vitest";
import {
  getClientAppMode,
  getServerAppMode,
  isClientDemoMode,
  isDemoMode,
  isDebugPanelEnabled,
} from "@/lib/config/app-mode";

describe("app mode", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults server to production when unset", () => {
    delete process.env.RELAY_APP_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    expect(getServerAppMode()).toBe("production");
  });

  it("respects RELAY_APP_MODE=demo on server", () => {
    process.env.RELAY_APP_MODE = "demo";
    expect(isDemoMode()).toBe(true);
  });

  it("respects NEXT_PUBLIC_RELAY_APP_MODE on client", () => {
    process.env.NEXT_PUBLIC_RELAY_APP_MODE = "production";
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    expect(getClientAppMode()).toBe("production");
    expect(isClientDemoMode()).toBe(false);
  });

  it("legacy NEXT_PUBLIC_DEMO_MODE maps to demo", () => {
    delete process.env.NEXT_PUBLIC_RELAY_APP_MODE;
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    expect(getClientAppMode()).toBe("demo");
  });

  it("debug panel off in production unless RELAY_DEBUG", () => {
    process.env.NEXT_PUBLIC_RELAY_APP_MODE = "production";
    delete process.env.NEXT_PUBLIC_RELAY_DEBUG;
    expect(isDebugPanelEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_RELAY_DEBUG = "true";
    expect(isDebugPanelEnabled()).toBe(true);
  });
});
