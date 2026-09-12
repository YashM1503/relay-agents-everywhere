import { z } from "zod";

export const timestampSchema = z.string().datetime({ offset: true }).or(z.string().min(1));

export const idSchema = z.string().min(1);

export const confidenceSchema = z.number().min(0).max(1);

export const metadataSchema = z.record(z.unknown());
