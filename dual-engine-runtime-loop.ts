/* ============================================================
   CORE — DUAL-ENGINE RUNTIME LOOP
   CyberCrowd Dual-Engine Runtime

   Purpose:
   Execute the validated runtime cycle by coordinating the
   continuity engine, engine governor, wake validator,
   zero-state sentinel, context router, identity ledger,
   and unified context envelope.

   Owns:
   - runtime cycle coordination
   - engine handoff execution
   - guard ordering
   - runtime stop conditions

   Does NOT own:
   - continuity state storage
   - transition policy
   - wake-zone policy
   - zero-state policy
   - presentation treatment policy
   - ledger persistence implementation

   Boundary:
   CONTINUITY → GOVERNOR → VALIDATION → ROUTING → ENGINE
   ============================================================ */

export type RuntimeLoopStatus =
  | "READY"
  | "RUNNING"
  | "TRANSFERRED"
  | "HALTED"
  | "COLLAPSED";

export type RuntimeLoopReason =
  | "RUNTIME_READY"
  | "ENGINE_TRANSFERRED"
  | "NO_ENVELOPE"
  | "ZERO_STATE"
  | "WAKE_INVALID"
  | "TRANSITION_FORBIDDEN"
  | "CONTEXT_ROUTING_FAILED"
  | "CONTINUITY_COLLAPSED";

export interface RuntimeEnvelope {
  readonly objectId: string;
  readonly context: unknown;
  readonly treatment:
    | "PRESERVE"
    | "ADWORM_CONTROLLED"
    | "CONSERVATIVE";
  readonly continuityState: {
    readonly continuityReference: string | null;
    readonly preservedState: unknown | null;
    readonly status:
      | "INTACT"
      | "DEGRADED"
      | "COLLAPSED";
  };
  readonly engine: string;
  readonly lineage: {
    readonly previousEngine: string | null;
    readonly currentEngine: string;
    readonly transitionId: string | null;
  };
  readonly wakeZone:
    | "ACTIVE"
    | "WAKE"
    | "SAFE"
    | "COLLAPSE";
  readonly metadata: Readonly<Record<string, unknown>>;
}

/* ============================================================
   RUNTIME DEPENDENCIES
   ============================================================ */

export interface ContinuityEngine {
  preserve(
    envelope: RuntimeEnvelope
  ): RuntimeEnvelope;
}

export interface EngineGovernor {
  selectNext(
    envelope: RuntimeEnvelope
  ): {
    allowed: boolean;
    nextEngine: string | null;
    reason: string;
  };
}

export interface WakeValidator {
  validate(
    envelope: RuntimeEnvelope,
    nextEngine: string
  ): {
    valid: boolean;
    reason: string;
  };
}

export interface ZeroStateSentinel {
  inspect(
    envelope: RuntimeEnvelope
  ): {
    safe: boolean;
    reason: string;
  };
}

export interface ContextRouter {
  route(
    envelope: RuntimeEnvelope,
    nextEngine: string
  ): RuntimeEnvelope;
}

export interface EngineIdentityLedger {
  recordProduced(
    envelope: RuntimeEnvelope
  ): void;

  recordConsumed(
    envelope: RuntimeEnvelope
  ): void;

  recordTransfer(
    fromEngine: string,
    toEngine: string,
    envelope: RuntimeEnvelope
  ): void;

  recordCollapse(
    envelope: RuntimeEnvelope,
    reason: string
  ): void;
}

/* ============================================================
   LOOP RESULT
   ============================================================ */

export interface RuntimeLoopResult {
  readonly status: RuntimeLoopStatus;
  readonly reason: RuntimeLoopReason;
  readonly envelope: RuntimeEnvelope | null;
  readonly engine: string | null;
}

/* ============================================================
   RUNTIME LOOP
   ============================================================ */

export class DualEngineRuntimeLoop {

  private status: RuntimeLoopStatus = "READY";

  constructor(
    private readonly continuityEngine: ContinuityEngine,
    private readonly engineGovernor: EngineGovernor,
    private readonly wakeValidator: WakeValidator,
    private readonly zeroStateSentinel: ZeroStateSentinel,
    private readonly contextRouter: ContextRouter,
    private readonly identityLedger: EngineIdentityLedger
  ) {}

  /* ----------------------------------------------------------
     RUN ONE CONTROLLED RUNTIME CYCLE
     ---------------------------------------------------------- */

