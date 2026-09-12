import { loadDemoJson } from "./demo-data";

export type AppointmentSlot = {
  id: string;
  label: string;
  accessible_entry_confirmed: boolean;
};

type AppointmentSlotsData = {
  slots: AppointmentSlot[];
};

export function loadAppointmentSlots(): AppointmentSlot[] {
  const data = loadDemoJson<AppointmentSlotsData>("appointment_slots.json");
  return data.slots;
}

export function getAppointmentSlot(slotId: string): AppointmentSlot | undefined {
  return loadAppointmentSlots().find((slot) => slot.id === slotId);
}

export type AddAppointmentResult = {
  success: true;
  slot: AppointmentSlot;
  event_id: string;
};

export function addAppointment(slotId: string): AddAppointmentResult {
  const slot = getAppointmentSlot(slotId);
  if (!slot) {
    throw new Error(`Appointment slot not found: ${slotId}`);
  }

  return {
    success: true,
    slot,
    event_id: `evt-${slotId}`,
  };
}

export function addReminder(payload: {
  title: string;
  slot_id?: string;
  at?: string;
}): { success: true; reminder_id: string; title: string } {
  const suffix = payload.slot_id ?? payload.at ?? "general";
  return {
    success: true,
    reminder_id: `rem-${suffix}`,
    title: payload.title,
  };
}
