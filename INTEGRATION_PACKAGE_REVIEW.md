# Integration Package Review

> **Package:** `RELAY_Integration_Package.zip`  
> **Authoritative codebase:** `relay-agents-everywhere` (Next.js / TypeScript)  
> **Review date:** Hackathon build window  
> **Rule:** Package is reference material only. No runtime architecture adoption.

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| **A — Design** | 12 elements | Adopt / reconcile visually |
| **B — Product behavior** | 14 elements | Compare; adopt UX improvements without architecture change |
| **C — Demo data / copy** | 10 elements | Reuse copy; fixtures already identical |
| **D — Implementation** | 11 elements | Ignore (reference only) |

---

## Element-by-element classification

### Documentation

| Package element | Category | Current equivalent | Adopt / Adapt / Ignore | Reason | Files potentially affected |
|-----------------|----------|------------------|------------------------|--------|---------------------------|
| `docs/DESIGN_SYSTEM.md` | **A** | `src/app/globals.css`, component Tailwind classes | **Adopt** | Authoritative warm paper / charcoal / sage tokens, typography, spacing, component contracts | `globals.css`, all `src/components/*` |
| `docs/UI_COPY.md` | **A + C** | Hardcoded strings in components + `useSessionFlow.ts` | **Adopt** | Editorial headings, human-language errors, COUNTERSIGN/receipt copy | `HomeScreen`, `QuestionCard`, `CountersignCard`, `ReceiptCard`, `useSessionFlow`, session pages |
| `docs/INTEGRATION_GUIDE.md` | **D** | `IMPLEMENTATION_PLAN.md`, existing API routes | **Ignore** | Describes Python `/api/relay` stack; our routes are Next.js `/api/sessions/*` | — |
| `docs/COUNTERSIGN_BASE.md` | **D** | `src/lib/countersign/`, `docs/architecture/05_COUNTERSIGN_SPEC.md` | **Ignore** | Python workbench; we have deterministic TS COUNTERSIGN | — |
| `README.md` (package) | **D** | Repo `README.md` | **Ignore** | Describes Python server startup | — |
| `PROVENANCE.md` (package) | **C** | `PREBUILD_PROVENANCE.md` | **Ignore** | Already documented in authoritative repo | — |

### Visual / CSS

| Package element | Category | Current equivalent | Adopt / Adapt / Ignore | Reason | Files potentially affected |
|-----------------|----------|------------------|------------------------|--------|---------------------------|
| `web/relay/styles.css` — color tokens | **A** | `--relay-*` in `globals.css` | **Adopt** | Paper `#f7f6f2`, charcoal `#252a25`, sage `#e9ece2`, olive `#657255`, error `#90442d` | `globals.css` |
| `styles.css` — typography | **A** | System sans only | **Adopt** | Georgia serif headings, 18px body, editorial scale | `globals.css`, component heading classes |
| `styles.css` — spacing / radius | **A** | Tailwind defaults | **Adapt** | 16px card radius, 8px control radius, 48px min targets (already met) | `globals.css`, components |
| `styles.css` — focus ring | **A** | Blue outline | **Adopt** | `3px solid #8b643d`, offset 4px | `globals.css` |
| `styles.css` — responsive shell | **A** | Mobile-first single column | **Adapt** | Desktop rail deferred; mobile patterns align | Future stretch |
| `web/relay/icons.js` | **A** | Unicode/emoji placeholders | **Adapt** | Inline SVG icons optional; not blocking demo | `src/components/` (optional) |
| `web/countersign.html` | **D** | `CountersignCard.tsx` | **Ignore** | Standalone workbench UI | — |

### Product behavior (from DESIGN_SYSTEM + app.js)

| Package element | Category | Current equivalent | Adopt / Adapt / Ignore | Reason | Files potentially affected |
|-----------------|----------|------------------|------------------------|--------|---------------------------|
| Stay With Me — explicit session indicator | **B** | `ActiveSessionBar.tsx` | **Adapt** | Add paused/stopped copy; charcoal bar styling | `ActiveSessionBar.tsx` |
| Pause / Stop always visible | **B** | `SessionControls.tsx` | **Adapt** | Already present; align labels (“Take your time” paused state) | `SessionControls`, session pages |
| One question at a time | **B** | `QuestionCard.tsx` | **Adapt** | Add contextual explanation per question from UI_COPY | `QuestionCard.tsx`, guided page |
| Guided validation recovery | **B** | `captureInsurance` + capture page | **Adapt** | “Let’s get the other side” copy on back-card error | `CameraCapture`, `useSessionFlow` |
| COUNTERSIGN — all fields enumerated | **B** | `CountersignCard.tsx` | **Adapt** | Add supporting copy; “Not yet” label; no collapsed surprises | `CountersignCard.tsx` |
| Receipt + “What RELAY did” | **B** | `ReceiptCard.tsx` | **Adapt** | “You’re done.” heading; audit trail already exists | `ReceiptCard.tsx` |
| Listening state (mic on) | **B** | Not implemented | **Ignore** | Talk not functional; no fabricated listening UI | — |
| Appointment slot choice (3 slots) | **B** | Auto-select slot-1 in demo | **Ignore** | Would add flow step; demo auto-picks deterministic slot | — |
| Review revalidation on edit | **B** | `reviewSubmit` returns to guided | **Adapt** | Existing behavior sufficient for demo | — |
| Offline banner | **B** | None | **Adapt** | Add lightweight offline notice in session shell | `SessionShell.tsx`, `apiFetch` |
| Network error copy | **B** | Generic errors | **Adopt** | Package copy stronger | `useSessionFlow.ts` |
| Timeout handling | **B** | None | **Ignore** | Would need fetch timeout wrapper; defer unless trivial | — |
| Payload hash approval binding | **B** | `userConfirmed` flag | **Ignore** | Package uses SHA-256 tokens; our TS COUNTERSIGN sufficient for demo | — |
| Activity / Connections / Preferences screens | **B** | Disabled footer links | **Ignore** | Out of hero path; visually present only | — |

