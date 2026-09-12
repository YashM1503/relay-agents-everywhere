import { z } from "zod";
import { idSchema } from "./primitives";
import { observationSchema } from "./observation";
import { taskStateSchema } from "./task";

export const accessibilityPreferencesSchema = z.object({
  largeText: z.boolean(),
  voiceFirst: z.boolean(),
  oneQuestionAtATime: z.boolean(),
  language: z.string().min(1),
  readImportantChoicesAloud: z.boolean().optional(),
  stepFreePreferred: z.boolean().optional(),
  highContrast: z.boolean().optional(),
});

export const permissionPolicyLevelSchema = z.enum([
  "auto",
  "ask",
  "always_ask",
  "never_auto",
]);

export const permissionPolicySchema = z.object({
  draft: permissionPolicyLevelSchema.optional(),
  calendar: permissionPolicyLevelSchema.optional(),
  sendMessage: permissionPolicyLevelSchema.optional(),
  shareDocument: permissionPolicyLevelSchema.optional(),
  submitForm: permissionPolicyLevelSchema.optional(),
  purchase: permissionPolicyLevelSchema.optional(),
  moneyTransfer: permissionPolicyLevelSchema.optional(),
});

export const connectedSourceSchema = z.object({
  id: idSchema,
  kind: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["connected", "disconnected", "mock"]).optional(),
});

export const contextItemSchema = z.object({
  id: idSchema,
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string().min(1),
  timestamp: z.string().optional(),
});

export const relayContextSchema = z.object({
  userPreferences: accessibilityPreferencesSchema,
  currentEnvironment: z.array(observationSchema),
  currentTask: taskStateSchema,
  conversationContext: z.array(contextItemSchema),
  connectedSources: z.array(connectedSourceSchema),
  permissions: permissionPolicySchema,
});
