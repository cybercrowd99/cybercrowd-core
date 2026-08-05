/**
 * CORE
 *
 * Exact path: core/turnstile/ephemeral-u-joint-biff-decision.js
 * Title: Ephemeral U-Joint Biff Decision
 * Purpose: Convert one validated classification result into a single
 *          authoritative CyberCrowd decision before any routing occurs.
 * Owns: Decision selection, decision reason, decision confidence,
 *       and immutable decision result.
 * Does NOT own: Input validation, input classification, session identity,
 *               proof ledger, heartbeat, lease renewal, Turd routing,
 *               Vacuum quarantine, persistence, authentication,
 *               deletion, revocation, network transport,
 *               accepted-input execution, or live-session mutation.
 */

"use strict";

const DECISION = Object.freeze({
  ALLOW: "ALLOW",
  HOLD: "HOLD",
  DENY: "DENY",
});

const CLASSIFICATION = Object.freeze({
  BENIGN: "BENIGN",
  SUSPICIOUS: "SUSPICIOUS",
  HOSTILE: "HOSTILE",
});

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

function normalizeClassificationResult(result) {
  assert(
    result &&
      typeof result === "object" &&
      !Array.isArray(result),
    "CLASSIFICATION_RESULT_IS_REQUIRED",
  );

  assert(
    typeof result.inputId === "string" &&
      result.inputId.trim().length > 0,
    "INPUT_ID_IS_REQUIRED",
  );

  assert(
    Object.values(CLASSIFICATION).includes(
      result.classification,
    ),
    "INVALID_CLASSIFICATION",
  );

  assert(
    Number.isInteger(result.riskScore) &&
      result.riskScore >= 0 &&
      result.riskScore <= 100,
    "INVALID_RISK_SCORE",
  );

  assert(
    Array.isArray(result.indicators),
    "INDICATORS_MUST_BE_AN_ARRAY",
  );

  return deepFreeze({
    inputId: result.inputId.trim(),
    inputType: result.inputType,
    classification: result.classification,
    riskScore: result.riskScore,
    indicators: [...result.indicators],
  });
}

function chooseDecision(classificationResult) {
  const result = normalizeClassificationResult(
    classificationResult,
  );

  switch (result.classification) {
    case CLASSIFICATION.BENIGN:
      return buildDecision(
        result,
        DECISION.ALLOW,
        "CLASSIFICATION_IS_BENIGN",
        100,
      );

    case CLASSIFICATION.SUSPICIOUS:
      return buildDecision(
        result,
        DECISION.HOLD,
        "CLASSIFICATION_REQUIRES_REVIEW",
        90,
      );

    case CLASSIFICATION.HOSTILE:
      return buildDecision(
        result,
        DECISION.DENY,
        "CLASSIFICATION_CONFIRMED_HOSTILE",
        100,
      );

    default:
      throw new Error("UNKNOWN_CLASSIFICATION");
  }
}

function buildDecision(
  classification,
  decision,
  reason,
  confidence,
) {
  return deepFreeze({
    inputId: classification.inputId,
    inputType: classification.inputType,
    classification: classification.classification,
    riskScore: classification.riskScore,
    indicators: [...classification.indicators],
    decision,
    reason,
    confidence,
  });
}

function assertDecisionResult(result) {
  assert(
    result &&
      typeof result === "object" &&
      !Array.isArray(result),
    "DECISION_RESULT_IS_REQUIRED",
  );

  assert(
    Object.values(DECISION).includes(result.decision),
    "INVALID_DECISION",
  );

  assert(
    typeof result.reason === "string" &&
      result.reason.length > 0,
    "DECISION_REASON_IS_REQUIRED",
  );

  assert(
    Number.isInteger(result.confidence) &&
      result.confidence >= 0 &&
      result.confidence <= 100,
    "INVALID_DECISION_CONFIDENCE",
  );

  return deepFreeze({
    inputId: result.inputId,
    inputType: result.inputType,
    classification: result.classification,
    riskScore: result.riskScore,
    indicators: [...result.indicators],
    decision: result.decision,
    reason: result.reason,
    confidence: result.confidence,
  });
}

module.exports = {
  DECISION,
  chooseDecision,
  assertDecisionResult,
};