### Demo data / fixtures

| Package element | Category | Current equivalent | Adopt / Adapt / Ignore | Reason | Files potentially affected |
|-----------------|----------|------------------|------------------------|--------|---------------------------|
| `relay/fixtures/*.json` (8 files) | **C** | `demo-data/*.json` | **Ignore** | Byte-identical to current fixtures | — |
| Clinic deliberate error message | **C** | `clinic_form.json` + session store | **Adapt** | Copy already matches; UI surfacing improved | `useSessionFlow`, capture UI |
| Confirmation field list | **C** | COUNTERSIGN sensitive fields | **Adapt** | Expand display labels to match package enumeration | `CountersignCard`, store |
| User name “Evelyn” greeting | **C** | Generic home copy | **Adopt** | “Hello, Evelyn.” on home | `HomeScreen.tsx` |
| Recipient “Example Health Clinic” vs “Demo Clinic” | **C** | `Demo Clinic` in fixtures | **Ignore** | Fixture says Demo Clinic; keep fixture authoritative | — |

### Implementation (must not adopt)

| Package element | Category | Current equivalent | Adopt / Adapt / Ignore | Reason | Files potentially affected |
|-----------------|----------|------------------|------------------------|--------|---------------------------|
| `relay/service.py` | **D** | `src/lib/session/store.ts` | **Ignore** | Parallel Python state machine + SQLite | — |
| `relay/adapters.py` | **D** | `src/lib/agents/` | **Ignore** | Python adapter protocol; TS adapters exist | — |
| `countersign/core.py` | **D** | `src/lib/countersign/evaluate.ts` | **Ignore** | Duplicate COUNTERSIGN engine | — |
| `countersign/server.py` | **D** | Next.js API routes | **Ignore** | Python HTTP server on :8001 | — |
| `web/relay/app.js` | **D** | React components + `useSessionFlow` | **Ignore** | 46KB vanilla JS app; reference for copy/states only | — |
| `web/relay/api.js` | **D** | `useSessionFlow` fetch calls | **Ignore** | Different API prefix `/api/relay` | — |
| `web/index.html` | **D** | Next.js App Router | **Ignore** | Static entry | — |
| `schemas/*.schema.json` | **D** | `src/schemas/` (Zod) | **Ignore** | Reference schemas; Zod is authoritative | — |
| `tests/test_relay.py`, `test_runtime.py` | **D** | `tests/` (67 vitest) | **Ignore** | Python test suite | — |
| SQLite persistence | **D** | In-memory session store | **Ignore** | Architecture frozen | — |
| Hash-route SPA navigation | **D** | Next.js routes | **Ignore** | Different routing model | — |

---

## Reconciliation plan (post-review)

### Will adopt
1. Design tokens (paper / charcoal / sage / olive / error / focus)
2. Editorial typography (serif headings, 18px body)
3. UI copy from `UI_COPY.md` for hero path screens
4. Interaction state copy (paused, stopped, recovery, offline)
5. COUNTERSIGN presentation polish (supporting sentence, “Not yet”)
6. Receipt heading (“You’re done.”)
7. Copy design docs into `design/` for ongoing Astra reference

### Will not adopt
1. Python runtime, SQLite, `/api/relay` endpoints
2. Duplicate state machine, COUNTERSIGN, or router
3. Appointment picker step (auto slot for demo stability)
4. Activity / Connections / Preferences / Watching functionality
5. Payload hash approval tokens (existing confirm flow sufficient)
6. Desktop sidebar shell (mobile-first demo priority)

### Architecture preserved
- Next.js App Router, TypeScript strict
- `/api/sessions/*`, `/api/actions/*` contracts
- `src/lib/session/store.ts` state machine
- `src/lib/countersign/`, `src/lib/router/`, `src/lib/agents/`
- `demo-data/` fixtures
- 67-test baseline

---

*Review complete. Visual reconciliation may proceed.*
