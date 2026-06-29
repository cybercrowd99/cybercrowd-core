// src/Hypogeum_Binding.ts
// CyberCrowd Hypogeum Binding Organ
//
// Core lane organ.
//
// Purpose:
// - Bind surface organs to the 3-layer Hypogeum negative architecture.
// - Enforce IDL → Protection → Footprint → Direction doctrine.
// - Provide deterministic entry points into Echo, Deep, and Null chambers.
// - Prevent state leakage, replay, resurrection, and cross-tenant contamination.
// - Maintain continuity snapshots for identity-bound operations.
//
// This is not cybercrowd-net.
// This is not auth.
// This is not UI.
// This is not allocator authority.
// This is not presence ownership.
// This is not collapse ownership.

export type HypogeumDirection = "N" | "E" | "S" | "W" | "ANY";

export type HypogeumChamber = "echo" | "deep" | "null";

export interface IdentitySpine {
  idl: string;
  protection: string;
  footprint: string;
  direction: HypogeumDirection;
}

export interface HypogeumPayload {
  tenant_id: string;
  lease_id?: string | null;
  moment_ms: number;
  data: Record<string, unknown>;
}

export interface ContinuitySnapshot {
  key: string;
  moment_ms: number;
  spine: IdentitySpine;
  chamber: HypogeumChamber;
}

interface NormalizedEntry {
  key: string;
  spine: IdentitySpine;
  payload: HypogeumPayload;
}

export class HypogeumBinding {
  private readonly echoChamber = new Map<string, HypogeumPayload>();
  private readonly deepChamber = new Map<string, HypogeumPayload>();
  private readonly nullChamber = new Set<string>();

  // -----------------------------
  // Identity Binding
  // -----------------------------

  bindIdentity(spine: IdentitySpine): IdentitySpine {
    return this.normalizeSpine(spine);
  }

  bindFootprint(spine: IdentitySpine, footprint: string): IdentitySpine {
    const cleanSpine = this.normalizeSpine(spine);
    const cleanFootprint = cleanId(footprint);

    if (!cleanFootprint) {
      throw new Error("INVALID_FOOTPRINT_BINDING");
    }

    return {
      ...cleanSpine,
      footprint: cleanFootprint
    };
  }

  bindProtection(spine: IdentitySpine, protection: string): IdentitySpine {
    const cleanSpine = this.normalizeSpine(spine);
    const cleanProtection = cleanId(protection);

    if (!cleanProtection) {
      throw new Error("INVALID_PROTECTION_BINDING");
    }

    return {
      ...cleanSpine,
      protection: cleanProtection
    };
  }

  bindDirection(
    spine: IdentitySpine,
    direction: HypogeumDirection
  ): IdentitySpine {
    const cleanSpine = this.normalizeSpine(spine);

    if (!isHypogeumDirection(direction)) {
      throw new Error("INVALID_DIRECTION_BINDING");
    }

    return {
      ...cleanSpine,
      direction
    };
  }

  // -----------------------------
  // Chamber Entry
  // -----------------------------

  enterEcho(
    spine: IdentitySpine,
    payload: HypogeumPayload
  ): ContinuitySnapshot {
    const entry = this.normalizeEntry(spine, payload);

    if (this.nullChamber.has(entry.key)) {
      return this.snapshot(
        entry.key,
        entry.spine,
        entry.payload.moment_ms,
        "null"
      );
    }

    this.assertNoReplay(entry.key);

    this.echoChamber.set(entry.key, clonePayload(entry.payload));

    return this.snapshot(
      entry.key,
      entry.spine,
      entry.payload.moment_ms,
      "echo"
    );
  }

  enterDeep(
    spine: IdentitySpine,
    payload: HypogeumPayload
  ): ContinuitySnapshot {
    const entry = this.normalizeEntry(spine, payload);

    if (this.nullChamber.has(entry.key)) {
      return this.snapshot(
        entry.key,
        entry.spine,
        entry.payload.moment_ms,
        "null"
      );
    }

    if (!this.validateIdentity(entry.spine)) {
      return this.enterNull(entry.spine, entry.payload);
    }

    this.assertNoReplay(entry.key);

    this.deepChamber.set(entry.key, clonePayload(entry.payload));

    return this.snapshot(
      entry.key,
      entry.spine,
      entry.payload.moment_ms,
      "deep"
    );
  }

  enterNull(
    spine: IdentitySpine,
    payload: HypogeumPayload
  ): ContinuitySnapshot {
    const entry = this.normalizeEntry(spine, payload);

    this.echoChamber.delete(entry.key);
    this.deepChamber.delete(entry.key);
    this.nullChamber.add(entry.key);

    return this.snapshot(
      entry.key,
      entry.spine,
      entry.payload.moment_ms,
      "null"
    );
  }

  // -----------------------------
  // Burn Logic
  // -----------------------------

  burnPayload(spine: IdentitySpine, payload: HypogeumPayload): void {
    const entry = this.normalizeEntry(spine, payload);

    this.echoChamber.delete(entry.key);
    this.deepChamber.delete(entry.key);
    this.nullChamber.add(entry.key);
  }

  isBurned(spine: IdentitySpine, payload: HypogeumPayload): boolean {
    const entry = this.normalizeEntry(spine, payload);
    return this.nullChamber.has(entry.key);
  }

  // -----------------------------
  // Continuity Snapshot
  // -----------------------------

