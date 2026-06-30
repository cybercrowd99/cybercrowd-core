// src/cybercrowd-meaning-pressure-valve.ts
//
// CyberCrowd Meaning Pressure Valve Organ
//
// ONE JOB:
// Release excess meaning pressure when cognitive load remains too high,
// preventing narrative, geometric, and logical overload from collapsing into confusion.
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
// Narrative Stabilizer keeps the system readable.

export type MeaningPressureValveMode =
  | "closed"
  | "vent"
  | "compress"
  | "defer"
  | "pause"
  | "burn";

export type MeaningPressureValveStatus =
  | "stable"
  | "venting"
  | "compressing"
  | "deferring"
  | "paused"
  | "burned";

export type MeaningPressureReleaseReason =
  | "cognitive-overload"
  | "narrative-density"
  | "geometric-density"
  | "logical-density"
  | "runaway-meaning"
  | "manual"
  | "unknown";

export interface MeaningPressureInput {
  at_ms: number;
  load_density: number;
  critical_density: number;
  update_volume?: number;
  overloaded?: boolean;
  reason?: MeaningPressureReleaseReason;
}

export interface MeaningPressureValveState {
  pressure: number;
  released_pressure: number;
  mode: MeaningPressureValveMode;
  status: MeaningPressureValveStatus;
  release_rate: number;
  max_pressure: number;
  last_reason: MeaningPressureReleaseReason;
  last_updated_at_ms: number;
}

export interface MeaningPressureReleaseEvent {
  event_id: string;
  at_ms: number;
  before_pressure: number;
  after_pressure: number;
  released_pressure: number;
  mode: MeaningPressureValveMode;
  status: MeaningPressureValveStatus;
  reason: MeaningPressureReleaseReason;
}

export interface MeaningPressureValveTuneParams {
  release_rate?: number;
  max_pressure?: number;
}

export interface MeaningPressureValveSnapshot {
  state: MeaningPressureValveState;
  events: MeaningPressureReleaseEvent[];
  stable: boolean;
}

export class MeaningPressureValve {
  private state: MeaningPressureValveState;
  private events: MeaningPressureReleaseEvent[] = [];

  constructor(initial?: Partial<MeaningPressureValveState>) {
    const now = Date.now();

    const maxPressure = cleanPositiveNumber(initial?.max_pressure, 1);
    const releaseRate = cleanPositiveNumber(initial?.release_rate, 0.25);

    const pressure = clamp(
      cleanNonNegativeNumber(initial?.pressure, 0),
      0,
      maxPressure
    );

    const releasedPressure = cleanNonNegativeNumber(
      initial?.released_pressure,
      0
    );

    this.state = {
      pressure,
      released_pressure: releasedPressure,
      mode: cleanMode(initial?.mode ?? "closed"),
      status: cleanStatus(initial?.status ?? "stable"),
      release_rate: releaseRate,
      max_pressure: maxPressure,
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Apply CLB-style pressure input.
   *
   * Pressure is the overload ratio above critical density.
   * If density is below critical, pressure drains.
   */
  apply(input: MeaningPressureInput): MeaningPressureValveState {
    const now = cleanTimestamp(input?.at_ms, Date.now());
    const loadDensity = cleanNonNegativeNumber(input?.load_density, 0);
    const criticalDensity = cleanPositiveNumber(input?.critical_density, 1);
    const overloaded = input?.overloaded ?? loadDensity > criticalDensity;
    const reason = cleanReason(input?.reason ?? "unknown");

    const beforePressure = this.state.pressure;

    const pressureRatio = loadDensity / criticalDensity;
    const incomingPressure = overloaded
      ? clamp(pressureRatio - 1, 0, this.state.max_pressure)
      : 0;

    let mode: MeaningPressureValveMode = "closed";

    if (incomingPressure <= 0) {
      mode = "closed";
    } else if (incomingPressure < this.state.max_pressure * 0.33) {
      mode = "compress";
    } else if (incomingPressure < this.state.max_pressure * 0.66) {
      mode = "defer";
    } else if (incomingPressure < this.state.max_pressure) {
      mode = "vent";
    } else {
      mode = "pause";
    }

    const afterPressure = this.releasePressure(incomingPressure, mode);
    const released = Math.max(0, incomingPressure - afterPressure);

    this.state = {
      ...this.state,
      pressure: afterPressure,
      released_pressure: this.state.released_pressure + released,
      mode,
      status: statusFromMode(mode),
      last_reason: reason,
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      before_pressure: beforePressure,
      after_pressure: afterPressure,
      released_pressure: released,
      mode,
      status: this.state.status,
      reason
    });

    return this.getState();
  }

  /**
   * Force a controlled release mode.
   */
  force(
    mode: MeaningPressureValveMode,
    reason: MeaningPressureReleaseReason = "manual",
    at_ms: number = Date.now()
  ): MeaningPressureValveState {
    const clean = cleanMode(mode);
    const now = cleanTimestamp(at_ms, Date.now());
    const beforePressure = this.state.pressure;

    const afterPressure =
      clean === "burn"
        ? 0
        : this.releasePressure(beforePressure, clean);

    const released = Math.max(0, beforePressure - afterPressure);

    this.state = {
      ...this.state,
      pressure: afterPressure,
      released_pressure: this.state.released_pressure + released,
      mode: clean,
      status: statusFromMode(clean),
      last_reason: cleanReason(reason),
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      before_pressure: beforePressure,
      after_pressure: afterPressure,
      released_pressure: released,
      mode: clean,
      status: this.state.status,
      reason: this.state.last_reason
    });

    return this.getState();
  }

