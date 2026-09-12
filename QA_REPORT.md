# RELAY Adversarial QA Report

**Agent:** Sub-agent E  
**Date:** 2026-09-12  
**Scope:** `tests/adversarial/`, `scripts/run-demo-check.sh`  
**Baseline:** 36 existing tests preserved; 31 adversarial cases added.

Run gate: `./scripts/run-demo-check.sh` or `npm test`

---

## Summary

| Metric | Value |
|--------|-------|
| Total test files | 5 |
| Total tests | 67 |
| Passing | 65 |
| Failing (product gaps) | 2 |
| Demo-breaking issues | 2 |

---

## Case Results

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | Happy path (API-level session chain) | **PASS** | Full create → observe → answer → capture → propose → confirm → execute → receipt via session APIs. |
| 2 | User stops session | **PASS** | `cancelSession` deletes session; pending action no longer executable. |
| 3 | Microphone unavailable | **PASS** | Voice/text fallback observations stay in OBSERVE; no auto-registration without clinic signal. |
| 4 | Camera denied | **PASS** | Demo synthetic data URLs accepted as capture fallback when hardware unavailable. |
| 5 | Malformed model output | **PASS** | `normalize()` returns `failed` for null/garbage; coerces aliases without throwing. |
| 6 | Agent provider unavailable | **PASS** | Router falls back to `local-fallback`; Hermes/Ori/Pace report unavailable; local fallback completes. |
| 7 | Wrong document | **FAIL** | Any `type: "qr"` observation auto-verifies destination — value/domain not checked. |
| 8 | Missing required field | **PASS** | COUNTERSIGN holds on unresolved fields; tool returns `DOCUMENT_SIDE_REQUIRED_1029`. |
| 9 | Duplicate submission (idempotent) | **PASS** | Same `action_id` returns same confirmation code; no double-submit. |
| 10 | Network failure patterns | **PASS** | Session state preserved mid-flow; retry after corrected capture succeeds. |
| 11 | User changes mind (cancel submit) | **PASS** / **WARN** | Execution blocked without confirmation (**PASS**). UI `cancelSubmit` does not clear server `pendingProposal` (**WARN**). |
| 12 | Sensitive action bypass (T3 send_money) | **PASS** | Tier 3 never auto-allows; `sendMoney` tool hard-blocked; poisoned normalize output still requires hold/confirm. |
| 13 | Synthetic malicious instruction in document | **PASS** | `readDocument` returns fixture summary only; injected proposed actions still require COUNTERSIGN confirm. |
| 14 | Invalid destination | **FAIL** | Same QR-type bypass as Case 7 — non-clinic URLs marked `destination_verified: true`. COUNTERSIGN proof layer would hold if flag set false manually. |
| 15 | Offline state | **PASS** | In-memory session store and local-fallback agent work without network. |
| 16 | Ambiguous user intent | **PASS** | Vague voice/text observations stay pending; no task jump or proposal. |

---

## Findings

### Demo-breaking

1. **QR observation bypasses destination verification (Cases 7, 14)**  
   `observeSession` treats every `type: "qr"` observation as clinic registration regardless of URL/value. Malicious or stale QR codes would be trusted.  
   **Location:** `src/lib/session/store.ts` — condition `observation.type === "qr" || observation.value?.includes("clinic")`  
   **Impact:** Wrong-domain registration flow could proceed in demo.  
   **Tests failing:** `QA Case 7 — Wrong document`, `QA Case 14 — Invalid destination`

2. **Cancel submit is client-only (Case 11)**  
   UI `cancelSubmit` clears local React state but no API clears `pendingProposal` on the server. User could navigate back and still have a live proposal server-side.  
   **Impact:** Medium — execution still blocked without confirm, but confusing state if user returns to confirm screen.

### Non-blocking

- **Camera/mic:** Hardware denial handled in UI via demo photo fallback (`CameraCapture`); session layer accepts synthetic data URLs. No automated mic-permission API in lib — tested via observation contract mocks.
- **Network:** Session store is in-memory/local; no fetch retry wrapper in lib. UI `apiFetch` swallows errors silently — resilience depends on client re-fetch.
- **Malformed model output:** Router `normalize()` degrades gracefully; no uncaught throws observed.

---

## Test Inventory

| File | Tests |
|------|-------|
| `tests/contracts/demo-data.test.ts` | 9 |
| `tests/agents/router.test.ts` | 13 |
| `tests/countersign/evaluate.test.ts` | 12 |
| `tests/integration/demo-path.test.ts` | 2 |
| `tests/adversarial/qa-scenarios.test.ts` | 31 |
| **Total** | **67** |

---

## Recommendations (orchestrator / P10)

1. Tighten `observeSession` to validate QR value against allowlisted clinic domain/form_id before setting `destination_verified`.
2. Add `POST /api/actions/:id/cancel` or clear `pendingProposal` when user cancels COUNTERSIGN card.
3. Re-run `./scripts/run-demo-check.sh` after fixes; target 67/67 green.

---

## Full sweep — 2026-09-12 (post iOS tooling)

| Gate | Result | Notes |
|------|--------|-------|
| `npm test` | **PASS** | 70/70 (6 files) |
| `npm run typecheck` | **PASS** | |
| `npm run build` | **PASS** | Includes `/api/health` |
| `scripts/runtime-integration.sh` | **PASS** | Full clinic path after dev warm-up |
| Edge HTTP checks | **PASS** | 404 on bad session, untrusted QR held, execute-without-confirm blocked, health OK |
| `npm run ios:verify-secrets` | **PASS** | No keys in `ios/` |
| `npm run ios:preflight` | **WARN** | Tunnel in `.env.local` was down; local `127.0.0.1:3000` OK when exported |
| Live providers | **WARN** | `OPENAI_API_KEY` / `OPENROUTER_API_KEY` empty in `.env.local` — routes to `local-fallback` |

### Known dev-environment flakes

- **Stale `.next` after `npm run build` while dev is running** → `GET /` 500 (`Cannot find module './331.js'`). Fix: restart dev after build or `rm -rf .next`.
- **Cold-start route compilation** → first `runtime-integration.sh` run may fail on early steps; re-run after warm-up passes.
- **In-memory sessions** → dev-only; production would need external store.

### Not tested in this sweep

- Physical iPhone Xcode run (manual)
- Live OpenAI/OpenRouter calls (keys not configured in env)
- HTTPS tunnel (`lhr.life`) — was unreachable during sweep
