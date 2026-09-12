import { z } from "zod";
import { idSchema } from "./primitives";

export const proofRequirementSchema = z.object({
  id: idSchema,
  kind: z.string().min(1),
  description: z.string().min(1),
  satisfied: z.boolean().optional(),
});

export const verificationResultSchema = z.object({
  requirementId: idSchema,
  passed: z.boolean(),
  evidence: z.array(z.string()),
  message: z.string().optional(),
});

export const countersignVerdictSchema = z.enum([
  "allow",
  "confirm",
  "hold",
  "deny",
]);

export const countersignDecisionSchema = z.object({
  verdict: countersignVerdictSchema,
  action: z.string().min(1),
  recipient: z.string(),
  purpose: z.string(),
  dataShared: z.array(z.string()),
  evidence: z.array(z.string()),
  unresolved: z.array(z.string()),
  explanation: z.string().min(1),
});
