/**
 * CyberCrowd-Core — OSAR Core Binding Organ
 *
 * Purpose:
 * - Translate verified OSAR structural closure states into CORE operational context.
 * - Preserve the OSAR → CORE boundary.
 * - Allow CORE to reason from integrity anchors only.
 *
 * Does NOT:
 * - inspect dissolved content
 * - restore artifacts
 * - create identity
 * - create ownership
 * - create authority
 * - execute deletion
 * - create NET surfaces
 */

import {
  EphemeralSessionClosure,
  evaluateEphemeralSessionClosure,
} from "../../../cyberworld-osar/src/presence/ephemeral-session-closure";

export type CoreOperationalStatus =
  | "OPERATIONAL_CLOSED"
  | "OPERATIONAL_REVIEW_REQUIRED";

export interface OsarBindingResult {
  readonly artifactId: string;
  readonly status: CoreOperationalStatus;
  readonly canProjectToNet: boolean;
}

/**
 * Bind an OSAR closure receipt into CORE operational meaning.
 *
 * Structural translation only.
 */
export const bindClosureToCore = (
  closure: EphemeralSessionClosure,
): OsarBindingResult => {
  const osarState =
    evaluateEphemeralSessionClosure(closure);

  const status: CoreOperationalStatus =
    osarState === "CLOSED"
      ? "OPERATIONAL_CLOSED"
      : "OPERATIONAL_REVIEW_REQUIRED";

  return Object.freeze({
    artifactId: closure.closureReference,
    status,
    canProjectToNet: false,
  });
};

/**
 * Validate CORE binding result.
 *
 * Structural validation only.
 */
export const validateOsarBindingResult = (
  result: OsarBindingResult,
): boolean => {
  return (
    Boolean(result.artifactId) &&
    (
      result.status === "OPERATIONAL_CLOSED" ||
      result.status === "OPERATIONAL_REVIEW_REQUIRED"
    ) &&
    result.canProjectToNet === false
  );
};
