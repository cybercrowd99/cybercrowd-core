// src/cybercrowd-focus-window.ts
//
// CyberCrowd Focus Window Organ
//
// ONE JOB:
// Open a protected time-box around the Active Lane Lock so focused work has
// a clear beginning, active window, and release point.
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
// Active Lane Lock protects the lane.
// Focus Window protects the time around the lane.

export type FocusWindowStatus =
  | "idle"
  | "open"
  | "extended"
  | "interrupted"
  | "closed"
  | "sealed"
  | "burned";

export type FocusWindowAction =
  | "open"
  | "extend"
  | "interrupt"
  | "close"
  | "seal"
  | "burn";

export type FocusWindowReason =
  | "focused-work"
  | "active-lane-lock"
  | "thread-continuity"
  | "lane-recovery"
  | "manual"
  | "unknown";

export type FocusWindowLaneKind =
  | "identity"
  | "work"
  | "physics"
  | "persona"
  | "reputation"
  | "governance"
  | "system"
  | "manual"
  | "unknown";

export interface FocusWindowRecord {
  window_id: string;

  lane_id: string;
  lane_kind: FocusWindowLaneKind;

  lock_id: string | null;

  title: string;
  current_job: string | null;
  sequence_number: number;

  status: FocusWindowStatus;
  reason: FocusWindowReason;

  opened_at_ms: number;
  expected_close_at_ms: number;
  closed_at_ms: number | null;
  extended_at_ms: number | null;
  interrupted_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  duration_ms: number;
  extension_count: number;
  interrupt_count: number;

  source_ref_id: string | null;

  data: Record<string, unknown>;
}

export interface FocusWindowEvent {
  event_id: string;
  at_ms: number;

  window_id: string | null;
  lane_id: string | null;
  lock_id: string | null;

  action: FocusWindowAction;
  reason: FocusWindowReason;

  message: string | null;
  source_ref_id: string | null;

  data: Record<string, unknown>;
}

export interface FocusWindowState {
  status: FocusWindowStatus;
  active_window_id: string | null;
  active_lane_id: string | null;
  active_lane_kind: FocusWindowLaneKind;
  active_lock_id: string | null;
  current_job: string | null;
  sequence_number: number;
  opened_count: number;
  closed_count: number;
  extended_count: number;
  interrupted_count: number;
  last_action: FocusWindowAction | null;
  last_reason: FocusWindowReason;
  last_updated_at_ms: number;
}

export interface OpenFocusWindowRequest {
  lane_id: string;
  lane_kind?: FocusWindowLaneKind;

  lock_id?: string | null;

  title: string;
  current_job?: string | null;
  sequence_number?: number;

  duration_ms?: number;
  reason?: FocusWindowReason;

  source_ref_id?: string | null;

  data?: Record<string, unknown>;
}

export interface FocusWindowEventRequest {
  reason?: FocusWindowReason;
  message?: string | null;
  source_ref_id?: string | null;
  data?: Record<string, unknown>;
}

export interface FocusWindowResult {
  ok: boolean;
  state: FocusWindowState;
  window: FocusWindowRecord | null;
  events: FocusWindowEvent[];
  error?: string;
}

export interface FocusWindowSnapshot {
  state: FocusWindowState;
  window: FocusWindowRecord | null;
  windows: FocusWindowRecord[];
  events: FocusWindowEvent[];
  active: boolean;
  stable: boolean;
}

export class FocusWindow {
  private state: FocusWindowState;
  private windows = new Map<string, FocusWindowRecord>();
  private events: FocusWindowEvent[] = [];

