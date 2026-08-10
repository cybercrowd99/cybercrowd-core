/**
 * CORE — Interpretation Surface for CASES Attachment
 *
 * ONE JOB:
 * Provide a non-executing interpretation surface for a verified
 * CASES → CORE attachment. CORE may read the artifact but does
 * not act on it, mutate it, or route it.
 *
 * Does NOT:
 * - execute CORE logic
 * - create authority
 * - create identity
 * - create lineage
 * - mutate CASES or CORE
 * - route to NET
 * - produce decisions
 */

export interface CoreCasesInterpretation {
  readonly interpreted: true;
  readonly interpretedAt: string;

  /**
   * The verified attachment.
   * CORE may read but not mutate or act on it.
   */
  readonly attachment: unknown;
}

export const interpretCasesAttachment = (
  attachment: unknown,
): CoreCasesInterpretation =>
  Object.freeze({
    interpreted: true,
    interpretedAt: new Date().toISOString(),
    attachment,
  });
