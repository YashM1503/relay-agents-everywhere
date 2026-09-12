import { NextResponse } from "next/server";
import { explainImage } from "@/lib/agents/interact";
import { normalizeImageObservation } from "@/lib/observation/image";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    image?: string;
    prompt?: string;
  };

  if (!body.image) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }

  const observation = normalizeImageObservation(body.image, body.prompt);
  const result = await explainImage(body.image, body.prompt);

  return NextResponse.json({
    observation,
    explanation: result.explanation,
    status: result.status,
    findings: result.findings,
    suggestedActions: result.suggestedActions,
  });
}
