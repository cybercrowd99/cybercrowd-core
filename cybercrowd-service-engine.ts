/**
 * CyberCrowd — CyberCrowd Service Engine
 *
 * CyberCrowd-Core — CyberCrowd Service Execution Organ
 *
 * CyberCrowdServiceEngine is the first true CyberCrowd-Core organ.
 * It consumes CyberServiceActionExecutionEnvelope artifacts and
 * performs capability-driven operations.
 *
 * It does not:
 * - contain identity
 * - interpret intent
 * - grant permissions
 * - perform adjudication
 * - select human treatment
 * - enrich or transform envelopes
 *
 * It only:
 * - receives engine-intake envelopes
 * - routes to capability machinery
 * - executes capability-defined operations
 * - produces capability-defined outputs
 */

import { CyberServiceActionExecutionEnvelope } from "./cybercrowd-service-action-execution-envelope";

/**
 * Structural definition of the CyberCrowd service engine.
 */
export interface CyberCrowdServiceEngine {
  /**
   * Governing CyberCrowd doctrine.
   */
  doctrine: "CyberCrowd_CyberServiceEngine";

  /**
   * Structural artifact discriminator.
   */
  status: "CYBERCROWD_SERVICE_ENGINE";

  /**
   * Unique engine identifier.
   *
   * Selects capability machinery.
   *
   * Does not:
   * - select human treatment
   * - infer identity
   * - infer intent
   */
  engineId: string;

  /**
   * Execute a staged CyberService action.
   *
   * Consumes:
   * - ExecutionContractEnvelope lineage
   * - CyberServiceExecutionEnvelope
   * - CyberServiceActionEnvelope
   * - CyberServiceActionExecutionEnvelope
   *
   * Produces:
   * - capability-defined output
   *
   * Never:
   * - interprets identity
   * - interprets intent
   * - grants permissions
   * - performs adjudication
   */
  execute(
    envelope: CyberServiceActionExecutionEnvelope
  ): Promise<unknown>;
}

/**
 * Build a CyberCrowdServiceEngine organ.
 *
 * Creates the first CyberCrowd-Core execution organ.
 *
 * It does not:
 * - perform adjudication
 * - resolve identity
 * - interpret intent
 * - grant permissions
 * - create authority
 */
export function buildCyberCrowdServiceEngine(
  engineId: string,
  executor: (
    envelope: CyberServiceActionExecutionEnvelope
  ) => Promise<unknown>
): CyberCrowdServiceEngine {
  const organ: CyberCrowdServiceEngine = {
    doctrine: "CyberCrowd_CyberServiceEngine",

    status: "CYBERCROWD_SERVICE_ENGINE",

    engineId,

    execute: executor,
  };

  return Object.freeze(organ);
}
