import { z } from "zod";
import { idSchema, timestampSchema } from "./primitives";
import { countersignVerdictSchema } from "./countersign";

export const actionReceiptStatusSchema = z.enum([
  "success",
  "partial",
  "failed",
  "cancelled",
]);

export const actionReceiptSchema = z.object({
  receiptId: idSchema,
  actionId: idSchema,
  sessionId: idSchema.optional(),
  status: actionReceiptStatusSchema,
  confirmationCode: z.string().optional(),
  summary: z.string().min(1),
  executedAt: timestampSchema,
  auditTrail: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
});

export const decisionReceiptSchema = z.object({
  receiptId: idSchema,
  actionId: idSchema,
  verdict: countersignVerdictSchema,
  confirmedByUser: z.boolean(),
  result: actionReceiptStatusSchema,
  confirmationCode: z.string().optional(),
  decidedAt: timestampSchema.optional(),
  explanation: z.string().optional(),
});
