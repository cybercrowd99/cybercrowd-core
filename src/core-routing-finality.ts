/**
 * CyberCrowd-Core — Core Routing Finality V1
 *
 * Purpose:
 * - Seal a completed CORE routing ledger entry.
 * - Provide immutable routing-finality anchors.
 * - Preserve sovereign CORE routing continuity.
 *
 * Does NOT:
 * - execute organ actions
 * - mutate organ state
 * - mutate OSAR state
 * - expose OSAR artifacts
 * - expose NET surfaces
 * - create identity
 * - create ownership
 * - authorize behavior
 */

export type CoreRoutingFinalityStatus =
  | "ROUTING_FINALITY_RECORDED"
  | "ROUTING_FINALITY_INVALID";

export interface CoreRoutingFinality {
  readonly status: CoreRoutingFinalityStatus;

  /**
   * Immutable finality anchor.
   */
  readonly finalityReference: string;

  /**
   * Source routing ledger anchor.
   */
  readonly ledgerReference: string;

  /**
   * Frozen dispatch lineage.
   */
  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];

  /**
   * Finality creation timestamp.
   */
  readonly createdAt: number;
}

export interface CreateCoreRoutingFinalityInput {
  readonly ledgerReference: string;
  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];
}

/**
 * Creates bounded CORE routing finality.
 *
 * Structural sealing only.
 */
export const createCoreRoutingFinality = (
  input: CreateCoreRoutingFinalityInput,
): CoreRoutingFinality => {
  const valid =
    Boolean(input.ledgerReference) &&
    Array.isArray(input.dispatches) &&
    input.dispatches.length === 13;

  if (!valid) {
    throw new Error("INVALID_CORE_ROUTING_FINALITY_INPUT");
  }

  return Object.freeze({
    status: "ROUTING_FINALITY_RECORDED",

    finalityReference:
      `core-routing-finality:${crypto.randomUUID()}`,

    ledgerReference:
      input.ledgerReference,

    dispatches:
      Object.freeze([...input.dispatches]),

    createdAt:
      Date.now(),
  });
};

/**
 * Structural validation only.
 */
export const validateCoreRoutingFinality = (
  finality: CoreRoutingFinality,
): boolean => {
  return (
    finality.status === "ROUTING_FINALITY_RECORDED" &&
    Boolean(finality.finalityReference) &&
    Boolean(finality.ledgerReference) &&
    finality.dispatches.length === 13 &&
    Number.isFinite(finality.createdAt)
  );
};
