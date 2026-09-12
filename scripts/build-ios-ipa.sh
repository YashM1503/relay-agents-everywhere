#!/usr/bin/env bash
# Build a signed iOS .ipa (the iOS equivalent of an Android APK).
#
# Requires explicit env — never reads .env.local implicitly for the backend URL.
#
# Usage:
#   CAPACITOR_SERVER_URL=https://your-relay.example.com \
#   IOS_TEAM_ID=XXXXXXXXXX \
#   npm run ios:ipa
#
#   IOS_EXPORT_METHOD=ad-hoc npm run ios:ipa   # shareable to registered devices
#
# Output: build/ios/RELAY.ipa
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPORT_METHOD="${IOS_EXPORT_METHOD:-development}"
BACKEND_URL="${CAPACITOR_SERVER_URL:-${RELAY_BACKEND_URL:-}}"
TEAM_ID="${IOS_TEAM_ID:-}"
ARCHIVE_PATH="$ROOT/build/ios/RELAY.xcarchive"
EXPORT_DIR="$ROOT/build/ios/export"
IPA_OUT="$ROOT/build/ios/RELAY.ipa"
EXPORT_PLIST="$ROOT/build/ios/export-options.plist"
XCODE_PROJECT="$ROOT/ios/App/App.xcodeproj"
SCHEME="App"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

if [[ -z "$BACKEND_URL" ]]; then
  fail "CAPACITOR_SERVER_URL must be set explicitly (not read from .env.local)"
fi

if [[ -z "$TEAM_ID" ]]; then
  TEAM_ID="$(xcodebuild -showBuildSettings \
    -project "$XCODE_PROJECT" \
    -scheme "$SCHEME" \
    -configuration Release 2>/dev/null \
    | awk -F' = ' '/^[[:space:]]*DEVELOPMENT_TEAM =/{print $2; exit}')"
fi

if [[ -z "$TEAM_ID" ]]; then
  fail "IOS_TEAM_ID is required (or set DEVELOPMENT_TEAM in Xcode for the App target)"
fi

if [[ "$BACKEND_URL" =~ localhost|127\.0\.0\.1 ]]; then
  fail "CAPACITOR_SERVER_URL must not be localhost for IPA builds"
fi

if [[ "$BACKEND_URL" =~ lhr\.life|ngrok|loca\.lt|trycloudflare|serveo\.net ]]; then
  fail "CAPACITOR_SERVER_URL must not be an ephemeral tunnel for IPA builds"
fi

if [[ "$EXPORT_METHOD" == "ad-hoc" && "$BACKEND_URL" =~ ^http://192\.168\. ]]; then
  fail "ad-hoc IPAs require a stable HTTPS host, not a LAN IP"
fi

case "$EXPORT_METHOD" in
  development|debugging)
    EXPORT_METHOD="development"
    ;;
  ad-hoc|adhoc)
    EXPORT_METHOD="ad-hoc"
    ;;
  *)
    fail "Unsupported IOS_EXPORT_METHOD=$EXPORT_METHOD (use development or ad-hoc)"
    ;;
esac

mkdir -p "$ROOT/build/ios"
cat > "$EXPORT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>${EXPORT_METHOD}</string>
  <key>teamID</key>
  <string>${TEAM_ID}</string>
  <key>compileBitcode</key>
  <false/>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>thinning</key>
  <string>&lt;none&gt;</string>
</dict>
</plist>
EOF

if ! command -v xcodebuild >/dev/null 2>&1; then
  fail "xcodebuild not found — install Xcode on macOS"
fi

echo "==> Sync Capacitor iOS shell"
echo "    Backend: $BACKEND_URL"
export CAPACITOR_SERVER_URL="$BACKEND_URL"
export IOS_IPA_BUILD=1
bash "$ROOT/scripts/ios-demo.sh" sync

echo
echo "==> Archive ($SCHEME, Release)"
rm -rf "$ARCHIVE_PATH" "$EXPORT_DIR"

xcodebuild \
  -project "$XCODE_PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  -archivePath "$ARCHIVE_PATH" \
  archive

echo
echo "==> Export IPA ($EXPORT_METHOD)"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST"

if [[ ! -f "$EXPORT_DIR/App.ipa" ]]; then
  fail "export did not produce App.ipa"
fi

cp "$EXPORT_DIR/App.ipa" "$IPA_OUT"

echo
echo "SUCCESS: $IPA_OUT"
ls -lh "$IPA_OUT"
