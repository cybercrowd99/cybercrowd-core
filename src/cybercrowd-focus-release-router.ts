// src/cybercrowd-focus-release-router.ts
//
// CyberCrowd Focus Release Router Organ
//
// ONE JOB:
// Release deferred interruptions after a Focus Window closes and route them
// without breaking the completed work lane.
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
// Interruption Registry stores what hit during focus.
// Focus Release Router decides what gets released, routed, deferred again,
// dismissed, sealed, or burned after focus ends.

export type FocusReleaseStatus =
  | "idle"
  | "releasing"
  | "released"
  | "routed"
  | "deferred"
  | "dismissed"
  | "sealed"
  | "burned";

export type FocusReleaseAction =
  | "release"
  | "route"
  | "defer-again"
  | "dismiss"
  | "seal"
  | "burn";

export type FocusReleaseReason =
  | "focus-window-closed"
  | "focus-window-interrupted"
  | "deferred-interruption"
  | "lane-recovery"
  | "manual"
  | "unknown";

export type FocusReleasePriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type FocusReleaseKind =
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

export interface FocusReleaseInput {
  interruption_id: string;

  window_id?: string | null;
  lock_id?: string | null;

  active_lane_id?: string | null;
  incoming_lane_id?: string | null;
  route_target_lane_id?: string | null;

  kind?: FocusReleaseKind;
  priority?: FocusReleasePriority;
  reason?: FocusReleaseReason;

  title: string;
  message?: string | null;

  source_ref_id?: string | null;

  data?: Record<string, unknown>;
}

export interface FocusReleaseRecord {
  release_id: string;

  interruption_id: string;

  window_id: string | null;
  lock_id: string | null;

  active_lane_id: string | null;
  incoming_lane_id: string | null;
  route_target_lane_id: string | null;

  kind: FocusReleaseKind;
  priority: FocusReleasePriority;

  status: FocusReleaseStatus;
  action: FocusReleaseAction;
  reason: FocusReleaseReason;

  title: string;
  message: string | null;

  released: boolean;
  routed: boolean;
  deferred_again: boolean;
  dismissed: boolean;
  sealed: boolean;
  burned: boolean;

  source_ref_id: string | null;

  created_at_ms: number;
  updated_at_ms: number;
  released_at_ms: number | null;
  routed_at_ms: number | null;
  deferred_again_at_ms: number | null;
  dismissed_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface FocusReleaseState {
  status: FocusReleaseStatus;
  release_count: number;
  routed_count: number;
  deferred_again_count: number;
  dismissed_count: number;
  sealed_count: number;
  burned_count: number;
  last_action: FocusReleaseAction | null;
  last_reason: FocusReleaseReason;
  last_updated_at_ms: number;
}

export interface FocusReleaseDecisionParams {
  route_critical?: boolean;
  defer_low_priority?: boolean;
  dismiss_unknown_without_target?: boolean;
}

export interface FocusReleaseResult {
  ok: boolean;
  state: FocusReleaseState;
  record?: FocusReleaseRecord;
  records: FocusReleaseRecord[];
  released: FocusReleaseRecord[];
  routed: FocusReleaseRecord[];
  deferred_again: FocusReleaseRecord[];
  dismissed: FocusReleaseRecord[];
  error?: string;
}

export interface FocusReleaseSnapshot {
  state: FocusReleaseState;
  records: FocusReleaseRecord[];
  released: FocusReleaseRecord[];
  routed: FocusReleaseRecord[];
  deferred_again: FocusReleaseRecord[];
  dismissed: FocusReleaseRecord[];
  stable: boolean;
}

export class FocusReleaseRouter {
  private state: FocusReleaseState;

  private records = new Map<string, FocusReleaseRecord>();
  private released = new Map<string, FocusReleaseRecord>();
  private routed = new Map<string, FocusReleaseRecord>();
  private deferredAgain = new Map<string, FocusReleaseRecord>();
  private dismissed = new Map<string, FocusReleaseRecord>();

