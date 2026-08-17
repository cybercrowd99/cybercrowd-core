/* ============================================================
   CORE — ADWORM PLACEMENT INTEGRITY CHECKER
   CyberCrowd Dual-Engine Runtime

   Purpose:
   Validate that an AdWorm presentation object is structurally
   legitimate before it enters the presentation path.

   Owns:
   - placement validation
   - sponsor-anchor validation
   - campaign-anchor validation
   - promotional-object authenticity checks
   - transaction-object separation checks

   Does NOT own:
   - campaign approval
   - sponsorship authorization
   - payment execution
   - rendering
   - AdWorm rotation
   - transaction settlement

   Boundary:
   CLAWD → ADWORM → PRESENTATION INTEGRITY
   ============================================================ */

export type AdWormPlacementIntegrityStatus =
  | "valid"
  | "invalid";

export type AdWormPlacementIntegrityReason =
  | "VALID"
  | "PLACEMENT_MISSING"
  | "SPONSOR_ANCHOR_MISSING"
  | "CAMPAIGN_ANCHOR_MISSING"
  | "PROMOTIONAL_OBJECT_SPOOFED"
  | "TRANSACTION_OBJECT_SPOOFED"
  | "ANCHOR_MISMATCH";

export interface AdWormPlacementIntegrityRequest {
  readonly placementId: string | null;
  readonly sponsorAnchor: string | null;
  readonly campaignAnchor: string | null;

  readonly objectType:
    | "promotional"
    | "transaction"
    | "unknown";

  readonly expectedObjectType:
    | "promotional"
    | "transaction";

  readonly expectedSponsorAnchor: string | null;
  readonly expectedCampaignAnchor: string | null;
}

export interface AdWormPlacementIntegrityResult {
  readonly status: AdWormPlacementIntegrityStatus;
  readonly reason: AdWormPlacementIntegrityReason;
}

/* ============================================================
   INTEGRITY CHECK
   ============================================================ */

export function checkAdWormPlacementIntegrity(
  request: AdWormPlacementIntegrityRequest
): AdWormPlacementIntegrityResult {

  if (!request.placementId) {
    return {
      status: "invalid",
      reason: "PLACEMENT_MISSING"
    };
  }

  if (!request.sponsorAnchor) {
    return {
      status: "invalid",
      reason: "SPONSOR_ANCHOR_MISSING"
    };
  }

  if (!request.campaignAnchor) {
    return {
      status: "invalid",
      reason: "CAMPAIGN_ANCHOR_MISSING"
    };
  }

  if (
    request.expectedSponsorAnchor !== null &&
    request.sponsorAnchor !==
      request.expectedSponsorAnchor
  ) {
    return {
      status: "invalid",
      reason: "ANCHOR_MISMATCH"
    };
  }

  if (
    request.expectedCampaignAnchor !== null &&
    request.campaignAnchor !==
      request.expectedCampaignAnchor
  ) {
    return {
      status: "invalid",
      reason: "ANCHOR_MISMATCH"
    };
  }

  if (
    request.objectType === "unknown"
  ) {
    return {
      status: "invalid",
      reason: "PROMOTIONAL_OBJECT_SPOOFED"
    };
  }

  if (
    request.objectType !==
    request.expectedObjectType
  ) {
    if (
      request.objectType === "promotional"
    ) {
      return {
        status: "invalid",
        reason: "TRANSACTION_OBJECT_SPOOFED"
      };
    }

    return {
      status: "invalid",
      reason: "PROMOTIONAL_OBJECT_SPOOFED"
    };
  }

  return {
    status: "valid",
    reason: "VALID"
  };
}
