/**
 * CyberCrowd-Core — Core Routing Ledger V1
 *
 * Purpose:
 * - Record bounded CORE organ-routing events.
 * - Preserve deterministic routing continuity.
 * - Provide immutable ledger anchors for CORE dispatch history.
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

export type CoreRoutingLedgerStatus =
  | "ROUTING_LEDGER_RECORDED"
  | "ROUTING_LEDGER_INVALID";

export interface CoreOrganDispatch {
  readonly organId: string;
  readonly action: string;
  readonly reference: string;
}

export interface CoreRoutingLedgerEntry {
  readonly status: CoreRoutingLedgerStatus;

  /**
   * Immutable ledger anchor.
   */
  readonly ledgerReference: string;

  /**
   * Source binding reference.
   */
  readonly bindingReference: string;

  /**
   * Frozen dispatch list.
   */
  readonly dispatches: readonly CoreOrganDispatch[];

  /**
   * Ledger creation timestamp.
   */
  readonly createdAt: number;
}

export interface CreateCoreRoutingLedgerInput {
  readonly bindingReference: string;
  readonly dispatches: readonly CoreOrganDispatch[];
}

/**
 * Creates bounded CORE routing ledger entry.
 *
 * Structural recording only.
 */
export const createCoreRoutingLedger = (
  input: CreateCoreRoutingLedgerInput,
): CoreRoutingLedgerEntry => {
  const valid =
    Boolean(input.bindingReference) &&
    Array.isArray(input.dispatches) &&
    input.dispatches.length === 13;

  if (!valid) {
    throw new Error("INVALID_CORE_ROUTING_LEDGER_INPUT");
  }

  return Object.freeze({
    status: "ROUTING_LEDGER_RECORDED",

    ledgerReference:
      `core-routing-ledger:${crypto.randomUUID()}`,

    bindingReference:
      input.bindingReference,

    dispatches:
      Object.freeze([...input.dispatches]),

    createdAt:
      Date.now(),
  });
};

/**
 * Structural validation only.
 */
export const validateCoreRoutingLedger = (
  ledger: CoreRoutingLedgerEntry,
): boolean => {
  return (
    ledger.status === "ROUTING_LEDGER_RECORDED" &&
    Boolean(ledger.ledgerReference) &&
    Boolean(ledger.bindingReference) &&
    ledger.dispatches.length === 13 &&
    Number.isFinite(ledger.createdAt)
  );
};
