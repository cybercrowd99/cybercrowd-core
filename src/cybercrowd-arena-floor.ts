// src/cybercrowd-arena-floor.ts
//
// CyberCrowd Arena Floor Organ
//
// ONE JOB:
// Maintain live state for all CORE lanes while absorbing overload using
// the Cognitive Load Buffer.
//
// This is CORE arena physics.
// This is NOT persona.
// This is NOT IDL.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// Arena Floor holds live lane state.
// Cognitive Load Buffer absorbs lane update overload.
// Lanes stay visible, readable, and recoverable.

import {
  CognitiveLoadBuffer,
  CognitiveLoadState
} from "./cybercrowd-cognitive-load-buffer";

export type ArenaLaneStatus =
  | "open"
  | "active"
  | "quiet"
  | "overloaded"
  | "sealed"
  | "burned";

export type ArenaLaneKind =
  | "identity"
  | "work"
  | "physics"
  | "persona"
  | "reputation"
  | "governance"
  | "jobs"
  | "system"
  | "manual"
  | "unknown";

export type ArenaSignalKind =
  | "entry"
  | "exit"
  | "surface"
  | "signal"
  | "presence"
  | "authority"
  | "proof"
  | "message"
  | "system"
  | "unknown";

export interface ArenaActor {
  actor_id: string;
  identity_id: string;
  entered_at_ms: number;
  last_seen_at_ms: number;
  active: boolean;
  data: Record<string, unknown>;
}

export interface ArenaSurface {
  surface_id: string;
  label: string;
  surface: Record<string, unknown>;
  added_at_ms: number;
  source_ref_id: string | null;
}

export interface ArenaSignal {
  signal_id: string;
  kind: ArenaSignalKind;
  signal: Record<string, unknown>;
  at_ms: number;
  source_ref_id: string | null;
}

export interface ArenaLaneState {
  lane_id: string;
  lane_kind: ArenaLaneKind;

  status: ArenaLaneStatus;

  created_at_ms: number;
  updated_at_ms: number;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  actors: ArenaActor[];
  surfaces: ArenaSurface[];
  signals: ArenaSignal[];

  load: CognitiveLoadState;

  data: Record<string, unknown>;
}

export interface ArenaEnterRequest {
  lane_id: string;
  lane_kind?: ArenaLaneKind;
  identity_id: string;
  data?: Record<string, unknown>;
}

export interface ArenaSurfaceRequest {
  lane_id: string;
  lane_kind?: ArenaLaneKind;
  label?: string | null;
  surface: Record<string, unknown>;
  source_ref_id?: string | null;
}

export interface ArenaSignalRequest {
  lane_id: string;
  lane_kind?: ArenaLaneKind;
  kind?: ArenaSignalKind;
  signal: Record<string, unknown>;
  source_ref_id?: string | null;
}

export interface ArenaFloorResult {
  ok: boolean;
  lane?: ArenaLaneState;
  signal?: ArenaSignal;
  load?: CognitiveLoadState;
  error?: string;
}

export interface ArenaFloorListResult {
  ok: boolean;
  lanes: ArenaLaneState[];
  error?: string;
}

export interface ArenaFloorSnapshot {
  lanes: ArenaLaneState[];
  active: ArenaLaneState[];
  overloaded: ArenaLaneState[];
  load: CognitiveLoadState;
  stable: boolean;
}

export interface ArenaFloorOrgan {
  enter(request: ArenaEnterRequest): ArenaFloorResult;
  leave(lane_id: string, identity_id: string): ArenaFloorResult;

  addSurface(request: ArenaSurfaceRequest): ArenaFloorResult;
  addSignal(request: ArenaSignalRequest): ArenaFloorResult;

  get(lane_id: string): ArenaLaneState | null;
  list(): ArenaFloorListResult;

  seal(lane_id: string): ArenaFloorResult;
  burn(lane_id: string): ArenaFloorResult;

  getLoad(): CognitiveLoadState;
  snapshot(): ArenaFloorSnapshot;
  reset(): void;
}

