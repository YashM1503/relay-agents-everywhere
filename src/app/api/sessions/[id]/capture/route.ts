import { NextResponse } from "next/server";
import { captureInsurance, getSessionStateForClient } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as {
    side: "front" | "back";
    image: string;
  };

  const result = captureInsurance(id, body.side, body.image);
  if (!result) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const state = getSessionStateForClient(id);
  if (result.error) {
    return NextResponse.json({ ...state, error: result.error, ok: false });
  }

  return NextResponse.json({ ...state, ok: true });
}
