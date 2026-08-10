/**
 * CyberCrowd — CASES → CORE Attachment
 *
 * ONE JOB:
 * Attach an existing CASES artifact to CORE without taking ownership
 * of the CASES artifact or recreating CORE behavior.
 *
 * Does NOT:
 * - interpret CASES meaning
 * - create authority
 * - create identity
 * - create lineage
 * - create a ledger
 * - mutate CORE
 * - route directly to NET
 * - replace an existing CORE organ
 *
 * Direction:
 *
 *   CASES → CORE
 *
 * This is intentionally structural.
 * CORE remains the authority for whatever happens after attachment.
 */

export interface CasesCoreAttachment {
  readonly attachmentType: "CASES_TO_CORE";
  readonly source: "CASES";
  readonly destination: "CORE";

  readonly attachedAt: string;

  /**
   * Stable reference supplied by CASES.
   * This adapter does not manufacture CASES identity.
   */
  readonly casesReference: string;

  /**
   * Structural artifact supplied by CASES.
   * CORE remains responsible for interpreting or processing it.
   */
  readonly casesArtifact: unknown;
}

/**
 * Create a structural CASES → CORE attachment.
 *
 * No CASES artifact is modified.
 * No CORE behavior is executed here.
 */
export const attachCasesToCore = (
  casesReference: string,
  casesArtifact: unknown,
): CasesCoreAttachment =>
  Object.freeze({
    attachmentType: "CASES_TO_CORE",
    source: "CASES",
    destination: "CORE",

    attachedAt:
      new Date().toISOString(),

    casesReference,
    casesArtifact,
  });
