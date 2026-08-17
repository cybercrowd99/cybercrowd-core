/**
 * CORE — Zero-State Sentinel
 *
 * CyberCrowd Core — Runtime Collapse Guard
 *
 * Purpose:
 * Detect invalid runtime conditions before they become a
 * destructive handoff or continuity collapse.
 *
 * Owns:
 * - continuity-collapse detection
 * - illegal null-state detection
 * - missing-wake detection
 * - transfer-integrity detection
 * - engine-mismatch detection
 *
 * Does NOT own:
 * - state recovery
 * - engine scheduling
 * - engine execution
 * - continuity storage
 * - authorization
 * - rendering
 *
 * Boundary:
 * RUNTIME STATE → ZERO-STATE SENTINEL → GOVERNOR / HOLD
 */

export type ZeroStateStatus =
  | "CLEAR"
  | "HOLD"
  | "HALT";

export type ZeroStateReason =
  | "STATE_VALID"
  | "CONTINUITY_COLLAPSE"
  | "ILLEGAL_NULL_STATE"
  | "MISSING_WAKE"
  | "CORRUPTED_TRANSFER"
  | "ENGINE_MISMATCH";

export interface ZeroStateSnapshot {
  readonly stateReference: string | null;
  readonly currentEngine: string | null;
  readonly expectedEngine: string | null;
  readonly wakeReference: string | null;
  readonly continuityIntact: boolean;
  readonly transferIntact: boolean;
}

export interface ZeroStateResult {
  readonly status: ZeroStateStatus;
  readonly reason: ZeroStateReason;
  readonly stateReference: string | null;
  readonly currentEngine: string | null;
}

/**
 * Validate runtime state before a handoff.
 *
 * The sentinel never repairs or mutates state.
 * It only determines whether execution may continue.
 */
export function inspectZeroState(
  snapshot: ZeroStateSnapshot
): ZeroStateResult {

  if (!snapshot.stateReference) {
    return Object.freeze({
      status: "HALT",
      reason: "ILLEGAL_NULL_STATE",
      stateReference: null,
      currentEngine: snapshot.currentEngine
    });
  }

  if (!snapshot.continuityIntact) {
    return Object.freeze({
      status: "HALT",
      reason: "CONTINUITY_COLLAPSE",
      stateReference: snapshot.stateReference,
      currentEngine: snapshot.currentEngine
    });
  }

  if (!snapshot.wakeReference) {
    return Object.freeze({
      status: "HOLD",
      reason: "MISSING_WAKE",
      stateReference: snapshot.stateReference,
      currentEngine: snapshot.currentEngine
    });
  }

  if (!snapshot.transferIntact) {
    return Object.freeze({
      status: "HALT",
      reason: "CORRUPTED_TRANSFER",
      stateReference: snapshot.stateReference,
      currentEngine: snapshot.currentEngine
    });
  }

  if (
    !snapshot.currentEngine ||
    !snapshot.expectedEngine ||
    snapshot.currentEngine !== snapshot.expectedEngine
  ) {
    return Object.freeze({
      status: "HALT",
      reason: "ENGINE_MISMATCH",
      stateReference: snapshot.stateReference,
      currentEngine: snapshot.currentEngine
    });
  }

  return Object.freeze({
    status: "CLEAR",
    reason: "STATE_VALID",
    stateReference: snapshot.stateReference,
    currentEngine: snapshot.currentEngine
  });
}
