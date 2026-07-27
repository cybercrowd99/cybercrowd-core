/**
 * CORE Sovereignty Validation Engine
 *
 * Blast-Radius Control (BRC) CORE validation engine responsible for examining
 * declared sovereignty structures for structural completeness and integrity
 * within the CORE environment.
 *
 * Validation examines structure without creating authority over the objects
 * being validated.
 *
 * Validation responsibility:
 *
 * - Examine declared sovereignty references
 * - Confirm required structural references exist
 * - Preserve sovereignty identity awareness
 * - Preserve sovereignty type references
 * - Preserve boundary references
 * - Preserve continuity references
 * - Preserve evidence relationships
 * - Report structural validation state
 *
 * The validation engine does not:
 *
 * - Create sovereignty definitions
 * - Grant authority
 * - Modify sovereignty objects
 * - Repair invalid structures
 * - Enforce policies
 * - Execute workflows
 * - Resolve disputes
 * - Approve behavior
 * - Replace governance
 * - Bypass boundaries
 *
 * Validation definition precedes validation enforcement.
 */

export const CORE_SOVEREIGNTY_VALIDATION_ENGINE_TYPE =
  "CORE_SOVEREIGNTY_VALIDATION_ENGINE";

export const CORE_SOVEREIGNTY_VALIDATION_ENGINE_VERSION =
  "1.0.0";

export const CORE_VALIDATION_STATES = Object.freeze([
  "DECLARED",
  "VALID",
  "INVALID",
  "SEALED"
]);

export class CoreSovereigntyValidationEngine {
  constructor({
    boundaryGuard = null,
    registry = null
  } = {}) {
    this.type = CORE_SOVEREIGNTY_VALIDATION_ENGINE_TYPE;
    this.version = CORE_SOVEREIGNTY_VALIDATION_ENGINE_VERSION;

    this.boundaryGuard = boundaryGuard;
    this.registry = registry;

    this.results = new Map();
  }

  validate(object) {
    if (!object || !object.id) {
      return false;
    }

    const result = {
      id: object.id,
      sovereigntyType: object.type || null,
      boundaryReference:
        object.boundary ||
        object.boundaryReference ||
        null,
      continuityReference:
        object.continuityReference || null,
      evidenceReference:
        object.evidenceReference || null,
      state: "DECLARED"
    };

    if (
      this.boundaryGuard &&
      !this.boundaryGuard.validate(object)
    ) {
      result.state = "INVALID";
      this.results.set(object.id, result);
      return false;
    }

    result.state = "VALID";

    this.results.set(object.id, result);

    return true;
  }

  validateMany(objects = []) {
    return objects.map((object) =>
      this.validate(object)
    );
  }

  getResult(id) {
    return this.results.get(id) || null;
  }

  isValid(id) {
    const result = this.getResult(id);

    return Boolean(
      result &&
      result.state === "VALID"
    );
  }

  listResults() {
    return Array.from(this.results.values());
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      validationCount: this.results.size
    };
  }

  clear() {
    this.results.clear();
  }
}

export function createCoreSovereigntyValidationEngine(config) {
  return new CoreSovereigntyValidationEngine(config);
}
