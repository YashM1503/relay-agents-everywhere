#!/usr/bin/env bash
# RELAY iOS demo — preflight checks, provider status, Capacitor sync, secret scan.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ACTION="${1:-all}"
FAIL=0

pass() { echo "  ✓ $1"; }
warn() { echo "  ⚠ $1" >&2; }
fail() { echo "  ✗ $1"; FAIL=1; }

load_env() {
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
  if [[ -f .env.local ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env.local
    set +a
  fi
}

detect_lan_ip() {
  local iface ip
  for iface in en0 en1 bridge0; do
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    if [[ -n "$ip" ]]; then
      echo "$ip"
      return 0
    fi
  done
  return 1
}

env_var_set() {
  local name="$1"
  local val="${!name:-}"
  [[ -n "$val" && "$val" != "your_key_here" && "$val" != "sk-..." ]]
}

ensure_env_stubs() {
  local stub_file="$ROOT/.env.local"
  touch "$stub_file"

  append_if_missing() {
    local key="$1"
    local default="${2:-}"
    local hint="${3:-}"
    if ! grep -q "^${key}=" "$stub_file" 2>/dev/null; then
      echo "${key}=${default}" >> "$stub_file"
      if [[ -n "$hint" ]]; then
        warn "Added ${key}= to .env.local — ${hint}"
      else
        warn "Added ${key}= to .env.local"
      fi
    fi
  }

  append_if_missing "NEXT_PUBLIC_DEMO_MODE" "true"
  append_if_missing "OPENAI_API_KEY" "" "paste your OpenAI key to enable live routing"
  append_if_missing "OPENAI_MODEL_GENERAL" "gpt-4o-mini"
  append_if_missing "OPENAI_MODEL_VISION" "gpt-4o-mini"
  append_if_missing "OPENROUTER_API_KEY" "" "paste your OpenRouter key to enable live routing"
  append_if_missing "OPENROUTER_MODEL_GENERAL" "openai/gpt-4o-mini"
  append_if_missing "OPENROUTER_MODEL_VISION" "openai/gpt-4o-mini"
  append_if_missing "OPENROUTER_MODEL_REASONING" "anthropic/claude-3.5-sonnet"
}

resolve_backend_url() {
  local url="${CAPACITOR_SERVER_URL:-${RELAY_BACKEND_URL:-}}"
  local lan_ip

  if [[ -z "$url" ]]; then
    if lan_ip="$(detect_lan_ip)"; then
      url="http://${lan_ip}:3000"
      warn "CAPACITOR_SERVER_URL unset — using detected LAN IP: $url"
    else
      url="http://localhost:3000"
      warn "CAPACITOR_SERVER_URL unset and no LAN IP found — using localhost (Simulator only)"
    fi
  fi

  if [[ "$url" == *"192.168.1.42"* ]]; then
    if lan_ip="$(detect_lan_ip)"; then
      url="${url/192.168.1.42/$lan_ip}"
      warn "Replaced placeholder IP with detected LAN address: $lan_ip"
    fi
  fi

  if [[ "$url" =~ localhost|127\.0\.0\.1 ]]; then
    warn "localhost backend works in Simulator only — use LAN IP or HTTPS tunnel for physical iPhone"
  fi

  echo "$url"
}

print_ios_state() {
  echo
  echo "RELAY iOS shell (current build)"
  echo "────────────────────────────────"
  echo "  App id       ai.relay.demo"
  echo "  Shell        Capacitor 7 WebView (SPM, no CocoaPods)"
  echo "  Backend      Hosted Next.js — never static export"
  echo "  Live path    Stay with me → questions → camera capture → COUNTERSIGN → receipt"
  echo "  Disabled UI  Talk, Show, Watching (placeholders)"
  echo "  Permissions  Camera + mic strings in Info.plist (camera used at capture)"
  echo "  Safe areas   viewport-fit=cover + env(safe-area-inset-*)"
  echo "  Offline      SessionShell banner when navigator.onLine is false"
  echo "  Agents       Router picks openai-default or openrouter-default at propose;"
  echo "               local-fallback if no API keys configured"
  echo
}

check_providers() {
  echo "Provider keys (.env.local — server-side only)"
  if env_var_set OPENAI_API_KEY; then
    pass "OPENAI_API_KEY configured"
  else
    warn "OPENAI_API_KEY missing — OpenAI adapter unavailable"
  fi
  if env_var_set OPENROUTER_API_KEY; then
    pass "OPENROUTER_API_KEY configured"
  else
    warn "OPENROUTER_API_KEY missing — OpenRouter adapter unavailable"
  fi
  if env_var_set OPENAI_API_KEY || env_var_set OPENROUTER_API_KEY; then
    pass "At least one live provider can be routed at propose time"
  else
    warn "No live providers — demo runs on local-fallback (deterministic, still full UI path)"
  fi
  echo
}

check_backend() {
  local url="$1"
  echo "Backend reachability: $url"

  if curl -sf --max-time 8 "${url}/" -o /dev/null; then
    pass "GET / (home)"
  else
    fail "GET / — start the server: npm run dev:mobile (or keep your tunnel running)"
    echo
    return
  fi

  local health
  health="$(curl -sf --max-time 8 "${url}/api/health" 2>/dev/null || true)"
  if [[ -n "$health" ]]; then
    pass "GET /api/health"
    if echo "$health" | grep -q '"available":true'; then
      pass "Live provider reported available"
    else
      warn "No live provider available yet — add keys to .env.local and restart dev server"
    fi
  else
    warn "GET /api/health unavailable — restart dev server after pulling latest"
  fi
  echo
}

run_cap_sync() {
  local url="$1"
  export CAPACITOR_SERVER_URL="$url"
  echo "Capacitor server URL: $CAPACITOR_SERVER_URL"
  npx cap sync ios
  pass "cap sync ios"
  echo
  echo "Generated ios/App/App/capacitor.config.json:"
  python3 -c "import json; print(json.dumps(json.load(open('ios/App/App/capacitor.config.json')), indent=2))" 2>/dev/null || cat ios/App/App/capacitor.config.json
  echo
}

print_next_steps() {
  local url="$1"
  echo "Next steps"
  echo "──────────"
  echo "  1. Backend running:  npm run dev:mobile  (restart after adding API keys)"
  echo "  2. Open Xcode:       npm run cap:open:ios"
  echo "  3. Select iPhone → Run (▶)"
  echo "  4. Demo: Stay with me → questions → capture → COUNTERSIGN → receipt"
  echo
  if [[ "$url" == https://* ]]; then
    echo "  HTTPS tunnel detected — physical iPhone works without same Wi‑Fi."
  elif [[ "$url" =~ localhost|127\.0\.0\.1 ]]; then
    echo "  localhost — use Simulator, or set CAPACITOR_SERVER_URL to LAN/tunnel for device."
  else
    echo "  LAN URL — iPhone and Mac must share Wi‑Fi."
  fi
  echo
}

CLI_BACKEND_URL="${CAPACITOR_SERVER_URL:-${RELAY_BACKEND_URL:-}}"

load_env
ensure_env_stubs
load_env

# CLI/exported URL wins over .env.local (useful for local preflight while tunnel is in .env.local)
if [[ -n "$CLI_BACKEND_URL" ]]; then
  export CAPACITOR_SERVER_URL="$CLI_BACKEND_URL"
  export RELAY_BACKEND_URL="$CLI_BACKEND_URL"
fi

URL="$(resolve_backend_url)"

case "$ACTION" in
  preflight)
    print_ios_state
    check_providers
    check_backend "$URL"
    ;;
  sync)
    run_cap_sync "$URL"
    npm run ios:verify-secrets && pass "ios:verify-secrets" || fail "ios:verify-secrets"
    print_next_steps "$URL"
    ;;
  all|"")
    print_ios_state
    check_providers
    check_backend "$URL"
    run_cap_sync "$URL"
    npm run ios:verify-secrets && pass "ios:verify-secrets" || fail "ios:verify-secrets"
    print_next_steps "$URL"
    ;;
  *)
    echo "Usage: $0 [all|preflight|sync]"
    exit 1
    ;;
esac

exit "$FAIL"
