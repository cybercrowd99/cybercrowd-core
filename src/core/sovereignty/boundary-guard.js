/**
 * CORE Sovereignty Boundary Guard
 *
 * Blast-Radius Control (BRC) CORE boundary guard responsible for preserving
 * declared sovereignty boundaries during CORE structural access and operation.
 *
 * The boundary guard examines declared boundary relationships without creating
 * authority over the objects being protected.
 *
 * Boundary guard responsibility:
 *
 * - Examine boundary references
 * - Preserve containment relationships
 * - Prevent boundary drift
 * - Protect CORE sovereignty separation
 * - Confirm declared boundary awareness
 *
 * The boundary guard does not:
 *
 * - Create boundaries
 * - Grant authority
 * - Modify sovereignty objects
 * - Execute operations
 * - Enforce policies
 * - Approve behavior
 * - Resolve disputes
 * - Replace governance
 * - Bypass declared structures
 *
 * Boundary definition precedes boundary protection.
 */

export const CORE_SOVEREIGNTY_BOUNDARY_GUARD_TYPE =
  "CORE_SOVEREIGNTY_BOUNDARY_GUARD";

export const CORE_SOVEREIGNTY_BOUNDARY_GUARD_VERSION =
  "1.0.0";

export const CORE_BOUNDARY_STATES = Object.freeze([
  "DECLARED",
  "VALID",
  "SEALED",
  "VIOLATED"
]);

export class CoreSovereigntyBoundaryGuard {
  constructor({
    expectedBoundary = null
  } = {}) {
    this.type = CORE_SOVEREIGNTY_BOUNDARY_GUARD_TYPE;
    this.version = CORE_SOVEREIGNTY_BOUNDARY_GUARD_VERSION;

    this.expectedBoundary = expectedBoundary;
    this.state = "DECLARED";
  }

  validate(object) {
    if (!object) {
      this.state = "VIOLATED";
      return false;
    }

    if (!this.expectedBoundary) {
      this.state = "VALID";
      return true;
    }

    const objectBoundary =
      object.boundary ||
      object.boundaryReference ||
      null;

    if (objectBoundary !== this.expectedBoundary) {
      this.state = "VIOLATED";
      return false;
    }

    this.state = "VALID";
    return true;
  }

  referencesBoundary(reference) {
    return this.expectedBoundary === reference;
  }

  preservesBoundary(object) {
    return this.validate(object);
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      expectedBoundary: this.expectedBoundary,
      state: this.state
    };
  }

  transition(nextState) {
    if (!CORE_BOUNDARY_STATES.includes(nextState)) {
      return false;
    }

    this.state = nextState;
    return true;
  }
}

export function createCoreSovereigntyBoundaryGuard(config) {
  return new CoreSovereigntyBoundaryGuard(config);
}
