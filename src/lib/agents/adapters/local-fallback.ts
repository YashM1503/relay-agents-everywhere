import type {
  AgentAdapter,
  AgentCapability,
  AgentRequest,
  AgentResult,
  RelayContext,
} from "../types";
import { normalize } from "../normalize";

const LOCAL_CAPABILITIES: AgentCapability[] = ["basic_summary"];

export const localFallbackAdapter: AgentAdapter = {
  id: "local-fallback",
  capabilities: LOCAL_CAPABILITIES,

  async canHandle(task: AgentRequest): Promise<boolean> {
    if (task.requiredCapabilities.length === 0) return true;
    return task.requiredCapabilities.every((cap) =>
      LOCAL_CAPABILITIES.includes(cap),
    );
  },

  async health(): Promise<{ available: boolean; reason?: string }> {
    return { available: true };
  },

  async execute(
    task: AgentRequest,
    context: RelayContext,
  ): Promise<AgentResult> {
    const taskGoal = context.currentTask.goal;
    const summary = [
      `Local fallback summary for: ${task.prompt}`,
      taskGoal ? `Related task: ${taskGoal}` : null,
      "This is a deterministic mock response for demo mode.",
    ]
      .filter(Boolean)
      .join(" ");

    return normalize({
      status: "completed",
      summary,
      findings: [
        {
          key: "task_type",
          value: task.taskType,
        },
        {
          key: "source",
          value: "local-fallback",
        },
      ],
      artifacts: [],
      proposedActions: [],
      confidence: 0.5,
    });
  },
};
