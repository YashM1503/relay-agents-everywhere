# RELAY

**Turn the phone you already carry into an agent for the world around you.**

RELAY helps people finish real-world tasks — clinic registration, forms, documents, appointments — without stopping life to fight with apps and interfaces. Voice, camera, and context flow through one calm experience. Every sensitive step passes through **COUNTERSIGN**: nothing is shared or submitted until the user explicitly approves.

Built for **AI Tinkerers — Agents Everywhere**.

**Live demo:** [relay-assist on Replit](https://relay-assist--yashmishra1904.replit.app/) · **iPhone:** Capacitor shell → same hosted backend ([setup](./IOS_DEMO_SETUP.md))

> *You should not have to leave the real world to use AI.*

---

## The idea

Most AI lives in chat windows. RELAY lives where the user already is — at a front desk, in a parking lot, reading a letter. It reads the moment, routes work to the right specialist agent, fills gaps one question at a time, and returns a clear receipt when the job is done.

The user stays in control the entire way.

---

## How it works

```
You  →  RELAY  →  Agent router  →  Specialist  →  COUNTERSIGN  →  Action  →  Receipt
```

1. **Observe** — QR, camera, or voice captures context
2. **Assist** — guided questions and document capture
3. **Confirm** — COUNTERSIGN shows exactly what will be shared
4. **Execute** — action runs only after approval
5. **Receipt** — confirmation code and audit trail

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and tap **Stay with me** for the clinic registration demo.

```bash
npm test                              # unit + integration tests
npm run typecheck
bash scripts/runtime-integration.sh   # full API path (dev server must be running)
```

### iPhone demo (Capacitor)

**Replit backend (recommended):** no Mac server — `npm run ios:replit` then open Xcode.

**Local backend:** host Next.js on your Mac, sync to LAN IP. See [IOS_DEMO_SETUP.md](./IOS_DEMO_SETUP.md) · [REPLIT.md](./REPLIT.md).

### Production deploy

```bash
npm run deploy:check
./scripts/start-production.sh
# or: docker compose up --build -d
```

Full guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## What's in the repo

| Path | Role |
|------|------|
| `src/app/` | Next.js UI and API |
| `src/lib/session/` | Session state machine |
| `src/lib/countersign/` | T0–T3 approval policy |
| `src/lib/agents/` | Router and model adapters |
| `demo-data/` | Synthetic clinic fixtures |
| `docs/` | Specs, runbooks, architecture |
| `ios/` | Capacitor iPhone shell |

Full documentation: [`/docs`](./docs) · Demo fixtures: [`/demo-data`](./demo-data)

---

## Team

| Role | Focus |
|------|-------|
| Builder A | Experience, mobile, voice, camera |
| Builder B | Runtime, agents, routing, COUNTERSIGN |
| Business | Scenario, demo data, presentation |

---

## Runtime services (Builder 2)

Built during the hackathon window on top of the Next.js app:

- **Agent execution with fallback** (`src/lib/agents/execute.ts`): the router now runs the agent it
  picks, with per-call timeouts and ordered fallback to `local-fallback`. Nothing throws into the flow.
- **Hardened live adapters** (`src/lib/agents/adapters/structured-completion.ts`, shared by the
  OpenAI and OpenRouter adapters): image attachments, strict JSON schema with a `json_object` retry
  for providers that reject it, per-call timeouts, one retry on 429, auth backoff after a 401, and
  `OPENAI_BASE_URL` for Ollama or a sponsor gateway. Config is read per call.
- **Live insurance-card reading** (`RELAY_LIVE_VISION=true`): the captured photo is read by the routed
  vision agent instead of the synthetic card. A card name that differs from the profile is recorded
  as a contradiction and COUNTERSIGN holds. Off by default so the demo stays deterministic.
- **Reliability fixes**: `POST /api/actions/:id/cancel` clears a pending proposal server-side (QA
  case 11); a COUNTERSIGN hold or deny can no longer be overridden by tapping Submit; a shared
  message that asks for money (`observe` with `type: "message"`) is left untouched and verification
  is offered, per the secondary demo scenario.
- **Standalone runtime** (`runtime/`): a framework-free, voice-first reference runtime with its own
  demo page and end-to-end script (`cd runtime && npm run demo:web`). Same fixtures, same COUNTERSIGN
  tiers; useful for the voice path and for testing without the UI. See `runtime/README.md`.

Provider setup is documented in `.env.example`. Without any key the whole demo runs deterministically.

## License & community

Licensed under the [Apache License 2.0](./LICENSE).

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
