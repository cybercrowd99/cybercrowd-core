// CyberCrowd CyberShop
// Transaction Outcome Model
//
// Purpose:
// Preserve evidence of resulting transaction
// lifecycle outcomes within CyberShop.
//
// Owns:
// - transaction outcome record shape
// - transaction reference
// - decision linkage
// - fulfillment linkage
// - outcome evidence
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
// Transaction Outcome Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeTransactionOutcomeId() {
  return `transaction-outcome.${Date.now()}.${Math.random()
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

export function createTransactionOutcome(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    transactionOutcomeId:
      makeTransactionOutcomeId(),

    transactionId:
      clean.transactionId || null,

    transactionDecisionId:
      clean.transactionDecisionId || null,

    customerActionId:
      clean.customerActionId || null,

    fulfillmentId:
      clean.fulfillmentId || null,

    receiptId:
      clean.receiptId || null,

    outcomeType:
      clean.outcomeType || "commerce-transaction-outcome",

    outcomeState:
      clean.outcomeState || "recorded",

    outcomeMetadata:
      safeClone(clean.outcomeMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "TRANSACTION_OUTCOME_RECORDED",

    authorityBoundary:
      "TRANSACTION_OUTCOME_PRESERVES_LIFECYCLE_RESULT_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readTransactionOutcomeShape() {
  return {
    ok: true,

    name:
      "transaction-outcome",

    stage:
      "cybershop-commerce-transaction-outcome",

    fields: [
      "transactionOutcomeId",
      "transactionId",
      "transactionDecisionId",
      "customerActionId",
      "fulfillmentId",
      "receiptId",
      "outcomeType",
      "outcomeState",
      "outcomeMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const TransactionOutcome = {
  createTransactionOutcome,
  readTransactionOutcomeShape,
};

