/**
 * CyberCrowd — CORE NET uIDL Bridge Release
 *
 * CyberCrowd-Core — CORE uIDL Bridge Release Boundary Artifact
 *
 * ONE JOB:
 * Release a contained CoreNetUIDLBridge artifact into the
 * approved CORE routing path without interpreting identity,
 * intent, permissions, authority, or meaning.
 *
 * It allows:
 * - contained bridge artifacts to continue through CORE flow
 * - structural lineage to remain intact
 * - NET→CORE movement to remain bounded
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


export type CoreNetUIDLBridgeReleaseState =
  | "RELEASED"
  | "BLOCKED"
  | "FAILED";


export interface CoreNetUIDLBridgeRelease {

  /**
   * Governing doctrine.
   */
  doctrine:
    "CyberCrowd_CoreNetUIDLBridgeRelease";


  /**
   * Structural discriminator.
   */
  status:
    "CORE_NET_UIDL_BRIDGE_RELEASE";


  /**
   * Release a contained neutral bridge artifact.
   *
   * Never:
   * - interprets identity
   * - interprets intent
   * - grants permissions
   * - creates authority
   */
  release(
    bridge: CoreNetUIDLBridge
  ): Promise<CoreNetUIDLBridgeReleaseState>;
}


/**
 * Build CORE NET uIDL bridge release boundary.
 *
 * Creates release movement only.
 *
 * It does not:
 * - execute capability operations
 * - interpret users
 * - infer meaning
 * - expose private data
 */
export function buildCoreNetUIDLBridgeRelease(
  releaseFn: (
    bridge: CoreNetUIDLBridge
  ) => Promise<CoreNetUIDLBridgeReleaseState>
): CoreNetUIDLBridgeRelease {

  const organ: CoreNetUIDLBridgeRelease = {

    doctrine:
      "CyberCrowd_CoreNetUIDLBridgeRelease",

    status:
      "CORE_NET_UIDL_BRIDGE_RELEASE",

    release:
      releaseFn,
  };


  return Object.freeze(organ);
}
