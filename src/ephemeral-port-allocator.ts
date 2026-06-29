// src/ephemeral-port-allocator.ts
// Ephemeral Port Allocator — functioning TypeScript model
// No HTML. No framework. In-memory backing store.
// Later backing store can become DB / Durable Object / KV+DO.

export type LeaseStatus = "active" | "reclaiming" | "expired";
export type LeasePhase = "active" | "grace" | "expired";

export interface EphemeralPortAllocatorConfig {
  PORT_MIN: number;
  PORT_MAX: number;
  LEASE_TTL_MS: number;
  HEARTBEAT_GRACE_MS: number;
  MAX_RETRIES_PER_REQUEST: number;
}

export interface EphemeralPortAllocatorOptions {
  now_ms?: () => number;
  lease_id_factory?: () => string;
}

export interface LeaseRecord {
  port: number;
  tenant_id: string;
  lease_id: string;
  created_at_ms: number;
  last_heartbeat_ms: number;
  status: LeaseStatus;
}

export interface AllocationResult {
  ok: boolean;
  port: number | null;
  lease_id: string | null;
  reason: string | null;
}

export interface HeartbeatResult {
  ok: boolean;
  reason: string | null;
}

export interface ReleaseResult {
  ok: boolean;
  reason: string | null;
}

export interface ReclaimResult {
  ok: boolean;
  scanned: number;
  reclaimed: number;
}

export interface AllocatorMetrics {
  port_allocations_total: number;
  port_allocations_failed_exhausted_total: number;
  port_reclaims_total: number;
  port_heartbeats_total: number;
  port_heartbeats_failed_total: number;
  port_releases_total: number;
}

export interface ActiveSummary {
  total_capacity: number;
  active_count: number;
  grace_count: number;
  expired_count: number;
  cursor_port: number;
  by_tenant: Array<{ tenant_id: string; active_count: number }>;
  metrics: AllocatorMetrics;
}

export class EphemeralPortAllocator {
  private readonly cfg: EphemeralPortAllocatorConfig;
  private readonly nowProvider: () => number;
  private readonly leaseIdFactory: () => string;

  private readonly leasesByPort: Map<number, LeaseRecord> = new Map();
  private cursor_port: number;

  private readonly metrics: AllocatorMetrics = {
    port_allocations_total: 0,
    port_allocations_failed_exhausted_total: 0,
    port_reclaims_total: 0,
    port_heartbeats_total: 0,
    port_heartbeats_failed_total: 0,
    port_releases_total: 0
  };

  constructor(
    cfg: EphemeralPortAllocatorConfig,
    options: EphemeralPortAllocatorOptions = {}
  ) {
    this.validateConfig(cfg);

    this.cfg = { ...cfg };
    this.cursor_port = cfg.PORT_MIN;
    this.nowProvider = options.now_ms ?? (() => Date.now());
    this.leaseIdFactory = options.lease_id_factory ?? (() => this.generateLeaseId());
  }

  allocate(tenant_id: string): AllocationResult {
    const tenant = this.cleanTenantId(tenant_id);

    if (!tenant) {
      return {
        ok: false,
        port: null,
        lease_id: null,
        reason: "invalid-tenant"
      };
    }

    const now = this.nowMs();
    const maxIterations = Math.min(
      this.cfg.MAX_RETRIES_PER_REQUEST,
      this.capacity()
    );

    let candidate = this.cursor_port;

    for (let i = 0; i < maxIterations; i++) {
      candidate = this.wrapPort(candidate);

      const existing = this.leasesByPort.get(candidate);

      if (!existing) {
        return this.claimPort(candidate, tenant, now);
      }

      if (this.isLeaseExpired(existing, now)) {
        const reclaimed = this.reclaimLeaseIfCurrent(existing, now);

        if (reclaimed) {
          return this.claimPort(candidate, tenant, now);
        }
      }

      candidate = this.wrapPort(candidate + 1);
    }

    this.metrics.port_allocations_failed_exhausted_total++;

    return {
      ok: false,
      port: null,
      lease_id: null,
      reason: "exhausted"
    };
  }

