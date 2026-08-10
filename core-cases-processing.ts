/**
 * CORE — Processing Surface for CASES Attachment
 *
 * ONE JOB:
 * Provide a non-executing processing surface for an interpreted
 * CASES → CORE attachment. CORE may prepare structural handling
 * but does not execute behavior, mutate artifacts, or route.
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

export interface CoreCasesProcessing {
  readonly processed: true;
  readonly processedAt: string;

  /**
   * The interpreted attachment.
   * CORE may prepare structural handling but does not act on it.
   */
  readonly attachment: unknown;
}

export const processCasesAttachment = (
  attachment: unknown,
): CoreCasesProcessing =>
  Object.freeze({
    processed: true,
    processedAt: new Date().toISOString(),
    attachment,
  });
