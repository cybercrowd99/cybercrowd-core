/**
 * CyberCrowd-Core — Core Sovereign Ledger V1
 *
 * Purpose:
 * - Seal CORE routing finality into a sovereign ledger anchor.
 * - Preserve CORE-side lifecycle sovereignty.
 * - Provide immutable sovereign references for CORE lifecycle completion.
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

export type CoreSovereignLedgerStatus =
  | "SOVEREIGN_LEDGER_RECORDED"
  | "SOVEREIGN_LEDGER_INVALID";

export interface CoreRoutingFinality {
  readonly status: string;
  readonly finalityReference: string;
  readonly ledgerReference: string;

  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];

  readonly createdAt: number;
}

export interface CoreSovereignLedger {
  readonly status: CoreSovereignLedgerStatus;

  /**
   * Immutable sovereign ledger anchor.
   */
  readonly sovereignReference: string;

  /**
   * Source routing finality anchor.
   */
  readonly finalityReference: string;

  /**
   * Frozen sovereign dispatch lineage.
   */
  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];

  /**
   * Sovereign creation timestamp.
   */
  readonly createdAt: number;
}

export interface CreateCoreSovereignLedgerInput {
  readonly finalityReference: string;

  readonly dispatches: readonly {
    readonly organId: string;
    readonly action: string;
    readonly reference: string;
  }[];
}

/**
 * Creates bounded CORE sovereign ledger.
 *
 * Structural sealing only.
 */
export const createCoreSovereignLedger = (
  input: CreateCoreSovereignLedgerInput,
): CoreSovereignLedger => {

  const valid =
    Boolean(input.finalityReference) &&
    Array.isArray(input.dispatches) &&
    input.dispatches.length === 13;

  if (!valid) {
    throw new Error("INVALID_CORE_SOVEREIGN_LEDGER_INPUT");
  }

  return Object.freeze({
    status: "SOVEREIGN_LEDGER_RECORDED",

    sovereignReference:
      `core-sovereign-ledger:${crypto.randomUUID()}`,

    finalityReference:
      input.finalityReference,

    dispatches:
      Object.freeze([...input.dispatches]),

    createdAt:
      Date.now(),
  });
};

/**
 * Structural validation only.
 */
export const validateCoreSovereignLedger = (
  ledger: CoreSovereignLedger,
): boolean => {

  return (
    ledger.status === "SOVEREIGN_LEDGER_RECORDED" &&
    Boolean(ledger.sovereignReference) &&
    Boolean(ledger.finalityReference) &&
    ledger.dispatches.length === 13 &&
    Number.isFinite(ledger.createdAt)
  );
};
