/**
 * CORE Sovereignty Index
 *
 * Blast-Radius Control (BRC) CORE sovereignty index responsible for providing
 * a unified access surface for declared sovereignty structures operating
 * within the CORE environment.
 *
 * The index connects CORE sovereignty components without creating authority
 * over the referenced structures.
 *
 * Index responsibility:
 *
 * - Provide controlled sovereignty access
 * - Expose registry references
 * - Expose loader references
 * - Preserve sovereignty boundaries
 * - Preserve continuity references
 * - Maintain CORE containment
 *
 * The index does not:
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
 * Index definition precedes index operation.
 */

export const CORE_SOVEREIGNTY_INDEX_TYPE =
  "CORE_SOVEREIGNTY_INDEX";

export const CORE_SOVEREIGNTY_INDEX_VERSION =
  "1.0.0";

export class CoreSovereigntyIndex {
  constructor({
    loader = null,
    registry = null
  } = {}) {
    this.type = CORE_SOVEREIGNTY_INDEX_TYPE;
    this.version = CORE_SOVEREIGNTY_INDEX_VERSION;

    this.loader = loader;
    this.registry = registry;
  }

  get(id) {
    if (!this.registry) {
      return null;
    }

    return this.registry.get(id);
  }

  has(id) {
    if (!this.registry) {
      return false;
    }

    return this.registry.has(id);
  }

  list() {
    if (!this.registry) {
      return [];
    }

    return this.registry.list();
  }

  findByType(type) {
    if (!this.registry) {
      return [];
    }

    return this.registry.findByType(type);
  }

  load(object) {
    if (!this.loader) {
      return false;
    }

    return this.loader.load(object);
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      registryAvailable: Boolean(this.registry),
      loaderAvailable: Boolean(this.loader)
    };
  }
}

export function createCoreSovereigntyIndex(config) {
  return new CoreSovereigntyIndex(config);
}
