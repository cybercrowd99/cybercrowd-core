/**
 * CORE — Financial Organ Neutral Transport
 *
 * The CORE Financial Organ Neutral Transport provides bounded structural
 * movement for CORE financial organ envelopes attached to the CCF
 * constitutional doctrine.
 *
 * It does not:
 * - move money
 * - transfer ownership
 * - authorize transactions
 * - expose financial records
 * - identify people
 * - create identity relationships
 * - perform routing authority
 *
 * Neutral Transport only:
 * - describes structural movement condition
 * - preserves envelope integrity
 * - maintains sovereignty boundaries
 * - prevents semantic enrichment during movement
 */

import { CoreFinancialOrganEnvelope } from "./core-financial-organ-envelope";

/**
 * Structural transport states.
 */
export type CoreFinancialOrganTransportState =
  | "READY"
  | "TRANSFERRED"
  | "REJECTED";

/**
 * CORE Financial Organ Neutral Transport artifact.
 */
export interface CoreFinancialOrganNeutralTransport {
  /**
   * Constitutional attachment.
   */
  readonly doctrine: "CCF_Constitution_Attachment";

  /**
   * Artifact discriminator.
   */
  readonly status: "CORE_FINANCIAL_ORGAN_NEUTRAL_TRANSPORT";

  /**
   * Preserved organ envelope.
   */
  readonly envelope: CoreFinancialOrganEnvelope;

  /**
   * Structural transport condition.
   */
  readonly state: CoreFinancialOrganTransportState;
}

/**
 * Build CORE Financial Organ Neutral Transport.
 *
 * Pure structural movement.
 */
export function buildCoreFinancialOrganNeutralTransport(
  envelope: CoreFinancialOrganEnvelope,
  state: CoreFinancialOrganTransportState
): CoreFinancialOrganNeutralTransport {
  const artifact: CoreFinancialOrganNeutralTransport = {
    doctrine: "CCF_Constitution_Attachment",

    status: "CORE_FINANCIAL_ORGAN_NEUTRAL_TRANSPORT",

    envelope,

    state,
  };

  return Object.freeze(artifact);
}
