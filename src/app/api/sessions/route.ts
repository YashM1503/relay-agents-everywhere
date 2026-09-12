import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { demo?: boolean };
  const record = createSession({ demo: body.demo });
  return NextResponse.json({ sessionId: record.session.sessionId });
}
