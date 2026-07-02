// src/core/social-idl-binder.js
// CyberCrowd Core
// Social IDL Binder
//
// Purpose:
// Convert an IDL background signal into a binder-ready envelope.
// IDL Background Signal → Social IDL Binder → Identity Binding after agreement
//
// Owns:
// - binder-ready envelope
// - agreement-required flags
// - pending Identity state
// - identityId stays null unless caller supplies identity context
// - safe shaping of IDL background signal
//
// Does NOT own:
// - OAuth
// - scraping
// - raw intake
// - normalization
// - inventory sorting
// - IDL background signal creation
// - identity proof
// - ping routing
// - server authority
// - cookies/KV/EAT

function nowISO() {
  return new Date().toISOString();
}

function makeBinderId(prefix = "socialIdlBinder") {
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

export async function buildSocialIdlBinder(idlBackgroundSignal = {}) {
  if (!idlBackgroundSignal || typeof idlBackgroundSignal !== "object") {
    return {
      ok: false,
      reason: "IDL_BACKGROUND_SIGNAL_REQUIRED",
      binderAt: nowISO(),
      authorityNote: "NO_SOCIAL_IDL_BINDER_CREATED",
    };
  }

  return {
    ok: true,

    binderId: makeBinderId(),
    binderAt: nowISO(),

    idlSignalId: idlBackgroundSignal.idlSignalId || null,
    intakeId: idlBackgroundSignal.intakeId || null,
    provider: idlBackgroundSignal.provider || null,
    source: idlBackgroundSignal.source || null,

    status: "gathered-ready",
    inventoryState: "idl-binder",

    pendingIdentity: true,
    identityId: null,

    counts: safeClone(idlBackgroundSignal.counts || {}),
    categoryCounts: safeClone(idlBackgroundSignal.categoryCounts || {}),

    agreementRequired: {
      identityAgreement:
        idlBackgroundSignal.agreementRequired?.identityAgreement || false,
      licensingAgreement:
        idlBackgroundSignal.agreementRequired?.licensingAgreement || false,
    },

    background: safeClone(idlBackgroundSignal.background || {}),

    authorityNote:
      "SOCIAL_IDL_BINDER_READY_NOT_IDENTITY_IDENTITY_AGREEMENT_REQUIRED",
  };
}

// MASTER-DIP compatible export.
// This does not prove identity. It only marks the binder as attachable
// when the caller has already supplied agreement and identity context.
export async function bindSocialIdl({
  idlBackgroundSignal = null,
  identityId = null,
  identityAgreementAccepted = false,
  licensingAgreementAccepted = false,
} = {}) {
  const binder = await buildSocialIdlBinder(idlBackgroundSignal);

  if (!binder.ok) {
    return binder;
  }

  if (!identityAgreementAccepted) {
    return {
      ...binder,
      ok: false,
      reason: "IDENTITY_AGREEMENT_REQUIRED",
      pendingIdentity: true,
      identityId: null,
      authorityNote:
        "SOCIAL_IDL_BINDER_WAITING_FOR_IDENTITY_AGREEMENT",
    };
  }

  if (
    binder.agreementRequired.licensingAgreement &&
    !licensingAgreementAccepted
  ) {
    return {
      ...binder,
      ok: false,
      reason: "LICENSING_AGREEMENT_REQUIRED",
      pendingIdentity: true,
      identityId: null,
      authorityNote:
        "SOCIAL_IDL_BINDER_WAITING_FOR_LICENSING_AGREEMENT",
    };
  }

  if (!identityId) {
    return {
      ...binder,
      ok: false,
      reason: "IDENTITY_ID_REQUIRED",
      pendingIdentity: true,
      identityId: null,
      authorityNote:
        "SOCIAL_IDL_BINDER_NEEDS_CALLER_SUPPLIED_IDENTITY_ID",
    };
  }

  return {
    ...binder,
    ok: true,
    status: "bound-ready",
    inventoryState: "idl-bound-ready",
    pendingIdentity: false,
    identityId,
    boundAt: nowISO(),
    authorityNote:
      "SOCIAL_IDL_BOUND_READY_CALLER_SUPPLIED_IDENTITY_AGREEMENT_ACCEPTED",
  };
}

export function readSocialIdlBinderShape() {
  return {
    ok: true,
    name: "social-idl-binder",
    stage: "idl-binder",
    accepts: [
      "idlBackgroundSignal",
      "identityId",
      "identityAgreementAccepted",
      "licensingAgreementAccepted",
    ],
    returns: [
      "binderId",
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
    inventoryRule: "IDL binder prepares inventory for identity binding.",
    identityRule:
      "IDL binder does not prove or create Identity. It only attaches caller-supplied Identity context after agreement.",
    agreementRule: "Agreement is the doorway into Identity.",
    authorityNote:
      "SOCIAL_IDL_BINDER_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const SocialIdlBinder = {
  buildSocialIdlBinder,
  bindSocialIdl,
  readSocialIdlBinderShape,
};
