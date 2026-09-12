# API and Data Models

## UserProfile
```json
{
  "user_id": "demo-user",
  "display_name": "Evelyn",
  "preferences": {
    "large_text": true,
    "voice_first": true,
    "one_question_at_a_time": true,
    "language": "en",
    "step_free_preferred": true
  },
  "action_policy": {
    "send_messages": "ask",
    "share_documents": "ask",
    "submit_forms": "ask",
    "money_transfer": "never_auto"
  }
}
```

## Session
```json
{
  "session_id": "s_001",
  "mode": "stay_with_me",
  "status": "active",
  "started_at": "timestamp",
  "task_id": "t_001"
}
```

## Observation
```json
{
  "type": "voice|image|document|screen|event",
  "source": "phone",
  "content_ref": "...",
  "timestamp": "..."
}
```

## Task
```json
{
  "task_id": "t_001",
  "goal": "Complete clinic registration",
  "status": "in_progress",
  "known_fields": {},
  "unresolved_fields": [],
  "dependencies": []
}
```

## DecisionReceipt
```json
{
  "receipt_id": "r_001",
  "action_id": "a_001",
  "verdict": "ALLOW",
  "confirmed_by_user": true,
  "result": "success",
  "confirmation_code": "DEMO-48291"
}
```

## Suggested routes
### Sessions
- `POST /api/sessions`
- `POST /api/sessions/:id/observations`
- `POST /api/sessions/:id/end`

### Task understanding
- `POST /api/intent/resolve`
- `POST /api/tasks/:id/plan`

### Agent routing
- `POST /api/router/dispatch`
- `GET /api/agents`

### Actions
- `POST /api/actions/propose`
- `POST /api/actions/:id/evaluate`
- `POST /api/actions/:id/confirm`
- `POST /api/actions/:id/execute`

### Receipts
- `GET /api/receipts`
- `GET /api/receipts/:id`

### Watch rules
- `GET /api/watches`
- `POST /api/watches`
- `PATCH /api/watches/:id`

Use polling/SSE before WebSockets unless streaming truly matters.
