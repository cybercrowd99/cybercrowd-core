// src/core/moment-physics/authority-activation.js
// CyberCrowd Core
// Moment Physics — Authority Activation
//
// Purpose:
// Compute the local activation energy model for authority ignition.
//
// Model:
// E(t) = τ(t) * (1 + 1 / P(t))
// τ(t) = k * t
// P(t) = 1 - v * t
//
// Therefore:
// E(t) = k*t + (k*t) / (1 - v*t)
//
// Average energy over [0, T]:
// avgEnergy = k * (T / 2 - 1 / v - Math.log(1 - v * T) / (v * v * T))
//
// Ignition:
// avgEnergy >= A
//
// Domain:
// The real-valued model requires v * T < 1.
// This keeps 1 - v*T positive and the logarithm real.
//
// Owns:
// - local activation energy calculation
// - ignition threshold comparison
// - required k calculation
// - math/domain guards
//
// Does NOT own:
// - real authority
// - server authority
// - Identity proof
// - agreement approval
// - sessions
// - cookies/KV/EAT
// - movement authorization
// - admin validation

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function buildFailure(reason, extra = {}) {
  return {
    ok: false,
    reason,
    ...extra,
    authorityNote:
      "AUTHORITY_ACTIVATION_MODEL_DID_NOT_RUN_NO_AUTHORITY_GRANTED",
  };
}

export function computeActivationEnergy(k, v, T, A) {
  if (![k, v, T, A].every(isFiniteNumber)) {
    return buildFailure("NON_FINITE_INPUT", {
      k,
      v,
      T,
      A,
    });
  }

  if (T <= 0) {
    return buildFailure("TIME_MUST_BE_POSITIVE", {
      T,
    });
  }

  if (v === 0) {
    return buildFailure("VELOCITY_ZERO_DIVISION", {
      v,
    });
  }

  if (v < 0) {
    return buildFailure("VELOCITY_MUST_BE_NON_NEGATIVE", {
      v,
    });
  }

  if (k < 0) {
    return buildFailure("K_MUST_BE_NON_NEGATIVE", {
      k,
    });
  }

  if (A < 0) {
    return buildFailure("THRESHOLD_MUST_BE_NON_NEGATIVE", {
      A,
    });
  }

  const proximityProduct = v * T;

  if (proximityProduct >= 1) {
    return buildFailure("PROXIMITY_SINGULARITY", {
      proximityProduct,
      domainRule: "v * T must be less than 1",
    });
  }

  const proximityRemainder = 1 - proximityProduct;

  if (proximityRemainder <= 0) {
    return buildFailure("PROXIMITY_REMAINDER_NOT_POSITIVE", {
      proximityRemainder,
    });
  }

  const term =
    T / 2 -
    1 / v -
    Math.log(1 - v * T) / (v * v * T);

  if (!Number.isFinite(term)) {
    return buildFailure("NON_FINITE_ENERGY_TERM", {
      term,
    });
  }

  if (term <= 0) {
    return buildFailure("ENERGY_TERM_NOT_POSITIVE", {
      term,
      authorityNote:
        "AUTHORITY_ACTIVATION_TERM_NOT_POSITIVE_REQUIRED_K_NOT_MEANINGFUL",
    });
  }

  const avgEnergy = k * term;

  if (!Number.isFinite(avgEnergy)) {
    return buildFailure("NON_FINITE_AVG_ENERGY", {
      avgEnergy,
      term,
    });
  }

  const requiredK = A / term;

  if (!Number.isFinite(requiredK)) {
    return buildFailure("NON_FINITE_REQUIRED_K", {
      requiredK,
      term,
    });
  }

  return {
    ok: true,

    model: "authorityActivation",
    category: "momentPhysics.controlSurface",
    entitlement: "admin-only",
    authority: "local-only",

    inputs: {
      k,
      v,
      T,
      A,
    },

    domain: {
      proximityProduct,
      proximityRemainder,
      valid: proximityProduct < 1,
      rule: "0 <= v * T < 1",
    },

    term,
    avgEnergy,
    threshold: A,
    ignite: avgEnergy >= A,
    requiredK,

    formula:
      "avgEnergy = k * (T / 2 - 1 / v - Math.log(1 - v * T) / (v * v * T))",

    ignitionRule: "avgEnergy >= A",

    authorityNote:
      "AUTHORITY_ACTIVATION_MODEL_ONLY_NOT_SERVER_AUTHORITY",
  };
}

export function readAuthorityActivationShape() {
  return {
    ok: true,
    name: "authority-activation",
    model: "authorityActivation",
    category: "momentPhysics.controlSurface",
    entitlement: "admin-only",
    authority: "local-only",
    accepts: ["k", "v", "T", "A"],
    returns: [
      "term",
      "avgEnergy",
      "ignite",
      "requiredK",
      "domain",
      "authorityNote",
    ],
    domainRule: "0 <= v * T < 1",
    ignitionRule: "avgEnergy >= A",
    identityRule:
      "Authority activation is a local model signal, not Identity.",
    authorityRule:
      "Authority activation does not grant real authority by itself.",
    authorityNote:
      "AUTHORITY_ACTIVATION_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const AuthorityActivation = {
  computeActivationEnergy,
  readAuthorityActivationShape,
};
