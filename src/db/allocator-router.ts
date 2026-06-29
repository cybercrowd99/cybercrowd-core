// src/allocator-router.ts
// CyberCrowd Ephemeral Port Allocator — Router Layer
//
// Exposes allocator actions:
// allocate, heartbeat, release, reclaim, active, tenant.
//
// No elevation.
// No authority grant.
// No auth ownership.
// No presence ownership.
// No collapse ownership.
// Pure mechanical routing over the port-keyed DB adapter.

import {
  KvAllocatorDbAdapter,
  type AllocatorDbAdapter,
  type PortLeaseRecord
} from "./allocator-db-adapter";

export interface AllocatorRouterEnv {
  ALLOCATOR_DB?: any;

  PORT_MIN?: string | number;
  PORT_MAX?: string | number;
  LEASE_TTL_MS?: string | number;
  HEARTBEAT_GRACE_MS?: string | number;
  MAX_RETRIES_PER_REQUEST?: string | number;
}

interface AllocatorRouterConfig {
  PORT_MIN: number;
  PORT_MAX: number;
  LEASE_TTL_MS: number;
  HEARTBEAT_GRACE_MS: number;
  MAX_RETRIES_PER_REQUEST: number;
}

interface AllocateBody {
  action?: unknown;
  tenant_id?: unknown;
  tenantId?: unknown;
}

interface LeaseBody {
  action?: unknown;
  tenant_id?: unknown;
  tenantId?: unknown;
  lease_id?: unknown;
  leaseId?: unknown;
  port?: unknown;
}

const DEFAULT_CONFIG: AllocatorRouterConfig = {
  PORT_MIN: 49152,
  PORT_MAX: 65535,
  LEASE_TTL_MS: 30000,
  HEARTBEAT_GRACE_MS: 10000,
  MAX_RETRIES_PER_REQUEST: 8
};

