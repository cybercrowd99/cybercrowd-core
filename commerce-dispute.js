// CyberCrowd CyberShop
// Commerce Dispute Model
// 
// Purpose:
// Preserve disagreement-state evidence inside
// the CyberShop commerce lifecycle.
//
// Owns:
// - dispute record shape
// - transaction linkage
// - receipt linkage
// - feedback linkage
// - dispute evidence
//
// Does NOT own:
// - dispute decisions
// - payment execution
// - banking accounts
// - custody of funds
// - financial authority
// - credit decisions
// - identity verification
// - participant relationships
//
// Doctrine:
// Commerce Dispute Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeDisputeId() {
  return `dispute.${Date.now()}.${Math.random()
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

export function createCommerceDispute(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    disputeId:
      makeDisputeId(),

    transactionId:
      clean.transactionId || null,

    receiptId:
      clean.receiptId || null,

    feedbackId:
      clean.feedbackId || null,

    fulfillmentId:
      clean.fulfillmentId || null,

    customerActionId:
      clean.customerActionId || null,

    disputeType:
      clean.disputeType || "commerce-dispute",

    disputeState:
      clean.disputeState || "opened",

    disputeMetadata:
      safeClone(clean.disputeMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "COMMERCE_DISPUTE_RECORDED",

    authorityBoundary:
      "DISPUTE_RECORD_PRESERVES_DISAGREEMENT_STATE_DOES_NOT_CONTROL_OUTCOME_OR_FINANCIAL_ACTIVITY",
  };
}

export function readCommerceDisputeShape() {
  return {
    ok: true,

    name:
      "commerce-dispute",

    stage:
      "cybershop-commerce-dispute",

    fields: [
      "disputeId",
      "transactionId",
      "receiptId",
      "feedbackId",
      "fulfillmentId",
      "customerActionId",
      "disputeType",
      "disputeState",
      "disputeMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const CommerceDispute = {
  createCommerceDispute,
  readCommerceDisputeShape,
};
