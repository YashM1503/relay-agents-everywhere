/**
 * COLLECT_MISSING: interpret the answer to the one open question, record it with provenance,
 * then advance. Deterministic parsing first; the model only for free text that needs mapping.
 */
import type { ObservationRequest, RelayResponse } from "../contracts/builderA";
import type { Session } from "../contracts/domain";
import { fixtures } from "../fixtures/load";
import { extractFromImage } from "../ingest/vision";
import { interpretTranscript } from "../ingest/voice";
import { detectFieldMention, isAffirmative, isNegative, looksLikeDate, matchChoice, wantsChange } from "../state/parse";
import { CONFIRM_PROFILE_CHOICES, PROFILE_FIELDS, Q, YES_NO, contactChoices, fieldLabel, slotChoices } from "../state/questions";
import { hashPayload, sameName } from "../util/ids";
import { advance } from "./advance";
import { askCurrent, respond, stepInfo } from "./respond";
import { addSpecialQuestion, answeredSpecial, isFormField, recordAnswer, reopenField } from "./task";

export async function handleCollect(session: Session, req: ObservationRequest): Promise<RelayResponse> {
  const task = session.task;
  if (!task) throw new Error("collect without task");
  const key = task.current_question ?? task.unresolved_fields[0];
  if (!key) return advance(session);
  task.current_question = key;
  const form = fixtures.clinicForm();
  const isImage = req.observation_type === "image";
  const text = isImage ? "" : req.content.trim();

  if (key === "insurance_front" || key === "insurance_back") return handleCameraAnswer(session, key, req);
  if (isImage) return askCurrent(session, "Thanks for the photo, but this step needs an answer. ");

  // Changing an earlier answer is allowed from any question.
  const changed = wantsChange(text);
  if (changed && changed !== key && isFormField(changed) && (task.known_fields[changed] || changed === "insurance_back")) {
    return startChange(session, changed, "Sure, let's change that. ");
  }

  switch (key) {
    case Q.CONFIRM_PROFILE: {
      const c = matchChoice(text, CONFIRM_PROFILE_CHOICES);
      if (c?.id === "yes" || (!c && isAffirmative(text))) {
        task.profile_confirmed = true;
        for (const k of PROFILE_FIELDS) {
          const fv = task.known_fields[k];
          if (fv?.provenance === "profile") fv.note = "confirmed by user";
        }
        answeredSpecial(task);
        return advance(session, "Great. ");
      }
      if (c?.id === "change" || isNegative(text)) {
        const f = detectFieldMention(text);
        answeredSpecial(task);
        if (f && PROFILE_FIELDS.includes(f)) return startChange(session, f, "Okay. ");
        addSpecialQuestion(task, Q.PICK_FIELD);
        return askCurrent(session, "Okay. ");
      }
      return askCurrent(session, "Please say yes if those details are right, or tell me what changed. ");
    }
    case Q.PICK_FIELD: {
      const picked = matchChoice(text, PROFILE_FIELDS.map((k) => ({ id: k, label: fieldLabel(form, k) })))?.id ?? detectFieldMention(text);
      if (picked && PROFILE_FIELDS.includes(picked)) {
        answeredSpecial(task);
        return startChange(session, picked, "");
      }
      return askCurrent(session, "I didn't catch which one. ");
    }
    case Q.RESOLVE_NAME: {
      const conflict = task.conflicts.find((x) => x.field === "full_name" && !x.resolved);
      const c = conflict
        ? matchChoice(text, [
            { id: "profile", label: conflict.profile_value },
            { id: "document", label: conflict.document_value },
          ])
        : null;
      if (!c || !conflict) return askCurrent(session, "Please pick one. ");
      conflict.resolved = true;
      task.current_question = undefined; // the special question is answered by recording the field
      recordAnswer(task, "full_name", c.id === "profile" ? conflict.profile_value : conflict.document_value, "user", `chosen over the ${c.id === "profile" ? "card" : "profile"} value`);
      return advance(session, "Thanks. ");
    }
    case "dob": {
      if (!looksLikeDate(text)) return askCurrent(session, "I need your date of birth, for example 12 March 1950. ");
      recordAnswer(task, key, text, "user");
      return advance(session, "Thank you. ");
    }
    case "emergency_contact": {
      const choices = contactChoices();
      const c = matchChoice(text, choices);
      if (c && c.id !== "someone_else") {
        recordAnswer(task, key, c.label, "user");
        return advance(session, "Got it. ");
      }
      if (c?.id === "someone_else") {
        task.expect_free_text = true;
        return respond(session, { assistant_message: "Who is it? Please say their name and phone number.", next_input: "voice", field: key, step: stepInfo(session, "Emergency contact") });
      }
      if (task.expect_free_text || text.split(" ").length >= 2) {
        recordAnswer(task, key, text, "user");
        return advance(session, "Got it. ");
      }
      return askCurrent(session, "You can pick one of your trusted contacts, or say someone else. ");
    }
    case "sms_reminders": {
      const c = matchChoice(text, YES_NO);
      const yes = c ? c.id === "yes" : isAffirmative(text) ? true : isNegative(text) ? false : null;
      if (yes === null) return askCurrent(session, "Please say yes or no. ");
      recordAnswer(task, key, yes, "user");
      return advance(session, yes ? "Okay, reminders on. " : "Okay, no reminders. ");
    }
    case "reason_for_visit": {
      if (text.length < 3) return askCurrent(session, "I didn't catch that. ");
      recordAnswer(task, key, text, "user");
      return advance(session, "Thank you. ");
    }
    case "appointment_slot": {
      const choices = slotChoices();
      let c = matchChoice(text, choices);
      if (!c) {
        const intent = await interpretTranscript(text, { has_task: true, current_question: key, choices });
        if (intent.kind === "answer" && intent.value) c = choices.find((x) => x.id === intent.value) ?? null;
      }
      if (!c) return askCurrent(session, "You can say the first, second or third option. ");
      recordAnswer(task, key, c.id, "user", c.label);
      const stepFree = c.note === "step-free entrance confirmed" ? ", step-free entrance confirmed" : "";
      return advance(session, `${c.label}${stepFree}. `);
    }
    default: {
      if (text.length < 2) return askCurrent(session, "I didn't catch that. ");
      recordAnswer(task, key, text, "user");
      return advance(session, "Updated. ");
    }
  }
}

