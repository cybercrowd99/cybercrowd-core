// src/cybercrowd-narrative-stabilizer.ts
//
// CyberCrowd Narrative Stabilizer Organ
//
// ONE JOB:
// Restore readable order after cognitive load and meaning pressure events,
// so narrative, geometric, and logical meaning does not collapse into confusion.
//
// This is CORE physics.
// This is NOT persona.
// This is NOT IDL.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// CLB detects overload.
// Meaning Pressure Valve releases pressure.
// Narrative Stabilizer restores readable order.

export type NarrativeStabilizerStatus =
  | "stable"
  | "stabilizing"
  | "deferred"
  | "paused"
  | "sealed"
  | "burned";

export type NarrativeStabilizerInputKind =
  | "narrative"
  | "geometric"
  | "logical"
  | "identity"
  | "work"
  | "physics"
  | "system"
  | "manual"
  | "unknown";

export type NarrativeStabilizerPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type NarrativeStabilizerAction =
  | "keep"
  | "compress"
  | "defer"
  | "reorder"
  | "pause"
  | "seal"
  | "burn";

export interface NarrativeStabilizerInput {
  input_id?: string | null;
  at_ms: number;
  kind: NarrativeStabilizerInputKind;
  priority?: NarrativeStabilizerPriority;
  title: string;
  content: string;
  source_ref_id?: string | null;
  data?: Record<string, unknown>;
}

export interface NarrativeStabilizerLane {
  lane_id: string;
  kind: NarrativeStabilizerInputKind;
  title: string;
  summary: string | null;
  item_count: number;
  priority: NarrativeStabilizerPriority;
  updated_at_ms: number;
}

export interface NarrativeStabilizerItem {
  item_id: string;
  input_id: string | null;
  kind: NarrativeStabilizerInputKind;
  priority: NarrativeStabilizerPriority;
  title: string;
  content: string;
  source_ref_id: string | null;
  action: NarrativeStabilizerAction;
  deferred: boolean;
  sealed: boolean;
  created_at_ms: number;
  updated_at_ms: number;
  data: Record<string, unknown>;
}

export interface NarrativeStabilizerState {
  status: NarrativeStabilizerStatus;
  active_lane_id: string | null;
  pressure_status: string | null;
  last_action: NarrativeStabilizerAction;
  stabilized_count: number;
  deferred_count: number;
  paused: boolean;
  last_updated_at_ms: number;
}

export interface NarrativeStabilizerApplyParams {
  pressure_status?: string | null;
  pressure_mode?: string | null;
  overloaded?: boolean;
  max_active_items?: number;
}

export interface NarrativeStabilizerResult {
  ok: boolean;
  state: NarrativeStabilizerState;
  lanes: NarrativeStabilizerLane[];
  items: NarrativeStabilizerItem[];
  deferred: NarrativeStabilizerItem[];
  error?: string;
}

export interface NarrativeStabilizerSnapshot {
  state: NarrativeStabilizerState;
  lanes: NarrativeStabilizerLane[];
  active_items: NarrativeStabilizerItem[];
  deferred_items: NarrativeStabilizerItem[];
  stable: boolean;
}

export class NarrativeStabilizer {
  private state: NarrativeStabilizerState;
  private lanes = new Map<string, NarrativeStabilizerLane>();
  private items = new Map<string, NarrativeStabilizerItem>();
  private deferred = new Map<string, NarrativeStabilizerItem>();

