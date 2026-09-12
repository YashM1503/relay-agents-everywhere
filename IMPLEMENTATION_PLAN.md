# RELAY — Implementation Plan

> **Orchestrator:** Composer (lead engineer)  
> **Status:** Phase 1 — architecture locked, contracts + scaffold in progress  
> **MVP:** Clinic registration demo (Stay With Me → QR → guided form → insurance capture → COUNTERSIGN → receipt)

---

## 1. MVP Definition of Done

A clean local run demonstrates this path without manual intervention:

| # | Stage | Pass criteria |
|---|-------|---------------|
| 1 | Open RELAY | Home screen loads; four primary actions visible |
| 2 | Stay With Me | User taps; session indicator shows ACTIVE; state machine enters `ACTIVE_SESSION` |
| 3 | Task recognized | Clinic registration intent detected from QR/voice/context |
| 4 | Guided questions | One-question-at-a-time; profile fields reused; missing fields asked |
| 5 | Insurance capture | Camera captures front + back; synthetic OCR extracts fields |
| 6 | Tool error recovery | Missing back-of-card triggers `DOCUMENT_SIDE_REQUIRED_1029`; RELAY translates and recovers |
| 7 | COUNTERSIGN | Tier-2 proposal shows sensitive fields, recipient, purpose; explicit approval required |
| 8 | Submission | Synthetic clinic form submits; no double-submit |
| 9 | Receipt | Confirmation code + appointment slot displayed; expandable audit trail |

**Demo mode:** `?demo=true` or `NEXT_PUBLIC_DEMO_MODE=true` resets synthetic user, guarantees deterministic slots, injects one validation error, exposes debug panel.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  src/app/ + src/components/          (Sub-agent D — UI)     │
│  Home · StayWithMe · GuidedTask · Camera · COUNTERSIGN ·  │
│  Receipt · DebugPanel                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ API routes / server actions
┌──────────────────────────▼──────────────────────────────────┐
│  src/lib/session/  (Orchestrator)                           │
│  State machine: IDLE → ACTIVE → OBSERVE → INTERPRET →       │
│  ASSIST → ACTION_PROPOSED → COUNTERSIGN → ACT/ASK/HOLD →    │
│  TASK_COMPLETE → IDLE                                       │
└──────┬─────────────────┬──────────────────┬───────────────┘
       │                 │                  │
┌──────▼──────┐  ┌───────▼────────┐  ┌──────▼──────────────┐
│ Router      │  │ COUNTERSIGN    │  │ Tools               │
│ (Agent B)   │  │ (Agent C)      │  │ (Agent C)           │
│ adapters    │  │ policy tiers   │  │ clinicForm, calendar│
│ scoring     │  │ proof checks   │  │ profile, insurance  │
└──────┬──────┘  └───────┬────────┘  └──────┬──────────────┘
       │                 │                  │
