/* ============================================================
   CORE — UNIFIED CONTEXT ENVELOPE
   CyberCrowd Dual-Engine Runtime

   Purpose:
   Carry the complete runtime context across engine
   transitions without losing continuity, lineage, or
   wake-zone information.

   Owns:
   - unified runtime context shape
   - object identity
   - treatment state
   - continuity state
   - engine identity
   - engine lineage
   - wake-zone state
   - runtime metadata

   Does NOT own:
   - engine scheduling
   - transition authorization
   - continuity validation
   - zero-state detection
   - ledger storage
   - presentation routing

   Boundary:
   RUNTIME CONTEXT → ENGINE TRANSITION → RUNTIME CONTEXT
   ============================================================ */

export type ContextTreatment =
  | "PRESERVE"
  | "ADWORM_CONTROLLED"
  | "CONSERVATIVE";

export type WakeZone =
  | "ACTIVE"
  | "WAKE"
  | "SAFE"
  | "COLLAPSE";

export interface ContinuityState {
  readonly continuityReference: string | null;
  readonly preservedState: unknown | null;
  readonly status: "INTACT" | "DEGRADED" | "COLLAPSED";
}

export interface EngineLineage {
  readonly previousEngine: string | null;
  readonly currentEngine: string;
  readonly transitionId: string | null;
}

export interface UnifiedContextEnvelopeInput {
  readonly objectId: string;
  readonly context: unknown;
  readonly treatment: ContextTreatment;
  readonly continuityState: ContinuityState;
  readonly engine: string;
  readonly lineage: EngineLineage;
  readonly wakeZone: WakeZone;
  readonly metadata?: Record<string, unknown>;
}

export interface UnifiedContextEnvelope {
  readonly objectId: string;
  readonly context: unknown;
  readonly treatment: ContextTreatment;
  readonly continuityState: ContinuityState;
  readonly engine: string;
  readonly lineage: EngineLineage;
  readonly wakeZone: WakeZone;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/* ============================================================
   ENVELOPE FACTORY
   ============================================================ */

export function createUnifiedContextEnvelope(
  input: UnifiedContextEnvelopeInput
): UnifiedContextEnvelope {

  if (!input.objectId) {
    throw new Error(
      "[CORE][ContextEnvelope] objectId is required."
    );
  }

  if (!input.engine) {
    throw new Error(
      "[CORE][ContextEnvelope] engine is required."
    );
  }

  if (!input.lineage.currentEngine) {
    throw new Error(
      "[CORE][ContextEnvelope] lineage.currentEngine is required."
    );
  }

  if (
    input.lineage.currentEngine !== input.engine
  ) {
    throw new Error(
      "[CORE][ContextEnvelope] engine lineage mismatch."
    );
  }

  if (
    input.wakeZone === "COLLAPSE"
  ) {
    throw new Error(
      "[CORE][ContextEnvelope] collapsed wake zone cannot create envelope."
    );
  }

  if (
    input.continuityState.status === "COLLAPSED"
  ) {
    throw new Error(
      "[CORE][ContextEnvelope] collapsed continuity cannot create envelope."
    );
  }

  return Object.freeze({
    objectId: input.objectId,
    context: input.context,
    treatment: input.treatment,
    continuityState: Object.freeze({
      ...input.continuityState
    }),
    engine: input.engine,
    lineage: Object.freeze({
      ...input.lineage
    }),
    wakeZone: input.wakeZone,
    metadata: Object.freeze({
      ...(input.metadata || {})
    })
  });
}

/* ============================================================
   ENVELOPE TRANSITION
   ============================================================ */

export function transitionUnifiedContextEnvelope(
  envelope: UnifiedContextEnvelope,
  next: Pick<
    UnifiedContextEnvelopeInput,
    "engine" | "lineage" | "wakeZone" | "treatment"
  >
): UnifiedContextEnvelope {

  if (!next.engine) {
    throw new Error(
      "[CORE][ContextEnvelope] next engine is required."
    );
  }

  if (
    next.lineage.currentEngine !== next.engine
  ) {
    throw new Error(
      "[CORE][ContextEnvelope] next engine lineage mismatch."
    );
  }

  if (
    next.wakeZone === "COLLAPSE"
  ) {
    throw new Error(
      "[CORE][ContextEnvelope] transition enters collapse zone."
    );
  }

  return Object.freeze({
    ...envelope,
    treatment: next.treatment,
    engine: next.engine,
    lineage: Object.freeze({
      ...next.lineage
    }),
    wakeZone: next.wakeZone
  });
}
