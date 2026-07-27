/**
 * CORE Sovereignty Execution Controller
 *
 * Blast-Radius Control (BRC) CORE execution controller responsible for
 * governing allowed structural execution intent within the CORE environment
 * while preserving declared sovereignty boundaries, continuity meaning, and
 * structural containment.
 *
 * The execution controller evaluates execution intent without creating
 * authority over sovereignty objects or modifying declared structures.
 *
 * Execution controller responsibility:
 *
 * - Evaluate declared execution intent
 * - Confirm structural readiness
 * - Confirm boundary alignment
 * - Confirm continuity alignment
 * - Confirm evidence alignment
 * - Preserve sovereignty identity
 * - Preserve containment boundaries
 * - Produce execution authorization state
 *
 * The execution controller does not:
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
 * Execution definition precedes execution authorization.
 */

export const CORE_SOVEREIGNTY_EXECUTION_CONTROLLER_TYPE =
  "CORE_SOVEREIGNTY_EXECUTION_CONTROLLER";

export const CORE_SOVEREIGNTY_EXECUTION_CONTROLLER_VERSION =
  "1.0.0";

export const CORE_EXECUTION_STATES = Object.freeze([
  "DECLARED",
  "AUTHORIZED",
  "DENIED",
  "SEALED"
]);

export class CoreSovereigntyExecutionController {
  constructor({
    validationEngine = null,
    boundaryGuard = null,
    enforcementEngine = null
  } = {}) {
    this.type = CORE_SOVEREIGNTY_EXECUTION_CONTROLLER_TYPE;
    this.version = CORE_SOVEREIGNTY_EXECUTION_CONTROLLER_VERSION;

    this.validationEngine = validationEngine;
    this.boundaryGuard = boundaryGuard;
    this.enforcementEngine = enforcementEngine;

    this.executions = new Map();
  }

  authorize({
    id,
    subjectReference,
    boundaryReference = null,
    continuityReference = null,
    evidenceReference = null,
    intent = null
  }) {
    const record = {
      id,
      subjectReference,
      boundaryReference,
      continuityReference,
      evidenceReference,
      intent,
      state: "DECLARED"
    };

    if (
      this.boundaryGuard &&
      !this.boundaryGuard.referencesBoundary(boundaryReference)
    ) {
      record.state = "DENIED";
      this.executions.set(id, record);
      return false;
    }

    if (
      this.validationEngine &&
      !this.validationEngine.isValid(subjectReference)
    ) {
      record.state = "DENIED";
      this.executions.set(id, record);
      return false;
    }

    if (
      this.enforcementEngine &&
      !this.enforcementEngine.isAllowed(subjectReference)
    ) {
      record.state = "DENIED";
      this.executions.set(id, record);
      return false;
    }

    record.state = "AUTHORIZED";
    this.executions.set(id, record);

    return true;
  }

  get(id) {
    return this.executions.get(id) || null;
  }

  list() {
    return Array.from(this.executions.values());
  }

  isAuthorized(id) {
    const record = this.get(id);

    return Boolean(
      record &&
      record.state === "AUTHORIZED"
    );
  }

  describe() {
    return {
      type: this.type,
      version: this.version,
      executionCount: this.executions.size
    };
  }

  clear() {
    this.executions.clear();
  }
}

export function createCoreSovereigntyExecutionController(config) {
  return new CoreSovereigntyExecutionController(config);
}