export class ArenaFloor implements ArenaFloorOrgan {
  private readonly lanes = new Map<string, ArenaLaneState>();

  private readonly clb = new CognitiveLoadBuffer({
    critical_density: 1.0,
    absorption_rate: 0.12
  });

  enter(request: ArenaEnterRequest): ArenaFloorResult {
    const laneId = cleanId(request?.lane_id);
    const identityId = cleanId(request?.identity_id);
    const laneKind = cleanLaneKind(request?.lane_kind ?? "unknown");

    if (!laneId) {
      return {
        ok: false,
        error: "LANE_ID_REQUIRED"
      };
    }

    if (!identityId) {
      return {
        ok: false,
        error: "IDENTITY_ID_REQUIRED"
      };
    }

    const now = Date.now();
    const lane = this.ensureLane(laneId, laneKind, now);

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "ARENA_LANE_LOCKED"
      };
    }

    const existing = lane.actors.find(
      (actor) => actor.identity_id === identityId
    );

    if (existing) {
      existing.active = true;
      existing.last_seen_at_ms = now;
      existing.data = publicDataOnly({
        ...existing.data,
        ...(request?.data ?? {})
      });
    } else {
      lane.actors.push({
        actor_id: makeId("arena-actor"),
        identity_id: identityId,
        entered_at_ms: now,
        last_seen_at_ms: now,
        active: true,
        data: publicDataOnly(request?.data ?? {})
      });
    }

    lane.status = "active";
    lane.updated_at_ms = now;
    lane.load = this.applyLoad(1);

    this.pushSignal(lane, {
      signal_id: makeId("arena-signal"),
      kind: "entry",
      signal: {
        lane_id: laneId,
        identity_id: identityId
      },
      at_ms: now,
      source_ref_id: null
    });

    this.updateOverloadStatus(lane);
    this.lanes.set(laneId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: cloneLoad(lane.load)
    };
  }

  leave(lane_id: string, identity_id: string): ArenaFloorResult {
    const laneId = cleanId(lane_id);
    const identityId = cleanId(identity_id);

    if (!laneId) {
      return {
        ok: false,
        error: "LANE_ID_REQUIRED"
      };
    }

    if (!identityId) {
      return {
        ok: false,
        error: "IDENTITY_ID_REQUIRED"
      };
    }

    const lane = this.lanes.get(laneId);

    if (!lane) {
      return {
        ok: false,
        error: "ARENA_LANE_NOT_FOUND"
      };
    }

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "ARENA_LANE_LOCKED"
      };
    }

    const now = Date.now();

    lane.actors = lane.actors.map((actor) => {
      if (actor.identity_id !== identityId) {
        return cloneActor(actor);
      }

      return {
        ...cloneActor(actor),
        active: false,
        last_seen_at_ms: now
      };
    });

    lane.status = lane.actors.some((actor) => actor.active) ? "active" : "quiet";
    lane.updated_at_ms = now;
    lane.load = this.applyLoad(1);

    this.pushSignal(lane, {
      signal_id: makeId("arena-signal"),
      kind: "exit",
      signal: {
        lane_id: laneId,
        identity_id: identityId
      },
      at_ms: now,
      source_ref_id: null
    });

    this.updateOverloadStatus(lane);
    this.lanes.set(laneId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: cloneLoad(lane.load)
    };
  }

  addSurface(request: ArenaSurfaceRequest): ArenaFloorResult {
    const laneId = cleanId(request?.lane_id);
    const laneKind = cleanLaneKind(request?.lane_kind ?? "unknown");

    if (!laneId) {
      return {
        ok: false,
        error: "LANE_ID_REQUIRED"
      };
    }

    const now = Date.now();
    const lane = this.ensureLane(laneId, laneKind, now);

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "ARENA_LANE_LOCKED"
      };
    }

    lane.surfaces.push({
      surface_id: makeId("arena-surface"),
      label: cleanText(request?.label ?? "Arena Surface", 240) || "Arena Surface",
      surface: publicDataOnly(request?.surface ?? {}),
      added_at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    });

    lane.surfaces = lane.surfaces.slice(-100);
    lane.updated_at_ms = now;
    lane.status = lane.status === "open" ? "active" : lane.status;
    lane.load = this.applyLoad(1);

    this.pushSignal(lane, {
      signal_id: makeId("arena-signal"),
      kind: "surface",
      signal: {
        lane_id: laneId,
        surface_count: lane.surfaces.length
      },
      at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    });

    this.updateOverloadStatus(lane);
    this.lanes.set(laneId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: cloneLoad(lane.load)
    };
  }

  addSignal(request: ArenaSignalRequest): ArenaFloorResult {
    const laneId = cleanId(request?.lane_id);
    const laneKind = cleanLaneKind(request?.lane_kind ?? "unknown");

    if (!laneId) {
      return {
        ok: false,
        error: "LANE_ID_REQUIRED"
      };
    }

    const now = Date.now();
    const lane = this.ensureLane(laneId, laneKind, now);

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "ARENA_LANE_LOCKED"
      };
    }

    const signal: ArenaSignal = {
      signal_id: makeId("arena-signal"),
      kind: cleanSignalKind(request?.kind ?? "unknown"),
      signal: publicDataOnly(request?.signal ?? {}),
      at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    };

    this.pushSignal(lane, signal);

    lane.updated_at_ms = now;
    lane.status = lane.status === "open" ? "active" : lane.status;
    lane.load = this.applyLoad(1);

    this.updateOverloadStatus(lane);
    this.lanes.set(laneId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      signal: cloneSignal(signal),
      load: cloneLoad(lane.load)
    };
  }

  get(lane_id: string): ArenaLaneState | null {
    const lane = this.lanes.get(cleanId(lane_id));
    return lane ? cloneLane(lane) : null;
  }

  list(): ArenaFloorListResult {
    return {
      ok: true,
      lanes: Array.from(this.lanes.values())
        .map(cloneLane)
        .sort((a, b) => b.updated_at_ms - a.updated_at_ms)
    };
  }

  seal(lane_id: string): ArenaFloorResult {
    const laneId = cleanId(lane_id);

    if (!laneId) {
      return {
        ok: false,
        error: "LANE_ID_REQUIRED"
      };
    }

    const lane = this.lanes.get(laneId);

    if (!lane) {
      return {
        ok: false,
        error: "ARENA_LANE_NOT_FOUND"
      };
    }

    const now = Date.now();

    lane.status = "sealed";
    lane.updated_at_ms = now;
    lane.sealed_at_ms = now;
    lane.load = this.applyLoad(1);

    this.lanes.set(laneId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: cloneLoad(lane.load)
    };
  }

  burn(lane_id: string): ArenaFloorResult {
    const laneId = cleanId(lane_id);

    if (!laneId) {
      return {
        ok: false,
        error: "LANE_ID_REQUIRED"
      };
    }

    const lane = this.lanes.get(laneId);

    if (!lane) {
      return {
        ok: false,
        error: "ARENA_LANE_NOT_FOUND"
      };
    }

    const now = Date.now();

    const burned: ArenaLaneState = {
      ...cloneLane(lane),
      status: "burned",
      updated_at_ms: now,
      burned_at_ms: now,
      load: this.applyLoad(1)
    };

    this.lanes.delete(laneId);

    return {
      ok: true,
      lane: burned,
      load: cloneLoad(burned.load)
    };
  }

  getLoad(): CognitiveLoadState {
    return this.clb.getState();
  }

  snapshot(): ArenaFloorSnapshot {
    const lanes = Array.from(this.lanes.values())
      .map(cloneLane)
      .sort((a, b) => b.updated_at_ms - a.updated_at_ms);

    const active = lanes.filter((lane) => lane.status === "active");

    const overloaded = lanes.filter(
      (lane) => lane.status === "overloaded" || lane.load.overloaded
    );

    return {
      lanes,
      active,
      overloaded,
      load: this.getLoad(),
      stable: overloaded.length === 0
    };
  }

  reset(): void {
    this.lanes.clear();
    this.clb.reset();
  }

  private ensureLane(
    laneId: string,
    laneKind: ArenaLaneKind,
    now: number
  ): ArenaLaneState {
    const existing = this.lanes.get(laneId);

    if (existing) {
      const clone = cloneLane(existing);

      if (clone.lane_kind === "unknown" && laneKind !== "unknown") {
        clone.lane_kind = laneKind;
      }

      return clone;
    }

    const lane: ArenaLaneState = {
      lane_id: laneId,
      lane_kind: laneKind,

      status: "open",

      created_at_ms: now,
      updated_at_ms: now,
      sealed_at_ms: null,
      burned_at_ms: null,

      actors: [],
      surfaces: [],
      signals: [],

      load: this.applyLoad(0),

      data: {}
    };

    this.lanes.set(laneId, cloneLane(lane));

    return lane;
  }

  private applyLoad(delta: number): CognitiveLoadState {
    return this.clb.apply({
      at_ms: Date.now(),
      delta_update_volume: delta
    });
  }

  private pushSignal(lane: ArenaLaneState, signal: ArenaSignal): void {
    lane.signals.push(cloneSignal(signal));
    lane.signals = lane.signals.slice(-100);
  }

  private updateOverloadStatus(lane: ArenaLaneState): void {
    if (lane.load.overloaded) {
      lane.status = "overloaded";
    }
  }
}

