/**
 * Public hosted backends for RELAY (web + iOS Capacitor shell).
 * API keys stay on the server — never in the iOS binary.
 */
export const RELAY_REPLIT_URL =
  "https://relay-assist--yashmishra1904.replit.app";

/** iOS sync / IPA builds: CAPACITOR_SERVER_URL=${RELAY_REPLIT_URL} */
export const RELAY_IOS_BACKENDS = {
  replit: RELAY_REPLIT_URL,
} as const;
