/**
 * CORE Sovereignty Registry
 *
 * Blast-Radius Control (BRC) CORE sovereignty registry responsible for
 * maintaining operational references to declared sovereignty structures.
 *
 * The registry provides CORE access to sovereignty-defined objects while
 * preserving the original declarations, boundaries, and continuity meaning.
 *
 * Registry responsibility:
 *
 * - Maintain declared sovereignty references
 * - Preserve object identity
 * - Preserve sovereignty type references
 * - Preserve boundary references
 * - Preserve continuity references
 * - Preserve relationship references
 * - Provide controlled CORE lookup
 *
 * The registry does not:
 *
 * - Create sovereignty definitions
 * - Grant authority
 * - Modify sovereignty objects
 * - Execute operations
 * - Enforce policies
 * - Resolve disputes
 * - Replace governance
 * - Bypass boundaries
 *
 * Registry definition precedes registry operation.
 */

export const CORE_SOVEREIGNTY_REGISTRY_TYPE =
  "CORE_SOVEREIGNTY_REGISTRY";

export const CORE_SOVEREIGNTY_REGISTRY_VERSION =
  "1.0.0";

export const CORE_SOVEREIGNTY_REGISTRY_STATES = Object.freeze([
  "DECLARED",
  "ACTIVE",
  "SEALED",
  "ARCHIVED"
]);

export class CoreSovereigntyRegistry {
  constructor() {
    this.type = CORE_SOVEREIGNTY_REGISTRY_TYPE;
    this.version = CORE_SOVEREIGNTY_REGISTRY_VERSION;

    this.records = new Map();
  }

  register(sovereigntyObject) {
    if (!sovereigntyObject || !sovereigntyObject.id) {
      return false;
    }

    this.records.set(
      sovereigntyObject.id,
      sovereigntyObject
    );

    return true;
  }

  registerMany(objects = []) {
    return objects.map((object) =>
      this.register(object)
    );
  }

  get(id) {
    return this.records.get(id) || null;
  }

  has(id) {
    return this.records.has(id);
  }

  remove(id) {
    return this.records.delete(id);
  }

  list() {
    return Array.from(this.records.values());
  }

  findByType(type) {
    return this.list().filter(
      (record) => record.type === type
    );
  }

  referencesBoundary(boundaryReference) {
    return this.list().filter(
      (record) =>
        record.boundary === boundaryReference ||
        record.boundaryReference === boundaryReference
    );
  }

  referencesContinuity(continuityReference) {
    return this.list().filter(
      (record) =>
        record.continuityReference === continuityReference
    );
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      count: this.records.size
    };
  }

  clear() {
    this.records.clear();
  }
}

export function createCoreSovereigntyRegistry() {
  return new CoreSovereigntyRegistry();
}
