import { z } from "zod";
import { idSchema } from "./primitives";
import { proofRequirementSchema } from "./countersign";

export const actionTierSchema = z.enum(["T0", "T1", "T2", "T3"]);

export const actionTypeSchema = z.enum([
  "explain",
  "summarize",
  "search",
  "draft",
  "create_reminder",
  "create_calendar_event",
  "request_availability",
  "send_message",
  "share_document",
  "submit_form",
  "book_appointment",
  "cancel_appointment",
  "upload_insurance",
  "money_transfer",
  "change_bank_details",
  "sign_agreement",
  "share_ssn",
  "release_medical_record",
]);

export const actionProposalSchema = z.object({
  actionId: idSchema,
  actionType: actionTypeSchema,
  target: z.string().min(1),
  payloadSummary: z.string().min(1),
  tier: actionTierSchema,
  reversible: z.boolean(),
  proofRequirements: z.array(proofRequirementSchema),
  sensitiveFields: z.array(z.string()).optional(),
  recipient: z.string().optional(),
  purpose: z.string().optional(),
});
