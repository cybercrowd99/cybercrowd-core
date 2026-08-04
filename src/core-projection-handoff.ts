/**
 * CyberCrowd-Core — Core Projection Handoff
 *
 * Purpose:
 * - Prepare a bounded CORE handoff reference for future NET consumption.
 * - Translate CORE-approved projection state into a minimal external boundary signal.
 * - Preserve CORE sovereignty before NET receives anything.
 *
 * Does NOT:
 * - create identity
 * - create ownership
 * - create authority
 * - expose OSAR artifacts
 * - expose dissolved content
 * - expose behavior history
 * - execute NET actions
 * - mutate CORE state
 */

import {
  CoreNetProjection,
  validateCoreNetProjection,
} from "./core-net-projection";

export type CoreProjectionHandoffStatus =
  | "HANDOFF_READY"
  | "HANDOFF_BLOCKED"
  | "HANDOFF_REVIEW_REQUIRED";

export interface CoreProjectionHandoff {
  readonly status: CoreProjectionHandoffStatus;

  /**
   * CORE-owned projection reference.
   */
  readonly projectionReference: string;

  /**
   * Immutable handoff reference.
   */
  readonly handoffReference: string;

  /**
   * Creation timestamp.
   */
  readonly createdAt: string;
}

/**
 * Create CORE projection handoff.
 *
 * Structural translation only.
 */
export const createCoreProjectionHandoff = (
  projection: CoreNetProjection,
): CoreProjectionHandoff => {

  if (!validateCoreNetProjection(projection)) {
    throw new Error("INVALID_CORE_PROJECTION");
  }

  const status: CoreProjectionHandoffStatus =
    projection.status === "CORE_NET_PROJECTION_READY"
      ? "HANDOFF_READY"
      : projection.status === "CORE_NET_PROJECTION_BLOCKED"
        ? "HANDOFF_BLOCKED"
        : "HANDOFF_REVIEW_REQUIRED";

  return Object.freeze({
    status,
    projectionReference:
      projection.projectionReference,

    handoffReference:
      `core-handoff:${crypto.randomUUID()}`,

    createdAt:
      new Date().toISOString(),
  });
};

/**
 * Structural validation only.
 */
export const validateCoreProjectionHandoff = (
  handoff: CoreProjectionHandoff,
): boolean => {

  return (
    Boolean(handoff.projectionReference) &&
    Boolean(handoff.handoffReference) &&
    Boolean(handoff.createdAt) &&
    (
      handoff.status === "HANDOFF_READY" ||
      handoff.status === "HANDOFF_BLOCKED" ||
      handoff.status === "HANDOFF_REVIEW_REQUIRED"
    )
  );
};
