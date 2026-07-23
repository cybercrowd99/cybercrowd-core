// src/xr/XRCoreIdentityBoundary.ts
// CyberCrowd XR Core Identity Boundary
//
// Core lane organ.
//
// Purpose:
// - Define the identity boundary between XR runtime requests and cybercrowd-core.
// - Provide XR identity request/response vocabulary.
// - Allow XR systems to reference identity decisions without owning identity.
//
// Owns:
// - XR identity boundary semantics.
// - Identity request shape.
// - Identity decision shape.
//
// Does NOT own:
// - Identity storage.
// - Identity authority.
// - Authentication.
// - Permissions.
// - Metadata storage.
// - Ledger execution.
// - Room execution.
// - Rendering.
// - NET.
// - UI.
//
// Rule:
// XR may request identity context.
// CORE identity systems decide identity state.

export type XRCoreIdentityDecisionReason =
  | "allowed-identity-reference"
  | "allowed-identity-context"
  | "blocked-unknown-identity-request"
  | "blocked-invalid-request";

export type XRCoreIdentityRequestType =
  | "identity-reference"
  | "identity-context"
  | "session-identity";

export interface XRCoreIdentityRequest {
  request_id: string;

  request_type: XRCoreIdentityRequestType;

  source: string;

  subject: string;
}

export interface XRCoreIdentityDecision {
  ok: boolean;

  reason: XRCoreIdentityDecisionReason;

  request_id: string;

  source: string;

  subject: string;

  statement: string;
}

export interface XRCoreIdentityConfig {
  allowed_requests: string[];

  root_statement: string;
}

export class XRCoreIdentityBoundary {
  private readonly config: XRCoreIdentityConfig;

  private readonly allowedRequests: Set<string>;

  constructor(
    config: XRCoreIdentityConfig = DEFAULT_XR_CORE_IDENTITY
  ) {
    this.config = normalizeConfig(config);

    this.allowedRequests = new Set(
      this.config.allowed_requests
    );
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): XRCoreIdentityConfig {
    return {
      allowed_requests: [
        ...this.config.allowed_requests
      ],
      root_statement:
        this.config.root_statement
    };
  }

  evaluate(
    request: XRCoreIdentityRequest
  ): XRCoreIdentityDecision {
    const requestId = cleanId(
      request?.request_id
    );

    const requestType = cleanId(
      request?.request_type
    );

    const source = cleanId(
      request?.source
    );

    const subject = cleanId(
      request?.subject
    );

    if (
      !requestId ||
      !requestType ||
      !source ||
      !subject
    ) {
      return this.deny(
        requestId,
        source,
        subject,
        "blocked-invalid-request"
      );
    }

    if (
      this.allowedRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        source,
        subject,
        "allowed-identity-reference"
      );
    }

    return this.deny(
      requestId,
      source,
      subject,
      "blocked-unknown-identity-request"
    );
  }

  private allow(
    requestId: string,
    source: string,
    subject: string,
    reason: XRCoreIdentityDecisionReason
  ): XRCoreIdentityDecision {
    return {
      ok: true,
      reason,
      request_id: requestId,
      source,
      subject,
      statement: this.config.root_statement
    };
  }

  private deny(
    requestId: string,
    source: string,
    subject: string,
    reason: XRCoreIdentityDecisionReason
  ): XRCoreIdentityDecision {
    return {
      ok: false,
      reason,
      request_id: requestId,
      source,
      subject,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_XR_CORE_IDENTITY: XRCoreIdentityConfig = {
  allowed_requests: [
    "identity-reference",
    "identity-context",
    "session-identity"
  ],

  root_statement:
    "XR may reference identity context, but CORE remains the authority boundary for identity systems."
};

export function createXRCoreIdentityBoundary(
  config: XRCoreIdentityConfig = DEFAULT_XR_CORE_IDENTITY
): XRCoreIdentityBoundary {
  return new XRCoreIdentityBoundary(config);
}

function normalizeConfig(
  config: XRCoreIdentityConfig
): XRCoreIdentityConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "XR_CORE_IDENTITY_CONFIG_REQUIRED"
    );
  }

  const root =
    typeof config.root_statement === "string"
      ? config.root_statement.trim()
      : "";

  if (!root) {
    throw new Error(
      "XR_CORE_IDENTITY_STATEMENT_REQUIRED"
    );
  }

  return {
    allowed_requests: cleanList(
      config.allowed_requests
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
