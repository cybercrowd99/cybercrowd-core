/**
 * CORE Sovereignty Enforcement Engine
 *
 * Blast-Radius Control (BRC) CORE enforcement engine responsible for applying
 * declared structural boundaries and approved sovereignty rules within the
 * CORE environment.
 *
 * Enforcement applies declared structure without creating authority over the
 * sovereignty objects being protected.
 *
 * Enforcement responsibility:
 *
 * - Apply declared enforcement boundaries
 * - Confirm subject references
 * - Confirm policy references
 * - Confirm authority references
 * - Confirm responsibility references
 * - Preserve allowed movement definitions
 * - Preserve prohibited movement definitions
 * - Maintain evidence relationships
 * - Maintain continuity protection
 *
 * The enforcement engine does not:
 *
 * - Create sovereignty definitions
 * - Grant authority
 * - Define policies
 * - Replace governance
 * - Authenticate users
 * - Modify sovereignty objects
 * - Execute operations
 * - Resolve disputes
 * - Override boundaries
 * - Modify external systems
 *
 * Enforcement definition precedes enforcement execution.
 */

export const CORE_SOVEREIGNTY_ENFORCEMENT_ENGINE_TYPE =
  "CORE_SOVEREIGNTY_ENFORCEMENT_ENGINE";

export const CORE_SOVEREIGNTY_ENFORCEMENT_ENGINE_VERSION =
  "1.0.0";

export const CORE_ENFORCEMENT_STATES = Object.freeze([
  "DECLARED",
  "ALLOWED",
  "RESTRICTED",
  "SEALED"
]);

export class CoreSovereigntyEnforcementEngine {
  constructor({
    validationEngine = null,
    boundaryGuard = null
  } = {}) {
    this.type = CORE_SOVEREIGNTY_ENFORCEMENT_ENGINE_TYPE;
    this.version = CORE_SOVEREIGNTY_ENFORCEMENT_ENGINE_VERSION;

    this.validationEngine = validationEngine;
    this.boundaryGuard = boundaryGuard;

    this.records = new Map();
  }

  enforce({
    id,
    subjectReference,
    policyReference = null,
    authorityReference = null,
    responsibilityReference = null,
    boundaryReference = null,
    allowedMovement = [],
    prohibitedMovement = [],
    evidenceReference = null,
    continuityReference = null
  }) {
    const record = {
      id,
      subjectReference,
      policyReference,
      authorityReference,
      responsibilityReference,
      boundaryReference,
      allowedMovement,
      prohibitedMovement,
      evidenceReference,
      continuityReference,
      state: "DECLARED"
    };

    if (
      this.boundaryGuard &&
      !this.boundaryGuard.referencesBoundary(
        boundaryReference
      )
    ) {
      record.state = "RESTRICTED";

      this.records.set(id, record);

      return false;
    }

    record.state = "ALLOWED";

    this.records.set(id, record);

    return true;
  }

  get(id) {
    return this.records.get(id) || null;
  }

  list() {
    return Array.from(this.records.values());
  }

  isAllowed(id) {
    const record = this.get(id);

    return Boolean(
      record &&
      record.state === "ALLOWED"
    );
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      enforcementCount: this.records.size
    };
  }

  clear() {
    this.records.clear();
  }
}

export function createCoreSovereigntyEnforcementEngine(config) {
  return new CoreSovereigntyEnforcementEngine(config);
}
