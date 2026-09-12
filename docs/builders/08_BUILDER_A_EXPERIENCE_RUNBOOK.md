# Builder A — Experience / Phone / Multimodal

## Mission
Own everything the user sees and touches. The target is a **flawless two-minute interaction**.

## Must deliver
1. mobile-first home
2. “Stay with me” session
3. voice input
4. camera/photo input
5. task-state display
6. one-question-at-a-time interaction
7. COUNTERSIGN confirmation card
8. success receipt

## Build order
### 1. Scaffold
- Next.js
- Tailwind
- responsive mobile layout

### 2. Static flow first
Make the demo clickable with fixture data before wiring agents.

Routes:
- `/`
- `/session`
- `/session/capture`
- `/session/review`
- `/receipt`

### 3. Microphone
Use visible user-initiated recording control.
Never hide recording state.

### 4. Camera
Capture photo and send to Builder B observation endpoint.

### 5. Live task state
Consume:
- recognized goal
- current step
- unresolved question
- proposed action

### 6. COUNTERSIGN UI
Render risk-tier response clearly.

### 7. Accessibility
- large text mode
- labeled controls
- no color-only signals
- keyboard support
- browser zoom
- optional speech output

## Contract with Builder B
Send:
```json
{
  "session_id": "...",
  "observation_type": "voice|image|text",
  "content": "..."
}
```

Receive:
```json
{
  "task": "...",
  "assistant_message": "...",
  "next_input": "voice|camera|choice|confirm",
  "choices": [],
  "action_proposal": null,
  "receipt": null
}
```

## Do not work on
- provider integrations
- policy engine internals
- connector framework
unless Builder B asks.

## Definition of done
A non-technical person can complete the demo without explanation from the team.
