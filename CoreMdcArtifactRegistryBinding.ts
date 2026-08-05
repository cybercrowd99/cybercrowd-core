/**
 * CyberCrowd-MDC → CORE — Artifact Registry Binding V1 
 *
 * Purpose:
 * - Export sealed MDC artifact registry lineage into CORE.
 * - Provide CORE with immutable MDC references for higher-order processing.
 * - Maintain strict non-mutating, non-authoritative MDC boundary.
 *
 * Does NOT:
 * - mutate MDC
 * - mutate CORE
 * - authorize behavior
 * - execute transactions
 * - expose MDC internals
 */

import type { MdcArtifactRegistry } from "./MdcArtifactRegistry";

export interface CoreMdcArtifactRegistryBinding {
  readonly bindingReference: string;

  /**
   * Immutable MDC registry reference.
   */
  readonly mdcRegistryReference: string;

  /**
   * Sealed artifact references exported to CORE.
   */
  readonly artifactReferences: readonly string[];

  /**
   * Binding creation timestamp.
   */
  readonly createdAt: string;
}

export const bindMdcArtifactRegistryToCore = (
  registry: MdcArtifactRegistry,
): CoreMdcArtifactRegistryBinding => {

  const valid =
    registry.status === "MDC_ARTIFACT_REGISTRY_CREATED" &&
    Boolean(registry.registryReference) &&
    Array.isArray(registry.artifacts) &&
    registry.artifacts.length > 0;

  if (!valid) {
    throw new Error("INVALID_MDC_CORE_BINDING_INPUT");
  }

  const now =
    new Date().toISOString();

  return Object.freeze({
    bindingReference:
      `mdc-core-binding:${crypto.randomUUID()}`,

    mdcRegistryReference:
      registry.registryReference,

    artifactReferences:
      Object.freeze(
        registry.artifacts.map(a =>
          a.artifactReference,
        ),
      ),

    createdAt:
      now,
  });
};
