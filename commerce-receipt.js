// CyberCrowd CyberShop Core
// Commerce Receipt Model
//
// Purpose:
// Preserve evidence that a CyberShop exchange
// produced a recorded receipt state.
//
// Owns:
// - receipt record shape
// - transaction linkage
// - completion linkage
// - outcome linkage
// - receipt evidence
//
// Does NOT own:
// - payment execution
// - banking accounts
// - custody of funds
// - financial authority
// - credit decisions
// - identity verification
// - participant relationships
//
// Doctrine:
// Commerce Receipt Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeReceiptId() {
  return `receipt.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function safeClone(value) {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function normalizeInput(input = {}) {
  if (!input || typeof input !== "object") {
    return {};
  }

  return input;
}

export function createCommerceReceipt(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    receiptId:
      makeReceiptId(),

    transactionId:
      clean.transactionId || null,

    transactionOutcomeId:
      clean.transactionOutcomeId || null,

    completionId:
      clean.completionId || null,

    fulfillmentId:
      clean.fulfillmentId || null,

    agreementId:
      clean.agreementId || null,

    receiptState:
      clean.receiptState || "recorded",

    receiptMetadata:
      safeClone(clean.receiptMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "COMMERCE_RECEIPT_RECORDED",

    authorityBoundary:
      "RECEIPT_RECORD_PRESERVES_EXCHANGE_HISTORY_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readCommerceReceiptShape() {
  return {
    ok: true,

    name:
      "commerce-receipt",

    stage:
      "cybershop-commerce-receipt",

    fields: [
      "receiptId",
      "transactionId",
      "transactionOutcomeId",
      "completionId",
      "fulfillmentId",
      "agreementId",
      "receiptState",
      "receiptMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const CommerceReceipt = {
  createCommerceReceipt,
  readCommerceReceiptShape,
};
