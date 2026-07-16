/**
 * CORE
 * Exact path: core/turnstile/ephemeral-u-joint-vacuum-quarantine-route.js
 * Title: Ephemeral U-Joint Vacuum Quarantine Route
 * Purpose: Convert one immutable Biff HOLD decision into an isolated,
 *          non-authoritative Vacuum quarantine record.
 * Owns: Vacuum quarantine eligibility, quarantine record construction,
 *       isolated payload custody, and denied live-session permissions.
 * Does NOT own: Input validation, input classification, Biff decisions,
 *               session identity, proof ledger, heartbeat, lease renewal,
 *               Turd residue routing, persistence, authentication, deletion,
 *               revocation, network transport, accepted-input execution,
 *               or live-session mutation.
 */

"use strict";

const REQUIRED_DECISION = "HOLD";
const REQUIRED_CLASSIFICATION = "SUSPICIOUS";
const ROUTE = "VACUUM";

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

function cloneJson(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new Error(
      "VACUUM_QUARANTINE_PAYLOAD_MUST_BE_JSON_COMPATIBLE",
    );
  }
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
    "VACUUM_ROUTE_REQUIRES_BIFF_HOLD",
  );

  assert(
    normalized.classification ===
      REQUIRED_CLASSIFICATION,
    "VACUUM_ROUTE_REQUIRES_SUSPICIOUS_CLASSIFICATION",
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

function createQuarantineState() {
  return deepFreeze({
    authoritative: false,
    accepted: false,
    executed: false,
    isolated: true,
    reviewRequired: true,
    result: "NON_AUTHORITATIVE_QUARANTINE",
  });
}

function createVacuumQuarantineRoute({
  quarantineId,
  quarantinedAt,
  biffDecision,
  payload,
}) {
  const decision = normalizeBiffDecision(biffDecision);

  return deepFreeze({
    quarantineId: requireString(
      quarantineId,
      "quarantineId",
    ),
    quarantinedAt: requireTimestamp(
      quarantinedAt,
      "quarantinedAt",
    ),
    route: ROUTE,
    sourceInputId: decision.inputId,
    sourceInputType: decision.inputType,
    classification: decision.classification,
    riskScore: decision.riskScore,
    indicators: [...decision.indicators],
    biffDecision: decision.decision,
    biffReason: decision.reason,
    isolatedPayload: cloneJson(payload),
    quarantine: createQuarantineState(),
    permissions: createDeniedSessionPermissions(),
  });
}

function assertVacuumQuarantineRoute(result) {
  assert(
    result !== null &&
      typeof result === "object" &&
      !Array.isArray(result),
    "VACUUM_QUARANTINE_ROUTE_IS_REQUIRED",
  );

  assert(
    result.route === ROUTE,
    "INVALID_VACUUM_ROUTE",
  );

  assert(
    result.biffDecision === REQUIRED_DECISION,
    "VACUUM_QUARANTINE_MUST_PRESERVE_BIFF_HOLD",
  );

  assert(
    result.classification ===
      REQUIRED_CLASSIFICATION,
    "VACUUM_QUARANTINE_MUST_PRESERVE_SUSPICIOUS_CLASSIFICATION",
  );

  assert(
    result.quarantine &&
      result.quarantine.authoritative === false &&
      result.quarantine.accepted === false &&
      result.quarantine.executed === false &&
      result.quarantine.isolated === true &&
      result.quarantine.reviewRequired === true,
    "VACUUM_QUARANTINE_STATE_IS_INVALID",
  );

  assert(
    result.permissions &&
      Object.values(result.permissions).every(
        (permission) => permission === false,
      ),
    "VACUUM_QUARANTINE_SESSION_PERMISSIONS_MUST_BE_DENIED",
  );

  return deepFreeze({
    quarantineId: requireString(
      result.quarantineId,
      "quarantineId",
    ),
    quarantinedAt: requireTimestamp(
      result.quarantinedAt,
      "quarantinedAt",
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
    isolatedPayload: cloneJson(
      result.isolatedPayload,
    ),
    quarantine: result.quarantine,
    permissions: result.permissions,
  });
}

module.exports = {
  ROUTE,
  createVacuumQuarantineRoute,
  assertVacuumQuarantineRoute,
};
