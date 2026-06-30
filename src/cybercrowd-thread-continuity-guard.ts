// src/cybercrowd-thread-continuity-guard.ts
//
// CyberCrowd Thread Continuity Guard Organ
//
// ONE JOB:
// Protect the active thread after cognitive load, meaning pressure,
// and narrative stabilization events so the system does not lose lane,
// sequence, or current job.
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
// Narrative Stabilizer restores readable order.
// Thread Continuity Guard keeps the active lane from being hijacked,
// reset, scattered, or silently replaced.

export type ThreadContinuityStatus =
  | "stable"
  | "guarding"
  | "drift-detected"
  | "recovered"
  | "paused"
  | "sealed"
  | "burned";

export type ThreadContinuityAction =
  | "keep"
  | "guard"
  | "detect-drift"
  | "recover"
  | "pause"
  | "seal"
  | "burn";

export type ThreadContinuityReason =
  | "narrative-stabilized"
  | "meaning-pressure-release"
  | "cognitive-overload"
  | "lane-drift"
  | "sequence-break"
  | "current-job-risk"
  | "manual"
  | "unknown";

export type ThreadContinuityLaneKind =
  | "identity"
  | "work"
  | "physics"
  | "persona"
  | "reputation"
  | "governance"
  | "system"
  | "manual"
  | "unknown";

export interface ThreadContinuityAnchor {
  anchor_id: string;
  lane_id: string;
  lane_kind: ThreadContinuityLaneKind;
  title: string;
  current_job: string | null;
  sequence_number: number;
  source_ref_id: string | null;
  created_at_ms: number;
  updated_at_ms: number;
  data: Record<string, unknown>;
}

export interface ThreadContinuityEvent {
  event_id: string;
  at_ms: number;
  action: ThreadContinuityAction;
  reason: ThreadContinuityReason;
  lane_id: string | null;
  previous_lane_id: string | null;
  sequence_number: number | null;
  message: string | null;
}

export interface ThreadContinuityState {
  status: ThreadContinuityStatus;
  active_anchor_id: string | null;
  active_lane_id: string | null;
  active_lane_kind: ThreadContinuityLaneKind;
  current_job: string | null;
  sequence_number: number;
  drift_count: number;
  recovery_count: number;
  paused: boolean;
  last_action: ThreadContinuityAction;
  last_reason: ThreadContinuityReason;
  last_updated_at_ms: number;
}

export interface ThreadContinuitySetAnchorRequest {
  lane_id: string;
  lane_kind?: ThreadContinuityLaneKind;
  title: string;
  current_job?: string | null;
  sequence_number?: number;
  source_ref_id?: string | null;
  data?: Record<string, unknown>;
}

export interface ThreadContinuityCheckRequest {
  lane_id: string;
  lane_kind?: ThreadContinuityLaneKind;
  current_job?: string | null;
  sequence_number?: number;
  reason?: ThreadContinuityReason;
  source_ref_id?: string | null;
  message?: string | null;
}

export interface ThreadContinuityResult {
  ok: boolean;
  state: ThreadContinuityState;
  anchor: ThreadContinuityAnchor | null;
  events: ThreadContinuityEvent[];
  drift_detected: boolean;
  error?: string;
}

export interface ThreadContinuitySnapshot {
  state: ThreadContinuityState;
  anchor: ThreadContinuityAnchor | null;
  anchors: ThreadContinuityAnchor[];
  events: ThreadContinuityEvent[];
  stable: boolean;
}

export class ThreadContinuityGuard {
  private state: ThreadContinuityState;
  private anchors = new Map<string, ThreadContinuityAnchor>();
  private events: ThreadContinuityEvent[] = [];

