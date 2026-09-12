import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Hosted-backend architecture: the iOS shell loads your running RELAY Next.js server.
 * Set CAPACITOR_SERVER_URL (or RELAY_BACKEND_URL) before `npx cap sync ios`.
 *
 * Examples:
 *   http://192.168.1.42:3000   (Mac on LAN — use for physical iPhone)
 *   http://localhost:3000        (iOS Simulator only)
 *   https://your-deployed-relay.example.com
 *
 * Never put API keys in this file.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ??
  process.env.RELAY_BACKEND_URL ??
  "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "ai.relay.demo",
  appName: "RELAY",
  webDir: "capacitor-web",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
    backgroundColor: "#f7f6f2",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#f7f6f2",
    },
  },
};

export default config;
