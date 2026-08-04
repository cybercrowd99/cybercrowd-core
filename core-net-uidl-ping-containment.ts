/**
 * CyberCrowd — CORE NET uIDL Routing Target
 *
 * CyberCrowd-Core — CORE → NET Routing Boundary Artifact
 *
 * ONE JOB:
 * Define the allowed CORE destination categories for
 * neutral CoreNetUIDLBridge routing.
 *
 * It does:
 * - declare CORE destination vocabulary
 * - preserve routing boundaries
 * - maintain uIDL structural separation
 *
 * It does NOT:
 * - route artifacts
 * - execute actions
 * - interpret identity
 * - interpret intent
 * - grant permissions
 * - create authority
 * - expose private CORE state
 */


export type CoreNetUIDLRoutingTarget =
  | "HALO"
  | "BIFF"
  | "SECRETARY"
  | "OCTOPUS"
  | "DEWEY"
  | "PING"
  | "TURD"
  | "VACUUM"
  | "ARCHIVE"
  | "INEZ"
  | "CLEAR"
  | "CYBERSERVICES";


export interface CoreNetUIDLRoutingDeclaration {

  /**
   * Governing doctrine.
   */
  doctrine:
    "CyberCrowd_CoreNetUIDLRoutingTarget";


  /**
   * Structural discriminator.
   */
  status:
    "CORE_NET_UIDL_ROUTING_DECLARATION";


  /**
   * Neutral uIDL reference.
   *
   * Structural only.
   * No identity meaning.
   */
  uidl:
    string;


  /**
   * Declared CORE destination.
   *
   * Routing vocabulary only.
   * Not authority.
   */
  target:
    CoreNetUIDLRoutingTarget;


  /**
   * Passive routing lifecycle state.
   *
   * Not execution.
   * Not permission.
   */
  routingState:
    | "DECLARED"
    | "ACCEPTED"
    | "REJECTED";
}


/**
 * Build CORE NET uIDL routing declaration.
 *
 * Creates structural destination information only.
 *
 * It does not:
 * - route execution
 * - interpret users
 * - assign authority
 * - modify sovereignty
 */
export function buildCoreNetUIDLRoutingDeclaration(
  uidl: string,
  target: CoreNetUIDLRoutingTarget
): CoreNetUIDLRoutingDeclaration {

  const artifact: CoreNetUIDLRoutingDeclaration = {

    doctrine:
      "CyberCrowd_CoreNetUIDLRoutingTarget",

    status:
      "CORE_NET_UIDL_ROUTING_DECLARATION",

    uidl,

    target,

    routingState:
      "DECLARED",
  };


  return Object.freeze(artifact);
}
