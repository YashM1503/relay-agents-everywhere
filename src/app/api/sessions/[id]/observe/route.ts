import { NextResponse } from "next/server";
import { getSessionStateForClient, observeSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as {
    type: string;
    value?: string;
    transcript?: string;
    confidence?: number;
    imageRef?: string;
  };
  const record = observeSession(id, body);
  if (!record) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(getSessionStateForClient(id));
}
