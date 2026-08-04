/**
 * CyberCrowd-Core — Core Operational State
 *
 * Purpose:
 * - Represent bounded CORE operational state.
 * - Preserve CORE-side lifecycle meaning after translation.
 *
 * Does NOT:
 * - access OSAR artifacts
 * - expose NET surfaces
 * - create identity
 * - create ownership
 * - create authority
 * - execute actions
 * - mutate external systems
 */

export type CoreOperationalStateStatus =
  | "OPERATIONAL_ACTIVE"
  | "OPERATIONAL_CLOSED"
  | "OPERATIONAL_REVIEW_REQUIRED";


export interface CoreOperationalState {

  /**
   * CORE state discriminator.
   */
  readonly status:
    CoreOperationalStateStatus;

  /**
   * Source artifact reference.
   */
  readonly artifactReference:
    string;

  /**
   * Immutable CORE state anchor.
   */
  readonly stateReference:
    string;

  /**
   * State creation timestamp.
   */
  readonly createdAt:
    string;
}


export interface CreateCoreOperationalStateInput {

  readonly artifactReference:
    string;

  readonly status:
    CoreOperationalStateStatus;
}


/**
 * Creates bounded CORE operational state.
 *
 * Structural representation only.
 */
export const createCoreOperationalState = (
  input: CreateCoreOperationalStateInput,
): CoreOperationalState => {

  if (!input.artifactReference) {
    throw new Error(
      "INVALID_CORE_OPERATIONAL_ARTIFACT_REFERENCE"
    );
  }

  return Object.freeze({

    status:
      input.status,

    artifactReference:
      input.artifactReference,

    stateReference:
      `core-state:${crypto.randomUUID()}`,

    createdAt:
      new Date().toISOString(),
  });
};


/**
 * Structural validation only.
 */
export const validateCoreOperationalState = (
  state: CoreOperationalState,
): boolean => {

  return (
    Boolean(state.artifactReference) &&
    Boolean(state.stateReference) &&
    Boolean(state.createdAt) &&
    (
      state.status === "OPERATIONAL_ACTIVE" ||
      state.status === "OPERATIONAL_CLOSED" ||
      state.status === "OPERATIONAL_REVIEW_REQUIRED"
    )
  );
};
