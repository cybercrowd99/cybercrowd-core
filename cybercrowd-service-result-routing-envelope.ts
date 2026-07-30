/**
 * CyberCrowd — CyberService Result Routing Envelope
 *
 * CyberServiceResultRoutingEnvelope is the structural routing
 * boundary for capability-defined results produced by
 * CyberCrowd-Core.
 *
 * It receives CyberServiceResultEnvelope artifacts and defines
 * where neutral results may be delivered without interpreting
 * identity, inferring intent, creating authority, or predicting
 * behavior.
 *
 * It does not:
 * - contain identity
 * - contain intent
 * - grant permissions
 * - create authority
 * - infer meaning
 * - predict behavior
 * - select human treatment
 *
 * CyberServiceResultRoutingEnvelope only:
 * - receives neutral capability results
 * - declares structural destination routing
 * - preserves execution lineage
 * - maintains sovereignty boundaries
 * - separates result delivery from interpretation
 */

import { CyberServiceResultEnvelope } from "./cybercrowd-service-result-envelope";

/**
 * Structural definition of a routed CyberService result.
 */
export interface CyberServiceResultRoutingEnvelope {
  /**
   * Governing CyberCrowd doctrine.
   */
  doctrine: "CyberCrowd_CyberServiceResultRoutingEnvelope";

  /**
   * Structural artifact discriminator.
   */
  status: "CYBERCROWD_SERVICE_RESULT_ROUTING_ENVELOPE";

  /**
   * Neutral capability result.
   *
   * Never interpreted.
   * Never enriched.
   * Never transformed.
   */
  result: CyberServiceResultEnvelope;

  /**
   * Opaque routing reference.
   *
   * Structural only.
   * No semantic meaning.
   */
  routingId: string;

  /**
   * Destination reference.
   *
   * Selects delivery location or subsystem.
   *
   * Does not:
   * - select human treatment
   * - infer preference
   * - create recommendation
   */
  destinationRef: string;

  /**
   * Passive routing lifecycle state.
   *
   * Not interpretation.
   * Not execution.
   * Not authority.
   */
  routingState: "READY" | "DELIVERED" | "FAILED";
}

/**
 * Build a CyberServiceResultRoutingEnvelope artifact.
 *
 * Creates the CyberCrowd-Core result routing membrane:
 *
 * CyberServiceResultEnvelope:
 *   bounded capability result
 *
 * CyberServiceResultRoutingEnvelope:
 *   structural delivery path
 *
 * It does not:
 * - interpret results
 * - profile users
 * - infer intent
 * - predict behavior
 * - modify sovereignty
 */
export function buildCyberServiceResultRoutingEnvelope(
  result: CyberServiceResultEnvelope,
  routingId: string,
  destinationRef: string
): CyberServiceResultRoutingEnvelope {
  const artifact: CyberServiceResultRoutingEnvelope = {
    doctrine:
      "CyberCrowd_CyberServiceResultRoutingEnvelope",

    status:
      "CYBERCROWD_SERVICE_RESULT_ROUTING_ENVELOPE",

    result,

    routingId,

    destinationRef,

    routingState: "READY",
  };

  return Object.freeze(artifact);
}
