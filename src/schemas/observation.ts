import { z } from "zod";
import { idSchema, metadataSchema, timestampSchema } from "./primitives";

export const observationTypeSchema = z.enum([
  "voice",
  "image",
  "document",
  "screen",
  "event",
  "qr",
]);

export const observationSchema = z.object({
  id: idSchema,
  type: observationTypeSchema,
  source: z.string().min(1),
  contentRef: z.string().min(1),
  timestamp: timestampSchema,
  summary: z.string().optional(),
  metadata: metadataSchema.optional(),
});
