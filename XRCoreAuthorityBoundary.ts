// src/xr/XRCoreAuthorityBoundary.ts
// CyberCrowd XR Core Authority Boundary
//
// Core lane organ.
//
// Purpose:
// - Define the authority boundary between XR runtime requests and cybercrowd-core.
// - Provide controlled authority request and decision vocabulary.
// - Allow XR systems to ask CORE for authority evaluation.
// - Keep XR runtime separate from CORE authority.
//
// Owns:
// - XR authority request shape.
// - XR authority decision shape.
// - Authority boundary semantics.
//
// Does NOT own:
// - XR rendering.
// - Room execution.
// - NET routes.
// - UI.
// - Authentication.
// - Identity storage.
// - Permission storage.
// - Metadata storage.
// - Ledger execution.
// - Business decisions.
//
// Rule:
// XR can request authority.
// CORE decides authority.

export type XRCoreAuthorityDecisionReason =
  | "allowed-xr-request"
  | "allowed-xr-session"
  | "allowed-xr-operation"
  | "blocked-unknown-xr-request"
  | "blocked-xr-public-exposure"
  | "blocked-xr-private-operation"
  | "blocked-invalid-request";

export type XRCoreAuthorityMode =
  | "public"
  | "private"
  | "corporate";

export type XRCoreAuthorityRequestType =
  | "room-entry"
  | "metadata-request"
  | "session-request"
  | "runtime-operation"
  | "integration-request";

export interface XRCoreAuthorityRequest {
  request_id: string;
  request_type: XRCoreAuthorityRequestType;
  mode: XRCoreAuthorityMode;

  source: string;
  target: string;

  statement?: string;
}

export interface XRCoreAuthorityDecision {
  ok: boolean;

  reason: XRCoreAuthorityDecisionReason;

  request_id: string;

  mode: XRCoreAuthorityMode;

  source: string;

  target: string;

  statement: string;
}

export interface XRCoreAuthorityConfig {
  allowed_public_requests: string[];
  allowed_private_requests: string[];
  protected_operations: string[];

  root_statement: string;
}

export class XRCoreAuthorityBoundary {
  private readonly config: XRCoreAuthorityConfig;

  private readonly allowedPublicRequests: Set<string>;
  private readonly allowedPrivateRequests: Set<string>;
  private readonly protectedOperations: Set<string>;

  constructor(
    config: XRCoreAuthorityConfig = DEFAULT_XR_CORE_AUTHORITY
  ) {
    this.config = normalizeConfig(config);

    this.allowedPublicRequests = new Set(
      this.config.allowed_public_requests
    );

    this.allowedPrivateRequests = new Set(
      this.config.allowed_private_requests
    );

    this.protectedOperations = new Set(
      this.config.protected_operations
    );
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): XRCoreAuthorityConfig {
    return cloneConfig(this.config);
  }

  evaluate(
    request: XRCoreAuthorityRequest
  ): XRCoreAuthorityDecision {
    const requestId = cleanId(request?.request_id);

    const requestType = cleanId(
      request?.request_type
    );

    const mode = cleanMode(request?.mode);

    const source = cleanId(request?.source);

    const target = cleanId(request?.target);

    if (
      !requestId ||
      !requestType ||
      !mode ||
      !source ||
      !target
    ) {
      return this.deny(
        requestId,
        mode ?? "public",
        source,
        target,
        "blocked-invalid-request"
      );
    }

    if (
      mode === "public" &&
      this.protectedOperations.has(target)
    ) {
      return this.deny(
        requestId,
        mode,
        source,
        target,
        "blocked-xr-public-exposure"
      );
    }

    if (
      mode === "public" &&
      this.allowedPublicRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        mode,
        source,
        target,
        "allowed-xr-request"
      );
    }

    if (
      (mode === "private" ||
        mode === "corporate") &&
      this.allowedPrivateRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        mode,
        source,
        target,
        "allowed-xr-operation"
      );
    }

    return this.deny(
      requestId,
      mode,
      source,
      target,
      "blocked-unknown-xr-request"
    );
  }

  private allow(
    requestId: string,
    mode: XRCoreAuthorityMode,
    source: string,
    target: string,
    reason: XRCoreAuthorityDecisionReason
  ): XRCoreAuthorityDecision {
    return {
      ok: true,
      reason,
      request_id: requestId,
      mode,
      source,
      target,
      statement: this.config.root_statement
    };
  }

  private deny(
    requestId: string,
    mode: XRCoreAuthorityMode,
    source: string,
    target: string,
    reason: XRCoreAuthorityDecisionReason
  ): XRCoreAuthorityDecision {
    return {
      ok: false,
      reason,
      request_id: requestId,
      mode,
      source,
      target,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_XR_CORE_AUTHORITY: XRCoreAuthorityConfig = {
  allowed_public_requests: [
    "room-entry",
    "session-request"
  ],

  allowed_private_requests: [
    "metadata-request",
    "session-request",
    "runtime-operation",
    "integration-request"
  ],

  protected_operations: [
    "admin",
    "dispatcher",
    "lifecycle",
    "guardRules",
    "sovereignContinuity"
  ],

  root_statement:
    "XR may request access to CyberCrowd systems, but CORE remains the authority boundary for protected operations."
};

export function createXRCoreAuthorityBoundary(
  config: XRCoreAuthorityConfig = DEFAULT_XR_CORE_AUTHORITY
): XRCoreAuthorityBoundary {
  return new XRCoreAuthorityBoundary(config);
}

function normalizeConfig(
  config: XRCoreAuthorityConfig
): XRCoreAuthorityConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "XR_CORE_AUTHORITY_CONFIG_REQUIRED"
    );
  }

  const normalized: XRCoreAuthorityConfig = {
    allowed_public_requests: cleanList(
      config.allowed_public_requests
    ),

    allowed_private_requests: cleanList(
      config.allowed_private_requests
    ),

    protected_operations: cleanList(
      config.protected_operations
    ),

    root_statement:
      typeof config.root_statement === "string"
        ? config.root_statement.trim()
        : ""
  };

  if (!normalized.root_statement) {
    throw new Error(
      "XR_CORE_AUTHORITY_STATEMENT_REQUIRED"
    );
  }

  return normalized;
}

function cloneConfig(
  config: XRCoreAuthorityConfig
): XRCoreAuthorityConfig {
  return {
    allowed_public_requests: [
      ...config.allowed_public_requests
    ],

    allowed_private_requests: [
      ...config.allowed_private_requests
    ],

    protected_operations: [
      ...config.protected_operations
    ],

    root_statement:
      config.root_statement
  };
}

function cleanMode(
  value: unknown
): XRCoreAuthorityMode | null {
  if (
    value === "public" ||
    value === "private" ||
    value === "corporate"
  ) {
    return value;
  }

  return null;
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