  constructor(initial?: Partial<ThreadContinuityState>) {
    const now = Date.now();

    this.state = {
      status: cleanStatus(initial?.status ?? "stable"),
      active_anchor_id: cleanNullableId(initial?.active_anchor_id ?? null),
      active_lane_id: cleanNullableId(initial?.active_lane_id ?? null),
      active_lane_kind: cleanLaneKind(initial?.active_lane_kind ?? "unknown"),
      current_job: cleanNullableText(initial?.current_job ?? null, 400),
      sequence_number: cleanSequence(initial?.sequence_number ?? 0),
      drift_count: cleanCount(initial?.drift_count ?? 0),
      recovery_count: cleanCount(initial?.recovery_count ?? 0),
      paused: Boolean(initial?.paused ?? false),
      last_action: cleanAction(initial?.last_action ?? "keep"),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Set the active thread anchor.
   */
  setAnchor(
    request: ThreadContinuitySetAnchorRequest
  ): ThreadContinuityResult {
    const laneId = cleanId(request?.lane_id);
    const laneKind = cleanLaneKind(request?.lane_kind ?? "unknown");
    const title = cleanText(request?.title, 240);
    const currentJob = cleanNullableText(request?.current_job ?? null, 400);
    const sourceRefId = cleanNullableId(request?.source_ref_id ?? null);
    const sequenceNumber = cleanSequence(request?.sequence_number ?? 0);

    if (!laneId) {
      return this.result("LANE_ID_REQUIRED", false);
    }

    if (!title) {
      return this.result("ANCHOR_TITLE_REQUIRED", false);
    }

    const now = Date.now();

    const anchor: ThreadContinuityAnchor = {
      anchor_id: makeAnchorId(),
      lane_id: laneId,
      lane_kind: laneKind,
      title,
      current_job: currentJob,
      sequence_number: sequenceNumber,
      source_ref_id: sourceRefId,
      created_at_ms: now,
      updated_at_ms: now,
      data: publicDataOnly(request?.data ?? {})
    };

    const previousLaneId = this.state.active_lane_id;

    this.anchors.set(anchor.anchor_id, cloneAnchor(anchor));

    this.state = {
      ...this.state,
      status: "guarding",
      active_anchor_id: anchor.anchor_id,
      active_lane_id: anchor.lane_id,
      active_lane_kind: anchor.lane_kind,
      current_job: anchor.current_job,
      sequence_number: anchor.sequence_number,
      paused: false,
      last_action: "guard",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      action: "guard",
      reason: "manual",
      lane_id: anchor.lane_id,
      previous_lane_id: previousLaneId,
      sequence_number: anchor.sequence_number,
      message: "Thread anchor set"
    });

    return this.result(undefined, false);
  }

  /**
   * Check incoming work against the active thread anchor.
   */
  check(
    request: ThreadContinuityCheckRequest
  ): ThreadContinuityResult {
    const now = Date.now();

    const laneId = cleanId(request?.lane_id);
    const laneKind = cleanLaneKind(request?.lane_kind ?? "unknown");
    const currentJob = cleanNullableText(request?.current_job ?? null, 400);
    const sequenceNumber = cleanNullableSequence(request?.sequence_number);
    const reason = cleanReason(request?.reason ?? "unknown");
    const message = cleanNullableText(request?.message ?? null, 1000);

    if (!laneId) {
      return this.result("LANE_ID_REQUIRED", false);
    }

    const activeAnchor = this.getActiveAnchorInternal();

    if (!activeAnchor) {
      return this.setAnchor({
        lane_id: laneId,
        lane_kind: laneKind,
        title: "Recovered Anchor",
        current_job: currentJob,
        sequence_number: sequenceNumber ?? 0,
        source_ref_id: request?.source_ref_id ?? null
      });
    }

    const laneDrift = laneId !== activeAnchor.lane_id;

    const jobDrift =
      Boolean(currentJob) &&
      Boolean(activeAnchor.current_job) &&
      currentJob !== activeAnchor.current_job;

    const sequenceBreak =
      sequenceNumber !== null &&
      sequenceNumber < activeAnchor.sequence_number;

    const driftDetected = laneDrift || jobDrift || sequenceBreak;

    if (driftDetected) {
      this.state = {
        ...this.state,
        status: "drift-detected",
        drift_count: this.state.drift_count + 1,
        last_action: "detect-drift",
        last_reason:
          laneDrift
            ? "lane-drift"
            : sequenceBreak
              ? "sequence-break"
              : "current-job-risk",
        last_updated_at_ms: now
      };

      this.pushEvent({
        event_id: makeEventId(),
        at_ms: now,
        action: "detect-drift",
        reason: this.state.last_reason,
        lane_id: laneId,
        previous_lane_id: activeAnchor.lane_id,
        sequence_number: sequenceNumber,
        message: message ?? "Thread drift detected"
      });

      return this.result(undefined, true);
    }

    const nextSequence =
      sequenceNumber !== null
        ? Math.max(activeAnchor.sequence_number, sequenceNumber)
        : activeAnchor.sequence_number + 1;

    const updatedAnchor: ThreadContinuityAnchor = {
      ...cloneAnchor(activeAnchor),
      lane_kind: laneKind === "unknown" ? activeAnchor.lane_kind : laneKind,
      current_job: currentJob ?? activeAnchor.current_job,
      sequence_number: nextSequence,
      updated_at_ms: now
    };

    this.anchors.set(updatedAnchor.anchor_id, cloneAnchor(updatedAnchor));

    this.state = {
      ...this.state,
      status: "stable",
      active_lane_id: updatedAnchor.lane_id,
      active_lane_kind: updatedAnchor.lane_kind,
      current_job: updatedAnchor.current_job,
      sequence_number: updatedAnchor.sequence_number,
      paused: false,
      last_action: "keep",
      last_reason: reason,
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      action: "keep",
      reason,
      lane_id: updatedAnchor.lane_id,
      previous_lane_id: updatedAnchor.lane_id,
      sequence_number: updatedAnchor.sequence_number,
      message: message ?? "Thread continuity preserved"
    });

    return this.result(undefined, false);
  }

