/**
 * CORE — Financial Organ Outcome
 *
 * CyberCrowd-Core — CORE Financial Organ Outcome Boundary Artifact
 *
 * The CORE Financial Organ Outcome provides a bounded structural
 * disposition layer for the CCF financial organ binding.
 *
 * It does not:
 * - approve financial activity
 * - authorize ownership
 * - identify people
 * - create accounts
 * - record transactions
 * - become a financial ledger
 * - infer behavior
 * - predict outcomes
 *
 * Outcome only:
 * - preserves adjudication results
 * - maintains structural disposition
 * - preserves constitutional context
 * - provides neutral downstream awareness
 */

import { CoreFinancialOrgan } from "./core-financial-organ-binding";
import { CoreFinancialOrganAdjudication } from "./core-financial-organ-adjudication";

/**
 * CORE Financial Organ Outcome artifact.
 */
export interface CoreFinancialOrganOutcome {
  /**
   * Constitutional attachment.
   */
  readonly doctrine: "CCF_Constitution_Attachment";

  /**
   * Artifact discriminator.
   */
  readonly status: "CORE_FINANCIAL_ORGAN_OUTCOME";

  /**
   * Bound financial organ reference.
   */
  readonly organ: CoreFinancialOrgan;

  /**
   * Preserved adjudication reference.
   */
  readonly adjudication: CoreFinancialOrganAdjudication;
}

/**
 * Build CORE Financial Organ Outcome.
 *
 * Pure structural disposition.
 */
export function buildCoreFinancialOrganOutcome(
  organ: CoreFinancialOrgan,
  adjudication: CoreFinancialOrganAdjudication
): CoreFinancialOrganOutcome {
  const artifact: CoreFinancialOrganOutcome = {
    doctrine: "CCF_Constitution_Attachment",

    status: "CORE_FINANCIAL_ORGAN_OUTCOME",

    organ,

    adjudication,
  };

  return Object.freeze(artifact);
}