export default {
  async fetch(request: Request, env: AllocatorRouterEnv): Promise<Response> {
    if (request.method.toUpperCase() !== "POST") {
      return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }

    if (!env || !env.ALLOCATOR_DB) {
      return json({ ok: false, error: "ALLOCATOR_DB_MISSING" }, 500);
    }

    const cfg = loadConfig(env);
    const configError = validateConfig(cfg);

    if (configError) {
      return json({ ok: false, error: configError }, 500);
    }

    let body: Record<string, unknown>;

    try {
      const parsed = await request.json();

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return json({ ok: false, error: "INVALID_JSON_OBJECT" }, 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return json({ ok: false, error: "INVALID_JSON" }, 400);
    }

    const action = clean(body.action);

    if (!action) {
      return json({ ok: false, error: "ACTION_REQUIRED" }, 400);
    }

    const adapter = new KvAllocatorDbAdapter(env.ALLOCATOR_DB);

    switch (action) {
      case "allocate":
        return handleAllocate(adapter, cfg, body as AllocateBody);

      case "heartbeat":
        return handleHeartbeat(adapter, cfg, body as LeaseBody);

      case "release":
        return handleRelease(adapter, body as LeaseBody);

      case "reclaim":
        return handleReclaim(adapter, cfg);

      case "active":
        return handleActive(adapter, cfg);

      case "tenant":
        return handleTenant(adapter, body as LeaseBody);

      default:
        return json({ ok: false, error: "UNKNOWN_ACTION" }, 400);
    }
  }
};

// --- Action Handlers --------------------------------------------------------

async function handleAllocate(
  adapter: AllocatorDbAdapter,
  cfg: AllocatorRouterConfig,
  body: AllocateBody
): Promise<Response> {
  const tenant_id = clean(body.tenant_id ?? body.tenantId);

  if (!tenant_id) {
    return json({ ok: false, error: "TENANT_REQUIRED" }, 400);
  }

  const now = Date.now();
  const capacity = cfg.PORT_MAX - cfg.PORT_MIN + 1;
  const maxIterations = Math.min(cfg.MAX_RETRIES_PER_REQUEST, capacity);

  const cursorRecord = await adapter.getCursor();
  let cursor = cursorRecord?.cursor_port ?? cfg.PORT_MIN;

  if (!isPortInRange(cursor, cfg)) {
    cursor = cfg.PORT_MIN;
  }

  for (let i = 0; i < maxIterations; i++) {
    const candidate = wrapPort(cursor + i, cfg);
    const existing = await adapter.getLeaseByPort(candidate);

    if (!existing) {
      const lease = makeLease(candidate, tenant_id, now);
      const claimed = await adapter.claimPortIfFree(lease);

      if (claimed.ok && claimed.lease) {
        await adapter.putCursor(wrapPort(candidate + 1, cfg), now);

        return json({
          ok: true,
          action: "allocate",
          port: claimed.lease.port,
          lease_id: claimed.lease.lease_id,
          created_at_ms: claimed.lease.created_at_ms,
          last_heartbeat_ms: claimed.lease.last_heartbeat_ms,
          expires_at_ms: claimed.lease.last_heartbeat_ms + cfg.LEASE_TTL_MS,
          reclaimable_at_ms:
            claimed.lease.last_heartbeat_ms +
            cfg.LEASE_TTL_MS +
            cfg.HEARTBEAT_GRACE_MS,
          reason: null
        });
      }

      continue;
    }

    if (isLeaseReclaimable(existing, cfg, now)) {
      await adapter.deleteLeaseIfCurrent(existing.lease_id, existing.port);

      const lease = makeLease(candidate, tenant_id, now);
      const claimed = await adapter.claimPortIfFree(lease);

      if (claimed.ok && claimed.lease) {
        await adapter.putCursor(wrapPort(candidate + 1, cfg), now);

        return json({
          ok: true,
          action: "allocate",
          port: claimed.lease.port,
          lease_id: claimed.lease.lease_id,
          created_at_ms: claimed.lease.created_at_ms,
          last_heartbeat_ms: claimed.lease.last_heartbeat_ms,
          expires_at_ms: claimed.lease.last_heartbeat_ms + cfg.LEASE_TTL_MS,
          reclaimable_at_ms:
            claimed.lease.last_heartbeat_ms +
            cfg.LEASE_TTL_MS +
            cfg.HEARTBEAT_GRACE_MS,
          reason: null
        });
      }
    }
  }

  await adapter.putCursor(wrapPort(cursor + maxIterations, cfg), now);

  return json({
    ok: false,
    action: "allocate",
    port: null,
    lease_id: null,
    reason: "exhausted"
  });
}

async function handleHeartbeat(
  adapter: AllocatorDbAdapter,
  cfg: AllocatorRouterConfig,
  body: LeaseBody
): Promise<Response> {
  const tenant_id = clean(body.tenant_id ?? body.tenantId);
  const lease_id = clean(body.lease_id ?? body.leaseId);
  const port = numberValue(body.port);

  if (!tenant_id || !lease_id || !isPortInRange(port, cfg)) {
    return json({ ok: false, error: "HEARTBEAT_FIELDS_REQUIRED" }, 400);
  }

  const now = Date.now();
  const lease = await adapter.getLeaseByPort(port);

  if (!lease) {
    return json({
      ok: false,
      action: "heartbeat",
      port,
      lease_id,
      reason: "not-found"
    });
  }

  if (lease.lease_id !== lease_id) {
    return json({
      ok: false,
      action: "heartbeat",
      port,
      lease_id,
      reason: "not-found"
    });
  }

  if (lease.tenant_id !== tenant_id) {
    return json({
      ok: false,
      action: "heartbeat",
      port,
      lease_id,
      reason: "tenant-mismatch"
    });
  }

  if (isLeaseReclaimable(lease, cfg, now)) {
    await adapter.markLeaseExpiredIfCurrent(lease_id, port, now);

    return json({
      ok: false,
      action: "heartbeat",
      port,
      lease_id,
      reason: "expired"
    });
  }

  const result = await adapter.heartbeatLeaseIfOwner(
    tenant_id,
    lease_id,
    port,
    now
  );

  return json({
    ok: result.ok,
    action: "heartbeat",
    port,
    lease_id,
    last_heartbeat_ms: result.lease?.last_heartbeat_ms ?? null,
    expires_at_ms: result.lease
      ? result.lease.last_heartbeat_ms + cfg.LEASE_TTL_MS
      : null,
    reclaimable_at_ms: result.lease
      ? result.lease.last_heartbeat_ms +
        cfg.LEASE_TTL_MS +
        cfg.HEARTBEAT_GRACE_MS
      : null,
    reason: result.reason
  });
}

async function handleRelease(
  adapter: AllocatorDbAdapter,
  body: LeaseBody
): Promise<Response> {
  const tenant_id = clean(body.tenant_id ?? body.tenantId);
  const lease_id = clean(body.lease_id ?? body.leaseId);
  const port = numberValue(body.port);

  if (!tenant_id || !lease_id || !isPositiveInteger(port)) {
    return json({ ok: false, error: "RELEASE_FIELDS_REQUIRED" }, 400);
  }

  const now = Date.now();

  const result = await adapter.releaseLeaseIfOwner(
    tenant_id,
    lease_id,
    port,
    now
  );

  return json({
    ok: result.ok,
    action: "release",
    port,
    lease_id,
    reason: result.reason
  });
}

async function handleReclaim(
  adapter: AllocatorDbAdapter,
  cfg: AllocatorRouterConfig
): Promise<Response> {
  const now = Date.now();
  const leases = await adapter.listActiveLeases();

  let scanned = 0;
  let reclaimed = 0;

  for (const lease of leases) {
    scanned++;

    if (!isLeaseReclaimable(lease, cfg, now)) {
      continue;
    }

    const deleted = await adapter.deleteLeaseIfCurrent(
      lease.lease_id,
      lease.port
    );

    if (deleted.ok) {
      reclaimed++;
    }
  }

  return json({
    ok: true,
    action: "reclaim",
    scanned,
    reclaimed
  });
}

async function handleActive(
  adapter: AllocatorDbAdapter,
  cfg: AllocatorRouterConfig
): Promise<Response> {
  const now = Date.now();
  const leases = await adapter.listActiveLeases();

  const active: PortLeaseRecord[] = [];
  const expired: PortLeaseRecord[] = [];
  const byTenant = new Map<string, number>();

  for (const lease of leases) {
    if (isLeaseReclaimable(lease, cfg, now)) {
      expired.push(lease);
      continue;
    }

    active.push(lease);
    byTenant.set(lease.tenant_id, (byTenant.get(lease.tenant_id) ?? 0) + 1);
  }

  return json({
    ok: true,
    action: "active",
    total_capacity: cfg.PORT_MAX - cfg.PORT_MIN + 1,
    active_count: active.length,
    expired_count: expired.length,
    by_tenant: Array.from(byTenant.entries())
      .map(([tenant_id, active_count]) => ({
        tenant_id,
        active_count
      }))
      .sort((a, b) => a.tenant_id.localeCompare(b.tenant_id))
  });
}

async function handleTenant(
  adapter: AllocatorDbAdapter,
  body: LeaseBody
): Promise<Response> {
  const tenant_id = clean(body.tenant_id ?? body.tenantId);

  if (!tenant_id) {
    return json({ ok: false, error: "TENANT_REQUIRED" }, 400);
  }

  const leases = await adapter.listLeasesByTenant(tenant_id);

  return json({
    ok: true,
    action: "tenant",
    tenant_id,
    leases
  });
}

// --- Mechanical Helpers -----------------------------------------------------

function makeLease(
  port: number,
  tenant_id: string,
  now: number
): PortLeaseRecord {
  return {
    port,
    tenant_id,
    lease_id: makeLeaseId(),
    created_at_ms: now,
    last_heartbeat_ms: now,
    status: "active"
  };
}

function isLeaseReclaimable(
  lease: PortLeaseRecord,
  cfg: AllocatorRouterConfig,
  now: number
): boolean {
  if (lease.status !== "active") {
    return true;
  }

  return now > lease.last_heartbeat_ms + cfg.LEASE_TTL_MS + cfg.HEARTBEAT_GRACE_MS;
}

function loadConfig(env: AllocatorRouterEnv): AllocatorRouterConfig {
  return {
    PORT_MIN: intValue(env.PORT_MIN, DEFAULT_CONFIG.PORT_MIN),
    PORT_MAX: intValue(env.PORT_MAX, DEFAULT_CONFIG.PORT_MAX),
    LEASE_TTL_MS: intValue(env.LEASE_TTL_MS, DEFAULT_CONFIG.LEASE_TTL_MS),
    HEARTBEAT_GRACE_MS: intValue(
      env.HEARTBEAT_GRACE_MS,
      DEFAULT_CONFIG.HEARTBEAT_GRACE_MS
    ),
    MAX_RETRIES_PER_REQUEST: intValue(
      env.MAX_RETRIES_PER_REQUEST,
      DEFAULT_CONFIG.MAX_RETRIES_PER_REQUEST
    )
  };
}

function validateConfig(cfg: AllocatorRouterConfig): string | null {
  if (!Number.isInteger(cfg.PORT_MIN)) return "PORT_MIN_INVALID";
  if (!Number.isInteger(cfg.PORT_MAX)) return "PORT_MAX_INVALID";
  if (cfg.PORT_MIN >= cfg.PORT_MAX) return "PORT_RANGE_INVALID";
  if (!Number.isInteger(cfg.LEASE_TTL_MS) || cfg.LEASE_TTL_MS <= 0) {
    return "LEASE_TTL_INVALID";
  }
  if (
    !Number.isInteger(cfg.HEARTBEAT_GRACE_MS) ||
    cfg.HEARTBEAT_GRACE_MS < 0
  ) {
    return "HEARTBEAT_GRACE_INVALID";
  }
  if (
    !Number.isInteger(cfg.MAX_RETRIES_PER_REQUEST) ||
    cfg.MAX_RETRIES_PER_REQUEST <= 0
  ) {
    return "MAX_RETRIES_INVALID";
  }

  return null;
}

function wrapPort(port: number, cfg: AllocatorRouterConfig): number {
  const capacity = cfg.PORT_MAX - cfg.PORT_MIN + 1;
  const offset = (port - cfg.PORT_MIN) % capacity;
  return cfg.PORT_MIN + ((offset + capacity) % capacity);
}

function isPortInRange(
  port: number | null,
  cfg: AllocatorRouterConfig
): port is number {
  return (
    typeof port === "number" &&
    Number.isInteger(port) &&
    port >= cfg.PORT_MIN &&
    port <= cfg.PORT_MAX
  );
}

function isPositiveInteger(value: number | null): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function intValue(value: string | number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function numberValue(value: unknown): number | null {
  const num = Number(value);

  if (!Number.isInteger(num)) {
    return null;
  }

  return num;
}

function clean(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).trim();
}

function makeLeaseId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "lease-" +
    Math.random().toString(16).slice(2) +
    "-" +
    Date.now().toString(16)
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