  /**
   * Recover back to the active anchor after drift.
   */
  recover(
    reason: ThreadContinuityReason = "manual",
    at_ms: number = Date.now()
  ): ThreadContinuityResult {
    const now = cleanTimestamp(at_ms, Date.now());
    const activeAnchor = this.getActiveAnchorInternal();

    if (!activeAnchor) {
      return this.result("ACTIVE_ANCHOR_NOT_FOUND", false);
    }

    this.state = {
      ...this.state,
      status: "recovered",
      active_lane_id: activeAnchor.lane_id,
      active_lane_kind: activeAnchor.lane_kind,
      current_job: activeAnchor.current_job,
      sequence_number: activeAnchor.sequence_number,
      recovery_count: this.state.recovery_count + 1,
      paused: false,
      last_action: "recover",
      last_reason: cleanReason(reason),
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      action: "recover",
      reason: this.state.last_reason,
      lane_id: activeAnchor.lane_id,
      previous_lane_id: activeAnchor.lane_id,
      sequence_number: activeAnchor.sequence_number,
      message: "Thread recovered to active anchor"
    });

    return this.result(undefined, false);
  }

  /**
   * Pause continuity changes without burning the anchor.
   */
  pause(
    reason: ThreadContinuityReason = "manual",
    at_ms: number = Date.now()
  ): ThreadContinuityState {
    const now = cleanTimestamp(at_ms, Date.now());

    this.state = {
      ...this.state,
      status: "paused",
      paused: true,
      last_action: "pause",
      last_reason: cleanReason(reason),
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      action: "pause",
      reason: this.state.last_reason,
      lane_id: this.state.active_lane_id,
      previous_lane_id: this.state.active_lane_id,
      sequence_number: this.state.sequence_number,
      message: "Thread continuity paused"
    });

    return this.getState();
  }

  /**
   * Resume continuity protection.
   */
  resume(
    reason: ThreadContinuityReason = "manual",
    at_ms: number = Date.now()
  ): ThreadContinuityState {
    const now = cleanTimestamp(at_ms, Date.now());

    this.state = {
      ...this.state,
      status: this.state.active_anchor_id ? "guarding" : "stable",
      paused: false,
      last_action: "guard",
      last_reason: cleanReason(reason),
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      action: "guard",
      reason: this.state.last_reason,
      lane_id: this.state.active_lane_id,
      previous_lane_id: this.state.active_lane_id,
      sequence_number: this.state.sequence_number,
      message: "Thread continuity resumed"
    });

    return this.getState();
  }

  /**
   * Seal the current continuity guard.
   */
  seal(at_ms: number = Date.now()): ThreadContinuityState {
    const now = cleanTimestamp(at_ms, Date.now());

    this.state = {
      ...this.state,
      status: "sealed",
      paused: true,
      last_action: "seal",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      action: "seal",
      reason: "manual",
      lane_id: this.state.active_lane_id,
      previous_lane_id: this.state.active_lane_id,
      sequence_number: this.state.sequence_number,
      message: "Thread continuity sealed"
    });

    return this.getState();
  }

  /**
   * Burn continuity memory from this guard.
   */
  burn(at_ms: number = Date.now()): ThreadContinuityState {
    const now = cleanTimestamp(at_ms, Date.now());

    this.anchors.clear();
    this.events = [];

    this.state = {
      status: "burned",
      active_anchor_id: null,
      active_lane_id: null,
      active_lane_kind: "unknown",
      current_job: null,
      sequence_number: 0,
      drift_count: this.state.drift_count,
      recovery_count: this.state.recovery_count,
      paused: true,
      last_action: "burn",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    return this.getState();
  }

  /**
   * Read current state.
   */
  getState(): ThreadContinuityState {
    return {
      status: this.state.status,
      active_anchor_id: this.state.active_anchor_id,
      active_lane_id: this.state.active_lane_id,
      active_lane_kind: this.state.active_lane_kind,
      current_job: this.state.current_job,
      sequence_number: this.state.sequence_number,
      drift_count: this.state.drift_count,
      recovery_count: this.state.recovery_count,
      paused: this.state.paused,
      last_action: this.state.last_action,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  /**
   * Read active anchor.
   */
  getActiveAnchor(): ThreadContinuityAnchor | null {
    const anchor = this.getActiveAnchorInternal();
    return anchor ? cloneAnchor(anchor) : null;
  }

  /**
   * Read all anchors.
   */
  getAnchors(): ThreadContinuityAnchor[] {
    return Array.from(this.anchors.values())
      .map(cloneAnchor)
      .sort((a, b) => b.updated_at_ms - a.updated_at_ms);
  }

  /**
   * Read recent continuity events.
   */
  getEvents(): ThreadContinuityEvent[] {
    return this.events.map(cloneEvent);
  }

  /**
   * Read operational snapshot.
   */
  snapshot(): ThreadContinuitySnapshot {
    return {
      state: this.getState(),
      anchor: this.getActiveAnchor(),
      anchors: this.getAnchors(),
      events: this.getEvents(),
      stable:
        this.state.status === "stable" ||
        this.state.status === "guarding" ||
        this.state.status === "recovered"
    };
  }

  /**
   * Reset the guard without preserving anchors.
   */
  reset(at_ms: number = Date.now()): ThreadContinuityState {
    this.anchors.clear();
    this.events = [];

    this.state = {
      status: "stable",
      active_anchor_id: null,
      active_lane_id: null,
      active_lane_kind: "unknown",
      current_job: null,
      sequence_number: 0,
      drift_count: 0,
      recovery_count: 0,
      paused: false,
      last_action: "keep",
      last_reason: "unknown",
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  private getActiveAnchorInternal(): ThreadContinuityAnchor | null {
    const anchorId = this.state.active_anchor_id;

    if (!anchorId) return null;

    const anchor = this.anchors.get(anchorId);

    return anchor ? cloneAnchor(anchor) : null;
  }

  private pushEvent(event: ThreadContinuityEvent): void {
    this.events.push(cloneEvent(event));

    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  private result(
    error?: string,
    driftDetected: boolean = false
  ): ThreadContinuityResult {
    return {
      ok: !error,
      state: this.getState(),
      anchor: this.getActiveAnchor(),
      events: this.getEvents(),
      drift_detected: driftDetected,
      error
    };
  }
}

export const CyberCrowdThreadContinuityGuard =
  new ThreadContinuityGuard();

function cleanStatus(value: unknown): ThreadContinuityStatus {
  if (
    value === "stable" ||
    value === "guarding" ||
    value === "drift-detected" ||
    value === "recovered" ||
    value === "paused" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "stable";
}

function cleanAction(value: unknown): ThreadContinuityAction {
  if (
    value === "keep" ||
    value === "guard" ||
    value === "detect-drift" ||
    value === "recover" ||
    value === "pause" ||
    value === "seal" ||
    value === "burn"
  ) {
    return value;
  }

  return "keep";
}

function cleanReason(value: unknown): ThreadContinuityReason {
  if (
    value === "narrative-stabilized" ||
    value === "meaning-pressure-release" ||
    value === "cognitive-overload" ||
    value === "lane-drift" ||
    value === "sequence-break" ||
    value === "current-job-risk" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanLaneKind(value: unknown): ThreadContinuityLaneKind {
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

function makeAnchorId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "thread-anchor-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function makeEventId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "thread-event-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneAnchor(anchor: ThreadContinuityAnchor): ThreadContinuityAnchor {
  return {
    anchor_id: anchor.anchor_id,
    lane_id: anchor.lane_id,
    lane_kind: anchor.lane_kind,
    title: anchor.title,
    current_job: anchor.current_job ?? null,
    sequence_number: anchor.sequence_number,
    source_ref_id: anchor.source_ref_id ?? null,
    created_at_ms: anchor.created_at_ms,
    updated_at_ms: anchor.updated_at_ms,
    data: publicDataOnly(anchor.data)
  };
}

function cloneEvent(event: ThreadContinuityEvent): ThreadContinuityEvent {
  return {
    event_id: event.event_id,
    at_ms: event.at_ms,
    action: event.action,
    reason: event.reason,
    lane_id: event.lane_id ?? null,
    previous_lane_id: event.previous_lane_id ?? null,
    sequence_number: event.sequence_number ?? null,
    message: event.message ?? null
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

function cleanNullableSequence(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return Math.floor(value);
  }

  return null;
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
