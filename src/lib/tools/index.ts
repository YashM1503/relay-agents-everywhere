export {
  explainForm,
  loadClinicForm,
  readDocument,
  resetClinicFormSubmissions,
  submitRegistration,
} from "./clinic-form";
export type {
  ClinicFormData,
  SubmitRegistrationError,
  SubmitRegistrationPayload,
  SubmitRegistrationResult,
  SubmitRegistrationSuccess,
} from "./clinic-form";

export {
  loadInsuranceCardTemplate,
  parseSyntheticInsurance,
  uploadInsurance,
} from "./insurance";
export type { InsuranceCardData, InsuranceOcrResult } from "./insurance";

export {
  addAppointment,
  addReminder,
  getAppointmentSlot,
  loadAppointmentSlots,
} from "./calendar";
export type { AddAppointmentResult, AppointmentSlot } from "./calendar";

export { getUserActionPolicy, loadUserProfile } from "./profile";
export type { UserProfile } from "./profile";

/** Tier-3 money transfer — always blocked from auto-execution in demo. */
export function sendMoney(payload: {
  amount: number;
  recipient: string;
  memo?: string;
}): { success: false; blocked: true; reason: string; payload: typeof payload } {
  return {
    success: false,
    blocked: true,
    reason: "Money transfers require strong verification and never auto-run in demo mode.",
    payload,
  };
}
