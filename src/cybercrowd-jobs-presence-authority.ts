// src/cybercrowd-jobs-presence-authority.ts
//
// CyberCrowd Jobs Presence Authority Organ
//
// ONE JOB:
// Manage job presence, proximity, surfaces, decals, authority lanes, and pings
// while absorbing overload using the Cognitive Load Buffer.
//
// This is CORE jobs physics.
// This is NOT persona.
// This is NOT IDL.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT punishment.
//
// Job Presence shows who is in the job lane.
// Surfaces show what can be worked.
// Decals mark the lane.
// Authority records who can act.
// Pings move job signals.
// CLB absorbs overload.

import { CognitiveLoadBuffer, CognitiveLoadState } from "./cybercrowd-cognitive-load-buffer";

export type JobsPresenceStatus =
  | "open"
  | "active"
  | "quiet"
  | "overloaded"
  | "sealed"
  | "burned";

export type JobsPresenceAuthorityLevel =
  | "observer"
  | "worker"
  | "lead"
  | "owner"
  | "reviewer"
  | "system";

export type JobsPresencePingKind =
  | "arrival"
  | "departure"
  | "surface"
  | "decal"
  | "authority"
  | "message"
  | "proof"
  | "system"
  | "unknown";

export interface JobsPresenceActor {
  actor_id: string;
  identity_id: string;
  entered_at_ms: number;
  last_seen_at_ms: number;
  active: boolean;
  data: Record<string, unknown>;
}

export interface JobsPresenceSurface {
  surface_id: string;
  label: string;
  surface: Record<string, unknown>;
  added_at_ms: number;
  source_ref_id: string | null;
}

export interface JobsPresenceDecal {
  decal_id: string;
  label: string;
  decal: Record<string, unknown>;
  added_at_ms: number;
  source_ref_id: string | null;
}

export interface JobsPresenceAuthorityGrant {
  grant_id: string;
  identity_id: string;
  level: JobsPresenceAuthorityLevel;
  granted_at_ms: number;
  granted_by_identity_id: string | null;
  source_ref_id: string | null;
  active: boolean;
}

export interface JobsPresencePing {
  ping_id: string;
  identity_id: string | null;
  kind: JobsPresencePingKind;
  payload: Record<string, unknown>;
  at_ms: number;
  source_ref_id: string | null;
}

export interface JobsPresenceLane {
  presence_id: string;
  job_id: string;

  status: JobsPresenceStatus;

  created_at_ms: number;
  updated_at_ms: number;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  actors: JobsPresenceActor[];
  surfaces: JobsPresenceSurface[];
  decals: JobsPresenceDecal[];
  authority: JobsPresenceAuthorityGrant[];
  pings: JobsPresencePing[];

  load: CognitiveLoadState | null;

  data: Record<string, unknown>;
}

export interface JobsPresenceEnterRequest {
  job_id: string;
  identity_id: string;
  data?: Record<string, unknown>;
}

export interface JobsPresenceSurfaceRequest {
  job_id: string;
  label?: string | null;
  surface: Record<string, unknown>;
  source_ref_id?: string | null;
}

export interface JobsPresenceDecalRequest {
  job_id: string;
  label?: string | null;
  decal: Record<string, unknown>;
  source_ref_id?: string | null;
}

export interface JobsPresenceAuthorityRequest {
  job_id: string;
  identity_id: string;
  level: JobsPresenceAuthorityLevel;
  granted_by_identity_id?: string | null;
  source_ref_id?: string | null;
}

export interface JobsPresencePingRequest {
  job_id: string;
  identity_id?: string | null;
  kind?: JobsPresencePingKind;
  payload?: Record<string, unknown>;
  source_ref_id?: string | null;
}

export interface JobsPresenceResult {
  ok: boolean;
  lane?: JobsPresenceLane;
  ping?: JobsPresencePing;
  load?: CognitiveLoadState | null;
  error?: string;
}

export interface JobsPresenceListResult {
  ok: boolean;
  lanes: JobsPresenceLane[];
  error?: string;
}

export interface JobsPresenceSnapshot {
  lanes: JobsPresenceLane[];
  overloaded: JobsPresenceLane[];
  active: JobsPresenceLane[];
  load: CognitiveLoadState;
  stable: boolean;
}

export interface JobsPresenceAuthorityOrgan {
  enter(request: JobsPresenceEnterRequest): JobsPresenceResult;
  leave(job_id: string, identity_id: string): JobsPresenceResult;

  addSurface(request: JobsPresenceSurfaceRequest): JobsPresenceResult;
  addDecal(request: JobsPresenceDecalRequest): JobsPresenceResult;
  grantAuthority(request: JobsPresenceAuthorityRequest): JobsPresenceResult;
  revokeAuthority(job_id: string, grant_id: string): JobsPresenceResult;

