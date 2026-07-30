/**
 * CORE NET — Connection Intake
 *
 * CoreNetConnectionIntake is the CORE → NET boundary artifact
 * responsible for receiving sovereignty-safe structural readiness
 * from CoreSovereigntyInterpreter before any NET connection
 * subsystem is permitted to operate.
 *
 * It does not create authority.
 * It does not route connections.
 * It does not evaluate identity.
 * It does not modify sovereignty.
 *
 * CoreNetConnectionIntake does not contain:
 * - identity
 * - correlation
 * - behavior
 * - surveillance
 * - prediction
 * - routing directives
 * - external authority
 *
 * CoreNetConnectionIntake only contains:
 * - doctrine discriminator
 * - structural status
 * - preserved CORE sovereignty interpreter
 * - structural connection readiness state
 */

import { CoreSovereigntyInterpreter } from "./core-sovereignty-interpreter";
import { CoreNetConnectionState } from "./core-net-connection-state";

export interface CoreNetConnectionIntake {
  /**
   * Governing CORE → NET doctrine.
   */
  doctrine: "CoreNet_ConnectionIntake";

  /**
   * Structural artifact discriminator.
   */
  status: "CORE_NET_CONNECTION_INTAKE";

  /**
   * Preserved sovereignty interpretation boundary.
   * Never identity-bearing.
   * Never enriched.
   */
  sovereignty: CoreSovereigntyInterpreter;

  /**
   * Preserved structural connection state.
   *
   * This is not routing.
   * This is not authority.
   * This is not permission.
   * This is not sovereignty interpretation.
   */
  connectionState: CoreNetConnectionState;
}

/**
 * Build CoreNetConnectionIntake artifact.
 *
 * This function receives sovereignty-safe structural readiness.
 *
 * It does not:
 * - create authority
 * - route connections
 * - evaluate identity
 * - modify sovereignty
 * - enrich continuity
 * - interpret sovereignty state
 *
 * CoreNetConnectionIntake is a passive boundary artifact.
 * Its only permitted refinement is structural immutability.
 */
export function buildCoreNetConnectionIntake(
  sovereignty: CoreSovereigntyInterpreter,
  connectionState: CoreNetConnectionState
): CoreNetConnectionIntake {
  const artifact: CoreNetConnectionIntake = {
    doctrine: "CoreNet_ConnectionIntake",
    status: "CORE_NET_CONNECTION_INTAKE",

    sovereignty,
    connectionState
  };

  return Object.freeze(artifact);
}
