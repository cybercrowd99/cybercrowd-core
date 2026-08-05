// CyberCrowd CyberShop
// Commerce Feedback Model
// 
// Purpose:
// Preserve participant feedback evidence
// inside the CyberShop commerce lifecycle.
//
// Owns:
// - feedback record shape
// - transaction linkage
// - receipt linkage
// - fulfillment linkage
// - feedback evidence
//
// Does NOT own:
// - payment execution
// - banking accounts
// - custody of funds
// - financial authority
// - credit decisions
// - identity verification
// - dispute decisions
// - participant relationships
//
// Doctrine:
// Commerce Feedback Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeFeedbackId() {
  return `feedback.${Date.now()}.${Math.random()
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

export function createCommerceFeedback(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    feedbackId:
      makeFeedbackId(),

    transactionId:
      clean.transactionId || null,

    receiptId:
      clean.receiptId || null,

    fulfillmentId:
      clean.fulfillmentId || null,

    customerActionId:
      clean.customerActionId || null,

    providerId:
      clean.providerId || null,

    feedbackType:
      clean.feedbackType || "commerce-feedback",

    feedbackState:
      clean.feedbackState || "recorded",

    feedbackMetadata:
      safeClone(clean.feedbackMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "COMMERCE_FEEDBACK_RECORDED",

    authorityBoundary:
      "FEEDBACK_RECORD_PRESERVES_PARTICIPANT_EXPERIENCE_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readCommerceFeedbackShape() {
  return {
    ok: true,

    name:
      "commerce-feedback",

    stage:
      "cybershop-commerce-feedback",

    fields: [
      "feedbackId",
      "transactionId",
      "receiptId",
      "fulfillmentId",
      "customerActionId",
      "providerId",
      "feedbackType",
      "feedbackState",
      "feedbackMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const CommerceFeedback = {
  createCommerceFeedback,
  readCommerceFeedbackShape,
};
