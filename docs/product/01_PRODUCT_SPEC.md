# RELAY Product Specification

## Target user
RELAY is not “for old people.” It is for anyone who benefits from a simpler, more accessible, context-aware way to interact with digital and physical workflows.

Potential users:
- older adults who prefer voice or simplified interaction
- people with low vision
- people with motor constraints
- people with temporary injuries
- people who find multi-step/app-switching workflows difficult
- people with low digital confidence
- multilingual users
- caregivers/family members operating under explicit delegation

## Jobs to be done
1. **Understand** — “What does this say / mean?”
2. **Navigate** — “Where do I go / what do I press?”
3. **Complete** — “Can you help me finish this?”
4. **Remember** — “What did they say I need to do?”
5. **Recover** — “This route/form/appointment stopped working; what now?”
6. **Protect control** — “Do not submit/share/pay until I explicitly approve.”

## Four interaction modes
### ASK
User intentionally asks for help.
### SHOW
User points camera, uploads screenshot/image/QR/document.
### STAY WITH ME
User explicitly begins a temporary active session during a real-world interaction.
### WATCH FOR THIS
User explicitly connects an event source and defines a watch condition.

This is **event-driven**, not ambient surveillance.

## Core loop
Environment → Observations → Intent → Context → Agent routing → Proposed action → COUNTERSIGN → Human decision if needed → Execute → Observe outcome → Receipt

## UX rules
- one question at a time by default
- large tap targets
- voice-first option
- screen-reader friendly
- simple language
- never require model selection
- distinguish facts, assumptions, unresolved questions
- always show what will happen before consequential actions
- user can say “stop,” “pause,” “don’t do that,” or “explain”

## What makes RELAY agentic
It can inspect context, identify missing information, call specialist agents, use tools, prepare actions, wait for confirmation, execute allowed actions, observe outcomes, and follow up later.

## Demo success
A judge should understand within 20 seconds:
- who the user is
- where the agent lives
- what phone/environment context matters
- what RELAY does
- why the user remains in control
