/**
 * CyberCrowd Ledger Response
 *
 * File:
 * src/ledger-response.ts
 *
 * Subsystem:
 * CyberLedgerSubSystem
 *
 * Effigy:
 * Structural Ledger Response Layer
 *
 * Purpose:
 * Defines the structural response boundary used by CyberLedger
 * to wrap approved structural results into continuity-safe
 * subsystem response representations.
 *
 * Ledger responses preserve:
 * - structural response encapsulation
 * - continuity-safe result linkage
 * - subsystem response state
 * - approved structural output flow
 *
 * Ledger responses do NOT preserve:
 * - identity payloads
 * - identity correlation
 * - behavioral history
 * - operator profiles
 * - authority decisions
 * - surveillance data
 * - predictive models
 * - value assignment
 */

import {
  LedgerResult,
} from "./ledger-result";

export interface LedgerResponse {
  /** Structural subsystem reference */
  subsystem: "CyberLedgerSubSystem";

  /** Response layer state */
  status: "RESPONSE_READY";

  /** Linked structural result */
  result: LedgerResult;

  /** Response geometry */
  geometry: unknown;
}

/**
 * Creates a structural ledger response.
 *
 * Wraps structure.
 * Does not wrap identity.
 * Does not create authority.
 * Does not create decisions.
 */
export function createLedgerResponse(
  result: LedgerResult
): LedgerResponse {
  return {
    subsystem: "CyberLedgerSubSystem",
    status: "RESPONSE_READY",
    result,
    geometry: {
      type: "STRUCTURAL_RESPONSE",
    },
  };
}
