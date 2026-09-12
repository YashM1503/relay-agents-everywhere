/**
 * Minimal local types until @/schemas lands (Sub-agent A).
 * Refactor imports to @/schemas or @/types when available.
 */

export type AgentCapability =
  | "vision"
  | "forms"
  | "conversation"
  | "tool_use"
  | "research"
  | "reasoning"
  | "task_execution"
  | "specialist"
  | "basic_summary";

export type AgentStatus = "live" | "adapter_placeholder" | "mock";

export type PrivacyClass = "cloud" | "device" | "unknown";

export interface AccessibilityPreferences {
  largeText?: boolean;
  voiceFirst?: boolean;
  oneQuestionAtATime?: boolean;
  language?: string;
}

export interface Observation {
  type: "voice" | "image" | "document" | "screen" | "event";
  source: string;
  contentRef?: string;
  timestamp?: string;
}

export interface TaskState {
  taskId: string;
  goal: string;
  status: string;
  knownFields?: Record<string, unknown>;
  unresolvedFields?: string[];
}

export interface ContextItem {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ConnectedSource {
  id: string;
  type: string;
}

export interface PermissionPolicy {
  sendMessages?: "auto" | "ask" | "never";
  shareDocuments?: "auto" | "ask" | "never";
  submitForms?: "auto" | "ask" | "never";
  moneyTransfer?: "never_auto" | "ask" | "never";
}

export interface RelayContext {
  userPreferences: AccessibilityPreferences;
  currentEnvironment: Observation[];
  currentTask: TaskState;
  conversationContext: ContextItem[];
  connectedSources: ConnectedSource[];
  permissions: PermissionPolicy;
}

export interface Finding {
  key: string;
  value: string;
  confidence?: number;
}

export interface Artifact {
  type: string;
  ref: string;
  label?: string;
}

export interface ActionProposal {
  actionId: string;
  actionType: string;
  description: string;
  tier?: number;
}

export type AgentResultStatus = "completed" | "needs_input" | "failed";

export interface AgentResult {
  status: AgentResultStatus;
  summary: string;
  findings: Finding[];
  artifacts: Artifact[];
  proposedActions: ActionProposal[];
  confidence?: number;
}

export type Modality = "text" | "image" | "audio";

export type LatencyTarget = "fast" | "medium" | "slow";

export type CostPreference = "low" | "medium" | "high";

export interface AgentRequest {
  taskType: string;
  requiredCapabilities: AgentCapability[];
  requiredModalities?: Modality[];
  requiresTools?: boolean;
  privacyRequirement?: PrivacyClass | "any";
  latencyTarget?: LatencyTarget;
  costPreference?: CostPreference;
  prompt: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRegistryEntry {
  id: string;
  display_name: string;
  capabilities: AgentCapability[];
  status: AgentStatus;
  privacy_class: PrivacyClass;
  modalities?: Modality[];
  tools_supported?: boolean;
  latency_class?: LatencyTarget;
  cost_class?: CostPreference;
  reliability_score?: number;
}

export interface AgentAdapter {
  id: string;
  capabilities: AgentCapability[];
  canHandle(task: AgentRequest): Promise<boolean>;
  execute(task: AgentRequest, context: RelayContext): Promise<AgentResult>;
  health(): Promise<{ available: boolean; reason?: string }>;
}

export interface RoutingDecision {
  primary_agent: string;
  fallback_agents: string[];
  reason_code: string;
  max_runtime_seconds: number;
  scores: Record<string, number>;
}

export interface AgentScoreBreakdown {
  capabilityMatch: number;
  privacy: number;
  multimodal: number;
  tools: number;
  latency: number;
  cost: number;
  availability: number;
  reliability: number;
  total: number;
}
