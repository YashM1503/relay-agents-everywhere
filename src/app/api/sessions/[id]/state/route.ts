import { NextResponse } from "next/server";
import { getSessionStateForClient } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const state = getSessionStateForClient(id);
  if (!state) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(state);
}
