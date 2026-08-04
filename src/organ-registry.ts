/**
 * CyberCrowd-Core — Organ Registry V1
 *
 * Purpose:
 * - Define the bounded CORE organ registry.
 * - Provide immutable references for the thirteen CORE organs.
 * - Allow binding and dispatch layers to address organs structurally.
 *
 * Does NOT:
 * - execute organ actions
 * - inspect OSAR artifacts
 * - create identity
 * - create ownership
 * - authorize behavior
 * - mutate organ state
 * - expose NET surfaces
 */

export type CoreOrganId =
  | "01_HALO"
  | "02_SECRETARY"
  | "03_BIFF"
  | "04_PEPPER"
  | "05_OCTOPUS"
  | "06_DEWEY"
  | "07_COLOSSEUM"
  | "08_TURD"
  | "09_VACUUM"
  | "10_PING"
  | "11_ARCHIVE"
  | "12_INEZ"
  | "13_CLEAR";

export interface CoreOrganDefinition {
  readonly organId: CoreOrganId;
  readonly registryReference: string;
  readonly enabled: boolean;
}

export interface OrganRegistryResult {
  readonly status:
    | "ORGAN_REGISTRY_CREATED"
    | "ORGAN_REGISTRY_INVALID";

  readonly organs: readonly CoreOrganDefinition[];
  readonly registryReference: string;
}

const CORE_ORGAN_IDS: readonly CoreOrganId[] = Object.freeze([
  "01_HALO",
  "02_SECRETARY",
  "03_BIFF",
  "04_PEPPER",
  "05_OCTOPUS",
  "06_DEWEY",
  "07_COLOSSEUM",
  "08_TURD",
  "09_VACUUM",
  "10_PING",
  "11_ARCHIVE",
  "12_INEZ",
  "13_CLEAR",
]);

/**
 * Creates the bounded CORE organ registry.
 *
 * Structural registration only.
 */
export const createOrganRegistry = (): OrganRegistryResult => {
  const registryReference =
    `core-organ-registry:${crypto.randomUUID()}`;

  const organs: readonly CoreOrganDefinition[] =
    Object.freeze(
      CORE_ORGAN_IDS.map((organId) =>
        Object.freeze({
          organId,
          registryReference,
          enabled: true,
        }),
      ),
    );

  return Object.freeze({
    status: "ORGAN_REGISTRY_CREATED",
    organs,
    registryReference,
  });
};

/**
 * Structural validation only.
 */
export const validateOrganRegistry = (
  registry: OrganRegistryResult,
): boolean => {
  if (!registry.registryReference) {
    return false;
  }

  if (
    registry.status !== "ORGAN_REGISTRY_CREATED" &&
    registry.status !== "ORGAN_REGISTRY_INVALID"
  ) {
    return false;
  }

  return (
    registry.organs.length === 13 &&
    CORE_ORGAN_IDS.every((organId) =>
      registry.organs.some(
        (organ) => organ.organId === organId,
      ),
    )
  );
};
