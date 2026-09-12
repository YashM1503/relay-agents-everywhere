import type { z } from "zod";
import type {
  accessibilityPreferencesSchema,
  actionProposalSchema,
  actionReceiptSchema,
  actionTierSchema,
  actionTypeSchema,
  agentCapabilitySchema,
  agentRegistryEntrySchema,
  agentRequestSchema,
  agentResultSchema,
  agentResultStatusSchema,
  artifactSchema,
  connectedSourceSchema,
  contextItemSchema,
  countersignDecisionSchema,
  countersignVerdictSchema,
  decisionReceiptSchema,
  demoActionPolicySchema,
  demoAgentRegistrySchema,
  demoAppointmentSlotsSchema,
  demoClinicFormSchema,
  demoInsuranceCardSchema,
  demoScenariosSchema,
  demoTrustedContactsSchema,
  demoUserProfileSchema,
  findingSchema,
  observationSchema,
  observationTypeSchema,
  permissionPolicySchema,
  proofRequirementSchema,
  relayContextSchema,
  relaySessionSchema,
  sessionModeSchema,
  sessionStateSchema,
  sessionStatusSchema,
  taskStateSchema,
  taskStatusSchema,
  userIntentSchema,
  verificationResultSchema,
} from "@/schemas";

export type Timestamp = z.infer<typeof import("@/schemas/primitives").timestampSchema>;

export type SessionMode = z.infer<typeof sessionModeSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;
export type RelaySession = z.infer<typeof relaySessionSchema>;

export type ObservationType = z.infer<typeof observationTypeSchema>;
export type Observation = z.infer<typeof observationSchema>;

export type UserIntent = z.infer<typeof userIntentSchema>;

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskState = z.infer<typeof taskStateSchema>;

export type AgentCapability = z.infer<typeof agentCapabilitySchema>;
export type AgentRegistryEntry = z.infer<typeof agentRegistryEntrySchema>;
export type AgentRequest = z.infer<typeof agentRequestSchema>;
export type AgentResultStatus = z.infer<typeof agentResultStatusSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Artifact = z.infer<typeof artifactSchema>;

export type ActionTier = z.infer<typeof actionTierSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;
export type ActionProposal = z.infer<typeof actionProposalSchema>;

export type ProofRequirement = z.infer<typeof proofRequirementSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;
export type CountersignVerdict = z.infer<typeof countersignVerdictSchema>;
export type CountersignDecision = z.infer<typeof countersignDecisionSchema>;

export type ActionReceipt = z.infer<typeof actionReceiptSchema>;
export type DecisionReceipt = z.infer<typeof decisionReceiptSchema>;

export type AccessibilityPreferences = z.infer<typeof accessibilityPreferencesSchema>;
export type PermissionPolicy = z.infer<typeof permissionPolicySchema>;
export type ConnectedSource = z.infer<typeof connectedSourceSchema>;
export type ContextItem = z.infer<typeof contextItemSchema>;
export type RelayContext = z.infer<typeof relayContextSchema>;

export type DemoUserProfile = z.infer<typeof demoUserProfileSchema>;
export type DemoTrustedContacts = z.infer<typeof demoTrustedContactsSchema>;
export type DemoInsuranceCard = z.infer<typeof demoInsuranceCardSchema>;
export type DemoScenarios = z.infer<typeof demoScenariosSchema>;
export type DemoClinicForm = z.infer<typeof demoClinicFormSchema>;
export type DemoAppointmentSlots = z.infer<typeof demoAppointmentSlotsSchema>;
export type DemoAgentRegistry = z.infer<typeof demoAgentRegistrySchema>;
export type DemoActionPolicy = z.infer<typeof demoActionPolicySchema>;
