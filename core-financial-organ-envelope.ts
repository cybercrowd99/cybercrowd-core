/**
 * CORE — Financial Organ Envelope
 *
 * The CORE Financial Organ Envelope provides a bounded structural
 * wrapper for the CCF financial organ binding.
 *
 * It does not:
 * - store money
 * - represent ownership
 * - identify people
 * - contain accounts
 * - contain balances
 * - record transactions
 * - perform routing
 * - expose NET surfaces
 *
 * Envelope only:
 * - preserves organ integrity
 * - provides neutral structural wrapping
 * - maintains constitutional context
 * - supports controlled CORE movement
 */

import { CoreFinancialOrgan } from "./core-financial-organ-binding";

/**
 * CORE Financial Organ Envelope artifact.
 */
export interface CoreFinancialOrganEnvelope {
  /**
   * Constitutional attachment.
   */
  readonly doctrine: "CCF_Constitution_Attachment";

  /**
   * Artifact discriminator.
   */
  readonly status: "CORE_FINANCIAL_ORGAN_ENVELOPE";

  /**
   * Opaque structural envelope identifier.
   */
  readonly envelopeId: string;

  /**
   * Preserved CORE financial organ reference.
   *
   * Never enriched.
   * Never interpreted.
   */
  readonly organ: CoreFinancialOrgan;
}

/**
 * Build CORE Financial Organ Envelope.
 *
 * Pure structural wrapping.
 */
export function buildCoreFinancialOrganEnvelope(
  envelopeId: string,
  organ: CoreFinancialOrgan
): CoreFinancialOrganEnvelope {
  const artifact: CoreFinancialOrganEnvelope = {
    doctrine: "CCF_Constitution_Attachment",

    status: "CORE_FINANCIAL_ORGAN_ENVELOPE",

    envelopeId,

    organ,
  };

  return Object.freeze(artifact);
}
