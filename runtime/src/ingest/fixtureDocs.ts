/**
 * Deterministic "documents" for tests and the demo page. An image observation whose content is
 * "fixture:<name>" is resolved here instead of going to a vision model.
 *
 *   fixture:insurance_front            sample card, front
 *   fixture:insurance_front:mismatch   sample card with a name that differs from the profile
 *   fixture:insurance_back             sample card, back
 *   fixture:unreadable                 blurry photo
 *   fixture:qr:<url>                   a QR code that decodes to <url>
 */
import type { FieldValue } from "../contracts/domain";
import { fixtures } from "../fixtures/load";

export interface VisionExtraction {
  document_kind: "insurance_card_front" | "insurance_card_back" | "qr" | "unknown";
  fields: FieldValue[];
  uncertainties: string[];
  decoded_url?: string;
  demo_extraction?: boolean;
}

const doc = (key: string, value: string): FieldValue => ({ key, value, provenance: "document", sensitive: true });

export function isFixtureRef(content: string): boolean {
  return content.startsWith("fixture:");
}

export function fixtureExtraction(content: string): VisionExtraction {
  const card = fixtures.insuranceCard() as Record<string, string>;
  const parts = content.split(":");
  const name = parts[1];
  if (name === "insurance_front") {
    const mismatch = parts[2] === "mismatch";
    return {
      document_kind: "insurance_card_front",
      fields: [
        doc("member_name", mismatch ? "Evelyn Brookes" : card.member_name),
        doc("member_id", card.member_id),
        doc("group", card.group),
        doc("plan", card.plan),
      ],
      uncertainties: [],
    };
  }
  if (name === "insurance_back") {
    return {
      document_kind: "insurance_card_back",
      fields: [doc("rx_bin", card.rx_bin), doc("customer_service_phone", "+1-555-010-0000")],
      uncertainties: [],
    };
  }
  if (name === "qr") {
    return { document_kind: "qr", fields: [], uncertainties: [], decoded_url: parts.slice(2).join(":") };
  }
  return { document_kind: "unknown", fields: [], uncertainties: ["image unreadable"] };
}
