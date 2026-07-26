// CyberCrowd CyberShop
// Payment Connector Model
//
// Purpose:
// Preserve the controlled boundary between
// CyberShop commerce lifecycle records and
// external payment provider connections.
//
// Owns:
// - payment connector record shape
// - provider reference
// - payment request linkage
// - connector state evidence
//
// Does NOT own:
// - banking accounts
// - custody of funds
// - financial authority
// - credit decisions
// - payment execution authority
// - identity verification
// - participant relationships
//
// Doctrine:
// Payment Connector Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makePaymentConnectorId() {
  return `payment-connector.${Date.now()}.${Math.random()
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

export function createPaymentConnector(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    paymentConnectorId:
      makePaymentConnectorId(),

    transactionId:
      clean.transactionId || null,

    authorizationId:
      clean.authorizationId || null,

    providerId:
      clean.providerId || null,

    connectorType:
      clean.connectorType || "external-payment-provider",

    connectorState:
      clean.connectorState || "connected",

    paymentRequestReference:
      clean.paymentRequestReference || null,

    connectorMetadata:
      safeClone(clean.connectorMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "PAYMENT_CONNECTOR_RECORDED",

    authorityBoundary:
      "PAYMENT_CONNECTOR_PRESERVES_PROVIDER_LINKAGE_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readPaymentConnectorShape() {
  return {
    ok: true,

    name:
      "payment-connector",

    stage:
      "cybershop-commerce-payment-connector",

    fields: [
      "paymentConnectorId",
      "transactionId",
      "authorizationId",
      "providerId",
      "connectorType",
      "connectorState",
      "paymentRequestReference",
      "connectorMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const PaymentConnector = {
  createPaymentConnector,
  readPaymentConnectorShape,
};