  heartbeat(
    tenant_id: string,
    lease_id: string,
    port: number
  ): HeartbeatResult {
    const tenant = this.cleanTenantId(tenant_id);

    if (!tenant || !lease_id || !this.isValidPort(port)) {
      this.metrics.port_heartbeats_failed_total++;
      return {
        ok: false,
        reason: "invalid-request"
      };
    }

    const lease = this.leasesByPort.get(port);

    if (!lease) {
      this.metrics.port_heartbeats_failed_total++;
      return {
        ok: false,
        reason: "not-found"
      };
    }

    if (lease.lease_id !== lease_id) {
      this.metrics.port_heartbeats_failed_total++;
      return {
        ok: false,
        reason: "not-found"
      };
    }

    if (lease.tenant_id !== tenant) {
      this.metrics.port_heartbeats_failed_total++;
      return {
        ok: false,
        reason: "tenant-mismatch"
      };
    }

    const now = this.nowMs();

    if (this.isLeaseExpired(lease, now)) {
      lease.status = "expired";
      this.leasesByPort.set(port, lease);

      this.metrics.port_heartbeats_failed_total++;

      return {
        ok: false,
        reason: "expired"
      };
    }

    lease.last_heartbeat_ms = now;
    lease.status = "active";

    this.leasesByPort.set(port, lease);

    this.metrics.port_heartbeats_total++;

    return {
      ok: true,
      reason: null
    };
  }

  release(
    tenant_id: string,
    lease_id: string,
    port: number
  ): ReleaseResult {
    const tenant = this.cleanTenantId(tenant_id);

    if (!tenant || !lease_id || !this.isValidPort(port)) {
      return {
        ok: false,
        reason: "invalid-request"
      };
    }

    const lease = this.leasesByPort.get(port);

    if (!lease) {
      return {
        ok: false,
        reason: "not-found"
      };
    }

    if (lease.lease_id !== lease_id) {
      return {
        ok: false,
        reason: "not-found"
      };
    }

    if (lease.tenant_id !== tenant) {
      return {
        ok: false,
        reason: "tenant-mismatch"
      };
    }

    this.leasesByPort.delete(port);
    this.metrics.port_releases_total++;

    return {
      ok: true,
      reason: null
    };
  }

  reclaimExpired(): number {
    return this.sweepExpired().reclaimed;
  }

  sweepExpired(): ReclaimResult {
    const now = this.nowMs();

    let scanned = 0;
    let reclaimed = 0;

    for (const lease of Array.from(this.leasesByPort.values())) {
      scanned++;

      if (this.isLeaseExpired(lease, now)) {
        const didReclaim = this.reclaimLeaseIfCurrent(lease, now);

        if (didReclaim) {
          reclaimed++;
        }
      }
    }

    return {
      ok: true,
      scanned,
      reclaimed
    };
  }

  getActiveSummary(): ActiveSummary {
    const now = this.nowMs();

    let active_count = 0;
    let grace_count = 0;
    let expired_count = 0;

    const byTenantMap: Map<string, number> = new Map();

    for (const lease of this.leasesByPort.values()) {
      const phase = this.getLeasePhase(lease, now);

      if (phase === "expired") {
        expired_count++;
        continue;
      }

      if (phase === "active") {
        active_count++;
      }

      if (phase === "grace") {
        grace_count++;
      }

      const prev = byTenantMap.get(lease.tenant_id) ?? 0;
      byTenantMap.set(lease.tenant_id, prev + 1);
    }

    const by_tenant = Array.from(byTenantMap.entries())
      .map(([tenant_id, count]) => ({
        tenant_id,
        active_count: count
      }))
      .sort((a, b) => a.tenant_id.localeCompare(b.tenant_id));

    return {
      total_capacity: this.capacity(),
      active_count,
      grace_count,
      expired_count,
      cursor_port: this.cursor_port,
      by_tenant,
      metrics: this.getMetrics()
    };
  }

  getTenantLeases(tenant_id: string): LeaseRecord[] {
    const tenant = this.cleanTenantId(tenant_id);

    if (!tenant) {
      return [];
    }

    const now = this.nowMs();
    const result: LeaseRecord[] = [];

    for (const lease of this.leasesByPort.values()) {
      if (lease.tenant_id !== tenant) continue;
      if (this.isLeaseExpired(lease, now)) continue;

      result.push(this.cloneLease(lease));
    }

    return result.sort((a, b) => a.port - b.port);
  }

  getLeaseByPort(port: number): LeaseRecord | null {
    if (!this.isValidPort(port)) return null;

    const lease = this.leasesByPort.get(port);
    return lease ? this.cloneLease(lease) : null;
  }

  getMetrics(): AllocatorMetrics {
    return { ...this.metrics };
  }

  getCursorPort(): number {
    return this.cursor_port;
  }

  getConfig(): EphemeralPortAllocatorConfig {
    return { ...this.cfg };
  }

  getLeasePhase(lease: LeaseRecord, now: number = this.nowMs()): LeasePhase {
    const activeUntil = lease.last_heartbeat_ms + this.cfg.LEASE_TTL_MS;
    const graceUntil = activeUntil + this.cfg.HEARTBEAT_GRACE_MS;

    if (now <= activeUntil) {
      return "active";
    }

    if (now <= graceUntil) {
      return "grace";
    }

    return "expired";
  }

