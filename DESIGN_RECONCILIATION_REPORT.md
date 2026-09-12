# Design Reconciliation Report

> **Source:** `RELAY_Integration_Package.zip` (reference only)  
> **Target:** `relay-agents-everywhere` (authoritative Next.js implementation)  
> **Pass type:** Visual / product polish — no architecture changes

---

## What changed

### Design tokens (`src/app/globals.css`)
- Adopted warm **paper** (`#f7f6f2`), **charcoal** primary (`#252a25`), **sage** accent (`#e9ece2`), **olive** secondary (`#657255`), **error** (`#90442d`)
- Editorial **Georgia serif** headings; Arial/Helvetica body at 18px
- Focus ring: `3px solid #8b643d`, offset 4px
- Card radius 16px; control radius 8px; 48px minimum tap targets preserved

### Copy centralization (`src/lib/copy.ts`)
- Reconciled hero-path strings from package `UI_COPY.md`
- Home, session, guided questions, capture, COUNTERSIGN, receipt, network messages

### Components updated (visual + copy only)
| Component | Changes |
|-----------|---------|
| `HomeScreen` | “A little help. A lighter day.”, Evelyn greeting, sage Stay with me card |
| `ActiveSessionBar` | Charcoal bar, “Here with you” / “Take your time” |
| `TaskCard` | Serif title, sage tint, muted step label |
| `QuestionCard` | Contextual hints per question; boolean option copy |
| `CameraCapture` | Package headings; local-only notice; permission-denied copy |
| `CountersignCard` | “Ready to submit.”, “Not yet”, “Edit details” |
| `ReceiptCard` | “You're done.”, olive success styling |
| `SessionShell` | Offline banner when `navigator.onLine === false` |
| `Notice` | New shared error/warning/offline surface |
| Session pages | Editorial headings from COPY |

### Reference docs added
- `design/DESIGN_SYSTEM.md` — copied from package for ongoing reference
- `design/UI_COPY.md` — copied from package
- `INTEGRATION_PACKAGE_REVIEW.md` — full A/B/C/D classification

---

## What was intentionally ignored

| Package element | Reason |
|-----------------|--------|
| Python `relay/service.py` state machine | Duplicate of TS session store |
| SQLite persistence | Architecture frozen — in-memory demo |
| `countersign/core.py` + server | TS COUNTERSIGN already deterministic |
| `/api/relay/*` endpoints | Next.js `/api/sessions/*` authoritative |
| `web/relay/app.js` (46KB vanilla app) | Reference for copy/states only |
| Hash-route SPA navigation | Next.js App Router |
| Appointment slot picker UI | Demo auto-selects slot-1 for reliability |
| Activity / Connections / Preferences screens | Out of hero path; footer links remain disabled |
| Desktop charcoal sidebar shell | Mobile-first demo priority |
| Payload SHA-256 approval tokens | Existing confirm flow sufficient |
| `web/relay/icons.js` SVG set | Deferred; no blocker for demo |
| Talk / Show / Watching functionality | Remain visually present, disabled |

---

## Deviations from Astra / package design

| Item | Deviation | Rationale |
|------|-----------|-----------|
| Recipient name | Package UI_COPY says “Example Health Clinic”; fixtures use **Demo Clinic** | Fixtures authoritative |
| Desktop sidebar | Not implemented | Hackathon demo is mobile-first |
| Five-step progress checklist | Not implemented | Would add UI complexity; task card sufficient |
| Appointment selection step | Auto slot-1 | Demo reliability per DEMO_READINESS |
| ICS calendar export | “Added to calendar” text only | No fake external sync |
| Inline SVG icon system | Unicode/emoji in Notice | Icons deferred to post-demo polish |
| Large-text preference toggle | CSS supports scale; no Preferences screen | Preferences out of scope |
| “Read this aloud” on confirmation | Not implemented | TTS stretch feature |

---

## Remaining visual inconsistencies

1. **No desktop rail** — package shows 238px charcoal sidebar above 1100px
2. **Action cards** — package uses icon tile + arrow; we use text-only cards
3. **Capture framing corners** — package has decorative frame corners; we use plain preview
4. **Wordmark** — package has serif RELAY mark with superscript; we use heading text
5. **Secondary screens** — Activity, Connections, Preferences, Watching not styled as full pages

These are acceptable for demo freeze; address only if time permits without workflow changes.

---

## Architecture preserved (verified)

- Next.js App Router + TypeScript strict
- `/api/sessions/*`, `/api/actions/*` unchanged
- `src/lib/session/store.ts` state machine unchanged
- `src/lib/countersign/`, `src/lib/router/`, `src/lib/agents/` unchanged
- `demo-data/*.json` unchanged (byte-identical to package fixtures)

---

## Test results

```
Test Files  5 passed (5)
     Tests  67 passed (67)
```

| Suite | Tests | Result |
|-------|-------|--------|
| contracts/demo-data | 9 | PASS |
| countersign/evaluate | 12 | PASS |
| agents/router | 13 | PASS |
| integration/demo-path | 2 | PASS (×5 consecutive) |
| adversarial/qa-scenarios | 31 | PASS |

```
npm run typecheck  — PASS
npm run build      — PASS (all app + API routes)
```

---

## Conclusion

Integration package successfully reconciled as **design and copy reference**. No runtime architecture adopted. Clinic demo path remains fully functional with improved warm paper / charcoal / sage visual language and editorial UX copy.

**Feature freeze remains in effect.**
