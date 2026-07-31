/**
 * CORE — Financial Organ Qualifiers
 *
 * The CORE Financial Organ Qualifiers provide bounded structural
 * descriptors for the CCF financial organ binding.
 *
 * They do not:
 * - store money
 * - represent ownership
 * - identify people
 * - record transactions
 * - validate financial activity
 * - infer behavior
 * - become a ledger
 *
 * Qualifiers only:
 * - describe organ structure
 * - preserve constitutional context
 * - maintain neutral classification
 * - preserve sovereignty invariants
 */

import { CoreFinancialOrgan } from "./core-financial-organ-binding";

/**
 * Structural CORE financial organ qualifiers.
 */
export type CoreFinancialOrganQualifier =
  | "ORGAN_PRESENT"
  | "ORGAN_BOUND"
  | "STRUCTURE_VALID"
  | "NEUTRAL_ARTIFACT";

/**
 * CORE Financial Organ Qualifier artifact.
 */
export interface CoreFinancialOrganQualifiers {
  /**
   * Constitutional attachment.
   */
  readonly doctrine: "CCF_Constitution_Attachment";

  /**
   * Artifact discriminator.
   */
  readonly status: "CORE_FINANCIAL_ORGAN_QUALIFIERS";

  /**
   * Bound organ reference.
   */
  readonly organ: CoreFinancialOrgan;

  /**
   * Structural descriptors.
   */
  readonly qualifiers: ReadonlyArray<CoreFinancialOrganQualifier>;
}

/**
 * Build CORE financial organ qualifiers.
 *
 * Pure structural classification.
 */
export function buildCoreFinancialOrganQualifiers(
  organ: CoreFinancialOrgan,
  qualifiers: ReadonlyArray<CoreFinancialOrganQualifier>
): CoreFinancialOrganQualifiers {
  return Object.freeze({
    doctrine: "CCF_Constitution_Attachment",
    status: "CORE_FINANCIAL_ORGAN_QUALIFIERS",
    organ,
    qualifiers: Object.freeze([...qualifiers]),
  });
}
