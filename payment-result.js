/**
 * CyberCrowd CORE
 * Payment Result Evidence Model
 *
 * Layer:
 * CORE / Commerce Evidence Boundary
 *
 * Owns:
 * - payment result record shape
 * - transaction linkage reference
 * - connector linkage reference
 * - authorization linkage reference
 * - external payment outcome evidence preservation
 *
 * Does NOT Own:
 * - banking accounts
 * - custody of funds
 * - financial authority
 * - credit decisions
 * - payment execution
 * - identity verification
 * - participant relationships
 * - commerce UI
 * - NET surfaces
 *
 * Boundary:
 * External payment outcome enters CORE
 * as evidence only.
 * CORE preserves the record boundary
 * without controlling financial activity.
 *
 * Doctrine:
 * Payment Result Evidence ≠ Financial Authority
 */

function nowISO() {
  return new Date().toISOString();
}

function makePaymentResultId() {
  return `payment-result.${Date.now()}.${Math.random()
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

export function createPaymentResult(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    paymentResultId:
      makePaymentResultId(),

    transactionId:
      clean.transactionId || null,

    paymentConnectorId:
      clean.paymentConnectorId || null,

    authorizationId:
      clean.authorizationId || null,

    providerId:
      clean.providerId || null,

    paymentReference:
      clean.paymentReference || null,

    resultType:
      clean.resultType || "external-payment-result",

    resultState:
      clean.resultState || "recorded",

    resultMetadata:
      safeClone(clean.resultMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "PAYMENT_RESULT_RECORDED",

    authorityBoundary:
      "PAYMENT_RESULT_PRESERVES_EXTERNAL_OUTCOME_EVIDENCE_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readPaymentResultShape() {
  return {
    ok: true,

    name:
      "payment-result",

    stage:
      "cybershop-commerce-payment-result",

    fields: [
      "paymentResultId",
      "transactionId",
      "paymentConnectorId",
      "authorizationId",
      "providerId",
      "paymentReference",
      "resultType",
      "resultState",
      "resultMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const PaymentResult = {
  createPaymentResult,
  readPaymentResultShape,
};
