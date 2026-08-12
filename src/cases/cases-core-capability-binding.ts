/**
 * CyberCrowd-CASES — CASES → CORE Capability Binding V1
 *
 * ONE JOB:
 * Bind the CASES manifest to the declared CORE service capabilities
 * as an immutable structural capability reference.
 *
 * Structural binding only.
 *
 * This file does NOT:
 * - execute CORE behavior
 * - execute CASES behavior
 * - mutate CORE state
 * - mutate CASES state
 * - interpret doctrine
 * - authorize behavior
 * - execute governance
 * - expose CORE internals
 */

export type CasesCoreCapabilityBindingStatus =
  | "CASES_CORE_CAPABILITY_BINDING_CREATED"
  | "CASES_CORE_CAPABILITY_BINDING_INVALID";

export interface CasesCoreCapabilityBindingInput {
  readonly serviceId: string;
  readonly capabilityReference: string;
  readonly capabilityManifestUrl: string;
}

export interface CasesCoreCapabilityBinding {
  readonly status: CasesCoreCapabilityBindingStatus;

  readonly serviceId: string;
  readonly capabilityReference: string;
  readonly capabilityManifestUrl: string;

  readonly capabilityBindingId: string;
  readonly createdAt: number;
}

/**
 * Creates the immutable CASES → CORE capability binding.
 *
 * Structural binding only.
 */
export const createCasesCoreCapabilityBinding = (
  input: CasesCoreCapabilityBindingInput,
): CasesCoreCapabilityBinding => {
  const valid =
    Boolean(input.serviceId) &&
    Boolean(input.capabilityReference) &&
    Boolean(input.capabilityManifestUrl);

  if (!valid) {
    throw new Error(
      "INVALID_CASES_CORE_CAPABILITY_BINDING_INPUT",
    );
  }

  const capabilityBindingId =
    `cases-core-capability-binding:${crypto.randomUUID()}`;

  return Object.freeze({
    status: "CASES_CORE_CAPABILITY_BINDING_CREATED",

    serviceId: input.serviceId,
    capabilityReference: input.capabilityReference,
    capabilityManifestUrl: input.capabilityManifestUrl,

    capabilityBindingId,
    createdAt: Date.now(),
  });
};

/**
 * Structural validation only.
 */
export const validateCasesCoreCapabilityBinding = (
  binding: CasesCoreCapabilityBinding,
): boolean => {
  return (
    binding.status ===
      "CASES_CORE_CAPABILITY_BINDING_CREATED" &&
    Boolean(binding.serviceId) &&
    Boolean(binding.capabilityReference) &&
    Boolean(binding.capabilityManifestUrl) &&
    Boolean(binding.capabilityBindingId) &&
    Number.isFinite(binding.createdAt)
  );
};
