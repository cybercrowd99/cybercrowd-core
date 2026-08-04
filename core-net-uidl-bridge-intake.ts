/**
 * CyberCrowd — CORE NET uIDL Bridge Intake
 *
 * CyberCrowd-Core — CORE uIDL Bridge Intake Boundary Artifact
 *
 * ONE JOB:
 * Receive neutral CoreNetUIDLBridge artifacts entering CORE
 * without interpreting identity, intent, permissions,
 * authority, or meaning.
 *
 * It allows:
 * - CORE to acknowledge NET→uIDL structural lineage
 * - controlled entry into CORE routing flow
 * - sovereignty boundaries to remain intact
 *
 * It does not:
 * - execute actions
 * - infer identity
 * - infer intent
 * - grant permissions
 * - create authority
 * - transform uIDL references
 * - expose private CORE state
 */


import { CoreNetUIDLBridge } from "./core-net-uidl-bridge";


export type CoreNetUIDLBridgeIntakeState =
  | "RECEIVED"
  | "REJECTED";


export interface CoreNetUIDLBridgeIntake {

  /**
   * Governing doctrine.
   */
  doctrine:
    "CyberCrowd_CoreNetUIDLBridgeIntake";


  /**
   * Structural discriminator.
   */
  status:
    "CORE_NET_UIDL_BRIDGE_INTAKE";


  /**
   * Receive a neutral bridge artifact.
   *
   * Never:
   * - interprets identity
   * - interprets intent
   * - grants permissions
   * - creates authority
   */
  intake(
    bridge: CoreNetUIDLBridge
  ): Promise<CoreNetUIDLBridgeIntakeState>;
}


/**
 * Build CORE NET uIDL bridge intake.
 *
 * Creates structural receipt only.
 *
 * It does not:
 * - execute capability operations
 * - interpret users
 * - infer meaning
 * - expose private data
 */
export function buildCoreNetUIDLBridgeIntake(
  intakeFn: (
    bridge: CoreNetUIDLBridge
  ) => Promise<CoreNetUIDLBridgeIntakeState>
): CoreNetUIDLBridgeIntake {

  const organ: CoreNetUIDLBridgeIntake = {

    doctrine:
      "CyberCrowd_CoreNetUIDLBridgeIntake",

    status:
      "CORE_NET_UIDL_BRIDGE_INTAKE",

    intake:
      intakeFn,
  };


  return Object.freeze(organ);
}
