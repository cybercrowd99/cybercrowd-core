// src/allocator-db-adapter.ts
// CyberCrowd Ephemeral Port Allocator — DB Adapter Layer
//
// Port-keyed persistence contract for allocator storage.
//
// Primary safety rule:
// - port is the authority key
// - lease_id is proof/debug lookup
//
// This adapter does not grant access.
// This adapter does not elevate authority.
// This adapter does not decide identity.
// It only persists allocator state.
//
// Note:
// Plain KV does not provide true global CAS by itself.
// Use this adapter behind a Durable Object or another serialized owner
// when allocation collision safety is required.

export type PortLeaseStatus = "active" | "reclaiming" | "expired";

export interface PortLeaseRecord {
  port: number;
  tenant_id: string;
  lease_id: string;
  created_at_ms: number;
  last_heartbeat_ms: number;
  status: PortLeaseStatus;
}

export interface CursorRecord {
  cursor_port: number;
  updated_at_ms: number;
}

export interface ClaimPortResult {
  ok: boolean;
  reason: string | null;
  lease: PortLeaseRecord | null;
}

export interface LeaseMutationResult {
  ok: boolean;
  reason: string | null;
  lease: PortLeaseRecord | null;
}

export interface AllocatorDbAdapter {
  getLeaseByPort(port: number): Promise<PortLeaseRecord | null>;
  getLeaseById(lease_id: string): Promise<PortLeaseRecord | null>;

  claimPortIfFree(record: PortLeaseRecord): Promise<ClaimPortResult>;

  heartbeatLeaseIfOwner(
    tenant_id: string,
    lease_id: string,
    port: number,
    now_ms: number
  ): Promise<LeaseMutationResult>;

  releaseLeaseIfOwner(
    tenant_id: string,
    lease_id: string,
    port: number,
    now_ms: number
  ): Promise<LeaseMutationResult>;

  markLeaseExpiredIfCurrent(
    lease_id: string,
    port: number,
    now_ms: number
  ): Promise<LeaseMutationResult>;

  deleteLeaseIfCurrent(
    lease_id: string,
    port: number
  ): Promise<LeaseMutationResult>;

  listActiveLeases(): Promise<PortLeaseRecord[]>;
  listLeasesByTenant(tenant_id: string): Promise<PortLeaseRecord[]>;

  getCursor(): Promise<CursorRecord | null>;
  putCursor(cursor_port: number, now_ms: number): Promise<void>;
}

export interface KvNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class KvAllocatorDbAdapter implements AllocatorDbAdapter {
  private readonly kv: KvNamespaceLike;

  constructor(kv: KvNamespaceLike) {
    if (!kv) {
      throw new Error("ALLOCATOR_KV_REQUIRED");
    }

    this.kv = kv;
  }

  async getLeaseByPort(port: number): Promise<PortLeaseRecord | null> {
    if (!isValidPortNumber(port)) {
      return null;
    }

    return this.getJson<PortLeaseRecord>(leasePortKey(port));
  }

  async getLeaseById(lease_id: string): Promise<PortLeaseRecord | null> {
    const leaseId = cleanId(lease_id);

    if (!leaseId) {
      return null;
    }

    return this.getJson<PortLeaseRecord>(leaseIdKey(leaseId));
  }

  async claimPortIfFree(record: PortLeaseRecord): Promise<ClaimPortResult> {
    const clean = cleanLeaseRecord(record);

    if (!clean) {
      return {
        ok: false,
        reason: "invalid-lease-record",
        lease: null
      };
    }

    const current = await this.getLeaseByPort(clean.port);

    if (current && current.status === "active") {
      return {
        ok: false,
        reason: "port-busy",
        lease: cloneLease(current)
      };
    }

    if (current && current.lease_id !== clean.lease_id) {
      await this.kv.delete(leaseIdKey(current.lease_id));
    }

    const activeLease: PortLeaseRecord = {
      ...clean,
      status: "active"
    };

    await this.putLease(activeLease);
    await this.addPortToIndexes(activeLease);

    return {
      ok: true,
      reason: null,
      lease: cloneLease(activeLease)
    };
  }