  constructor(initial?: Partial<FocusWindowState>) {
    const now = Date.now();

    this.state = {
      status: cleanStatus(initial?.status ?? "idle"),
      active_window_id: cleanNullableId(initial?.active_window_id ?? null),
      active_lane_id: cleanNullableId(initial?.active_lane_id ?? null),
      active_lane_kind: cleanLaneKind(initial?.active_lane_kind ?? "unknown"),
      active_lock_id: cleanNullableId(initial?.active_lock_id ?? null),
      current_job: cleanNullableText(initial?.current_job ?? null, 400),
      sequence_number: cleanSequence(initial?.sequence_number ?? 0),
      opened_count: cleanCount(initial?.opened_count ?? 0),
      closed_count: cleanCount(initial?.closed_count ?? 0),
      extended_count: cleanCount(initial?.extended_count ?? 0),
      interrupted_count: cleanCount(initial?.interrupted_count ?? 0),
      last_action: cleanNullableAction(initial?.last_action ?? null),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Open a protected focus window around the active lane.
   */
  open(request: OpenFocusWindowRequest): FocusWindowResult {
    const laneId = cleanId(request?.lane_id);
    const laneKind = cleanLaneKind(request?.lane_kind ?? "unknown");
    const lockId = cleanNullableId(request?.lock_id ?? null);

    const title = cleanText(request?.title, 240);
    const currentJob = cleanNullableText(request?.current_job ?? null, 400);
    const sequenceNumber = cleanSequence(request?.sequence_number ?? 0);

    const durationMs = cleanDuration(request?.duration_ms ?? 25 * 60 * 1000);
    const reason = cleanReason(request?.reason ?? "focused-work");
    const sourceRefId = cleanNullableId(request?.source_ref_id ?? null);

    if (!laneId) {
      return this.result("LANE_ID_REQUIRED");
    }

    if (!title) {
      return this.result("FOCUS_WINDOW_TITLE_REQUIRED");
    }

    const now = Date.now();

    const activeWindow = this.getActiveWindowInternal();

    if (activeWindow && activeWindow.status === "open") {
      return this.result("FOCUS_WINDOW_ALREADY_OPEN");
    }

    const record: FocusWindowRecord = {
      window_id: makeWindowId(),

      lane_id: laneId,
      lane_kind: laneKind,

      lock_id: lockId,

      title,
      current_job: currentJob,
      sequence_number: sequenceNumber,

      status: "open",
      reason,

      opened_at_ms: now,
      expected_close_at_ms: now + durationMs,
      closed_at_ms: null,
      extended_at_ms: null,
      interrupted_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      duration_ms: durationMs,
      extension_count: 0,
      interrupt_count: 0,

      source_ref_id: sourceRefId,

      data: publicDataOnly(request?.data ?? {})
    };

    this.windows.set(record.window_id, cloneWindow(record));

    this.state = {
      ...this.state,
      status: "open",
      active_window_id: record.window_id,
      active_lane_id: record.lane_id,
      active_lane_kind: record.lane_kind,
      active_lock_id: record.lock_id,
      current_job: record.current_job,
      sequence_number: record.sequence_number,
      opened_count: this.state.opened_count + 1,
      last_action: "open",
      last_reason: reason,
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,

      window_id: record.window_id,
      lane_id: record.lane_id,
      lock_id: record.lock_id,

      action: "open",
      reason,

      message: "Focus window opened",
      source_ref_id: sourceRefId,

      data: publicDataOnly(request?.data ?? {})
    });

    return this.result();
  }

  /**
   * Extend the active focus window.
   */
  extend(
    extra_duration_ms: number,
    request: FocusWindowEventRequest = {}
  ): FocusWindowResult {
    const activeWindow = this.getActiveWindowInternal();

    if (!activeWindow) {
      return this.result("ACTIVE_FOCUS_WINDOW_NOT_FOUND");
    }

    if (activeWindow.status !== "open" && activeWindow.status !== "extended") {
      return this.result("FOCUS_WINDOW_NOT_ACTIVE");
    }

    const now = Date.now();
    const extraDuration = cleanDuration(extra_duration_ms);
    const reason = cleanReason(request?.reason ?? "manual");

    const updated: FocusWindowRecord = {
      ...cloneWindow(activeWindow),
      status: "extended",
      expected_close_at_ms: activeWindow.expected_close_at_ms + extraDuration,
      duration_ms: activeWindow.duration_ms + extraDuration,
      extension_count: activeWindow.extension_count + 1,
      extended_at_ms: now
    };

    this.windows.set(updated.window_id, cloneWindow(updated));

    this.state = {
      ...this.state,
      status: "extended",
      extended_count: this.state.extended_count + 1,
      last_action: "extend",
      last_reason: reason,
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,

      window_id: updated.window_id,
      lane_id: updated.lane_id,
      lock_id: updated.lock_id,

      action: "extend",
      reason,

      message: cleanNullableText(request?.message ?? "Focus window extended", 1000),
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null),

      data: publicDataOnly(request?.data ?? {})
    });

