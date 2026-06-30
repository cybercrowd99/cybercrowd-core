/**
 * cybercrowd-jobs-presence-lane.ts
 *
 * CyberCrowd Jobs Presence Proximity Lane
 *
 * ONE JOB:
 * Manage job-local presence, proximity vectors, surfaces, decals, pings,
 * and temporary job-lane permissions inside CyberCrowd CORE.
 *
 * This is CORE.
 * This is NOT cybercrowd-net.
 * This is NOT marketplace UI.
 * This is NOT auth.
 * This is NOT private IDL ownership.
 * This is NOT sovereign authority.
 *
 * This organ plugs the Jobs Engine into:
 * - Arena Floor
 * - Colosseum
 * - Gate System
 * - Carrier
 * - Moments
 * - Proximity Vectors
 *
 * Identity rule:
 * This organ may reference protected actor_private_id values
 * after Protection Layer approval, but it does not own IDL,
 * does not expose private identity, and does not grant real identity authority.
 *
 * Authority rule:
 * Job-lane permission is temporary permission inside one job lane only.
 * It cannot become account authority, IDL authority, admin authority,
 * collapse authority, or corporate machine control.
 *
 * Proximity rule:
 * Proximity vectors describe where an actor, carrier, surface, gate,
 * decal, or moment signal is in relation to a job lane.
 *
 * Proximity is evidence.
 * Proximity is not ownership.
 * Proximity is not permission.
 */

export type JobPresenceActorRole =
  | "owner"
  | "assigned_worker"
  | "helper"
  | "watcher"
  | "carrier";

export type JobLanePermissionLevel =
  | "observe"
  | "participate"
  | "carry"
  | "moderate"
  | "lane_owner";

export type JobProximityTarget =
  | "actor"
  | "surface"
  | "carrier"
  | "gate"
  | "moment"
  | "decal";

export type JobProximityDirection =
  | "N"
  | "E"
  | "S"
  | "W"
  | "IN"
  | "OUT"
  | "NEAR"
  | "AWAY"
  | "UNKNOWN";

export interface JobPresenceActor {
  actor_private_id: string;
  role: JobPresenceActorRole;
  entered_at: string;
  last_seen_at: string;
}

export interface JobSurfaceAttachment {
  id: string;
  surface_id: string;
  surface_type?: string | null;
  added_at: string;
  data: Record<string, unknown>;
}

export interface JobDecalAttachment {
  id: string;
  decal_id: string;
  decal_type?: string | null;
  added_at: string;
  data: Record<string, unknown>;
}

export interface JobLanePermission {
  id: string;
  actor_private_id: string;
  level: JobLanePermissionLevel;
  granted_at: string;
  revoked_at: string | null;
}

export interface JobPingEvent {
  id: string;
  actor_private_id: string;
  payload: Record<string, unknown>;
  at: string;
}

export interface JobProximityVector {
  id: string;
  job_id: string;
  target_type: JobProximityTarget;
  target_id: string;
  surface_id?: string | null;
  moment_id: string;
  direction: JobProximityDirection;
  distance_hint?: number | null;
  confidence: number;
  observed_at: string;
}

export interface JobPresenceLane {
  id: string;
  job_id: string;
  created_at: string;
  updated_at: string;
  actors: JobPresenceActor[];
  surfaces: JobSurfaceAttachment[];
  decals: JobDecalAttachment[];
  permissions: JobLanePermission[];
  pings: JobPingEvent[];
  proximity_vectors: JobProximityVector[];
}

export interface AddSurfaceRequest {
  surface_id: string;
  surface_type?: string | null;
  data?: Record<string, unknown>;
}

export interface AddDecalRequest {
  decal_id: string;
  decal_type?: string | null;
  data?: Record<string, unknown>;
}

export interface AddProximityVectorRequest {
  target_type: JobProximityTarget;
  target_id: string;
  surface_id?: string | null;
  moment_id: string;
  direction: JobProximityDirection;
  distance_hint?: number | null;
  confidence?: number;
  observed_at?: string;
}

const MAX_PINGS_PER_LANE = 250;
const MAX_PROXIMITY_VECTORS_PER_LANE = 500;

