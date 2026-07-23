// src/xr/XRCoreEventBoundary.ts
// CyberCrowd XR Core Event Boundary
//
// Core lane organ.
//
// Purpose:
// - Define event boundary between XR runtime requests and cybercrowd-core.
// - Provide XR event request/decision vocabulary.
// - Control event boundary semantics without owning event routing.
//
// Owns:
// - XR event boundary semantics.
// - Event request shape.
// - Event decision shape.
// - Controlled event evaluation.
//
// Does NOT own:
// - Event storage.
// - Event routing.
// - Event persistence.
// - Identity authority.
// - Authentication.
// - Permission storage.
// - Metadata storage.
// - MDC ledger execution.
// - Room execution.
// - Rendering.
// - NET.
// - UI.
// - Business logic.
//
// Rule:
// XR may submit event requests.
// CORE controls whether events may cross the boundary.

export type XRCoreEventDecisionReason =
  | "allowed-event-evaluation"
  | "allowed-event-context"
  | "blocked-unknown-event-request"
  | "blocked-protected-event"
  | "blocked-invalid-request";

export type XRCoreEventRequestType =
  | "event-check"
  | "event-context"
  | "event-reference";

export interface XRCoreEventRequest {
  request_id: string;

  request_type: XRCoreEventRequestType;

  source: string;

  event_type: string;
}

export interface XRCoreEventDecision {
  ok: boolean;

  reason: XRCoreEventDecisionReason;

  request_id: string;

  source: string;

  event_type: string;

  statement: string;
}

export interface XRCoreEventConfig {
  allowed_requests: string[];

  protected_events: string[];

  root_statement: string;
}

export class XRCoreEventBoundary {
  private readonly config: XRCoreEventConfig;

  private readonly allowedRequests: Set<string>;

  private readonly protectedEvents: Set<string>;

  constructor(
    config: XRCoreEventConfig = DEFAULT_XR_CORE_EVENT
  ) {
    this.config = normalizeConfig(config);

    this.allowedRequests = new Set(
      this.config.allowed_requests
    );

    this.protectedEvents = new Set(
      this.config.protected_events
    );
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): XRCoreEventConfig {
    return {
      allowed_requests: [
        ...this.config.allowed_requests
      ],
      protected_events: [
        ...this.config.protected_events
      ],
      root_statement:
        this.config.root_statement
    };
  }

  evaluate(
    request: XRCoreEventRequest
  ): XRCoreEventDecision {
    const requestId = cleanId(
      request?.request_id
    );

    const requestType = cleanId(
      request?.request_type
    );

    const source = cleanId(
      request?.source
    );

    const eventType = cleanId(
      request?.event_type
    );

    if (
      !requestId ||
      !requestType ||
      !source ||
      !eventType
    ) {
      return this.deny(
        requestId,
        source,
        eventType,
        "blocked-invalid-request"
      );
    }

    if (
      this.protectedEvents.has(eventType)
    ) {
      return this.deny(
        requestId,
        source,
        eventType,
        "blocked-protected-event"
      );
    }

    if (
      this.allowedRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        source,
        eventType,
        "allowed-event-evaluation"
      );
    }

    return this.deny(
      requestId,
      source,
      eventType,
      "blocked-unknown-event-request"
    );
  }

  private allow(
    requestId: string,
    source: string,
    eventType: string,
    reason: XRCoreEventDecisionReason
  ): XRCoreEventDecision {
    return {
      ok: true,
      reason,
      request_id: requestId,
      source,
      event_type: eventType,
      statement: this.config.root_statement
    };
  }

  private deny(
    requestId: string,
    source: string,
    eventType: string,
    reason: XRCoreEventDecisionReason
  ): XRCoreEventDecision {
    return {
      ok: false,
      reason,
      request_id: requestId,
      source,
      event_type: eventType,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_XR_CORE_EVENT: XRCoreEventConfig = {
  allowed_requests: [
    "event-check",
    "event-context",
    "event-reference"
  ],

  protected_events: [
    "authority-change",
    "identity-change",
    "permission-change",
    "ledger-update"
  ],

  root_statement:
    "XR may submit event requests, but CORE controls the protected event boundary."
};

export function createXRCoreEventBoundary(
  config: XRCoreEventConfig = DEFAULT_XR_CORE_EVENT
): XRCoreEventBoundary {
  return new XRCoreEventBoundary(config);
}

function normalizeConfig(
  config: XRCoreEventConfig
): XRCoreEventConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "XR_CORE_EVENT_CONFIG_REQUIRED"
    );
  }

  const root =
    typeof config.root_statement === "string"
      ? config.root_statement.trim()
      : "";

  if (!root) {
    throw new Error(
      "XR_CORE_EVENT_STATEMENT_REQUIRED"
    );
  }

  return {
    allowed_requests: cleanList(
      config.allowed_requests
    ),

    protected_events: cleanList(
      config.protected_events
    ),

    root_statement: root
  };
}

function cleanList(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(cleanId)
        .filter(Boolean)
    )
  );
}

function cleanId(
  value: unknown
): string {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return "";
  }

  const clean =
    String(value).trim();

  if (
    !clean ||
    clean.length > 180
  ) {
    return "";
  }

  if (
    !/^[a-zA-Z0-9._:@/+=$-]+$/.test(clean)
  ) {
    return "";
  }

  return clean;
}