  constructor(initial?: Partial<NarrativeStabilizerState>) {
    const now = Date.now();

    this.state = {
      status: cleanStatus(initial?.status ?? "stable"),
      active_lane_id: cleanNullableId(initial?.active_lane_id ?? null),
      pressure_status: cleanNullableText(initial?.pressure_status ?? null, 120),
      last_action: cleanAction(initial?.last_action ?? "keep"),
      stabilized_count: cleanCount(initial?.stabilized_count ?? 0),
      deferred_count: cleanCount(initial?.deferred_count ?? 0),
      paused: Boolean(initial?.paused ?? false),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Apply narrative/geometric/logical inputs into readable lanes.
   *
   * If pressure is high, items may be compressed, deferred, reordered, or paused.
   */
  apply(
    inputs: NarrativeStabilizerInput[],
    params: NarrativeStabilizerApplyParams = {}
  ): NarrativeStabilizerResult {
    if (!Array.isArray(inputs)) {
      return this.result("INPUTS_REQUIRED");
    }

    const now = Date.now();
    const pressureMode = cleanNullableText(params.pressure_mode ?? null, 80);
    const pressureStatus = cleanNullableText(params.pressure_status ?? null, 80);
    const overloaded = Boolean(params.overloaded ?? false);
    const maxActiveItems = cleanPositiveCount(params.max_active_items ?? 25, 25);

    let action: NarrativeStabilizerAction = "keep";

    if (pressureMode === "compress") action = "compress";
    if (pressureMode === "defer") action = "defer";
    if (pressureMode === "vent") action = "reorder";
    if (pressureMode === "pause") action = "pause";
    if (pressureMode === "burn") action = "burn";

    if (overloaded && action === "keep") {
      action = "compress";
    }

    for (const input of inputs) {
      const item = normalizeInput(input, action, now);

      if (!item) continue;

      const lane = this.getOrCreateLane(item.kind, now);

      item.updated_at_ms = now;
      lane.item_count += 1;
      lane.updated_at_ms = now;
      lane.priority = strongerPriority(lane.priority, item.priority);

      if (!lane.summary) {
        lane.summary = item.title;
      }

      this.lanes.set(lane.lane_id, cloneLane(lane));

      const shouldDefer =
        action === "defer" ||
        action === "pause" ||
        this.items.size >= maxActiveItems;

      if (shouldDefer) {
        item.action = action === "pause" ? "pause" : "defer";
        item.deferred = true;
        this.deferred.set(item.item_id, cloneItem(item));
        this.state.deferred_count += 1;
      } else if (action === "burn") {
        item.action = "burn";
        item.sealed = true;
        this.deferred.set(item.item_id, cloneItem(item));
        this.state.deferred_count += 1;
      } else {
        item.action = action;
        this.items.set(item.item_id, cloneItem(item));
        this.state.stabilized_count += 1;
      }

      this.state.active_lane_id = lane.lane_id;
    }

    this.state.status = statusFromAction(action);
    this.state.pressure_status = pressureStatus;
    this.state.last_action = action;
    this.state.paused = action === "pause";
    this.state.last_updated_at_ms = now;

    return this.result();
  }

  /**
   * Move deferred meaning back into the active readable stream.
   */
  restoreDeferred(limit: number = 10): NarrativeStabilizerResult {
    const cleanLimit = cleanPositiveCount(limit, 10);
    const now = Date.now();

    const candidates = Array.from(this.deferred.values())
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
      .slice(0, cleanLimit);

    for (const item of candidates) {
      if (item.action === "burn" || item.sealed) {
        continue;
      }

      const restored: NarrativeStabilizerItem = {
        ...cloneItem(item),
        action: "keep",
        deferred: false,
        updated_at_ms: now
      };

      this.items.set(restored.item_id, restored);
      this.deferred.delete(restored.item_id);

      this.state.stabilized_count += 1;
      this.state.deferred_count = Math.max(0, this.state.deferred_count - 1);
    }

    this.state.status = this.deferred.size > 0 ? "deferred" : "stable";
    this.state.last_action = "keep";
    this.state.paused = false;
    this.state.last_updated_at_ms = now;

    return this.result();
  }

  /**
   * Pause the stabilizer without burning or deleting meaning.
   */
  pause(at_ms: number = Date.now()): NarrativeStabilizerState {
    this.state = {
      ...this.state,
      status: "paused",
      last_action: "pause",
      paused: true,
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  /**
   * Resume the stabilizer.
   */
  resume(at_ms: number = Date.now()): NarrativeStabilizerState {
    this.state = {
      ...this.state,
      status: this.deferred.size > 0 ? "deferred" : "stable",
      last_action: "keep",
      paused: false,
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  /**
   * Seal active and deferred meaning.
   */
  seal(at_ms: number = Date.now()): NarrativeStabilizerState {
    const now = cleanTimestamp(at_ms, Date.now());

    for (const [id, item] of this.items.entries()) {
      this.items.set(id, {
        ...cloneItem(item),
        action: "seal",
        sealed: true,
        updated_at_ms: now
      });
    }

    for (const [id, item] of this.deferred.entries()) {
      this.deferred.set(id, {
        ...cloneItem(item),
        action: "seal",
        sealed: true,
        updated_at_ms: now
      });
    }

    this.state = {
      ...this.state,
      status: "sealed",
      last_action: "seal",
      paused: true,
      last_updated_at_ms: now
    };

    return this.getState();
  }

  /**
   * Burn active and deferred meaning from this stabilizer memory.
   */
  burn(at_ms: number = Date.now()): NarrativeStabilizerState {
    this.items.clear();
    this.deferred.clear();

    this.state = {
      ...this.state,
      status: "burned",
      active_lane_id: null,
      last_action: "burn",
      paused: true,
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  /**
   * Read current stabilizer state.
   */
  getState(): NarrativeStabilizerState {
    return {
      status: this.state.status,
      active_lane_id: this.state.active_lane_id,
      pressure_status: this.state.pressure_status,
      last_action: this.state.last_action,
      stabilized_count: this.state.stabilized_count,
      deferred_count: this.state.deferred_count,
      paused: this.state.paused,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  /**
   * Read operational snapshot.
   */
  snapshot(): NarrativeStabilizerSnapshot {
    return {
      state: this.getState(),
      lanes: this.getLanes(),
      active_items: this.getItems(),
      deferred_items: this.getDeferred(),
      stable: this.state.status === "stable"
    };
  }

  /**
   * Read active readable items.
   */
  getItems(): NarrativeStabilizerItem[] {
    return Array.from(this.items.values())
      .map(cloneItem)
      .sort(compareItems);
  }

  /**
   * Read deferred items.
   */
  getDeferred(): NarrativeStabilizerItem[] {
    return Array.from(this.deferred.values())
      .map(cloneItem)
      .sort(compareItems);
  }

  /**
   * Read lanes.
   */
  getLanes(): NarrativeStabilizerLane[] {
    return Array.from(this.lanes.values())
      .map(cloneLane)
      .sort((a, b) => b.updated_at_ms - a.updated_at_ms);
  }

  /**
   * Reset stabilizer memory.
   */
  reset(at_ms: number = Date.now()): NarrativeStabilizerState {
    this.lanes.clear();
    this.items.clear();
    this.deferred.clear();

    this.state = {
      status: "stable",
      active_lane_id: null,
      pressure_status: null,
      last_action: "keep",
      stabilized_count: 0,
      deferred_count: 0,
      paused: false,
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  private getOrCreateLane(
    kind: NarrativeStabilizerInputKind,
    now: number
  ): NarrativeStabilizerLane {
    const laneId = "lane-" + kind;
    const existing = this.lanes.get(laneId);

    if (existing) {
      return cloneLane(existing);
    }

    const lane: NarrativeStabilizerLane = {
      lane_id: laneId,
      kind,
      title: titleFromKind(kind),
      summary: null,
      item_count: 0,
      priority: "normal",
      updated_at_ms: now
    };

    this.lanes.set(laneId, cloneLane(lane));

    return lane;
  }

  private result(error?: string): NarrativeStabilizerResult {
    return {
      ok: !error,
      state: this.getState(),
      lanes: this.getLanes(),
      items: this.getItems(),
      deferred: this.getDeferred(),
      error
    };
  }
}

export const CyberCrowdNarrativeStabilizer =
  new NarrativeStabilizer();

function normalizeInput(
  input: NarrativeStabilizerInput,
  action: NarrativeStabilizerAction,
  fallbackTime: number
): NarrativeStabilizerItem | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const title = cleanText(input.title, 240);
  const content = cleanText(input.content, 8000);
  const kind = cleanKind(input.kind);
  const priority = cleanPriority(input.priority ?? "normal");

  if (!title || !content) {
    return null;
  }

  return {
    item_id: makeItemId(),
    input_id: cleanNullableId(input.input_id ?? null),
    kind,
    priority,
    title,
    content: action === "compress" ? compressContent(content) : content,
    source_ref_id: cleanNullableId(input.source_ref_id ?? null),
    action,
    deferred: false,
    sealed: false,
    created_at_ms: cleanTimestamp(input.at_ms, fallbackTime),
    updated_at_ms: fallbackTime,
    data: publicDataOnly(input.data ?? {})
  };
}

function statusFromAction(
  action: NarrativeStabilizerAction
): NarrativeStabilizerStatus {
  if (action === "keep") return "stable";
  if (action === "compress") return "stabilizing";
  if (action === "reorder") return "stabilizing";
  if (action === "defer") return "deferred";
  if (action === "pause") return "paused";
  if (action === "seal") return "sealed";
  if (action === "burn") return "burned";

  return "stable";
}

function compareItems(
  a: NarrativeStabilizerItem,
  b: NarrativeStabilizerItem
): number {
  const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return b.created_at_ms - a.created_at_ms;
}

function priorityRank(priority: NarrativeStabilizerPriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "normal") return 2;
  if (priority === "low") return 1;

  return 2;
}

function strongerPriority(
  a: NarrativeStabilizerPriority,
  b: NarrativeStabilizerPriority
): NarrativeStabilizerPriority {
  return priorityRank(b) > priorityRank(a) ? b : a;
}

function titleFromKind(kind: NarrativeStabilizerInputKind): string {
  if (kind === "narrative") return "Narrative Lane";
  if (kind === "geometric") return "Geometric Lane";
  if (kind === "logical") return "Logical Lane";
  if (kind === "identity") return "Identity Lane";
  if (kind === "work") return "Work Lane";
  if (kind === "physics") return "Physics Lane";
  if (kind === "system") return "System Lane";
  if (kind === "manual") return "Manual Lane";

  return "Unknown Lane";
}

function compressContent(content: string): string {
  const clean = cleanText(content, 8000);

  if (clean.length <= 1200) {
    return clean;
  }

  return clean.slice(0, 1100).trim() + " ... [compressed]";
}

function cleanKind(value: unknown): NarrativeStabilizerInputKind {
  if (
    value === "narrative" ||
    value === "geometric" ||
    value === "logical" ||
    value === "identity" ||
    value === "work" ||
    value === "physics" ||
    value === "system" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanPriority(value: unknown): NarrativeStabilizerPriority {
  if (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  return "normal";
}

function cleanAction(value: unknown): NarrativeStabilizerAction {
  if (
    value === "keep" ||
    value === "compress" ||
    value === "defer" ||
    value === "reorder" ||
    value === "pause" ||
    value === "seal" ||
    value === "burn"
  ) {
    return value;
  }

  return "keep";
}

function cleanStatus(value: unknown): NarrativeStabilizerStatus {
  if (
    value === "stable" ||
    value === "stabilizing" ||
    value === "deferred" ||
    value === "paused" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "stable";
}

function makeItemId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "narrative-item-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneLane(
  lane: NarrativeStabilizerLane
): NarrativeStabilizerLane {
  return {
    lane_id: lane.lane_id,
    kind: lane.kind,
    title: lane.title,
    summary: lane.summary ?? null,
    item_count: lane.item_count,
    priority: lane.priority,
    updated_at_ms: lane.updated_at_ms
  };
}

function cloneItem(
  item: NarrativeStabilizerItem
): NarrativeStabilizerItem {
  return {
    item_id: item.item_id,
    input_id: item.input_id ?? null,
    kind: item.kind,
    priority: item.priority,
    title: item.title,
    content: item.content,
    source_ref_id: item.source_ref_id ?? null,
    action: item.action,
    deferred: item.deferred,
    sealed: item.sealed,
    created_at_ms: item.created_at_ms,
    updated_at_ms: item.updated_at_ms,
    data: publicDataOnly(item.data)
  };
}

function publicDataOnly(
  data: Record<string, unknown>
): Record<string, unknown> {
  const clone = cloneData(data);
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(clone)) {
    const cleanKey = key.toLowerCase();

    if (
      cleanKey.includes("private") ||
      cleanKey.includes("secret") ||
      cleanKey.includes("token") ||
      cleanKey.includes("auth") ||
      cleanKey.includes("password")
    ) {
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

function cloneData(
  data: Record<string, unknown>
): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanPositiveCount(
  value: unknown,
  fallback: number
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
}

function cleanCount(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return Math.floor(value);
  }

  return 0;
}

function cleanTimestamp(
  value: unknown,
  fallback: number
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value;
  }

  return fallback;
}

function cleanNullableText(
  value: unknown,
  maxLength: number
): string | null {
  const text = cleanText(value, maxLength);
  return text || null;
}

function cleanText(
  value: unknown,
  maxLength: number
): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
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
