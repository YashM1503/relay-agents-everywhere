# Builder 2 plan

Your areas: voice/vision ingestion, specialist-agent adapters, tool execution/connectors, backend
services, reliability. Everything maps to `docs/builders/09_BUILDER_B_RUNTIME_RUNBOOK.md` and the
timeline in `docs/builders/12_BUILD_DAY_RUNBOOK.md`.

Rule of the day: reliability over generality. The text-only happy path passes without any model;
the model only makes voice and vision more general.

## Status

Done and tested (no key needed):
- state machine, session store, one-question-at-a-time collection with provenance
- deterministic parsing: stop / continue / start over, yes/no, choices, "change my X", money requests
- COUNTERSIGN tiers, proof obligations, verdicts, executor guard, payload-hash-bound confirmation
- tools with idempotent submit, scripted back-of-card error, calendar event
- receipts (reference, never copy, sensitive data)
- wrong QR hold, unreadable photo, wrong card side, name conflict, shared payment message, Tier 3 denial
- router with live -> mock fallback and timeouts; live adapter with structured output and auth backoff
- HTTP server, demo page (`/demo`), scripted run (`npm run demo`, `npm run demo:3x`)

Written but NOT yet verified against a real provider (needs a working key):
- `src/agents/adapters/openai.ts` `run()`: json_schema output, json_object retry, image parts
- transcript interpretation for unrecognised phrasing (START, and mapping odd slot answers)
- real insurance-card OCR (today a real photo falls back to the sample card, flagged "demo mode")

## When you have a key

1. Put it in `runtime/.env` (see `.env.example`), then `npm run check:provider`. Expect `health: ok`.
2. `npm run demo:web`, open `/demo`, take a real photo of any card-shaped object at the card step.
   The reply should not say "demo mode" and the summary line should show the member ID it read.
3. Say something unscripted at the start ("the lady at the desk wants me to fill in the new patient
   thing") and check the task starts.
4. If a free OpenRouter model rejects `json_schema`, the adapter retries with `json_object`; check
   `GET /api/agents` and the server log for the reason if something still fails.

## Build-day timeline

### T+0 to T+20  Lock the contract (with Builder A and Business)

1. Hand Builder A `runtime/README.md` and `src/contracts/builderA.ts`. Get a yes on the shapes.
   Additions since the first draft: `step`, `field`, `opening` on session create, `document` observations.
2. Decide where Next.js lives. Proxying to `http://localhost:8787` is simplest for the first two hours.
3. Freeze the demo script with Business: field order and answers are in `scripts/happy-path.ts`.
4. Agree what is real: openai-default live (if a key exists), local-fallback mock, hermes/ori/pace never called.
5. Node: this machine has 18.16; current Next.js needs 18.18+. Agree on Node 20 LTS.

### T+20 to T+135  Connect

6. Builder A hits your server from the phone. Run one task through the full path together.
7. Watch `assistant_message` lengths on a real phone; shorten prompts in `src/state/questions.ts` if needed.
8. If Builder A wants speech output, the `sensitive_fields` list says what not to read aloud.

### T+135 to T+180  Model (only if a key exists)

9. Steps under "When you have a key" above.

### T+180 to T+210  Reliability pass on the real device

10. Kill the server mid-session and restart: sessions are in memory, so the phone must start a new
    session gracefully. Persistent DB is cut #4; only add it if everything else is done.
11. `npm run demo:3x` and the phone demo three times each.

### T+210 onward  Freeze

12. No new features. Update the root README with what was built during the window and the provider table.

## Cut order if behind

Second live agent → WhatsApp → IoT → persistent DB → watch rules → TTS → secondary scenario.
Never cut: working action, COUNTERSIGN confirmation, receipt, cancel.
