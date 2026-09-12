/** User-facing copy reconciled from integration package UI_COPY.md */

export const COPY = {
  home: {
    eyebrow: "Ready when you need me",
    heading: "A little help. A lighter day.",
    greeting: "Hello, Evelyn. What can I help you with?",
    tagline: "Always your choice. Nothing shared without your say.",
  },
  session: {
    heading: "A little support. Every step of the way.",
    support:
      "Your appointment registration, made simpler.",
    understanding:
      "Let's get you registered for your appointment.",
    understandingDetail:
      "I'll help with the details, one step at a time. You'll review everything before it's submitted.",
    paused: "Take your time.",
    pausedDetail: "Camera and microphone are off. Your progress is saved.",
    stopped: "Session ended.",
    stoppedDetail: "Nothing else will be shared.",
  },
  questions: {
    dob: {
      label: "What's your date of birth?",
      hint: "The clinic uses this to match your registration to the right person.",
    },
    emergency_contact: {
      label: "Who's your emergency contact?",
      hint: "Someone the clinic can contact if they need to.",
    },
    reason_for_visit: {
      label: "What brings you in?",
      hint: "A simple reason helps the clinic prepare for your visit.",
    },
    sms_reminders: {
      label: "Would you like text reminders?",
      hint: "You decide whether the demo clinic can send appointment reminders.",
      options: ["Yes, text reminders are helpful", "No, thank you"],
    },
  },
  capture: {
    front: {
      heading: "The front of your insurance card.",
      hint: "Keep the whole card in the frame. Use the sample card to continue the demo.",
      status: "CAMERA ON · LIVE PREVIEW",
    },
    back: {
      heading: "The back of your insurance card.",
      hint: "Flip your card and keep the whole back in the frame.",
      status: "CAMERA ON · LIVE PREVIEW",
    },
    recovery: {
      heading: "Let's get the other side.",
      hint: "The clinic also needs a photo of the back of your insurance card.",
    },
    permissionDenied:
      "I couldn't access your camera. You can use a demo photo instead.",
    localOnly: "Images stay on this device. Nothing is uploaded.",
  },
  countersign: {
    heading: "Ready to submit.",
    support: "Take a moment to check. This is exactly what will be shared.",
    submit: "Submit",
    notYet: "Not yet",
    review: "Edit details",
  },
  receipt: {
    heading: "You're done.",
    support: "Your demo registration is complete. Everything is in one place.",
    audit: "What RELAY did",
  },
  network: {
    offline: "You're offline. Reconnect to continue.",
    failed: "We cannot reach RELAY. Check your connection and try again.",
    timeout:
      "This is taking longer than expected. Your progress is saved. Please try again.",
  },
} as const;

export function questionHint(questionId: string): string | undefined {
  const q = COPY.questions[questionId as keyof typeof COPY.questions];
  return q && "hint" in q ? q.hint : undefined;
}

export function questionLabel(questionId: string, fallback: string): string {
  const q = COPY.questions[questionId as keyof typeof COPY.questions];
  return q && "label" in q ? q.label : fallback;
}
