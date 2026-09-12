import { z } from "zod";
import { confidenceSchema, idSchema } from "./primitives";

export const userIntentSchema = z.object({
  intentId: idSchema,
  label: z.string().min(1),
  taskType: z.string().min(1).optional(),
  confidence: confidenceSchema,
  sourceObservationIds: z.array(idSchema),
  rationale: z.string().optional(),
});
