// src/cybercrowd-moment-engine.ts
//
// CyberCrowd Moment Engine
//
// ONE JOB:
// Own moment creation, sequencing, expiration, continuity, replay blocking,
// and burn state inside CyberCrowd CORE.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT UI.
// This is NOT payment.
// This is NOT permission.
//
// A moment is a bounded time-context for movement.
// A moment can support proof, routing, proximity, jobs, pings, allocator leases,
// footprints, protection decisions, and Hypogeum snapshots.
//
// A moment is evidence.
// A moment is not authority.

export type MomentState =
  | "open"
  | "sealed"
  | "expired"
  | "burned";

export type MomentSourceOrgan =
  | "footprint"
  | "protection"
  | "jobs"
  | "presence"
  | "allocator"
  | "proximity"
  | "hypogeum"
  | "root"
  | "unknown";

export interface MomentRecord {
  moment_id: string;
  tenant_id: string;
  source_organ: MomentSourceOrgan;
  surface_id: string | null;
  actor_private_id: string | null;
  job_id: string | null;
  lease_id: string | null;
  parent_moment_id: string | null;
  created_at_ms: number;
  expires_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;
  state: MomentState;
  sequence: number;
  data: Record<string, unknown>;
}

export interface CreateMomentRequest {
  tenant_id: string;
  source_organ?: MomentSourceOrgan;
  surface_id?: string | null;
  actor_private_id?: string | null;
  job_id?: string | null;
  lease_id?: string | null;
  parent_moment_id?: string | null;
  ttl_ms?: number | null;
  data?: Record<string, unknown>;
}

export interface MomentResult {
  ok: boolean;
  moment?: MomentRecord;
  error?: string;
}

export interface MomentListResult {
  ok: boolean;
  moments: MomentRecord[];
  error?: string;
}

export interface MomentEngine {
  create(request: CreateMomentRequest): Promise<MomentResult>;
  seal(moment_id: string): Promise<MomentResult>;
  burn(moment_id: string): Promise<MomentResult>;
  expire(): Promise<number>;
  get(moment_id: string): Promise<MomentRecord | null>;
  listByTenant(tenant_id: string): Promise<MomentListResult>;
  listByParent(parent_moment_id: string): Promise<MomentListResult>;
  assertReplayAllowed(moment_id: string): Promise<boolean>;
}

export class InMemoryMomentEngine implements MomentEngine {
  private readonly momentsById = new Map<string, MomentRecord>();
  private readonly tenantIndex = new Map<string, Set<string>>();
  private readonly parentIndex = new Map<string, Set<string>>();
  private sequence = 0;

