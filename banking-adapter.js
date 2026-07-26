// CyberCrowd CyberShop
// Banking Adapter Model
//
// Purpose:
// Preserve the external banking-provider adapter boundary
// connected to CyberShop commerce lifecycle records.
//
// Owns:
// - banking adapter record shape
// - provider linkage
// - external service reference
// - adapter state evidence
//
// Does NOT own:
// - banking accounts
// - custody of funds
// - payment execution authority
// - financial authority
// - credit decisions
// - identity verification
// - participant relationships
//
// Doctrine:
// Banking Adapter Evidence ≠ Financial Authority

function nowISO() {
  return new Date().toISOString();
}

function makeBankingAdapterId() {
  return `banking-adapter.${Date.now()}.${Math.random()
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

export function createBankingAdapter(input = {}) {
  const clean = normalizeInput(input);

  return {
    ok: true,

    bankingAdapterId:
      makeBankingAdapterId(),

    transactionId:
      clean.transactionId || null,

    paymentConnectorId:
      clean.paymentConnectorId || null,

    paymentResultId:
      clean.paymentResultId || null,

    providerId:
      clean.providerId || null,

    externalReference:
      clean.externalReference || null,

    adapterType:
      clean.adapterType || "external-banking-provider",

    adapterState:
      clean.adapterState || "connected",

    adapterMetadata:
      safeClone(clean.adapterMetadata),

    evidence:
      safeClone(clean.evidence),

    createdAt:
      nowISO(),

    reason:
      clean.reason ||
      "BANKING_ADAPTER_RECORDED",

    authorityBoundary:
      "BANKING_ADAPTER_PRESERVES_EXTERNAL_PROVIDER_LINKAGE_DOES_NOT_CONTROL_FINANCIAL_ACTIVITY",
  };
}

export function readBankingAdapterShape() {
  return {
    ok: true,

    name:
      "banking-adapter",

    stage:
      "cybershop-commerce-banking-adapter",

    fields: [
      "bankingAdapterId",
      "transactionId",
      "paymentConnectorId",
      "paymentResultId",
      "providerId",
      "externalReference",
      "adapterType",
      "adapterState",
      "adapterMetadata",
      "evidence",
      "createdAt",
      "reason",
      "authorityBoundary",
    ],

    boundary:
      "EVIDENCE_NOT_FINANCIAL_AUTHORITY",
  };
}

export const BankingAdapter = {
  createBankingAdapter,
  readBankingAdapterShape,
};
