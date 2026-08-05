/**
 * CORE
 *
 * Exact path: core/turnstile/ephemeral-u-joint-turd-residue-route.js
 * Title: Ephemeral U-Joint Turd Residue Route
 * Purpose: Convert one immutable Biff DENY decision into an isolated,
 *          non-authoritative Turd residue record.
 * Owns: Turd residue eligibility, residue record construction,
 *       decoy result, and denied live-session permissions.
 * Does NOT own: Input validation, input classification, Biff decisions,
 *               session identity, proof ledger, heartbeat, lease renewal,
 *               Vacuum quarantine, persistence, authentication, deletion,
 *               revocation, network transport, accepted-input execution,
 *               or live-session mutation.
 */

"use strict";

const REQUIRED_DECISION = "DENY";
const REQUIRED_CLASSIFICATION = "HOSTILE";
const ROUTE = "TURD";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

function requireString(value, fieldName) {
  assert(
    typeof value === "string",
    `${fieldName.toUpperCase()}_MUST_BE_A_STRING`,
  );

  const normalizedValue = value.trim();

  assert(
    normalizedValue.length > 0,
    `${fieldName.toUpperCase()}_IS_REQUIRED`,
  );

  return normalizedValue;
}

function requireTimestamp(value, fieldName) {
  assert(
    typeof value === "string",
    `${fieldName.toUpperCase()}_MUST_BE_A_STRING`,
  );

  const timestamp = Date.parse(value);

  assert(
    !Number.isNaN(timestamp),
    `${fieldName.toUpperCase()}_MUST_BE_A_VALID_TIMESTAMP`,
  );

  return new Date(timestamp).toISOString();
}

function requireRiskScore(value) {
  assert(
    Number.isInteger(value) &&
      value >= 0 &&
      value <= 100,
    "RISK_SCORE_MUST_BE_AN_INTEGER_FROM_0_TO_100",
  );

  return value;
}

function requireIndicators(value) {
  assert(
    Array.isArray(value),
    "INDICATORS_MUST_BE_AN_ARRAY",
  );

  return value.map((indicator) =>
    requireString(indicator, "indicator"),
  );
}

function normalizeBiffDecision(result) {
  assert(
    result !== null &&
      typeof result === "object" &&
      !Array.isArray(result),
    "BIFF_DECISION_RESULT_IS_REQUIRED",
  );

  const normalized = {
    inputId: requireString(result.inputId, "inputId"),
    inputType: requireString(
      result.inputType,
      "inputType",
    ),
    classification: requireString(
      result.classification,
      "classification",
    ),
    riskScore: requireRiskScore(result.riskScore),
    indicators: requireIndicators(result.indicators),
    decision: requireString(result.decision, "decision"),
    reason: requireString(result.reason, "reason"),
  };

  assert(
    normalized.decision === REQUIRED_DECISION,
    "TURD_ROUTE_REQUIRES_BIFF_DENY",
  );

  assert(
    normalized.classification ===
      REQUIRED_CLASSIFICATION,
    "TURD_ROUTE_REQUIRES_HOSTILE_CLASSIFICATION",
  );

  return deepFreeze(normalized);
}

function createDeniedSessionPermissions() {
  return deepFreeze({
    canReadLiveSession: false,
    canWriteLiveSession: false,
    canReplaceSessionIdentity: false,
    canAppendProof: false,
    canRenewHeartbeat: false,
    canRenewLease: false,
    canDeleteSession: false,
    canRevokeSession: false,
  });
}

function createDecoyResult() {
  return deepFreeze({
    authoritative: false,
    accepted: false,
    executed: false,
    result: "NON_AUTHORITATIVE_HOSTILE_RESIDUE",
  });
}

function createTurdResidueRoute({
  residueId,
  createdAt,
  biffDecision,
}) {
  const decision = normalizeBiffDecision(biffDecision);

  return deepFreeze({
    residueId: requireString(
      residueId,
      "residueId",
    ),
    createdAt: requireTimestamp(
      createdAt,
      "createdAt",
    ),
    route: ROUTE,
    sourceInputId: decision.inputId,
    sourceInputType: decision.inputType,
    classification: decision.classification,
    riskScore: decision.riskScore,
    indicators: [...decision.indicators],
    biffDecision: decision.decision,
    biffReason: decision.reason,
    decoy: createDecoyResult(),
    permissions: createDeniedSessionPermissions(),
  });
}

function assertTurdResidueRoute(result) {
  assert(
    result !== null &&
      typeof result === "object" &&
      !Array.isArray(result),
    "TURD_RESIDUE_ROUTE_IS_REQUIRED",
  );

  assert(
    result.route === ROUTE,
    "INVALID_TURD_ROUTE",
  );

  assert(
    result.biffDecision === REQUIRED_DECISION,
    "TURD_RESIDUE_MUST_PRESERVE_BIFF_DENY",
  );

  assert(
    result.classification ===
      REQUIRED_CLASSIFICATION,
    "TURD_RESIDUE_MUST_PRESERVE_HOSTILE_CLASSIFICATION",
  );

  assert(
    result.decoy &&
      result.decoy.authoritative === false &&
      result.decoy.accepted === false &&
      result.decoy.executed === false,
    "TURD_RESIDUE_DECOY_MUST_REMAIN_NON_AUTHORITATIVE",
  );

  assert(
    result.permissions &&
      Object.values(result.permissions).every(
        (permission) => permission === false,
      ),
    "TURD_RESIDUE_SESSION_PERMISSIONS_MUST_BE_DENIED",
  );

  return deepFreeze({
    residueId: requireString(
      result.residueId,
      "residueId",
    ),
    createdAt: requireTimestamp(
      result.createdAt,
      "createdAt",
    ),
    route: result.route,
    sourceInputId: requireString(
      result.sourceInputId,
      "sourceInputId",
    ),
    sourceInputType: requireString(
      result.sourceInputType,
      "sourceInputType",
    ),
    classification: result.classification,
    riskScore: requireRiskScore(result.riskScore),
    indicators: requireIndicators(
      result.indicators,
    ),
    biffDecision: result.biffDecision,
    biffReason: requireString(
      result.biffReason,
      "biffReason",
    ),
    decoy: result.decoy,
    permissions: result.permissions,
  });
}

module.exports = {
  ROUTE,
  createTurdResidueRoute,
  assertTurdResidueRoute,
};
