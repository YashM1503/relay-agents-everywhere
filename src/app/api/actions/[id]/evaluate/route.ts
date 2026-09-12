import { NextResponse } from "next/server";
import { evaluateCountersign } from "@/lib/countersign/evaluate";
import { findSessionByActionId } from "@/lib/session/store";
import { loadUserProfile } from "@/lib/tools/profile";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const record = findSessionByActionId(id);

  if (!record?.pendingProposal) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const decision = evaluateCountersign(
    record.pendingProposal,
    record.task,
    loadUserProfile().action_policy,
  );

  record.countersignDecision = decision;
  return NextResponse.json({ decision });
}
