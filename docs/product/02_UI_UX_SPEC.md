# UI / UX Specification

## Goal
The interface should feel like a **simple assistive layer**, not an AI cockpit.

## Primary screens

### 1 — Home
Four large actions:
- **Talk**
- **Show**
- **Stay with me**
- **Watching**

Secondary:
- Activity
- Connections
- Preferences

Do not show model names, token counts, traces, or technical controls.

### 2 — Active “Stay with me”
Show:
- visible microphone/session indicator
- `End session`
- task card
- current step
- optional transcript drawer
- “What I’m doing”
- Pause / Explain / Stop

### 3 — Camera / Show
- camera preview
- capture
- optional crop
- “What should I help with?”
- analysis result
- next action

### 4 — One-question-at-a-time form
Instead of mirroring a 20-field form:
> I already have 12 of 18 fields. I need six things from you.

### 5 — COUNTERSIGN confirmation
**Ready to submit**
This will share:
- full name
- date of birth
- phone number
- insurance card image

With:
- Demo Clinic

Buttons:
- **Submit**
- **Review**
- **Cancel**

### 6 — Receipt
> Done.
> Registration submitted.
> Confirmation: DEMO-48291
> Appointment: Sep 18, 2:30 PM
> Added to calendar.

### 7 — Watching
Only explicit watches, each showing:
- monitored source
- trigger condition
- permitted action

### 8 — Preferences
Plain-language settings:
- read important information aloud
- use larger text
- ask one question at a time
- prefer step-free directions
- never send money automatically
- ask before sharing documents
- language

## Accessibility requirements
- strong contrast
- keyboard operable
- screen-reader labels
- large tap targets
- voice path for primary actions
- no color-only state
- errors in human language
- no hidden timed interactions

## Hackathon visual priorities
Polish only:
1. Home
2. Active session
3. COUNTERSIGN
4. Receipt
