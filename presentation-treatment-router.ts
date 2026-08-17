/**
 * CORE — Presentation Treatment Router
 *
 * CyberCrowd Core — Presentation Treatment Execution Boundary
 *
 * Purpose:
 * Execute the treatment selected by the Clawd Presentation Context.
 *
 * Owns:
 * - PRESERVE routing
 * - ADWORM_CONTROLLED routing
 * - CONSERVATIVE routing
 *
 * Does NOT own:
 * - context classification
 * - advertising approval
 * - payment authorization
 * - identity decisions
 * - AdWorm rendering
 * - ledger storage
 *
 * Boundary:
 * CLAWD PRESENTATION DECISION → TREATMENT ROUTE
 */

export type PresentationTreatment =
  | "PRESERVE"
  | "ADWORM_CONTROLLED"
  | "CONSERVATIVE";

export type PresentationRoute =
  | "BYPASS_ADWORM"
  | "ADWORM"
  | "SAFE_MINIMAL";

export interface PresentationTreatmentRequest {
  readonly objectId: string;
  readonly treatment: PresentationTreatment;
  readonly adWormPlacementId?: string;
}

export interface PresentationTreatmentResult {
  readonly objectId: string;
  readonly treatment: PresentationTreatment;
  readonly route: PresentationRoute;
  readonly adWormPlacementId: string | null;
}

/**
 * Execute the presentation treatment.
 *
 * This function selects a bounded route only.
 * It does not render, mutate, authorize, or create placement data.
 */
export function routePresentationTreatment(
  request: PresentationTreatmentRequest
): PresentationTreatmentResult {

  switch (request.treatment) {

    case "PRESERVE":
      return Object.freeze({
        objectId: request.objectId,
        treatment: "PRESERVE",
        route: "BYPASS_ADWORM",
        adWormPlacementId: null
      });

    case "ADWORM_CONTROLLED":
      return Object.freeze({
        objectId: request.objectId,
        treatment: "ADWORM_CONTROLLED",
        route: "ADWORM",
        adWormPlacementId:
          request.adWormPlacementId || null
      });

    case "CONSERVATIVE":
    default:
      return Object.freeze({
        objectId: request.objectId,
        treatment: "CONSERVATIVE",
        route: "SAFE_MINIMAL",
        adWormPlacementId: null
      });
  }
}
