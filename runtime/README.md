# RELAY runtime (Builder 2 / Builder B)

> Role in the repo: the Next.js app at the repo root is the demo of record. This folder is Builder 2's
> standalone, framework-free runtime: a voice-first reference implementation of the same flow with
> its own demo page and scripted end-to-end run. Builder 2's production changes to the app itself
> live under `src/lib/agents/execute.ts`, `src/lib/agents/adapters/openai.ts` and
> `src/lib/session/store.ts` (see the root README, "Runtime services").

Everything behind the UI: session state machine, voice/vision ingestion, agent router and adapters,
demo tools, COUNTERSIGN, receipts. Framework-free TypeScript so it runs on its own or inside the
Next.js app.

## Run

```bash
cd runtime
npm install
cp .env.example .env                 # optional: fill in ONE provider option (see below)
npm run demo:web                     # server + demo page at http://localhost:8787/demo
npm run demo                         # scripted end-to-end run in the terminal (no key needed)
npm run demo:3x                      # the "passes three times" check
npm run check                        # typecheck + tests, no key needed
npm run check:provider               # the only check that needs a working key
```

`runtime/.env` and the repo root `.env` are loaded automatically. The server prints a LAN URL so a
phone on the same Wi-Fi can open the demo page.

## The demo

The scripted clinic registration from `docs/demo/11_DEMO_DATASET_GUIDE.md`, fully deterministic:

1. "RELAY, stay with me" (or scan the clinic QR) opens the Demo Clinic registration.
2. RELAY reuses name, phone, email, address and language from the profile and asks you to confirm.
3. One question at a time: date of birth, emergency contact (trusted contacts offered), reminders, reason.
4. Front of the insurance card by camera (or "Use sample card photo").
5. Appointment choice, with step-free entrances marked.
6. COUNTERSIGN: Tier 2, the exact payload is shown, sensitive fields listed, explicit confirmation.
7. The clinic rejects with `DOCUMENT_SIDE_REQUIRED_1029`; RELAY translates it and asks for the back.
8. New payload, new hash, new confirmation. Submitted. Receipt with confirmation code, appointment
   added to the calendar (Tier 1, auto per the user's policy).

Also handled: "stop" at any point (cancels the pending action, "continue" resumes), changing an answer
while reviewing (forces a new confirmation), a wrong QR domain (hold before sharing anything), an
unreadable photo, the wrong card side, a card name that differs from the profile (asks, never
guesses), a shared "pay $350 now" message (left untouched, verification offered), and the user asking
RELAY to send money (Tier 3, denied by policy, recorded).

## Contract with the phone (Builder A)

`POST /api/sessions` → `{ session_id, state, opening }` where `opening` is a first `RelayResponse`.

`POST /api/sessions/:id/observations`
```json
{ "observation_type": "voice|text|image|document", "content": "...", "field_hint": "insurance_back" }
```
returns
```json
{ "task": "...", "state": "...", "assistant_message": "...", "next_input": "voice|camera|choice|confirm|none",
  "choices": [{ "id": "slot-1", "label": "Sep 18, 2:30 PM", "note": "step-free entrance confirmed" }],
  "action_proposal": null, "receipt": null, "degraded": false,
  "step": { "index": 3, "total": 8, "label": "Date of birth" }, "field": "dob" }
```

- `voice` / `text`: the phone does speech-to-text and sends the transcript. The runtime never gets audio.
- `image`: a `data:` URL from the camera; echo `field` back as `field_hint`. Downscale to ~1024px first.
- `document`: something the user shared with RELAY (a forwarded message). Treated as untrusted data.
- Choices: send the choice `id` (or its label) as a `voice` observation.

`POST /api/actions/:id/confirm` with `{ session_id, payload_hash, decision: "confirm"|"reject" }`.
The `payload_hash` must be the one shown in `action_proposal`; a mismatch re-presents the proposal.
Saying "yes" or "no" as a voice observation while `next_input` is `confirm` works too.

Full types: `src/contracts/builderA.ts`. Other routes: `GET /api/agents`, `GET /api/receipts`,
`GET /api/sessions/:id`, `POST /api/sessions/:id/end`, `GET /demo`.

## Layout

```
src/flow/orchestrator.ts  handleObservation / handleConfirm: global rules, then state dispatch
src/flow/start.ts         first observation -> task (voice, typed, QR photo or link; destination check)
src/flow/collect.ts       one question at a time; answers recorded with provenance; camera handling
src/flow/propose.ts       payload + hash + COUNTERSIGN verdict -> ask / execute / hold
src/flow/execute.ts       the only place a Tier 2 tool runs; guarded, idempotent; receipts
src/flow/task.ts          task model, payload, summary lines
src/state/                machine.ts (transitions), parse.ts (deterministic parsing), questions.ts (prompts)
src/ingest/               voice.ts (transcript -> intent), vision.ts (image -> fields, QR check), fixtureDocs.ts
src/agents/               router.ts, run.ts (fallback), schemas.ts, adapters/{openai,mock}.ts
src/countersign/          policy.ts (tiers), evaluate.ts (proof obligations, verdicts, executor guard)
src/tools/                lookup_profile, open_demo_form, fill_form, submit_form, create_calendar_event
src/receipts/             receipt store + sensitive-minimized phone view
src/server.ts             node:http server, routes above, serves demo/index.html
demo/index.html           dev harness page (choices, camera, confirm card, receipt, mic if available)
scripts/happy-path.ts     scripted end-to-end run over HTTP
tests/                    node:test suites (flow scenarios, router/adapters, HTTP)
```

## Model provider

The runtime works without any key: the state machine, tools, COUNTERSIGN and receipts are
deterministic, and `local-fallback` is a fixture-backed mock. A live model is used only for
transcript interpretation when deterministic parsing can't classify an utterance, and for reading
the insurance-card photo. The router falls back to the mock when the live adapter fails, and the
response says so (`degraded`, or "demo mode" in the message).

The live adapter talks to any OpenAI-compatible chat endpoint. Pick one in `runtime/.env`:

| Option | Set | Cost |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | prepaid credit on platform.openai.com; a ChatGPT / Codex subscription does not include it |
| OpenRouter | `OPENROUTER_API_KEY`, `RELAY_MODEL=<id>:free` | free models exist, rate limited; paid models need a top-up |
| Ollama (local) | `OPENAI_BASE_URL=http://localhost:11434/v1`, `OPENAI_API_KEY=ollama`, `RELAY_MODEL=<pulled model>` | free, offline, slower |
| Sponsor gateway | `OPENAI_BASE_URL` + key from organizers | usually free for the event |

`GET /api/agents` shows the endpoint, model, and a live health probe with the failure reason.

| registry id | status | notes |
|---|---|---|
| openai-default | live when the health probe is ok | structured JSON output, hard timeout, auth backoff |
| local-fallback | mock | fixture-backed, no network, used when live fails |
| hermes / ori / pace | placeholder | no adapter; never called |
