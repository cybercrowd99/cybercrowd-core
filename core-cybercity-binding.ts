/**
 * CORE — CyberCity Binding
 *
 * CoreCyberCityBinding is the passive CORE-side receiving artifact
 * for CyberCity structural presence.
 *
 * It receives the CyberCity binding boundary without acquiring
 * ownership, authority, execution rights, or behavioral control.
 *
 * It does not:
 * - execute rotation
 * - activate wheel behavior
 * - compute rotation
 * - modify CyberCity state
 * - mutate CORE continuity
 * - interpret place behavior
 * - create authority
 * - modify sovereignty
 *
 * CoreCyberCityBinding only:
 * - preserves CyberCity structural reference
 * - preserves CORE continuity boundary reference
 * - establishes passive receiving state
 * - maintains non-interference doctrine
 */

import { CyberCityCoreBinding } from "./cybercity-core-binding";

export interface CoreCyberCityBinding {
  /**
   * Governing CORE binding doctrine.
   */
  doctrine: "CORE_CyberCityBinding";

  /**
   * Structural artifact discriminator.
   */
  status: "CORE_CYBERCITY_BINDING";

  /**
   * Preserved CyberCity binding artifact.
   *
   * Never enriched.
   * Never modified.
   * Never interpreted.
   */
  cyberCityBinding: CyberCityCoreBinding;

  /**
   * CORE continuity boundary identifier.
   *
   * Structural reference only.
   * No ownership transfer.
   */
  coreBoundary: string;

  /**
   * Passive receiving state.
   */
  bindingState: "RECEIVED";
}

/**
 * Build CORE-side CyberCity binding artifact.
 *
 * This creates the passive receiving relationship between
 * CORE continuity and CyberCity structural presence.
 *
 * It does not:
 * - execute CyberCity operations
 * - route connections
 * - modify continuity
 * - modify sovereignty
 * - create authority
 */
export function buildCoreCyberCityBinding(
  cyberCityBinding: CyberCityCoreBinding,
  coreBoundary: string
): CoreCyberCityBinding {
  const artifact: CoreCyberCityBinding = {
    doctrine: "CORE_CyberCityBinding",
    status: "CORE_CYBERCITY_BINDING",

    cyberCityBinding,
    coreBoundary,

    bindingState: "RECEIVED",
  };

  return Object.freeze(artifact);
}
