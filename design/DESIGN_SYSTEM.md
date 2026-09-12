# RELAY design system

RELAY is a functional product interface, not a marketing page or chat dashboard. Its aesthetic uses editorial typography, warm paper, charcoal navigation, quiet sage accents, restrained borders, and generous negative space. The reference is the refinement of Harvey, not its branding or legal workflow. All artwork is lightweight, original inline SVG/CSS; there are no external font, analytics, or image requests.

## Screen inventory

| Screen | Route / state | Main action | Important behavior |
| --- | --- | --- | --- |
| Home | `#/home` | Talk, Show, Stay with me, Watching | Four large, fully clickable action cards. Saved work appears below. |
| Talk | `#/talk` | Microphone or typed goal | Typed clinic requests go through the backend adapter router. Unsupported tasks explain the demo scope. |
| Show | `#/show` | Camera or image selection | Actual local preview; no upload. Sample clinic workflow is a separate action. |
| Active session | `#/session/{id}` / understand | Let’s begin | Session status, Pause and Stop are explicit. Microphone is off by default. |
| Guided questions | dob, contact, reason, sms | Continue / one choice | One question at a time. Native date validation and server validation. Contextual explanation drawer. |
| Document capture | front, back | Use demo card/back | Visible sample card, camera frame, file selection, retake. Real images are not treated as extracted evidence. |
| Validation recovery | validation | Capture the back | Human-language explanation of a simulated missing-side error. Nothing submitted. |
| Appointment choice | slot | Choose time | Three fixture slots; accessibility facts are explicit. |
| Review | review | Submit / Not yet | All 12 fields enumerated, exact recipient and purpose, edit controls. Revalidation on submit. |
| Completion | `#/receipt/{id}` | Remind me before this | Persistent receipt and confirmation. Calendar-file / JSON export. No invented calendar sync. |
| Watching | `#/watching` | Check now / pause | Source, reason, condition, allowed action, last checked. Empty by default. |
| Activity | `#/activity` | Continue / View receipt | Persistent incomplete sessions and completed receipts. |
| Connections | `#/connections` | Connection details | Honest demo/local/export/unconnected status. No fake Connect success. |
| Preferences | `#/preferences` | Labeled switches | Persistent settings; larger text, voice emphasis, decision reading emphasis, quiet UI, step-free preference. Language saved for future agents. |
| Permissions | `#/permissions` | Review boundaries | Explain / ask first / never automatically. The MVP has no money or contract execution route. |

## Tokens

Source of truth: `web/relay/styles.css`.

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#f7f6f2` | Main canvas |
| `--white` | `#fdfcfa` | Cards and dialog surfaces |
| `--ink` | `#272a26` | Primary text |
| `--muted` | `#686b62` | Supporting copy |
| `--line` | `#dddfd5` | Structural dividers, not sole control indicators |
| `--dark` | `#252a25` | Sidebar and primary action |
| `--olive` | `#657255` | Secondary emphasis |
| `--sage` | `#e9ece2` | Stay with me surface |
| `--error` | `#90442d` | Plain-language failures, always accompanied by text |
| `--radius` | `16px` | Main cards |
| Control radius | `8px` | Buttons, inputs |
| Focus | `3px solid #8b643d`, offset 4px | Interactive keyboard focus |

## Typography and spacing

- Editorial: Georgia, Times New Roman, serif; no font download required.
- Interface: Arial, Helvetica, sans-serif.
- Desktop title: fluid 38–58px, 1.12 line height, regular weight.
- Mobile title: 42px. Workflow headings: 32px. Receipt: 49px.
- Mobile body and action descriptions: 18px. Mobile buttons: 16px; choices: 18px.
- Secondary explanation: 14–16px. Metadata only: 10–13px.
- Larger text preference promotes paragraph, button, and choice text to 20px and home to a single column.
- Spacing rhythm: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px; optical adjustments for borders and icon alignment.
- Inputs and action buttons are at least 48px high. Mobile navigation targets are at least 55×53px. Arrows inside cards are decoration; the entire card is the target.

## Component inventory

