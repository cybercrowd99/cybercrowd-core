/**
 * CyberCrowd — CyberService Result Delivery Envelope
 *
 * CyberCrowd-Core — CyberService Result Delivery Boundary
 *
 * CyberServiceResultDeliveryEnvelope is the structural delivery
 * boundary for routed capability-defined results produced by
 * CyberCrowd-Core.
 *
 * It receives CyberServiceResultRoutingEnvelope artifacts and
 * completes delivery to a declared destination without
 * interpreting identity, inferring intent, creating authority,
 * or modifying result meaning.
 *
 * It does not:
 * - contain identity
 * - contain intent
 * - grant permissions
 * - create authority
 * - infer meaning
 * - predict behavior
 * - select human treatment
 * - transform capability results
 *
 * CyberServiceResultDeliveryEnvelope only:
 * - receives routed capability results
 * - confirms structural delivery state
 * - preserves execution lineage
 * - maintains CyberCrowd-Core sovereignty boundaries
 * - separates delivery from interpretation
 */

import { CyberServiceResultRoutingEnvelope } from "./cybercrowd-service-result-routing-envelope";

/**
 * Structural definition of a delivered CyberService result.
 */
export interface CyberServiceResultDeliveryEnvelope {
  /**
   * Governing CyberCrowd doctrine.
   */
  doctrine: "CyberCrowd_CyberServiceResultDeliveryEnvelope";

  /**
   * Structural artifact discriminator.
   */
  status: "CYBERCROWD_SERVICE_RESULT_DELIVERY_ENVELOPE";

  /**
   * Routed capability result.
   *
   * Never interpreted.
   * Never enriched.
   * Never transformed.
   */
  routing: CyberServiceResultRoutingEnvelope;

  /**
   * Opaque delivery reference.
   *
   * Structural only.
   * No semantic meaning.
   */
  deliveryId: string;

  /**
   * Destination confirmation reference.
   *
   * Confirms delivery target receipt.
   *
   * Does not:
   * - identify a person
   * - infer preference
   * - create authority
   */
  deliveryTargetRef: string;

  /**
   * Passive delivery lifecycle state.
   *
   * Not interpretation.
   * Not execution.
   * Not authority.
   */
  deliveryState: "PENDING" | "DELIVERED" | "FAILED";
}

/**
 * Build a CyberServiceResultDeliveryEnvelope artifact.
 *
 * Creates the CyberCrowd-Core delivery membrane:
 *
 * CyberServiceResultRoutingEnvelope:
 *   declared result destination
 *
 * CyberServiceResultDeliveryEnvelope:
 *   completed structural transfer
 *
 * It does not:
 * - interpret results
 * - profile users
 * - infer intent
 * - predict behavior
 * - modify sovereignty
 */
export function buildCyberServiceResultDeliveryEnvelope(
  routing: CyberServiceResultRoutingEnvelope,
  deliveryId: string,
  deliveryTargetRef: string
): CyberServiceResultDeliveryEnvelope {
  const artifact: CyberServiceResultDeliveryEnvelope = {
    doctrine:
      "CyberCrowd_CyberServiceResultDeliveryEnvelope",

    status:
      "CYBERCROWD_SERVICE_RESULT_DELIVERY_ENVELOPE",

    routing,

    deliveryId,

    deliveryTargetRef,

    deliveryState: "PENDING",
  };

  return Object.freeze(artifact);
}
