/**
 * CYBERCROWD CORE
 *
 * NET Handoff
 *
 * ONE JOB:
 * Provide the structural handoff from the completed CyberCrowd CORE
 * CyberShop binding to NET.
 *
 * Boundary:
 *
 *   CyberCrowd CORE
 *          │
 *          ▼
 *   NET Handoff
 *          │
 *          ▼
 *   CyberCrowd NET
 *
 * This module does not:
 * - execute CORE behavior
 * - execute NET behavior
 * - mutate CORE
 * - mutate CyberShop
 * - create identity
 * - establish authority
 * - create lineage
 * - create provenance
 * - write ledger records
 * - interpret commerce lifecycle
 *
 * It only preserves the declared structural handoff from CORE to NET.
 */

export type CyberCrowdCoreNetHandoff = Readonly<{
  core: unknown;
  target: "NET";
}>;

/**
 * Hand off the completed CORE CyberShop binding to NET.
 *
 * The supplied CORE binding remains the source of its own declared
 * structure. This function does not modify or reinterpret it.
 */
export function createCyberCrowdCoreNetHandoff(
  core: unknown,
): CyberCrowdCoreNetHandoff {
  return Object.freeze({
    core,
    target: "NET",
  });
}
