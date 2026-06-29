// src/Digital_Human_Footprint_Organ.ts
// CyberCrowd — Digital Human Footprint Organ Implementation
//
// Store-backed proof-of-participation organ.
//
// Purpose:
// - Implement the Digital Human Footprint contract.
// - Preserve public_id and private_id as separate rails.
// - Store raw FootprintRecord internally.
// - Return public or protected views based on requested view mode.
// - Keep private_id from leaking through public views.
// - Support separate public_id and private_id indexing.
// - No elevation.
// - No extraction.
// - No hidden authority.
// - No auth ownership.
// - No presence ownership.
// - No collapse ownership.
// - All caller access must pass through the Protection Layer before reaching this organ.

import {
  type FootprintActivityType,
  type FootprintListResponse,
  type FootprintOrgan,
  type FootprintQuery,
  type FootprintRecord,
  type FootprintViewMode,
  type FootprintVisibility,
  type FootprintWriteRequest,
  type FootprintWriteResponse,
  isFootprintActivityType,
  isFootprintViewMode,
  isFootprintVisibility,
  makeFootprintId,
  toProtectedFootprintView,
  toPublicFootprintView
} from "./Digital_Human_Footprint";

export interface FootprintStore {
  put(record: FootprintRecord): Promise<void>;

  get(footprint_id: string): Promise<FootprintRecord | null>;

  list(query: FootprintQuery): Promise<FootprintRecord[]>;

  listByPublicId(public_id: string, query?: FootprintQuery): Promise<FootprintRecord[]>;

  listByPrivateId(private_id: string, query?: FootprintQuery): Promise<FootprintRecord[]>;
}

export interface FootprintOrganOptions {
  store: FootprintStore;
  now?: () => number;
}

export class DigitalHumanFootprintOrgan implements FootprintOrgan {
  private readonly store: FootprintStore;
  private readonly now: () => number;

  constructor(options: FootprintOrganOptions) {
    if (!options || !options.store) {
      throw new Error("FOOTPRINT_STORE_REQUIRED");
    }

    this.store = options.store;
    this.now = options.now ?? (() => Date.now());
  }

  async write(req: FootprintWriteRequest): Promise<FootprintWriteResponse> {
    const public_id = cleanId(req.public_id);
    const private_id = cleanId(req.private_id);
    const moment_id = cleanId(req.moment_id);
    const surface_id = cleanId(req.surface_id);
    const activity_type = cleanActivityType(req.activity_type);
    const visibility = cleanVisibility(req.visibility ?? "system-only");
    const value_link_id = cleanNullableId(req.value_link_id ?? null);

    if (!public_id) {
      return {
        ok: false,
        error: "PUBLIC_ID_REQUIRED"
      };
    }

    if (!private_id) {
      return {
        ok: false,
        error: "PRIVATE_ID_REQUIRED"
      };
    }

    if (!moment_id) {
      return {
        ok: false,
        error: "MOMENT_ID_REQUIRED"
      };
    }

    if (!surface_id) {
      return {
        ok: false,
        error: "SURFACE_ID_REQUIRED"
      };
    }

    if (!activity_type) {
      return {
        ok: false,
        error: "ACTIVITY_TYPE_INVALID"
      };
    }

    if (!visibility) {
      return {
        ok: false,
        error: "VISIBILITY_INVALID"
      };
    }

    const record: FootprintRecord = {
      footprint_id: makeFootprintId(),
      public_id,
      private_id,
      moment_id,
      surface_id,
      activity_type,
      value_link_id,
      visibility,
      created_at_ms: this.now()
    };

    await this.store.put(cloneRecord(record));

    return {
      ok: true,
      footprint: toProtectedFootprintView(record)
    };
  }

  async list(query: FootprintQuery): Promise<FootprintListResponse> {
    const cleanQuery = normalizeQuery(query);
    const view = cleanQuery.view ?? "public";

    let records: FootprintRecord[];

    if (cleanQuery.private_id) {
      records = await this.store.listByPrivateId(cleanQuery.private_id, cleanQuery);
    } else if (cleanQuery.public_id) {
      records = await this.store.listByPublicId(cleanQuery.public_id, cleanQuery);
    } else {
      records = await this.store.list(cleanQuery);
    }

    records = records
      .map(cloneRecord)
      .filter((record) => matchesQuery(record, cleanQuery))
      .sort((a, b) => b.created_at_ms - a.created_at_ms)
      .slice(0, cleanQuery.limit ?? 100);

    if (view === "protected") {
      return {
        ok: true,
        records: records.map(toProtectedFootprintView)
      };
    }

    return {
      ok: true,
      records: records.map(toPublicFootprintView)
    };
  }