  constructor(initial?: Partial<FocusReleaseState>) {
    const now = Date.now();

    this.state = {
      status: cleanStatus(initial?.status ?? "idle"),
      release_count: cleanCount(initial?.release_count ?? 0),
      routed_count: cleanCount(initial?.routed_count ?? 0),
      deferred_again_count: cleanCount(initial?.deferred_again_count ?? 0),
      dismissed_count: cleanCount(initial?.dismissed_count ?? 0),
      sealed_count: cleanCount(initial?.sealed_count ?? 0),
      burned_count: cleanCount(initial?.burned_count ?? 0),
      last_action: cleanNullableAction(initial?.last_action ?? null),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Process one deferred interruption after focus protection ends.
   */
  process(
    input: FocusReleaseInput,
    params: FocusReleaseDecisionParams = {}
  ): FocusReleaseResult {
    const interruptionId = cleanId(input?.interruption_id);
    const title = cleanText(input?.title, 240);

    if (!interruptionId) {
      return this.result("INTERRUPTION_ID_REQUIRED");
    }

    if (!title) {
      return this.result("FOCUS_RELEASE_TITLE_REQUIRED");
    }

    const now = Date.now();

    const kind = cleanKind(input?.kind ?? "unknown");
    const priority = cleanPriority(input?.priority ?? "normal");
    const reason = cleanReason(input?.reason ?? "deferred-interruption");

    const activeLaneId = cleanNullableId(input?.active_lane_id ?? null);
    const incomingLaneId = cleanNullableId(input?.incoming_lane_id ?? null);
    const routeTargetLaneId = cleanNullableId(
      input?.route_target_lane_id ?? null
    );

    const action = this.decideAction(
      kind,
      priority,
      incomingLaneId,
      routeTargetLaneId,
      params
    );

    const record: FocusReleaseRecord = {
      release_id: makeReleaseId(),

      interruption_id: interruptionId,

      window_id: cleanNullableId(input?.window_id ?? null),
      lock_id: cleanNullableId(input?.lock_id ?? null),

      active_lane_id: activeLaneId,
      incoming_lane_id: incomingLaneId,
      route_target_lane_id: routeTargetLaneId,

      kind,
      priority,

      status: statusFromAction(action),
      action,
      reason,

      title,
      message: cleanNullableText(input?.message ?? null, 2000),

      released: action === "release",
      routed: action === "route",
      deferred_again: action === "defer-again",
      dismissed: action === "dismiss",
      sealed: false,
      burned: false,

      source_ref_id: cleanNullableId(input?.source_ref_id ?? null),

      created_at_ms: now,
      updated_at_ms: now,
      released_at_ms: action === "release" ? now : null,
      routed_at_ms: action === "route" ? now : null,
      deferred_again_at_ms: action === "defer-again" ? now : null,
      dismissed_at_ms: action === "dismiss" ? now : null,
      sealed_at_ms: null,
      burned_at_ms: null,

      data: publicDataOnly(input?.data ?? {})
    };

    this.records.set(record.release_id, cloneRecord(record));

    if (record.released) {
      this.released.set(record.release_id, cloneRecord(record));
      this.state.release_count += 1;
    }

    if (record.routed) {
      this.routed.set(record.release_id, cloneRecord(record));
      this.state.routed_count += 1;
    }

    if (record.deferred_again) {
      this.deferredAgain.set(record.release_id, cloneRecord(record));
      this.state.deferred_again_count += 1;
    }

    if (record.dismissed) {
      this.dismissed.set(record.release_id, cloneRecord(record));
      this.state.dismissed_count += 1;
    }

    this.state = {
      ...this.state,
      status: record.status,
      last_action: action,
      last_reason: reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, record);
  }

  /**
   * Process a batch of deferred interruptions after focus closes.
   */
  processBatch(
    inputs: FocusReleaseInput[],
    params: FocusReleaseDecisionParams = {}
  ): FocusReleaseResult {
    if (!Array.isArray(inputs)) {
      return this.result("FOCUS_RELEASE_INPUTS_REQUIRED");
    }

    let lastRecord: FocusReleaseRecord | undefined;

    this.state = {
      ...this.state,
      status: "releasing",
      last_updated_at_ms: Date.now()
    };

    for (const input of inputs) {
      const result = this.process(input, params);

      if (result.record) {
        lastRecord = result.record;
      }
    }

    return this.result(undefined, lastRecord);
  }

  /**
   * Route an already-created release record.
   */
  route(
    release_id: string,
    route_target_lane_id?: string | null
  ): FocusReleaseResult {
    const record = this.records.get(cleanId(release_id));

    if (!record) {
      return this.result("FOCUS_RELEASE_RECORD_NOT_FOUND");
    }

    if (!canMove(record.status, "routed")) {
      return this.result("FOCUS_RELEASE_STATE_LOCKED", record);
    }

    const target =
      cleanNullableId(route_target_lane_id ?? null) ??
      record.route_target_lane_id ??
      record.incoming_lane_id;

    if (!target) {
      return this.result("ROUTE_TARGET_LANE_ID_REQUIRED", record);
    }

    const now = Date.now();

    const updated: FocusReleaseRecord = {
      ...cloneRecord(record),
      status: "routed",
      action: "route",
      route_target_lane_id: target,
      routed: true,
      released: false,
      deferred_again: false,
      dismissed: false,
      updated_at_ms: now,
      routed_at_ms: now
    };

    this.records.set(updated.release_id, cloneRecord(updated));
    this.released.delete(updated.release_id);
    this.deferredAgain.delete(updated.release_id);
    this.dismissed.delete(updated.release_id);
    this.routed.set(updated.release_id, cloneRecord(updated));

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
   * Release an already-created release record.
   */
  release(release_id: string): FocusReleaseResult {
    const record = this.records.get(cleanId(release_id));

    if (!record) {
      return this.result("FOCUS_RELEASE_RECORD_NOT_FOUND");
    }

    if (!canMove(record.status, "released")) {
      return this.result("FOCUS_RELEASE_STATE_LOCKED", record);
    }

    const now = Date.now();

    const updated: FocusReleaseRecord = {
      ...cloneRecord(record),
      status: "released",
      action: "release",
      released: true,
      routed: false,
      deferred_again: false,
      dismissed: false,
      updated_at_ms: now,
      released_at_ms: now
    };

    this.records.set(updated.release_id, cloneRecord(updated));
    this.routed.delete(updated.release_id);
    this.deferredAgain.delete(updated.release_id);
    this.dismissed.delete(updated.release_id);
    this.released.set(updated.release_id, cloneRecord(updated));

    this.state = {
      ...this.state,
      status: "released",
      release_count: this.state.release_count + 1,
      last_action: "release",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Defer a release record again.
   */
  deferAgain(release_id: string): FocusReleaseResult {
    const record = this.records.get(cleanId(release_id));

    if (!record) {
      return this.result("FOCUS_RELEASE_RECORD_NOT_FOUND");
    }

    if (!canMove(record.status, "deferred")) {
      return this.result("FOCUS_RELEASE_STATE_LOCKED", record);
    }

    const now = Date.now();

    const updated: FocusReleaseRecord = {
      ...cloneRecord(record),
      status: "deferred",
      action: "defer-again",
      released: false,
      routed: false,
      deferred_again: true,
      dismissed: false,
      updated_at_ms: now,
      deferred_again_at_ms: now
    };

    this.records.set(updated.release_id, cloneRecord(updated));
    this.released.delete(updated.release_id);
    this.routed.delete(updated.release_id);
    this.dismissed.delete(updated.release_id);
    this.deferredAgain.set(updated.release_id, cloneRecord(updated));

    this.state = {
      ...this.state,
      status: "deferred",
      deferred_again_count: this.state.deferred_again_count + 1,
      last_action: "defer-again",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Dismiss a release record without deleting it.
   */
  dismiss(release_id: string): FocusReleaseResult {
    const record = this.records.get(cleanId(release_id));

    if (!record) {
      return this.result("FOCUS_RELEASE_RECORD_NOT_FOUND");
    }

    if (!canMove(record.status, "dismissed")) {
      return this.result("FOCUS_RELEASE_STATE_LOCKED", record);
    }

    const now = Date.now();

    const updated: FocusReleaseRecord = {
      ...cloneRecord(record),
      status: "dismissed",
      action: "dismiss",
      released: false,
      routed: false,
      deferred_again: false,
      dismissed: true,
      updated_at_ms: now,
      dismissed_at_ms: now
    };

    this.records.set(updated.release_id, cloneRecord(updated));
    this.released.delete(updated.release_id);
    this.routed.delete(updated.release_id);
    this.deferredAgain.delete(updated.release_id);
    this.dismissed.set(updated.release_id, cloneRecord(updated));

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
   * Seal a release record without deleting it.
   */
  seal(release_id: string): FocusReleaseResult {
    const record = this.records.get(cleanId(release_id));

    if (!record) {
      return this.result("FOCUS_RELEASE_RECORD_NOT_FOUND");
    }

    if (!canMove(record.status, "sealed")) {
      return this.result("FOCUS_RELEASE_STATE_LOCKED", record);
    }

    const now = Date.now();

    const updated: FocusReleaseRecord = {
      ...cloneRecord(record),
      status: "sealed",
      action: "seal",
      sealed: true,
      updated_at_ms: now,
      sealed_at_ms: now
    };

    this.records.set(updated.release_id, cloneRecord(updated));

    if (this.released.has(updated.release_id)) {
      this.released.set(updated.release_id, cloneRecord(updated));
    }

    if (this.routed.has(updated.release_id)) {
      this.routed.set(updated.release_id, cloneRecord(updated));
    }

    if (this.deferredAgain.has(updated.release_id)) {
      this.deferredAgain.set(updated.release_id, cloneRecord(updated));
    }

    if (this.dismissed.has(updated.release_id)) {
      this.dismissed.set(updated.release_id, cloneRecord(updated));
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
   * Burn a release record from live memory.
   */
  burn(release_id: string): FocusReleaseResult {
    const cleanReleaseId = cleanId(release_id);
    const record = this.records.get(cleanReleaseId);

    if (!record) {
      return this.result("FOCUS_RELEASE_RECORD_NOT_FOUND");
    }

    this.records.delete(cleanReleaseId);
    this.released.delete(cleanReleaseId);
    this.routed.delete(cleanReleaseId);
    this.deferredAgain.delete(cleanReleaseId);
    this.dismissed.delete(cleanReleaseId);

    const now = Date.now();

    const burned: FocusReleaseRecord = {
      ...cloneRecord(record),
      status: "burned",
      action: "burn",
      burned: true,
      sealed: true,
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
   * Read one release record.
   */
  get(release_id: string): FocusReleaseRecord | null {
    const record = this.records.get(cleanId(release_id));
    return record ? cloneRecord(record) : null;
  }

  /**
   * Read current router state.
   */
  getState(): FocusReleaseState {
    return {
      status: this.state.status,
      release_count: this.state.release_count,
      routed_count: this.state.routed_count,
      deferred_again_count: this.state.deferred_again_count,
      dismissed_count: this.state.dismissed_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_action: this.state.last_action,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getRecords(): FocusReleaseRecord[] {
    return Array.from(this.records.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  getReleased(): FocusReleaseRecord[] {
    return Array.from(this.released.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  getRouted(): FocusReleaseRecord[] {
    return Array.from(this.routed.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  getDeferredAgain(): FocusReleaseRecord[] {
    return Array.from(this.deferredAgain.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  getDismissed(): FocusReleaseRecord[] {
    return Array.from(this.dismissed.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  snapshot(): FocusReleaseSnapshot {
    return {
      state: this.getState(),
      records: this.getRecords(),
      released: this.getReleased(),
      routed: this.getRouted(),
      deferred_again: this.getDeferredAgain(),
      dismissed: this.getDismissed(),
      stable:
        this.state.status === "idle" ||
        this.state.status === "released" ||
        this.state.status === "routed" ||
        this.state.status === "deferred" ||
        this.state.status === "dismissed"
    };
  }

  reset(at_ms: number = Date.now()): FocusReleaseState {
    this.records.clear();
    this.released.clear();
    this.routed.clear();
    this.deferredAgain.clear();
    this.dismissed.clear();

    this.state = {
      status: "idle",
      release_count: 0,
      routed_count: 0,
      deferred_again_count: 0,
      dismissed_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_action: null,
      last_reason: "unknown",
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  private decideAction(
    kind: FocusReleaseKind,
    priority: FocusReleasePriority,
    incomingLaneId: string | null,
    routeTargetLaneId: string | null,
    params: FocusReleaseDecisionParams
  ): FocusReleaseAction {
    if (params.defer_low_priority === true && priority === "low") {
      return "defer-again";
    }

    if (
      params.dismiss_unknown_without_target === true &&
      kind === "unknown" &&
      !incomingLaneId &&
      !routeTargetLaneId
    ) {
      return "dismiss";
    }

    if (
      params.route_critical === true &&
      priority === "critical" &&
      (routeTargetLaneId || incomingLaneId)
    ) {
      return "route";
    }

    if (routeTargetLaneId || incomingLaneId) {
      return "route";
    }

    return "release";
  }

  private result(
    error?: string,
    record?: FocusReleaseRecord
  ): FocusReleaseResult {
    return {
      ok: !error,
      state: this.getState(),
      record: record ? cloneRecord(record) : undefined,
      records: this.getRecords(),
      released: this.getReleased(),
      routed: this.getRouted(),
      deferred_again: this.getDeferredAgain(),
      dismissed: this.getDismissed(),
      error
    };
  }
}

export const CyberCrowdFocusReleaseRouter =
  new FocusReleaseRouter();

function canMove(from: FocusReleaseStatus, to: FocusReleaseStatus): boolean {
  if (from === "burned") {
    return false;
  }

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) {
    return true;
  }

  if (from === "releasing") {
    return (
      to === "released" ||
      to === "routed" ||
      to === "deferred" ||
      to === "dismissed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (
    from === "released" ||
    from === "routed" ||
    from === "deferred" ||
    from === "dismissed"
  ) {
    return (
      to === "released" ||
      to === "routed" ||
      to === "deferred" ||
      to === "dismissed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "idle") {
    return (
      to === "releasing" ||
      to === "released" ||
      to === "routed" ||
      to === "deferred" ||
      to === "dismissed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function statusFromAction(action: FocusReleaseAction): FocusReleaseStatus {
  if (action === "release") return "released";
  if (action === "route") return "routed";
  if (action === "defer-again") return "deferred";
  if (action === "dismiss") return "dismissed";
  if (action === "seal") return "sealed";
  if (action === "burn") return "burned";

  return "idle";
}

function cleanStatus(value: unknown): FocusReleaseStatus {
  if (
    value === "idle" ||
    value === "releasing" ||
    value === "released" ||
    value === "routed" ||
    value === "deferred" ||
    value === "dismissed" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "idle";
}

function cleanNullableAction(value: unknown): FocusReleaseAction | null {
  if (
    value === "release" ||
    value === "route" ||
    value === "defer-again" ||
    value === "dismiss" ||
    value === "seal" ||
    value === "burn"
  ) {
    return value;
  }

  return null;
}

function cleanReason(value: unknown): FocusReleaseReason {
  if (
    value === "focus-window-closed" ||
    value === "focus-window-interrupted" ||
    value === "deferred-interruption" ||
    value === "lane-recovery" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanPriority(value: unknown): FocusReleasePriority {
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

function cleanKind(value: unknown): FocusReleaseKind {
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

function compareRecords(
  a: FocusReleaseRecord,
  b: FocusReleaseRecord
): number {
  const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return b.created_at_ms - a.created_at_ms;
}

function priorityRank(priority: FocusReleasePriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "normal") return 2;
  if (priority === "low") return 1;

  return 2;
}

function makeReleaseId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "focus-release-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneRecord(record: FocusReleaseRecord): FocusReleaseRecord {
  return {
    release_id: record.release_id,

    interruption_id: record.interruption_id,

    window_id: record.window_id ?? null,
    lock_id: record.lock_id ?? null,

    active_lane_id: record.active_lane_id ?? null,
    incoming_lane_id: record.incoming_lane_id ?? null,
    route_target_lane_id: record.route_target_lane_id ?? null,

    kind: record.kind,
    priority: record.priority,

    status: record.status,
    action: record.action,
    reason: record.reason,

    title: record.title,
    message: record.message ?? null,

    released: record.released,
    routed: record.routed,
    deferred_again: record.deferred_again,
    dismissed: record.dismissed,
    sealed: record.sealed,
    burned: record.burned,

    source_ref_id: record.source_ref_id ?? null,

    created_at_ms: record.created_at_ms,
    updated_at_ms: record.updated_at_ms,
    released_at_ms: record.released_at_ms ?? null,
    routed_at_ms: record.routed_at_ms ?? null,
    deferred_again_at_ms: record.deferred_again_at_ms ?? null,
    dismissed_at_ms: record.dismissed_at_ms ?? null,
    sealed_at_ms: record.sealed_at_ms ?? null,
    burned_at_ms: record.burned_at_ms ?? null,

    data: publicDataOnly(record.data)
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
