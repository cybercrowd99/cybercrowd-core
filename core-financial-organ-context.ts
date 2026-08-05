/**
 * CORE — Financial Organ Context
 * 
 * The CORE Financial Organ Context provides bounded structural
 * awareness for the CCF financial organ binding.
 *
 * It does not:
 * - store financial information
 * - contain identity
 * - store accounts
 * - store balances
 * - record transactions
 * - create user profiles
 * - become financial authority
 * - perform financial interpretation
 *
 * Context only:
 * - describes organ placement
 * - preserves neutral coordination awareness
 * - maintains constitutional separation
 * - supports CORE structural understanding
 */

import { CoreFinancialOrgan } from "./core-financial-organ-binding";

/**
 * CORE Financial Organ Context artifact.
 */
export interface CoreFinancialOrganContext {
  /**
   * Constitutional attachment.
   */
  readonly doctrine: "CCF_Constitution_Attachment";

  /**
   * Artifact discriminator.
   */
  readonly status: "CORE_FINANCIAL_ORGAN_CONTEXT";

  /**
   * Bound financial organ reference.
   */
  readonly organ: CoreFinancialOrgan;

  /**
   * Neutral structural context label.
   */
  readonly context: string;
}

/**
 * Build CORE Financial Organ Context.
 *
 * Pure structural awareness.
 */
export function buildCoreFinancialOrganContext(
  organ: CoreFinancialOrgan,
  context: string
): CoreFinancialOrganContext {
  const artifact: CoreFinancialOrganContext = {
    doctrine: "CCF_Constitution_Attachment",

    status: "CORE_FINANCIAL_ORGAN_CONTEXT",

    organ,

    context,
  };

  return Object.freeze(artifact);
}
