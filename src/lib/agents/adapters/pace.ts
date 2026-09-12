import type {
  AgentAdapter,
  AgentCapability,
  AgentRequest,
  AgentResult,
  RelayContext,
} from "../types";
import { normalize } from "../normalize";

const PACE_CAPABILITIES: AgentCapability[] = ["specialist"];

export const paceAdapter: AgentAdapter = {
  id: "pace",
  capabilities: PACE_CAPABILITIES,

  async canHandle(_task: AgentRequest): Promise<boolean> {
    return false;
  },

  async health(): Promise<{ available: boolean; reason?: string }> {
    return {
      available: false,
      reason: "Pace adapter is a placeholder; no supported API configured.",
    };
  },

  async execute(
    _task: AgentRequest,
    _context: RelayContext,
  ): Promise<AgentResult> {
    return normalize({
      status: "failed",
      summary: "Pace adapter is unavailable.",
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
