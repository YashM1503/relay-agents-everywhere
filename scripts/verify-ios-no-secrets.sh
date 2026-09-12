#!/usr/bin/env bash
# Scan generated iOS project for accidental secrets before device demo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT/ios"
CAP_CONFIG="$IOS_DIR/App/App/capacitor.config.json"

if [[ ! -d "$IOS_DIR" ]]; then
  echo "FAIL: ios/ directory not found. Run: npm run cap:sync:ios"
  exit 1
fi

SECRET_PATTERN='sk-[A-Za-z0-9]{10,}|sk-or-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{20,}|OPENAI_API_KEY=|OPENROUTER_API_KEY=|BEGIN (RSA |OPENSSH )?PRIVATE KEY'

if rg -n --hidden -i "$SECRET_PATTERN" "$IOS_DIR" 2>/dev/null; then
  echo "FAIL: potential secret found in ios/"
  exit 1
fi

if [[ -f "$CAP_CONFIG" ]]; then
  if rg -n -i 'api.?key|secret|token|sk-' "$CAP_CONFIG" 2>/dev/null; then
    echo "FAIL: key-like value in capacitor.config.json"
    exit 1
  fi

  if [[ "${IOS_IPA_BUILD:-}" == "1" ]]; then
    if rg -n 'localhost|127\.0\.0\.1|lhr\.life|ngrok|loca\.lt|trycloudflare' "$CAP_CONFIG" 2>/dev/null; then
      echo "FAIL: dev/tunnel backend URL in capacitor.config.json (IPA builds need a stable host)"
      exit 1
    fi
  fi
fi

echo "PASS: no secrets detected in ios/"
