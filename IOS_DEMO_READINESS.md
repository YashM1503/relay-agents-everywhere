# iOS Demo Readiness

> Capacitor packaging pass — web architecture frozen at `30f5167` + iOS shell.

## Architecture verification

| Check | Status |
|-------|--------|
| Single RELAY implementation (Next.js) | **PASS** |
| Hosted backend + native shell (not static export) | **PASS** |
| API routes preserved | **PASS** |
| COUNTERSIGN unchanged (no duplicate path) | **PASS** |
| Session state machine unchanged | **PASS** |
| Browser demo still works | **PASS** (same Next.js app) |

## iOS shell

| Check | Status |
|-------|--------|
| Capacitor 7 + SPM iOS project | **PASS** |
| Bundle id `ai.relay.demo` | **PASS** |
| App name RELAY | **PASS** |
| Camera permission string (point-of-use) | **PASS** |
| Microphone permission string (point-of-use) | **PASS** |
| Local network ATS (`NSAllowsLocalNetworking`) | **PASS** |
| Safe area CSS (`viewport-fit=cover`, env insets) | **PASS** |
| No horizontal scroll (`overflow-x: hidden`) | **PASS** |
| 48px minimum tap targets | **PASS** (unchanged) |
| Offline banner in session shell | **PASS** |

## OpenRouter integration

| Check | Status |
|-------|--------|
| `OPENROUTER_API_KEY` server-side only | **PASS** |
| OpenAI-compatible client (`baseURL` openrouter.ai) | **PASS** |
| Model selection via env (`GENERAL` / `VISION` / `REASONING`) | **PASS** |
| Router capability-based (not UI-coupled) | **PASS** |
| Interchangeable with OpenAI adapter | **PASS** |
| No keys in `NEXT_PUBLIC_*`, Capacitor config, Swift, plist | **PASS** |

## Automated verification

| Command | Result |
|---------|--------|
| `npm test` | **67+ tests PASS** (includes OpenRouter adapter tests) |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| `npx cap sync ios` | **PASS** |
| `npm run ios:verify-secrets` | **PASS** |

## Manual device checklist (before judging)

- [ ] Mac running `npm run dev:mobile` with LAN IP in `CAPACITOR_SERVER_URL`
- [ ] `./scripts/cap-sync-ios.sh` run after URL set
- [ ] Xcode Team selected; iPhone trusted
- [ ] Full clinic demo on device: Stay With Me → questions → capture → COUNTERSIGN → receipt
- [ ] Camera permission appears only when capturing
- [ ] Pause / Stop work
- [ ] No browser chrome visible

## Known limitations

- Physical iPhone requires Mac LAN IP (not `localhost`)
- CocoaPods not used; SPM only
- Talk / Show / Watching remain disabled in UI (unchanged)
- Microphone UI not yet functional (permission string pre-configured for future Talk)
- Xcode build on device requires manual Run (not CI-verified in this pass)

## Feature freeze

No new product features. iOS work is packaging + OpenRouter server adapter only.