  async get(
    footprint_id: string,
    view: FootprintViewMode = "public"
  ): Promise<
    | ReturnType<typeof toPublicFootprintView>
    | ReturnType<typeof toProtectedFootprintView>
    | null
  > {
    const id = cleanId(footprint_id);

    if (!id) {
      return null;
    }

    const record = await this.store.get(id);

    if (!record) {
      return null;
    }

    const cleanRecord = cloneRecord(record);
    const viewMode = isFootprintViewMode(view) ? view : "public";

    if (viewMode === "protected") {
      return toProtectedFootprintView(cleanRecord);
    }

    return toPublicFootprintView(cleanRecord);
  }
}

// In-memory store.
// Dev/test only.
// Keeps separate indexes for public_id and private_id.
export class InMemoryFootprintStore implements FootprintStore {
  private readonly recordsById = new Map<string, FootprintRecord>();
  private readonly publicIndex = new Map<string, Set<string>>();
  private readonly privateIndex = new Map<string, Set<string>>();

  async put(record: FootprintRecord): Promise<void> {
    const cleanRecord = normalizeRecord(record);

    this.recordsById.set(cleanRecord.footprint_id, cloneRecord(cleanRecord));
    this.addIndex(this.publicIndex, cleanRecord.public_id, cleanRecord.footprint_id);
    this.addIndex(this.privateIndex, cleanRecord.private_id, cleanRecord.footprint_id);
  }

  async get(footprint_id: string): Promise<FootprintRecord | null> {
    const id = cleanId(footprint_id);

    if (!id) {
      return null;
    }

    const record = this.recordsById.get(id);

    return record ? cloneRecord(record) : null;
  }

  async list(query: FootprintQuery): Promise<FootprintRecord[]> {
    const cleanQuery = normalizeQuery(query);

    return Array.from(this.recordsById.values())
      .map(cloneRecord)
      .filter((record) => matchesQuery(record, cleanQuery))
      .sort((a, b) => b.created_at_ms - a.created_at_ms)
      .slice(0, cleanQuery.limit ?? 100);
  }

  async listByPublicId(
    public_id: string,
    query: FootprintQuery = {}
  ): Promise<FootprintRecord[]> {
    const cleanPublicId = cleanId(public_id);

    if (!cleanPublicId) {
      return [];
    }

    const ids = this.publicIndex.get(cleanPublicId);

    if (!ids) {
      return [];
    }

    const cleanQuery = {
      ...normalizeQuery(query),
      public_id: cleanPublicId
    };

    return this.recordsFromIds(ids, cleanQuery);
  }

  async listByPrivateId(
    private_id: string,
    query: FootprintQuery = {}
  ): Promise<FootprintRecord[]> {
    const cleanPrivateId = cleanId(private_id);

    if (!cleanPrivateId) {
      return [];
    }

    const ids = this.privateIndex.get(cleanPrivateId);

    if (!ids) {
      return [];
    }

    const cleanQuery = {
      ...normalizeQuery(query),
      private_id: cleanPrivateId
    };

    return this.recordsFromIds(ids, cleanQuery);
  }

  reset(): void {
    this.recordsById.clear();
    this.publicIndex.clear();
    this.privateIndex.clear();
  }

  private recordsFromIds(
    ids: Set<string>,
    query: FootprintQuery
  ): FootprintRecord[] {
    return Array.from(ids)
      .map((id) => this.recordsById.get(id))
      .filter((record): record is FootprintRecord => Boolean(record))
      .map(cloneRecord)
      .filter((record) => matchesQuery(record, query))
      .sort((a, b) => b.created_at_ms - a.created_at_ms)
      .slice(0, query.limit ?? 100);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    footprint_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();

    existing.add(footprint_id);
    index.set(key, existing);
  }
}

