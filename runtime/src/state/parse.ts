/**
 * Deterministic parsing of what the user said. Runs BEFORE any model call so that control
 * commands (stop, yes/no, picking a choice, changing an answer) never depend on a provider.
 */
import type { Choice } from "../contracts/builderA";

export function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}$:'\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLead(t: string): string {
  return t.replace(/^((hey|ok|okay|please|relay|um|uh|so|well)[, ]+)+/g, "").trim();
}

export const STOP_WORDS = [
  "stop",
  "cancel",
  "pause",
  "halt",
  "never mind",
  "nevermind",
  "don't do that",
  "dont do that",
  "do not do that",
  "don't submit",
  "dont submit",
  "do not submit",
  "hold on",
];

/** Words that must cancel any pending action immediately (red team #26, test plan edge case 1). */
export function isStopCommand(text: string): boolean {
  const t = stripLead(norm(text));
  return STOP_WORDS.some((w) => t === w || t.startsWith(w + " ") || t.startsWith(w + ","));
}

export function isRestart(text: string): boolean {
  return /\b(start over|start again|restart|new task|new session|from the beginning)\b/.test(norm(text));
}

export function isResume(text: string): boolean {
  return /\b(continue|resume|go on|carry on|keep going|pick up|where we left off)\b/.test(norm(text));
}

export function isAffirmative(text: string): boolean {
  const t = stripLead(norm(text));
  return /^(yes|yeah|yep|yup|y|correct|right|sure|confirm|confirmed|submit|go ahead|do it|send it|looks good|that's right|thats right|fine|absolutely|use those|use these|that's correct|thats correct|all good|sounds good|yes please)\b/.test(
    t,
  );
}

export function isNegative(text: string): boolean {
  const t = stripLead(norm(text));
  return /^(no|nope|nah|n|not yet|hold off|don't|dont|do not|wrong|incorrect|not right|reject|decline|something changed|that's wrong|thats wrong|no thanks)\b/.test(
    t,
  );
}

export function isTaskStart(text: string): boolean {
  return /\b(regist\w*|sign ?up|check ?in|new patient|clinic|form|stay with me|qr|scan|appointment)\b/.test(norm(text));
}

export function looksLikeUrl(text: string): boolean {
  return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
}

/** Content (e.g. a shared message) that asks for money. */
export function moneyRequest(text: string): boolean {
  const t = norm(text);
  return /\$\s?\d+|\b\d+\s?(dollars|usd|bucks)\b/.test(t) || /\b(pay|payment|send money|transfer|wire|venmo|zelle|gift card)\b/.test(t);
}

/** The user themselves instructing RELAY to move money. Tier 3, never automatic. */
export function isMoneyInstruction(text: string): boolean {
  const t = norm(text);
  return /\b(pay|send|transfer|wire)\b/.test(t) && (/\$\s?\d+|\b\d+\s?(dollars|usd|bucks)\b/.test(t) || /\bmoney\b/.test(t));
}

const FIELD_KEYWORDS: Array<[string, RegExp]> = [
  ["dob", /\b(date of birth|birth ?date|birthday|born|dob)\b/],
  ["emergency_contact", /\b(emergency)\b/],
  ["insurance_back", /\b(back of (the |my )?card|card back|back side)\b/],
  ["insurance_front", /\b(insurance|card)\b/],
  ["appointment_slot", /\b(appointment|slot|time slot|the time|the date)\b/],
  ["reason_for_visit", /\b(reason)\b/],
  ["sms_reminders", /\b(reminder|reminders|sms|text message|text messages)\b/],
  ["phone", /\b(phone|number|mobile|cell)\b/],
  ["email", /\b(e-?mail)\b/],
  ["address", /\b(address|street|apartment|zip)\b/],
  ["preferred_language", /\b(language)\b/],
  ["full_name", /\b(name)\b/],
];

export function detectFieldMention(text: string): string | null {
  const t = norm(text);
  for (const [key, re] of FIELD_KEYWORDS) if (re.test(t)) return key;
  return null;
}

/** "actually my phone changed" -> "phone". Null when no change intent or no field named. */
export function wantsChange(text: string): string | null {
  const t = norm(text);
  if (!/\b(change|changed|actually|instead|wrong|incorrect|correct|correction|update|different|fix|not my|isn't my|isnt my|no longer|new)\b/.test(t)) {
    return null;
  }
  return detectFieldMention(t);
}

const STOPLIST = new Set([
  "the", "one", "yes", "no", "and", "or", "of", "to", "a", "an", "my", "i", "is", "it", "that", "this",
  "please", "option", "use", "those", "these", "something", "changed", "with", "for", "at", "on", "in",
  "pm", "am", "sep",
]);

// "one" is deliberately absent: "the second one" must not read as first.
const ORDINALS = [/\b(first|1st|1)\b/, /\b(second|2nd|two|2)\b/, /\b(third|3rd|three|3)\b/, /\b(fourth|4th|four|4)\b/];

/** Map free text onto one of the offered choices, or null. */
export function matchChoice(text: string, choices: Choice[]): Choice | null {
  const t = norm(text);
  if (!t || choices.length === 0) return null;
  for (const c of choices) if (t === c.id.toLowerCase() || t === norm(c.label)) return c;
  for (const c of choices) {
    const l = norm(c.label);
    if (l && t.includes(l)) return c;
  }
  const tokens = t.split(" ").filter((w) => w.length > 1 && !STOPLIST.has(w));
  const hits = choices.filter((c) => {
    const lt = norm(c.label).split(" ");
    return tokens.some((w) => lt.includes(w));
  });
  if (hits.length === 1) return hits[0];
  for (let i = 0; i < Math.min(ORDINALS.length, choices.length); i++) if (ORDINALS[i].test(t)) return choices[i];
  return null;
}

/** Loose check that a date-of-birth answer contains something date-like. Not a parser. */
export function looksLikeDate(text: string): boolean {
  const t = norm(text);
  return /\d/.test(t) || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b/.test(t);
}
