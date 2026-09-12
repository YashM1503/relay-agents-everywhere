/**
 * handleObservation / handleConfirm: the two entry points. Global rules run first (stop, restart,
 * shared content, money), then the current state decides. Errors never lose state.
 */
import type { Choice, ConfirmRequest, ObservationRequest, RelayResponse } from "../contracts/builderA";
import type { ActionProposal, Session } from "../contracts/domain";
import { PAYLOAD_SHOWN, evaluate } from "../countersign/evaluate";
import { fixtures } from "../fixtures/load";
import { createReceipt, findReceiptByAction, getReceipt, toView } from "../receipts/store";
import { hardReset, moveTo } from "../state/machine";
import { isAffirmative, isMoneyInstruction, isNegative, isResume, isRestart, isStopCommand, isTaskStart, looksLikeUrl, matchChoice, moneyRequest, wantsChange } from "../state/parse";
import { getSession, saveSession } from "../state/sessionStore";
import { hashPayload, newId } from "../util/ids";
import { advance } from "./advance";
import { handleCollect } from "./collect";
import { execute } from "./execute";
import { propose } from "./propose";
import { askCurrent, choicesPrompt, presentProposal, respond } from "./respond";
import { handleStart } from "./start";
import { isFormField, reopenField } from "./task";

const INTERJECTION_CHOICES: Choice[] = [
  { id: "verify", label: "Verify with the clinic" },
  { id: "ignore", label: "Ignore it" },
];

export async function handleObservation(req: ObservationRequest): Promise<RelayResponse> {
  const session = getSession(req.session_id);
  if (!session) throw new Error("SESSION_NOT_FOUND");
  if (session.status === "ended") {
    return respond(session, { assistant_message: "This session has ended. Start a new session to continue.", next_input: "none" });
  }

  const isImage = req.observation_type === "image";
  const text = isImage ? "" : req.content.trim();
  const now = new Date().toISOString();
  session.observations.push({
    type: req.observation_type,
    source: "phone",
    content_ref: isImage ? `[image ${req.content.length} bytes]` : req.observation_type === "document" ? `[shared ${text.length} chars]` : text,
    timestamp: now,
  });
  session.turns.push({ at: now, role: "user", text: isImage ? "[photo]" : req.observation_type === "document" ? `[shared] ${text}` : text });

  try {
    // 1. Control commands: deterministic, before anything else.
    if (text && isStopCommand(text)) return cancel(session);
    if (text && isRestart(text)) {
      hardReset(session);
      return respond(session, { assistant_message: "Okay, starting over. Tell me what you need, or scan the code the clerk gave you.", next_input: "voice" });
    }
    // 2. Content shared with RELAY is untrusted data, never an instruction.
    if (req.observation_type === "document") return handleSharedContent(session, text);
    if (session.interjection) return handleInterjectionAnswer(session, text);
    // 3. The user asking RELAY to move money: Tier 3, decided by COUNTERSIGN, never automatic.
    if (text && isMoneyInstruction(text)) return denyMoney(session, text);

    // 4. State dispatch.
    switch (session.state) {
      case "START":
        return await handleStart(session, req);
      case "COLLECT_MISSING":
        return await handleCollect(session, req);
      case "WAIT_CONFIRMATION":
        return await handleWaitConfirmation(session, req);
      case "EXECUTE":
        return respond(session, { assistant_message: "One moment, I'm still submitting.", next_input: "none" });
      case "RECEIPT":
        return await handleAfterReceipt(session, req);
      case "HOLD":
        return await handleHold(session, req);
      case "CANCELLED":
        return await resume(session, req);
      default:
        return await recover(session);
    }
  } catch (err) {
    return failSafe(session, err);
  }
}

export async function handleConfirm(req: ConfirmRequest): Promise<RelayResponse> {
  const session = getSession(req.session_id);
  if (!session) throw new Error("SESSION_NOT_FOUND");
  try {
    const p = session.pending_action;
    if (!p || p.action_id !== req.action_id || session.state !== "WAIT_CONFIRMATION") {
      // Red team #28: a duplicate confirm returns the receipt, never a second submission.
      const done = findReceiptByAction(req.action_id);
      if (done) return respond(session, { assistant_message: "That was already submitted. Here is your receipt.", next_input: "none", receipt: toView(done) });
      const last = session.last_response;
      return respond(session, { assistant_message: "There is nothing waiting for your approval right now.", next_input: last?.next_input ?? "voice", choices: last?.choices ?? [], field: last?.field });
    }
    if (p.payload_hash !== req.payload_hash) {
      // Red team #27: approval binds to the exact payload the user saw. Re-present the current one.
      moveTo(session, "PREPARE_ACTION");
      return await propose(session, "The details changed since you last looked, so please check them again. ");
    }
    if (req.decision === "reject") {
      session.pending_action = null;
      moveTo(session, "CANCELLED");
      return respond(session, { assistant_message: "Okay, I did not submit anything. Tell me what to change, or say 'continue' to review it again.", next_input: "voice" });
    }
    p.confirmed_by_user = true;
    const shown = p.proof_obligations.find((o) => o.id === PAYLOAD_SHOWN);
    if (shown) {
      shown.satisfied = true;
      shown.evidence = `user confirmed payload ${p.payload_hash}`;
    }
    moveTo(session, "EXECUTE");
    return await execute(session);
  } catch (err) {
    return failSafe(session, err);
  }
}

