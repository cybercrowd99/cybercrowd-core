/**
 * CORE CONTINUITY — Intake
 *
 * CoreContinuityIntake is the internal CORE boundary artifact
 * following CoreContinuityState.
 *
 * It receives the established CORE continuity condition and
 * prepares the boundary for subsequent CORE interpretation
 * layers.
 *
 * CoreContinuityIntake does not contain:
 * - identity
 * - correlation
 * - behavior
 * - authority
 * - surveillance
 * - prediction
 * - CBC rule evaluation
 *
 * CoreContinuityIntake only contains:
 * - doctrine discriminator
 * - structural status
 * - preserved CORE continuity state
 * - intake reference
 */

import { CoreContinuityState } from "./core-continuity-state";

export interface CoreContinuityIntake {
  /**
   * Governing CORE doctrine.
   */
  doctrine: "CoreContinuity_Intake";

  /**
   * Structural artifact discriminator.
   */
  status: "CORE_CONTINUITY_INTAKE";

  /**
   * Preserved CORE continuity condition.
   * Never identity-bearing.
   * Never enriched.
   */
  continuityState: CoreContinuityState;

  /**
   * Structural intake reference.
   * Never identity-bearing.
   */
  reference: string;
}

/**
 * Build CoreContinuityIntake artifact.
 *
 * This function receives CORE continuity state.
 *
 * It does not:
 * - interpret sovereignty
 * - evaluate permissions
 * - route connections
 * - modify continuity
 * - create authority
 *
 * CoreContinuityIntake is a passive boundary artifact.
 * Its only permitted refinement is structural immutability.
 */
export function buildCoreContinuityIntake(
  continuityState: CoreContinuityState,
  reference: string
): CoreContinuityIntake {
  const artifact: CoreContinuityIntake = {
    doctrine: "CoreContinuity_Intake",
    status: "CORE_CONTINUITY_INTAKE",

    continuityState,
    reference
  };

  return Object.freeze(artifact);
}
