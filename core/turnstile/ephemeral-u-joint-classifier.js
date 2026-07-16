/**
 * CORE
 * Exact path: core/turnstile/ephemeral-u-joint-classifier.js
 * Title: Ephemeral U-Joint Classifier
 * Purpose: Classify one already-validated untrusted input envelope into a bounded
 *          risk state before Biff decision, Turd residue handling, or Vacuum quarantine.
 * Owns: Classification state, risk score, and classification indicators.
 * Does NOT own: Input validation, session identity, proof ledger, heartbeat,
 *               lease renewal, Biff decisions, Turd routing, Vacuum quarantine,
 *               authentication, persistence, deletion, revocation, network transport,
 *               accepted-input execution, or live-session mutation.
 */

"use strict";

const CLASSIFICATION = Object.freeze({
  BENIGN: "BENIGN",
  SUSPICIOUS: "SUSPICIOUS",
  HOSTILE: "HOSTILE",
});

const MAX_RISK_SCORE = 100;

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
    throw new Error("CLASSIFIER_INPUT_MUST_BE_JSON_COMPATIBLE");
  }
}

function requireValidatedInput(input) {
  assert(
    input !== null &&
      typeof input === "object" &&
      !Array.isArray(input),
    "VALIDATED_INPUT_ENVELOPE_IS_REQUIRED",
  );

  assert(
    typeof input.inputId === "string" &&
      input.inputId.trim().length > 0,
    "VALIDATED_INPUT_ID_IS_REQUIRED",
  );

  assert(
    typeof input.type === "string" &&
      input.type.trim().length > 0,
    "VALIDATED_INPUT_TYPE_IS_REQUIRED",
  );

  assert(
    Object.prototype.hasOwnProperty.call(input, "payload"),
    "VALIDATED_INPUT_PAYLOAD_IS_REQUIRED",
  );

  return deepFreeze({
    inputId: input.inputId.trim(),
    type: input.type.trim().toUpperCase(),
    payload: cloneJson(input.payload),
  });
}

function collectIndicators(validatedInput) {
  const indicators = [];
  const payloadText = JSON.stringify(
    validatedInput.payload,
  ).toLowerCase();

  const hostileMarkers = [
    "__proto__",
    "constructor.prototype",
    "<script",
    "javascript:",
    "drop table",
    "session-delete",
    "delete-session",
    "session-revoke",
    "revoke-session",
    "kill-session",
    "logout-all",
  ];

  for (const marker of hostileMarkers) {
    if (payloadText.includes(marker)) {
      indicators.push({
        indicator: `HOSTILE_MARKER:${marker}`,
        weight: 35,
      });
    }
  }

  if (payloadText.length > 32000) {
    indicators.push({
      indicator: "OVERSIZED_PAYLOAD",
      weight: 20,
    });
  }

  if (validatedInput.type === "UNKNOWN") {
    indicators.push({
      indicator: "UNKNOWN_INPUT_TYPE",
      weight: 10,
    });
  }

  return indicators;
}

function calculateRiskScore(indicators) {
  return Math.min(
    MAX_RISK_SCORE,
    indicators.reduce(
      (total, indicator) => total + indicator.weight,
      0,
    ),
  );
}

function chooseClassification(riskScore) {
  if (riskScore >= 70) {
    return CLASSIFICATION.HOSTILE;
  }

  if (riskScore >= 30) {
    return CLASSIFICATION.SUSPICIOUS;
  }

  return CLASSIFICATION.BENIGN;
}

function classifyValidatedInput(input) {
  const validatedInput = requireValidatedInput(input);
  const weightedIndicators = collectIndicators(validatedInput);
  const riskScore = calculateRiskScore(weightedIndicators);
  const classification = chooseClassification(riskScore);

  return deepFreeze({
    inputId: validatedInput.inputId,
    inputType: validatedInput.type,
    classification,
    riskScore,
    indicators: weightedIndicators.map(
      ({ indicator }) => indicator,
    ),
  });
}

function assertClassificationResult(result) {
  assert(
    result !== null &&
      typeof result === "object" &&
      !Array.isArray(result),
    "CLASSIFICATION_RESULT_IS_REQUIRED",
  );

  assert(
    typeof result.inputId === "string" &&
      result.inputId.length > 0,
    "CLASSIFICATION_INPUT_ID_IS_REQUIRED",
  );

  assert(
    typeof result.inputType === "string" &&
      result.inputType.length > 0,
    "CLASSIFICATION_INPUT_TYPE_IS_REQUIRED",
  );

  assert(
    Object.values(CLASSIFICATION).includes(
      result.classification,
    ),
    "CLASSIFICATION_STATE_IS_INVALID",
  );

  assert(
    Number.isInteger(result.riskScore) &&
      result.riskScore >= 0 &&
      result.riskScore <= MAX_RISK_SCORE,
    "CLASSIFICATION_RISK_SCORE_IS_INVALID",
  );

  assert(
    Array.isArray(result.indicators),
    "CLASSIFICATION_INDICATORS_MUST_BE_AN_ARRAY",
  );

  return deepFreeze({
    inputId: result.inputId,
    inputType: result.inputType,
    classification: result.classification,
    riskScore: result.riskScore,
    indicators: [...result.indicators],
  });
}

module.exports = {
  CLASSIFICATION,
  classifyValidatedInput,
  assertClassificationResult,
};
