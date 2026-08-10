/**
 * CORE — Routing Surface for CASES Attachment
 *
 * ONE JOB:
 * Provide a non-executing routing surface for a processed
 * CASES → CORE attachment. CORE determines the allowed
 * structural direction without acting, mutating, or contacting NET.
 *
 * Does NOT:
 * - execute CORE logic
 * - mutate CASES or CORE
 * - create identity
 * - create lineage
 * - generate authority
 * - route to NET
 * - perform decisions or actions
 */

export interface CoreCasesRouting {
  readonly routed: true;
  readonly routedAt: string;

  /**
   * The processed attachment.
   * CORE determines allowed direction but does not act on it.
   */
  readonly attachment: unknown;

  /**
   * Structural direction only.
   * No execution, no NET, no mutation.
   */
  readonly direction: "LOCAL" | "CORE_INTERNAL" | "BLOCKED";
}

export const routeCasesAttachment = (
  attachment: unknown,
  direction: "LOCAL" | "CORE_INTERNAL" | "BLOCKED",
): CoreCasesRouting =>
  Object.freeze({
    routed: true,
    routedAt: new Date().toISOString(),
    attachment,
    direction,
  });
