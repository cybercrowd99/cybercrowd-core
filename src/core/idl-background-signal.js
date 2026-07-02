// src/core/idl-background-signal.js
// CyberCrowd Core
// IDL Background Signal
//
// Purpose:
// Shape gathered-ready inventory into an IDL background signal envelope.
// Inventory → IDL Background Signal → Identity Binding after agreement
//
// Owns:
// - IDL background signal envelope
// - free/licensed inventory summary
// - agreement-required flags
// - pending Identity state
// - identityId stays null
//
// Does NOT own:
// - OAuth
// - scraping
// - raw intake
// - normalization
// - inventory sorting
// - identity binding
// - ping routing
// - server authority
// - cookies/KV/EAT

function nowISO() {
  return new Date().toISOString();
}

function makeIdlSignalId(prefix = "idlBackgroundSignal") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
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

function countByCategory(records = []) {
  return records.reduce((counts, record) => {
    const category = record?.category || "unknown";

    counts[category] = (counts[category] || 0) + 1;

    return counts;
  }, {});
}

function readInventory(inventoryEnvelope = {}) {
  const freeInventory = toArray(inventoryEnvelope.freeInventory);
  const licensedInventory = toArray(inventoryEnvelope.licensedInventory);
  const rejected = toArray(inventoryEnvelope.rejected);

  return {
    freeInventory,
    licensedInventory,
    rejected,
  };
}

export async function buildIdlBackgroundSignal(inventoryEnvelope = {}) {
  if (!inventoryEnvelope || typeof inventoryEnvelope !== "object") {
    return {
      ok: false,
      reason: "INVENTORY_ENVELOPE_REQUIRED",
      signalAt: nowISO(),
      authorityNote: "NO_IDL_BACKGROUND_SIGNAL_CREATED",
    };
  }

  const {
    freeInventory,
    licensedInventory,
    rejected,
  } = readInventory(inventoryEnvelope);

  const signal = {
    ok: true,

    idlSignalId: makeIdlSignalId(),
    signalAt: nowISO(),

    intakeId: inventoryEnvelope.intakeId || null,
    provider: inventoryEnvelope.provider || null,
    source: inventoryEnvelope.source || null,

    status: "gathered-ready",
    inventoryState: "idl-background-signal",

    pendingIdentity: true,
    identityId: null,

    counts: {
      free: freeInventory.length,
      licensed: licensedInventory.length,
      rejected: rejected.length,
      total:
        freeInventory.length +
        licensedInventory.length +
        rejected.length,
    },

    categoryCounts: {
      free: countByCategory(freeInventory),
      licensed: countByCategory(licensedInventory),
    },

    agreementRequired: {
      identityAgreement: licensedInventory.length > 0,
      licensingAgreement: licensedInventory.length > 0,
    },

    background: {
      freeInventory: safeClone(freeInventory),
      licensedInventory: safeClone(licensedInventory),
      rejected: safeClone(rejected),
    },

    authorityNote:
      "IDL_BACKGROUND_SIGNAL_ONLY_NOT_IDENTITY_IDENTITY_AGREEMENT_REQUIRED",
  };

  return signal;
}

export function readIdlBackgroundSignalShape() {
  return {
    ok: true,
    name: "idl-background-signal",
    stage: "idl-background",
    accepts: ["inventoryEnvelope"],
    returns: [
      "idlSignalId",
      "counts",
      "categoryCounts",
      "agreementRequired",
      "background",
      "status",
      "inventoryState",
      "pendingIdentity",
      "identityId",
      "authorityNote",
    ],
    inventoryRule: "Inventory = gathered-ready.",
    identityRule: "IDL background signal is not Identity.",
    agreementRule: "Agreement is the doorway into Identity.",
    authorityNote:
      "IDL_BACKGROUND_SIGNAL_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const IdlBackgroundSignal = {
  buildIdlBackgroundSignal,
  readIdlBackgroundSignalShape,
};
