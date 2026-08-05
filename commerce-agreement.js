// CyberCrowd CyberShop
// Commerce Agreement Model
// 
// Purpose:
// Preserve accepted exchange terms
// between CyberShop participants.
//
// Owns:
// - agreement record shape
// - transaction linkage
// - agreement state
// - agreement evidence
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
// Commerce Agreement Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeAgreementId() {
  return `agreement.${Date.now()}.${Math.random()
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

export function createCommerceAgreement(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    agreementId:
      makeAgreementId(),

    transactionId:
      clean.transactionId || null,

    requestId:
      clean.requestId || null,

    offerId:
      clean.offerId || null,

    customerActionId:
      clean.customerActionId || null,

    fulfillmentId:
      clean.fulfillmentId || null,

    agreementState:
      clean.agreementState || "accepted",

    terms:
      safeClone(clean.terms),

    metadata:
      safeClone(clean.metadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "COMMERCE_AGREEMENT_RECORDED",

    authorityBoundary:
      "AGREEMENT_RECORD_PRESERVES_EXCHANGE_TERMS_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readCommerceAgreementShape() {
  return {
    ok: true,

    name:
      "commerce-agreement",

    stage:
      "cybershop-commerce-agreement",

    fields: [
      "agreementId",
      "transactionId",
      "requestId",
      "offerId",
      "customerActionId",
      "fulfillmentId",
      "agreementState",
      "terms",
      "metadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const CommerceAgreement = {
  createCommerceAgreement,
  readCommerceAgreementShape,
};