  ping(request: JobsPresencePingRequest): JobsPresenceResult;

  get(job_id: string): JobsPresenceLane | null;
  list(): JobsPresenceListResult;

  seal(job_id: string): JobsPresenceResult;
  burn(job_id: string): JobsPresenceResult;

  getLoad(): CognitiveLoadState;
  snapshot(): JobsPresenceSnapshot;
  reset(): void;
}

export class InMemoryJobsPresenceAuthority
  implements JobsPresenceAuthorityOrgan {
  private readonly presence = new Map<string, JobsPresenceLane>();

  private readonly clb = new CognitiveLoadBuffer({
    critical_density: 1.0,
    absorption_rate: 0.12
  });

  enter(request: JobsPresenceEnterRequest): JobsPresenceResult {
    const jobId = cleanId(request?.job_id);
    const identityId = cleanId(request?.identity_id);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    if (!identityId) {
      return {
        ok: false,
        error: "IDENTITY_ID_REQUIRED"
      };
    }

    const now = Date.now();
    const lane = this.getOrCreateLane(jobId, now);

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_LOCKED"
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
        actor_id: makeId("job-actor"),
        identity_id: identityId,
        entered_at_ms: now,
        last_seen_at_ms: now,
        active: true,
        data: publicDataOnly(request?.data ?? {})
      });
    }

    lane.updated_at_ms = now;
    lane.status = "active";
    lane.load = this.applyLoad(1);

    this.pushPing(lane, {
      ping_id: makeId("job-ping"),
      identity_id: identityId,
      kind: "arrival",
      payload: {
        job_id: jobId,
        identity_id: identityId
      },
      at_ms: now,
      source_ref_id: null
    });

    this.presence.set(jobId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: lane.load
    };
  }

  leave(job_id: string, identity_id: string): JobsPresenceResult {
    const jobId = cleanId(job_id);
    const identityId = cleanId(identity_id);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    if (!identityId) {
      return {
        ok: false,
        error: "IDENTITY_ID_REQUIRED"
      };
    }

    const lane = this.presence.get(jobId);

    if (!lane) {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_NOT_FOUND"
      };
    }

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_LOCKED"
      };
    }

    const now = Date.now();

    lane.actors = lane.actors.map((actor) => {
      if (actor.identity_id !== identityId) {
        return actor;
      }

      return {
        ...cloneActor(actor),
        active: false,
        last_seen_at_ms: now
      };
    });

    lane.updated_at_ms = now;
    lane.status = lane.actors.some((actor) => actor.active) ? "active" : "quiet";
    lane.load = this.applyLoad(1);

    this.pushPing(lane, {
      ping_id: makeId("job-ping"),
      identity_id: identityId,
      kind: "departure",
      payload: {
        job_id: jobId,
        identity_id: identityId
      },
      at_ms: now,
      source_ref_id: null
    });

    this.presence.set(jobId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: lane.load
    };
  }

  addSurface(request: JobsPresenceSurfaceRequest): JobsPresenceResult {
    const jobId = cleanId(request?.job_id);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    const lane = this.presence.get(jobId);

    if (!lane) {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_NOT_FOUND"
      };
    }

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_LOCKED"
      };
    }

    const now = Date.now();

    lane.surfaces.push({
      surface_id: makeId("job-surface"),
      label: cleanText(request?.label ?? "Job Surface", 240) || "Job Surface",
      surface: publicDataOnly(request?.surface ?? {}),
      added_at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    });

    lane.surfaces = lane.surfaces.slice(-100);
    lane.updated_at_ms = now;
    lane.load = this.applyLoad(1);

    this.pushPing(lane, {
      ping_id: makeId("job-ping"),
      identity_id: null,
      kind: "surface",
      payload: {
        job_id: jobId,
        surface_count: lane.surfaces.length
      },
      at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    });

    this.presence.set(jobId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: lane.load
    };
  }

  addDecal(request: JobsPresenceDecalRequest): JobsPresenceResult {
    const jobId = cleanId(request?.job_id);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    const lane = this.presence.get(jobId);

    if (!lane) {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_NOT_FOUND"
      };
    }

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_LOCKED"
      };
    }

    const now = Date.now();

    lane.decals.push({
      decal_id: makeId("job-decal"),
      label: cleanText(request?.label ?? "Job Decal", 240) || "Job Decal",
      decal: publicDataOnly(request?.decal ?? {}),
      added_at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    });

    lane.decals = lane.decals.slice(-100);
    lane.updated_at_ms = now;
    lane.load = this.applyLoad(1);

    this.pushPing(lane, {
      ping_id: makeId("job-ping"),
      identity_id: null,
      kind: "decal",
      payload: {
        job_id: jobId,
        decal_count: lane.decals.length
      },
      at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    });

    this.presence.set(jobId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: lane.load
    };
  }

  grantAuthority(request: JobsPresenceAuthorityRequest): JobsPresenceResult {
    const jobId = cleanId(request?.job_id);
    const identityId = cleanId(request?.identity_id);
    const level = cleanAuthorityLevel(request?.level);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    if (!identityId) {
      return {
        ok: false,
        error: "IDENTITY_ID_REQUIRED"
      };
    }

    if (!level) {
      return {
        ok: false,
        error: "AUTHORITY_LEVEL_REQUIRED"
      };
    }

    const lane = this.presence.get(jobId);

    if (!lane) {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_NOT_FOUND"
      };
    }

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_LOCKED"
      };
    }

    const now = Date.now();

    lane.authority.push({
      grant_id: makeId("job-authority"),
      identity_id: identityId,
      level,
      granted_at_ms: now,
      granted_by_identity_id: cleanNullableId(
        request?.granted_by_identity_id ?? null
      ),
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null),
      active: true
    });

    lane.authority = lane.authority.slice(-100);
    lane.updated_at_ms = now;
    lane.load = this.applyLoad(2);

    this.pushPing(lane, {
      ping_id: makeId("job-ping"),
      identity_id: identityId,
      kind: "authority",
      payload: {
        job_id: jobId,
        level
      },
      at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    });

    this.presence.set(jobId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: lane.load
    };
  }

  revokeAuthority(job_id: string, grant_id: string): JobsPresenceResult {
    const jobId = cleanId(job_id);
    const grantId = cleanId(grant_id);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    if (!grantId) {
      return {
        ok: false,
        error: "GRANT_ID_REQUIRED"
      };
    }

    const lane = this.presence.get(jobId);

    if (!lane) {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_NOT_FOUND"
      };
    }

    const now = Date.now();

    lane.authority = lane.authority.map((grant) => {
      if (grant.grant_id !== grantId) {
        return grant;
      }

      return {
        ...cloneAuthority(grant),
        active: false
      };
    });

    lane.updated_at_ms = now;
    lane.load = this.applyLoad(2);

    this.presence.set(jobId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: lane.load
    };
  }

  ping(request: JobsPresencePingRequest): JobsPresenceResult {
    const jobId = cleanId(request?.job_id);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    const lane = this.presence.get(jobId);

    if (!lane) {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_NOT_FOUND"
      };
    }

    if (lane.status === "sealed" || lane.status === "burned") {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_LOCKED"
      };
    }

    const now = Date.now();

    const ping: JobsPresencePing = {
      ping_id: makeId("job-ping"),
      identity_id: cleanNullableId(request?.identity_id ?? null),
      kind: cleanPingKind(request?.kind ?? "unknown"),
      payload: publicDataOnly(request?.payload ?? {}),
      at_ms: now,
      source_ref_id: cleanNullableId(request?.source_ref_id ?? null)
    };

    this.pushPing(lane, ping);

    lane.updated_at_ms = now;
    lane.load = this.applyLoad(1);

    this.presence.set(jobId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      ping: clonePing(ping),
      load: lane.load
    };
  }

  get(job_id: string): JobsPresenceLane | null {
    const lane = this.presence.get(cleanId(job_id));
    return lane ? cloneLane(lane) : null;
  }

  list(): JobsPresenceListResult {
    return {
      ok: true,
      lanes: Array.from(this.presence.values())
        .map(cloneLane)
        .sort((a, b) => b.updated_at_ms - a.updated_at_ms)
    };
  }

  seal(job_id: string): JobsPresenceResult {
    const jobId = cleanId(job_id);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    const lane = this.presence.get(jobId);

    if (!lane) {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_NOT_FOUND"
      };
    }

    const now = Date.now();

    lane.status = "sealed";
    lane.updated_at_ms = now;
    lane.sealed_at_ms = now;
    lane.load = this.applyLoad(1);

    this.presence.set(jobId, cloneLane(lane));

    return {
      ok: true,
      lane: cloneLane(lane),
      load: lane.load
    };
  }

  burn(job_id: string): JobsPresenceResult {
    const jobId = cleanId(job_id);

    if (!jobId) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    const lane = this.presence.get(jobId);

    if (!lane) {
      return {
        ok: false,
        error: "JOB_PRESENCE_LANE_NOT_FOUND"
      };
    }

    const now = Date.now();

    const burned: JobsPresenceLane = {
      ...cloneLane(lane),
      status: "burned",
      updated_at_ms: now,
      burned_at_ms: now,
      load: this.applyLoad(1)
    };

    this.presence.delete(jobId);

    return {
      ok: true,
      lane: burned,
      load: burned.load
    };
  }

  getLoad(): CognitiveLoadState {
    return this.clb.getState();
  }

  snapshot(): JobsPresenceSnapshot {
    const lanes = Array.from(this.presence.values()).map(cloneLane);
    const overloaded = lanes.filter(
      (lane) => lane.load?.overloaded || lane.status === "overloaded"
    );
    const active = lanes.filter((lane) => lane.status === "active");

    return {
      lanes: lanes.sort((a, b) => b.updated_at_ms - a.updated_at_ms),
      overloaded,
      active,
      load: this.getLoad(),
      stable: overloaded.length === 0
    };
  }

  reset(): void {
    this.presence.clear();
    this.clb.reset();
  }

  private getOrCreateLane(jobId: string, now: number): JobsPresenceLane {
    const existing = this.presence.get(jobId);

    if (existing) {
      return cloneLane(existing);
    }

    return {
      presence_id: makeId("job-presence"),
      job_id: jobId,

      status: "open",

      created_at_ms: now,
      updated_at_ms: now,
      sealed_at_ms: null,
      burned_at_ms: null,

      actors: [],
      surfaces: [],
      decals: [],
      authority: [],
      pings: [],

      load: null,

      data: {}
    };
  }

  private applyLoad(delta: number): CognitiveLoadState {
    const load = this.clb.apply({
      at_ms: Date.now(),
      delta_update_volume: delta
    });

    return load;
  }

  private pushPing(lane: JobsPresenceLane, ping: JobsPresencePing): void {
    lane.pings.push(clonePing(ping));
    lane.pings = lane.pings.slice(-100);

    if (lane.load?.overloaded) {
      lane.status = "overloaded";
    }
  }
}