  async heartbeatLeaseIfOwner(
    tenant_id: string,
    lease_id: string,
    port: number,
    now_ms: number
  ): Promise<LeaseMutationResult> {
    const tenant = cleanId(tenant_id);
    const leaseId = cleanId(lease_id);
    const now = Number(now_ms);

    if (!tenant || !leaseId || !isValidPortNumber(port) || !isValidTime(now)) {
      return {
        ok: false,
        reason: "invalid-request",
        lease: null
      };
    }

    const lease = await this.getLeaseByPort(port);

    if (!lease) {
      return {
        ok: false,
        reason: "not-found",
        lease: null
      };
    }

    if (lease.lease_id !== leaseId) {
      return {
        ok: false,
        reason: "not-found",
        lease: null
      };
    }

    if (lease.tenant_id !== tenant) {
      return {
        ok: false,
        reason: "tenant-mismatch",
        lease: cloneLease(lease)
      };
    }

    if (lease.status !== "active") {
      return {
        ok: false,
        reason: "lease-not-active",
        lease: cloneLease(lease)
      };
    }

    const next: PortLeaseRecord = {
      ...lease,
      last_heartbeat_ms: now,
      status: "active"
    };

    await this.putLease(next);

    return {
      ok: true,
      reason: null,
      lease: cloneLease(next)
    };
  }

  async releaseLeaseIfOwner(
    tenant_id: string,
    lease_id: string,
    port: number,
    now_ms: number
  ): Promise<LeaseMutationResult> {
    const tenant = cleanId(tenant_id);
    const leaseId = cleanId(lease_id);
    const now = Number(now_ms);

    if (!tenant || !leaseId || !isValidPortNumber(port) || !isValidTime(now)) {
      return {
        ok: false,
        reason: "invalid-request",
        lease: null
      };
    }

    const lease = await this.getLeaseByPort(port);

    if (!lease) {
      return {
        ok: false,
        reason: "not-found",
        lease: null
      };
    }

    if (lease.lease_id !== leaseId) {
      return {
        ok: false,
        reason: "not-found",
        lease: null
      };
    }

    if (lease.tenant_id !== tenant) {
      return {
        ok: false,
        reason: "tenant-mismatch",
        lease: cloneLease(lease)
      };
    }

    const next: PortLeaseRecord = {
      ...lease,
      last_heartbeat_ms: now,
      status: "expired"
    };

    await this.putLease(next);

    return {
      ok: true,
      reason: null,
      lease: cloneLease(next)
    };
  }

  async markLeaseExpiredIfCurrent(
    lease_id: string,
    port: number,
    now_ms: number
  ): Promise<LeaseMutationResult> {
    const leaseId = cleanId(lease_id);
    const now = Number(now_ms);

    if (!leaseId || !isValidPortNumber(port) || !isValidTime(now)) {
      return {
        ok: false,
        reason: "invalid-request",
        lease: null
      };
    }

    const lease = await this.getLeaseByPort(port);

    if (!lease) {
      return {
        ok: false,
        reason: "not-found",
        lease: null
      };
    }

    if (lease.lease_id !== leaseId) {
      return {
        ok: false,
        reason: "not-found",
        lease: null
      };
    }

    const next: PortLeaseRecord = {
      ...lease,
      last_heartbeat_ms: now,
      status: "expired"
    };

    await this.putLease(next);

    return {
      ok: true,
      reason: null,
      lease: cloneLease(next)
    };
  }

  async deleteLeaseIfCurrent(
    lease_id: string,
    port: number
  ): Promise<LeaseMutationResult> {
    const leaseId = cleanId(lease_id);

    if (!leaseId || !isValidPortNumber(port)) {
      return {
        ok: false,
        reason: "invalid-request",
        lease: null
      };
    }

    const lease = await this.getLeaseByPort(port);

    if (!lease) {
      return {
        ok: false,
        reason: "not-found",
        lease: null
      };
    }

    if (lease.lease_id !== leaseId) {
      return {
        ok: false,
        reason: "not-found",
        lease: null
      };
    }

    await this.kv.delete(leasePortKey(port));
    await this.kv.delete(leaseIdKey(leaseId));

    return {
      ok: true,
      reason: null,
      lease: cloneLease(lease)
    };
  }

  async listActiveLeases(): Promise<PortLeaseRecord[]> {
    const ports = await this.getNumberList(activePortsIndexKey());
    const result: PortLeaseRecord[] = [];

    for (const port of ports) {
      const lease = await this.getLeaseByPort(port);

      if (!lease) continue;
      if (lease.status !== "active") continue;

      result.push(cloneLease(lease));
    }

    result.sort((a, b) => a.port - b.port);

    return result;
  }