export const CyberCrowdJobsPresenceLane = (() => {
  const lanes = new Map<string, JobPresenceLane>();

  function now(): string {
    return new Date().toISOString();
  }

  function makeId(prefix: string): string {
    return (
      prefix +
      "." +
      Date.now() +
      "." +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function enterActor(
    job_id: string,
    actor_private_id: string,
    role: JobPresenceActorRole = "watcher"
  ): JobPresenceLane | null {
    const cleanJobId = cleanId(job_id);
    const cleanActorId = cleanId(actor_private_id);

    if (!cleanJobId || !cleanActorId || !isActorRole(role)) {
      return null;
    }

    const lane = getOrCreateLane(cleanJobId);
    const timestamp = now();

    const existing = lane.actors.find(
      (actor) => actor.actor_private_id === cleanActorId
    );

    if (existing) {
      existing.role = role;
      existing.last_seen_at = timestamp;
      lane.updated_at = timestamp;
      return cloneLane(lane);
    }

    lane.actors.push({
      actor_private_id: cleanActorId,
      role,
      entered_at: timestamp,
      last_seen_at: timestamp
    });

    lane.updated_at = timestamp;

    return cloneLane(lane);
  }

  function leaveActor(
    job_id: string,
    actor_private_id: string
  ): JobPresenceLane | null {
    const cleanJobId = cleanId(job_id);
    const cleanActorId = cleanId(actor_private_id);

    if (!cleanJobId || !cleanActorId) {
      return null;
    }

    const lane = lanes.get(cleanJobId);

    if (!lane) {
      return null;
    }

    lane.actors = lane.actors.filter(
      (actor) => actor.actor_private_id !== cleanActorId
    );

    lane.updated_at = now();

    return cloneLane(lane);
  }

  function addSurface(
    job_id: string,
    request: AddSurfaceRequest
  ): JobPresenceLane | null {
    const cleanJobId = cleanId(job_id);
    const surface_id = cleanId(request?.surface_id);

    if (!cleanJobId || !surface_id) {
      return null;
    }

    const lane = getOrCreateLane(cleanJobId);
    const timestamp = now();

    lane.surfaces.push({
      id: makeId("JOB_SURFACE"),
      surface_id,
      surface_type: cleanNullableId(request.surface_type ?? null),
      added_at: timestamp,
      data: cloneData(request.data ?? {})
    });

    lane.updated_at = timestamp;

    return cloneLane(lane);
  }

  function removeSurface(
    job_id: string,
    surface_id: string
  ): JobPresenceLane | null {
    const cleanJobId = cleanId(job_id);
    const cleanSurfaceId = cleanId(surface_id);

    if (!cleanJobId || !cleanSurfaceId) {
      return null;
    }

    const lane = lanes.get(cleanJobId);

    if (!lane) {
      return null;
    }

    lane.surfaces = lane.surfaces.filter(
      (surface) => surface.surface_id !== cleanSurfaceId
    );

    lane.updated_at = now();

    return cloneLane(lane);
  }

  function addDecal(
    job_id: string,
    request: AddDecalRequest
  ): JobPresenceLane | null {
    const cleanJobId = cleanId(job_id);
    const decal_id = cleanId(request?.decal_id);

    if (!cleanJobId || !decal_id) {
      return null;
    }

    const lane = getOrCreateLane(cleanJobId);
    const timestamp = now();

    lane.decals.push({
      id: makeId("JOB_DECAL"),
      decal_id,
      decal_type: cleanNullableId(request.decal_type ?? null),
      added_at: timestamp,
      data: cloneData(request.data ?? {})
    });

    lane.updated_at = timestamp;

    return cloneLane(lane);
  }

  function removeDecal(
    job_id: string,
    decal_id: string
  ): JobPresenceLane | null {
    const cleanJobId = cleanId(job_id);
    const cleanDecalId = cleanId(decal_id);

    if (!cleanJobId || !cleanDecalId) {
      return null;
    }

    const lane = lanes.get(cleanJobId);

    if (!lane) {
      return null;
    }

    lane.decals = lane.decals.filter(
      (decal) => decal.decal_id !== cleanDecalId
    );

    lane.updated_at = now();

    return cloneLane(lane);
  }

  function grantJobLanePermission(
    job_id: string,
    actor_private_id: string,
    level: JobLanePermissionLevel
  ): JobLanePermission | null {
    const cleanJobId = cleanId(job_id);
    const cleanActorId = cleanId(actor_private_id);

    if (!cleanJobId || !cleanActorId || !isPermissionLevel(level)) {
      return null;
    }

    const lane = getOrCreateLane(cleanJobId);
    const timestamp = now();

    const existing = lane.permissions.find(
      (permission) =>
        permission.actor_private_id === cleanActorId &&
        permission.level === level &&
        permission.revoked_at === null
    );

    if (existing) {
      return clonePermission(existing);
    }

    const permission: JobLanePermission = {
      id: makeId("JOB_PERMISSION"),
      actor_private_id: cleanActorId,
      level,
      granted_at: timestamp,
      revoked_at: null
    };

    lane.permissions.push(permission);
    lane.updated_at = timestamp;

    return clonePermission(permission);
  }

  function revokeJobLanePermission(
    job_id: string,
    actor_private_id: string,
    level: JobLanePermissionLevel
  ): JobLanePermission | null {
    const cleanJobId = cleanId(job_id);
    const cleanActorId = cleanId(actor_private_id);

    if (!cleanJobId || !cleanActorId || !isPermissionLevel(level)) {
      return null;
    }

    const lane = lanes.get(cleanJobId);

    if (!lane) {
      return null;
    }

    const permission = lane.permissions.find(
      (item) =>
        item.actor_private_id === cleanActorId &&
        item.level === level &&
        item.revoked_at === null
    );

    if (!permission) {
      return null;
    }

    const timestamp = now();

    permission.revoked_at = timestamp;
    lane.updated_at = timestamp;

    return clonePermission(permission);
  }

  function addProximityVector(
    job_id: string,
    request: AddProximityVectorRequest
  ): JobProximityVector | null {
    const cleanJobId = cleanId(job_id);
    const target_type = request?.target_type;
    const target_id = cleanId(request?.target_id);
    const moment_id = cleanId(request?.moment_id);
    const direction = request?.direction;
    const confidence = normalizeConfidence(request?.confidence ?? 1);

    if (
      !cleanJobId ||
      !isProximityTarget(target_type) ||
      !target_id ||
      !moment_id ||
      !isProximityDirection(direction)
    ) {
      return null;
    }

    const lane = getOrCreateLane(cleanJobId);
    const timestamp = now();

    const vector: JobProximityVector = {
      id: makeId("JOB_VECTOR"),
      job_id: cleanJobId,
      target_type,
      target_id,
      surface_id: cleanNullableId(request.surface_id ?? null),
      moment_id,
      direction,
      distance_hint:
        typeof request.distance_hint === "number" &&
        Number.isFinite(request.distance_hint)
          ? request.distance_hint
          : null,
      confidence,
      observed_at:
        typeof request.observed_at === "string" && request.observed_at.trim()
          ? request.observed_at.trim()
          : timestamp
    };

    lane.proximity_vectors.push(vector);

    if (lane.proximity_vectors.length > MAX_PROXIMITY_VECTORS_PER_LANE) {
      lane.proximity_vectors = lane.proximity_vectors.slice(
        lane.proximity_vectors.length - MAX_PROXIMITY_VECTORS_PER_LANE
      );
    }

    lane.updated_at = timestamp;

    return cloneVector(vector);
  }

  function listProximityVectors(job_id: string): JobProximityVector[] {
    const cleanJobId = cleanId(job_id);

    if (!cleanJobId) {
      return [];
    }

    const lane = lanes.get(cleanJobId);

    if (!lane) {
      return [];
    }

    return lane.proximity_vectors.map(cloneVector);
  }

  function clearProximityVectors(job_id: string): JobPresenceLane | null {
    const cleanJobId = cleanId(job_id);

    if (!cleanJobId) {
      return null;
    }

    const lane = lanes.get(cleanJobId);

    if (!lane) {
      return null;
    }

    lane.proximity_vectors = [];
    lane.updated_at = now();

    return cloneLane(lane);
  }

  function ping(
    job_id: string,
    actor_private_id: string,
    payload: Record<string, unknown>
  ): JobPingEvent | null {
    const cleanJobId = cleanId(job_id);
    const cleanActorId = cleanId(actor_private_id);

    if (!cleanJobId || !cleanActorId || !isPlainObject(payload)) {
      return null;
    }

    const lane = getOrCreateLane(cleanJobId);
    const timestamp = now();

    const event: JobPingEvent = {
      id: makeId("JOB_PING"),
      actor_private_id: cleanActorId,
      payload: cloneData(payload),
      at: timestamp
    };

    lane.pings.push(event);

    if (lane.pings.length > MAX_PINGS_PER_LANE) {
      lane.pings = lane.pings.slice(lane.pings.length - MAX_PINGS_PER_LANE);
    }

    lane.updated_at = timestamp;

    return clonePing(event);
  }

  function getLane(job_id: string): JobPresenceLane | null {
    const cleanJobId = cleanId(job_id);

    if (!cleanJobId) {
      return null;
    }

    const lane = lanes.get(cleanJobId);

    return lane ? cloneLane(lane) : null;
  }

  function listLanes(): JobPresenceLane[] {
    return Array.from(lanes.values()).map(cloneLane);
  }

  function reset(): void {
    lanes.clear();
  }

  function getOrCreateLane(job_id: string): JobPresenceLane {
    const existing = lanes.get(job_id);

    if (existing) {
      return existing;
    }

    const timestamp = now();

    const lane: JobPresenceLane = {
      id: makeId("JOB_PRESENCE"),
      job_id,
      created_at: timestamp,
      updated_at: timestamp,
      actors: [],
      surfaces: [],
      decals: [],
      permissions: [],
      pings: [],
      proximity_vectors: []
    };

    lanes.set(job_id, lane);

    return lane;
  }

  return {
    enterActor,
    leaveActor,
    addSurface,
    removeSurface,
    addDecal,
    removeDecal,
    grantJobLanePermission,
    revokeJobLanePermission,
    addProximityVector,
    listProximityVectors,
    clearProximityVectors,
    ping,
    getLane,
    listLanes,
    reset
  };
})();

function isActorRole(value: unknown): value is JobPresenceActorRole {
  return (
    value === "owner" ||
    value === "assigned_worker" ||
    value === "helper" ||
    value === "watcher" ||
    value === "carrier"
  );
}

function isPermissionLevel(value: unknown): value is JobLanePermissionLevel {
  return (
    value === "observe" ||
    value === "participate" ||
    value === "carry" ||
    value === "moderate" ||
    value === "lane_owner"
  );
}

function isProximityTarget(value: unknown): value is JobProximityTarget {
  return (
    value === "actor" ||
    value === "surface" ||
    value === "carrier" ||
    value === "gate" ||
    value === "moment" ||
    value === "decal"
  );
}

function isProximityDirection(
  value: unknown
): value is JobProximityDirection {
  return (
    value === "N" ||
    value === "E" ||
    value === "S" ||
    value === "W" ||
    value === "IN" ||
    value === "OUT" ||
    value === "NEAR" ||
    value === "AWAY" ||
    value === "UNKNOWN"
  );
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function cloneLane(lane: JobPresenceLane): JobPresenceLane {
  return {
    id: lane.id,
    job_id: lane.job_id,
    created_at: lane.created_at,
    updated_at: lane.updated_at,
    actors: lane.actors.map(cloneActor),
    surfaces: lane.surfaces.map(cloneSurface),
    decals: lane.decals.map(cloneDecal),
    permissions: lane.permissions.map(clonePermission),
    pings: lane.pings.map(clonePing),
    proximity_vectors: lane.proximity_vectors.map(cloneVector)
  };
}

function cloneActor(actor: JobPresenceActor): JobPresenceActor {
  return {
    actor_private_id: actor.actor_private_id,
    role: actor.role,
    entered_at: actor.entered_at,
    last_seen_at: actor.last_seen_at
  };
}

function cloneSurface(surface: JobSurfaceAttachment): JobSurfaceAttachment {
  return {
    id: surface.id,
    surface_id: surface.surface_id,
    surface_type: surface.surface_type ?? null,
    added_at: surface.added_at,
    data: cloneData(surface.data)
  };
}

function cloneDecal(decal: JobDecalAttachment): JobDecalAttachment {
  return {
    id: decal.id,
    decal_id: decal.decal_id,
    decal_type: decal.decal_type ?? null,
    added_at: decal.added_at,
    data: cloneData(decal.data)
  };
}

function clonePermission(permission: JobLanePermission): JobLanePermission {
  return {
    id: permission.id,
    actor_private_id: permission.actor_private_id,
    level: permission.level,
    granted_at: permission.granted_at,
    revoked_at: permission.revoked_at
  };
}

function clonePing(ping: JobPingEvent): JobPingEvent {
  return {
    id: ping.id,
    actor_private_id: ping.actor_private_id,
    payload: cloneData(ping.payload),
    at: ping.at
  };
}

function cloneVector(vector: JobProximityVector): JobProximityVector {
  return {
    id: vector.id,
    job_id: vector.job_id,
    target_type: vector.target_type,
    target_id: vector.target_id,
    surface_id: vector.surface_id ?? null,
    moment_id: vector.moment_id,
    direction: vector.direction,
    distance_hint: vector.distance_hint ?? null,
    confidence: vector.confidence,
    observed_at: vector.observed_at
  };
}

function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

  if (!clean) {
    return "";
  }

  if (clean.length > 180) {
    return "";
  }

  if (!/^[a-zA-Z0-9._:@/+=$-]+$/.test(clean)) {
    return "";
  }

  return clean;
    }
