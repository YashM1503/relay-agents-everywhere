import { NextResponse } from "next/server";
import { confirmAction } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const record = confirmAction(id);
  if (!record) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, confirmed: true });
}