| Component | Visual / behavior contract |
| --- | --- |
| Shell | Persistent charcoal desktop rail; mobile header and safe-area bottom navigation. |
| Page head | Eyebrow, editorial H1, short supporting sentence; focus announced after route change. |
| Action card | Icon tile, short verb-led title, description, directional arrow. No nested buttons. |
| Primary button | Charcoal fill, light text, explicit verb. Loading state blocks duplicate interaction. |
| Secondary button | Bordered, same touch size. Used for cancel, review, export. |
| Session bar | Text plus icon for active, paused, or microphone-on status; Pause and Stop remain present. |
| Progress | Five task groups, numeric accessible progress bar, desktop checklist. |
| Question | One labeled input or choice set, validation message, optional explanation. |
| Capture frame | Preview region, framing corners, image description, explicit capture/retake controls. |
| Review summary | Recipient, purpose, all shared fields. No collapsed sensitive-field surprise. |
| Receipt | Success mark, date/time, clinic, unique code, action summary, optional follow-up. |
| Switch | Native button with `role=switch`, `aria-checked`, accessible label, 48px target. |
| Notice | Icon plus text; success, warning, and error surfaces never rely on color alone. |
| Dialog | Native modal, titled, Escape close, visible close button, browser focus containment. |
| Toast | Polite live announcement; important errors also remain inline. |
| Connection card | Status, purpose, honest capability detail. Provider names stay out of home/workflow. |

## Interaction states

| State | Copy / rendering | Behavior |
| --- | --- | --- |
| Default | “Ready when you need me” | No sensors activated. |
| Listening | “Microphone on · local only” | Appears only after actual getUserMedia success; red dot + text + mic icon. No transcription is fabricated. |
| Thinking | Top progress line, `aria-busy=true` | Request in progress. Fetch timeout is 15 seconds. No simulated successful outcome. |
| Waiting for user | One question / enabled choices | No timed decision, no automatic submission. |
| Action ready | “Ready to submit.” | Exact review loaded from server; approval bound to payload hash and version. |
| Warning | “Let’s get the other side.” | Preserve prior information; ask for missing evidence. |
| Error | Inline `role=alert` and plain language | Preserve saved state, no unauthorized write. Retry supported. |
| Success | “You’re done.” | Only after destination write and receipt commit. |
| Offline | “You’re offline. Reconnect to continue.” | Banner plus actual network-error handling; no offline writes claimed. |
| Paused | “Take your time.” | Media tracks stopped; approval invalidated; progress retained. |
| Stopped | “Session ended.” | Terminal session; pending action can no longer execute. |

## Responsive behavior

- Above 1100px: 238px fixed rail, two-column home, workflow + contextual checklist.
- 761–1100px: 205px rail, compact workflow/checklist stack.
- 371–760px: no rail, four-item bottom navigation, 2-column home and single-column workflows. Settings remain in the header.
- At 370px and below: home becomes one column; longer controls wrap. No horizontal scrolling intended.
- At large-text preference: home uses a single column on mobile.
- Reduced-motion media query disables animations/transitions. Quiet preference removes decorative card motion.

## Non-obvious implementation details

1. Hash routes allow direct refresh with a simple local server; session IDs resolve from SQLite. Route changes focus the heading without presenting it as an interactive control.
2. Every user-entered or server-returned string inserted into HTML is escaped. Preview URLs are browser-created Blob URLs. No executable external content is rendered.
3. Images never leave the browser. Capture, retake, route change, and page teardown release object URLs and media tracks. The demo evidence comes only from an explicitly selected synthetic card.
4. Camera/microphone access requires a secure context such as localhost or deployed HTTPS. Sensor tracks stop on Pause, Stop, navigation, tab hiding, and pagehide; late permission responses are discarded after navigation.
5. No microphone recording is retained or uploaded. Animated bars indicate an active microphone, not measured speech recognition. Implement a transcription provider before claiming voice understanding.
6. Local text-to-speech is invoked explicitly, uses a local English voice if available, and explains when unavailable. The reading preference emphasizes the read-aloud control.
7. “Not yet” pauses and invalidates the approval. Editing returns to a relevant question and requires a new payload review.
8. Calendar export produces a standard UTC `.ics` file. It does not claim to have changed an external calendar.
9. Watches are explicit local records, not a background scheduler. A check computes whether the demo appointment is within 24 hours. A paused watch cannot be checked.
10. This is not a WCAG certification. Manual assistive-technology checks, real-device media testing, and a full accessibility audit remain release requirements.

## References

- [Harvey](https://www.harvey.ai/) — requested visual reference; original RELAY identity and product flow.
- [W3C target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) — minimum-size context; RELAY uses larger action targets.
- [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — text contrast thresholds.
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — permission and secure-context behavior.
