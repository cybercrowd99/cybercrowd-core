/**
 * CORE
 *
 * Exact path: core/session/liveness-lease-heartbeat.js
 * Title: Liveness Lease Heartbeat
 * Purpose: Maintain a live session lease through ordered heartbeat renewal
 *          without changing the immutable session identity or proof history.
 * Owns: heartbeatAt, leaseExpiresAt, lease duration, heartbeat renewal,
 *       expiration checks, and liveness continuity validation.
 * Does NOT own: Session identity creation, proof ledger creation, Turnstiles,
 *               validation, classification, Biff decisions, Turd routing,
 *               Vacuum quarantine, authentication, persistence, deletion,
 *               revocation, network transport, or user interfaces.
 */

"use strict";

const LIVE_STATUS = "LIVE";
const EXPIRED_STATUS = "EXPIRED";

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

function requirePositiveInteger(value, fieldName) {
  assert(
    Number.isInteger(value) && value > 0,
    `${fieldName.toUpperCase()}_MUST_BE_A_POSITIVE_INTEGER`,
  );

  return value;
}

function createLivenessLeaseHeartbeat({
  sessionId,
  identityId,
  heartbeatAt,
  leaseExpiresAt,
  leaseDurationSeconds,
}) {
  const normalizedSessionId = requireString(
    sessionId,
    "sessionId",
  );

  const normalizedIdentityId = requireString(
    identityId,
    "identityId",
  );

  const normalizedHeartbeatAt = requireTimestamp(
    heartbeatAt,
    "heartbeatAt",
  );

  const normalizedLeaseExpiresAt = requireTimestamp(
    leaseExpiresAt,
    "leaseExpiresAt",
  );

  const normalizedLeaseDurationSeconds = requirePositiveInteger(
    leaseDurationSeconds,
    "leaseDurationSeconds",
  );

  assert(
    Date.parse(normalizedLeaseExpiresAt) >
      Date.parse(normalizedHeartbeatAt),
    "LEASE_EXPIRATION_MUST_FOLLOW_HEARTBEAT",
  );

  return deepFreeze({
    sessionId: normalizedSessionId,
    identityId: normalizedIdentityId,
    status: LIVE_STATUS,
    heartbeatAt: normalizedHeartbeatAt,
    leaseExpiresAt: normalizedLeaseExpiresAt,
    leaseDurationSeconds: normalizedLeaseDurationSeconds,
  });
}

function startLivenessLease({
  sessionId,
  identityId,
  heartbeatAt,
  leaseDurationSeconds,
}) {
  const normalizedHeartbeatAt = requireTimestamp(
    heartbeatAt,
    "heartbeatAt",
  );

  const normalizedLeaseDurationSeconds = requirePositiveInteger(
    leaseDurationSeconds,
    "leaseDurationSeconds",
  );

  const leaseExpiresAt = new Date(
    Date.parse(normalizedHeartbeatAt) +
      normalizedLeaseDurationSeconds * 1000,
  ).toISOString();

  return createLivenessLeaseHeartbeat({
    sessionId,
    identityId,
    heartbeatAt: normalizedHeartbeatAt,
    leaseExpiresAt,
    leaseDurationSeconds: normalizedLeaseDurationSeconds,
  });
}

function renewHeartbeat(
  currentLiveness,
  {
    heartbeatAt,
  },
) {
  const current = createLivenessLeaseHeartbeat(
    currentLiveness,
  );

  const normalizedHeartbeatAt = requireTimestamp(
    heartbeatAt,
    "heartbeatAt",
  );

  assert(
    Date.parse(normalizedHeartbeatAt) >
      Date.parse(current.heartbeatAt),
    "HEARTBEAT_MUST_MOVE_FORWARD",
  );

  assert(
    Date.parse(normalizedHeartbeatAt) <=
      Date.parse(current.leaseExpiresAt),
    "EXPIRED_LEASE_CANNOT_BE_RENEWED",
  );

  const nextLeaseExpiresAt = new Date(
    Date.parse(normalizedHeartbeatAt) +
      current.leaseDurationSeconds * 1000,
  ).toISOString();

  return createLivenessLeaseHeartbeat({
    sessionId: current.sessionId,
    identityId: current.identityId,
    heartbeatAt: normalizedHeartbeatAt,
    leaseExpiresAt: nextLeaseExpiresAt,
    leaseDurationSeconds: current.leaseDurationSeconds,
  });
}

function getLivenessStatus(
  currentLiveness,
  {
    checkedAt,
  },
) {
  const current = createLivenessLeaseHeartbeat(
    currentLiveness,
  );

  const normalizedCheckedAt = requireTimestamp(
    checkedAt,
    "checkedAt",
  );

  const status =
    Date.parse(normalizedCheckedAt) <
    Date.parse(current.leaseExpiresAt)
      ? LIVE_STATUS
      : EXPIRED_STATUS;

  return deepFreeze({
    sessionId: current.sessionId,
    identityId: current.identityId,
    status,
    heartbeatAt: current.heartbeatAt,
    leaseExpiresAt: current.leaseExpiresAt,
    checkedAt: normalizedCheckedAt,
  });
}

function assertLivenessAdvanced(
  previousLiveness,
  candidateLiveness,
) {
  const previous = createLivenessLeaseHeartbeat(
    previousLiveness,
  );

  const candidate = createLivenessLeaseHeartbeat(
    candidateLiveness,
  );

  assert(
    candidate.sessionId === previous.sessionId,
    "LIVENESS_SESSION_MUTATION_BLOCKED",
  );

  assert(
    candidate.identityId === previous.identityId,
    "LIVENESS_IDENTITY_MUTATION_BLOCKED",
  );

  assert(
    candidate.leaseDurationSeconds ===
      previous.leaseDurationSeconds,
    "LEASE_DURATION_MUTATION_BLOCKED",
  );

  assert(
    Date.parse(candidate.heartbeatAt) >
      Date.parse(previous.heartbeatAt),
    "HEARTBEAT_MUST_ADVANCE",
  );

  assert(
    Date.parse(candidate.leaseExpiresAt) >
      Date.parse(previous.leaseExpiresAt),
    "LEASE_EXPIRATION_MUST_ADVANCE",
  );

  assert(
    candidate.status === LIVE_STATUS,
    "RENEWED_SESSION_MUST_REMAIN_LIVE",
  );

  return candidate;
}

module.exports = {
  LIVE_STATUS,
  EXPIRED_STATUS,
  createLivenessLeaseHeartbeat,
  startLivenessLease,
  renewHeartbeat,
  getLivenessStatus,
  assertLivenessAdvanced,
};
