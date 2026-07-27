/**
 * CORE Sovereignty Reference Resolver
 *
 * Blast-Radius Control (BRC) CORE reference resolver responsible for resolving
 * declared relationships between sovereignty structures while preserving
 * object boundaries and structural meaning.
 *
 * The resolver connects declared references without creating ownership,
 * authority, dependency inheritance, or boundary bypass.
 *
 * Resolver responsibility:
 *
 * - Resolve declared source references
 * - Resolve declared target references
 * - Preserve sovereignty type relationships
 * - Preserve boundary references
 * - Preserve continuity references
 * - Preserve evidence relationships
 * - Provide structural connection awareness
 *
 * The resolver does not:
 *
 * - Create sovereignty definitions
 * - Grant authority
 * - Transfer ownership
 * - Modify sovereignty objects
 * - Execute operations
 * - Enforce policies
 * - Resolve disputes
 * - Create dependencies
 * - Bypass boundaries
 *
 * Reference definition precedes reference resolution.
 */

export const CORE_SOVEREIGNTY_REFERENCE_RESOLVER_TYPE =
  "CORE_SOVEREIGNTY_REFERENCE_RESOLVER";

export const CORE_SOVEREIGNTY_REFERENCE_RESOLVER_VERSION =
  "1.0.0";

export const CORE_REFERENCE_STATES = Object.freeze([
  "DECLARED",
  "RESOLVED",
  "SEALED",
  "UNRESOLVED"
]);

export class CoreSovereigntyReferenceResolver {
  constructor({
    registry = null,
    boundaryGuard = null
  } = {}) {
    this.type = CORE_SOVEREIGNTY_REFERENCE_RESOLVER_TYPE;
    this.version = CORE_SOVEREIGNTY_REFERENCE_RESOLVER_VERSION;

    this.registry = registry;
    this.boundaryGuard = boundaryGuard;

    this.references = new Map();
  }

  resolve({
    id,
    sourceReference,
    targetReference,
    relationshipReference = null,
    boundaryReference = null,
    continuityReference = null,
    evidenceReference = null,
    state = "DECLARED"
  }) {
    const record = {
      id,
      sourceReference,
      targetReference,
      relationshipReference,
      boundaryReference,
      continuityReference,
      evidenceReference,
      state
    };

    if (
      this.boundaryGuard &&
      !this.boundaryGuard.referencesBoundary(boundaryReference)
    ) {
      record.state = "UNRESOLVED";
      this.references.set(id, record);
      return false;
    }

    record.state = "RESOLVED";

    this.references.set(id, record);

    return true;
  }

  get(id) {
    return this.references.get(id) || null;
  }

  has(id) {
    return this.references.has(id);
  }

  findBySource(sourceReference) {
    return Array.from(this.references.values())
      .filter(
        (reference) =>
          reference.sourceReference === sourceReference
      );
  }

  findByTarget(targetReference) {
    return Array.from(this.references.values())
      .filter(
        (reference) =>
          reference.targetReference === targetReference
      );
  }

  preservesContinuity(reference, continuityReference) {
    return (
      reference &&
      reference.continuityReference === continuityReference
    );
  }

  preservesBoundary(reference, boundaryReference) {
    return (
      reference &&
      reference.boundaryReference === boundaryReference
    );
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      referenceCount: this.references.size
    };
  }

  clear() {
    this.references.clear();
  }
}

export function createCoreSovereigntyReferenceResolver(config) {
  return new CoreSovereigntyReferenceResolver(config);
}
