/**
 * CORE — NET CyberCity Surface
 *
 * CyberCrowd-Core — CORE → NET CyberCity Surface Boundary Artifact
 *
 * CoreNetCyberCitySurface is the passive CORE-to-NET exposure
 * boundary for CyberCity structural continuity.
 *
 * It presents preserved CyberCity presence toward NET without
 * transferring ownership, authority, execution rights, or behavior.
 *
 * It does not:
 * - execute rotation
 * - activate wheel behavior
 * - compute rotation
 * - route connections
 * - modify CyberCity state
 * - mutate CORE continuity
 * - evaluate identity
 * - enrich place data
 * - create authority
 * - modify sovereignty
 *
 * CoreNetCyberCitySurface only:
 * - exposes CORE-preserved CyberCity continuity
 * - establishes passive NET-facing presence
 * - maintains structural separation
 * - preserves non-interference doctrine
 */

import { CoreCyberCityContinuity } from "./core-cybercity-continuity";

export interface CoreNetCyberCitySurface {
  /**
   * Governing CORE/NET surface doctrine.
   */
  doctrine: "CORE_NET_CyberCitySurface";

  /**
   * Structural artifact discriminator.
   */
  status: "CORE_NET_CYBERCITY_SURFACE";

  /**
   * Preserved CORE CyberCity continuity.
   *
   * Never enriched.
   * Never modified.
   * Never interpreted.
   */
  continuity: CoreCyberCityContinuity;

  /**
   * Passive exposure state.
   */
  surfaceState: "EXPOSED";
}

/**
 * Build CORE-NET CyberCity surface artifact.
 *
 * This creates the passive exposure boundary between
 * CORE continuity and NET presentation.
 *
 * It does not:
 * - activate public behavior
 * - route connections
 * - execute services
 * - modify CORE
 * - modify CyberCity
 * - create authority
 */
export function buildCoreNetCyberCitySurface(
  continuity: CoreCyberCityContinuity
): CoreNetCyberCitySurface {
  const artifact: CoreNetCyberCitySurface = {
    doctrine: "CORE_NET_CyberCitySurface",
    status: "CORE_NET_CYBERCITY_SURFACE",

    continuity,

    surfaceState: "EXPOSED",
  };

  return Object.freeze(artifact);
}
