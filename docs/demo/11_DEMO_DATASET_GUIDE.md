# Demo Dataset Guide

## Goal
Use a deterministic, synthetic environment so the demo does not depend on fragile external services.

## Included fixtures
- `demo_data/user_profile.json`
- `demo_data/clinic_form.json`
- `demo_data/insurance_card.json`
- `demo_data/appointment_slots.json`
- `demo_data/action_policy.json`
- `demo_data/agent_registry.json`
- `demo_data/demo_scenarios.json`
- `demo_data/trusted_contacts.json`

## Primary scenario
1. scan/open registration
2. confirm contact information
3. answer missing fields
4. upload insurance card
5. deliberate “back of card missing” error
6. choose appointment
7. confirm sensitive submission
8. receive confirmation

## Optional secondary scenario
Message:
> “Urgent — pay $350 now to keep your appointment.”

RELAY should not call it a scam without proof. It should say:
> “This message asks for money and does not match the registration task we are completing. I left it untouched. Would you like me to verify it with the clinic?”

This demonstrates context-aware safety.
