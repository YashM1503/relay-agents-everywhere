/**
 * START: work out what the task is from the first observation (voice, typed text, QR photo or link).
 */
import type { ObservationRequest, RelayResponse } from "../contracts/builderA";
import type { Session } from "../contracts/domain";
import { fixtures } from "../fixtures/load";
import { extractFromImage, hostOf, isExpectedDestination } from "../ingest/vision";
import { intentIsDegraded, interpretTranscript } from "../ingest/voice";
import { moveTo } from "../state/machine";
import { isTaskStart, looksLikeUrl } from "../state/parse";
import { tools } from "../tools/index";
import { advance } from "./advance";
import { respond } from "./respond";
import { buildTask } from "./task";

export async function handleStart(session: Session, req: ObservationRequest): Promise<RelayResponse> {
  const profile = fixtures.userProfile();
  const form = fixtures.clinicForm();
  const text = req.observation_type === "image" ? "" : req.content.trim();
  let url: string | null = null;

  if (req.observation_type === "image") {
    const ex = await extractFromImage(req.content, req.field_hint ?? "qr");
    if (!ex.decoded_url) {
      return respond(session, {
        assistant_message: "I couldn't find a code or a form in that photo. Tell me what you need, or try the photo again.",
        next_input: "voice",
        degraded: ex.uncertainties.some((u) => /no live|unavailable|failed/i.test(u)),
      });
    }
    url = ex.decoded_url;
  } else if (looksLikeUrl(text)) {
    url = text;
  }

  let targetDomain: string | undefined;
  if (url) {
    const host = hostOf(url) ?? url;
    if (!isExpectedDestination(url)) {
      // Red team #5: wrong or stale QR. Hold before anything is shared.
      moveTo(session, "HOLD");
      session.hold = {
        reason: "wrong_destination",
        message: `This code points to ${host}, which is not ${form.organization}. I've paused before sharing anything.`,
        choices: [
          { id: "rescan", label: "Scan again" },
          { id: "cancel", label: "Stop" },
        ],
      };
      return respond(session, { assistant_message: session.hold.message + " Do you want to scan again, or stop?", next_input: "choice", choices: session.hold.choices });
    }
    targetDomain = host;
  } else if (!isTaskStart(text)) {
    const intent = await interpretTranscript(text, { has_task: false });
    if (intent.kind !== "start_task" || !/regist|clinic|form|patient|appointment/i.test(intent.goal ?? "")) {
      return respond(session, {
        assistant_message: "I'm not sure what you need yet. You can say 'help me register at the clinic', or scan the code the clerk gave you.",
        next_input: "voice",
        degraded: intentIsDegraded(intent),
      });
    }
  }

  session.task = buildTask(profile, form, { target_domain: targetDomain, destination_verified: true });
  await tools.open_demo_form(session.session_id);
  moveTo(session, "UNDERSTAND_TASK");
  return advance(session, "I'm with you. ");
}
