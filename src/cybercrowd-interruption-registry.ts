// src/cybercrowd-interruption-registry.ts
//
// CyberCrowd Interruption Registry Organ
//
// ONE JOB:
// Record interruptions during a Focus Window so outside hits are not lost,
// ignored, or allowed to hijack the active lane.
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
// Focus Window protects the time.
// Interruption Registry records what tried to break into that time.

export type InterruptionStatus =
  | "recorded"
  | "deferred"
  | "routed"
  | "released"
  | "dismissed"
  | "sealed"
  | "burned";

export type InterruptionKind =
  | "lane-hit"
  | "message"
  | "system"
  | "identity"
  | "work"
  | "persona"
  | "reputation"
  | "governance"
  | "physics"
  | "manual"
  | "unknown";

export type InterruptionPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type InterruptionAction =
  | "record"
  | "defer"
  | "route"
  | "release"
  | "dismiss"
  | "seal"
  | "burn";

export type InterruptionReason =
  | "focus-window-active"
  | "active-lane-locked"
  | "outside-lane-hit"
  | "sequence-risk"
  | "manual"
  | "unknown";

export interface InterruptionRecord {
  interruption_id: string;

  window_id: string | null;
  lock_id: string | null;

  active_lane_id: string | null;
  incoming_lane_id: string | null;

  kind: InterruptionKind;
  priority: InterruptionPriority;
  status: InterruptionStatus;
  reason: InterruptionReason;

  title: string;
  message: string | null;

  source_ref_id: string | null;
  route_target_lane_id: string | null;

  recorded_at_ms: number;
  updated_at_ms: number;
  deferred_at_ms: number | null;
  routed_at_ms: number | null;
  released_at_ms: number | null;
  dismissed_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface RegisterInterruptionRequest {
  window_id?: string | null;
  lock_id?: string | null;

  active_lane_id?: string | null;
  incoming_lane_id?: string | null;

  kind?: InterruptionKind;
  priority?: InterruptionPriority;
  reason?: InterruptionReason;

  title: string;
  message?: string | null;

  source_ref_id?: string | null;
  route_target_lane_id?: string | null;

  data?: Record<string, unknown>;
}

export interface InterruptionRegistryState {
  status: InterruptionStatus | "idle";
  recorded_count: number;
  deferred_count: number;
  routed_count: number;
  released_count: number;
  dismissed_count: number;
  sealed_count: number;
  burned_count: number;
  last_action: InterruptionAction | null;
  last_reason: InterruptionReason;
  last_updated_at_ms: number;
}

export interface InterruptionRegistryResult {
  ok: boolean;
  state: InterruptionRegistryState;
  interruption?: InterruptionRecord;
  interruptions: InterruptionRecord[];
  deferred: InterruptionRecord[];
  routed: InterruptionRecord[];
  released: InterruptionRecord[];
  error?: string;
}

export interface InterruptionRegistrySnapshot {
  state: InterruptionRegistryState;
  interruptions: InterruptionRecord[];
  deferred: InterruptionRecord[];
  routed: InterruptionRecord[];
  released: InterruptionRecord[];
  stable: boolean;
}

export class InterruptionRegistry {
  private state: InterruptionRegistryState;
  private interruptions = new Map<string, InterruptionRecord>();
  private deferred = new Map<string, InterruptionRecord>();
  private routed = new Map<string, InterruptionRecord>();
  private released = new Map<string, InterruptionRecord>();