/** Switch to changing another field; the current question is kept on the queue. */
export function startChange(session: Session, field: string, prefix: string): RelayResponse {
  const task = session.task;
  if (!task) throw new Error("startChange without task");
  const cur = task.current_question;
  if (cur && !cur.startsWith("__") && cur !== field && !task.unresolved_fields.includes(cur)) task.unresolved_fields.unshift(cur);
  if (cur === Q.CONFIRM_PROFILE) {
    task.profile_confirmed = false;
    answeredSpecial(task);
  }
  reopenField(task, field);
  return askCurrent(session, prefix);
}

async function handleCameraAnswer(session: Session, key: string, req: ObservationRequest): Promise<RelayResponse> {
  const task = session.task;
  if (!task) throw new Error("camera without task");
  if (req.observation_type !== "image") {
    if (/\b(don'?t have|no card|lost|forgot|left it|can'?t find|not with me)\b/i.test(req.content)) {
      return respond(session, {
        assistant_message: "That's okay. The clinic can't finish registration without the card, so we'll pause here. When you have it, say 'continue'. Or say 'stop' to end.",
        next_input: "voice",
        field: key,
        step: stepInfo(session, "Insurance card"),
      });
    }
    return askCurrent(session, "I need a photo for this step. ");
  }

  const ex = await extractFromImage(req.content, req.field_hint ?? key);
  if (ex.document_kind === "unknown" || ex.fields.length === 0) {
    return askCurrent(session, "I couldn't read that photo. Try again with more light, and hold the card flat. ");
  }
  const expected = key === "insurance_front" ? "insurance_card_front" : "insurance_card_back";
  if (ex.document_kind !== expected) {
    const side = ex.document_kind === "insurance_card_front" ? "front" : "back";
    return askCurrent(session, `That looks like the ${side} of the card. `);
  }

  // The raw image is never stored; only a reference and the extracted fields.
  const ref = `photo:${hashPayload(req.content)}`;
  task.documents[key] = { ref, kind: ex.document_kind, extracted: ex.fields, uncertainties: ex.uncertainties, demo_extraction: ex.demo_extraction };
  const memberId = ex.fields.find((f) => f.key === "member_id")?.value;
  recordAnswer(task, key, ref, "document", memberId ? `member ID ending ${String(memberId).slice(-4)}` : undefined);

  // Red team #6: document/profile conflict -> ask, never guess.
  const docName = ex.fields.find((f) => f.key === "member_name")?.value;
  const profName = task.known_fields.full_name?.value;
  if (key === "insurance_front" && typeof docName === "string" && typeof profName === "string" && !sameName(docName, profName)) {
    task.conflicts.push({ field: "full_name", profile_value: profName, document_value: docName, resolved: false });
    addSpecialQuestion(task, Q.RESOLVE_NAME);
    return askCurrent(session, "I read the card. ");
  }
  const note = ex.demo_extraction ? "Got it. (Demo mode: card details filled from the sample card.) " : "Got it. ";
  return advance(session, note);
}
