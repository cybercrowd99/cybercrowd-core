// src/cybercrowd-active-lane-lock.ts
//
// CyberCrowd Active Lane Lock Organ
//
// ONE JOB:
// Lock the current active lane during focused work so recovered meaning,
// deferred meaning, or outside updates cannot silently hijack the lane.
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
// Thread Continuity Guard detects drift.
// Lane Recovery Router routes meaning back.
// Active Lane Lock keeps the current lane sealed while work is active.

export type ActiveLaneLockStatus =
  | "unlocked"
  | "locked"
  | "contested"
  | "released"
  | "sealed"
  | "burned";

export type ActiveLaneLockAction =
  | "lock"
  | "allow"
  | "contest"
  | "release"
  | "seal"
  | "burn";

export type ActiveLaneLockReason =
  | "focused-work"
  | "lane-recovery"
  | "thread-continuity"
  | "narrative-stabilized"
  | "manual"
  | "unknown";

export type ActiveLaneLockKind =
  | "identity"
  | "work"
  | "physics"
  | "persona"
  | "reputation"
  | "governance"
  | "system"
  | "manual"
  | "unknown";

export interface ActiveLaneLockRecord {
  lock_id: string;

  lane_id: string;
  lane_kind: ActiveLaneLockKind;

  title: string;
  current_job: string | null;
  sequence_number: number;

  status: ActiveLaneLockStatus;
  reason: ActiveLaneLockReason;

  created_at_ms: number;
  updated_at_ms: number;
  locked_at_ms: number | null;
  released_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  source_ref_id: string | null;

  data: Record<string, unknown>;
}

export interface ActiveLaneLockAttempt {
  attempt_id: string;

  at_ms: number;

  incoming_lane_id: string;
  incoming_lane_kind: ActiveLaneLockKind;

  active_lane_id: string | null;
  active_lane_kind: ActiveLaneLockKind;

  action: ActiveLaneLockAction;
  reason: ActiveLaneLockReason;

  allowed: boolean;
  contested: boolean;

  message: string | null;
  source_ref_id: string | null;

  data: Record<string, unknown>;
}

export interface ActiveLaneLockState {
  status: ActiveLaneLockStatus;
  active_lock_id: string | null;
  active_lane_id: string | null;
  active_lane_kind: ActiveLaneLockKind;
  current_job: string | null;
  sequence_number: number;
  allowed_count: number;
  contested_count: number;
  release_count: number;
  last_action: ActiveLaneLockAction | null;
  last_reason: ActiveLaneLockReason;
  last_updated_at_ms: number;
}

export interface LockActiveLaneRequest {
  lane_id: string;
  lane_kind?: ActiveLaneLockKind;
  title: string;
  current_job?: string | null;
  sequence_number?: number;
  reason?: ActiveLaneLockReason;
  source_ref_id?: string | null;
  data?: Record<string, unknown>;
}

export interface CheckActiveLaneRequest {
  incoming_lane_id: string;
  incoming_lane_kind?: ActiveLaneLockKind;
  reason?: ActiveLaneLockReason;
  message?: string | null;
  source_ref_id?: string | null;
  data?: Record<string, unknown>;
}

export interface ActiveLaneLockResult {
  ok: boolean;
  state: ActiveLaneLockState;
  lock: ActiveLaneLockRecord | null;
  attempts: ActiveLaneLockAttempt[];
  allowed: boolean;
  contested: boolean;
  error?: string;
}

export interface ActiveLaneLockSnapshot {
  state: ActiveLaneLockState;
  lock: ActiveLaneLockRecord | null;
  locks: ActiveLaneLockRecord[];
  attempts: ActiveLaneLockAttempt[];
  stable: boolean;
}

export class ActiveLaneLock {
  private state: ActiveLaneLockState;
  private locks = new Map<string, ActiveLaneLockRecord>();
  private attempts: ActiveLaneLockAttempt[] = [];

