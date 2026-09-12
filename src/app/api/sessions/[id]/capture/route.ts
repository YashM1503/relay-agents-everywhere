import { NextResponse } from "next/server";
import {
  captureInsurance,
  enrichCaptureWithVision,
  getSessionStateForClient,
  isLiveVisionEnabled,
} from "@/lib/session";

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

  if (result.error) {
    const state = getSessionStateForClient(id);
    return NextResponse.json({ ...state, error: result.error, ok: false });
  }

  // Builder 2: with RELAY_LIVE_VISION=true the routed vision agent reads the real photo.
  // Otherwise the synthetic card values stay, which keeps the demo deterministic.
  let vision: "live" | "synthetic" | "off" = "off";
  if (isLiveVisionEnabled()) {
    const enriched = await enrichCaptureWithVision(id, body.side, body.image);
    vision = enriched?.used ?? "synthetic";
  }

  const state = getSessionStateForClient(id);
  return NextResponse.json({ ...state, ok: true, vision });
}
