/**
 * CyberCrowd Ledger Snapshot
 *
 * File:
 * src/ledger-snapshot.ts
 *
 * Subsystem:
 * CyberLedgerSubSystem
 *
 * Effigy:
 * Structural Ledger Snapshot Layer
 *
 * Purpose:
 * Defines the structural snapshot boundary used by CyberLedger
 * to preserve continuity-safe views of approved structural state.
 *
 * Ledger snapshots preserve:
 * - structural state capture
 * - continuity-safe reference points
 * - subsystem state representation
 * - approved structural memory views
 *
 * Ledger snapshots do NOT preserve:
 * - identity payloads
 * - identity correlation
 * - behavioral history
 * - operator profiles
 * - authority decisions
 * - surveillance data
 * - predictive models
 * - value assignment
 */

export interface LedgerSnapshot {
  /** Structural subsystem reference */
  subsystem: "CyberLedgerSubSystem";

  /** Snapshot layer state */
  status: "SNAPSHOT_CREATED";

  /** Snapshot identifier */
  snapshotId: string;

  /** Snapshot creation timestamp */
  timestamp: number;

  /** Structural state payload */
  state: unknown;

  /** Snapshot geometry */
  geometry: unknown;
}

/**
 * Creates a structural ledger snapshot.
 *
 * Captures structure.
 * Does not capture identity.
 * Does not create authority.
 * Does not create decisions.
 */
export function createLedgerSnapshot(
  state: unknown
): LedgerSnapshot {
  return {
    subsystem: "CyberLedgerSubSystem",
    status: "SNAPSHOT_CREATED",
    snapshotId: crypto.randomUUID(),
    timestamp: Date.now(),
    state,
    geometry: {
      type: "STRUCTURAL_SNAPSHOT",
    },
  };
}
