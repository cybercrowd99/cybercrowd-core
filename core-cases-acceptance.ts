/**
 * CORE — Acceptance Surface for CASES Attachment
 *
 * ONE JOB:
 * Accept a structural CASES → CORE attachment without
 * interpreting, mutating, or executing CORE behavior.
 *
 * Does NOT:
 * - interpret CASES meaning
 * - create CORE identity
 * - create lineage
 * - create authority
 * - execute CORE logic
 * - route to NET
 * - absorb CASES
 */

export interface CoreCasesAcceptance {
  readonly accepted: true;
  readonly acceptedAt: string;

  /**
   * The attachment object created by CASES.
   * CORE does not modify or interpret it here.
   */
  readonly attachment: unknown;
}

export const acceptCasesAttachment = (
  attachment: unknown,
): CoreCasesAcceptance =>
  Object.freeze({
    accepted: true,
    acceptedAt: new Date().toISOString(),
    attachment,
  });
