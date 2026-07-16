/**
 * CORE
 * Exact path: core/session/monotonic-proof-ledger.js
 * Title: Monotonic Proof Ledger
 * Purpose: Append ordered proof records to one live session without allowing
 *          proof sequence rollback, replacement, deletion, or reordering.
 * Owns: proofSequence, proofLedger, proof append order, and proof continuity checks.
 * Does NOT own: Session identity creation, heartbeat, lease renewal, Turnstiles,
 *               validation, classification, Biff decisions, Turd routing,
 *               Vacuum quarantine, authentication, persistence, deletion,
 *               revocation, network transport, or user interfaces.
 */

"use strict";

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
  return JSON.parse(JSON.stringify(value));
}

function requireNonNegativeInteger(value, fieldName) {
  assert(
    Number.isInteger(value) && value >= 0,
    `${fieldName.toUpperCase()}_MUST_BE_A_NON_NEGATIVE_INTEGER`,
  );

  return value;
}

function requirePositiveInteger(value, fieldName) {
  assert(
    Number.isInteger(value) && value > 0,
    `${fieldName.toUpperCase()}_MUST_BE_A_POSITIVE_INTEGER`,
  );

  return value;
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

function normalizeProofEntry(entry) {
  assert(
    entry !== null &&
      typeof entry === "object" &&
      !Array.isArray(entry),
    "PROOF_ENTRY_IS_REQUIRED",
  );

  return deepFreeze({
    proofSequence: requirePositiveInteger(
      entry.proofSequence,
      "proofSequence",
    ),
    proofId: requireString(entry.proofId, "proofId"),
    proofType: requireString(entry.proofType, "proofType"),
    recordedAt: requireTimestamp(entry.recordedAt, "recordedAt"),
    sessionId: requireString(entry.sessionId, "sessionId"),
    identityId: requireString(entry.identityId, "identityId"),
    evidence: cloneJson(entry.evidence ?? null),
  });
}

function createMonotonicProofLedger({
  sessionId,
  identityId,
  proofSequence = 0,
  proofLedger = [],
}) {
  assert(
    Array.isArray(proofLedger),
    "PROOF_LEDGER_MUST_BE_AN_ARRAY",
  );

  const normalizedSessionId = requireString(
    sessionId,
    "sessionId",
  );

  const normalizedIdentityId = requireString(
    identityId,
    "identityId",
  );

  const normalizedSequence = requireNonNegativeInteger(
    proofSequence,
    "proofSequence",
  );

  const normalizedLedger = proofLedger.map(normalizeProofEntry);

  assert(
    normalizedLedger.length === normalizedSequence,
    "PROOF_SEQUENCE_MUST_MATCH_LEDGER_LENGTH",
  );

  for (let index = 0; index < normalizedLedger.length; index += 1) {
    const expectedSequence = index + 1;
    const entry = normalizedLedger[index];

    assert(
      entry.proofSequence === expectedSequence,
      "PROOF_LEDGER_SEQUENCE_GAP_BLOCKED",
    );

    assert(
      entry.sessionId === normalizedSessionId,
      "PROOF_SESSION_ID_MISMATCH",
    );

    assert(
      entry.identityId === normalizedIdentityId,
      "PROOF_IDENTITY_ID_MISMATCH",
    );
  }

  return deepFreeze({
    sessionId: normalizedSessionId,
    identityId: normalizedIdentityId,
    proofSequence: normalizedSequence,
    proofLedger: normalizedLedger,
  });
}

function appendProof(
  currentLedger,
  {
    proofId,
    proofType,
    recordedAt,
    evidence,
  },
) {
  const current = createMonotonicProofLedger(currentLedger);
  const nextSequence = current.proofSequence + 1;

  const proofEntry = normalizeProofEntry({
    proofSequence: nextSequence,
    proofId,
    proofType,
    recordedAt,
    sessionId: current.sessionId,
    identityId: current.identityId,
    evidence,
  });

  return createMonotonicProofLedger({
    sessionId: current.sessionId,
    identityId: current.identityId,
    proofSequence: nextSequence,
    proofLedger: [
      ...current.proofLedger.map(cloneJson),
      proofEntry,
    ],
  });
}

function assertProofLedgerAdvanced(
  previousLedger,
  candidateLedger,
) {
  const previous = createMonotonicProofLedger(previousLedger);
  const candidate = createMonotonicProofLedger(candidateLedger);

  assert(
    candidate.sessionId === previous.sessionId,
    "PROOF_LEDGER_SESSION_MUTATION_BLOCKED",
  );

  assert(
    candidate.identityId === previous.identityId,
    "PROOF_LEDGER_IDENTITY_MUTATION_BLOCKED",
  );

  assert(
    candidate.proofSequence === previous.proofSequence + 1,
    "PROOF_SEQUENCE_MUST_ADVANCE_BY_ONE",
  );

  assert(
    candidate.proofLedger.length ===
      previous.proofLedger.length + 1,
    "PROOF_LEDGER_MUST_APPEND_EXACTLY_ONE_ENTRY",
  );

  for (let index = 0; index < previous.proofLedger.length; index += 1) {
    assert(
      JSON.stringify(candidate.proofLedger[index]) ===
        JSON.stringify(previous.proofLedger[index]),
      "EXISTING_PROOF_ENTRY_MUTATION_BLOCKED",
    );
  }

  return candidate;
}

module.exports = {
  createMonotonicProofLedger,
  appendProof,
  assertProofLedgerAdvanced,
};
