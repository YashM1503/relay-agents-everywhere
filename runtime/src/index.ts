/**
 * Public entry point. Builder A's Next.js API routes call these directly (same repo),
 * or hit server.ts over HTTP during independent development.
 */
export { handleObservation, handleConfirm } from "./flow/orchestrator";
export { opening } from "./flow/respond";
export { createSession, endSession, getSession } from "./state/sessionStore";
export { toView as receiptToView } from "./receipts/store";
export { hashPayload, newId } from "./util/ids";
export * from "./contracts/builderA";
export * from "./contracts/domain";
