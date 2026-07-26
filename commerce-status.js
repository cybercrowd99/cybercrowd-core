// CyberCrowd CyberShop
// Commerce Status Model
//
// Purpose:
// Preserve stable commerce lifecycle status evidence.
//
// Owns:
// - status record shape
// - lifecycle state reference
// - transaction linkage
// - status transitions
// - status evidence
//
// Does NOT own:
// - payment execution
// - banking
// - custody of funds
// - financial authority
// - identity verification
//
// Doctrine:
// Commerce Status Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeStatusId() {
  return `commerce-status.${Date.now()}.${Math.random()
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

export function createCommerceStatus(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    statusId:
      makeStatusId(),

    transactionId:
      clean.transactionId || null,

    lifecycleState:
      clean.lifecycleState || "pending",

    previousState:
      clean.previousState || null,

    statusMetadata:
      safeClone(clean.statusMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "COMMERCE_STATUS_RECORDED",

    authorityBoundary:
      "COMMERCE_STATUS_PRESERVES_LIFECYCLE_EVIDENCE_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readCommerceStatusShape() {
  return {
    ok: true,

    name:
      "commerce-status",

    stage:
      "cybershop-commerce-status",

    fields: [
      "statusId",
      "transactionId",
      "lifecycleState",
      "previousState",
      "statusMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const CommerceStatus = {
  createCommerceStatus,
  readCommerceStatusShape,
};