export const CyberCrowdArenaFloor = new ArenaFloor();

function cleanLaneKind(value: unknown): ArenaLaneKind {
  if (
    value === "identity" ||
    value === "work" ||
    value === "physics" ||
    value === "persona" ||
    value === "reputation" ||
    value === "governance" ||
    value === "jobs" ||
    value === "system" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanSignalKind(value: unknown): ArenaSignalKind {
  if (
    value === "entry" ||
    value === "exit" ||
    value === "surface" ||
    value === "signal" ||
    value === "presence" ||
    value === "authority" ||
    value === "proof" ||
    value === "message" ||
    value === "system" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function makeId(prefix: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return (
    prefix +
    "-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneLane(lane: ArenaLaneState): ArenaLaneState {
  return {
    lane_id: lane.lane_id,
    lane_kind: lane.lane_kind,

    status: lane.status,

    created_at_ms: lane.created_at_ms,
    updated_at_ms: lane.updated_at_ms,
    sealed_at_ms: lane.sealed_at_ms ?? null,
    burned_at_ms: lane.burned_at_ms ?? null,

    actors: lane.actors.map(cloneActor),
    surfaces: lane.surfaces.map(cloneSurface),
    signals: lane.signals.map(cloneSignal),

    load: cloneLoad(lane.load),

    data: publicDataOnly(lane.data)
  };
}

function cloneActor(actor: ArenaActor): ArenaActor {
  return {
    actor_id: actor.actor_id,
    identity_id: actor.identity_id,
    entered_at_ms: actor.entered_at_ms,
    last_seen_at_ms: actor.last_seen_at_ms,
    active: actor.active,
    data: publicDataOnly(actor.data)
  };
}

function cloneSurface(surface: ArenaSurface): ArenaSurface {
  return {
    surface_id: surface.surface_id,
    label: surface.label,
    surface: publicDataOnly(surface.surface),
    added_at_ms: surface.added_at_ms,
    source_ref_id: surface.source_ref_id ?? null
  };
}

function cloneSignal(signal: ArenaSignal): ArenaSignal {
  return {
    signal_id: signal.signal_id,
    kind: signal.kind,
    signal: publicDataOnly(signal.signal),
    at_ms: signal.at_ms,
    source_ref_id: signal.source_ref_id ?? null
  };
}

function cloneLoad(load: CognitiveLoadState): CognitiveLoadState {
  return {
    update_volume: load.update_volume,
    load_density: load.load_density,
    critical_density: load.critical_density,
    absorption_rate: load.absorption_rate,
    overloaded: load.overloaded,
    last_updated_at_ms: load.last_updated_at_ms
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

function cleanText(value: unknown, maxLength: number): string {
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
