import { z } from "zod";
import { idSchema, timestampSchema } from "./primitives";

export const sessionModeSchema = z.enum([
  "ask",
  "show",
  "stay_with_me",
  "watching",
]);

export const sessionStatusSchema = z.enum([
  "idle",
  "active",
  "paused",
  "ended",
]);

export const sessionStateSchema = z.enum([
  "IDLE",
  "ACTIVE_SESSION",
  "OBSERVE",
  "INTERPRET",
  "ASSIST",
  "WAIT",
  "ACTION_PROPOSED",
  "COUNTERSIGN",
  "ACT",
  "ASK",
  "HOLD",
  "TASK_COMPLETE",
]);

export const relaySessionSchema = z.object({
  sessionId: idSchema,
  mode: sessionModeSchema,
  status: sessionStatusSchema,
  state: sessionStateSchema,
  startedAt: timestampSchema,
  endedAt: timestampSchema.optional(),
  taskId: idSchema.optional(),
  userId: idSchema.optional(),
});