  snapshotContinuity(
    spine: IdentitySpine,
    chamber: HypogeumChamber
  ): ContinuitySnapshot {
    const cleanSpine = this.normalizeSpine(spine);
    const moment_ms = Date.now();

    const key = [
      "snapshot",
      cleanSpine.idl,
      cleanSpine.protection,
      cleanSpine.footprint,
      cleanSpine.direction,
      moment_ms
    ].join(":");

    return this.snapshot(key, cleanSpine, moment_ms, chamber);
  }

  // -----------------------------
  // Read Helpers
  // -----------------------------

  getEchoPayload(
    spine: IdentitySpine,
    payload: HypogeumPayload
  ): HypogeumPayload | null {
    const entry = this.normalizeEntry(spine, payload);
    const found = this.echoChamber.get(entry.key);

    return found ? clonePayload(found) : null;
  }

  getDeepPayload(
    spine: IdentitySpine,
    payload: HypogeumPayload
  ): HypogeumPayload | null {
    const entry = this.normalizeEntry(spine, payload);
    const found = this.deepChamber.get(entry.key);

    return found ? clonePayload(found) : null;
  }

  hasEcho(
    spine: IdentitySpine,
    payload: HypogeumPayload
  ): boolean {
    const entry = this.normalizeEntry(spine, payload);
    return this.echoChamber.has(entry.key);
  }

  hasDeep(
    spine: IdentitySpine,
    payload: HypogeumPayload
  ): boolean {
    const entry = this.normalizeEntry(spine, payload);
    return this.deepChamber.has(entry.key);
  }

  // -----------------------------
  // Internal Helpers
  // -----------------------------

  private normalizeEntry(
    spine: IdentitySpine,
    payload: HypogeumPayload
  ): NormalizedEntry {
    const cleanSpine = this.normalizeSpine(spine);
    const cleanPayload = this.normalizePayload(payload);

    return {
      key: this.makeKey(cleanSpine, cleanPayload),
      spine: cleanSpine,
      payload: cleanPayload
    };
  }

  private normalizeSpine(spine: IdentitySpine): IdentitySpine {
    if (!spine || typeof spine !== "object") {
      throw new Error("INVALID_IDENTITY_SPINE");
    }

    const idl = cleanId(spine.idl);
    const protection = cleanId(spine.protection);
    const footprint = cleanId(spine.footprint);

    if (!idl || !protection || !footprint) {
      throw new Error("INVALID_IDENTITY_SPINE");
    }

    if (!isHypogeumDirection(spine.direction)) {
      throw new Error("INVALID_HYPOGEUM_DIRECTION");
    }

    return {
      idl,
      protection,
      footprint,
      direction: spine.direction
    };
  }

  private normalizePayload(payload: HypogeumPayload): HypogeumPayload {
    if (!payload || typeof payload !== "object") {
      throw new Error("INVALID_HYPOGEUM_PAYLOAD");
    }

    const tenant_id = cleanId(payload.tenant_id);
    const lease_id = cleanNullableId(payload.lease_id ?? null);

    if (!tenant_id) {
      throw new Error("INVALID_HYPOGEUM_TENANT");
    }

    if (
      typeof payload.moment_ms !== "number" ||
      !Number.isInteger(payload.moment_ms) ||
      payload.moment_ms <= 0
    ) {
      throw new Error("INVALID_HYPOGEUM_MOMENT");
    }

    if (
      !payload.data ||
      typeof payload.data !== "object" ||
      Array.isArray(payload.data)
    ) {
      throw new Error("INVALID_HYPOGEUM_DATA");
    }

    return {
      tenant_id,
      lease_id,
      moment_ms: payload.moment_ms,
      data: cloneData(payload.data)
    };
  }

  private makeKey(spine: IdentitySpine, payload: HypogeumPayload): string {
    return [
      spine.idl,
      spine.protection,
      spine.footprint,
      spine.direction,
      payload.tenant_id,
      payload.lease_id ?? "no-lease",
      payload.moment_ms
    ].join(":");
  }

  private validateIdentity(spine: IdentitySpine): boolean {
    return Boolean(
      cleanId(spine.idl) &&
        cleanId(spine.protection) &&
        cleanId(spine.footprint) &&
        isHypogeumDirection(spine.direction)
    );
  }

  private assertNoReplay(key: string): void {
    if (
      this.echoChamber.has(key) ||
      this.deepChamber.has(key) ||
      this.nullChamber.has(key)
    ) {
      throw new Error("HYPOGEUM_REPLAY_BLOCKED");
    }
  }

  private snapshot(
    key: string,
    spine: IdentitySpine,
    moment_ms: number,
    chamber: HypogeumChamber
  ): ContinuitySnapshot {
    return {
      key,
      moment_ms,
      spine: { ...spine },
      chamber
    };
  }
}

export function isHypogeumDirection(
  value: unknown
): value is HypogeumDirection {
  return (
    value === "N" ||
    value === "E" ||
    value === "S" ||
    value === "W" ||
    value === "ANY"
  );
}

export function isHypogeumChamber(value: unknown): value is HypogeumChamber {
  return value === "echo" || value === "deep" || value === "null";
}

function clonePayload(payload: HypogeumPayload): HypogeumPayload {
  return {
    tenant_id: payload.tenant_id,
    lease_id: payload.lease_id ?? null,
    moment_ms: payload.moment_ms,
    data: cloneData(payload.data)
  };
}

function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    throw new Error("HYPOGEUM_DATA_NOT_CLONEABLE");
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

  if (!clean) {
    return "";
  }

  if (clean.length > 180) {
    return "";
  }

  if (!/^[a-zA-Z0-9._:@/+=$-]+$/.test(clean)) {
    return "";
  }

  return clean;
}
