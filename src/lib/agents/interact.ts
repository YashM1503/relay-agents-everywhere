import { runWithFallback } from "./execute";
import type { AgentRequest, RelayContext } from "./types";

const defaultContext: RelayContext = {
  userPreferences: { largeText: true, language: "en" },
  currentEnvironment: [],
  currentTask: {
    taskId: "t_interact",
    goal: "Answer the user's question clearly and safely",
    status: "in_progress",
  },
  conversationContext: [],
  connectedSources: [],
  permissions: {
    submitForms: "ask",
    shareDocuments: "ask",
    moneyTransfer: "never_auto",
  },
};

/** Route a Talk utterance through the capability router — no provider names exposed. */
export async function answerFromTranscript(transcript: string) {
  const request: AgentRequest = {
    taskType: "conversation",
    requiredCapabilities: ["conversation", "reasoning"],
    prompt: transcript,
    privacyRequirement: "cloud",
  };

  const outcome = await runWithFallback(request, {
    ...defaultContext,
    conversationContext: [{ role: "user", content: transcript }],
  });

  return {
    answer: outcome.result.summary,
    status: outcome.result.status,
    findings: outcome.result.findings ?? [],
  };
}

/** Route a Show image through the vision-capable agent stack. */
export async function explainImage(imageDataUrl: string, userPrompt?: string) {
  const prompt =
    userPrompt ??
    "The user is showing you something in the real world. Explain what you see in plain language and suggest helpful next steps. Do not name any AI provider or model.";

  const request: AgentRequest = {
    taskType: "vision",
    requiredCapabilities: ["vision", "conversation"],
    requiredModalities: ["image", "text"],
    prompt,
    attachments: [{ type: "image", dataUrl: imageDataUrl }],
    privacyRequirement: "cloud",
  };

  const outcome = await runWithFallback(request, defaultContext);

  return {
    explanation: outcome.result.summary,
    status: outcome.result.status,
    findings: outcome.result.findings ?? [],
    suggestedActions: outcome.result.proposedActions ?? [],
  };
}
