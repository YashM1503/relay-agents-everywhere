import { NextResponse } from "next/server";
import { executeAction, getSessionStateForClient } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const result = executeAction(id);
  if (!result) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 422 },
    );
  }

  const sessionId = result.record.session.sessionId;
  return NextResponse.json({
    ok: true,
    receipt: result.record.receipt,
    state: getSessionStateForClient(sessionId),
  });
}
