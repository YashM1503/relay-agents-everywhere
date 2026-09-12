import { NextResponse } from "next/server";
import { cancelProposal, getSessionStateForClient } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/** Clears a pending proposal server-side so a cancelled COUNTERSIGN card cannot be executed later. */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const record = cancelProposal(id);
  if (!record) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    cancelled: true,
    state: getSessionStateForClient(record.session.sessionId),
  });
}
