/**
 * BRC Sovereignty Loader
 *
 * Blast-Radius Control (BRC) CORE loader responsible for initializing
 * declared sovereignty structures into the BRC operational environment.
 *
 * The loader bridges sovereignty definitions into CORE without creating
 * authority over the loaded structures.
 *
 * Loader responsibility:
 *
 * - Receive declared sovereignty definitions
 * - Preserve sovereignty identity
 * - Preserve boundary references
 * - Preserve continuity references
 * - Register available structures for CORE consumption
 *
 * The loader does not:
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
 * Sovereignty loading precedes sovereignty operation.
 */

export const BRC_SOVEREIGNTY_LOADER_TYPE =
  "BRC_SOVEREIGNTY_LOADER";

export const BRC_SOVEREIGNTY_LOADER_VERSION =
  "1.0.0";

export class BRCSovereigntyLoader {
  constructor({
    registry = null,
    boundaryGuard = null
  } = {}) {
    this.type = BRC_SOVEREIGNTY_LOADER_TYPE;
    this.version = BRC_SOVEREIGNTY_LOADER_VERSION;

    this.registry = registry;

    this.boundaryGuard = boundaryGuard;

    this.loaded = new Map();
  }

  load(sovereigntyObject) {
    if (!sovereigntyObject || !sovereigntyObject.id) {
      return false;
    }

    if (
      this.boundaryGuard &&
      !this.boundaryGuard.validate(sovereigntyObject)
    ) {
      return false;
    }

    this.loaded.set(
      sovereigntyObject.id,
      sovereigntyObject
    );

    if (this.registry) {
      this.registry.register(sovereigntyObject);
    }

    return true;
  }

  loadMany(sovereigntyObjects = []) {
    return sovereigntyObjects.map((object) =>
      this.load(object)
    );
  }

  get(id) {
    return this.loaded.get(id) || null;
  }

  has(id) {
    return this.loaded.has(id);
  }

  remove(id) {
    return this.loaded.delete(id);
  }

  list() {
    return Array.from(this.loaded.values());
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      loadedCount: this.loaded.size
    };
  }

  clear() {
    this.loaded.clear();
  }
}

export function createBRCSovereigntyLoader(config) {
  return new BRCSovereigntyLoader(config);
}
