// src/xr/XRCoreRuntimeBoundary.ts
// CyberCrowd XR Core Runtime Boundary
//
// Core lane organ.
//
// Purpose:
// - Define top-level runtime boundary between XR runtime systems and cybercrowd-core.
// - Provide XR runtime request/decision vocabulary.
// - Coordinate runtime boundary semantics only.
//
// Owns:
// - XR runtime boundary semantics.
// - Runtime request shape.
// - Runtime decision shape.
// - Controlled runtime evaluation.
//
// Does NOT own:
// - Runtime execution.
// - Rendering.
// - Room lifecycle.
// - Identity storage.
// - Authentication.
// - Permission storage.
// - Metadata storage.
// - MDC ledger execution.
// - Event routing.
// - NET.
// - UI.
// - Business logic.
//
// Rule:
// XR runtime may request CORE evaluation.
// CORE remains the control boundary.

export type XRCoreRuntimeDecisionReason =
  | "allowed-runtime-evaluation"
  | "allowed-runtime-context"
  | "blocked-unknown-runtime-request"
  | "blocked-protected-runtime-operation"
  | "blocked-invalid-request";

export type XRCoreRuntimeRequestType =
  | "runtime-check"
  | "runtime-context"
  | "runtime-reference";

export interface XRCoreRuntimeRequest {
  request_id: string;

  request_type: XRCoreRuntimeRequestType;

  source: string;

  runtime_context: string;
}

export interface XRCoreRuntimeDecision {
  ok: boolean;

  reason: XRCoreRuntimeDecisionReason;

  request_id: string;

  source: string;

  runtime_context: string;

  statement: string;
}

export interface XRCoreRuntimeConfig {
  allowed_requests: string[];

  protected_contexts: string[];

  root_statement: string;
}

export class XRCoreRuntimeBoundary {
  private readonly config: XRCoreRuntimeConfig;

  private readonly allowedRequests: Set<string>;

  private readonly protectedContexts: Set<string>;

  constructor(
    config: XRCoreRuntimeConfig = DEFAULT_XR_CORE_RUNTIME
  ) {
    this.config = normalizeConfig(config);

    this.allowedRequests = new Set(
      this.config.allowed_requests
    );

    this.protectedContexts = new Set(
      this.config.protected_contexts
    );
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): XRCoreRuntimeConfig {
    return {
      allowed_requests: [
        ...this.config.allowed_requests
      ],
      protected_contexts: [
        ...this.config.protected_contexts
      ],
      root_statement:
        this.config.root_statement
    };
  }

  evaluate(
    request: XRCoreRuntimeRequest
  ): XRCoreRuntimeDecision {
    const requestId = cleanId(
      request?.request_id
    );

    const requestType = cleanId(
      request?.request_type
    );

    const source = cleanId(
      request?.source
    );

    const runtimeContext = cleanId(
      request?.runtime_context
    );

    if (
      !requestId ||
      !requestType ||
      !source ||
      !runtimeContext
    ) {
      return this.deny(
        requestId,
        source,
        runtimeContext,
        "blocked-invalid-request"
      );
    }

    if (
      this.protectedContexts.has(runtimeContext)
    ) {
      return this.deny(
        requestId,
        source,
        runtimeContext,
        "blocked-protected-runtime-operation"
      );
    }

    if (
      this.allowedRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        source,
        runtimeContext,
        "allowed-runtime-evaluation"
      );
    }

    return this.deny(
      requestId,
      source,
      runtimeContext,
      "blocked-unknown-runtime-request"
    );
  }

  private allow(
    requestId: string,
    source: string,
    runtimeContext: string,
    reason: XRCoreRuntimeDecisionReason
  ): XRCoreRuntimeDecision {
    return {
      ok: true,
      reason,
      request_id: requestId,
      source,
      runtime_context: runtimeContext,
      statement: this.config.root_statement
    };
  }

  private deny(
    requestId: string,
    source: string,
    runtimeContext: string,
    reason: XRCoreRuntimeDecisionReason
  ): XRCoreRuntimeDecision {
    return {
      ok: false,
      reason,
      request_id: requestId,
      source,
      runtime_context: runtimeContext,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_XR_CORE_RUNTIME: XRCoreRuntimeConfig = {
  allowed_requests: [
    "runtime-check",
    "runtime-context",
    "runtime-reference"
  ],

  protected_contexts: [
    "root",
    "sovereign",
    "admin",
    "core-control"
  ],

  root_statement:
    "XR runtime may request CORE evaluation, but CORE remains the control boundary for runtime protection."
};

export function createXRCoreRuntimeBoundary(
  config: XRCoreRuntimeConfig = DEFAULT_XR_CORE_RUNTIME
): XRCoreRuntimeBoundary {
  return new XRCoreRuntimeBoundary(config);
}

function normalizeConfig(
  config: XRCoreRuntimeConfig
): XRCoreRuntimeConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "XR_CORE_RUNTIME_CONFIG_REQUIRED"
    );
  }

  const root =
    typeof config.root_statement === "string"
      ? config.root_statement.trim()
      : "";

  if (!root) {
    throw new Error(
      "XR_CORE_RUNTIME_STATEMENT_REQUIRED"
    );
  }

  return {
    allowed_requests: cleanList(
      config.allowed_requests
    ),

    protected_contexts: cleanList(
      config.protected_contexts
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
