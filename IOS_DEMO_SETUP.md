# RELAY iOS Demo Setup

Minimal Capacitor shell around the **hosted** RELAY Next.js application. The iPhone app is a native wrapper — all API routes, COUNTERSIGN, router, and agent adapters stay on the server (Replit, your Mac, or another host).

**Hosted demo:** [https://relay-assist--yashmishra1904.replit.app/](https://relay-assist--yashmishra1904.replit.app/)

**Architecture:** iPhone shell → Capacitor WebView → `CAPACITOR_SERVER_URL` → RELAY Next.js → server-side APIs → OpenRouter/OpenAI

No API keys belong in the iOS binary.

---

## 1. Prerequisites

- macOS with **Xcode 15+** installed
- Apple ID with a **free or paid development team** (for device signing)
- iPhone + USB cable
- Node.js 18+ (already used for RELAY)
- RELAY repo with `ios/` present (main branch, Capacitor shell merged)

> **Note:** This project uses Capacitor **SPM** (Swift Package Manager). CocoaPods is not required.

---

## 2. Install dependencies

```bash
cd relay-agents-everywhere
npm install
```

---

## 3a. Replit backend (recommended — no Mac server)

If RELAY is deployed on Replit, skip sections 3–4 and sync the shell directly:

```bash
npm run ios:replit
npm run cap:open:ios
```

This sets `CAPACITOR_SERVER_URL` to `https://relay-assist--yashmishra1904.replit.app`. API keys live in Replit Secrets only.

See [REPLIT.md](./REPLIT.md) for deploy steps.

---

## 3. Configure server environment (Mac)

Copy the example env file and edit **on your Mac only** — never commit `.env.local`:

```bash
cp .env.example .env.local
```

Set at minimum:

```bash
# Required for physical iPhone — use your Mac's LAN IP (not localhost)
CAPACITOR_SERVER_URL=http://192.168.1.42:3000

# OpenRouter — server-side only
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL_GENERAL=openai/gpt-4o-mini
OPENROUTER_MODEL_VISION=openai/gpt-4o-mini
OPENROUTER_MODEL_REASONING=anthropic/claude-3.5-sonnet

# Optional fallback
OPENAI_API_KEY=

NEXT_PUBLIC_DEMO_MODE=true
```

Find your Mac IP:

```bash
ipconfig getifaddr en0
```

---

## 4. Start the RELAY backend

The iPhone must reach your Mac on the same Wi‑Fi network.

```bash
npm run dev:mobile
```

Verify in desktop Safari: `http://192.168.1.42:3000?demo=true`

Leave this terminal running during the demo.

---

## 5. Sync Capacitor iOS shell

Full preflight (providers, backend ping, sync, secret scan):

```bash
npm run ios:demo
```

Sync only:

```bash
npm run ios:sync
# or: ./scripts/cap-sync-ios.sh
```

Preflight without sync:

```bash
npm run ios:preflight
```

This copies `capacitor-web/` assets and writes `ios/App/App/capacitor.config.json` with your backend URL.

**Backend URL options:**

| URL type | Example | Physical iPhone |
|----------|---------|-----------------|
| **Replit (hosted)** | `https://relay-assist--yashmishra1904.replit.app` | ✓ Works anywhere |
| HTTPS tunnel | `https://xxxx.lhr.life` | ✓ Works anywhere |
| LAN IP | `http://192.168.x.x:3000` | ✓ Same Wi‑Fi as Mac |
| localhost | `http://localhost:3000` | Simulator only |

Check provider status while the server is running:

```bash
curl -s "$CAPACITOR_SERVER_URL/api/health" | python3 -m json.tool
```

---

## 6. Build an installable `.ipa` (iOS equivalent of APK)

On macOS with Xcode and signing configured:

```bash
# Required: stable backend URL + your Apple Developer Team ID (10 chars)
CAPACITOR_SERVER_URL=https://your-relay.example.com \
IOS_TEAM_ID=XXXXXXXXXX \
npm run ios:ipa
```

Output: **`build/ios/RELAY.ipa`** (~650 KB shell — the web app loads from your server).

| Export method | Command | Who can install |
|---------------|---------|-----------------|
| Development (default) | set env vars above, then `npm run ios:ipa` | Devices registered to your Apple Developer team |
| Ad-hoc | add `IOS_EXPORT_METHOD=ad-hoc` (HTTPS host only) | Up to 100 registered device UDIDs |

IPA builds **reject** localhost and ephemeral tunnel URLs (`*.lhr.life`, ngrok, etc.) so distributable binaries do not embed dev infrastructure.

Install via **Xcode → Window → Devices and Simulators** (drag the `.ipa` onto your iPhone), or Apple Configurator.

> Unlike Android APK sideloading, iOS requires Apple code signing. Free Apple IDs work for your own devices via Xcode; sharing widely needs ad-hoc or TestFlight.

---

## 7. Open in Xcode

```bash
npm run cap:open:ios
```

Opens `ios/App/App.xcodeproj`.

---

## 8. Configure signing

1. Select the **App** target in Xcode
2. **Signing & Capabilities**
3. Check **Automatically manage signing**
4. Choose your **Team** (Apple ID) — the repo does not commit a `DEVELOPMENT_TEAM`
5. Confirm **Bundle Identifier:** `ai.relay.demo`

If the bundle ID conflicts, change it only in Xcode and `capacitor.config.ts` together — do not fork the web app.

---

## 9. Connect iPhone and run

1. Plug iPhone into Mac; unlock and trust the computer
2. Select your **iPhone** as the run destination (not a simulator)
3. Press **Run** (▶)

First launch loads RELAY from your Mac's IP. You should see the familiar Home screen with **Stay with me**.

> **Simulator note:** `http://localhost:3000` works in Simulator only. Physical devices require your Mac's LAN IP.

---

## 10. Demo path on device

1. Tap **Stay with me**
2. Complete guided questions
3. Capture insurance card (camera permission appears **at capture**, not launch)
4. Retry back-of-card if demo error appears
5. COUNTERSIGN → Submit
6. View receipt

Pause / Stop remain available throughout.

---

## 11. Reset demo

- Pull to refresh is not required — start a new session from Home
- Or restart the app
- Server-side reset: restart `npm run dev:mobile` (in-memory sessions clear)

---

## 12. Troubleshooting

| Problem | Fix |
|---------|-----|
| White screen on launch | Confirm `npm run dev:mobile` is running; re-run `./scripts/cap-sync-ios.sh` with correct IP |
| "Cannot reach RELAY" | iPhone and Mac on same Wi‑Fi; check Mac firewall allows port 3000 |
| Camera not working | Settings → RELAY → enable Camera; permission is requested at capture |
| Signing errors | Select valid Team; register device in Apple Developer portal if needed |
| Stale content | `npm run cap:sync:ios` after backend URL change |
| API errors | Keys belong in `.env.local` on Mac only — never in iOS project |

### Verify no secrets in iOS project

```bash
npm run ios:verify-secrets
```

### Re-run web tests (unchanged architecture)

```bash
npm test
npm run build
```

---

## 13. What not to do

- Do not embed OpenRouter/OpenAI keys in Swift, plist, or `capacitor.config.json`
- Do not static-export Next.js for this demo (API routes would break)
- Do not add auth, push, Ring, WhatsApp, or new agent features in the iOS shell

---

## File map

| Path | Purpose |
|------|---------|
| `capacitor.config.ts` | App id, server URL (from env at sync time) |
| `capacitor-web/` | Minimal fallback web assets |
| `ios/App/` | Xcode project (SPM) |
| `src/lib/agents/adapters/openrouter.ts` | Server-side OpenRouter adapter |
| `scripts/cap-sync-ios.sh` | Sync with backend URL |
| `scripts/build-ios-ipa.sh` | Build signed `.ipa` for device install |
| `scripts/verify-ios-no-secrets.sh` | Pre-demo secret scan |
