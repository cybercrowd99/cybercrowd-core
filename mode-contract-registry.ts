/**
 * CORE — Mode Contract Registry
 *
 * CyberCrowd Core — Bounded Engine Handoff Registry
 *
 * Purpose:
 * Define which engines may hand off to which engines and the
 * continuity/fallback requirements governing each transition.
 *
 * Owns:
 * - permitted handoffs
 * - continuity requirements
 * - conservative fallback requirements
 * - forbidden transitions
 *
 * Does NOT own:
 * - engine execution
 * - continuity storage
 * - authorization
 * - identity
 * - financial activity
 * - rendering
 *
 * Boundary:
 * MODE CONTRACT REGISTRY → ENGINE GOVERNOR
 */

export type ModeContractRequirement =
  | "CONTINUITY_REQUIRED"
  | "CONSERVATIVE_FALLBACK"
  | "DIRECT";

export interface ModeContract {
  readonly from: string;
  readonly to: string;
  readonly requirement: ModeContractRequirement;
}

export interface ModeContractRegistry {
  readonly contracts: readonly ModeContract[];
  readonly forbidden: readonly ModeContract[];
}

/**
 * Canonical bounded transition registry.
 */
export const MODE_CONTRACT_REGISTRY: ModeContractRegistry =
  Object.freeze({
    contracts: Object.freeze([
      {
        from: "CLAWD",
        to: "ADWORM",
        requirement: "CONTINUITY_REQUIRED"
      },
      {
        from: "TRANSACTION",
        to: "PROMOTIONAL",
        requirement: "CONSERVATIVE_FALLBACK"
      },
      {
        from: "CONTINUITY",
        to: "SWITCH",
        requirement: "CONTINUITY_REQUIRED"
      }
    ]),

    forbidden: Object.freeze([
      {
        from: "TRANSACTION",
        to: "IDENTITY",
        requirement: "DIRECT"
      },
      {
        from: "PROMOTIONAL",
        to: "FINANCIAL",
        requirement: "DIRECT"
      }
    ])
  });

/**
 * Resolve a permitted transition.
 */
export function getModeContract(
  from: string,
  to: string
): ModeContract | null {

  return (
    MODE_CONTRACT_REGISTRY.contracts.find(
      contract =>
        contract.from === from &&
        contract.to === to
    ) || null
  );
}

/**
 * Determine whether a transition is explicitly forbidden.
 */
export function isModeTransitionForbidden(
  from: string,
  to: string
): boolean {

  return MODE_CONTRACT_REGISTRY.forbidden.some(
    contract =>
      contract.from === from &&
      contract.to === to
  );
}
