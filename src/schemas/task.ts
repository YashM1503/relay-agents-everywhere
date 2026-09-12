import { z } from "zod";
import { idSchema } from "./primitives";

export const taskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "waiting_input",
  "completed",
  "cancelled",
  "failed",
]);

export const taskStateSchema = z.object({
  taskId: idSchema,
  goal: z.string().min(1),
  status: taskStatusSchema,
  knownFields: z.record(z.unknown()),
  unresolvedFields: z.array(z.string()),
  dependencies: z.array(idSchema),
  currentQuestionKey: z.string().optional(),
});