export const CyberCrowdJobsPresenceAuthority =
  new InMemoryJobsPresenceAuthority();

function cleanAuthorityLevel(
  value: unknown
): JobsPresenceAuthorityLevel | null {
  if (
    value === "observer" ||
    value === "worker" ||
    value === "lead" ||
    value === "owner" ||
    value === "reviewer" ||
    value === "system"
  ) {
    return value;
  }

  return null;
}

function cleanPingKind(value: unknown): JobsPresencePingKind {
  if (
    value === "arrival" ||
    value === "departure" ||
    value === "surface" ||
    value === "decal" ||
    value === "authority" ||
    value === "message" ||
    value === "proof" ||
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

function cloneLane(lane: JobsPresenceLane): JobsPresenceLane {
  return {
    presence_id: lane.presence_id,
    job_id: lane.job_id,

    status: lane.status,

    created_at_ms: lane.created_at_ms,
    updated_at_ms: lane.updated_at_ms,
    sealed_at_ms: lane.sealed_at_ms ?? null,
    burned_at_ms: lane.burned_at_ms ?? null,

    actors: lane.actors.map(cloneActor),
    surfaces: lane.surfaces.map(cloneSurface),
    decals: lane.decals.map(cloneDecal),
    authority: lane.authority.map(cloneAuthority),
    pings: lane.pings.map(clonePing),

    load: lane.load ? cloneLoad(lane.load) : null,

    data: publicDataOnly(lane.data)
  };
}

function cloneActor(actor: JobsPresenceActor): JobsPresenceActor {
  return {
    actor_id: actor.actor_id,
    identity_id: actor.identity_id,
    entered_at_ms: actor.entered_at_ms,
    last_seen_at_ms: actor.last_seen_at_ms,
    active: actor.active,
    data: publicDataOnly(actor.data)
  };
}

function cloneSurface(surface: JobsPresenceSurface): JobsPresenceSurface {
  return {
    surface_id: surface.surface_id,
    label: surface.label,
    surface: publicDataOnly(surface.surface),
    added_at_ms: surface.added_at_ms,
    source_ref_id: surface.source_ref_id ?? null
  };
}

function cloneDecal(decal: JobsPresenceDecal): JobsPresenceDecal {
  return {
    decal_id: decal.decal_id,
    label: decal.label,
    decal: publicDataOnly(decal.decal),
    added_at_ms: decal.added_at_ms,
    source_ref_id: decal.source_ref_id ?? null
  };
}

function cloneAuthority(
  authority: JobsPresenceAuthorityGrant
): JobsPresenceAuthorityGrant {
  return {
    grant_id: authority.grant_id,
    identity_id: authority.identity_id,
    level: authority.level,
    granted_at_ms: authority.granted_at_ms,
    granted_by_identity_id: authority.granted_by_identity_id ?? null,
    source_ref_id: authority.source_ref_id ?? null,
    active: authority.active
  };
}

function clonePing(ping: JobsPresencePing): JobsPresencePing {
  return {
    ping_id: ping.ping_id,
    identity_id: ping.identity_id ?? null,
    kind: ping.kind,
    payload: publicDataOnly(ping.payload),
    at_ms: ping.at_ms,
    source_ref_id: ping.source_ref_id ?? null
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
