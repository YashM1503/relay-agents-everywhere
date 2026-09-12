#!/usr/bin/env bash
# Point the iOS Capacitor shell at the hosted Replit backend (no Mac dev server required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

read_replit_url() {
  if [[ -n "${CAPACITOR_SERVER_URL:-}" ]]; then
    echo "$CAPACITOR_SERVER_URL"
    return
  fi
  grep -o 'https://[^"]*replit\.app' "$ROOT/src/lib/config/hosts.ts" | head -1
}

REPLIT_URL="$(read_replit_url)"
ACTION="${1:-all}"

if [[ -z "$REPLIT_URL" ]]; then
  echo "FAIL: could not resolve Replit URL from src/lib/config/hosts.ts"
  exit 1
fi

export CAPACITOR_SERVER_URL="$REPLIT_URL"
export RELAY_BACKEND_URL="$REPLIT_URL"

echo "RELAY iOS → Replit backend"
echo "  URL: $REPLIT_URL"
echo

exec bash "$ROOT/scripts/ios-demo.sh" "$ACTION"
