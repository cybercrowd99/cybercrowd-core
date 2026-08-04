/**
 * CyberCrowd-Core — Core NET Dispatch
 *
 * Purpose:
 * - Dispatch validated CORE projection handoff signals toward the NET boundary.
 * - Preserve CORE sovereignty while preparing bounded NET transfer.
 *
 * Does NOT:
 * - access OSAR artifacts
 * - expose dissolved content
 * - create identity
 * - create ownership
 * - create authority
 * - execute NET actions
 * - mutate CORE state
 */

export type CoreNetDispatchStatus =
  | "DISPATCH_READY"
  | "DISPATCH_BLOCKED"
  | "DISPATCH_REVIEW_REQUIRED";

export interface CoreProjectionHandoff {
  readonly status:
    | "HANDOFF_READY"
    | "HANDOFF_BLOCKED"
    | "HANDOFF_REVIEW_REQUIRED";

  readonly projectionReference: string;
  readonly handoffReference: string;
}

export interface CoreNetDispatch {
  readonly status:
    CoreNetDispatchStatus;

  readonly handoffReference:
    string;

  readonly dispatchReference:
    string;

  readonly createdAt:
    string;
}

/**
 * Creates a bounded CORE → NET dispatch signal.
 *
 * Structural dispatch only.
 */
export const createCoreNetDispatch = (
  handoff: CoreProjectionHandoff,
): CoreNetDispatch => {

  if (
    !handoff.projectionReference ||
    !handoff.handoffReference
  ) {
    throw new Error(
      "INVALID_CORE_PROJECTION_HANDOFF"
    );
  }

  const status:
    CoreNetDispatchStatus =
      handoff.status === "HANDOFF_READY"
        ? "DISPATCH_READY"
        : handoff.status === "HANDOFF_BLOCKED"
          ? "DISPATCH_BLOCKED"
          : "DISPATCH_REVIEW_REQUIRED";

  return Object.freeze({
    status,

    handoffReference:
      handoff.handoffReference,

    dispatchReference:
      `dispatch:${crypto.randomUUID()}`,

    createdAt:
      new Date().toISOString(),
  });
};


/**
 * Structural validation only.
 */
export const validateCoreNetDispatch = (
  dispatch: CoreNetDispatch,
): boolean => {

  return (
    Boolean(dispatch.handoffReference) &&
    Boolean(dispatch.dispatchReference) &&
    Boolean(dispatch.createdAt) &&
    (
      dispatch.status === "DISPATCH_READY" ||
      dispatch.status === "DISPATCH_BLOCKED" ||
      dispatch.status === "DISPATCH_REVIEW_REQUIRED"
    )
  );
};
