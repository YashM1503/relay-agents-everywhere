#!/usr/bin/env bash
# Sync Capacitor iOS shell with backend URL from environment (never commit secrets).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

export CAPACITOR_SERVER_URL="${CAPACITOR_SERVER_URL:-${RELAY_BACKEND_URL:-http://localhost:3000}}"

echo "Capacitor server URL: $CAPACITOR_SERVER_URL"
npx cap sync ios
echo "Done. Open Xcode: npm run cap:open:ios"
