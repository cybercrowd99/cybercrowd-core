/**
 * CyberCrowd-Core — Core Dispatch Finality V1
 *
 * Purpose:
 * - Seal a completed CORE dispatch ledger entry.
 * - Provide immutable dispatch-finality anchors.
 * - Preserve sovereign CORE dispatch continuity.
 *
 * Does NOT:
 * - execute organ actions
 * - mutate organ state
 * - mutate dispatch ledger state
 * - mutate OSAR state
 * - inspect OSAR artifacts
 * - expose NET surfaces
 * - create identity
 * - create ownership
 * - authorize behavior
 */

export type CoreDispatchFinalityStatus =
  | "DISPATCH_FINALITY_RECORDED"
  | "DISPATCH_FINALITY_INVALID";

export interface CoreDispatchLedgerEntry {
  readonly status: string;

  readonly ledgerReference: string;

  readonly dispatchReference: string;

  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];

  readonly createdAt: number;
}

export interface CoreDispatchFinality {
  readonly status: CoreDispatchFinalityStatus;

  /**
   * Immutable dispatch-finality anchor.
   */
  readonly finalityReference: string;

  /**
   * Source dispatch ledger anchor.
   */
  readonly ledgerReference: string;

  /**
   * Frozen final dispatch lineage.
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

export interface CreateCoreDispatchFinalityInput {
  readonly ledgerReference: string;

  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];
}

/**
 * Creates bounded CORE dispatch finality.
 *
 * Structural sealing only.
 */
export const createCoreDispatchFinality = (
  input: CreateCoreDispatchFinalityInput,
): CoreDispatchFinality => {

  const valid =
    Boolean(input.ledgerReference) &&
    Array.isArray(input.dispatches) &&
    input.dispatches.length === 13;

  if (!valid) {
    throw new Error("INVALID_CORE_DISPATCH_FINALITY_INPUT");
  }

  return Object.freeze({
    status: "DISPATCH_FINALITY_RECORDED",

    finalityReference:
      `core-dispatch-finality:${crypto.randomUUID()}`,

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
export const validateCoreDispatchFinality = (
  finality: CoreDispatchFinality,
): boolean => {

  return (
    finality.status === "DISPATCH_FINALITY_RECORDED" &&
    Boolean(finality.finalityReference) &&
    Boolean(finality.ledgerReference) &&
    finality.dispatches.length === 13 &&
    Number.isFinite(finality.createdAt)
  );
};
