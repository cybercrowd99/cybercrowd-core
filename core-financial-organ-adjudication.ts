/**
 * CORE — Financial Organ Adjudication
 *
 * The CORE Financial Organ Adjudication provides bounded structural
 * evaluation for the CCF financial organ binding.
 *
 * It does not:
 * - approve financial activity
 * - authorize ownership
 * - control accounts
 * - validate transactions
 * - identify people
 * - create identity authority
 * - become financial governance
 *
 * Adjudication only:
 * - evaluates structural compatibility
 * - preserves constitutional rules
 * - validates organ integrity
 * - maintains sovereignty boundaries
 */

import { CoreFinancialOrgan } from "./core-financial-organ-binding";

/**
 * Structural adjudication decisions.
 */
export type CoreFinancialOrganAdjudicationDecision =
  | "ACCEPTED"
  | "REVIEW"
  | "REJECTED";

/**
 * Structural adjudication reasons.
 */
export type CoreFinancialOrganAdjudicationReason =
  | "STRUCTURE_VALID"
  | "MISSING_ORGAN"
  | "INVALID_STRUCTURE"
  | "DOCTRINE_MISMATCH";

/**
 * CORE Financial Organ Adjudication artifact.
 */
export interface CoreFinancialOrganAdjudication {
  /**
   * Constitutional attachment.
   */
  readonly doctrine: "CCF_Constitution_Attachment";

  /**
   * Artifact discriminator.
   */
  readonly status: "CORE_FINANCIAL_ORGAN_ADJUDICATION";

  /**
   * Bound financial organ reference.
   */
  readonly organ: CoreFinancialOrgan;

  /**
   * Structural evaluation result.
   */
  readonly decision: CoreFinancialOrganAdjudicationDecision;

  /**
   * Structural reason.
   */
  readonly reason: CoreFinancialOrganAdjudicationReason;
}

/**
 * Build CORE Financial Organ Adjudication.
 *
 * Pure structural evaluation.
 */
export function buildCoreFinancialOrganAdjudication(
  organ: CoreFinancialOrgan,
  decision: CoreFinancialOrganAdjudicationDecision,
  reason: CoreFinancialOrganAdjudicationReason
): CoreFinancialOrganAdjudication {
  const artifact: CoreFinancialOrganAdjudication = {
    doctrine: "CCF_Constitution_Attachment",

    status: "CORE_FINANCIAL_ORGAN_ADJUDICATION",

    organ,

    decision,

    reason,
  };

  return Object.freeze(artifact);
}
