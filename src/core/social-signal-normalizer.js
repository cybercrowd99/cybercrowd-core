// src/core/social-signal-normalizer.js
// CyberCrowd Core
// Social Signal Normalizer
//
// Purpose:
// Convert gathered-ready raw social signals into normalized Dewey content types.
// Intake → Normalizer → Inventory → Identity after agreement
//
// Owns:
// - raw → normalized transformation
// - Dewey content type validation
// - category lookup
// - entitlement-safe shaping
// - normalization timestamp
//
// Does NOT own:
// - OAuth
// - scraping
// - intake envelope creation
// - inventory gating
// - identity binding
// - ping routing
// - server authority

import { CONTENT_TYPES } from "../dewey/content-types.js";
import { CATEGORY_SYSTEM } from "../dewey/category-system.js";
import { ENTITLEMENT_RULES } from "../dewey/entitlement-rules.js";

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

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getEntitlementFor(level) {
  return ENTITLEMENT_RULES.find((rule) => rule.accessLevel === level) || null;
}

function isAllowedContentType(accessLevel, contentType) {
  const rule = getEntitlementFor(accessLevel);

  if (!rule) return false;

  return rule.allows.includes(contentType);
}

function readRawType(raw) {
  if (!raw || typeof raw !== "object") return null;

  return (
    raw.type ||
    raw.contentType ||
    raw.signalType ||
    raw.kind ||
    null
  );
}

function readPayload(raw) {
  if (!raw || typeof raw !== "object") return {};

  if (raw.payload && typeof raw.payload === "object") {
    return raw.payload;
  }

  return raw;
}

function normalizeOneSignal(raw, accessLevel = "free") {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      reason: "INVALID_RAW_SIGNAL",
      normalizedAt: nowISO(),
      authorityNote: "NO_NORMALIZED_SIGNAL_CREATED",
    };
  }

  const type = readRawType(raw);
  const payload = readPayload(raw);

  if (!type || !CONTENT_TYPES[type]) {
    return {
      ok: false,
      reason: "UNKNOWN_CONTENT_TYPE",
      normalizedAt: nowISO(),
      raw: safeClone(raw),
      authorityNote: "NO_NORMALIZED_SIGNAL_CREATED",
    };
  }

  if (!isAllowedContentType(accessLevel, type)) {
    return {
      ok: false,
      reason: "CONTENT_TYPE_NOT_ALLOWED_FOR_ACCESS_LEVEL",
      normalizedAt: nowISO(),
      type,
      accessLevel,
      authorityNote:
        "CONTENT_TYPE_REQUIRES_DIFFERENT_ACCESS_LEVEL",
    };
  }

  const def = CONTENT_TYPES[type];
  const category = CATEGORY_SYSTEM[def.category] || null;

  const fields = {};

  for (const [fieldKey, fieldDef] of Object.entries(def.fields || {})) {
    const rawValue = payload[fieldKey];

    if (fieldDef.required && rawValue === undefined) {
      return {
        ok: false,
        reason: "MISSING_REQUIRED_FIELD",
        field: fieldKey,
        type,
        normalizedAt: nowISO(),
        authorityNote: "NO_NORMALIZED_SIGNAL_CREATED",
      };
    }

    fields[fieldKey] = safeClone(rawValue ?? null);
  }

  return {
    ok: true,
    type,
    label: def.label,
    category: def.category,
    categoryCode: category ? category.code : null,
    categoryName: category ? category.name : null,

    accessLevel,
    normalizedAt: nowISO(),

    status: "gathered-ready",
    inventoryState: "normalized",
    pendingIdentity: true,
    identityId: null,

    fields,

    authorityNote:
      "NORMALIZED_SIGNAL_ONLY_NOT_IDENTITY_IDENTITY_AGREEMENT_REQUIRED",
  };
}

export async function socialSignalNormalizer(input = {}) {
  // Accept both:
  // socialSignalNormalizer(intakeEnvelope)
  // socialSignalNormalizer({ intakeEnvelope, accessLevel })
  const intakeEnvelope =
    input && input.intakeEnvelope
      ? input.intakeEnvelope
      : input;

  const accessLevel =
    input && input.accessLevel
      ? input.accessLevel
      : "free";

  if (!intakeEnvelope || typeof intakeEnvelope !== "object") {
    return {
      ok: false,
      reason: "INTAKE_ENVELOPE_REQUIRED",
      normalizedAt: nowISO(),
      authorityNote: "NO_NORMALIZED_SIGNALS_CREATED",
    };
  }

  const rawSignals = toArray(intakeEnvelope.rawSignals);

  if (!rawSignals.length) {
    return {
      ok: false,
      reason: "RAW_SIGNALS_REQUIRED",
      normalizedAt: nowISO(),
      intakeId: intakeEnvelope.intakeId || null,
      provider: intakeEnvelope.provider || null,
      authorityNote: "NO_NORMALIZED_SIGNALS_CREATED",
    };
  }

  const results = rawSignals.map((raw) =>
    normalizeOneSignal(raw, accessLevel)
  );

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  return {
    ok: true,
    normalizedAt: nowISO(),

    intakeId: intakeEnvelope.intakeId || null,
    provider: intakeEnvelope.provider || null,
    source: intakeEnvelope.source || intakeEnvelope.provider || null,

    accessLevel,

    status: "gathered-ready",
    inventoryState: "normalized",
    pendingIdentity: true,
    identityId: null,

    counts: {
      total: results.length,
      ok: okCount,
      failed: failCount,
    },

    normalizedSignals: results,
    records: results,

    authorityNote:
      "NORMALIZED_SOCIAL_SIGNALS_NOT_IDENTITY_IDENTITY_AGREEMENT_REQUIRED",
  };
}

export function readSocialSignalNormalizerShape() {
  return {
    ok: true,
    name: "social-signal-normalizer",
    stage: "normalize",
    accepts: ["intakeEnvelope", "accessLevel"],
    returns: [
      "normalizedSignals",
      "records",
      "counts",
      "provider",
      "source",
      "accessLevel",
      "status",
      "inventoryState",
      "pendingIdentity",
      "identityId",
      "authorityNote",
    ],
    inventoryRule: "Normalization prepares gathered-ready inventory.",
    identityRule: "Normalization is not Identity.",
    agreementRule: "Agreement is the doorway into Identity.",
    authorityNote:
      "NORMALIZER_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const SocialSignalNormalizer = {
  socialSignalNormalizer,
  readSocialSignalNormalizerShape,
};
