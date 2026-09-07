// FILE: reactor-route-selector.ts
// CyberCrowd Core
// Reactor Room Route Selector
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
// Receive one incoming Reactor Room drop
// and declare which CyberCrowd avenue or avenues
// are required for that drop.
//
// This organ does NOT execute the selected avenues.
//
// It answers only:
//
// "Where does this drop need to go?"
//
// AVAILABLE AVENUES:
//
// - BOUNCE
// - ARCHIVE
// - DEWEY
// - SEARCH
// - DATA
// - LIVE
// - RESPONSE
// - GOVERNED
// - VALUE_PROTECTED
//
// ROUTE DEPTH:
//
// BOUNCE
// Simple request can return after the selected organ completes.
//
// ROUTE
// Request may use multiple information avenues before response.
//
// GOVERNED
// Request requires later Comptroller / Turnstile governance.
//
// VALUE_PROTECTED
// Request touches real or potentially real value movement
// and must enter the protected financial/value protocol.
//
// IMPORTANT:
//
// Information may take a short path.
// Value movement may not bypass protection.
//
// This organ does NOT own:
//
// - Ping generation
// - Pepper signaling
// - Archive execution
// - OSAR execution
// - Dewey classification
// - Search execution
// - Data retrieval
// - Live-source retrieval
// - Response formation
// - provenance synthesis
// - Turnstile / Comptroller authority
// - Secretary authorization
// - Octopus movement
// - financial authorization
// - value movement
// - receipt generation
// - ledger mutation
// - archive mutation
// - transaction execution
//
// BLEED RULE:
//
// Route selection grants no authority over
// any selected organ.
//
// BLAST RULE:
//
// A selected avenue applies only to the
// incoming drop presented to this selector.

export type ReactorSourceSignal =
  | "PING"
  | "HUMAN_SEARCH"
  | "OBJECT_REQ"
  | "SERVICE_NEED"
  | "EVENT"
  | "SYS_QUESTION"
  | "PURCHASE_INTENT"
  | "PROFESSIONAL_PAYMENT"
  | "VALUE_NEGOTIATION";

export type ReactorAvenue =
  | "BOUNCE"
  | "ARCHIVE"
  | "DEWEY"
  | "SEARCH"
  | "DATA"
  | "LIVE"
  | "RESPONSE"
  | "GOVERNED"
  | "VALUE_PROTECTED";

export type ReactorRouteDepth =
  | "BOUNCE"
  | "ROUTE"
  | "GOVERNED"
  | "VALUE_PROTECTED";

export interface ReactorRouteInput<T = unknown> {
  id: string;
  sourceSignal: ReactorSourceSignal;
  payload: T;
  timestamp: number;
}

export interface ReactorRouteResult {
  ok: boolean;
  id: string | null;
  sourceSignal: ReactorSourceSignal | null;
  routeDepth: ReactorRouteDepth | null;
  avenues: ReactorAvenue[];
  reason: string;
}

export function selectReactorRoute(
  input: ReactorRouteInput
): ReactorRouteResult {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      id: null,
      sourceSignal: null,
      routeDepth: null,
      avenues: [],
      reason: "REACTOR_ROUTE_INPUT_REQUIRED"
    };
  }

  const id =
    typeof input.id === "string"
      ? input.id.trim()
      : "";

  if (!id) {
    return {
      ok: false,
      id: null,
      sourceSignal: null,
      routeDepth: null,
      avenues: [],
      reason: "REACTOR_ROUTE_ID_REQUIRED"
    };
  }

  const sourceSignal = input.sourceSignal;

  switch (sourceSignal) {
    case "PING":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "BOUNCE",
        avenues: [
          "DEWEY",
          "BOUNCE"
        ],
        reason: "REACTOR_ROUTE_PING_RESOLVED"
      };

    case "HUMAN_SEARCH":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "ROUTE",
        avenues: [
          "SEARCH",
          "RESPONSE"
        ],
        reason: "REACTOR_ROUTE_HUMAN_SEARCH_RESOLVED"
      };

    case "OBJECT_REQ":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "ROUTE",
        avenues: [
          "DEWEY",
          "DATA",
          "RESPONSE"
        ],
        reason: "REACTOR_ROUTE_OBJECT_REQUEST_RESOLVED"
      };

    case "SERVICE_NEED":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "GOVERNED",
        avenues: [
          "SEARCH",
          "DEWEY",
          "RESPONSE",
          "GOVERNED"
        ],
        reason: "REACTOR_ROUTE_SERVICE_NEED_RESOLVED"
      };

    case "EVENT":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "ROUTE",
        avenues: [
          "LIVE",
          "DATA",
          "RESPONSE"
        ],
        reason: "REACTOR_ROUTE_EVENT_RESOLVED"
      };

    case "SYS_QUESTION":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "ROUTE",
        avenues: [
          "ARCHIVE",
          "DATA",
          "RESPONSE"
        ],
        reason: "REACTOR_ROUTE_SYSTEM_QUESTION_RESOLVED"
      };

    case "PURCHASE_INTENT":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "VALUE_PROTECTED",
        avenues: [
          "VALUE_PROTECTED"
        ],
        reason: "REACTOR_ROUTE_PURCHASE_INTENT_RESOLVED"
      };

    case "PROFESSIONAL_PAYMENT":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "VALUE_PROTECTED",
        avenues: [
          "VALUE_PROTECTED"
        ],
        reason: "REACTOR_ROUTE_PROFESSIONAL_PAYMENT_RESOLVED"
      };

    case "VALUE_NEGOTIATION":
      return {
        ok: true,
        id,
        sourceSignal,
        routeDepth: "VALUE_PROTECTED",
        avenues: [
          "DATA",
          "RESPONSE",
          "VALUE_PROTECTED"
        ],
        reason: "REACTOR_ROUTE_VALUE_NEGOTIATION_RESOLVED"
      };

    default:
      return {
        ok: false,
        id,
        sourceSignal: null,
        routeDepth: null,
        avenues: [],
        reason: "REACTOR_ROUTE_SIGNAL_NOT_RECOGNIZED"
      };
  }
}