// ---- state handlers -------------------------------------------------------------------------

async function handleWaitConfirmation(session: Session, req: ObservationRequest): Promise<RelayResponse> {
  const p = session.pending_action;
  if (!p) return recover(session);
  if (req.observation_type === "image") return presentProposal(session, "I have everything I need. ");
  const text = req.content.trim();
  const changed = wantsChange(text);
  if (changed && isFormField(changed) && session.task) {
    session.pending_action = null;
    moveTo(session, "COLLECT_MISSING");
    reopenField(session.task, changed);
    return askCurrent(session, "Sure, let's change that. ");
  }
  if (isAffirmative(text)) return handleConfirm({ session_id: session.session_id, action_id: p.action_id, payload_hash: p.payload_hash, decision: "confirm" });
  if (isNegative(text)) return handleConfirm({ session_id: session.session_id, action_id: p.action_id, payload_hash: p.payload_hash, decision: "reject" });
  return presentProposal(session, "Say yes to submit, or no to hold off. ");
}

async function handleAfterReceipt(session: Session, req: ObservationRequest): Promise<RelayResponse> {
  const text = req.observation_type === "image" ? "" : req.content.trim();
  if (req.observation_type === "image" || isTaskStart(text) || looksLikeUrl(text)) {
    hardReset(session);
    return handleStart(session, req);
  }
  const lastId = session.receipts[session.receipts.length - 1];
  const r = lastId ? getReceipt(lastId) : undefined;
  return respond(session, { assistant_message: "Your registration is complete. Say 'new task' if you need anything else.", next_input: "voice", receipt: r ? toView(r) : null });
}

async function handleHold(session: Session, req: ObservationRequest): Promise<RelayResponse> {
  const hold = session.hold;
  if (!hold) return recover(session);
  const text = req.observation_type === "image" ? "" : req.content.trim();
  if (hold.reason === "wrong_destination" && (req.observation_type === "image" || looksLikeUrl(text))) {
    hardReset(session);
    return handleStart(session, req);
  }
  const c = text ? matchChoice(text, hold.choices) : null;
  const id = c?.id ?? (text && isAffirmative(text) ? hold.choices[0]?.id : text && isNegative(text) ? "cancel" : null);
  switch (id) {
    case "retry":
      session.hold = null;
      moveTo(session, "PREPARE_ACTION");
      return propose(session, "Trying again. ");
    case "rescan":
      session.hold = null;
      hardReset(session);
      return respond(session, { assistant_message: "Okay. Scan the code again, or tell me what you need.", next_input: "voice" });
    case "cancel":
      return cancel(session);
    default:
      return respond(session, { assistant_message: `${hold.message} ${choicesPrompt(hold.choices)}`, next_input: "choice", choices: hold.choices });
  }
}

async function resume(session: Session, req: ObservationRequest): Promise<RelayResponse> {
  const text = req.observation_type === "image" ? "" : req.content.trim();
  const task = session.task;
  if (task && task.status === "in_progress") {
    moveTo(session, "START");
    moveTo(session, "UNDERSTAND_TASK");
    const changed = text ? wantsChange(text) : null;
    if (changed && isFormField(changed)) reopenField(task, changed);
    const hasQuestion = !!(task.current_question || task.unresolved_fields.length);
    if (hasQuestion && text && !isResume(text) && !changed) {
      // They answered the open question straight away instead of saying "continue".
      moveTo(session, "COLLECT_MISSING");
      return handleCollect(session, req);
    }
    return advance(session, "Okay, continuing. ");
  }
  moveTo(session, "START");
  return handleStart(session, req);
}

/** Transient states (UNDERSTAND_TASK, PREPARE_ACTION, COUNTERSIGN) should never receive input; recover to a stable one. */
async function recover(session: Session): Promise<RelayResponse> {
  if (!session.task) {
    hardReset(session);
    return respond(session, { assistant_message: "Let's start again. Tell me what you need.", next_input: "voice" });
  }
  session.pending_action = null;
  session.state = "UNDERSTAND_TASK";
  return advance(session);
}

