// src/xr/XRCoreRouteBoundary.ts
// CyberCrowd XR Core Route Boundary
//
// Core lane organ.
//
// Purpose:
// - Define route boundary between XR runtime requests and cybercrowd-core.
// - Provide XR route request/decision vocabulary.
// - Control route boundary semantics only.
//
// Owns:
// - XR route boundary semantics.
// - Route request shape.
// - Route decision shape.
// - Controlled route evaluation.
//
// Does NOT own:
// - Route execution.
// - Worker routes.
// - NET routing.
// - UI navigation.
// - Authentication.
// - Identity authority.
// - Permission storage.
// - Metadata storage.
// - MDC ledger execution.
// - Room execution.
// - Rendering.
// - Business logic.
//
// Rule:
// XR may request route evaluation.
// CORE controls whether route movement crosses the boundary.

export type XRCoreRouteDecisionReason =
  | "allowed-route-evaluation"
  | "allowed-route-context"
  | "blocked-unknown-route-request"
  | "blocked-protected-route"
  | "blocked-invalid-request";

export type XRCoreRouteRequestType =
  | "route-check"
  | "route-context"
  | "route-reference";

export interface XRCoreRouteRequest {
  request_id: string;

  request_type: XRCoreRouteRequestType;

  source: string;

  destination: string;
}

export interface XRCoreRouteDecision {
  ok: boolean;

  reason: XRCoreRouteDecisionReason;

  request_id: string;

  source: string;

  destination: string;

  statement: string;
}

export interface XRCoreRouteConfig {
  allowed_requests: string[];

  protected_routes: string[];

  root_statement: string;
}

export class XRCoreRouteBoundary {
  private readonly config: XRCoreRouteConfig;

  private readonly allowedRequests: Set<string>;

  private readonly protectedRoutes: Set<string>;

  constructor(
    config: XRCoreRouteConfig = DEFAULT_XR_CORE_ROUTE
  ) {
    this.config = normalizeConfig(config);

    this.allowedRequests = new Set(
      this.config.allowed_requests
    );

    this.protectedRoutes = new Set(
      this.config.protected_routes
    );
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): XRCoreRouteConfig {
    return {
      allowed_requests: [
        ...this.config.allowed_requests
      ],
      protected_routes: [
        ...this.config.protected_routes
      ],
      root_statement:
        this.config.root_statement
    };
  }

  evaluate(
    request: XRCoreRouteRequest
  ): XRCoreRouteDecision {
    const requestId = cleanId(
      request?.request_id
    );

    const requestType = cleanId(
      request?.request_type
    );

    const source = cleanId(
      request?.source
    );

    const destination = cleanId(
      request?.destination
    );

    if (
      !requestId ||
      !requestType ||
      !source ||
      !destination
    ) {
      return this.deny(
        requestId,
        source,
        destination,
        "blocked-invalid-request"
      );
    }

    const route =
      `${source}->${destination}`;

    if (
      this.protectedRoutes.has(route)
    ) {
      return this.deny(
        requestId,
        source,
        destination,
        "blocked-protected-route"
      );
    }

    if (
      this.allowedRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        source,
        destination,
        "allowed-route-evaluation"
      );
    }

    return this.deny(
      requestId,
      source,
      destination,
      "blocked-unknown-route-request"
    );
  }

  private allow(
    requestId: string,
    source: string,
    destination: string,
    reason: XRCoreRouteDecisionReason
  ): XRCoreRouteDecision {
    return {
      ok: true,
      reason,
      request_id: requestId,
      source,
      destination,
      statement: this.config.root_statement
    };
  }

  private deny(
    requestId: string,
    source: string,
    destination: string,
    reason: XRCoreRouteDecisionReason
  ): XRCoreRouteDecision {
    return {
      ok: false,
      reason,
      request_id: requestId,
      source,
      destination,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_XR_CORE_ROUTE: XRCoreRouteConfig = {
  allowed_requests: [
    "route-check",
    "route-context",
    "route-reference"
  ],

  protected_routes: [
    "public->admin",
    "guest->core-control",
    "xr->sovereign"
  ],

  root_statement:
    "XR may request route evaluation, but CORE controls protected route boundaries."
};

export function createXRCoreRouteBoundary(
  config: XRCoreRouteConfig = DEFAULT_XR_CORE_ROUTE
): XRCoreRouteBoundary {
  return new XRCoreRouteBoundary(config);
}

function normalizeConfig(
  config: XRCoreRouteConfig
): XRCoreRouteConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "XR_CORE_ROUTE_CONFIG_REQUIRED"
    );
  }

  const root =
    typeof config.root_statement === "string"
      ? config.root_statement.trim()
      : "";

  if (!root) {
    throw new Error(
      "XR_CORE_ROUTE_STATEMENT_REQUIRED"
    );
  }

  return {
    allowed_requests: cleanList(
      config.allowed_requests
    ),

    protected_routes: cleanList(
      config.protected_routes
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
