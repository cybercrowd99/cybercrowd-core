/**
 * CyberCrowd — CORE NET uIDL Ping Containment
 *
 * ONE JOB:
 * Contain a neutral structural PING signal at the CORE organ
 * boundary without interpreting identity, intent, permissions,
 * authority, or meaning.
 *
 * PING is:
 * - structural continuity
 * - lineage heartbeat
 * - non-semantic
 * - non-authoritative
 * - non-identity
 *
 * It allows:
 * - CORE to enforce containment rules
 * - organ-level lineage to remain intact
 * - membrane boundaries to remain sovereign
 *
 * It does not:
 * - execute actions
 * - interpret identity
 * - infer intent
 * - grant permissions
 * - create authority
 * - transform uIDL references
 * - expose private CORE state
 */

import { CoreNetUIDLOrganReceiver } from "./core-net-uidl-organ-receiver";


export type CoreNetUIDLPingContainmentState =
  | "PING_CONTAINED"
  | "PING_TRANSFERRED"
  | "FAILED";


export interface CoreNetUIDLPingContainment {

  /**
   * Governing doctrine.
   */
  doctrine:
    "CyberCrowd_CoreNetUIDLPingContainment";


  /**
   * Structural discriminator.
   */
  status:
    "CORE_NET_UIDL_PING_CONTAINMENT";


  /**
   * Contain a neutral PING signal.
   *
   * Never:
   * - interprets identity
   * - interprets intent
   * - grants permissions
   * - creates authority
   */
  containPing(
    receiver: CoreNetUIDLOrganReceiver
  ): Promise<CoreNetUIDLPingContainmentState>;
}


/**
 * Build CORE NET uIDL ping containment organ.
 *
 * Creates structural PING containment only.
 *
 * It does not:
 * - execute capability operations
 * - interpret users
 * - infer meaning
 * - expose private data
 */
export function buildCoreNetUIDLPingContainment(
  containmentFn: (
    receiver: CoreNetUIDLOrganReceiver
  ) => Promise<CoreNetUIDLPingContainmentState>
): CoreNetUIDLPingContainment {

  const organ: CoreNetUIDLPingContainment = {

    doctrine:
      "CyberCrowd_CoreNetUIDLPingContainment",

    status:
      "CORE_NET_UIDL_PING_CONTAINMENT",

    containPing:
      containmentFn,
  };


  return Object.freeze(organ);
}