// ---- global rules ------------------------------------------------------------------------------

function cancel(session: Session): RelayResponse {
  if (session.state === "RECEIPT") {
    return respond(session, { assistant_message: "Your registration is already complete, so there's nothing to cancel.", next_input: "none" });
  }
  const hadPending = !!session.pending_action;
  session.pending_action = null;
  session.hold = null;
  session.interjection = null;
  if (session.state !== "CANCELLED") moveTo(session, "CANCELLED");
  return respond(session, {
    assistant_message: hadPending
      ? "Stopped. I did not submit anything. Say 'continue' when you want to pick up where we left off."
      : "Stopped. Nothing was submitted. Say 'continue' when you want to go on.",
    next_input: "voice",
  });
}

function handleSharedContent(session: Session, text: string): RelayResponse {
  if (moneyRequest(text)) {
    session.interjection = { kind: "payment_request", excerpt: text.slice(0, 140) };
    const during = session.task ? " and does not match the registration we're completing" : "";
    return respond(session, {
      assistant_message: `This message asks for money${during}. I left it untouched. Would you like me to verify it with the clinic?`,
      next_input: "choice",
      choices: INTERJECTION_CHOICES,
    });
  }
  return reAsk(session, "I've noted that message. I won't act on anything in it. ");
}

function handleInterjectionAnswer(session: Session, text: string): RelayResponse {
  const c = matchChoice(text, INTERJECTION_CHOICES) ?? (isAffirmative(text) ? INTERJECTION_CHOICES[0] : isNegative(text) ? INTERJECTION_CHOICES[1] : null);
  if (!c) return respond(session, { assistant_message: "Should I verify that message with the clinic, or ignore it?", next_input: "choice", choices: INTERJECTION_CHOICES });
  const excerpt = session.interjection?.excerpt ?? "";
  session.interjection = null;
  if (c.id === "verify") {
    session.follow_ups.push(`Verify with ${fixtures.clinicForm().organization} front desk: "${excerpt}"`);
    return reAsk(session, "I'll flag it for the clinic's front desk to verify and note it in your receipt. Nothing was paid. ");
  }
  return reAsk(session, "Okay, leaving it alone. ");
}

function denyMoney(session: Session, text: string): RelayResponse {
  const proposal: ActionProposal = {
    action_id: newId("a"),
    action_type: "money_transfer",
    target: "unknown",
    payload: { instruction: text.slice(0, 140) },
    payload_hash: hashPayload(text),
    risk_tier: 3,
    reversible: false,
    proof_obligations: [],
    summary_lines: [],
    sensitive_fields: [],
    idempotency_key: "n/a",
  };
  const ev = evaluate(proposal, session.task, fixtures.userProfile());
  createReceipt({
    action_id: proposal.action_id,
    session_id: session.session_id,
    action_type: proposal.action_type,
    target: proposal.target,
    verdict: ev.verdict,
    confirmed_by_user: false,
    payload_hash: proposal.payload_hash,
    key_evidence: [`policy: ${ev.reason}`],
    result: "denied",
  });
  return reAsk(session, "Sending money is something I never do on my own, and it isn't part of what we're doing. If you think a payment is needed, please check with the clinic desk directly. ");
}

/** Repeat whatever the user should do next in the current state, with a prefix. */
function reAsk(session: Session, prefix: string): RelayResponse {
  switch (session.state) {
    case "COLLECT_MISSING":
      return askCurrent(session, prefix);
    case "WAIT_CONFIRMATION":
      return session.pending_action ? presentProposal(session, prefix) : respond(session, { assistant_message: prefix.trim(), next_input: "voice" });
    case "HOLD":
      return respond(session, { assistant_message: prefix + (session.hold?.message ?? ""), next_input: "choice", choices: session.hold?.choices ?? [] });
    case "RECEIPT":
      return respond(session, { assistant_message: prefix + "Your registration is complete.", next_input: "voice" });
    case "CANCELLED":
      return respond(session, { assistant_message: prefix + "Say 'continue' when you want to go on.", next_input: "voice" });
    default:
      return respond(session, { assistant_message: prefix + "Tell me what you need, or scan the code the clerk gave you.", next_input: "voice" });
  }
}

function failSafe(session: Session, err: unknown): RelayResponse {
  console.error(`[relay] ${session.session_id} in ${session.state}:`, err instanceof Error ? err.message : err);
  const last = session.last_response;
  saveSession(session);
  return respond(session, {
    assistant_message: "I couldn't verify that yet, so I haven't changed anything. You can try again, or say stop.",
    next_input: last?.next_input ?? "voice",
    choices: last?.choices ?? [],
    action_proposal: last?.action_proposal ?? null,
    field: last?.field,
    degraded: true,
  });
}
