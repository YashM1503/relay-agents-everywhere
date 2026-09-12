import { loadDemoJson } from "./demo-data";

export type ClinicFormField = {
  key: string;
  label: string;
  source: string;
  sensitive: boolean;
};

export type ClinicFormData = {
  form_id: string;
  organization: string;
  purpose: string;
  fields: ClinicFormField[];
  deliberate_error: {
    trigger: string;
    machine_message: string;
    relay_translation: string;
  };
};

export type SubmitRegistrationPayload = {
  action_id: string;
  insurance_front?: string;
  insurance_back?: string;
  [key: string]: unknown;
};

export type SubmitRegistrationSuccess = {
  success: true;
  confirmation_code: string;
  form_id: string;
  organization: string;
  idempotent: boolean;
};

export type SubmitRegistrationError = {
  success: false;
  error_code: "DOCUMENT_SIDE_REQUIRED_1029";
  message: string;
  relay_translation: string;
};

export type SubmitRegistrationResult = SubmitRegistrationSuccess | SubmitRegistrationError;

const submittedActions = new Map<string, SubmitRegistrationSuccess>();

export function loadClinicForm(): ClinicFormData {
  return loadDemoJson<ClinicFormData>("clinic_form.json");
}

function buildConfirmationCode(actionId: string): string {
  const digits = actionId.replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `DEMO-${digits || "48291"}`;
}

export function submitRegistration(
  payload: SubmitRegistrationPayload,
): SubmitRegistrationResult {
  const form = loadClinicForm();
  const existing = submittedActions.get(payload.action_id);

  if (existing) {
    return { ...existing, idempotent: true };
  }

  if (!payload.insurance_back) {
    return {
      success: false,
      error_code: "DOCUMENT_SIDE_REQUIRED_1029",
      message: form.deliberate_error.machine_message,
      relay_translation: form.deliberate_error.relay_translation,
    };
  }

  const result: SubmitRegistrationSuccess = {
    success: true,
    confirmation_code: buildConfirmationCode(payload.action_id),
    form_id: form.form_id,
    organization: form.organization,
    idempotent: false,
  };

  submittedActions.set(payload.action_id, result);
  return result;
}

/** Clears submission cache — for tests and demo mode resets. */
export function resetClinicFormSubmissions(): void {
  submittedActions.clear();
}

export function explainForm(): ClinicFormData {
  return loadClinicForm();
}

export function readDocument(documentRef: string): {
  document_ref: string;
  summary: string;
} {
  const form = loadClinicForm();
  return {
    document_ref: documentRef,
    summary: `${form.organization}: ${form.purpose}`,
  };
}
