// FILE: core-exit-intake.ts

/**
 * CORE CONTINUITY — Exit Intake
 *
 * CoreExitIntake is the structural handoff boundary between
 * CBCExitState and any subsequent CORE continuity subsystem.
 *
 * It receives the sealed CBCExitState artifact and binds it
 * into CORE without interpreting, modifying, enriching, or
 * correlating its structural meaning.
 *
 * CoreExitIntake does not contain:
 * - identity
 * - correlation
 * - behavior
 * - authority
 * - surveillance
 * - prediction
 * - continuity evaluation
 *
 * CoreExitIntake only contains:
 * - doctrine discriminator
 * - structural status
 * - sealed CBC exit artifact
 * - structural handoff reference
 */

import { CBCExitState } from "./cbc-exit-state";

export interface CoreExitIntake {
  doctrine: "CoreContinuity_ExitIntake";
  status: "CORE_EXIT_INTAKE";

  /**
   * Sealed CBC exit artifact.
   * Never modified, never interpreted.
   */
  exitState: CBCExitState;

  /**
   * Structural handoff message.
   * Never identity-bearing.
   */
  handoff: string;
}

/**
 * Build a CoreExitIntake artifact.
 *
 * This function binds the sealed CBCExitState into CORE.
 *
 * It does not:
 * - evaluate continuity
 * - modify CBCExitState
 * - enrich structure
 * - correlate sources
 * - create authority
 * - perform CORE continuity logic
 *
 * CoreExitIntake is a pure boundary artifact.
 */
export function buildCoreExitIntake(
  exitState: CBCExitState,
  handoff: string
): CoreExitIntake {
  const artifact: CoreExitIntake = {
    doctrine: "CoreContinuity_ExitIntake",
    status: "CORE_EXIT_INTAKE",

    exitState,
    handoff
  };

  return Object.freeze(artifact);
}
