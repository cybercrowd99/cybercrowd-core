// src/allocator-client.ts
// CyberCrowd Ephemeral Port Allocator — Client SDK
//
// Client-side / service-side SDK for calling the allocator router.
//
// Talks to:
// - src/allocator-router.ts
//
// Actions:
// - allocate
// - heartbeat
// - release
// - reclaim
// - active
// - tenant
//
// No elevation.
// No authority grant.
// No auth ownership.
// No presence ownership.
// No collapse ownership.
// No UI.
// No HTML.
// Pure request/response client.

export interface AllocatorClientOptions {
  endpoint: string;
  fetch_impl?: FetchLike;
  headers?: Record<string, string>;
}

export interface FetchLike {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface AllocatorClientRequestBase {
  tenant_id?: string;
  tenantId?: string;
  lease_id?: string;
  leaseId?: string;
  port?: number;
}

export interface AllocateRequest {
  tenant_id: string;
}

export interface HeartbeatRequest {
  tenant_id: string;
  lease_id: string;
  port: number;
}

export interface ReleaseRequest {
  tenant_id: string;
  lease_id: string;
  port: number;
}

export interface TenantRequest {
  tenant_id: string;
}

export interface AllocationResponse {
  ok: boolean;
  action: "allocate";
  port: number | null;
  lease_id: string | null;
  created_at_ms?: number;
  last_heartbeat_ms?: number;
  expires_at_ms?: number;
  reclaimable_at_ms?: number;
  reason: string | null;
  error?: string;
}

export interface HeartbeatResponse {
  ok: boolean;
  action: "heartbeat";
  port: number;
  lease_id: string;
  last_heartbeat_ms?: number | null;
  expires_at_ms?: number | null;
  reclaimable_at_ms?: number | null;
  reason: string | null;
  error?: string;
}

export interface ReleaseResponse {
  ok: boolean;
  action: "release";
  port: number;
  lease_id: string;
  reason: string | null;
  error?: string;
}

export interface ReclaimResponse {
  ok: boolean;
  action: "reclaim";
  scanned: number;
  reclaimed: number;
  error?: string;
}

export interface ActiveSummaryResponse {
  ok: boolean;
  action: "active";
  total_capacity: number;
  active_count: number;
  expired_count: number;
  by_tenant: Array<{
    tenant_id: string;
    active_count: number;
  }>;
  error?: string;
}

export interface TenantLeasesResponse {
  ok: boolean;
  action: "tenant";
  tenant_id: string;
  leases: AllocatorClientLeaseRecord[];
  error?: string;
}

export interface AllocatorClientLeaseRecord {
  port: number;
  tenant_id: string;
  lease_id: string;
  created_at_ms: number;
  last_heartbeat_ms: number;
  status: "active" | "reclaiming" | "expired";
}

export interface AllocatorErrorResponse {
  ok: false;
  error: string;
  reason?: string | null;
  action?: string;
}

export type AllocatorClientResponse =
  | AllocationResponse
  | HeartbeatResponse
  | ReleaseResponse
  | ReclaimResponse
  | ActiveSummaryResponse
  | TenantLeasesResponse
  | AllocatorErrorResponse;

export class AllocatorClient {
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseHeaders: Record<string, string>;

  constructor(options: AllocatorClientOptions) {
    if (!options || typeof options.endpoint !== "string") {
      throw new Error("ALLOCATOR_CLIENT_ENDPOINT_REQUIRED");
    }

    const endpoint = options.endpoint.trim();

    if (!endpoint) {
      throw new Error("ALLOCATOR_CLIENT_ENDPOINT_REQUIRED");
    }

    this.endpoint = endpoint;
    this.fetchImpl = options.fetch_impl ?? globalThis.fetch.bind(globalThis);
    this.baseHeaders = {
      ...(options.headers ?? {})
    };
  }

  async allocate(tenant_id: string): Promise<AllocationResponse> {
    const tenant = cleanId(tenant_id);

    if (!tenant) {
      return {
        ok: false,
        action: "allocate",
        port: null,
        lease_id: null,
        reason: "invalid-tenant",
        error: "TENANT_REQUIRED"
      };
    }

    return this.post<AllocationResponse>({
      action: "allocate",
      tenant_id: tenant
    });
  }