    return this.result();
  }

  /**
   * Mark the active window as interrupted without deleting it.
   */
  interrupt(request: FocusWindowEventRequest = {}): FocusWindowResult {
    const activeWindow = this.getActiveWindowInternal();

    if (!activeWindow) {
      return this.result("ACTIVE_FOCUS_WINDOW_NOT_FOUND");
    }

    if (
      activeWindow.status === "closed" ||
      activeWindow.status === "sealed" ||
      activeWindow.status === "burned"
    ) {
      return this.result("FOCUS_WINDOW_NOT_ACTIVE");
    }

    const now = Date.now();
    const reason = cleanReason(request?.reason ?? "manual");

    const updated: FocusWindowRecord = {
      ...cloneWindow(activeWindow),
      status: "interrupted",
      interrupted_at_ms: now,
      interrupt_count: activeWindow.interrupt_count + 1
    };

    this.windows.set(updated.window_id, cloneWindow(updated));

    this.state = {
      ...this.state,
      status: "interrupted",
      interrupted_count: this.state.interrupted_count + 1,
      last_action: "interrupt",
      last_reason: reason,
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,

      window_id: updated.window_id,
      lane_id: updated.lane_id,
      lock_id: updated.lock_id,

      action: "interrupt",
      reason,

      message: cleanNullableText(
        request?.message ?? "Focus window interrupted",
        1000
      ),
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null),

      data: publicDataOnly(request?.data ?? {})
    });

    return this.result();
  }

  /**
   * Close the active focus window.
   */
  close(request: FocusWindowEventRequest = {}): FocusWindowResult {
    const activeWindow = this.getActiveWindowInternal();

    if (!activeWindow) {
      return this.result("ACTIVE_FOCUS_WINDOW_NOT_FOUND");
    }

    if (
      activeWindow.status === "closed" ||
      activeWindow.status === "sealed" ||
      activeWindow.status === "burned"
    ) {
      return this.result("FOCUS_WINDOW_ALREADY_CLOSED");
    }

    const now = Date.now();
    const reason = cleanReason(request?.reason ?? "manual");

    const updated: FocusWindowRecord = {
      ...cloneWindow(activeWindow),
      status: "closed",
      closed_at_ms: now
    };

    this.windows.set(updated.window_id, cloneWindow(updated));

    this.state = {
      ...this.state,
      status: "closed",
      active_window_id: null,
      active_lane_id: null,
      active_lane_kind: "unknown",
      active_lock_id: null,
      current_job: null,
      sequence_number: 0,
      closed_count: this.state.closed_count + 1,
      last_action: "close",
      last_reason: reason,
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,

      window_id: updated.window_id,
      lane_id: updated.lane_id,
      lock_id: updated.lock_id,

      action: "close",
      reason,

      message: cleanNullableText(request?.message ?? "Focus window closed", 1000),
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null),

      data: publicDataOnly(request?.data ?? {})
    });

    return this.result();
  }

  /**
   * Auto-close the active window if its expected close time has passed.
   */
  tick(at_ms: number = Date.now()): FocusWindowResult {
    const activeWindow = this.getActiveWindowInternal();

    if (!activeWindow) {
      return this.result();
    }

    const now = cleanTimestamp(at_ms, Date.now());

    if (
      (activeWindow.status === "open" || activeWindow.status === "extended") &&
      now >= activeWindow.expected_close_at_ms
    ) {
      return this.close({
        reason: "manual",
        message: "Focus window elapsed"
      });
    }

    this.state = {
      ...this.state,
      last_updated_at_ms: now
    };

    return this.result();
  }

  /**
   * Seal the active focus window.
   */
  seal(at_ms: number = Date.now()): FocusWindowResult {
    const activeWindow = this.getActiveWindowInternal();

    if (!activeWindow) {
      return this.result("ACTIVE_FOCUS_WINDOW_NOT_FOUND");
    }

    const now = cleanTimestamp(at_ms, Date.now());

    const updated: FocusWindowRecord = {
      ...cloneWindow(activeWindow),
      status: "sealed",
      sealed_at_ms: now
    };

    this.windows.set(updated.window_id, cloneWindow(updated));

    this.state = {
      ...this.state,
      status: "sealed",
      last_action: "seal",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,

      window_id: updated.window_id,
      lane_id: updated.lane_id,
      lock_id: updated.lock_id,

      action: "seal",
      reason: "manual",

      message: "Focus window sealed",
      source_ref_id: null,

      data: {}
    });

    return this.result();
  }

  /**
   * Burn the active focus window from live memory.
   */
  burn(at_ms: number = Date.now()): FocusWindowResult {
    const now = cleanTimestamp(at_ms, Date.now());
    const activeWindowId = this.state.active_window_id;

    if (activeWindowId) {
      this.windows.delete(activeWindowId);
    }

    this.state = {
      ...this.state,
      status: "burned",
      active_window_id: null,
      active_lane_id: null,
      active_lane_kind: "unknown",
      active_lock_id: null,
      current_job: null,
      sequence_number: 0,
      last_action: "burn",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,

      window_id: activeWindowId,
      lane_id: null,
      lock_id: null,

      action: "burn",
      reason: "manual",

      message: "Focus window burned from live memory",
      source_ref_id: null,

      data: {}
    });

    return this.result();
  }

  /**
   * Read current state.
   */
  getState(): FocusWindowState {
    return {
      status: this.state.status,
      active_window_id: this.state.active_window_id,
      active_lane_id: this.state.active_lane_id,
      active_lane_kind: this.state.active_lane_kind,
      active_lock_id: this.state.active_lock_id,
      current_job: this.state.current_job,
      sequence_number: this.state.sequence_number,
      opened_count: this.state.opened_count,
      closed_count: this.state.closed_count,
      extended_count: this.state.extended_count,
      interrupted_count: this.state.interrupted_count,
      last_action: this.state.last_action,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  /**
   * Read active focus window.
   */
  getActiveWindow(): FocusWindowRecord | null {
    const window = this.getActiveWindowInternal();
    return window ? cloneWindow(window) : null;
  }

  /**
   * Read all focus windows.
   */
  getWindows(): FocusWindowRecord[] {
    return Array.from(this.windows.values())
      .map(cloneWindow)
      .sort((a, b) => b.opened_at_ms - a.opened_at_ms);
  }

  /**
   * Read recent focus events.
   */
  getEvents(): FocusWindowEvent[] {
    return this.events.map(cloneEvent);
  }

  /**
   * Read operational snapshot.
   */
  snapshot(): FocusWindowSnapshot {
    return {
      state: this.getState(),
      window: this.getActiveWindow(),
      windows: this.getWindows(),
      events: this.getEvents(),
      active:
        this.state.status === "open" ||
        this.state.status === "extended",
      stable:
        this.state.status === "idle" ||
        this.state.status === "open" ||
        this.state.status === "extended" ||
        this.state.status === "closed"
    };
  }

  /**
   * Reset all focus window memory.
   */
  reset(at_ms: number = Date.now()): FocusWindowState {
    this.windows.clear();
    this.events = [];

    this.state = {
      status: "idle",
      active_window_id: null,
      active_lane_id: null,
      active_lane_kind: "unknown",
      active_lock_id: null,
      current_job: null,
      sequence_number: 0,
      opened_count: 0,
      closed_count: 0,
      extended_count: 0,
      interrupted_count: 0,
      last_action: null,
      last_reason: "unknown",
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  private getActiveWindowInternal(): FocusWindowRecord | null {
    const windowId = this.state.active_window_id;

    if (!windowId) return null;

    const window = this.windows.get(windowId);

    return window ? cloneWindow(window) : null;
  }

  private pushEvent(event: FocusWindowEvent): void {
    this.events.push(cloneEvent(event));

    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  private result(error?: string): FocusWindowResult {
    return {
      ok: !error,
      state: this.getState(),
      window: this.getActiveWindow(),
      events: this.getEvents(),
      error
    };
  }
}

export const CyberCrowdFocusWindow =
  new FocusWindow();

function cleanStatus(value: unknown): FocusWindowStatus {
  if (
    value === "idle" ||
    value === "open" ||
    value === "extended" ||
    value === "interrupted" ||
    value === "closed" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "idle";
}

function cleanNullableAction(value: unknown): FocusWindowAction | null {
  if (
    value === "open" ||
    value === "extend" ||
    value === "interrupt" ||
    value === "close" ||
    value === "seal" ||
    value === "burn"
  ) {
    return value;
  }

  return null;
}

function cleanReason(value: unknown): FocusWindowReason {
  if (
    value === "focused-work" ||
    value === "active-lane-lock" ||
    value === "thread-continuity" ||
    value === "lane-recovery" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanLaneKind(value: unknown): FocusWindowLaneKind {
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

function makeWindowId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "focus-window-" +
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
    "focus-window-event-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneWindow(window: FocusWindowRecord): FocusWindowRecord {
  return {
    window_id: window.window_id,

    lane_id: window.lane_id,
    lane_kind: window.lane_kind,

    lock_id: window.lock_id ?? null,

    title: window.title,
    current_job: window.current_job ?? null,
    sequence_number: window.sequence_number,

    status: window.status,
    reason: window.reason,

    opened_at_ms: window.opened_at_ms,
    expected_close_at_ms: window.expected_close_at_ms,
    closed_at_ms: window.closed_at_ms ?? null,
    extended_at_ms: window.extended_at_ms ?? null,
    interrupted_at_ms: window.interrupted_at_ms ?? null,
    sealed_at_ms: window.sealed_at_ms ?? null,
    burned_at_ms: window.burned_at_ms ?? null,

    duration_ms: window.duration_ms,
    extension_count: window.extension_count,
    interrupt_count: window.interrupt_count,

    source_ref_id: window.source_ref_id ?? null,

    data: publicDataOnly(window.data)
  };
}

function cloneEvent(event: FocusWindowEvent): FocusWindowEvent {
  return {
    event_id: event.event_id,
    at_ms: event.at_ms,

    window_id: event.window_id ?? null,
    lane_id: event.lane_id ?? null,
    lock_id: event.lock_id ?? null,

    action: event.action,
    reason: event.reason,

    message: event.message ?? null,
    source_ref_id: event.source_ref_id ?? null,

    data: publicDataOnly(event.data)
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

function cleanDuration(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(Math.min(value, 24 * 60 * 60 * 1000));
  }

  return 25 * 60 * 1000;
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
