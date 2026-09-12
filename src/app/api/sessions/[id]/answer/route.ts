import { NextResponse } from "next/server";
import { answerQuestion, getSessionStateForClient } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as {
    questionId?: string;
    answer: string;
  };

  if (!body.questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  const record = answerQuestion(id, body.questionId, body.answer);
  if (!record) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(getSessionStateForClient(id));
}