  async heartbeat(
    tenant_id: string,
    lease_id: string,
    port: number
  ): Promise<HeartbeatResponse> {
    const tenant = cleanId(tenant_id);
    const lease = cleanId(lease_id);

    if (!tenant || !lease || !isPositiveInteger(port)) {
      return {
        ok: false,
        action: "heartbeat",
        port,
        lease_id: lease_id || "",
        reason: "invalid-request",
        error: "HEARTBEAT_FIELDS_REQUIRED"
      };
    }

    return this.post<HeartbeatResponse>({
      action: "heartbeat",
      tenant_id: tenant,
      lease_id: lease,
      port
    });
  }

  async release(
    tenant_id: string,
    lease_id: string,
    port: number
  ): Promise<ReleaseResponse> {
    const tenant = cleanId(tenant_id);
    const lease = cleanId(lease_id);

    if (!tenant || !lease || !isPositiveInteger(port)) {
      return {
        ok: false,
        action: "release",
        port,
        lease_id: lease_id || "",
        reason: "invalid-request",
        error: "RELEASE_FIELDS_REQUIRED"
      };
    }

    return this.post<ReleaseResponse>({
      action: "release",
      tenant_id: tenant,
      lease_id: lease,
      port
    });
  }

  async reclaim(): Promise<ReclaimResponse> {
    return this.post<ReclaimResponse>({
      action: "reclaim"
    });
  }

  async active(): Promise<ActiveSummaryResponse> {
    return this.post<ActiveSummaryResponse>({
      action: "active"
    });
  }

  async tenant(tenant_id: string): Promise<TenantLeasesResponse> {
    const tenant = cleanId(tenant_id);

    if (!tenant) {
      return {
        ok: false,
        action: "tenant",
        tenant_id: "",
        leases: [],
        error: "TENANT_REQUIRED"
      };
    }

    return this.post<TenantLeasesResponse>({
      action: "tenant",
      tenant_id: tenant
    });
  }

  async withLease<T>(
    tenant_id: string,
    callback: (lease: {
      port: number;
      lease_id: string;
      heartbeat: () => Promise<HeartbeatResponse>;
      release: () => Promise<ReleaseResponse>;
    }) => Promise<T>
  ): Promise<T> {
    const allocated = await this.allocate(tenant_id);

    if (!allocated.ok || allocated.port === null || !allocated.lease_id) {
      throw new Error(
        `ALLOCATOR_LEASE_FAILED:${allocated.reason ?? allocated.error ?? "unknown"}`
      );
    }

    const lease = {
      port: allocated.port,
      lease_id: allocated.lease_id,
      heartbeat: () =>
        this.heartbeat(tenant_id, allocated.lease_id as string, allocated.port as number),
      release: () =>
        this.release(tenant_id, allocated.lease_id as string, allocated.port as number)
    };

    try {
      return await callback(lease);
    } finally {
      await lease.release();
    }
  }

  private async post<T extends AllocatorClientResponse>(
    body: Record<string, unknown>
  ): Promise<T> {
    let response: Response;

    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          ...this.baseHeaders
        },
        body: JSON.stringify(body)
      });
    } catch (error) {
      return {
        ok: false,
        error: "ALLOCATOR_NETWORK_ERROR",
        reason: error instanceof Error ? error.message : String(error)
      } as T;
    }

    let parsed: unknown;

    try {
      parsed = await response.json();
    } catch {
      return {
        ok: false,
        error: "ALLOCATOR_INVALID_RESPONSE",
        reason: "response-json-invalid"
      } as T;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        error: "ALLOCATOR_INVALID_RESPONSE",
        reason: "response-body-invalid"
      } as T;
    }

    const output = parsed as Record<string, unknown>;

    if (!response.ok && output.ok !== false) {
      return {
        ok: false,
        error: "ALLOCATOR_HTTP_ERROR",
        reason: String(response.status)
      } as T;
    }

    return output as T;
  }
}

export function createAllocatorClient(
  options: AllocatorClientOptions
): AllocatorClient {
  return new AllocatorClient(options);
}

function cleanId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const clean = String(value).trim();

  if (!clean) {
    return "";
  }

  if (clean.length > 180) {
    return "";
  }

  if (!/^[a-zA-Z0-9._:@/-]+$/.test(clean)) {
    return "";
  }

  return clean;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
