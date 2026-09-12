import { NextResponse } from "next/server";
import { cancelSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  cancelSession(id);
  return NextResponse.json({ ok: true });
}
