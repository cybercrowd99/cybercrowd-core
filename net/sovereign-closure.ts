/**
 * CyberCrowd — Sovereign Closure V1
 *
 * Purpose:
 * - Seal the completed sovereign projection chain.
 * - Provide a bounded, immutable closure object that finalizes the Sovereign Envelope,
 *   Sovereign System View, CoreSovereignBinding, and CoreSovereignInterpretation.
 *
 * Does NOT:
 * - mutate any subsystem
 * - authorize behavior
 * - create lineage
 * - reinterpret any organ
 */

import type { SovereignSystemView } from "./sovereign-system-view";
import type { CoreSovereignBinding } from "../core/core-sovereign-binding";
import type { CoreSovereignInterpretation } from "../core/core-sovereign-interpreter";

export interface SovereignClosure {
  readonly envelopeReference: string;

  readonly viewCreatedAt: string;
  readonly bindingCreatedAt: string;
  readonly interpretationCreatedAt: string;

  readonly sealedAt: string;
}

export const sealSovereignChain = (
  view: SovereignSystemView,
  binding: CoreSovereignBinding,
  interpretation: CoreSovereignInterpretation,
): SovereignClosure => {

  const now =
    new Date().toISOString();

  return Object.freeze({
    envelopeReference:
      view.envelopeReference,

    viewCreatedAt:
      view.createdAt,

    bindingCreatedAt:
      binding.boundAt,

    interpretationCreatedAt:
      interpretation.interpretedAt,

    sealedAt:
      now,
  });
};
