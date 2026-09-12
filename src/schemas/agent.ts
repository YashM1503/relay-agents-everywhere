import { z } from "zod";
import { actionProposalSchema } from "./action";
import { confidenceSchema, idSchema, metadataSchema } from "./primitives";
import { relayContextSchema } from "./context";

export const agentCapabilitySchema = z.enum([
  "vision",
  "forms",
  "conversation",
  "tool_use",
  "research",
  "reasoning",
  "task_execution",
  "specialist",
  "basic_summary",
  "multimodal",
  "coding",
]);

export const agentStatusSchema = z.enum([
  "live",
  "mock",
  "adapter_placeholder",
  "unavailable",
]);

export const privacyClassSchema = z.enum([
  "cloud",
  "device",
  "hybrid",
  "unknown",
]);

export const agentRegistryEntrySchema = z.object({
  id: idSchema,
  displayName: z.string().min(1),
  capabilities: z.array(agentCapabilitySchema),
  status: agentStatusSchema,
  privacyClass: privacyClassSchema,
  modalities: z.array(z.string()).optional(),
  toolsSupported: z.boolean().optional(),
  latencyClass: z.enum(["fast", "medium", "slow"]).optional(),
  costClass: z.enum(["low", "medium", "high"]).optional(),
  riskAllowed: z.array(z.enum(["T0", "T1", "T2", "T3"])).optional(),
});

export const findingSchema = z.object({
  id: idSchema.optional(),
  kind: z.string().min(1),
  content: z.string().min(1),
  confidence: confidenceSchema.optional(),
  source: z.string().optional(),
});

export const artifactSchema = z.object({
  id: idSchema,
  type: z.string().min(1),
  label: z.string().min(1),
  contentRef: z.string().optional(),
  metadata: metadataSchema.optional(),
});

export const agentRequestSchema = z.object({
  requestId: idSchema,
  agentId: idSchema,
  taskType: z.string().min(1),
  context: relayContextSchema,
  requiredCapabilities: z.array(agentCapabilitySchema).optional(),
  timeoutSeconds: z.number().positive().optional(),
});

export const agentResultStatusSchema = z.enum([
  "completed",
  "needs_input",
  "failed",
]);

export const agentResultSchema = z.object({
  status: agentResultStatusSchema,
  summary: z.string(),
  findings: z.array(findingSchema),
  artifacts: z.array(artifactSchema),
  proposedActions: z.array(actionProposalSchema),
  confidence: confidenceSchema.optional(),
});
