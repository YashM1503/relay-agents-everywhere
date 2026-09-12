import { NextResponse } from "next/server";
import { getSessionStateForClient, proposeAction } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sessionId: string;
    action: string;
  };

  const result = await proposeAction(body.sessionId, body.action);
  if (!result) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    actionId: result.proposal.action_id,
    countersign: result.record.countersignDecision,
    state: getSessionStateForClient(body.sessionId),
  });
}
