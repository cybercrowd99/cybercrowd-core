/**
 * CORE
 *
 * Exact path: core/turnstile/ephemeral-u-joint-session-gate.js
 * Title: Ephemeral U-Joint Session Gate
 * Purpose: Enforce the only authorized transition between the Ephemeral
 *          U-Joint and the Live Session. No U-Joint component may write
 *          directly to live-session state.
 * Owns: Session gate authorization, route enforcement, write permission
 *       decisions, and immutable gate results.
 * Does NOT own: Session identity, proof ledger, heartbeat, input validation,
 *               classification, Biff decisions, Turd routing, Vacuum
 *               quarantine, authentication, persistence, deletion,
 *               revocation, network transport, or live-session mutation.
 */

"use strict";

const DECISION = Object.freeze({
  ALLOW: "ALLOW",
  HOLD: "HOLD",
  DENY: "DENY",
});

const ROUTE = Object.freeze({
  LIVE_SESSION: "LIVE_SESSION",
  VACUUM: "VACUUM",
  TURD: "TURD",
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

function requireDecision(result) {
  assert(
    result &&
      typeof result === "object" &&
      !Array.isArray(result),
    "BIFF_DECISION_RESULT_IS_REQUIRED",
  );

  assert(
    Object.values(DECISION).includes(result.decision),
    "INVALID_BIFF_DECISION",
  );

  return deepFreeze({
    inputId: String(result.inputId),
    decision: result.decision,
    classification: String(result.classification),
    riskScore: Number(result.riskScore),
  });
}

function evaluateSessionGate(biffDecision) {
  const decision = requireDecision(biffDecision);

  switch (decision.decision) {
    case DECISION.ALLOW:
      return createGateResult(
        decision,
        ROUTE.LIVE_SESSION,
        true,
        "LIVE_SESSION_GATE_OPEN",
      );

    case DECISION.HOLD:
      return createGateResult(
        decision,
        ROUTE.VACUUM,
        false,
        "ROUTE_TO_VACUUM_QUARANTINE",
      );

    case DECISION.DENY:
      return createGateResult(
        decision,
        ROUTE.TURD,
        false,
        "ROUTE_TO_TURD_RESIDUE",
      );

    default:
      throw new Error("UNKNOWN_GATE_DECISION");
  }
}

function createGateResult(
  decision,
  route,
  liveSessionWriteAllowed,
  reason,
) {
  return deepFreeze({
    inputId: decision.inputId,
    decision: decision.decision,
    classification: decision.classification,
    riskScore: decision.riskScore,

    route,

    liveSessionWriteAllowed,

    protectedResources: deepFreeze({
      immutableSessionIdentity: !liveSessionWriteAllowed,
      monotonicProofLedger: !liveSessionWriteAllowed,
      livenessLeaseHeartbeat: !liveSessionWriteAllowed,
    }),

    reason,
  });
}

function assertSessionGate(result) {
  assert(
    result &&
      typeof result === "object" &&
      !Array.isArray(result),
    "SESSION_GATE_RESULT_IS_REQUIRED",
  );

  assert(
    Object.values(ROUTE).includes(result.route),
    "INVALID_SESSION_GATE_ROUTE",
  );

  if (result.route === ROUTE.LIVE_SESSION) {
    assert(
      result.liveSessionWriteAllowed === true,
      "LIVE_SESSION_GATE_MUST_ALLOW_WRITES",
    );
  } else {
    assert(
      result.liveSessionWriteAllowed === false,
      "NON_LIVE_SESSION_ROUTE_MUST_BLOCK_WRITES",
    );
  }

  return deepFreeze(result);
}

module.exports = {
  ROUTE,
  evaluateSessionGate,
  assertSessionGate,
};
