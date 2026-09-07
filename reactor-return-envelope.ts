// FILE: reactor-return-envelope.ts
// CyberCrowd Core
// Reactor Room Return Envelope
//
// One rock.
// One object.
// One movement.
// One function.
// One entrance.
// One exit.
// One actual end.
//
// PURPOSE:
//
// Receive one completed result from one Reactor Room avenue
// and wrap it for governed return.
//
// It answers only:
//
// "What came back, from where, and under what source context?"
//
// This organ does NOT decide whether the result is true,
// authoritative, preferred, ranked, or allowed to move.
//
// Candidate doctrine:
//
// FOUND != TRUE
// MATCH != AUTHORITY
// RANK != TRUTH
// POPULAR != CORRECT
//
// Owns only:
//
// - return-envelope validation
// - origin-organ preservation
// - source-reference preservation
// - candidate-state preservation
// - return timestamp preservation
//
// Does not own:
//
// - route selection
// - Ping generation
// - Pepper signaling
// - Archive execution
// - OSAR execution
// - Dewey classification
// - Search execution
// - Data retrieval
// - Live retrieval
// - ranking
// - recommendation
// - response formation
// - authority
// - Turnstile / Comptroller
// - Secretary
// - Octopus
// - financial protection
// - value movement
// - receipt generation
//
// BLEED RULE:
//
// A returned result does not inherit authority
// from the organ that produced it.
//
// BLAST RULE:
//
// This envelope preserves only the returned result
// presented to it.

export type ReactorReturnOrigin =
  | "ARCHIVE"
  | "OSAR"
  | "DEWEY"
  | "SEARCH"
  | "DATA"
  | "LIVE"
  | "VALUE_PROTECTED";

export interface ReactorReturnInput<T = unknown> {
  reactorId: string;
  originOrgan: ReactorReturnOrigin;
  sourceReference: string;
  data: T;
  timestamp: number;
}

export interface ReactorReturnEnvelope<T = unknown> {
  ok: boolean;
  reactorId: string | null;
  originOrgan: ReactorReturnOrigin | null;
  sourceReference: string | null;
  data: T | null;
  isAuthoritative: false;
  timestamp: number | null;
  reason: string;
}

export function createReactorReturnEnvelope<T = unknown>(
  input: ReactorReturnInput<T>
): ReactorReturnEnvelope<T> {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      reactorId: null,
      originOrgan: null,
      sourceReference: null,
      data: null,
      isAuthoritative: false,
      timestamp: null,
      reason: "REACTOR_RETURN_INPUT_REQUIRED"
    };
  }

  const reactorId =
    typeof input.reactorId === "string"
      ? input.reactorId.trim()
      : "";

  if (!reactorId) {
    return {
      ok: false,
      reactorId: null,
      originOrgan: null,
      sourceReference: null,
      data: null,
      isAuthoritative: false,
      timestamp: null,
      reason: "REACTOR_RETURN_ID_REQUIRED"
    };
  }

  const sourceReference =
    typeof input.sourceReference === "string"
      ? input.sourceReference.trim()
      : "";

  if (!sourceReference) {
    return {
      ok: false,
      reactorId,
      originOrgan: null,
      sourceReference: null,
      data: null,
      isAuthoritative: false,
      timestamp: null,
      reason: "REACTOR_RETURN_SOURCE_REFERENCE_REQUIRED"
    };
  }

  if (!Number.isFinite(input.timestamp)) {
    return {
      ok: false,
      reactorId,
      originOrgan: null,
      sourceReference,
      data: null,
      isAuthoritative: false,
      timestamp: null,
      reason: "REACTOR_RETURN_TIMESTAMP_REQUIRED"
    };
  }

  const allowedOrigins: ReactorReturnOrigin[] = [
    "ARCHIVE",
    "OSAR",
    "DEWEY",
    "SEARCH",
    "DATA",
    "LIVE",
    "VALUE_PROTECTED"
  ];

  if (!allowedOrigins.includes(input.originOrgan)) {
    return {
      ok: false,
      reactorId,
      originOrgan: null,
      sourceReference,
      data: null,
      isAuthoritative: false,
      timestamp: input.timestamp,
      reason: "REACTOR_RETURN_ORIGIN_NOT_RECOGNIZED"
    };
  }

  return {
    ok: true,
    reactorId,
    originOrgan: input.originOrgan,
    sourceReference,
    data: input.data,
    isAuthoritative: false,
    timestamp: input.timestamp,
    reason: "REACTOR_RETURN_ENVELOPE_RESOLVED"
  };
}