  private claimPort(
    port: number,
    tenant_id: string,
    now: number
  ): AllocationResult {
    if (this.leasesByPort.has(port)) {
      return {
        ok: false,
        port: null,
        lease_id: null,
        reason: "race-conflict"
      };
    }

    const lease_id = this.leaseIdFactory();

    const lease: LeaseRecord = {
      port,
      tenant_id,
      lease_id,
      created_at_ms: now,
      last_heartbeat_ms: now,
      status: "active"
    };

    this.leasesByPort.set(port, lease);
    this.advanceCursor(port);

    this.metrics.port_allocations_total++;

    return {
      ok: true,
      port,
      lease_id,
      reason: null
    };
  }

  private reclaimLeaseIfCurrent(lease: LeaseRecord, now: number): boolean {
    const current = this.leasesByPort.get(lease.port);

    if (!current) {
      return true;
    }

    if (
      current.lease_id !== lease.lease_id ||
      current.last_heartbeat_ms !== lease.last_heartbeat_ms
    ) {
      return false;
    }

    if (!this.isLeaseExpired(current, now)) {
      return false;
    }

    current.status = "reclaiming";
    this.leasesByPort.set(current.port, current);

    this.leasesByPort.delete(current.port);
    this.metrics.port_reclaims_total++;

    return true;
  }

  private isLeaseExpired(lease: LeaseRecord, now: number): boolean {
    return this.getLeasePhase(lease, now) === "expired";
  }

  private nowMs(): number {
    return this.nowProvider();
  }

  private capacity(): number {
    return this.cfg.PORT_MAX - this.cfg.PORT_MIN + 1;
  }

  private wrapPort(port: number): number {
    const span = this.capacity();
    const offset = (port - this.cfg.PORT_MIN) % span;
    return this.cfg.PORT_MIN + ((offset + span) % span);
  }

  private advanceCursor(afterPort: number): void {
    this.cursor_port = this.wrapPort(afterPort + 1);
  }

  private isValidPort(port: number): boolean {
    return (
      Number.isInteger(port) &&
      port >= this.cfg.PORT_MIN &&
      port <= this.cfg.PORT_MAX
    );
  }

  private cleanTenantId(value: string): string | null {
    if (typeof value !== "string") return null;

    const tenant = value.trim();

    if (!tenant) return null;
    if (tenant.length > 128) return null;

    if (!/^[a-zA-Z0-9._:@/-]+$/.test(tenant)) {
      return null;
    }

    return tenant;
  }

  private cloneLease(lease: LeaseRecord): LeaseRecord {
    return {
      port: lease.port,
      tenant_id: lease.tenant_id,
      lease_id: lease.lease_id,
      created_at_ms: lease.created_at_ms,
      last_heartbeat_ms: lease.last_heartbeat_ms,
      status: lease.status
    };
  }

  private generateLeaseId(): string {
    const cryptoLike = globalThis.crypto;

    if (cryptoLike && typeof cryptoLike.randomUUID === "function") {
      return cryptoLike.randomUUID();
    }

    return (
      "lease-" +
      Math.random().toString(16).slice(2) +
      "-" +
      Date.now().toString(16)
    );
  }

  private validateConfig(cfg: EphemeralPortAllocatorConfig): void {
    const keys: Array<keyof EphemeralPortAllocatorConfig> = [
      "PORT_MIN",
      "PORT_MAX",
      "LEASE_TTL_MS",
      "HEARTBEAT_GRACE_MS",
      "MAX_RETRIES_PER_REQUEST"
    ];

    for (const key of keys) {
      if (!Number.isInteger(cfg[key])) {
        throw new Error(`${key}_MUST_BE_INTEGER`);
      }
    }

    if (cfg.PORT_MIN >= cfg.PORT_MAX) {
      throw new Error("PORT_MIN_MUST_BE_LESS_THAN_PORT_MAX");
    }

    if (cfg.LEASE_TTL_MS <= 0) {
      throw new Error("LEASE_TTL_MS_MUST_BE_POSITIVE");
    }

    if (cfg.HEARTBEAT_GRACE_MS < 0) {
      throw new Error("HEARTBEAT_GRACE_MS_MUST_NOT_BE_NEGATIVE");
    }

    if (cfg.MAX_RETRIES_PER_REQUEST <= 0) {
      throw new Error("MAX_RETRIES_PER_REQUEST_MUST_BE_POSITIVE");
    }
  }
}
 
