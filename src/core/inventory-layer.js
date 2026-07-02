// src/core/inventory-layer.js
// CyberCrowd Core
// Inventory Layer
//
// Purpose:
// Convert normalized signals into inventory buckets free vs licensed
// based on entitlement rules and Dewey category system.
//
// Intake → Normalizer → Inventory → Identity after agreement
//
// Owns:
// - inventory shaping
// - free vs licensed routing
// - entitlement enforcement
// - category-based grouping
// - gathered-ready inventory state
//
// Does NOT own:
// - OAuth
// - scraping
// - intake envelope creation
// - normalization
// - identity binding
// - ping routing
// - server authority

import { ENTITLEMENT_RULES } from "../dewey/entitlement-rules.js";
import { CATEGORY_SYSTEM } from "../dewey/category-system.js";

function nowISO() {
  return new Date().toISOString();
}

function safeClone(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function getEntitlementFor(level) {
  return ENTITLEMENT_RULES.find((rule) => rule.accessLevel === level) || null;
}

function isAllowed(accessLevel, contentType) {
  const rule = getEntitlementFor(accessLevel);

  if (!rule) return false;

  return rule.allows.includes(contentType);
}

function toSignalArray(normalizedEnvelope) {
  if (!normalizedEnvelope || typeof normalizedEnvelope !== "object") return [];

  if (Array.isArray(normalizedEnvelope.normalizedSignals)) {
    return normalizedEnvelope.normalizedSignals;
  }

  if (Array.isArray(normalizedEnvelope.records)) {
    return normalizedEnvelope.records;
  }

  return [];
}

function getCategoryMeta(categoryKey) {
  return CATEGORY_SYSTEM[categoryKey] || null;
}

function shapeInventoryRecord(normalized, inventoryType) {
  const categoryMeta = getCategoryMeta(normalized.category);

  return {
    ok: true,

    type: normalized.type,
    label: normalized.label || null,

    category: normalized.category,
    categoryCode:
      normalized.categoryCode ||
      (categoryMeta ? categoryMeta.code : null),
    categoryName:
      normalized.categoryName ||
      (categoryMeta ? categoryMeta.name : null),

    inventoryType,
    fields: safeClone(normalized.fields),

    normalizedAt: normalized.normalizedAt || null,
    inventoryAt: nowISO(),

    status: "gathered-ready",
    inventoryState: "inventory",
    pendingIdentity: true,
    identityId: null,

    authorityNote:
      inventoryType === "licensed"
        ? "LICENSED_INVENTORY_NOT_IDENTITY_AGREEMENT_REQUIRED"
        : "FREE_INVENTORY_NOT_IDENTITY",
  };
}

function groupByCategory(records) {
  return records.reduce((grouped, record) => {
    const key = record.category || "unknown";

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(record);

    return grouped;
  }, {});
}

export async function inventoryLayer({
  normalizedEnvelope = null,
  accessLevel = "free",
} = {}) {
  if (!normalizedEnvelope || typeof normalizedEnvelope !== "object") {
    return {
      ok: false,
      reason: "NORMALIZED_ENVELOPE_REQUIRED",
      inventoryAt: nowISO(),
      authorityNote: "NO_INVENTORY_CREATED",
    };
  }

  const signals = toSignalArray(normalizedEnvelope);

  if (!signals.length) {
    return {
      ok: false,
      reason: "NORMALIZED_SIGNALS_REQUIRED",
      inventoryAt: nowISO(),
      authorityNote: "NO_INVENTORY_CREATED",
    };
  }

  const freeInventory = [];
  const licensedInventory = [];
  const rejected = [];

  for (const sig of signals) {
    if (!sig || typeof sig !== "object" || !sig.ok) {
      rejected.push({
        ok: false,
        reason: "INVALID_OR_FAILED_NORMALIZED_SIGNAL",
        signal: safeClone(sig),
        inventoryAt: nowISO(),
      });
      continue;
    }

    if (isAllowed("free", sig.type)) {
      freeInventory.push(shapeInventoryRecord(sig, "free"));
      continue;
    }

    if (isAllowed("licensed", sig.type)) {
      licensedInventory.push(shapeInventoryRecord(sig, "licensed"));
      continue;
    }

    rejected.push({
      ok: false,
      reason: "CONTENT_TYPE_NOT_ENTITLED",
      type: sig.type || null,
      category: sig.category || null,
      inventoryAt: nowISO(),
      authorityNote: "NO_INVENTORY_RECORD_CREATED",
    });
  }

  return {
    ok: true,
    inventoryAt: nowISO(),

    intakeId: normalizedEnvelope.intakeId || null,
    provider: normalizedEnvelope.provider || null,
    source: normalizedEnvelope.source || null,

    accessLevel,

    status: "gathered-ready",
    inventoryState: "inventory",
    pendingIdentity: true,
    identityId: null,

    counts: {
      total: signals.length,
      free: freeInventory.length,
      licensed: licensedInventory.length,
      rejected: rejected.length,
    },

    freeInventory,
    licensedInventory,
    rejected,

    grouped: {
      free: groupByCategory(freeInventory),
      licensed: groupByCategory(licensedInventory),
    },

    agreementRequired: {
      identityAgreement: licensedInventory.length > 0,
      licensingAgreement: licensedInventory.length > 0,
    },

    authorityNote:
      "INVENTORY_LAYER_ONLY_NOT_IDENTITY_IDENTITY_AGREEMENT_REQUIRED",
  };
}

export function readInventoryLayerShape() {
  return {
    ok: true,
    name: "inventory-layer",
    stage: "inventory",
    accepts: ["normalizedEnvelope", "accessLevel"],
    returns: [
      "freeInventory",
      "licensedInventory",
      "rejected",
      "grouped",
      "counts",
      "agreementRequired",
      "status",
      "inventoryState",
      "pendingIdentity",
      "identityId",
      "authorityNote",
    ],
    inventoryRule: "Inventory = gathered-ready.",
    identityRule: "Inventory is not Identity.",
    agreementRule: "Agreement is the doorway into Identity.",
    authorityNote:
      "INVENTORY_LAYER_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const InventoryLayer = {
  inventoryLayer,
  readInventoryLayerShape,
};
