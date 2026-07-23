// src/xr/XRCorePermissionBoundary.ts
// CyberCrowd XR Core Permission Boundary
//
// Core lane organ.
//
// Purpose:
// - Define the permission boundary between XR runtime requests and cybercrowd-core.
// - Provide XR permission request/decision vocabulary.
// - Allow XR systems to request permission evaluation without owning permissions.
//
// Owns:
// - XR permission boundary semantics.
// - Permission request shape.
// - Permission decision shape.
//
// Does NOT own:
// - Permission storage.
// - Identity authority.
// - Authentication.
// - Authorization database.
// - Metadata storage.
// - Ledger execution.
// - Room execution.
// - Rendering.
// - NET.
// - UI.
// - Business logic.
//
// Rule:
// XR can request permission.
// CORE permission systems decide permission state.

export type XRCorePermissionDecisionReason =
  | "allowed-permission-request"
  | "allowed-permission-context"
  | "blocked-unknown-permission-request"
  | "blocked-protected-operation"
  | "blocked-invalid-request";

export type XRCorePermissionRequestType =
  | "permission-check"
  | "operation-context"
  | "session-permission";

export interface XRCorePermissionRequest {
  request_id: string;

  request_type: XRCorePermissionRequestType;

  source: string;

  operation: string;
}

export interface XRCorePermissionDecision {
  ok: boolean;

  reason: XRCorePermissionDecisionReason;

  request_id: string;

  source: string;

  operation: string;

  statement: string;
}

export interface XRCorePermissionConfig {
  allowed_requests: string[];

  protected_operations: string[];

  root_statement: string;
}

export class XRCorePermissionBoundary {
  private readonly config: XRCorePermissionConfig;

  private readonly allowedRequests: Set<string>;

  private readonly protectedOperations: Set<string>;

  constructor(
    config: XRCorePermissionConfig = DEFAULT_XR_CORE_PERMISSION
  ) {
    this.config = normalizeConfig(config);

    this.allowedRequests = new Set(
      this.config.allowed_requests
    );

    this.protectedOperations = new Set(
      this.config.protected_operations
    );
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): XRCorePermissionConfig {
    return {
      allowed_requests: [
        ...this.config.allowed_requests
      ],

      protected_operations: [
        ...this.config.protected_operations
      ],

      root_statement:
        this.config.root_statement
    };
  }

  evaluate(
    request: XRCorePermissionRequest
  ): XRCorePermissionDecision {
    const requestId = cleanId(
      request?.request_id
    );

    const requestType = cleanId(
      request?.request_type
    );

    const source = cleanId(
      request?.source
    );

    const operation = cleanId(
      request?.operation
    );

    if (
      !requestId ||
      !requestType ||
      !source ||
      !operation
    ) {
      return this.deny(
        requestId,
        source,
        operation,
        "blocked-invalid-request"
      );
    }

    if (
      this.protectedOperations.has(operation)
    ) {
      return this.deny(
        requestId,
        source,
        operation,
        "blocked-protected-operation"
      );
    }

    if (
      this.allowedRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        source,
        operation,
        "allowed-permission-request"
      );
    }

    return this.deny(
      requestId,
      source,
      operation,
      "blocked-unknown-permission-request"
    );
  }

  private allow(
    requestId: string,
    source: string,
    operation: string,
    reason: XRCorePermissionDecisionReason
  ): XRCorePermissionDecision {
    return {
      ok: true,
      reason,
      request_id: requestId,
      source,
      operation,
      statement: this.config.root_statement
    };
  }

  private deny(
    requestId: string,
    source: string,
    operation: string,
    reason: XRCorePermissionDecisionReason
  ): XRCorePermissionDecision {
    return {
      ok: false,
      reason,
      request_id: requestId,
      source,
      operation,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_XR_CORE_PERMISSION: XRCorePermissionConfig = {
  allowed_requests: [
    "permission-check",
    "operation-context",
    "session-permission"
  ],

  protected_operations: [
    "admin",
    "dispatcher",
    "lifecycle",
    "guardRules",
    "sovereignContinuity"
  ],

  root_statement:
    "XR may request permission evaluation, but CORE remains the authority boundary for protected operations."
};

export function createXRCorePermissionBoundary(
  config: XRCorePermissionConfig = DEFAULT_XR_CORE_PERMISSION
): XRCorePermissionBoundary {
  return new XRCorePermissionBoundary(config);
}

function normalizeConfig(
  config: XRCorePermissionConfig
): XRCorePermissionConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "XR_CORE_PERMISSION_CONFIG_REQUIRED"
    );
  }

  const root =
    typeof config.root_statement === "string"
      ? config.root_statement.trim()
      : "";

  if (!root) {
    throw new Error(
      "XR_CORE_PERMISSION_STATEMENT_REQUIRED"
    );
  }

  return {
    allowed_requests: cleanList(
      config.allowed_requests
    ),

    protected_operations: cleanList(
      config.protected_operations
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
