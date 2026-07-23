// src/xr/XRCoreMDCBoundary.ts
// CyberCrowd XR Core MDC Boundary
//
// Core lane organ.
//
// Purpose:
// - Define metadata boundary between XR runtime requests and cybercrowd-core MDC systems.
// - Provide XR metadata request/decision vocabulary.
// - Allow XR systems to request MDC evaluation without owning metadata authority.
//
// Owns:
// - XR MDC boundary semantics.
// - MDC request shape.
// - MDC decision shape.
//
// Does NOT own:
// - Metadata storage.
// - MDC ledger execution.
// - Identity authority.
// - Permission storage.
// - Authentication.
// - Routing.
// - Room execution.
// - Rendering.
// - NET.
// - UI.
// - Business logic.
//
// Rule:
// XR may request MDC evaluation.
// CORE controls whether metadata may cross into MDC.

export type XRCoreMDCDecisionReason =
  | "allowed-mdc-reference"
  | "allowed-mdc-context"
  | "blocked-unknown-mdc-request"
  | "blocked-protected-metadata-operation"
  | "blocked-invalid-request";

export type XRCoreMDCRequestType =
  | "metadata-reference"
  | "metadata-context"
  | "record-evaluation";

export interface XRCoreMDCRequest {
  request_id: string;

  request_type: XRCoreMDCRequestType;

  source: string;

  record_type: string;
}

export interface XRCoreMDCDecision {
  ok: boolean;

  reason: XRCoreMDCDecisionReason;

  request_id: string;

  source: string;

  record_type: string;

  statement: string;
}

export interface XRCoreMDCConfig {
  allowed_requests: string[];

  protected_record_types: string[];

  root_statement: string;
}

export class XRCoreMDCBoundary {
  private readonly config: XRCoreMDCConfig;

  private readonly allowedRequests: Set<string>;

  private readonly protectedRecordTypes: Set<string>;

  constructor(
    config: XRCoreMDCConfig = DEFAULT_XR_CORE_MDC
  ) {
    this.config = normalizeConfig(config);

    this.allowedRequests = new Set(
      this.config.allowed_requests
    );

    this.protectedRecordTypes = new Set(
      this.config.protected_record_types
    );
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): XRCoreMDCConfig {
    return {
      allowed_requests: [
        ...this.config.allowed_requests
      ],
      protected_record_types: [
        ...this.config.protected_record_types
      ],
      root_statement:
        this.config.root_statement
    };
  }

  evaluate(
    request: XRCoreMDCRequest
  ): XRCoreMDCDecision {
    const requestId = cleanId(
      request?.request_id
    );

    const requestType = cleanId(
      request?.request_type
    );

    const source = cleanId(
      request?.source
    );

    const recordType = cleanId(
      request?.record_type
    );

    if (
      !requestId ||
      !requestType ||
      !source ||
      !recordType
    ) {
      return this.deny(
        requestId,
        source,
        recordType,
        "blocked-invalid-request"
      );
    }

    if (
      this.protectedRecordTypes.has(recordType)
    ) {
      return this.deny(
        requestId,
        source,
        recordType,
        "blocked-protected-metadata-operation"
      );
    }

    if (
      this.allowedRequests.has(requestType)
    ) {
      return this.allow(
        requestId,
        source,
        recordType,
        "allowed-mdc-reference"
      );
    }

    return this.deny(
      requestId,
      source,
      recordType,
      "blocked-unknown-mdc-request"
    );
  }

  private allow(
    requestId: string,
    source: string,
    recordType: string,
    reason: XRCoreMDCDecisionReason
  ): XRCoreMDCDecision {
    return {
      ok: true,
      reason,
      request_id: requestId,
      source,
      record_type: recordType,
      statement: this.config.root_statement
    };
  }

  private deny(
    requestId: string,
    source: string,
    recordType: string,
    reason: XRCoreMDCDecisionReason
  ): XRCoreMDCDecision {
    return {
      ok: false,
      reason,
      request_id: requestId,
      source,
      record_type: recordType,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_XR_CORE_MDC: XRCoreMDCConfig = {
  allowed_requests: [
    "metadata-reference",
    "metadata-context",
    "record-evaluation"
  ],

  protected_record_types: [
    "identity",
    "permission",
    "ledger",
    "authority"
  ],

  root_statement:
    "XR may request MDC evaluation, but CORE controls the metadata boundary and protected records."
};

export function createXRCoreMDCBoundary(
  config: XRCoreMDCConfig = DEFAULT_XR_CORE_MDC
): XRCoreMDCBoundary {
  return new XRCoreMDCBoundary(config);
}

function normalizeConfig(
  config: XRCoreMDCConfig
): XRCoreMDCConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "XR_CORE_MDC_CONFIG_REQUIRED"
    );
  }

  const root =
    typeof config.root_statement === "string"
      ? config.root_statement.trim()
      : "";

  if (!root) {
    throw new Error(
      "XR_CORE_MDC_STATEMENT_REQUIRED"
    );
  }

  return {
    allowed_requests: cleanList(
      config.allowed_requests
    ),

    protected_record_types: cleanList(
      config.protected_record_types
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