function normalizeRecord(record: FootprintRecord): FootprintRecord {
  if (!record || typeof record !== "object") {
    throw new Error("FOOTPRINT_RECORD_INVALID");
  }

  const footprint_id = cleanId(record.footprint_id);
  const public_id = cleanId(record.public_id);
  const private_id = cleanId(record.private_id);
  const moment_id = cleanId(record.moment_id);
  const surface_id = cleanId(record.surface_id);
  const activity_type = cleanActivityType(record.activity_type);
  const visibility = cleanVisibility(record.visibility);
  const value_link_id = cleanNullableId(record.value_link_id ?? null);

  if (!footprint_id) {
    throw new Error("FOOTPRINT_ID_REQUIRED");
  }

  if (!public_id) {
    throw new Error("PUBLIC_ID_REQUIRED");
  }

  if (!private_id) {
    throw new Error("PRIVATE_ID_REQUIRED");
  }

  if (!moment_id) {
    throw new Error("MOMENT_ID_REQUIRED");
  }

  if (!surface_id) {
    throw new Error("SURFACE_ID_REQUIRED");
  }

  if (!activity_type) {
    throw new Error("ACTIVITY_TYPE_INVALID");
  }

  if (!visibility) {
    throw new Error("VISIBILITY_INVALID");
  }

  if (
    typeof record.created_at_ms !== "number" ||
    !Number.isFinite(record.created_at_ms) ||
    record.created_at_ms <= 0
  ) {
    throw new Error("CREATED_AT_INVALID");
  }

  return {
    footprint_id,
    public_id,
    private_id,
    moment_id,
    surface_id,
    activity_type,
    value_link_id,
    visibility,
    created_at_ms: record.created_at_ms
  };
}

function normalizeQuery(query: FootprintQuery = {}): FootprintQuery {
  const public_id = cleanOptionalId(query.public_id);
  const private_id = cleanOptionalId(query.private_id);
  const surface_id = cleanOptionalId(query.surface_id);
  const activity_type = cleanOptionalActivityType(query.activity_type);

  const since_ms =
    typeof query.since_ms === "number" && Number.isFinite(query.since_ms)
      ? query.since_ms
      : undefined;

  const until_ms =
    typeof query.until_ms === "number" && Number.isFinite(query.until_ms)
      ? query.until_ms
      : undefined;

  const limit =
    typeof query.limit === "number" &&
    Number.isInteger(query.limit) &&
    query.limit > 0
      ? Math.min(query.limit, 500)
      : 100;

  const view = isFootprintViewMode(query.view) ? query.view : "public";

  return {
    public_id: public_id ?? undefined,
    private_id: private_id ?? undefined,
    surface_id: surface_id ?? undefined,
    activity_type: activity_type ?? undefined,
    since_ms,
    until_ms,
    limit,
    view
  };
}

function matchesQuery(record: FootprintRecord, query: FootprintQuery): boolean {
  if (query.public_id && record.public_id !== query.public_id) return false;
  if (query.private_id && record.private_id !== query.private_id) return false;
  if (query.surface_id && record.surface_id !== query.surface_id) return false;
  if (query.activity_type && record.activity_type !== query.activity_type) return false;
  if (typeof query.since_ms === "number" && record.created_at_ms < query.since_ms) {
    return false;
  }
  if (typeof query.until_ms === "number" && record.created_at_ms > query.until_ms) {
    return false;
  }

  return true;
}

function cloneRecord(record: FootprintRecord): FootprintRecord {
  return {
    footprint_id: record.footprint_id,
    public_id: record.public_id,
    private_id: record.private_id,
    moment_id: record.moment_id,
    surface_id: record.surface_id,
    activity_type: record.activity_type,
    value_link_id: record.value_link_id ?? null,
    visibility: record.visibility,
    created_at_ms: record.created_at_ms
  };
}

function cleanActivityType(value: unknown): FootprintActivityType | null {
  return isFootprintActivityType(value) ? value : null;
}

function cleanOptionalActivityType(
  value: unknown
): FootprintActivityType | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return cleanActivityType(value);
}

function cleanVisibility(value: unknown): FootprintVisibility | null {
  return isFootprintVisibility(value) ? value : null;
}

function cleanOptionalId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return cleanNullableId(value);
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