┌──────▼─────────────────▼──────────────────▼───────────────┐
│  src/schemas/ + src/types/ + src/lib/contracts/  (Agent A) │
│  Zod schemas → inferred TS types; single source of truth   │
└────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  demo-data/  (fixtures, read-only for sub-agents)           │
└─────────────────────────────────────────────────────────────┘
```

### RelayContext (shared by all agents)

```typescript
type RelayContext = {
  userPreferences: AccessibilityPreferences;
  currentEnvironment: Observation[];
  currentTask: TaskState;
  conversationContext: ContextItem[];
  connectedSources: ConnectedSource[];
  permissions: PermissionPolicy;
};
```

Router constructs **minimum task-relevant context** — agents never receive full user history by default.

### AgentResult (normalized, provider-agnostic)

```typescript
type AgentResult = {
  status: "completed" | "needs_input" | "failed";
  summary: string;
  findings: Finding[];
  artifacts: Artifact[];
  proposedActions: ActionProposal[];
  confidence?: number;
};
```

UI never depends on provider-specific output.

---

## 3. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 App Router | Single repo, server routes, PWA-capable |
| Language | TypeScript strict | Required |
| Styling | Tailwind CSS | Mobile-first, matches Astra token export path |
| Validation | Zod | All external/model output validated |
| State | In-memory session store (server) + React state (client) | No DB for MVP |
| AI | OpenAI via server route | Real adapter; keys server-side only |
| Data | `demo-data/*.json` | Synthetic, deterministic |

### Explicitly NOT building (until core demo passes)

Authentication · full user accounts · production database · generic workflow builder · dozens of agent providers · real WhatsApp/Ring/wearable · caregiver dashboard · billing · analytics · admin panel · native apps · universal browser control · universal accessibility overlay

---

## 4. Task DAG

```
[P0] Read docs + lock architecture ──────────────────────────────┐
[P1] Scaffold Next.js + env + package.json (Orchestrator)        │
[P2] Core contracts — Zod schemas + types (Sub-agent A) ◄──────────┤ Phase 1
[P3] Session state machine skeleton (Orchestrator)               │
     └─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼              Phase 2 (parallel)
[P4] Agent runtime    [P5] COUNTERSIGN    [P6] UI screens
     + router              + tools            (Sub-agent D)
     (Sub-agent B)         (Sub-agent C)
         │                 │                 │
         └─────────────────┼─────────────────┘
                           ▼
[P7] Integration wiring (Orchestrator only) ────────── Phase 3
         │
         ▼
[P8] End-to-end demo scenario run ──────────────────── Phase 3
         │
         ▼
[P9] QA adversarial pass (Sub-agent E) ─────────────── Phase 4
         │
         ▼
[P10] Fix demo-breaking failures only ──────────────── Phase 5
         │
         ▼
[P11] DEMO_READINESS.md + freeze ───────────────────── Phase 5
```

### Dependency graph (must respect)

```
P2 → P4, P5, P6, P7
P3 → P6, P7
P4 + P5 → P7
P6 → P7 (mock OK until P7)
P7 → P8 → P9 → P10 → P11
```

---

## 5. Sub-Agent Assignments & File Ownership

### Orchestrator (Composer) — ONLY owner

```
package.json
tsconfig.json
next.config.ts
tailwind.config.ts
.env.example
src/lib/session/          # state machine + session store
src/app/api/              # integration API routes
IMPLEMENTATION_PLAN.md
DEMO_READINESS.md         # after Phase 5
```

**Rule:** Sub-agents propose cross-boundary changes; they do not edit orchestrator-owned files.

---

### Sub-agent A — Core Contracts

**Owns:**
```
src/types/
src/schemas/
src/lib/contracts/
demo-data/                  # read fixtures; schema validation only
```

**Tasks:**
1. Zod schemas for all critical objects
2. Inferred TypeScript types exported from schemas
3. Contract tests validating demo-data fixtures parse correctly
4. `RelayContext`, `AgentResult`, session events

**Critical objects:** `RelaySession`, `Observation`, `UserIntent`, `TaskState`, `AgentCapability`, `AgentRequest`, `AgentResult`, `ActionProposal`, `ProofRequirement`, `VerificationResult`, `CountersignDecision`, `ActionReceipt`

**Must NOT touch:** UI, agents, countersign logic, API routes

---

### Sub-agent B — Agent Runtime

**Owns:**
```
src/lib/agents/
src/lib/router/
```

**Tasks:**
1. `AgentAdapter` interface
2. `OpenAIAdapter` — REAL (server-side)
3. `HermesAdapter`, `OriAdapter`, `PaceAdapter` — mock/unavailable stubs
4. Capability router with scoring: capability match, privacy, multimodal, tools, latency, cost, availability, reliability
5. `normalize(result)` on every adapter
6. Registry loaded from `demo-data/agent_registry.json`

**Must NOT touch:** UI, COUNTERSIGN, tools, schemas (import only)

---

### Sub-agent C — COUNTERSIGN + Tools

**Owns:**
```
src/lib/countersign/
src/lib/tools/
src/lib/policy/
```

**Tasks:**
1. Deterministic tier classification (T0–T3) from `demo-data/action_policy.json`
2. Proof obligation checks (destination, source, sensitive fields, contradictions)
3. Structured verdict: `{ verdict, action, recipient, purpose, dataShared, evidence, unresolved, explanation }`
4. Tools: `explainForm`, `readDocument`, `addReminder`, `uploadInsurance`, `submitRegistration`, `sendMoney` (T3 block)
5. Synthetic clinic form tool with deliberate back-of-card error
6. Calendar tool for appointment receipt

**Must NOT touch:** UI, agent adapters, schemas (import only)

---

### Sub-agent D — App Implementation

**Owns:**
```
src/app/                    # pages only (not api/)
src/components/
src/styles/
public/
```

**Tasks:**
1. Home (Talk / Show / Stay With Me / Watching)
2. Active Stay With Me session (indicator, End, task card, Pause/Explain/Stop)
3. Guided Task (one-question-at-a-time)
4. Camera Capture (preview, capture, result)
5. COUNTERSIGN confirmation card
6. Receipt with expandable "What RELAY did" audit trail
7. Demo/debug panel (when `NEXT_PUBLIC_DEMO_MODE=true`)
8. No provider names in primary UI — "I'm checking this" not "GPT-5"

**Design source:** `/docs/product/02_UI_UX_SPEC.md` until Astra exports land in `/design`. Match spec faithfully; do not invent flows.

**Must NOT touch:** lib/, schemas/, tests/, package.json

---

### Sub-agent E — QA / Adversarial Testing

**Owns:**
```
tests/
scripts/
QA_REPORT.md
```

**Tasks:** Break RELAY. Test happy path + 18 edge cases listed in orchestrator brief. No feature additions.

**Must NOT touch:** src/ (except importing public APIs)

---

## 6. Integration Order (Orchestrator, Phase 3)

```
Step 1: POST /api/sessions          → create session, return sessionId
Step 2: POST /api/sessions/:id/observe → add QR/voice/image observation
Step 3: POST /api/sessions/:id/interpret → intent + task detection (router)
Step 4: GET  /api/sessions/:id/state → current task, questions, status
Step 5: POST /api/sessions/:id/answer → user answer to guided question
Step 6: POST /api/sessions/:id/capture → insurance image upload
Step 7: POST /api/actions/propose     → agent proposes submit action
Step 8: POST /api/actions/:id/evaluate → COUNTERSIGN verdict
Step 9: POST /api/actions/:id/confirm  → user explicit approval
Step 10: POST /api/actions/:id/execute → synthetic submit + receipt
Step 11: GET  /api/receipts/:id       → receipt + audit trail
```

Wire UI to these routes incrementally. Mock responses allowed in UI until Step N lands.

---

## 7. Test Gates

| Gate | When | Criteria |
|------|------|----------|
| **G1 — Contracts** | After P2 | All demo-data fixtures parse; schema tests green |
| **G2 — Unit** | After P4+P5 | Router scoring, tier classification, proof checks pass unit tests |
| **G3 — Integration** | After P7 | API route chain completes clinic scenario in script |
| **G4 — E2E demo** | After P8 | Full UI path passes 3 consecutive runs |
| **G5 — Adversarial** | After P9 | QA_REPORT.md documents all cases; demo-breaking = FAIL |
| **G6 — Freeze** | After P11 | DEMO_READINESS.md all stages PASS |

---

## 8. MVP Cut Line vs Stretch

### MVP (must ship)

- Home + Stay With Me + Guided Task + Camera + COUNTERSIGN + Receipt
- OpenAI adapter (real)
- Mock Hermes/Ori/Pace (unavailable status)
- Clinic registration demo end-to-end
- Demo mode + debug panel
- Insurance back-of-card error recovery
- Expandable receipt audit trail

### Stretch (only after G4 passes)

- Talk (voice STT) as input modality
- Show (standalone camera without session)
- Watching (event rules UI, mocked)
- TTS read-aloud
- Secondary scenario (suspicious payment message)
- Trigger.dev async waits
- Second live agent adapter

---

## 9. Stay With Me State Machine

```
IDLE
 ↓ user explicitly starts
ACTIVE_SESSION
 ↓
OBSERVE ──→ (QR scan, voice, camera input)
 ↓
INTERPRET ──→ (intent + task detection via router)
 ↓
ASSIST ──→ (guided questions, document capture)
 ↙       ↘
WAIT     ACTION_PROPOSED
             ↓
         COUNTERSIGN
         ↙    ↓    ↘
      ACT   ASK   HOLD
         ↓
       OBSERVE (outcome)
         ↓
     TASK_COMPLETE
         ↓
         IDLE
```

UI **always** shows when `ACTIVE_SESSION` is active. User can Stop/Cancel at any point → immediate transition to IDLE, pending actions cancelled.

---

## 10. COUNTERSIGN Tier Map (Demo)

| Action | Tier | Default |
|--------|------|---------|
| explain form | T0 | auto |
| read document | T0 | auto |
| add reminder | T1 | auto if policy allows |
| upload insurance | T2 | confirm |
| submit registration | T2 | confirm + show sensitive fields |
| send money | T3 | hold / strong confirmation |

Verdict schema:
```typescript
{
  verdict: "allow" | "confirm" | "hold" | "deny";
  action: string;
  recipient: string;
  purpose: string;
  dataShared: string[];
  evidence: string[];
  unresolved: string[];
  explanation: string;
}
```

No free-form "AI approves AI."

---

## 11. Design Handoff (Astra → Cursor)

```
Astra: design interaction → export specs/tokens/screens → /design/
Cursor: implement exactly → compare against Astra → polish discrepancies only
```

**Current status:** `/design/` not yet present. Sub-agent D implements from `02_UI_UX_SPEC.md` with Tailwind tokens aligned to accessibility requirements (large text, high contrast, 44px+ tap targets). Reconcile when Astra exports arrive.

**Agent invisibility:** No model/provider names in primary flows. Settings/debug may show "Handled by: Document Agent."

---

## 12. Environment & Demo Mode

```bash
# .env.local (server only)
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_DEMO_MODE=true
```

Demo mode behavior:
- Reset synthetic user (Evelyn Brooks) on each session start
- Deterministic appointment slots (slot-1 default)
- Guarantee one validation error (insurance back missing on first upload attempt)
- Block external destructive actions
- Expose debug panel: Observation → intent → agent → proposal → COUNTERSIGN → tool result

---

## 13. Parallel Execution Schedule

| Time | Actor | Work |
|------|-------|------|
| T+0–15 | Orchestrator | Docs read, this plan, scaffold, session skeleton |
| T+15–45 | Sub-agent A | Contracts (blocks others — start immediately after scaffold) |
| T+45–90 | A + B + C + D parallel | Runtime, COUNTERSIGN, UI (mock backend) |
| T+90–120 | Orchestrator | Integration wiring |
| T+120–135 | Orchestrator | First full scenario run |
| T+135–165 | Sub-agent E | Adversarial QA |
| T+165–180 | Orchestrator | Fix demo-breaking only |
| T+180+ | Orchestrator | DEMO_READINESS.md, freeze |

---

## 14. Merge Rules

1. **No overlapping file edits** — ownership table is enforced
2. Sub-agents return summary + file list; orchestrator reviews before merge
3. Cross-boundary needs → issue comment to orchestrator, not direct edit
4. Architecture changes require orchestrator approval
5. No sub-agent may add dependencies to `package.json`

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OpenAI latency stalls demo | Deterministic fallback responses in demo mode |
| Camera permission denied | Mock capture button in demo mode |
| Model output violates schema | Zod parse → graceful error UI |
| Double submission | Idempotent action IDs + executed flag |
| No Astra designs yet | UI/UX spec as interim source |
| Provider outage | Demo mode bypasses live model for scripted path |

---

*Last updated: hackathon build window — Phase 1 in progress*
