# RELAY interface copy

The executable source of truth is the screen renderers in `web/relay/app.js`. The copy below captures the primary product decisions for design/developer handoff.

| Screen | Heading | Supporting copy | Controls |
| --- | --- | --- | --- |
| Home | A little help. A lighter day. | Hello, Evelyn. What can I help you with? | Talk; Show; Stay with me; Watching |
| Talk | I’m here. What’s on your mind? | A question, a task, or a little help finding the next step. | Try microphone; Find the next step |
| Show | Let’s make sense of it. | A photo can be a good place to start. | Open camera; Choose image; Try the clinic example |
| Active session | A little support. Every step of the way. | Your appointment registration, made simpler. | Pause; Stop; Let’s begin; Try microphone |
| Task understanding | Let’s get you registered for your appointment. | I’ll help with the details, one step at a time. You’ll review everything before it’s submitted. | Let’s begin |
| Birth date | What’s your date of birth? | The clinic uses this to match your registration to the right person. | Continue; Use Evelyn’s demo date |
| Contact | Who’s your emergency contact? | Someone the clinic can contact if they need to. | Continue; Use the demo contact |
| Visit | What brings you in? | A simple reason helps the clinic prepare for your visit. | Routine check-up; New patient visit; Follow-up visit |
| Reminders | Would you like text reminders? | You decide whether the demo clinic can send appointment reminders. | Yes, text reminders are helpful; No, thank you |
| Capture | The front of your insurance card. | Keep the whole card in the frame. Use the sample card to continue the demo. | Open camera; Choose image; Use demo card |
| Recovery | Let’s get the other side. | The clinic also needs a photo of the back of your insurance card. | Capture the back |
| Appointment | When would you like to go? | Choose one of the demo clinic’s available appointments. | Available date/time choices |
| Confirmation | Ready to submit. | Take a moment to check. This is exactly what will be shared. | Submit; Not yet; Edit details; Read this aloud |
| Receipt | You’re done. | Your demo registration is complete. Everything is in one place. | Remind me before this; Save to calendar; Save receipt |
| Watching | Only what matters to you. | The things you’ve explicitly asked RELAY to watch. | Check now; View appointment; Watch toggle |
| Empty watching | Nothing watching. Nothing assumed. | When you ask for a reminder after an appointment, it will appear here. | Try a clinic registration |
| Preferences | Your pace. Your preferences. | Small adjustments that make a meaningful difference. | Labeled switches; Preferred language |
| Permissions | Helpful. Never overstepping. | Clear boundaries, so you can move through your day with confidence. | Without asking each time; Ask me first; Never automatically |
| Connections | A little more connected. | Bring the right help into your everyday. You choose what has access. | Connection details; Manage connection |
| Paused | Take your time. | Camera and microphone are off. Your progress is saved. | I’m ready to continue |
| Stopped | Session ended. | Nothing else will be shared. | Back home |

Shared copy: “Ready when you need me”; “Always your choice. Nothing shared without your say.”; “Here with you. On your terms.”

Capture status: “CAMERA ON · LIVE PREVIEW”, “IMAGE PREVIEW · LOCAL ONLY”, “Images stay on this device. Nothing is uploaded.”

Confirmation explicitly lists: full name, date of birth, phone, email, address, emergency contact, language, text reminders, insurance-card front, insurance-card back, visit reason, appointment. Recipient: “Example Health Clinic”; purpose: “Appointment registration”.

Network failure: “We cannot reach RELAY. Check your connection and try again.”

Timeout: “This is taking longer than expected. Your progress is saved. Please try again.”

Changed review: “Your information changed or the review expired. Review it again before submitting.”
