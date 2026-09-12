/**
 * Drives the full demo through the HTTP API with scripted answers and fixture photos.
 * Starts its own server on a random port unless RELAY_RUNTIME_URL is set.
 * This is the "passes 3x" check: `npm run demo:3x`.
 */
import "../src/env";
import { server } from "../src/server";
import type { RelayResponse } from "../src/contracts/builderA";

const ANSWERS: Record<string, { say?: string; image?: string }> = {
  __confirm_profile: { say: "yes" },
  dob: { say: "12 March 1950" },
  emergency_contact: { say: "Maya" },
  sms_reminders: { say: "yes please" },
  reason_for_visit: { say: "annual check-up and a question about my knee" },
  insurance_front: { image: "fixture:insurance_front" },
  insurance_back: { image: "fixture:insurance_back" },
  appointment_slot: { say: "the first one" },
};

function show(r: RelayResponse) {
  console.log(`  RELAY: ${r.assistant_message}${r.degraded ? "  [degraded]" : ""}`);
  if (r.action_proposal) {
    console.log(`         ┌ proposal ${r.action_proposal.action_type} -> ${r.action_proposal.target} (tier ${r.action_proposal.risk_tier}, ${r.action_proposal.verdict}, hash ${r.action_proposal.payload_hash})`);
    for (const l of r.action_proposal.payload_summary) console.log(`         │ ${l}`);
    console.log(`         └ sensitive: ${r.action_proposal.sensitive_fields.join(", ")}`);
  }
  if (r.receipt) console.log(`         ✔ receipt ${r.receipt.receipt_id}: ${r.receipt.summary} ${r.receipt.confirmation_code ?? ""}${r.receipt.follow_up ? " · " + r.receipt.follow_up : ""}`);
}

async function main() {
  let base = process.env.RELAY_RUNTIME_URL;
  let own = false;
  if (!base) {
    await new Promise<void>((r) => server.listen(0, r));
    const addr = server.address();
    base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 8787}`;
    own = true;
  }
  const post = async (path: string, body: unknown): Promise<RelayResponse> =>
    (await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
  const you = (t: string) => console.log(`  YOU:   ${t}`);

  const t0 = Date.now();
  const s = (await post("/api/sessions", { user_id: "demo-evelyn" })) as unknown as { session_id: string; opening: RelayResponse };
  const sid = s.session_id;
  const obs = `/api/sessions/${sid}/observations`;
  console.log(`session ${sid}`);
  show(s.opening);

  const first = "RELAY, stay with me. The clerk wants me to register and upload my insurance card.";
  you(first);
  let r = await post(obs, { observation_type: "voice", content: first });
  show(r);

  for (let i = 0; i < 25 && r.next_input !== "none"; i++) {
    if (r.next_input === "confirm" && r.action_proposal) {
      you("Yes, submit it");
      r = await post(`/api/actions/${r.action_proposal.action_id}/confirm`, { session_id: sid, payload_hash: r.action_proposal.payload_hash, decision: "confirm" });
    } else {
      const a = ANSWERS[r.field ?? ""];
      if (!a) throw new Error(`no scripted answer for field "${r.field}" (next_input ${r.next_input})`);
      if (a.image) {
        you(`[photo: ${a.image}]`);
        r = await post(obs, { observation_type: "image", content: a.image, field_hint: r.field });
      } else {
        you(a.say ?? "");
        r = await post(obs, { observation_type: "voice", content: a.say });
      }
    }
    show(r);
  }

  const ok = r.state === "RECEIPT" && !!r.receipt?.confirmation_code;
  console.log(ok ? `\nPASS in ${Date.now() - t0} ms: state ${r.state}, confirmation ${r.receipt?.confirmation_code}` : `\nFAIL: ended in state ${r.state}`);
  if (own) server.close();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
