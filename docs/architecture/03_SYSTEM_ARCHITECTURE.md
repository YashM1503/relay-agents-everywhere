# System Architecture

```text
PHONE / WEB APP
  ├─ voice
  ├─ camera
  ├─ screenshots / documents
  ├─ location (optional)
  └─ explicit user commands
        |
        v
SESSION CONTEXT LAYER
  ├─ user preferences
  ├─ current environment
  ├─ current task
  ├─ recent observations
  └─ allowed connections
        |
        v
INTENT + TASK PLANNER
        |
        v
AGENT ROUTER
  ├─ OpenAI
  ├─ Hermes adapter
  ├─ Ori adapter
  ├─ Pace adapter
  ├─ local/specialist agents
  └─ fallback
        |
        v
TOOL / CONNECTOR LAYER
  ├─ browser/demo form
  ├─ calendar
  ├─ contacts
  ├─ WhatsApp business contact
  ├─ email (later)
  ├─ smart-home event source
  └─ mock external systems
        |
        v
COUNTERSIGN
  ├─ risk tier
  ├─ proof obligations
  ├─ policy / authority
  ├─ explicit confirmation
  └─ allow / ask / hold
        |
        v
ACTION EXECUTOR
        |
        v
OUTCOME OBSERVER + DECISION RECEIPT
```

## Recommended hackathon stack
### Frontend
- Next.js + TypeScript
- Tailwind
- PWA/mobile-first
- browser MediaRecorder / camera APIs
- STT API
- optional TTS

### Backend
Use same Next.js repo with server routes unless team strongly prefers FastAPI.

### Storage
SQLite/simple local DB, or already-provisioned hosted Postgres.

Store:
- profile
- session
- task state
- action proposals
- receipts
- watch rules

### Agent routing
Internal provider adapter interface. UI never depends on model vendor.

## Optional sponsor integrations
Only if they materially improve demo:
- CopilotKit — interaction
- OpenAI — default reasoning/multimodal
- OpenRouter — provider fallback
- Trigger.dev — durable wait/async
- Auth0 — identity/authorization
- Exa — evidence retrieval
- ClickHouse — receipts/history

## Principle
RELAY owns context, state, preferences, permissions, and history.
Agents are replaceable workers.

## Runtime events
`session.started`
`observation.received`
`task.detected`
`agent.dispatched`
`agent.result`
`action.proposed`
`countersign.required`
`user.confirmed`
`action.executed`
`outcome.observed`
`receipt.created`
`session.ended`

## Data minimization
Do not send all raw sensor/audio history to every model.
Route only task-minimum context.
