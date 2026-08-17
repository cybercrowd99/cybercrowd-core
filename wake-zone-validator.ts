/**
 * CORE — Wake Zone Validator
 *
 * CyberCrowd Core — Transfer Integrity Boundary
 *
 * Purpose:
 * Validate the wake zone before an engine transfer is permitted.
 *
 * Owns:
 * - state integrity validation
 * - engine compatibility validation
 * - zero-state risk detection
 * - transfer legality validation
 * - continuity rail health validation
 *
 * Does NOT own:
 * - engine scheduling
 * - engine execution
 * - continuity state storage
 * - identity
 * - authorization
 * - financial activity
 *
 * Boundary:
 * WAKE ZONE VALIDATOR → ENGINE GOVERNOR
 */

export type WakeZoneValidationStatus =
  | "VALID"
  | "HOLD"
  | "INVALID";

export type WakeZoneValidationReason =
  | "VALID_WAKE_ZONE"
  | "STATE_INTEGRITY_FAILURE"
  | "ENGINE_INCOMPATIBLE"
  | "ZERO_STATE_RISK"
  | "TRANSFER_FORBIDDEN"
  | "CONTINUITY_RAIL_UNHEALTHY";

export interface WakeZone {
  readonly stateReference: string;
  readonly currentEngine: string;
  readonly nextEngine: string;
  readonly stateIntegrity: boolean;
  readonly continuityRailHealthy: boolean;
  readonly zeroStateRisk: boolean;
  readonly transferAllowed: boolean;
}

export interface WakeZoneValidationResult {
  readonly status: WakeZoneValidationStatus;
  readonly reason: WakeZoneValidationReason;
  readonly currentEngine: string;
  readonly nextEngine: string;
  readonly stateReference: string | null;
}

/**
 * Validate a wake zone before transfer.
 */
export function validateWakeZone(
  wakeZone: WakeZone
): WakeZoneValidationResult {

  if (!wakeZone.stateIntegrity) {
    return Object.freeze({
      status: "INVALID",
      reason: "STATE_INTEGRITY_FAILURE",
      currentEngine: wakeZone.currentEngine,
      nextEngine: wakeZone.nextEngine,
      stateReference: null
    });
  }

  if (!wakeZone.continuityRailHealthy) {
    return Object.freeze({
      status: "HOLD",
      reason: "CONTINUITY_RAIL_UNHEALTHY",
      currentEngine: wakeZone.currentEngine,
      nextEngine: wakeZone.nextEngine,
      stateReference: null
    });
  }

  if (wakeZone.zeroStateRisk) {
    return Object.freeze({
      status: "HOLD",
      reason: "ZERO_STATE_RISK",
      currentEngine: wakeZone.currentEngine,
      nextEngine: wakeZone.nextEngine,
      stateReference: null
    });
  }

  if (!wakeZone.transferAllowed) {
    return Object.freeze({
      status: "INVALID",
      reason: "TRANSFER_FORBIDDEN",
      currentEngine: wakeZone.currentEngine,
      nextEngine: wakeZone.nextEngine,
      stateReference: null
    });
  }

  if (wakeZone.currentEngine === wakeZone.nextEngine) {
    return Object.freeze({
      status: "VALID",
      reason: "VALID_WAKE_ZONE",
      currentEngine: wakeZone.currentEngine,
      nextEngine: wakeZone.nextEngine,
      stateReference: wakeZone.stateReference
    });
  }

  if (!wakeZone.currentEngine || !wakeZone.nextEngine) {
    return Object.freeze({
      status: "INVALID",
      reason: "ENGINE_INCOMPATIBLE",
      currentEngine: wakeZone.currentEngine,
      nextEngine: wakeZone.nextEngine,
      stateReference: null
    });
  }

  return Object.freeze({
    status: "VALID",
    reason: "VALID_WAKE_ZONE",
    currentEngine: wakeZone.currentEngine,
    nextEngine: wakeZone.nextEngine,
    stateReference: wakeZone.stateReference
  });
}
