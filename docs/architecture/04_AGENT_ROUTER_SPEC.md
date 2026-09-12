# Agent-Agnostic Router Specification

## Objective
The user never chooses Hermes, Ori, Pace, OpenAI, Claude, Gemini, or another provider. RELAY chooses based on capabilities and policy.

## Agent registry model
Each registered agent exposes:
```json
{
  "id": "agent-id",
  "display_name": "Agent",
  "capabilities": ["research", "vision", "forms", "coding"],
  "modalities": ["text", "image"],
  "tools_supported": true,
  "privacy_class": "cloud",
  "latency_class": "fast",
  "cost_class": "medium",
  "risk_allowed": ["tier0", "tier1"],
  "adapter_status": "live"
}
```

## Router inputs
- task type
- required modalities
- context size
- latency target
- cost preference
- privacy requirement
- tool requirements
- action risk
- provider availability
- prior success

## Router output
```json
{
  "primary_agent": "openai-default",
  "fallback_agents": ["hermes", "ori"],
  "reason_code": "vision+form+tool",
  "max_runtime_seconds": 20
}
```

## Routing policy
1. Capability fit
2. Privacy constraint
3. Risk permission
4. Latency/cost
5. Provider diversity as fallback

Do not use “multiple agents vote” as truth. Correlated errors remain possible.

## Adapter contract
Every provider adapter implements:
- `health()`
- `capabilities()`
- `run(task, context, tools)`
- `cancel(run_id)`
- `normalize(result)`

Normalized result:
```json
{
  "status": "complete",
  "summary": "string",
  "facts": [],
  "uncertainties": [],
  "proposed_actions": [],
  "artifacts": [],
  "citations": [],
  "metadata": {}
}
```

## Hackathon implementation
Implement:
- 1 real default agent
- 1 mock alternative agent
- registry + routing logic

Connect a second live agent only if core demo is already reliable.

## Provider caution
Hermes / Ori / Pace are adapter targets only if real supported APIs are available. Do not fabricate endpoints. A mock adapter is better than a fake integration.
