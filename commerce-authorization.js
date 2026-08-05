// CyberCrowd CyberShop
// Commerce Authorization Model
// 
// Purpose:
// Preserve transaction-linked authorization evidence
// for CyberShop lifecycle actions.
//
// Owns:
// - authorization record shape
// - transaction linkage
// - authorization state
// - authorization evidence
//
// Does NOT own:
// - identity verification
// - payment execution
// - banking accounts
// - custody of funds
// - financial authority
// - credit decisions
// - participant relationships
//
// Doctrine:
// Commerce Authorization Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeAuthorizationId() {
  return `authorization.${Date.now()}.${Math.random()
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

export function createCommerceAuthorization(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    authorizationId:
      makeAuthorizationId(),

    transactionId:
      clean.transactionId || null,

    agreementId:
      clean.agreementId || null,

    customerActionId:
      clean.customerActionId || null,

    decisionId:
      clean.decisionId || null,

    authorizationState:
      clean.authorizationState || "authorized",

    authorizationMetadata:
      safeClone(clean.authorizationMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "COMMERCE_AUTHORIZATION_RECORDED",

    authorityBoundary:
      "AUTHORIZATION_RECORD_PRESERVES_COMMERCE_PERMISSION_STATE_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readCommerceAuthorizationShape() {
  return {
    ok: true,

    name:
      "commerce-authorization",

    stage:
      "cybershop-commerce-authorization",

    fields: [
      "authorizationId",
      "transactionId",
      "agreementId",
      "customerActionId",
      "decisionId",
      "authorizationState",
      "authorizationMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const CommerceAuthorization = {
  createCommerceAuthorization,
  readCommerceAuthorizationShape,
};
