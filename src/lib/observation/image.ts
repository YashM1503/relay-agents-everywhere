import { z } from "zod";

export const imageObservationSchema = z.object({
  source: z.literal("image"),
  timestamp: z.string(),
  content: z.object({
    imageRef: z.string(),
    caption: z.string().optional(),
  }),
  confidence: z.number().min(0).max(1).optional(),
});

export type ImageObservation = z.infer<typeof imageObservationSchema>;

export function normalizeImageObservation(
  imageRef: string,
  caption?: string,
  confidence?: number,
): ImageObservation {
  return {
    source: "image",
    timestamp: new Date().toISOString(),
    content: { imageRef, caption },
    confidence: confidence ?? 0.9,
  };
}