  constructor(initial?: Partial<ActiveLaneLockState>) {
    const now = Date.now();

    this.state = {
      status: cleanStatus(initial?.status ?? "unlocked"),
      active_lock_id: cleanNullableId(initial?.active_lock_id ?? null),
      active_lane_id: cleanNullableId(initial?.active_lane_id ?? null),
      active_lane_kind: cleanKind(initial?.active_lane_kind ?? "unknown"),
      current_job: cleanNullableText(initial?.current_job ?? null, 400),
      sequence_number: cleanSequence(initial?.sequence_number ?? 0),
      allowed_count: cleanCount(initial?.allowed_count ?? 0),
      contested_count: cleanCount(initial?.contested_count ?? 0),
      release_count: cleanCount(initial?.release_count ?? 0),
      last_action: cleanNullableAction(initial?.last_action ?? null),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Lock the active lane.
   */
  lock(request: LockActiveLaneRequest): ActiveLaneLockResult {
    const laneId = cleanId(request?.lane_id);
    const laneKind = cleanKind(request?.lane_kind ?? "unknown");
    const title = cleanText(request?.title, 240);
    const currentJob = cleanNullableText(request?.current_job ?? null, 400);
    const sequenceNumber = cleanSequence(request?.sequence_number ?? 0);
    const reason = cleanReason(request?.reason ?? "focused-work");
    const sourceRefId = cleanNullableId(request?.source_ref_id ?? null);

    if (!laneId) {
      return this.result("LANE_ID_REQUIRED", false, false);
    }

    if (!title) {
      return this.result("LOCK_TITLE_REQUIRED", false, false);
    }

    const now = Date.now();

    const record: ActiveLaneLockRecord = {
      lock_id: makeLockId(),

      lane_id: laneId,
      lane_kind: laneKind,

      title,
      current_job: currentJob,
      sequence_number: sequenceNumber,

      status: "locked",
      reason,

      created_at_ms: now,
      updated_at_ms: now,
      locked_at_ms: now,
      released_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      source_ref_id: sourceRefId,

      data: publicDataOnly(request?.data ?? {})
    };

    this.locks.set(record.lock_id, cloneLock(record));

    this.state = {
      ...this.state,
      status: "locked",
      active_lock_id: record.lock_id,
      active_lane_id: record.lane_id,
      active_lane_kind: record.lane_kind,
      current_job: record.current_job,
      sequence_number: record.sequence_number,
      last_action: "lock",
      last_reason: reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, true, false);
  }

  /**
   * Check whether an incoming lane can enter the active lane.
   */
  check(request: CheckActiveLaneRequest): ActiveLaneLockResult {
    const incomingLaneId = cleanId(request?.incoming_lane_id);
    const incomingLaneKind = cleanKind(request?.incoming_lane_kind ?? "unknown");
    const reason = cleanReason(request?.reason ?? "unknown");
    const message = cleanNullableText(request?.message ?? null, 1000);
    const sourceRefId = cleanNullableId(request?.source_ref_id ?? null);

    if (!incomingLaneId) {
      return this.result("INCOMING_LANE_ID_REQUIRED", false, false);
    }

    const now = Date.now();
    const activeLock = this.getActiveLockInternal();

    if (!activeLock || this.state.status === "unlocked") {
      const attempt = this.makeAttempt(
        now,
        incomingLaneId,
        incomingLaneKind,
        null,
        "unknown",
        "allow",
        reason,
        true,
        false,
        message,
        sourceRefId,
        request?.data ?? {}
      );

      this.pushAttempt(attempt);

      this.state = {
        ...this.state,
        status: "unlocked",
        allowed_count: this.state.allowed_count + 1,
        last_action: "allow",
        last_reason: reason,
        last_updated_at_ms: now
      };

      return this.result(undefined, true, false);
    }

    const sameLane = incomingLaneId === activeLock.lane_id;

    if (sameLane) {
      const attempt = this.makeAttempt(
        now,
        incomingLaneId,
        incomingLaneKind,
        activeLock.lane_id,
        activeLock.lane_kind,
        "allow",
        reason,
        true,
        false,
        message,
        sourceRefId,
        request?.data ?? {}
      );

      this.pushAttempt(attempt);

      activeLock.sequence_number += 1;
      activeLock.updated_at_ms = now;
      this.locks.set(activeLock.lock_id, cloneLock(activeLock));

      this.state = {
        ...this.state,
        status: "locked",
        sequence_number: activeLock.sequence_number,
        allowed_count: this.state.allowed_count + 1,
        last_action: "allow",
        last_reason: reason,
        last_updated_at_ms: now
      };

      return this.result(undefined, true, false);
    }

    const attempt = this.makeAttempt(
      now,
      incomingLaneId,
      incomingLaneKind,
      activeLock.lane_id,
      activeLock.lane_kind,
      "contest",
      reason,
      false,
      true,
      message ?? "Incoming lane contested by active lane lock",
      sourceRefId,
      request?.data ?? {}
    );

    this.pushAttempt(attempt);

    this.state = {
      ...this.state,
      status: "contested",
      contested_count: this.state.contested_count + 1,
      last_action: "contest",
      last_reason: reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, false, true);
  }

  /**
   * Release the active lane lock without deleting it.
   */
  release(
    reason: ActiveLaneLockReason = "manual",
    at_ms: number = Date.now()
  ): ActiveLaneLockResult {
    const now = cleanTimestamp(at_ms, Date.now());
    const activeLock = this.getActiveLockInternal();

    if (!activeLock) {
      this.state = {
        ...this.state,
        status: "unlocked",
        active_lock_id: null,
        active_lane_id: null,
        active_lane_kind: "unknown",
        current_job: null,
        sequence_number: 0,
        last_action: "release",
        last_reason: cleanReason(reason),
        last_updated_at_ms: now
      };

      return this.result(undefined, true, false);
    }

    const updated: ActiveLaneLockRecord = {
      ...cloneLock(activeLock),
      status: "released",
      released_at_ms: now,
      updated_at_ms: now
    };

    this.locks.set(updated.lock_id, cloneLock(updated));

    this.state = {
      ...this.state,
      status: "released",
      active_lock_id: null,
      active_lane_id: null,
      active_lane_kind: "unknown",
      current_job: null,
      sequence_number: 0,
      release_count: this.state.release_count + 1,
      last_action: "release",
      last_reason: cleanReason(reason),
      last_updated_at_ms: now
    };

    return this.result(undefined, true, false);
  }

  /**
   * Seal the active lock.
   */
  seal(at_ms: number = Date.now()): ActiveLaneLockResult {
    const now = cleanTimestamp(at_ms, Date.now());
    const activeLock = this.getActiveLockInternal();

    if (!activeLock) {
      return this.result("ACTIVE_LOCK_NOT_FOUND", false, false);
    }

    const updated: ActiveLaneLockRecord = {
      ...cloneLock(activeLock),
      status: "sealed",
      sealed_at_ms: now,
      updated_at_ms: now
    };

    this.locks.set(updated.lock_id, cloneLock(updated));

    this.state = {
      ...this.state,
      status: "sealed",
      last_action: "seal",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    return this.result(undefined, false, false);
  }

  /**
   * Burn the active lock from live memory.
   */
  burn(at_ms: number = Date.now()): ActiveLaneLockResult {
    const now = cleanTimestamp(at_ms, Date.now());
    const activeLockId = this.state.active_lock_id;

    if (activeLockId) {
      this.locks.delete(activeLockId);
    }

    this.state = {
      ...this.state,
      status: "burned",
      active_lock_id: null,
      active_lane_id: null,
      active_lane_kind: "unknown",
      current_job: null,
      sequence_number: 0,
      last_action: "burn",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    return this.result(undefined, false, false);
  }

  /**
   * Read current state.
   */
  getState(): ActiveLaneLockState {
    return {
      status: this.state.status,
      active_lock_id: this.state.active_lock_id,
      active_lane_id: this.state.active_lane_id,
      active_lane_kind: this.state.active_lane_kind,
      current_job: this.state.current_job,
      sequence_number: this.state.sequence_number,
      allowed_count: this.state.allowed_count,
      contested_count: this.state.contested_count,
      release_count: this.state.release_count,
      last_action: this.state.last_action,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  /**
   * Read active lock.
   */
  getActiveLock(): ActiveLaneLockRecord | null {
    const lock = this.getActiveLockInternal();
    return lock ? cloneLock(lock) : null;
  }

  /**
   * Read all locks.
   */
  getLocks(): ActiveLaneLockRecord[] {
    return Array.from(this.locks.values())
      .map(cloneLock)
      .sort((a, b) => b.updated_at_ms - a.updated_at_ms);
  }

  /**
   * Read recent attempts.
   */
  getAttempts(): ActiveLaneLockAttempt[] {
    return this.attempts.map(cloneAttempt);
  }

  /**
   * Read operational snapshot.
   */
  snapshot(): ActiveLaneLockSnapshot {
    return {
      state: this.getState(),
      lock: this.getActiveLock(),
      locks: this.getLocks(),
      attempts: this.getAttempts(),
      stable:
        this.state.status === "locked" ||
        this.state.status === "unlocked" ||
        this.state.status === "released"
    };
  }

  /**
   * Reset all lock memory.
   */
  reset(at_ms: number = Date.now()): ActiveLaneLockState {
    this.locks.clear();
    this.attempts = [];

    this.state = {
      status: "unlocked",
      active_lock_id: null,
      active_lane_id: null,
      active_lane_kind: "unknown",
      current_job: null,
      sequence_number: 0,
      allowed_count: 0,
      contested_count: 0,
      release_count: 0,
      last_action: null,
      last_reason: "unknown",
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  private getActiveLockInternal(): ActiveLaneLockRecord | null {
    const lockId = this.state.active_lock_id;

    if (!lockId) return null;

    const lock = this.locks.get(lockId);

    return lock ? cloneLock(lock) : null;
  }

  private makeAttempt(
    now: number,
    incomingLaneId: string,
    incomingLaneKind: ActiveLaneLockKind,
    activeLaneId: string | null,
    activeLaneKind: ActiveLaneLockKind,
    action: ActiveLaneLockAction,
    reason: ActiveLaneLockReason,
    allowed: boolean,
    contested: boolean,
    message: string | null,
    sourceRefId: string | null,
    data: Record<string, unknown>
  ): ActiveLaneLockAttempt {
    return {
      attempt_id: makeAttemptId(),

      at_ms: now,

      incoming_lane_id: incomingLaneId,
      incoming_lane_kind: incomingLaneKind,

      active_lane_id: activeLaneId,
      active_lane_kind: activeLaneKind,

      action,
      reason,

      allowed,
      contested,

      message,
      source_ref_id: sourceRefId,

      data: publicDataOnly(data)
    };
  }

  private pushAttempt(attempt: ActiveLaneLockAttempt): void {
    this.attempts.push(cloneAttempt(attempt));

    if (this.attempts.length > 100) {
      this.attempts = this.attempts.slice(-100);
    }
  }

  private result(
    error?: string,
    allowed: boolean = false,
    contested: boolean = false
  ): ActiveLaneLockResult {
    return {
      ok: !error,
      state: this.getState(),
      lock: this.getActiveLock(),
      attempts: this.getAttempts(),
      allowed,
      contested,
      error
    };
  }
}

export const CyberCrowdActiveLaneLock =
  new ActiveLaneLock();

function cleanStatus(value: unknown): ActiveLaneLockStatus {
  if (
    value === "unlocked" ||
    value === "locked" ||
    value === "contested" ||
    value === "released" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "unlocked";
}

function cleanNullableAction(value: unknown): ActiveLaneLockAction | null {
  if (
    value === "lock" ||
    value === "allow" ||
    value === "contest" ||
    value === "release" ||
    value === "seal" ||
    value === "burn"
  ) {
    return value;
  }

  return null;
}

function cleanReason(value: unknown): ActiveLaneLockReason {
  if (
    value === "focused-work" ||
    value === "lane-recovery" ||
    value === "thread-continuity" ||
    value === "narrative-stabilized" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanKind(value: unknown): ActiveLaneLockKind {
  if (
    value === "identity" ||
    value === "work" ||
    value === "physics" ||
    value === "persona" ||
    value === "reputation" ||
    value === "governance" ||
    value === "system" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function makeLockId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "active-lane-lock-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function makeAttemptId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "active-lane-attempt-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneLock(lock: ActiveLaneLockRecord): ActiveLaneLockRecord {
  return {
    lock_id: lock.lock_id,

    lane_id: lock.lane_id,
    lane_kind: lock.lane_kind,

    title: lock.title,
    current_job: lock.current_job ?? null,
    sequence_number: lock.sequence_number,

    status: lock.status,
    reason: lock.reason,

    created_at_ms: lock.created_at_ms,
    updated_at_ms: lock.updated_at_ms,
    locked_at_ms: lock.locked_at_ms ?? null,
    released_at_ms: lock.released_at_ms ?? null,
    sealed_at_ms: lock.sealed_at_ms ?? null,
    burned_at_ms: lock.burned_at_ms ?? null,

    source_ref_id: lock.source_ref_id ?? null,

    data: publicDataOnly(lock.data)
  };
}

function cloneAttempt(
  attempt: ActiveLaneLockAttempt
): ActiveLaneLockAttempt {
  return {
    attempt_id: attempt.attempt_id,

    at_ms: attempt.at_ms,

    incoming_lane_id: attempt.incoming_lane_id,
    incoming_lane_kind: attempt.incoming_lane_kind,

    active_lane_id: attempt.active_lane_id ?? null,
    active_lane_kind: attempt.active_lane_kind,

    action: attempt.action,
    reason: attempt.reason,

    allowed: attempt.allowed,
    contested: attempt.contested,

    message: attempt.message ?? null,
    source_ref_id: attempt.source_ref_id ?? null,

    data: publicDataOnly(attempt.data)
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

function cleanSequence(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return Math.floor(value);
  }

  return 0;
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
