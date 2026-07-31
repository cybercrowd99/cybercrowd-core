/**
 * CyberCrowd — CORE NET uIDL Ping Surface
 *
 * ONE JOB:
 * Provide a neutral structural surface for PING signals at the
 * CORE organ boundary without interpreting identity, intent,
 * permissions, authority, or meaning.
 *
 * PING is:
 * - structural continuity
 * - lineage heartbeat
 * - non-semantic
 * - non-authoritative
 * - non-identity
 *
 * It allows:
 * - CORE to expose a stable, sovereign surface for PING
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

import { CoreNetUIDLPingReceipt } from "./core-net-uidl-ping-receipt";


export type CoreNetUIDLPingSurfaceState =
  | "PING_SURFACED"
  | "PING_DENIED"
  | "FAILED";


export interface CoreNetUIDLPingSurface {

  /**
   * Governing doctrine.
   */
  doctrine:
    "CyberCrowd_CoreNetUIDLPingSurface";


  /**
   * Structural discriminator.
   */
  status:
    "CORE_NET_UIDL_PING_SURFACE";


  /**
   * Surface a neutral PING signal.
   *
   * Never:
   * - interprets identity
   * - interprets intent
   * - grants permissions
   * - creates authority
   */
  surfacePing(
    receipt: CoreNetUIDLPingReceipt
  ): Promise<CoreNetUIDLPingSurfaceState>;
}


/**
 * Build CORE NET uIDL ping surface organ.
 *
 * Creates structural PING surface only.
 *
 * It does not:
 * - execute capability operations
 * - interpret users
 * - infer meaning
 * - expose private data
 */
export function buildCoreNetUIDLPingSurface(
  surfaceFn: (
    receipt: CoreNetUIDLPingReceipt
  ) => Promise<CoreNetUIDLPingSurfaceState>
): CoreNetUIDLPingSurface {

  const organ: CoreNetUIDLPingSurface = {

    doctrine:
      "CyberCrowd_CoreNetUIDLPingSurface",

    status:
      "CORE_NET_UIDL_PING_SURFACE",

    surfacePing:
      surfaceFn,
  };


  return Object.freeze(organ);
}
