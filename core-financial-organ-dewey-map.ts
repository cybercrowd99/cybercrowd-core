/**
 * CORE — Financial Organ Dewey Map
 * 
 * The CORE Financial Organ Dewey Map provides bounded structural
 * organization for the CCF financial organ binding.
 *
 * It does not:
 * - store money
 * - represent ownership
 * - identify people
 * - record transactions
 * - create financial history
 * - become a ledger
 * - perform financial interpretation
 *
 * Dewey Map only:
 * - classifies CORE financial organ structure
 * - preserves neutral organization
 * - maintains constitutional context
 * - supports bounded repository navigation
 */

import { CoreFinancialOrgan } from "./core-financial-organ-binding";

/**
 * Structural Dewey classification node.
 *
 * Path and label contain no financial meaning.
 */
export interface CoreFinancialOrganDeweyNode {
  /**
   * Neutral structural path.
   */
  readonly path: string;

  /**
   * Neutral structural label.
   */
  readonly label: string;
}

/**
 * CORE Financial Organ Dewey Map artifact.
 */
export interface CoreFinancialOrganDeweyMap {
  /**
   * Constitutional attachment.
   */
  readonly doctrine: "CCF_Constitution_Attachment";

  /**
   * Artifact discriminator.
   */
  readonly status: "CORE_FINANCIAL_ORGAN_DEWEY_MAP";

  /**
   * Bound financial organ reference.
   */
  readonly organ: CoreFinancialOrgan;

  /**
   * Immutable structural classification.
   */
  readonly nodes: ReadonlyArray<CoreFinancialOrganDeweyNode>;
}

/**
 * Build CORE Financial Organ Dewey Map.
 *
 * Pure structural organization.
 */
export function buildCoreFinancialOrganDeweyMap(
  organ: CoreFinancialOrgan,
  nodes: ReadonlyArray<CoreFinancialOrganDeweyNode>
): CoreFinancialOrganDeweyMap {
  return Object.freeze({
    doctrine: "CCF_Constitution_Attachment",
    status: "CORE_FINANCIAL_ORGAN_DEWEY_MAP",
    organ,
    nodes: Object.freeze([...nodes]),
  });
}
