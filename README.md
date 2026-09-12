# RELAY

RELAY turns the phone someone already carries into an accessibility agent for the world around them.

It can use voice, camera, documents, apps and eventually connected devices to understand what the user is trying to accomplish, route the task to the appropriate agent, and help complete it while keeping the user in control.

## Hackathon

Built for AI Tinkerers — Agents Everywhere.

### Principle

The user should not have to stop interacting with the real world to interact with AI.

### Architecture

Environment / User
→ RELAY Context Layer
→ Agent Router
→ Specialist Agent
→ COUNTERSIGN
→ Action
→ Outcome / Receipt

## Team workflow

- Builder A: frontend / mobile experience / voice / camera
- Builder B: runtime / agents / routing / COUNTERSIGN / integrations
- Business Lead: user scenario / business case / demo data / presentation

## Documentation

See `/docs`.

## Demo data

Synthetic data only. See `/demo-data`.

## Runtime services (Builder 2)

Built during the hackathon window on top of the Next.js app:

- **Agent execution with fallback** (`src/lib/agents/execute.ts`): the router now runs the agent it
  picks, with per-call timeouts and ordered fallback to `local-fallback`. Nothing throws into the flow.
- **Provider-agnostic live adapter** (`src/lib/agents/adapters/openai.ts`): OpenAI, OpenRouter (free
  vision models), Ollama or a sponsor gateway via `OPENAI_BASE_URL` / `RELAY_MODEL`; image
  attachments; structured JSON with a `json_object` retry; auth backoff after a 401.
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
