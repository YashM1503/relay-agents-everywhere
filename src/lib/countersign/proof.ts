import { loadDemoJson } from "@/lib/tools/demo-data";
import type { ActionProposal, ProofCheck, ProofCheckResult, TaskState } from "./types";

type ClinicFormField = {
  key: string;
  label: string;
  sensitive: boolean;
};

type ClinicFormData = {
  form_id: string;
  organization: string;
  fields: ClinicFormField[];
};

const SUBMIT_ACTIONS = new Set(["submit_registration", "submit_form"]);

export function isSubmitRegistrationAction(actionType: string): boolean {
  const normalized = actionType.toLowerCase().replace(/-/g, "_");
  return SUBMIT_ACTIONS.has(normalized);
}

export function getClinicSensitiveFieldKeys(): string[] {
  const form = loadDemoJson<ClinicFormData>("clinic_form.json");
  return form.fields.filter((field) => field.sensitive).map((field) => field.key);
}

export function enumerateSensitiveFields(
  proposal: ActionProposal,
  task: TaskState,
): string[] {
  if (proposal.sensitive_fields?.length) {
    return [...proposal.sensitive_fields];
  }

  const clinicSensitive = new Set(getClinicSensitiveFieldKeys());
  const fromTask = Object.keys(task.known_fields).filter((key) =>
    clinicSensitive.has(key),
  );
  const fromPayload = Object.keys(proposal.payload ?? {}).filter((key) =>
    clinicSensitive.has(key),
  );

  return [...new Set([...fromTask, ...fromPayload])];
}

function destinationVerified(proposal: ActionProposal, task: TaskState): boolean {
  return Boolean(proposal.destination_verified ?? task.destination_verified);
}

function userAcceptedTask(task: TaskState): boolean {
  if (task.accepted_by_user === true) return true;
  const acceptedStatuses = new Set(["accepted", "in_progress", "ready_to_submit"]);
  return acceptedStatuses.has(task.status);
}

function hasContradictions(task: TaskState): boolean {
  return (task.contradictions?.length ?? 0) > 0;
}

export function checkSubmitRegistrationProof(
  proposal: ActionProposal,
  task: TaskState,
): ProofCheckResult {
  const sensitiveFields = enumerateSensitiveFields(proposal, task);
  const checks: ProofCheck[] = [
    {
      obligation: "destination_verified",
      passed: destinationVerified(proposal, task),
      message: destinationVerified(proposal, task)
        ? `Destination "${proposal.target}" verified`
        : `Destination "${proposal.target}" is not verified`,
    },
    {
      obligation: "user_accepted_task",
      passed: userAcceptedTask(task),
      message: userAcceptedTask(task)
        ? "User accepted the registration task"
        : "User has not accepted the registration task",
    },
    {
      obligation: "sensitive_fields_enumerated",
      passed: sensitiveFields.length > 0,
      message:
        sensitiveFields.length > 0
          ? `Sensitive fields enumerated: ${sensitiveFields.join(", ")}`
          : "No sensitive fields enumerated for submission",
    },
    {
      obligation: "no_contradictions",
      passed: !hasContradictions(task),
      message: hasContradictions(task)
        ? "Unresolved contradictions between profile and captured documents"
        : "No contradictions between known sources",
    },
    {
      obligation: "required_fields_resolved",
      passed: task.unresolved_fields.length === 0,
      message:
        task.unresolved_fields.length === 0
          ? "All required fields resolved"
          : `Unresolved fields: ${task.unresolved_fields.join(", ")}`,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}
