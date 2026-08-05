/**
 * CORE
 *
 * Exact path: core/session/immutable-session-identity.js
 * Title: Immutable Session Identity
 * Purpose: Create one session identity and prevent every downstream system
 *          from changing that session's identity anchor.
 * Owns: sessionId, identityId, issuedAt, and identity continuity verification.
 * Does NOT own: Authentication, proof ledgers, heartbeat, leases, routing,
 *               Turnstiles, Biff decisions, Turd, Vacuum, Archive, deletion,
 *               revocation, persistence, HTTP requests, or user interfaces.
 */

"use strict";

/**
 * Throw immediately when a required identity rule is violated.
 *
 * @param {boolean} condition
 * @param {string} message
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Convert a required value into a clean non-empty string.
 *
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {string}
 */
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

/**
 * Normalize the original session creation timestamp.
 *
 * This timestamp represents the origin of the session identity.
 * It must never be silently regenerated during continuity checks.
 *
 * @param {unknown} value
 * @returns {string}
 */
function requireIssuedAt(value) {
  assert(
    typeof value === "string",
    "ISSUED_AT_MUST_BE_A_STRING",
  );

  const timestamp = Date.parse(value);

  assert(
    !Number.isNaN(timestamp),
    "ISSUED_AT_MUST_BE_A_VALID_TIMESTAMP",
  );

  return new Date(timestamp).toISOString();
}

/**
 * Recursively freeze a JSON-compatible object.
 *
 * Object.freeze prevents ordinary mutation inside the current JavaScript
 * runtime. It does not replace persistence controls, cryptographic signing,
 * or authorization. Those belong to later files.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
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

/**
 * Create the immutable identity anchor for one CyberCrowd session.
 *
 * This file does not generate session IDs or identity IDs.
 * The trusted system that creates the session must supply them.
 *
 * @param {{
 *   sessionId: string,
 *   identityId: string,
 *   issuedAt: string
 * }} input
 *
 * @returns {{
 *   sessionId: string,
 *   identityId: string,
 *   issuedAt: string
 * }}
 */
function createImmutableSessionIdentity(input) {
  assert(
    input !== null &&
      typeof input === "object" &&
      !Array.isArray(input),
    "SESSION_IDENTITY_INPUT_IS_REQUIRED",
  );

  const immutableSessionIdentity = {
    sessionId: requireString(input.sessionId, "sessionId"),
    identityId: requireString(input.identityId, "identityId"),
    issuedAt: requireIssuedAt(input.issuedAt),
  };

  return deepFreeze(immutableSessionIdentity);
}

/**
 * Verify that a candidate identity still represents the exact same session.
 *
 * This comparison blocks:
 * - session ID replacement;
 * - identity-anchor replacement;
 * - session-origin timestamp replacement.
 *
 * It returns the original immutable identity, not the candidate.
 *
 * @param {{
 *   sessionId: string,
 *   identityId: string,
 *   issuedAt: string
 * }} currentIdentity
 *
 * @param {{
 *   sessionId: string,
 *   identityId: string,
 *   issuedAt: string
 * }} candidateIdentity
 *
 * @returns {{
 *   sessionId: string,
 *   identityId: string,
 *   issuedAt: string
 * }}
 */
function assertSameSessionIdentity(
  currentIdentity,
  candidateIdentity,
) {
  const current = createImmutableSessionIdentity(currentIdentity);
  const candidate = createImmutableSessionIdentity(candidateIdentity);

  assert(
    candidate.sessionId === current.sessionId,
    "SESSION_ID_MUTATION_BLOCKED",
  );

  assert(
    candidate.identityId === current.identityId,
    "IDENTITY_ID_MUTATION_BLOCKED",
  );

  assert(
    candidate.issuedAt === current.issuedAt,
    "SESSION_ORIGIN_MUTATION_BLOCKED",
  );

  return current;
}

module.exports = {
  createImmutableSessionIdentity,
  assertSameSessionIdentity,
};
