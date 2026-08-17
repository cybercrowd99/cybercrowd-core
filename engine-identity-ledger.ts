/**
 * CORE — Engine Identity Ledger
 *
 * CyberCrowd Core — Dual-Engine Runtime Audit Boundary
 *
 * Purpose:
 * Record engine ownership and movement of runtime state across
 * the continuity chain.
 *
 * Owns:
 * - producer engine records
 * - consumer engine records
 * - continuity-chain records
 * - wake-lineage records
 * - collapse-event records
 * - illegal-transition records
 *
 * Does NOT own:
 * - engine execution
 * - transition authorization
 * - continuity-state mutation
 * - identity authorization
 * - payment authorization
 *
 * Boundary:
 * ENGINE RUNTIME → IDENTITY LEDGER
 */

export type EngineLedgerEventType =
  | "STATE_PRODUCED"
  | "STATE_CONSUMED"
  | "CONTINUITY_LINKED"
  | "WAKE_LINEAGE_RECORDED"
  | "CONTINUITY_COLLAPSE"
  | "ILLEGAL_TRANSITION";

export interface EngineLedgerEvent {
  readonly eventId: string;
  readonly eventType: EngineLedgerEventType;
  readonly timestamp: number;

  readonly engineId: string;
  readonly stateReference: string | null;

  readonly previousStateReference: string | null;
  readonly nextEngineId: string | null;

  readonly wakeReference: string | null;
  readonly continuityReference: string | null;

  readonly reason: string | null;
}

export interface EngineLedgerInput {
  readonly eventType: EngineLedgerEventType;
  readonly engineId: string;
  readonly stateReference?: string | null;
  readonly previousStateReference?: string | null;
  readonly nextEngineId?: string | null;
  readonly wakeReference?: string | null;
  readonly continuityReference?: string | null;
  readonly reason?: string | null;
}

/**
 * Create a deterministic ledger event envelope.
 *
 * This function records an event only.
 * It does not authorize or execute the transition.
 */
export function createEngineLedgerEvent(
  input: EngineLedgerInput
): EngineLedgerEvent {

  const eventId =
    `eng-${input.eventType.toLowerCase()}-${Date.now()}`;

  return Object.freeze({
    eventId,
    eventType: input.eventType,
    timestamp: Date.now(),

    engineId: input.engineId,
    stateReference: input.stateReference ?? null,

    previousStateReference:
      input.previousStateReference ?? null,

    nextEngineId:
      input.nextEngineId ?? null,

    wakeReference:
      input.wakeReference ?? null,

    continuityReference:
      input.continuityReference ?? null,

    reason:
      input.reason ?? null
  });
}

/**
 * In-memory ledger for the current runtime boundary.
 *
 * Persistence belongs to the downstream ledger/storage layer.
 */
export class EngineIdentityLedger {

  private readonly events: EngineLedgerEvent[] = [];

  record(
    input: EngineLedgerInput
  ): EngineLedgerEvent {

    const event =
      createEngineLedgerEvent(input);

    this.events.push(event);

    return event;
  }

  eventsForEngine(
    engineId: string
  ): readonly EngineLedgerEvent[] {

    return this.events.filter(
      event => event.engineId === engineId
    );
  }

  eventsForState(
    stateReference: string
  ): readonly EngineLedgerEvent[] {

    return this.events.filter(
      event =>
        event.stateReference === stateReference ||
        event.previousStateReference === stateReference
    );
  }

  collapseEvents(): readonly EngineLedgerEvent[] {

    return this.events.filter(
      event =>
        event.eventType === "CONTINUITY_COLLAPSE"
    );
  }

  illegalTransitions(): readonly EngineLedgerEvent[] {

    return this.events.filter(
      event =>
        event.eventType === "ILLEGAL_TRANSITION"
    );
  }

  all(): readonly EngineLedgerEvent[] {

    return [...this.events];
  }
}
