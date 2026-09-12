import { randomUUID } from "node:crypto";
import type { DecisionReceipt } from "../contracts/domain";
import type { ReceiptView } from "../contracts/builderA";

const receipts = new Map<string, DecisionReceipt>();

export function createReceipt(input: Omit<DecisionReceipt, "receipt_id" | "executed_at">): DecisionReceipt {
  const r: DecisionReceipt = { ...input, receipt_id: `r_${randomUUID().slice(0, 8)}`, executed_at: new Date().toISOString() };
  receipts.set(r.receipt_id, r);
  return r;
}

export function getReceipt(id: string): DecisionReceipt | undefined {
  return receipts.get(id);
}

export function findReceiptByAction(actionId: string): DecisionReceipt | undefined {
  return [...receipts.values()].find((r) => r.action_id === actionId && r.result === "success");
}

export function listReceipts(): DecisionReceipt[] {
  return [...receipts.values()];
}

export function resetReceipts(): void {
  receipts.clear();
}

/** Human-readable, sensitive-minimized view for the phone. */
export function toView(r: DecisionReceipt): ReceiptView {
  const what = r.action_type === "submit_form" ? "Registration" : r.action_type.replace(/_/g, " ");
  const summary =
    r.result === "success"
      ? `${what} submitted to ${r.target}${r.confirmed_by_user ? " after your confirmation" : ""}.`
      : `${what} to ${r.target}: ${r.result}.`;
  return { receipt_id: r.receipt_id, summary, confirmation_code: r.confirmation_code, follow_up: r.follow_up };
}
