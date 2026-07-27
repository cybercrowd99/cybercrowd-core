/**
 * CORE Sovereignty Resolution Engine
 *
 * Blast-Radius Control (BRC) CORE resolution engine responsible for resolving
 * validated sovereignty structures into controlled structural relationships
 * within the CORE environment.
 *
 * Resolution transforms declared references into recognized structural
 * connections without creating authority over the referenced objects.
 *
 * Resolution responsibility:
 *
 * - Resolve validated sovereignty references
 * - Connect declared structural relationships
 * - Preserve sovereignty identity
 * - Preserve boundary references
 * - Preserve continuity references
 * - Preserve evidence relationships
 * - Produce resolved structural state
 *
 * The resolution engine does not:
 *
 * - Create sovereignty definitions
 * - Grant authority
 * - Transfer ownership
 * - Modify sovereignty objects
 * - Execute operations
 * - Enforce policies
 * - Create dependencies
 * - Resolve disputes
 * - Replace governance
 * - Bypass boundaries
 *
 * Resolution definition precedes resolution execution.
 */

export const CORE_SOVEREIGNTY_RESOLUTION_ENGINE_TYPE =
  "CORE_SOVEREIGNTY_RESOLUTION_ENGINE";

export const CORE_SOVEREIGNTY_RESOLUTION_ENGINE_VERSION =
  "1.0.0";

export const CORE_RESOLUTION_STATES = Object.freeze([
  "DECLARED",
  "RESOLVED",
  "SEALED",
  "UNRESOLVED"
]);

export class CoreSovereigntyResolutionEngine {
  constructor({
    registry = null,
    referenceResolver = null,
    validationEngine = null
  } = {}) {
    this.type = CORE_SOVEREIGNTY_RESOLUTION_ENGINE_TYPE;
    this.version = CORE_SOVEREIGNTY_RESOLUTION_ENGINE_VERSION;

    this.registry = registry;
    this.referenceResolver = referenceResolver;
    this.validationEngine = validationEngine;

    this.resolutions = new Map();
  }

  resolve(subjectReference, targetReference, metadata = {}) {
    const resolution = {
      id: metadata.id || `${subjectReference}:${targetReference}`,
      subjectReference,
      targetReference,
      relationshipReference:
        metadata.relationshipReference || null,
      boundaryReference:
        metadata.boundaryReference || null,
      continuityReference:
        metadata.continuityReference || null,
      evidenceReference:
        metadata.evidenceReference || null,
      state: "DECLARED"
    };

    const subject = this.registry
      ? this.registry.get(subjectReference)
      : null;

    if (
      this.validationEngine &&
      subject &&
      !this.validationEngine.isValid(subjectReference)
    ) {
      resolution.state = "UNRESOLVED";
      this.resolutions.set(
        resolution.id,
        resolution
      );

      return false;
    }

    resolution.state = "RESOLVED";

    this.resolutions.set(
      resolution.id,
      resolution
    );

    return true;
  }

  get(id) {
    return this.resolutions.get(id) || null;
  }

  list() {
    return Array.from(this.resolutions.values());
  }

  findBySubject(subjectReference) {
    return this.list().filter(
      (resolution) =>
        resolution.subjectReference === subjectReference
    );
  }

  findByTarget(targetReference) {
    return this.list().filter(
      (resolution) =>
        resolution.targetReference === targetReference
    );
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      resolutionCount: this.resolutions.size
    };
  }

  clear() {
    this.resolutions.clear();
  }
}

export function createCoreSovereigntyResolutionEngine(config) {
  return new CoreSovereigntyResolutionEngine(config);
}
