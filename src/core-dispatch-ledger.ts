/**
 * CyberCrowd-Core — Core Dispatch Ledger V1
 *
 * Purpose:
 * - Record bounded CORE organ-dispatch events.
 * - Preserve deterministic CORE dispatch continuity.
 * - Provide immutable ledger anchors for CORE routing history.
 *
 * Does NOT:
 * - execute organ actions
 * - mutate organ state
 * - mutate OSAR state
 * - inspect OSAR artifacts
 * - expose NET surfaces
 * - create identity
 * - create ownership
 * - authorize behavior
 */

export type CoreDispatchLedgerStatus =
  | "DISPATCH_LEDGER_RECORDED"
  | "DISPATCH_LEDGER_INVALID";

export interface CoreDispatchLedgerEntry {
  readonly status: CoreDispatchLedgerStatus;

  /**
   * Immutable dispatch ledger anchor.
   */
  readonly ledgerReference: string;

  /**
   * Source dispatch envelope reference.
   */
  readonly dispatchReference: string;

  /**
   * Frozen organ dispatch lineage.
   */
  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];

  /**
   * Ledger creation timestamp.
   */
  readonly createdAt: number;
}

export interface CreateCoreDispatchLedgerInput {
  readonly dispatchReference: string;

  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];
}

/**
 * Creates bounded CORE dispatch ledger.
 *
 * Structural recording only.
 */
export const createCoreDispatchLedger = (
  input: CreateCoreDispatchLedgerInput,
): CoreDispatchLedgerEntry => {

  const valid =
    Boolean(input.dispatchReference) &&
    Array.isArray(input.dispatches) &&
    input.dispatches.length === 13;

  if (!valid) {
    throw new Error("INVALID_CORE_DISPATCH_LEDGER_INPUT");
  }

  return Object.freeze({
    status: "DISPATCH_LEDGER_RECORDED",

    ledgerReference:
      `core-dispatch-ledger:${crypto.randomUUID()}`,

    dispatchReference:
      input.dispatchReference,

    dispatches:
      Object.freeze([...input.dispatches]),

    createdAt:
      Date.now(),
  });
};

/**
 * Structural validation only.
 */
export const validateCoreDispatchLedger = (
  ledger: CoreDispatchLedgerEntry,
): boolean => {

  return (
    ledger.status === "DISPATCH_LEDGER_RECORDED" &&
    Boolean(ledger.ledgerReference) &&
    Boolean(ledger.dispatchReference) &&
    ledger.dispatches.length === 13 &&
    Number.isFinite(ledger.createdAt)
  );
};
