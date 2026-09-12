# Builder B — Runtime / Router / COUNTERSIGN / Actions

## Mission
Own system behavior behind the UI.

## Must deliver
1. session state
2. intent/task extraction
3. one live model integration
4. agent registry/router
5. deterministic demo tool calls
6. COUNTERSIGN risk policy
7. action execution
8. receipt

## Build order

### 1. One state machine
```text
START
 -> UNDERSTAND_TASK
 -> COLLECT_MISSING
 -> PREPARE_ACTION
 -> COUNTERSIGN
 -> WAIT_CONFIRMATION
 -> EXECUTE
 -> RECEIPT
```

Prefer deterministic flow to a generic planner for demo reliability.

### 2. Model integration
Use one real multimodal/LLM provider for:
- transcript interpretation
- image/document understanding
- natural-language responses

Constrain output to schemas.

### 3. Agent router
For demo:
- real `default-agent`
- mock `research-agent`
- optional second real provider only after core works

### 4. Demo tools
Implement:
- `lookup_profile`
- `open_demo_form`
- `extract_document`
- `fill_form`
- `submit_form`
- `create_calendar_event`

### 5. COUNTERSIGN
Hard-code policy tiers in code first.
Do not outsource all policy to an LLM.

### 6. Receipt
Store JSON + return human-readable summary.

### 7. Fail safely
If model/tool fails:
- do not guess
- return “I couldn’t verify that yet”
- preserve state

## Contract with Builder A
Return normalized state from Builder A runbook.

## Priority
Reliability > generality.
One complete workflow beats five partial providers.
