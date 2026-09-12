import type {
  AgentAdapter,
  AgentCapability,
  AgentRequest,
  AgentResult,
  RelayContext,
} from "../types";
import { normalize } from "../normalize";

const ORI_CAPABILITIES: AgentCapability[] = ["task_execution"];

export const oriAdapter: AgentAdapter = {
  id: "ori",
  capabilities: ORI_CAPABILITIES,

  async canHandle(_task: AgentRequest): Promise<boolean> {
    return false;
  },

  async health(): Promise<{ available: boolean; reason?: string }> {
    return {
      available: false,
      reason: "Ori adapter is a placeholder; no supported API configured.",
    };
  },

  async execute(
    _task: AgentRequest,
    _context: RelayContext,
  ): Promise<AgentResult> {
    return normalize({
      status: "failed",
      summary: "Ori adapter is unavailable.",
      findings: [
        {
          key: "adapter_status",
          value: "placeholder",
        },
      ],
      artifacts: [],
      proposedActions: [],
    });
  },
};
