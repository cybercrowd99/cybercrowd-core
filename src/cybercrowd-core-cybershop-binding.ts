/**
 * CYBERCROWD CORE
 *
 * CyberShop Binding
 *
 * ONE JOB:
 * Provide the structural binding between CyberCrowd CORE
 * and the completed CyberShop attachment.
 *
 * Boundary:
 *
 *   CyberShop
 *          │
 *          ▼
 *   CORE Binding
 *          │
 *          ▼
 *   CyberCrowd CORE
 *
 * This module does not:
 * - execute CyberShop behavior
 * - execute CORE behavior
 * - mutate CyberShop
 * - mutate CORE
 * - create identity
 * - establish authority
 * - create lineage
 * - create provenance
 * - write ledger records
 * - interpret commerce lifecycle
 *
 * It only preserves the declared structural connection between
 * CyberShop and CyberCrowd CORE.
 */

export type CyberCrowdCoreCyberShopBinding = Readonly<{
  cyberShop: unknown;
  target: "CORE";
}>;

/**
 * Bind the completed CyberShop attachment to CORE.
 *
 * The supplied CyberShop attachment remains the source of its own
 * declared structure. This function does not modify or reinterpret it.
 */
export function createCyberCrowdCoreCyberShopBinding(
  cyberShop: unknown,
): CyberCrowdCoreCyberShopBinding {
  return Object.freeze({
    cyberShop,
    target: "CORE",
  });
}
