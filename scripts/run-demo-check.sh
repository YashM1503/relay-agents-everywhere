#!/usr/bin/env bash
# RELAY demo QA gate — runs vitest and reports pass/fail for demo readiness.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== RELAY Demo Check =="
echo "Running: npm test"
echo

if npm test; then
  echo
  echo "RESULT: PASS — all tests green"
  exit 0
else
  echo
  echo "RESULT: FAIL — see test output above"
  exit 1
fi