  async create(request: CreateMomentRequest): Promise<MomentResult> {
    const tenant_id = cleanId(request.tenant_id);

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
      };
    }

    const source_organ = cleanSourceOrgan(request.source_organ ?? "unknown");
    const surface_id = cleanNullableId(request.surface_id ?? null);
    const actor_private_id = cleanNullableId(request.actor_private_id ?? null);
    const job_id = cleanNullableId(request.job_id ?? null);
    const lease_id = cleanNullableId(request.lease_id ?? null);
    const parent_moment_id = cleanNullableId(request.parent_moment_id ?? null);
    const now = Date.now();

    const ttl_ms =
      typeof request.ttl_ms === "number" &&
      Number.isFinite(request.ttl_ms) &&
      request.ttl_ms > 0
        ? request.ttl_ms
        : null;

    const moment: MomentRecord = {
      moment_id: makeMomentId(),
      tenant_id,
      source_organ,
      surface_id,
      actor_private_id,
      job_id,
      lease_id,
      parent_moment_id,
      created_at_ms: now,
      expires_at_ms: ttl_ms ? now + ttl_ms : null,
      sealed_at_ms: null,
      burned_at_ms: null,
      state: "open",
      sequence: ++this.sequence,
      data: cloneData(request.data ?? {})
    };

    this.momentsById.set(moment.moment_id, cloneMoment(moment));
    this.addIndex(this.tenantIndex, tenant_id, moment.moment_id);

    if (parent_moment_id) {
      this.addIndex(this.parentIndex, parent_moment_id, moment.moment_id);
    }

    return {
      ok: true,
      moment: cloneMoment(moment)
    };
  }

  async seal(moment_id: string): Promise<MomentResult> {
    const moment = this.momentsById.get(cleanId(moment_id));

    if (!moment) {
      return {
        ok: false,
        error: "MOMENT_NOT_FOUND"
      };
    }

    if (moment.state === "burned") {
      return {
        ok: false,
        error: "MOMENT_BURNED"
      };
    }

    if (moment.state === "expired") {
      return {
        ok: false,
        error: "MOMENT_EXPIRED"
      };
    }

    if (moment.state === "sealed") {
      return {
        ok: true,
        moment: cloneMoment(moment)
      };
    }

    moment.state = "sealed";
    moment.sealed_at_ms = Date.now();

    return {
      ok: true,
      moment: cloneMoment(moment)
    };
  }

  async burn(moment_id: string): Promise<MomentResult> {
    const moment = this.momentsById.get(cleanId(moment_id));

    if (!moment) {
      return {
        ok: false,
        error: "MOMENT_NOT_FOUND"
      };
    }

    if (moment.state === "burned") {
      return {
        ok: true,
        moment: cloneMoment(moment)
      };
    }

    moment.state = "burned";
    moment.burned_at_ms = Date.now();

    return {
      ok: true,
      moment: cloneMoment(moment)
    };
  }

  async expire(): Promise<number> {
    const now = Date.now();
    let expired = 0;

    for (const moment of this.momentsById.values()) {
      if (moment.state !== "open") continue;
      if (moment.expires_at_ms === null) continue;
      if (moment.expires_at_ms > now) continue;

      moment.state = "expired";
      expired++;
    }

    return expired;
  }

  async get(moment_id: string): Promise<MomentRecord | null> {
    const moment = this.momentsById.get(cleanId(moment_id));
    return moment ? cloneMoment(moment) : null;
  }

  async listByTenant(tenant_id: string): Promise<MomentListResult> {
    const cleanTenant = cleanId(tenant_id);

    if (!cleanTenant) {
      return {
        ok: false,
        moments: [],
        error: "TENANT_ID_REQUIRED"
      };
    }

    const ids = this.tenantIndex.get(cleanTenant) ?? new Set<string>();

    return {
      ok: true,
      moments: this.recordsFromIds(ids)
    };
  }

  async listByParent(parent_moment_id: string): Promise<MomentListResult> {
    const cleanParent = cleanId(parent_moment_id);

    if (!cleanParent) {
      return {
        ok: false,
        moments: [],
        error: "PARENT_MOMENT_ID_REQUIRED"
      };
    }

    const ids = this.parentIndex.get(cleanParent) ?? new Set<string>();

    return {
      ok: true,
      moments: this.recordsFromIds(ids)
    };
  }

  async assertReplayAllowed(moment_id: string): Promise<boolean> {
    const moment = this.momentsById.get(cleanId(moment_id));

    if (!moment) return false;

    return moment.state === "open";
  }

  reset(): void {
    this.momentsById.clear();
    this.tenantIndex.clear();
    this.parentIndex.clear();
    this.sequence = 0;
  }

  private recordsFromIds(ids: Set<string>): MomentRecord[] {
    return Array.from(ids)
      .map((id) => this.momentsById.get(id))
      .filter((moment): moment is MomentRecord => Boolean(moment))
      .map(cloneMoment)
      .sort((a, b) => a.sequence - b.sequence);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    moment_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(moment_id);
    index.set(key, existing);
  }
}

export function makeMomentId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "moment-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

export function isMomentState(value: unknown): value is MomentState {
  return (
    value === "open" ||
    value === "sealed" ||
    value === "expired" ||
    value === "burned"
  );
}

export function isMomentSourceOrgan(value: unknown): value is MomentSourceOrgan {
  return (
    value === "footprint" ||
    value === "protection" ||
    value === "jobs" ||
    value === "presence" ||
    value === "allocator" ||
    value === "proximity" ||
    value === "hypogeum" ||
    value === "root" ||
    value === "unknown"
  );
}

function cleanSourceOrgan(value: unknown): MomentSourceOrgan {
  return isMomentSourceOrgan(value) ? value : "unknown";
}

function cloneMoment(moment: MomentRecord): MomentRecord {
  return {
    moment_id: moment.moment_id,
    tenant_id: moment.tenant_id,
    source_organ: moment.source_organ,
    surface_id: moment.surface_id ?? null,
    actor_private_id: moment.actor_private_id ?? null,
    job_id: moment.job_id ?? null,
    lease_id: moment.lease_id ?? null,
    parent_moment_id: moment.parent_moment_id ?? null,
    created_at_ms: moment.created_at_ms,
    expires_at_ms: moment.expires_at_ms ?? null,
    sealed_at_ms: moment.sealed_at_ms ?? null,
    burned_at_ms: moment.burned_at_ms ?? null,
    state: moment.state,
    sequence: moment.sequence,
    data: cloneData(moment.data)
  };
}

function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanNullableId(value: unknown): string | null {
  const clean = cleanId(value);
  return clean || null;
}

function cleanId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const clean = String(value).trim();

  if (!clean || clean.length > 180) {
    return "";
  }

  if (!/^[a-zA-Z0-9._:@/+=$-]+$/.test(clean)) {
    return "";
  }

  return clean;
      }