  run(
    envelope: RuntimeEnvelope | null
  ): RuntimeLoopResult {

    this.status = "RUNNING";

    if (!envelope) {
      return this.halt(
        "NO_ENVELOPE",
        null
      );
    }

    /* --------------------------------------------------------
       1. ZERO-STATE GUARD
       -------------------------------------------------------- */

    const zeroState =
      this.zeroStateSentinel.inspect(envelope);

    if (!zeroState.safe) {

      this.identityLedger.recordCollapse(
        envelope,
        zeroState.reason
      );

      return this.halt(
        "ZERO_STATE",
        envelope
      );
    }

    /* --------------------------------------------------------
       2. CONTINUITY GUARD
       -------------------------------------------------------- */

    if (
      envelope.continuityState.status ===
      "COLLAPSED"
    ) {

      this.identityLedger.recordCollapse(
        envelope,
        "CONTINUITY_COLLAPSED"
      );

      return this.halt(
        "CONTINUITY_COLLAPSED",
        envelope
      );
    }

    /* --------------------------------------------------------
       3. RECORD ENGINE CONSUMPTION
       -------------------------------------------------------- */

    this.identityLedger.recordConsumed(
      envelope
    );

    /* --------------------------------------------------------
       4. PRESERVE CONTINUITY
       -------------------------------------------------------- */

    const preserved =
      this.continuityEngine.preserve(
        envelope
      );

    /* --------------------------------------------------------
       5. GOVERN NEXT ENGINE
       -------------------------------------------------------- */

    const transition =
      this.engineGovernor.selectNext(
        preserved
      );

    if (
      !transition.allowed ||
      !transition.nextEngine
    ) {

      return this.halt(
        "TRANSITION_FORBIDDEN",
        preserved
      );
    }

    const nextEngine =
      transition.nextEngine;

    /* --------------------------------------------------------
       6. VALIDATE WAKE ZONE
       -------------------------------------------------------- */

    const wake =
      this.wakeValidator.validate(
        preserved,
        nextEngine
      );

    if (!wake.valid) {

      return this.halt(
        "WAKE_INVALID",
        preserved
      );
    }

    /* --------------------------------------------------------
       7. ROUTE CONTEXT
       -------------------------------------------------------- */

    let routed: RuntimeEnvelope;

    try {

      routed =
        this.contextRouter.route(
          preserved,
          nextEngine
        );

    } catch {

      return this.halt(
        "CONTEXT_ROUTING_FAILED",
        preserved
      );
    }

    /* --------------------------------------------------------
       8. FINAL ZERO-STATE CHECK
       -------------------------------------------------------- */

    const postRoute =
      this.zeroStateSentinel.inspect(
        routed
      );

    if (!postRoute.safe) {

      this.identityLedger.recordCollapse(
        routed,
        postRoute.reason
      );

      return this.halt(
        "ZERO_STATE",
        routed
      );
    }

    /* --------------------------------------------------------
       9. RECORD TRANSFER
       -------------------------------------------------------- */

    this.identityLedger.recordTransfer(
      preserved.engine,
      nextEngine,
      routed
    );

    /* --------------------------------------------------------
       10. RECORD PRODUCED STATE
       -------------------------------------------------------- */

    this.identityLedger.recordProduced(
      routed
    );

    this.status = "TRANSFERRED";

    return Object.freeze({
      status: "TRANSFERRED",
      reason: "ENGINE_TRANSFERRED",
      envelope: routed,
      engine: nextEngine
    });
  }

  /* ----------------------------------------------------------
     CURRENT STATUS
     ---------------------------------------------------------- */

  currentStatus(): RuntimeLoopStatus {
    return this.status;
  }

  /* ----------------------------------------------------------
     HALT
     ---------------------------------------------------------- */

  private halt(
    reason: RuntimeLoopReason,
    envelope: RuntimeEnvelope | null
  ): RuntimeLoopResult {

    this.status =
      reason === "ZERO_STATE" ||
      reason === "CONTINUITY_COLLAPSED"
        ? "COLLAPSED"
        : "HALTED";

    return Object.freeze({
      status: this.status,
      reason,
      envelope,
      engine: envelope?.engine || null
    });
  }
}

/* ============================================================
   FACTORY
   ============================================================ */

export function createDualEngineRuntimeLoop(
  dependencies: {
    continuityEngine: ContinuityEngine;
    engineGovernor: EngineGovernor;
    wakeValidator: WakeValidator;
    zeroStateSentinel: ZeroStateSentinel;
    contextRouter: ContextRouter;
    identityLedger: EngineIdentityLedger;
  }
): DualEngineRuntimeLoop {

  return new DualEngineRuntimeLoop(
    dependencies.continuityEngine,
    dependencies.engineGovernor,
    dependencies.wakeValidator,
    dependencies.zeroStateSentinel,
    dependencies.contextRouter,
    dependencies.identityLedger
  );
}