  async listLeasesByTenant(tenant_id: string): Promise<PortLeaseRecord[]> {
    const tenant = cleanId(tenant_id);

    if (!tenant) {
      return [];
    }

    const ports = await this.getNumberList(tenantPortsIndexKey(tenant));
    const result: PortLeaseRecord[] = [];

    for (const port of ports) {
      const lease = await this.getLeaseByPort(port);

      if (!lease) continue;
      if (lease.tenant_id !== tenant) continue;
      if (lease.status !== "active") continue;

      result.push(cloneLease(lease));
    }

    result.sort((a, b) => a.port - b.port);

    return result;
  }

  async getCursor(): Promise<CursorRecord | null> {
    return this.getJson<CursorRecord>(cursorKey());
  }

  async putCursor(cursor_port: number, now_ms: number): Promise<void> {
    const cursor = Number(cursor_port);
    const now = Number(now_ms);

    if (!isValidPortNumber(cursor)) {
      throw new Error("INVALID_CURSOR_PORT");
    }

    if (!isValidTime(now)) {
      throw new Error("INVALID_CURSOR_TIMESTAMP");
    }

    const record: CursorRecord = {
      cursor_port: cursor,
      updated_at_ms: now
    };

    await this.putJson(cursorKey(), record);
  }

  private async putLease(record: PortLeaseRecord): Promise<void> {
    await this.putJson(leasePortKey(record.port), record);
    await this.putJson(leaseIdKey(record.lease_id), record);
  }

  private async addPortToIndexes(record: PortLeaseRecord): Promise<void> {
    await this.addNumberToList(activePortsIndexKey(), record.port);
    await this.addNumberToList(tenantPortsIndexKey(record.tenant_id), record.port);
  }

  private async getNumberList(key: string): Promise<number[]> {
    const list = await this.getJson<unknown>(key);

    if (!Array.isArray(list)) {
      return [];
    }

    const clean = list
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));

    return Array.from(new Set(clean));
  }

  private async addNumberToList(key: string, value: number): Promise<void> {
    const list = await this.getNumberList(key);

    if (!list.includes(value)) {
      list.push(value);
    }

    list.sort((a, b) => a - b);

    await this.putJson(key, list);
  }

  private async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.kv.get(key);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed as T;
    } catch {
      return null;
    }
  }

  private async putJson(key: string, value: unknown): Promise<void> {
    await this.kv.put(key, JSON.stringify(value));
  }
}

export function leasePortKey(port: number): string {
  return `allocator:lease:port:${port}`;
}

export function leaseIdKey(lease_id: string): string {
  return `allocator:lease:id:${lease_id}`;
}

export function cursorKey(): string {
  return "allocator:cursor";
}

export function activePortsIndexKey(): string {
  return "allocator:index:ports";
}

export function tenantPortsIndexKey(tenant_id: string): string {
  return `allocator:index:tenant:${tenant_id}:ports`;
}

function cleanLeaseRecord(record: PortLeaseRecord): PortLeaseRecord | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const tenant = cleanId(record.tenant_id);
  const leaseId = cleanId(record.lease_id);

  if (!tenant || !leaseId) {
    return null;
  }

  if (!isValidPortNumber(record.port)) {
    return null;
  }

  if (!isValidTime(record.created_at_ms)) {
    return null;
  }

  if (!isValidTime(record.last_heartbeat_ms)) {
    return null;
  }

  if (!isValidLeaseStatus(record.status)) {
    return null;
  }

  return {
    port: record.port,
    tenant_id: tenant,
    lease_id: leaseId,
    created_at_ms: record.created_at_ms,
    last_heartbeat_ms: record.last_heartbeat_ms,
    status: record.status
  };
}

function cloneLease(record: PortLeaseRecord): PortLeaseRecord {
  return {
    port: record.port,
    tenant_id: record.tenant_id,
    lease_id: record.lease_id,
    created_at_ms: record.created_at_ms,
    last_heartbeat_ms: record.last_heartbeat_ms,
    status: record.status
  };
}

function cleanId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  if (!clean) {
    return null;
  }

  if (clean.length > 180) {
    return null;
  }

  if (!/^[a-zA-Z0-9._:@/-]+$/.test(clean)) {
    return null;
  }

  return clean;
}

function isValidPortNumber(port: unknown): port is number {
  return typeof port === "number" && Number.isInteger(port) && port > 0;
}

function isValidTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidLeaseStatus(value: unknown): value is PortLeaseStatus {
  return value === "active" || value === "reclaiming" || value === "expired";
    }
