# DEMO_READINESS — Clinic Registration Path

> Updated after integration package visual reconciliation pass.

## Environment

| Check | Status |
|-------|--------|
| `npm test` (67 tests) | **PASS** |
| Demo path integration (5 consecutive runs) | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| Demo mode flag | `NEXT_PUBLIC_DEMO_MODE=true` |
| OpenAI key (optional) | Server-only; demo path works without it |

## Demo path stages

| Stage | Status | Notes |
|-------|--------|-------|
| 1. Open RELAY / Home | **PASS** | Editorial heading, Evelyn greeting, sage Stay with me card |
| 2. Stay With Me session | **PASS** | Charcoal active bar; Pause/Stop always visible |
| 3. Task recognized (QR) | **PASS** | Trusted clinic QR only; untrusted QR → HOLD |
| 4. Guided questions | **PASS** | One-at-a-time with contextual hints from UI_COPY |
| 5. Insurance capture | **PASS** | Local-only notice; demo photo fallback |
| 6. Tool error recovery | **PASS** | “Let's get the other side” on first back attempt |
| 7. COUNTERSIGN proposal | **PASS** | “Ready to submit.” + enumerated fields + Not yet |
| 8. Explicit approval | **PASS** | Submit blocked without confirm |
| 9. Synthetic submission | **PASS** | Idempotent by action_id |
| 10. Receipt + audit trail | **PASS** | “You're done.” + expandable What RELAY did |

## Reliability fallbacks

| Risk | Mitigation | Status |
|------|------------|--------|
| OpenAI latency/outage | Deterministic tools; local-fallback router | **PASS** |
| Camera permission denied | Demo photo + package copy | **PASS** |
| Offline | Browser offline banner in session shell | **PASS** |
| Model output schema violation | Zod normalize → failed AgentResult | **PASS** |
| Double submission | Idempotent clinic-form + executed flag | **PASS** |
| Malicious QR | Destination verification before ASSIST | **PASS** |
| T3 money bypass | sendMoney blocked; COUNTERSIGN hold | **PASS** |

## Run locally

```bash
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000?demo=true` → **Stay with me**

## Feature freeze

Architecture frozen. No Python/SQLite adoption. Hero path only.
