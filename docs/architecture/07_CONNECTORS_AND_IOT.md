# Connectors and IoT Extension Plan

## Phone first
The hackathon product should work using:
- microphone
- camera
- browser
- uploaded images/documents
- optional location

## “Always available,” not “always recording”
General mobile apps should not be designed as invisible always-on microphones. Use explicit sessions and event-driven connectors.

## Connector classes
### Communication
- WhatsApp Business contact
- SMS gateway
- email
- Slack/Teams later

WhatsApp principle:
Users explicitly message or forward content to RELAY. Do not assume access to a user's entire private chat history.

### Calendar / contacts
- appointments
- reminders
- trusted people

### Smart home / IoT
- leak sensor
- smart valve
- door/lock
- Ring-like event
- building elevator/BAS event

## Event pattern
```text
sensor/event source
 -> rule/filter
 -> relevant event
 -> RELAY
 -> context reasoning
 -> COUNTERSIGN if action
```

Do not stream raw telemetry continuously into an LLM.

## Example future scenario: leak
Inputs:
- leak sensor = wet
- water flow elevated
- user away
- smart valve connected

RELAY:
> “A kitchen leak sensor triggered and water use increased. I can close the valve and notify your trusted contact.”

If pre-authorized:
- close valve
- observe flow drop
- issue receipt

## Example future scenario: camera/community
- reduce duplicate noise
- summarize incident-level state
- avoid identifying/labeling strangers as dangerous
- no autonomous law-enforcement escalation in MVP

## Wearable extension
Use:
- user-initiated gesture/button
- accessibility shortcut
- activity context
- notifications

Avoid:
- health diagnosis
- covert behavioral monitoring
