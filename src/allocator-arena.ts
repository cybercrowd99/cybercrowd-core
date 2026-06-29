// src/allocator-arena.ts
// CyberCrowd Ephemeral Port Allocator — Integration Layer (Arena Organ)
//
// The Arena organ wires together:
// - allocator-router (port-keyed lease authority)
// - allocator-client (SDK)
// - service tenants (callers)
//
// Responsibilities:
// - Provide per-tenant allocator clients.
// - Enforce tenant ID hygiene.
// - Offer arena-level helpers for services.
// - No elevation.
// - No authority grant.
// - No auth/presence/collapse ownership.
// - Pure integration, no UI, no HTML.

import {
  AllocatorClient,
  createAllocatorClient,
  type ActiveSummaryResponse,
  type ReclaimResponse,
  type TenantLeasesResponse
} from "./allocator-client";

export interface ArenaAllocatorConfig {
  endpoint: string;
  default_headers?: Record<string, string>;
  fetch_impl?: FetchLike;
}

export interface FetchLike {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface ArenaTenantContext {
  tenant_id: string;
  allocator: AllocatorClient;
}

export interface ArenaLeaseHandle {
  port: number;
  lease_id: string;
  heartbeat: () => Promise<void>;
  release: () => Promise<void>;
}

export class AllocatorArena {
  private readonly endpoint: string;
  private readonly baseHeaders: Record<string, string>;
  private readonly fetchImpl: FetchLike;

  constructor(config: ArenaAllocatorConfig) {
    if (!config || typeof config.endpoint !== "string") {
      throw new Error("ARENA_ALLOCATOR_ENDPOINT_REQUIRED");
    }

    const endpoint = config.endpoint.trim();

    if (!endpoint) {
      throw new Error("ARENA_ALLOCATOR_ENDPOINT_REQUIRED");
    }

    this.endpoint = endpoint;
    this.baseHeaders = {
      ...(config.default_headers ?? {})
    };
    this.fetchImpl = config.fetch_impl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Create a tenant-scoped allocator client.
   * No elevation. Tenant ID is required and sanitized.
   */
  createTenantContext(tenant_id: string): ArenaTenantContext {
    const cleanTenant = cleanTenantId(tenant_id);

    if (!cleanTenant) {
      throw new Error("ARENA_TENANT_ID_INVALID");
    }

    const allocator = createAllocatorClient({
      endpoint: this.endpoint,
      fetch_impl: this.fetchImpl,
      headers: {
        ...this.baseHeaders,
        "x-allocator-tenant": cleanTenant
      }
    });

    return {
      tenant_id: cleanTenant,
      allocator
    };
  }

  /**
   * Allocate a lease for a tenant and return a handle
   * with heartbeat and release helpers.
   */
  async allocateLease(tenant_id: string): Promise<ArenaLeaseHandle | null> {
    const ctx = this.createTenantContext(tenant_id);
    const result = await ctx.allocator.allocate(ctx.tenant_id);

    if (!result.ok || result.port === null || !result.lease_id) {
      return null;
    }

    const port = result.port;
    const lease_id = result.lease_id;

    return {
      port,
      lease_id,

      heartbeat: async () => {
        const heartbeat = await ctx.allocator.heartbeat(
          ctx.tenant_id,
          lease_id,
          port
        );

        if (!heartbeat.ok) {
          throw new Error(
            `ARENA_LEASE_HEARTBEAT_FAILED:${heartbeat.reason ?? heartbeat.error ?? "unknown"}`
          );
        }
      },

      release: async () => {
        const release = await ctx.allocator.release(
          ctx.tenant_id,
          lease_id,
          port
        );

        if (!release.ok) {
          throw new Error(
            `ARENA_LEASE_RELEASE_FAILED:${release.reason ?? release.error ?? "unknown"}`
          );
        }
      }
    };
  }

  /**
   * Run a function within a leased port for a tenant.
   * Automatically attempts release at the end.
   */
  async withTenantLease<T>(
    tenant_id: string,
    fn: (lease: ArenaLeaseHandle) => Promise<T>
  ): Promise<T> {
    const lease = await this.allocateLease(tenant_id);

    if (!lease) {
      throw new Error("ARENA_LEASE_ALLOCATION_FAILED");
    }

    try {
      return await fn(lease);
    } finally {
      await lease.release();
    }
  }

  /**
   * Get allocator active summary from the arena.
   */
  async getActiveSummary(): Promise<ActiveSummaryResponse> {
    const allocator = createAllocatorClient({
      endpoint: this.endpoint,
      fetch_impl: this.fetchImpl,
      headers: this.baseHeaders
    });

    return allocator.active();
  }

  /**
   * Get all leases for a specific tenant.
   */
  async getTenantLeases(tenant_id: string): Promise<TenantLeasesResponse> {
    const ctx = this.createTenantContext(tenant_id);
    return ctx.allocator.tenant(ctx.tenant_id);
  }

  /**
   * Trigger reclaim across the arena.
   */
  async reclaimAll(): Promise<ReclaimResponse> {
    const allocator = createAllocatorClient({
      endpoint: this.endpoint,
      fetch_impl: this.fetchImpl,
      headers: this.baseHeaders
    });

    return allocator.reclaim();
  }
}

// --- Helpers ---------------------------------------------------------------

function cleanTenantId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const clean = String(value).trim();

  if (!clean) return "";
  if (clean.length > 180) return "";
  if (!/^[a-zA-Z0-9._:@/-]+$/.test(clean)) return "";

  return clean;
}
