// CyberCrowd CyberShop
// Transaction Decision Model
//
// Purpose:
// Preserve evidence of controlled transaction
// lifecycle decisions within CyberShop.
//
// Owns:
// - transaction decision record shape
// - transaction reference
// - decision state
// - decision evidence
//
// Does NOT own:
// - payment execution
// - banking accounts
// - custody of funds
// - financial authority
// - credit decisions
// - identity verification
// - fulfillment execution 
//
// Doctrine:
// Transaction Decision Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeTransactionDecisionId() {
  return `transaction-decision.${Date.now()}.${Math.random()
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

export function createTransactionDecision(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    transactionDecisionId:
      makeTransactionDecisionId(),

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

    decisionType:
      clean.decisionType || "commerce-transaction-decision",

    decisionState:
      clean.decisionState || "recorded",

    decisionMetadata:
      safeClone(clean.decisionMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "TRANSACTION_DECISION_RECORDED",

    authorityBoundary:
      "TRANSACTION_DECISION_PRESERVES_COMMERCE_LIFECYCLE_STATE_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readTransactionDecisionShape() {
  return {
    ok: true,

    name:
      "transaction-decision",

    stage:
      "cybershop-commerce-transaction-decision",

    fields: [
      "transactionDecisionId",
      "transactionId",
      "requestId",
      "offerId",
      "customerActionId",
      "fulfillmentId",
      "decisionType",
      "decisionState",
      "decisionMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const TransactionDecision = {
  createTransactionDecision,
  readTransactionDecisionShape,
};
