/**
 * CORE
 *
 * Exact path: core/turnstile/ephemeral-u-joint-validator.js
 * Title: Ephemeral U-Joint Validator
 * Purpose: Validate one untrusted input envelope before it reaches classification,
 *          Biff, Turd, Vacuum, or any live-session write path.
 * Owns: Input-envelope shape validation, validation result, and validation failures.
 * Does NOT own: Session identity, proof ledger, heartbeat, lease renewal,
 *               classification, Biff decisions, Turd routing, Vacuum quarantine,
 *               authentication, persistence, deletion, revocation, network transport,
 *               accepted-input execution, or live-session mutation.
 */

"use strict";

const VALIDATION_STATUS = Object.freeze({
  VALID: "VALID",
  INVALID: "INVALID",
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

function cloneJson(value) {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new Error("INPUT_PAYLOAD_MUST_BE_JSON_COMPATIBLE");
  }
}

function normalizeRequiredString(
  value,
  fieldName,
  maximumLength,
) {
  if (typeof value !== "string") {
    return {
      value: null,
      failure: `${fieldName.toUpperCase()}_MUST_BE_A_STRING`,
    };
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return {
      value: null,
      failure: `${fieldName.toUpperCase()}_IS_REQUIRED`,
    };
  }

  if (normalizedValue.length > maximumLength) {
    return {
      value: null,
      failure: `${fieldName.toUpperCase()}_EXCEEDS_MAXIMUM_LENGTH`,
    };
  }

  return {
    value: normalizedValue,
    failure: null,
  };
}

function validatePayload(payload) {
  if (payload === undefined) {
    return {
      value: null,
      failure: "INPUT_PAYLOAD_IS_REQUIRED",
    };
  }

  try {
    return {
      value: cloneJson(payload),
      failure: null,
    };
  } catch {
    return {
      value: null,
      failure: "INPUT_PAYLOAD_MUST_BE_JSON_COMPATIBLE",
    };
  }
}

function validateUntrustedInputEnvelope(input) {
  const failures = [];

  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return deepFreeze({
      status: VALIDATION_STATUS.INVALID,
      valid: false,
      normalizedInput: null,
      failures: [
        "UNTRUSTED_INPUT_ENVELOPE_MUST_BE_AN_OBJECT",
      ],
    });
  }

  const inputIdResult = normalizeRequiredString(
    input.inputId,
    "inputId",
    128,
  );

  const inputTypeResult = normalizeRequiredString(
    input.type,
    "inputType",
    64,
  );

  const payloadResult = validatePayload(input.payload);

  if (inputIdResult.failure) {
    failures.push(inputIdResult.failure);
  }

  if (inputTypeResult.failure) {
    failures.push(inputTypeResult.failure);
  }

  if (payloadResult.failure) {
    failures.push(payloadResult.failure);
  }

  const valid = failures.length === 0;

  return deepFreeze({
    status: valid
      ? VALIDATION_STATUS.VALID
      : VALIDATION_STATUS.INVALID,
    valid,
    normalizedInput: valid
      ? {
          inputId: inputIdResult.value,
          type: inputTypeResult.value.toUpperCase(),
          payload: payloadResult.value,
        }
      : null,
    failures,
  });
}

function assertValidUntrustedInputEnvelope(input) {
  const validation = validateUntrustedInputEnvelope(input);

  assert(
    validation.valid,
    validation.failures.join("|"),
  );

  return validation.normalizedInput;
}

module.exports = {
  VALIDATION_STATUS,
  validateUntrustedInputEnvelope,
  assertValidUntrustedInputEnvelope,
};