  /**
   * Tune release behavior.
   */
  tune(params: MeaningPressureValveTuneParams): MeaningPressureValveState {
    const releaseRate = cleanOptionalPositiveNumber(params?.release_rate);
    const maxPressure = cleanOptionalPositiveNumber(params?.max_pressure);

    this.state = {
      ...this.state,
      release_rate: releaseRate ?? this.state.release_rate,
      max_pressure: maxPressure ?? this.state.max_pressure
    };

    this.state.pressure = clamp(
      this.state.pressure,
      0,
      this.state.max_pressure
    );

    return this.getState();
  }

  /**
   * Drain pressure forward in time without adding new meaning pressure.
   */
  drain(at_ms: number = Date.now()): MeaningPressureValveState {
    const now = cleanTimestamp(at_ms, Date.now());
    const dtMs = Math.max(now - this.state.last_updated_at_ms, 1);
    const dt = dtMs / 1000;

    const beforePressure = this.state.pressure;
    const drainFactor = Math.exp(-this.state.release_rate * dt);
    const afterPressure = beforePressure * drainFactor;
    const released = Math.max(0, beforePressure - afterPressure);

    this.state = {
      ...this.state,
      pressure: afterPressure,
      released_pressure: this.state.released_pressure + released,
      mode: afterPressure > 0 ? "vent" : "closed",
      status: afterPressure > 0 ? "venting" : "stable",
      last_updated_at_ms: now
    };

    this.pushEvent({
      event_id: makeEventId(),
      at_ms: now,
      before_pressure: beforePressure,
      after_pressure: afterPressure,
      released_pressure: released,
      mode: this.state.mode,
      status: this.state.status,
      reason: this.state.last_reason
    });

    return this.getState();
  }

  /**
   * Read current valve state.
   */
  getState(): MeaningPressureValveState {
    return {
      pressure: this.state.pressure,
      released_pressure: this.state.released_pressure,
      mode: this.state.mode,
      status: this.state.status,
      release_rate: this.state.release_rate,
      max_pressure: this.state.max_pressure,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  /**
   * Read recent release events.
   */
  getEvents(): MeaningPressureReleaseEvent[] {
    return this.events.map(cloneEvent);
  }

  /**
   * Read operational snapshot.
   */
  snapshot(): MeaningPressureValveSnapshot {
    const state = this.getState();

    return {
      state,
      events: this.getEvents(),
      stable: state.status === "stable"
    };
  }

  /**
   * Reset pressure and event memory without changing tuning.
   */
  reset(at_ms: number = Date.now()): MeaningPressureValveState {
    this.events = [];

    this.state = {
      ...this.state,
      pressure: 0,
      released_pressure: 0,
      mode: "closed",
      status: "stable",
      last_reason: "unknown",
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  private releasePressure(
    pressure: number,
    mode: MeaningPressureValveMode
  ): number {
    const cleanPressure = clamp(pressure, 0, this.state.max_pressure);

    if (mode === "closed") {
      return cleanPressure;
    }

    if (mode === "compress") {
      return cleanPressure * (1 - this.state.release_rate * 0.25);
    }

    if (mode === "defer") {
      return cleanPressure * (1 - this.state.release_rate * 0.5);
    }

    if (mode === "vent") {
      return cleanPressure * (1 - this.state.release_rate);
    }

    if (mode === "pause") {
      return cleanPressure * (1 - Math.min(0.9, this.state.release_rate * 2));
    }

    if (mode === "burn") {
      return 0;
    }

    return cleanPressure;
  }

  private pushEvent(event: MeaningPressureReleaseEvent): void {
    this.events.push(cloneEvent(event));

    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }
}

export const CyberCrowdMeaningPressureValve =
  new MeaningPressureValve();

function statusFromMode(
  mode: MeaningPressureValveMode
): MeaningPressureValveStatus {
  if (mode === "closed") return "stable";
  if (mode === "compress") return "compressing";
  if (mode === "defer") return "deferring";
  if (mode === "vent") return "venting";
  if (mode === "pause") return "paused";
  if (mode === "burn") return "burned";

  return "stable";
}

function cleanMode(value: unknown): MeaningPressureValveMode {
  if (
    value === "closed" ||
    value === "vent" ||
    value === "compress" ||
    value === "defer" ||
    value === "pause" ||
    value === "burn"
  ) {
    return value;
  }

  return "closed";
}

function cleanStatus(value: unknown): MeaningPressureValveStatus {
  if (
    value === "stable" ||
    value === "venting" ||
    value === "compressing" ||
    value === "deferring" ||
    value === "paused" ||
    value === "burned"
  ) {
    return value;
  }

  return "stable";
}

function cleanReason(value: unknown): MeaningPressureReleaseReason {
  if (
    value === "cognitive-overload" ||
    value === "narrative-density" ||
    value === "geometric-density" ||
    value === "logical-density" ||
    value === "runaway-meaning" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cloneEvent(
  event: MeaningPressureReleaseEvent
): MeaningPressureReleaseEvent {
  return {
    event_id: event.event_id,
    at_ms: event.at_ms,
    before_pressure: event.before_pressure,
    after_pressure: event.after_pressure,
    released_pressure: event.released_pressure,
    mode: event.mode,
    status: event.status,
    reason: event.reason
  };
}

function makeEventId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "meaning-pressure-event-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cleanPositiveNumber(
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

function cleanNonNegativeNumber(
  value: unknown,
  fallback: number
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return value;
  }

  return fallback;
}

function cleanOptionalPositiveNumber(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value;
  }

  return null;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
