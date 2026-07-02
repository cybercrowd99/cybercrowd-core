// src/core/social-signal-intake.js
// CyberCrowd Core
// Social Signal Intake
//
// Purpose:
// Wrap gathered social/provider signals into a common intake envelope
// before normalization.
//
// Inventory = gathered-ready.
// Inventory is not Identity.
// Agreement is the doorway into Identity.
//
// Owns:
// - intake envelope creation
// - provider/source labeling
// - raw signal staging
// - gathered-ready status
// - pending Identity boundary
//
// Does NOT own:
// - platform OAuth
// - platform adapters
// - scraping
// - normalization
// - IDL binding
// - ping routing
// - identity authority
// - login/password/session
// - cookies/KV/EAT
// - server checks

function nowISO() {
  return new Date().toISOString();
}

function makeIntakeId(prefix = "socialIntake") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
}

function dipClone(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function normalizeRawSignals(rawSignals) {
  if (rawSignals === undefined || rawSignals === null) return [];

  if (Array.isArray(rawSignals)) {
    return rawSignals;
  }

  return [rawSignals];
}

export async function socialSignalIntake({
  user = null,
  provider = null,
  rawSignals = [],
  source = null,
  options = {},
} = {}) {
  if (!user) {
    return {
      ok: false,
      reason: "USER_REQUIRED",
      intakeAt: nowISO(),
      authorityNote: "NO_SOCIAL_SIGNAL_INTAKE_CREATED",
    };
  }

  if (!provider) {
    return {
      ok: false,
      reason: "PROVIDER_REQUIRED",
      intakeAt: nowISO(),
      authorityNote: "NO_SOCIAL_SIGNAL_INTAKE_CREATED",
    };
  }

  const signals = normalizeRawSignals(rawSignals);

  const envelope = {
    ok: true,
    intakeId: makeIntakeId(),
    intakeAt: nowISO(),

    provider,
    source: source || provider,

    status: "gathered-ready",
    inventoryState: "raw-intake",
    pendingIdentity: true,
    identityId: null,

    user: dipClone(user),

    counts: {
      rawSignals: signals.length,
    },

    rawSignals: dipClone(signals),

    options: dipClone(options),

    authorityNote:
      "SOCIAL_SIGNAL_INTAKE_ONLY_NOT_IDENTITY_SERVER_AUTHORITY_REQUIRED",
  };

  return envelope;
}

export function readSocialSignalIntakeShape() {
  return {
    ok: true,
    name: "social-signal-intake",
    stage: "intake",
    accepts: [
      "user",
      "provider",
      "rawSignals",
      "source",
      "options",
    ],
    returns: [
      "intakeId",
      "provider",
      "source",
      "status",
      "inventoryState",
      "pendingIdentity",
      "identityId",
      "rawSignals",
      "counts",
      "authorityNote",
    ],
    inventoryRule: "Inventory = gathered-ready.",
    identityRule: "Inventory is not Identity.",
   
