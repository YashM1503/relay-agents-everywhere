# RELAY

**Turn the phone you already carry into an agent for the world around you.**

RELAY helps people finish real-world tasks — clinic registration, forms, documents, appointments — without stopping life to fight with apps and interfaces. Voice, camera, and context flow through one calm experience. Every sensitive step passes through **COUNTERSIGN**: nothing is shared or submitted until the user explicitly approves.

Built for **AI Tinkerers — Agents Everywhere**.

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

Host Next.js on your Mac, sync the shell to your LAN IP, and run from Xcode.
See [IOS_DEMO_SETUP.md](./IOS_DEMO_SETUP.md).

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

## License & community

Licensed under the [Apache License 2.0](./LICENSE).

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
