// src/masterDIP-authority.js
// CyberCrowd MASTER-DIP
// Authority Activation Wrapper
//
// Purpose:
// Provide an admin-only MASTER-DIP wrapper around the local
// moment-physics authority activation model.
//
// Core model:
// src/core/moment-physics/authority-activation.js
//
// Owns:
// - admin gate
// - calling the local activation energy model
// - MASTER-DIP authority notes
// - local-only authority boundary
//
// Does NOT own:
// - real authority
// - server authority
// - Identity proof
// - agreement approval
// - movement authorization
// - sessions
// - cookies/KV/EAT
// - admin validation backend

import {
  computeActivationEnergy,
  readAuthorityActivationShape,
} from "./core/moment-physics/authority-activation.js";

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

function isAdmin(input = {}) {
  return input.admin === true || input.adminAllowed === true;
}

export function masterDIPAuthorityActivation(input = {}) {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      reason: "INPUT_REQUIRED",
      checkedAt: nowISO(),
      authorityNote:
        "MASTER_DIP_AUTHORITY_ACTIVATION_NO_INPUT_NO_AUTHORITY_GRANTED",
    };
  }

  if (!isAdmin(input)) {
    return {
      ok: false,
      reason: "ADMIN_ONLY",
      checkedAt: nowISO(),

      model: "authorityActivation",
      category: "momentPhysics.controlSurface",
      entitlement: "admin-only",
      authority: "local-only",

      authorityNote:
        "MASTER_DIP_AUTHORITY_ACTIVATION_ADMIN_ONLY_NO_CALCULATION_RUN",
    };
  }

  const result = computeActivationEnergy(
    input.k,
    input.v,
    input.T,
    input.A
  );

  return {
    ...result,

    masterDIP: true,
    wrapper: "masterDIPAuthorityActivation",
    checkedAt: nowISO(),

    model: "authorityActivation",
    category: "momentPhysics.controlSurface",
    entitlement: "admin-only",
    authority: "local-only",

    inputContext: safeClone(input.context || {}),

    authorityNote: result.ok
      ? "MASTER_DIP_AUTHORITY_ACTIVATION_LOCAL_MODEL_ONLY_NOT_SERVER_AUTHORITY"
      : "MASTER_DIP_AUTHORITY_ACTIVATION_FAILED_NO_AUTHORITY_GRANTED",
  };
}

export function readMasterDIPAuthorityActivationShape() {
  return {
    ok: true,
    name: "master-dip-authority-activation",
    stage: "master-dip-authority",

    model: "authorityActivation",
    category: "momentPhysics.controlSurface",
    entitlement: "admin-only",
    authority: "local-only",

    accepts: [
      "admin",
      "adminAllowed",
      "k",
      "v",
      "T",
      "A",
      "context",
    ],

    returns: [
      "term",
      "avgEnergy",
      "ignite",
      "requiredK",
      "domain",
      "model",
      "category",
      "entitlement",
      "authority",
      "authorityNote",
    ],

    coreShape: readAuthorityActivationShape(),

    domainRule: "0 <= v * T < 1",
    ignitionRule: "avgEnergy >= A",

    identityRule:
      "MASTER-DIP authority activation does not prove or create Identity.",

    authorityRule:
      "MASTER-DIP authority activation is admin-only and local-only.",

    authorityNote:
      "MASTER_DIP_AUTHORITY_ACTIVATION_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const MasterDIPAuthority = {
  masterDIPAuthorityActivation,
  readMasterDIPAuthorityActivationShape,
};
