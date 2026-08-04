/**
 * CyberCrowd CORE — CyberService Result Envelope Organ
 *
 * Layer:
 * CORE / Capability Output Boundary
 *
 * ONE JOB:
 * Preserve bounded capability outputs produced by
 * the CyberCrowd-Core execution subsystem.
 *
 * Owns:
 * - CyberService result artifact shape
 * - execution lineage reference
 * - output reference preservation
 * - passive result lifecycle state
 * - sovereignty boundary separation
 *
 * Does NOT Own:
 * - identity
 * - intent
 * - permissions
 * - authority creation
 * - behavior inference
 * - prediction
 * - meaning interpretation
 * - user profiling
 * - analytics
 * - surveillance
 * - NET surface handling
 * - UI rendering
 *
 * Boundary:
 * CyberServiceActionExecutionEnvelope enters CORE.
 * CORE produces a bounded capability result artifact.
 * Result remains separate from interpretation.
 *
 * Security:
 * - No hidden synchronization
 * - No identity binding
 * - No intent inference
 * - No behavioral modeling
 * - No authority escalation
 *
 * Doctrine:
 * Capability Result ≠ Identity Intelligence
 * Capability Output ≠ Authority
 * Execution Evidence ≠ Interpretation
 */

// cybercrowd-service-result-envelope.ts

import { CyberServiceActionExecutionEnvelope } from "./cybercrowd-service-action-execution-envelope";

/**
 * Structural definition of a CyberService capability result.
 */
export interface CyberServiceResultEnvelope {
  /**
   * Governing CyberCrowd doctrine.
   */
  doctrine: "CyberCrowd_CyberServiceResultEnvelope";

  /**
   * Structural artifact discriminator.
   */
  status: "CYBERCROWD_SERVICE_RESULT_ENVELOPE";

  /**
   * Executed capability lineage.
   *
   * Never interpreted.
   * Never enriched.
   * Never transformed.
   */
  execution: CyberServiceActionExecutionEnvelope;

  /**
   * Opaque result reference.
   *
   * Structural only.
   */
  resultId: string;

  /**
   * Capability output reference.
   *
   * Contains no:
   * - identity
   * - intent
   * - authority
   * - permissions
   */
  outputRef: string;

  /**
   * Passive result lifecycle state.
   */
  resultState: "PRODUCED" | "FAILED";
}

/**
 * Build a CyberServiceResultEnvelope artifact.
 *
 * CyberCrowdServiceEngine:
 *   capability execution
 *
 * CyberServiceResultEnvelope:
 *   bounded capability result
 *
 * No interpretation.
 * No identity resolution.
 * No prediction.
 */
export function buildCyberServiceResultEnvelope(
  execution: CyberServiceActionExecutionEnvelope,
  resultId: string,
  outputRef: string
): CyberServiceResultEnvelope {
  const artifact: CyberServiceResultEnvelope = {
    doctrine:
      "CyberCrowd_CyberServiceResultEnvelope",

    status:
      "CYBERCROWD_SERVICE_RESULT_ENVELOPE",

    execution,

    resultId,

    outputRef,

    resultState:
      "PRODUCED",
  };

  return Object.freeze(artifact);
}
