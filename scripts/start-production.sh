#!/usr/bin/env bash
# Safe production start for bare-metal / VM deploys.
# Never run while next dev is active — stale .next + dev causes chunk 500 errors.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

echo "Stopping anything on port ${PORT}…"
lsof -ti:"${PORT}" 2>/dev/null | xargs kill -9 2>/dev/null || true
pkill -f "${ROOT}/node_modules/.bin/next dev" 2>/dev/null || true
sleep 1

if lsof -ti:"${PORT}" >/dev/null 2>&1; then
  echo "FAIL: port ${PORT} still in use"
  exit 1
fi

echo "Building production bundle…"
rm -rf .next
npm run build

echo "Starting next start on ${HOST}:${PORT}…"
exec npm run start -- -p "${PORT}" -H "${HOST}"
