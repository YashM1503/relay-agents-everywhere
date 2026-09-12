import type {
  AgentAdapter,
  AgentCapability,
  AgentRequest,
  AgentResult,
  RelayContext,
} from "../types";
import { normalize } from "../normalize";

const HERMES_CAPABILITIES: AgentCapability[] = ["research", "reasoning"];

export const hermesAdapter: AgentAdapter = {
  id: "hermes",
  capabilities: HERMES_CAPABILITIES,

  async canHandle(_task: AgentRequest): Promise<boolean> {
    return false;
  },

  async health(): Promise<{ available: boolean; reason?: string }> {
    return {
      available: false,
      reason: "Hermes adapter is a placeholder; no supported API configured.",
    };
  },

  async execute(
    _task: AgentRequest,
    _context: RelayContext,
  ): Promise<AgentResult> {
    return normalize({
      status: "failed",
      summary: "Hermes adapter is unavailable.",
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
