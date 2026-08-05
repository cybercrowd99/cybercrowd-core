/**
 * CORE — Financial Organ Surface
 *
 * CyberCrowd-Core — CORE Financial Organ Surface Boundary Artifact
 *
 * The CORE Financial Organ Surface provides the bounded structural
 * presentation layer for the CCF financial organ binding.
 *
 * It does not:
 * - expose financial data
 * - expose identity
 * - expose accounts
 * - expose balances
 * - expose transactions
 * - perform routing
 * - create financial meaning
 *
 * Surface only:
 * - presents structural organ state
 * - preserves constitutional attachment
 * - maintains sovereignty boundaries
 * - provides neutral CORE surface
 */

import { CoreFinancialOrgan } from "./core-financial-organ-binding";
import { CoreFinancialOrganLifecycle } from "./core-financial-organ-lifecycle";
import { CoreFinancialOrganNeutralTransport } from "./core-financial-organ-neutral-transport";
import { CoreFinancialOrganAdjudication } from "./core-financial-organ-adjudication";
import { CoreFinancialOrganOutcome } from "./core-financial-organ-outcome";
import { CoreFinancialOrganQualifiers } from "./core-financial-organ-qualifiers";

/**
 * CORE Financial Organ Surface artifact.
 */
export interface CoreFinancialOrganSurface {
  /**
   * Constitutional attachment.
   */
  readonly doctrine: "CCF_Constitution_Attachment";

  /**
   * Artifact discriminator.
   */
  readonly status: "CORE_FINANCIAL_ORGAN_SURFACE";

  /**
   * Bound organ reference.
   */
  readonly organ: CoreFinancialOrgan;

  /**
   * Structural lifecycle.
   */
  readonly lifecycle: CoreFinancialOrganLifecycle;

  /**
   * Neutral transport state.
   */
  readonly transport: CoreFinancialOrganNeutralTransport;

  /**
   * Structural adjudication.
   */
  readonly adjudication: CoreFinancialOrganAdjudication;

  /**
   * Structural outcome.
   */
  readonly outcome: CoreFinancialOrganOutcome;

  /**
   * Structural qualifiers.
   */
  readonly qualifiers: CoreFinancialOrganQualifiers;
}

/**
 * Build CORE financial organ surface.
 *
 * Pure structural presentation.
 */
export function buildCoreFinancialOrganSurface(
  organ: CoreFinancialOrgan,
  lifecycle: CoreFinancialOrganLifecycle,
  transport: CoreFinancialOrganNeutralTransport,
  adjudication: CoreFinancialOrganAdjudication,
  outcome: CoreFinancialOrganOutcome,
  qualifiers: CoreFinancialOrganQualifiers
): CoreFinancialOrganSurface {
  const artifact: CoreFinancialOrganSurface = {
    doctrine: "CCF_Constitution_Attachment",

    status: "CORE_FINANCIAL_ORGAN_SURFACE",

    organ,

    lifecycle,

    transport,

    adjudication,

    outcome,

    qualifiers,
  };

  return Object.freeze(artifact);
}
