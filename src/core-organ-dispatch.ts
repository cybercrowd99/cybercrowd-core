/**
 * CyberCrowd-Core — Core Organ Dispatch V1
 *
 * Purpose:
 * - Translate bounded CORE operational context into organ dispatch signals.
 * - Preserve CORE binding separation between meaning and execution.
 * - Provide immutable dispatch instructions for registered CORE organs.
 *
 * Does NOT:
 * - execute organ actions
 * - mutate organ state
 * - inspect OSAR artifacts
 * - mutate OSAR state
 * - create identity
 * - create ownership
 * - authorize behavior
 * - expose NET surfaces
 */

import { OsarBindingResult } from "./osar-core-binding";
import {
  OrganRegistryResult,
  CoreOrganId,
} from "./organ-registry";

export type CoreOrganDispatchStatus =
  | "ORGAN_DISPATCH_CREATED"
  | "ORGAN_DISPATCH_INVALID";

export interface CoreOrganDispatch {
  readonly organId: CoreOrganId;
  readonly action: string;
  readonly reference: string;
}

export interface CoreOrganDispatchEnvelope {
  readonly status: CoreOrganDispatchStatus;

  /**
   * Immutable dispatch anchor.
   */
  readonly dispatchReference: string;

  /**
   * Source OSAR CORE binding reference.
   */
  readonly sourceReference: string;

  /**
   * Frozen organ dispatch list.
   */
  readonly dispatches: readonly CoreOrganDispatch[];

  /**
   * Dispatch creation timestamp.
   */
  readonly createdAt: number;
}

export interface CreateCoreOrganDispatchInput {
  readonly binding: OsarBindingResult;
  readonly registry: OrganRegistryResult;
}

/**
 * Creates bounded CORE organ dispatch envelope.
 *
 * Structural routing only.
 */
export const createCoreOrganDispatch = (
  input: CreateCoreOrganDispatchInput,
): CoreOrganDispatchEnvelope => {

  const valid =
    Boolean(input.binding.artifactId) &&
    input.registry.organs.length === 13;

  if (!valid) {
    throw new Error("INVALID_CORE_ORGAN_DISPATCH_INPUT");
  }

  const dispatches: readonly CoreOrganDispatch[] =
    Object.freeze(
      input.registry.organs.map((organ) =>
        Object.freeze({
          organId: organ.organId,
          action:
            input.binding.status === "OPERATIONAL_CLOSED"
              ? "PROCESS_CLOSURE_REFERENCE"
              : "HOLD_FOR_REVIEW",
          reference:
            input.binding.artifactId,
        }),
      ),
    );

  return Object.freeze({
    status: "ORGAN_DISPATCH_CREATED",

    dispatchReference:
      `core-organ-dispatch:${crypto.randomUUID()}`,

    sourceReference:
      input.binding.artifactId,

    dispatches,

    createdAt:
      Date.now(),
  });
};

/**
 * Structural validation only.
 */
export const validateCoreOrganDispatch = (
  envelope: CoreOrganDispatchEnvelope,
): boolean => {

  return (
    envelope.status === "ORGAN_DISPATCH_CREATED" &&
    Boolean(envelope.dispatchReference) &&
    Boolean(envelope.sourceReference) &&
    envelope.dispatches.length === 13 &&
    Number.isFinite(envelope.createdAt)
  );
};
