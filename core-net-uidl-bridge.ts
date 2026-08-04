/**
 * CyberCrowd — CORE NET uIDL Bridge
 *
 * CyberCrowd-Core — CORE ↔ NET uIDL Boundary Artifact
 *
 * ONE JOB:
 * Provide a neutral structural bridge between NET-visible
 * uIDL references and CORE-controlled processing boundaries.
 *
 * It allows:
 * - NET to reference uIDL artifacts
 * - CORE to receive structural lineage
 * - public/private separation to remain intact
 *
 * It does not:
 * - execute actions
 * - interpret intent
 * - predict behavior
 * - identify people
 * - grant permissions
 * - create authority
 * - expose private CORE state
 */

export type CoreNetUIDLBridgeState =
  | "DECLARED"
  | "CONNECTED"
  | "DISCONNECTED";


export type CoreNetUIDLVisibility =
  | "PUBLIC_REFERENCE"
  | "PRIVATE_REFERENCE"
  | "BOUNDARY_REFERENCE";


export interface CoreNetUIDLBridge {

  /**
   * Governing doctrine.
   */
  doctrine:
    "CyberCrowd_CoreNetUIDLBridge";


  /**
   * Structural discriminator.
   */
  status:
    "CORE_NET_UIDL_BRIDGE";


  /**
   * Neutral uIDL reference.
   *
   * Structural only.
   * No identity meaning.
   */
  uidl:
    string;


  /**
   * NET-side reference.
   *
   * Represents a public surface connection.
   */
  netReference:
    string;


  /**
   * CORE-side boundary reference.
   *
   * Represents controlled internal linkage.
   */
  coreReference:
    string;


  /**
   * Declared visibility relationship.
   */
  visibility:
    CoreNetUIDLVisibility;


  /**
   * Passive lifecycle state.
   *
   * Not authority.
   * Not permission.
   * Not execution.
   */
  bridgeState:
    CoreNetUIDLBridgeState;
}


/**
 * Build CORE-NET uIDL bridge.
 *
 * Creates structural linkage only.
 *
 * It does not:
 * - route execution
 * - interpret users
 * - infer intent
 * - expose private data
 */
export function buildCoreNetUIDLBridge(
  uidl: string,
  netReference: string,
  coreReference: string,
  visibility: CoreNetUIDLVisibility
): CoreNetUIDLBridge {

  const artifact: CoreNetUIDLBridge = {

    doctrine:
      "CyberCrowd_CoreNetUIDLBridge",

    status:
      "CORE_NET_UIDL_BRIDGE",

    uidl,

    netReference,

    coreReference,

    visibility,

    bridgeState:
      "DECLARED",
  };


  return Object.freeze(artifact);
}
