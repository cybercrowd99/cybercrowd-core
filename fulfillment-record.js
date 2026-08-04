/**
 * CyberCrowd CORE — CyberShop Fulfillment Record Model
 *
 * Layer:
 * CORE / CyberShop Commerce Evidence Boundary
 *
 * Purpose:
 * Preserve evidence that a commerce obligation
 * moved through fulfillment lifecycle states.
 *
 * Owns:
 * - fulfillment record shape
 * - transaction linkage reference
 * - order linkage reference
 * - service/product fulfillment evidence
 * - completion tracking evidence
 *
 * Does NOT Own:
 * - payment execution
 * - banking accounts
 * - custody of funds
 * - financial authority
 * - identity verification
 * - participant relationships
 * - commerce UI
 * - NET surfaces
 *
 * Boundary:
 * Fulfillment lifecycle information enters CORE
 * as evidence and record linkage only.
 * CORE preserves completion evidence without
 * controlling financial activity.
 *
 * Security:
 * - No hidden synchronization
 * - No identity binding
 * - No behavioral profiling
 * - No external side effects
 *
 * Doctrine:
 * Fulfillment Evidence ≠ Financial Authority
 */

// fulfillment-record.ts

function nowISO() {
  return new Date().toISOString();
}

function makeFulfillmentId() {
  return `fulfillment.${Date.now()}.${Math.random()
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

export function createFulfillmentRecord(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    fulfillmentId:
      makeFulfillmentId(),

    transactionId:
      clean.transactionId || null,

    orderId:
      clean.orderId || null,

    requestId:
      clean.requestId || null,

    offerId:
      clean.offerId || null,

    providerId:
      clean.providerId || null,

    customerId:
      clean.customerId || null,

    fulfillmentType:
      clean.fulfillmentType || "commerce-fulfillment",

    fulfillmentState:
      clean.fulfillmentState || "created",

    scheduledAt:
      clean.scheduledAt || null,

    completedAt:
      clean.completedAt || null,

    fulfillmentMetadata:
      safeClone(clean.fulfillmentMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "FULFILLMENT_RECORD_CREATED",

    authorityBoundary:
      "FULFILLMENT_RECORD_PRESERVES_COMMERCE_COMPLETION_EVIDENCE_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readFulfillmentRecordShape() {
  return {
    ok: true,

    name:
      "fulfillment-record",

    stage:
      "cybershop-commerce-fulfillment-record",

    fields: [
      "fulfillmentId",
      "transactionId",
      "orderId",
      "requestId",
      "offerId",
      "providerId",
      "customerId",
      "fulfillmentType",
      "fulfillmentState",
      "scheduledAt",
      "completedAt",
      "fulfillmentMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const FulfillmentRecord = {
  createFulfillmentRecord,
  readFulfillmentRecordShape,
};
