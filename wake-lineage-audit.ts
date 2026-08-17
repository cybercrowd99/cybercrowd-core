/* ============================================================
   CORE — WAKE LINEAGE AUDIT
   CyberCrowd Dual-Engine Runtime

   Purpose:
   Record and inspect the lineage relationship between
   successive engine states.

   Owns:
   - wake lineage records
   - predecessor/successor relationship
   - continuity reference tracking
   - lineage break detection

   Does NOT own:
   - engine scheduling
   - transition authorization
   - state execution
   - ledger persistence
   - engine mutation

   Boundary:
   ENGINE STATE → WAKE LINEAGE
   ============================================================ */

export type WakeLineageStatus =
  | "continuous"
  | "incomplete"
  | "broken";

export interface WakeLineageRecord {
  readonly lineageId: string;
  readonly previousEngineId: string | null;
  readonly currentEngineId: string;
  readonly previousStateReference: string | null;
  readonly currentStateReference: string | null;
  readonly continuityReference: string | null;
  readonly status: WakeLineageStatus;
  readonly timestamp: number;
  readonly reason: string | null;
}

export interface WakeLineageInput {
  readonly previousEngineId?: string | null;
  readonly currentEngineId: string;
  readonly previousStateReference?: string | null;
  readonly currentStateReference?: string | null;
  readonly continuityReference?: string | null;
}

export function inspectWakeLineage(
  input: WakeLineageInput
): WakeLineageRecord {

  const previousEngineId =
    input.previousEngineId ?? null;

  const previousStateReference =
    input.previousStateReference ?? null;

  const currentStateReference =
    input.currentStateReference ?? null;

  const continuityReference =
    input.continuityReference ?? null;

  let status: WakeLineageStatus;
  let reason: string | null = null;

  if (!input.currentEngineId) {
    status = "broken";
    reason = "CURRENT_ENGINE_MISSING";
  } else if (
    !previousEngineId ||
    !previousStateReference ||
    !currentStateReference ||
    !continuityReference
  ) {
    status = "incomplete";
    reason = "LINEAGE_DATA_INCOMPLETE";
  } else {
    status = "continuous";
  }

  return Object.freeze({
    lineageId:
      `wake-${Date.now()}-${input.currentEngineId}`,

    previousEngineId,
    currentEngineId: input.currentEngineId,

    previousStateReference,
    currentStateReference,

    continuityReference,

    status,
    timestamp: Date.now(),

    reason
  });
}
