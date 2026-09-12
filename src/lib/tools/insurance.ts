import { loadDemoJson } from "./demo-data";

export type InsuranceCardData = {
  synthetic: boolean;
  member_name: string;
  plan: string;
  member_id: string;
  group: string;
  rx_bin: string;
  note: string;
};

export type InsuranceOcrResult = {
  side: "front" | "back";
  confidence: number;
  fields: InsuranceCardData;
  synthetic: true;
};

export function loadInsuranceCardTemplate(): InsuranceCardData {
  return loadDemoJson<InsuranceCardData>("insurance_card.json");
}

/** Simulates OCR extraction from a captured insurance card image. */
export function parseSyntheticInsurance(
  side: "front" | "back" = "front",
): InsuranceOcrResult {
  const fields = loadInsuranceCardTemplate();
  return {
    side,
    confidence: 0.98,
    fields,
    synthetic: true,
  };
}

export function uploadInsurance(payload: {
  insurance_front?: string;
  insurance_back?: string;
}): { stored: string[]; ocr: InsuranceOcrResult[] } {
  const stored: string[] = [];
  const ocr: InsuranceOcrResult[] = [];

  if (payload.insurance_front) {
    stored.push("insurance_front");
    ocr.push(parseSyntheticInsurance("front"));
  }
  if (payload.insurance_back) {
    stored.push("insurance_back");
    ocr.push(parseSyntheticInsurance("back"));
  }

  return { stored, ocr };
}
