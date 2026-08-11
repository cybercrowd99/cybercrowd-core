/**
 * CyberCrowd-Core — OSAR CORE Attachment Layer V1
 *
 * ONE JOB:
 * Attach a declared OSAR→CORE binding to the CORE boundary.
 *
 * Structural attachment only.
 *
 * This file does NOT:
 * - execute organ actions
 * - mutate OSAR state
 * - mutate CORE state
 * - interpret doctrine
 * - create identity
 * - create authority
 * - authorize behavior
 * - execute governance
 * - expose OSAR internals
 * - dereference external artifacts
 */

import type {
  OSARCoreBindingResult,
} from "./osar-core-binding";

export type OSARCoreAttachmentStatus =
  | "OSAR_CORE_ATTACHMENT_CREATED"
  | "OSAR_CORE_ATTACHMENT_INVALID";

export interface OSARCoreAttachment {
  readonly status: OSARCoreAttachmentStatus;
  readonly bindingReference: string;
  readonly coreAttachmentReference: string;
  readonly organDispatchCount: number;
  readonly attachedAt: number;
}

export interface CreateOSARCoreAttachmentInput {
  readonly binding: OSARCoreBindingResult;
  readonly coreAttachmentReference: string;
}

/**
 * Creates the immutable CORE-side structural attachment
 * for a declared OSAR→CORE binding.
 *
 * Attachment only.
 */
export const createOSARCoreAttachment = (
  input: CreateOSARCoreAttachmentInput,
): OSARCoreAttachment => {
  const valid =
    Boolean(input.binding) &&
    input.binding.status === "OSAR_CORE_BINDING_CREATED" &&
    Boolean(input.binding.bindingReference) &&
    input.binding.dispatches.length === 13 &&
    Boolean(input.coreAttachmentReference);

  if (!valid) {
    throw new Error(
      "INVALID_OSAR_CORE_ATTACHMENT_INPUT",
    );
  }

  return Object.freeze({
    status: "OSAR_CORE_ATTACHMENT_CREATED",

    bindingReference:
      input.binding.bindingReference,

    coreAttachmentReference:
      input.coreAttachmentReference,

    organDispatchCount:
      input.binding.dispatches.length,

    attachedAt:
      Date.now(),
  });
};

/**
 * Structural validation only.
 *
 * Does not dereference, interpret, mutate, or execute
 * any OSAR or CORE artifact.
 */
export const validateOSARCoreAttachment = (
  attachment: OSARCoreAttachment,
): boolean => {
  return (
    attachment.status ===
      "OSAR_CORE_ATTACHMENT_CREATED" &&
    Boolean(attachment.bindingReference) &&
    Boolean(attachment.coreAttachmentReference) &&
    attachment.organDispatchCount === 13 &&
    Number.isFinite(attachment.attachedAt)
  );
};
