// src/xr/XRCoreSessionBoundary.ts
// CyberCrowd XR Core Session Boundary
//
// Core lane organ.
//
// Purpose:
// - Define session boundary between XR runtime requests and cybercrowd-core.
// - Provide XR session request/decision vocabulary.
// - Control session boundary semantics without owning runtime execution.
//
// Owns:
// - XR session boundary semantics.
// - Session request shape.
// - Session decision shape.
// - Session boundary evaluation.
//
// Does NOT own:
// - Session storage.
// - Authentication.
// - Identity authority.
// - Permission storage.
// - Metadata storage.
// - MDC ledger execution.
// - Routing.
// - Room execution.
// - Rendering.
// - NET.
// - UI.
// - Business logic.
//
// Rule:
// XR may request session evaluation.
// CORE controls the session boundary.

export type XRCoreSessionDecisionReason =
  | "allowed-session-request"
  | "allowed-session-context"
  | "blocked-unknown-session-request"
  | "blocked-protected-session"
  | "blocked-invalid-request";

export type XRCoreSessionRequestType =
  | "session-open"
  | "session-context"
  | "session-close";

export interface XRCoreSessionRequest {
  request_id: string;

  request_type: XRCoreSessionRequestType;

  source: string;

  session_id: string;
}

export interface XRCoreSessionDecision {
  ok: boolean;

  reason: XRCoreSessionDecisionReason;

  request_id: string;

  source: string;

  session_id: string;

  statement: string;
}

export interface XRCoreSessionConfig {
  allowed_requests: string[];

  protected_sessions: string[];

  root_statement: string;
}

export class XRCoreSessionBoundary {
  private readonly config: XRCoreSessionConfig;

  private readonly allowedRequests: Set<string>;

  private readonly protectedSessions: Set<string>;

  constructor(
    config: XRCoreSessionConfig = DEFAULT_XR_CORE_SESSION
  ) {
    this.config = normalizeConfig(config);

    this.allowedRequests = new Set(
      this.config.allowed_requests
    );

    this.protectedSessions = new Set(
      this.config.protected_sessions
    );
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): XRCoreSessionConfig {
    return {
      allowed_requests: [
        ...this.config.allowed_requests
      ],
      protected_sessions: [
        ...this.config.protected_sessions
      ],
      root_statement:
        this.config.root_statement
    };
  }

  evaluate(
    request: XRCoreSessionRequest
  ): XRCoreSessionDecision {
    const requestId = cleanId(
      request?.request_id
    );

    const requestType = cleanId(
      request?.request_type
    );

    const source = cleanId(
      request?.source
    );

    const sessionId = cleanId(
      request?.session_id
    );

    if (
      !requestId ||
      !requestType ||
      !source ||
      !sessionId
    ) {
      return this.deny(
        requestId,
        source,
        sessionId,
        "blocked-invalid-request"
      );
    }

    if (
      this.protectedSessions.has(sessionId)
    ) {
      return this.deny(
        requestId,
        source,
        sessionId,
        "blocked-protected-session"
      );
    }

    if (
      this.allowedRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        source,
        sessionId,
        "allowed-session-request"
      );
    }

    return this.deny(
      requestId,
      source,
      sessionId,
      "blocked-unknown-session-request"
    );
  }

  private allow(
    requestId: string,
    source: string,
    sessionId: string,
    reason: XRCoreSessionDecisionReason
  ): XRCoreSessionDecision {
    return {
      ok: true,
      reason,
      request_id: requestId,
      source,
      session_id: sessionId,
      statement: this.config.root_statement
    };
  }

  private deny(
    requestId: string,
    source: string,
    sessionId: string,
    reason: XRCoreSessionDecisionReason
  ): XRCoreSessionDecision {
    return {
      ok: false,
      reason,
      request_id: requestId,
      source,
      session_id: sessionId,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_XR_CORE_SESSION: XRCoreSessionConfig = {
  allowed_requests: [
    "session-open",
    "session-context",
    "session-close"
  ],

  protected_sessions: [
    "admin",
    "sovereign",
    "root"
  ],

  root_statement:
    "XR may request session evaluation, but CORE controls the protected session boundary."
};

export function createXRCoreSessionBoundary(
  config: XRCoreSessionConfig = DEFAULT_XR_CORE_SESSION
): XRCoreSessionBoundary {
  return new XRCoreSessionBoundary(config);
}

function normalizeConfig(
  config: XRCoreSessionConfig
): XRCoreSessionConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "XR_CORE_SESSION_CONFIG_REQUIRED"
    );
  }

  const root =
    typeof config.root_statement === "string"
      ? config.root_statement.trim()
      : "";

  if (!root) {
    throw new Error(
      "XR_CORE_SESSION_STATEMENT_REQUIRED"
    );
  }

  return {
    allowed_requests: cleanList(
      config.allowed_requests
    ),

    protected_sessions: cleanList(
      config.protected_sessions
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