  constructor(initial?: Partial<InterruptionRegistryState>) {
    const now = Date.now();

    this.state = {
      status: cleanRegistryStatus(initial?.status ?? "idle"),
      recorded_count: cleanCount(initial?.recorded_count ?? 0),
      deferred_count: cleanCount(initial?.deferred_count ?? 0),
      routed_count: cleanCount(initial?.routed_count ?? 0),
      released_count: cleanCount(initial?.released_count ?? 0),
      dismissed_count: cleanCount(initial?.dismissed_count ?? 0),
      sealed_count: cleanCount(initial?.sealed_count ?? 0),
      burned_count: cleanCount(initial?.burned_count ?? 0),
      last_action: cleanNullableAction(initial?.last_action ?? null),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Record an interruption without allowing it to hijack the active lane.
   */
  record(request: RegisterInterruptionRequest): InterruptionRegistryResult {
    const title = cleanText(request?.title, 240);

    if (!title) {
      return this.result("INTERRUPTION_TITLE_REQUIRED");
    }

    const now = Date.now();

    const interruption: InterruptionRecord = {
      interruption_id: makeInterruptionId(),

      window_id: cleanNullableId(request?.window_id ?? null),
      lock_id: cleanNullableId(request?.lock_id ?? null),

      active_lane_id: cleanNullableId(request?.active_lane_id ?? null),
      incoming_lane_id: cleanNullableId(request?.incoming_lane_id ?? null),

      kind: cleanKind(request?.kind ?? "unknown"),
      priority: cleanPriority(request?.priority ?? "normal"),
      status: "recorded",
      reason: cleanReason(request?.reason ?? "focus-window-active"),

      title,
      message: cleanNullableText(request?.message ?? null, 2000),

      source_ref_id: cleanNullableId(request?.source_ref_id ?? null),
      route_target_lane_id: cleanNullableId(
        request?.route_target_lane_id ?? null
      ),

      recorded_at_ms: now,
      updated_at_ms: now,
      deferred_at_ms: null,
      routed_at_ms: null,
      released_at_ms: null,
      dismissed_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      data: publicDataOnly(request?.data ?? {})
    };

    this.interruptions.set(
      interruption.interruption_id,
      cloneInterruption(interruption)
    );

    this.state = {
      ...this.state,
      status: "recorded",
      recorded_count: this.state.recorded_count + 1,
      last_action: "record",
      last_reason: interruption.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, interruption);
  }

  /**
   * Defer an interruption until focus is released.
   */
  defer(interruption_id: string): InterruptionRegistryResult {
    const interruption = this.interruptions.get(cleanId(interruption_id));

    if (!interruption) {
      return this.result("INTERRUPTION_NOT_FOUND");
    }

    if (!canMove(interruption.status, "deferred")) {
      return this.result("INTERRUPTION_STATE_LOCKED", interruption);
    }

    const now = Date.now();

    const updated: InterruptionRecord = {
      ...cloneInterruption(interruption),
      status: "deferred",
      updated_at_ms: now,
      deferred_at_ms: now
    };

    this.interruptions.set(updated.interruption_id, cloneInterruption(updated));
    this.deferred.set(updated.interruption_id, cloneInterruption(updated));

    this.state = {
      ...this.state,
      status: "deferred",
      deferred_count: this.state.deferred_count + 1,
      last_action: "defer",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Route an interruption to a target lane after focus protection.
   */
  route(
    interruption_id: string,
    route_target_lane_id?: string | null
  ): InterruptionRegistryResult {
    const interruption = this.interruptions.get(cleanId(interruption_id));

    if (!interruption) {
      return this.result("INTERRUPTION_NOT_FOUND");
    }

    if (!canMove(interruption.status, "routed")) {
      return this.result("INTERRUPTION_STATE_LOCKED", interruption);
    }

    const targetLaneId =
      cleanNullableId(route_target_lane_id ?? null) ??
      interruption.route_target_lane_id ??
      interruption.incoming_lane_id;

    if (!targetLaneId) {
      return this.result("ROUTE_TARGET_LANE_ID_REQUIRED", interruption);
    }

    const now = Date.now();

    const updated: InterruptionRecord = {
      ...cloneInterruption(interruption),
      status: "routed",
      route_target_lane_id: targetLaneId,
      updated_at_ms: now,
      routed_at_ms: now
    };

    this.interruptions.set(updated.interruption_id, cloneInterruption(updated));
    this.deferred.delete(updated.interruption_id);
    this.routed.set(updated.interruption_id, cloneInterruption(updated));

    this.state = {
      ...this.state,
      status: "routed",
      routed_count: this.state.routed_count + 1,
      last_action: "route",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Release an interruption after the focus window closes.
   */
  release(interruption_id: string): InterruptionRegistryResult {
    const interruption = this.interruptions.get(cleanId(interruption_id));

    if (!interruption) {
      return this.result("INTERRUPTION_NOT_FOUND");
    }

    if (!canMove(interruption.status, "released")) {
      return this.result("INTERRUPTION_STATE_LOCKED", interruption);
    }

    const now = Date.now();

    const updated: InterruptionRecord = {
      ...cloneInterruption(interruption),
      status: "released",
      updated_at_ms: now,
      released_at_ms: now
    };

    this.interruptions.set(updated.interruption_id, cloneInterruption(updated));
    this.deferred.delete(updated.interruption_id);
    this.routed.delete(updated.interruption_id);
    this.released.set(updated.interruption_id, cloneInterruption(updated));

    this.state = {
      ...this.state,
      status: "released",
      released_count: this.state.released_count + 1,
      last_action: "release",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Dismiss an interruption without deleting it.
   */
  dismiss(interruption_id: string): InterruptionRegistryResult {
    const interruption = this.interruptions.get(cleanId(interruption_id));

    if (!interruption) {
      return this.result("INTERRUPTION_NOT_FOUND");
    }

    if (!canMove(interruption.status, "dismissed")) {
      return this.result("INTERRUPTION_STATE_LOCKED", interruption);
    }

    const now = Date.now();

    const updated: InterruptionRecord = {
      ...cloneInterruption(interruption),
      status: "dismissed",
      updated_at_ms: now,
      dismissed_at_ms: now
    };

    this.interruptions.set(updated.interruption_id, cloneInterruption(updated));
    this.deferred.delete(updated.interruption_id);
    this.routed.delete(updated.interruption_id);
    this.released.delete(updated.interruption_id);

    this.state = {
      ...this.state,
      status: "dismissed",
      dismissed_count: this.state.dismissed_count + 1,
      last_action: "dismiss",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Release all deferred interruptions.
   */
  releaseDeferred(limit: number = 25): InterruptionRegistryResult {
    const cleanLimit = cleanPositiveCount(limit, 25);

    const records = Array.from(this.deferred.values())
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
      .slice(0, cleanLimit);

    let last: InterruptionRecord | undefined;

    for (const record of records) {
      const released = this.release(record.interruption_id);
      if (released.interruption) {
        last = released.interruption;
      }
    }

    return this.result(undefined, last);
  }

  /**
   * Seal an interruption without deleting it.
   */
  seal(interruption_id: string): InterruptionRegistryResult {
    const interruption = this.interruptions.get(cleanId(interruption_id));

    if (!interruption) {
      return this.result("INTERRUPTION_NOT_FOUND");
    }

    if (!canMove(interruption.status, "sealed")) {
      return this.result("INTERRUPTION_STATE_LOCKED", interruption);
    }

    const now = Date.now();

    const updated: InterruptionRecord = {
      ...cloneInterruption(interruption),
      status: "sealed",
      updated_at_ms: now,
      sealed_at_ms: now
    };

    this.interruptions.set(updated.interruption_id, cloneInterruption(updated));

    if (this.deferred.has(updated.interruption_id)) {
      this.deferred.set(updated.interruption_id, cloneInterruption(updated));
    }

    if (this.routed.has(updated.interruption_id)) {
      this.routed.set(updated.interruption_id, cloneInterruption(updated));
    }

    if (this.released.has(updated.interruption_id)) {
      this.released.set(updated.interruption_id, cloneInterruption(updated));
    }

    this.state = {
      ...this.state,
      status: "sealed",
      sealed_count: this.state.sealed_count + 1,
      last_action: "seal",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Burn an interruption from live memory.
   */
  burn(interruption_id: string): InterruptionRegistryResult {
    const cleanInterruptionId = cleanId(interruption_id);
    const interruption = this.interruptions.get(cleanInterruptionId);

    if (!interruption) {
      return this.result("INTERRUPTION_NOT_FOUND");
    }

    this.interruptions.delete(cleanInterruptionId);
    this.deferred.delete(cleanInterruptionId);
    this.routed.delete(cleanInterruptionId);
    this.released.delete(cleanInterruptionId);

    const now = Date.now();

    const burned: InterruptionRecord = {
      ...cloneInterruption(interruption),
      status: "burned",
      updated_at_ms: now,
      burned_at_ms: now
    };

    this.state = {
      ...this.state,
      status: "burned",
      burned_count: this.state.burned_count + 1,
      last_action: "burn",
      last_reason: burned.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, burned);
  }

  /**
   * Read one interruption.
   */
  get(interruption_id: string): InterruptionRecord | null {
    const interruption = this.interruptions.get(cleanId(interruption_id));
    return interruption ? cloneInterruption(interruption) : null;
  }

  /**
   * Read current registry state.
   */
  getState(): InterruptionRegistryState {
    return {
      status: this.state.status,
      recorded_count: this.state.recorded_count,
      deferred_count: this.state.deferred_count,
      routed_count: this.state.routed_count,
      released_count: this.state.released_count,
      dismissed_count: this.state.dismissed_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_action: this.state.last_action,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getInterruptions(): InterruptionRecord[] {
    return Array.from(this.interruptions.values())
      .map(cloneInterruption)
      .sort(compareInterruptions);
  }

  getDeferred(): InterruptionRecord[] {
    return Array.from(this.deferred.values())
      .map(cloneInterruption)
      .sort(compareInterruptions);
  }

  getRouted(): InterruptionRecord[] {
    return Array.from(this.routed.values())
      .map(cloneInterruption)
      .sort(compareInterruptions);
  }

  getReleased(): InterruptionRecord[] {
    return Array.from(this.released.values())
      .map(cloneInterruption)
      .sort(compareInterruptions);
  }

  snapshot(): InterruptionRegistrySnapshot {
    return {
      state: this.getState(),
      interruptions: this.getInterruptions(),
      deferred: this.getDeferred(),
      routed: this.getRouted(),
      released: this.getReleased(),
      stable:
        this.state.status === "recorded" ||
        this.state.status === "deferred" ||
        this.state.status === "routed" ||
        this.state.status === "released" ||
        this.state.status === "idle"
    };
  }

  reset(at_ms: number = Date.now()): InterruptionRegistryState {
    this.interruptions.clear();
    this.deferred.clear();
    this.routed.clear();
    this.released.clear();

    this.state = {
      status: "idle",
      recorded_count: 0,
      deferred_count: 0,
      routed_count: 0,
      released_count: 0,
      dismissed_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_action: null,
      last_reason: "unknown",
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  private result(
    error?: string,
    interruption?: InterruptionRecord
  ): InterruptionRegistryResult {
    return {
      ok: !error,
      state: this.getState(),
      interruption: interruption ? cloneInterruption(interruption) : undefined,
      interruptions: this.getInterruptions(),
      deferred: this.getDeferred(),
      routed: this.getRouted(),
      released: this.getReleased(),
      error
    };
  }
}

export const CyberCrowdInterruptionRegistry =
  new InterruptionRegistry();

function canMove(from: InterruptionStatus, to: InterruptionStatus): boolean {
  if (from === "burned") {
    return false;
  }

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) {
    return true;
  }

  if (from === "recorded") {
    return (
      to === "deferred" ||
      to === "routed" ||
      to === "released" ||
      to === "dismissed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "deferred") {
    return (
      to === "routed" ||
      to === "released" ||
      to === "dismissed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "routed") {
    return (
      to === "released" ||
      to === "dismissed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "released" || from === "dismissed") {
    return to === "sealed" || to === "burned";
  }

  return false;
}

function cleanRegistryStatus(
  value: unknown
): InterruptionRegistryState["status"] {
  if (
    value === "idle" ||
    value === "recorded" ||
    value === "deferred" ||
    value === "routed" ||
    value === "released" ||
    value === "dismissed" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "idle";
}

function cleanKind(value: unknown): InterruptionKind {
  if (
    value === "lane-hit" ||
    value === "message" ||
    value === "system" ||
    value === "identity" ||
    value === "work" ||
    value === "persona" ||
    value === "reputation" ||
    value === "governance" ||
    value === "physics" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanPriority(value: unknown): InterruptionPriority {
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

function cleanNullableAction(value: unknown): InterruptionAction | null {
  if (
    value === "record" ||
    value === "defer" ||
    value === "route" ||
    value === "release" ||
    value === "dismiss" ||
    value === "seal" ||
    value === "burn"
  ) {
    return value;
  }

  return null;
}

function cleanReason(value: unknown): InterruptionReason {
  if (
    value === "focus-window-active" ||
    value === "active-lane-locked" ||
    value === "outside-lane-hit" ||
    value === "sequence-risk" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function compareInterruptions(
  a: InterruptionRecord,
  b: InterruptionRecord
): number {
  const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return b.recorded_at_ms - a.recorded_at_ms;
}

function priorityRank(priority: InterruptionPriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "normal") return 2;
  if (priority === "low") return 1;

  return 2;
}

function makeInterruptionId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "interruption-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneInterruption(
  interruption: InterruptionRecord
): InterruptionRecord {
  return {
    interruption_id: interruption.interruption_id,

    window_id: interruption.window_id ?? null,
    lock_id: interruption.lock_id ?? null,

    active_lane_id: interruption.active_lane_id ?? null,
    incoming_lane_id: interruption.incoming_lane_id ?? null,

    kind: interruption.kind,
    priority: interruption.priority,
    status: interruption.status,
    reason: interruption.reason,

    title: interruption.title,
    message: interruption.message ?? null,

    source_ref_id: interruption.source_ref_id ?? null,
    route_target_lane_id: interruption.route_target_lane_id ?? null,

    recorded_at_ms: interruption.recorded_at_ms,
    updated_at_ms: interruption.updated_at_ms,
    deferred_at_ms: interruption.deferred_at_ms ?? null,
    routed_at_ms: interruption.routed_at_ms ?? null,
    released_at_ms: interruption.released_at_ms ?? null,
    dismissed_at_ms: interruption.dismissed_at_ms ?? null,
    sealed_at_ms: interruption.sealed_at_ms ?? null,
    burned_at_ms: interruption.burned_at_ms ?? null,

    data: publicDataOnly(interruption.data)
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
