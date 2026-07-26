// CyberCrowd CyberShop
// Customer Action Model
//
// Purpose:
// Preserve evidence of customer-controlled actions
// within the CyberShop commerce lifecycle.
//
// Owns:
// - customer action record shape
// - customer action reference
// - transaction linkage
// - request linkage
// - order linkage
// - action evidence
//
// Does NOT own:
// - payment execution
// - fulfillment decisions
// - banking accounts
// - custody of funds
// - financial authority
// - identity verification
// - participant relationships
//
// Doctrine:
// Customer Action Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeCustomerActionId() {
  return `customer-action.${Date.now()}.${Math.random()
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

export function createCustomerAction(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    customerActionId:
      makeCustomerActionId(),

    customerId:
      clean.customerId || null,

    transactionId:
      clean.transactionId || null,

    requestId:
      clean.requestId || null,

    orderId:
      clean.orderId || null,

    offerId:
      clean.offerId || null,

    actionType:
      clean.actionType || "commerce-action",

    actionState:
      clean.actionState || "recorded",

    actionMetadata:
      safeClone(clean.actionMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "CUSTOMER_ACTION_RECORDED",

    authorityBoundary:
      "CUSTOMER_ACTION_PRESERVES_USER_COMMERCE_INTENT_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readCustomerActionShape() {
  return {
    ok: true,

    name:
      "customer-action",

    stage:
      "cybershop-commerce-customer-action",

    fields: [
      "customerActionId",
      "customerId",
      "transactionId",
      "requestId",
      "orderId",
      "offerId",
      "actionType",
      "actionState",
      "actionMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const CustomerAction = {
  createCustomerAction,
  readCustomerActionShape,
};
