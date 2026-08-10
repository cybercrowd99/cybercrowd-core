/**
 * CORE — CASES → NET Handoff Surface
 *
 * ONE JOB:
 * Create a structural CORE → NET handoff for a CASES attachment
 * that has completed the CASES → CORE boundary sequence.
 *
 * This file does not contact NET.
 * It creates the bounded artifact that NET may receive.
 *
 * Does NOT:
 * - execute CORE behavior
 * - execute NET behavior
 * - mutate CASES
 * - mutate CORE
 * - create identity
 * - create lineage
 * - generate authority
 * - make decisions
 * - expose URLs
 * - contact external services
 */

import type { CoreCasesRouting } from "./core-cases-routing";

export interface CoreCasesNetHandoff {
  readonly handedOff: true;
  readonly handedOffAt: string;

  /**
   * Structural origin of the artifact.
   */
  readonly source: "CASES";

  /**
   * Structural boundary the artifact crossed.
   */
  readonly from: "CORE";

  /**
   * Structural destination for the next receiving surface.
   */
  readonly to: "NET";

  /**
   * The CASES attachment carried through CORE.
   * CORE does not modify it here.
   */
  readonly attachment: unknown;
}

export const createCasesNetHandoff = (
  routing: CoreCasesRouting,
): CoreCasesNetHandoff => {

  if (routing.direction !== "CORE_INTERNAL") {
    throw new Error(
      "CASES attachment is not eligible for CORE → NET handoff",
    );
  }

  return Object.freeze({
    handedOff: true as const,
    handedOffAt: new Date().toISOString(),

    source: "CASES" as const,
    from: "CORE" as const,
    to: "NET" as const,

    attachment:
      routing.attachment,
  });
};
