/**
 * CORE — Engine Governor
 *
 * CyberCrowd Core — Top-Layer Engine Transition Controller
 *
 * Purpose:
 * Select the next permitted engine while preserving continuity
 * through the existing Continuity Engine boundary.
 *
 * Owns:
 * - engine selection
 * - allowed transition enforcement
 * - illegal mode-jump prevention
 * - transition decision
 *
 * Does NOT own:
 * - continuity state storage
 * - engine execution
 * - identity
 * - authorization
 * - financial activity
 * - service execution
 *
 * Boundary:
 * ENGINE GOVERNOR → CONTINUITY ENGINE → SELECTED ENGINE
 */

export type EngineGovernorStatus =
  | "ALLOW"
  | "HOLD"
  | "DENY";

export interface EngineGovernorState {
  readonly currentEngine: string;
  readonly currentState: string;
  readonly preservedStateReference: string;
}

export interface EngineGovernorRequest {
  readonly requestedEngine: string;
  readonly requestedMode: string;
}

export interface EngineGovernorPolicy {
  readonly allowedTransitions: Readonly<
    Record<string, readonly string[]>
  >;
}

export interface EngineTransitionDecision {
  readonly status: EngineGovernorStatus;
  readonly currentEngine: string;
  readonly nextEngine: string | null;
  readonly requestedMode: string;
  readonly reason:
    | "ALLOWED_TRANSITION"
    | "ILLEGAL_TRANSITION"
    | "NO_CONTINUITY_STATE"
    | "ENGINE_NOT_AVAILABLE";
  readonly preservedStateReference: string | null;
}

/**
 * Select the next engine without executing it.
 */
export function decideEngineTransition(
  state: EngineGovernorState,
  request: EngineGovernorRequest,
  policy: EngineGovernorPolicy
): EngineTransitionDecision {

  if (!state.preservedStateReference) {
    return Object.freeze({
      status: "HOLD",
      currentEngine: state.currentEngine,
      nextEngine: null,
      requestedMode: request.requestedMode,
      reason: "NO_CONTINUITY_STATE",
      preservedStateReference: null
    });
  }

  const allowed =
    policy.allowedTransitions[state.currentEngine] || [];

  if (!allowed.includes(request.requestedEngine)) {
    return Object.freeze({
      status: "DENY",
      currentEngine: state.currentEngine,
      nextEngine: null,
      requestedMode: request.requestedMode,
      reason: "ILLEGAL_TRANSITION",
      preservedStateReference:
        state.preservedStateReference
    });
  }

  return Object.freeze({
    status: "ALLOW",
    currentEngine: state.currentEngine,
    nextEngine: request.requestedEngine,
    requestedMode: request.requestedMode,
    reason: "ALLOWED_TRANSITION",
    preservedStateReference:
      state.preservedStateReference
  });
}
