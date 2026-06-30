// src/cybercrowd-cognitive-load-buffer.ts
//
// CyberCrowd Cognitive Load Buffer Organ
//
// ONE JOB:
// Absorb excess narrative, geometric, and logical update density when too much
// meaning enters the system too quickly.
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
// CLB absorbs update overload.
// IDL protects identity separation.
// Persona shows public-facing human surface.

export interface CognitiveLoadState {
  // U: total update volume across all layers
  update_volume: number;

  // Q: load density field, dU/dt
  load_density: number;

  // Q_crit: critical threshold for overload
  critical_density: number;

  // β: buffer absorption coefficient
  absorption_rate: number;

  // overload flag
  overloaded: boolean;

  // last update timestamp
  last_updated_at_ms: number;
}

export interface CognitiveLoadEvent {
  at_ms: number;
  delta_update_volume: number;
}

export interface CognitiveLoadTuneParams {
  critical_density?: number;
  absorption_rate?: number;
}

export interface CognitiveLoadBufferSnapshot {
  state: CognitiveLoadState;
  stable: boolean;
  overloaded: boolean;
}

export class CognitiveLoadBuffer {
  private state: CognitiveLoadState;

  constructor(initial?: Partial<CognitiveLoadState>) {
    const now = Date.now();

    const criticalDensity = cleanPositiveNumber(
      initial?.critical_density,
      1
    );

    const absorptionRate = cleanNonNegativeNumber(
      initial?.absorption_rate,
      0.1
    );

    const updateVolume = cleanNonNegativeNumber(
      initial?.update_volume,
      0
    );

    const loadDensity = cleanNonNegativeNumber(
      initial?.load_density,
      0
    );

    this.state = {
      update_volume: updateVolume,
      load_density: loadDensity,
      critical_density: criticalDensity,
      absorption_rate: absorptionRate,
      overloaded: loadDensity > criticalDensity,
      last_updated_at_ms: cleanTimestamp(
        initial?.last_updated_at_ms,
        now
      )
    };
  }

  /**
   * Apply a new update event into the CLB.
   *
   * This increases U and recomputes Q = dU/dt,
   * then applies buffer absorption:
   *
   * ∂Q/∂t = −βQ
   * Q_buffered = Q_raw * e^(−βdt)
   */
  apply(event: CognitiveLoadEvent): CognitiveLoadState {
    const now = cleanTimestamp(event?.at_ms, Date.now());
    const deltaUpdateVolume = cleanNonNegativeNumber(
      event?.delta_update_volume,
      0
    );

    const dtMs = Math.max(now - this.state.last_updated_at_ms, 1);
    const dt = dtMs / 1000;

    const previousU = this.state.update_volume;
    const newU = previousU + deltaUpdateVolume;

    const qRaw = (newU - previousU) / dt;
    const beta = this.state.absorption_rate;
    const qBuffered = qRaw * Math.exp(-beta * dt);

    const overloaded = qBuffered > this.state.critical_density;

    this.state = {
      ...this.state,
      update_volume: newU,
      load_density: qBuffered,
      overloaded,
      last_updated_at_ms: now
    };

    return this.getState();
  }

  /**
   * Manually adjust critical density and absorption rate.
   *
   * NAM, CIG, TSR, HCL, or later regulators can tune CLB behavior
   * without changing identity, persona, work reputation, auth, payment,
   * or public surfaces.
   */
  tune(params: CognitiveLoadTuneParams): CognitiveLoadState {
    const criticalDensity = cleanOptionalPositiveNumber(
      params?.critical_density
    );

    const absorptionRate = cleanOptionalNonNegativeNumber(
      params?.absorption_rate
    );

    this.state = {
      ...this.state,
      critical_density:
        criticalDensity ?? this.state.critical_density,
      absorption_rate:
        absorptionRate ?? this.state.absorption_rate
    };

    this.state.overloaded =
      this.state.load_density > this.state.critical_density;

    return this.getState();
  }

  /**
   * Drain load density forward in time without adding new update volume.
   *
   * This lets the buffer cool down:
   *
   * Q(t) = Q0 * e^(−βdt)
   */
  drain(at_ms: number = Date.now()): CognitiveLoadState {
    const now = cleanTimestamp(at_ms, Date.now());
    const dtMs = Math.max(now - this.state.last_updated_at_ms, 1);
    const dt = dtMs / 1000;

    const beta = this.state.absorption_rate;
    const qDrained = this.state.load_density * Math.exp(-beta * dt);

    this.state = {
      ...this.state,
      load_density: qDrained,
      overloaded: qDrained > this.state.critical_density,
      last_updated_at_ms: now
    };

    return this.getState();
  }

  /**
   * Read current CLB state.
   */
  getState(): CognitiveLoadState {
    return {
      update_volume: this.state.update_volume,
      load_density: this.state.load_density,
      critical_density: this.state.critical_density,
      absorption_rate: this.state.absorption_rate,
      overloaded: this.state.overloaded,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  /**
   * Read a small operational snapshot.
   */
  snapshot(): CognitiveLoadBufferSnapshot {
    const state = this.getState();

    return {
      state,
      stable: !state.overloaded,
      overloaded: state.overloaded
    };
  }

  /**
   * Reset the buffer without changing threshold tuning.
   */
  reset(at_ms: number = Date.now()): CognitiveLoadState {
    this.state = {
      ...this.state,
      update_volume: 0,
      load_density: 0,
      overloaded: false,
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }
}

export const CyberCrowdCognitiveLoadBuffer =
  new CognitiveLoadBuffer();

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

function cleanOptionalNonNegativeNumber(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
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
