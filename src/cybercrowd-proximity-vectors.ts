/**
 * cybercrowd-proximity-vectors.ts
 *
 * CyberCrowd Proximity Vectors
 *
 * ONE JOB:
 * Describe where a signal, actor, carrier, gate, surface, decal, or moment
 * is in relation to another point inside CyberCrowd CORE.
 *
 * This is CORE.
 * This is NOT cybercrowd-net.
 * This is NOT marketplace UI.
 * This is NOT auth.
 * This is NOT permission.
 * This is NOT authority.
 *
 * Proximity is evidence.
 * Proximity is not ownership.
 * Proximity is not access.
 */

export type ProximityTargetType =
  | "actor"
  | "job"
  | "surface"
  | "carrier"
  | "gate"
  | "moment"
  | "decal"
  | "asset"
  | "unknown";

export type ProximityDirection =
  | "N"
  | "E"
  | "S"
  | "W"
  | "IN"
  | "OUT"
  | "NEAR"
  | "AWAY"
  | "STILL"
  | "UNKNOWN";

export interface ProximityPoint {
  x: number;
  y: number;
  z?: number | null;
}

export interface ProximityVector {
  id: string;
  source_type: ProximityTargetType;
  source_id: string;
  target_type: ProximityTargetType;
  target_id: string;
  surface_id?: string | null;
  moment_id: string;
  direction: ProximityDirection;
  from: ProximityPoint;
  to: ProximityPoint;
  distance: number;
  confidence: number;
  observed_at_ms: number;
}

export interface ProximityVectorRequest {
  source_type: ProximityTargetType;
  source_id: string;
  target_type: ProximityTargetType;
  target_id: string;
  surface_id?: string | null;
  moment_id: string;
  from: ProximityPoint;
  to: ProximityPoint;
  confidence?: number;
  observed_at_ms?: number;
}

export function createProximityVector(
  request: ProximityVectorRequest
): ProximityVector | null {
  const source_type = cleanTargetType(request.source_type);
  const target_type = cleanTargetType(request.target_type);
  const source_id = cleanId(request.source_id);
  const target_id = cleanId(request.target_id);
  const moment_id = cleanId(request.moment_id);

  if (!source_type || !target_type || !source_id || !target_id || !moment_id) {
    return null;
  }

  const from = cleanPoint(request.from);
  const to = cleanPoint(request.to);

  if (!from || !to) {
    return null;
  }

  const distance = calculateDistance(from, to);
  const direction = inferDirection(from, to);

  return {
    id: makeVectorId(),
    source_type,
    source_id,
    target_type,
    target_id,
    surface_id: cleanNullableId(request.surface_id ?? null),
    moment_id,
    direction,
    from,
    to,
    distance,
    confidence: normalizeConfidence(request.confidence ?? 1),
    observed_at_ms: cleanTime(request.observed_at_ms ?? Date.now())
  };
}

export function calculateDistance(from: ProximityPoint, to: ProximityPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = (to.z ?? 0) - (from.z ?? 0);

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function inferDirection(from: ProximityPoint, to: ProximityPoint): ProximityDirection {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) < 0.000001 && Math.abs(dy) < 0.000001) {
    return "STILL";
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "E" : "W";
  }

  return dy > 0 ? "N" : "S";
}

export function isNear(
  vector: ProximityVector,
  threshold: number
): boolean {
  return vector.distance <= threshold;
}

export function sortNearest(vectors: ProximityVector[]): ProximityVector[] {
  return vectors.map(cloneVector).sort((a, b) => a.distance - b.distance);
}

export function filterByTarget(
  vectors: ProximityVector[],
  target_type: ProximityTargetType,
  target_id?: string
): ProximityVector[] {
  const cleanType = cleanTargetType(target_type);
  const cleanTargetId = cleanNullableId(target_id ?? null);

  if (!cleanType) {
    return [];
  }

  return vectors
    .filter((vector) => vector.target_type === cleanType)
    .filter((vector) => !cleanTargetId || vector.target_id === cleanTargetId)
    .map(cloneVector);
}

export function filterBySource(
  vectors: ProximityVector[],
  source_type: ProximityTargetType,
  source_id?: string
): ProximityVector[] {
  const cleanType = cleanTargetType(source_type);
  const cleanSourceId = cleanNullableId(source_id ?? null);

  if (!cleanType) {
    return [];
  }

  return vectors
    .filter((vector) => vector.source_type === cleanType)
    .filter((vector) => !cleanSourceId || vector.source_id === cleanSourceId)
    .map(cloneVector);
}

export function cloneVector(vector: ProximityVector): ProximityVector {
  return {
    id: vector.id,
    source_type: vector.source_type,
    source_id: vector.source_id,
    target_type: vector.target_type,
    target_id: vector.target_id,
    surface_id: vector.surface_id ?? null,
    moment_id: vector.moment_id,
    direction: vector.direction,
    from: { ...vector.from },
    to: { ...vector.to },
    distance: vector.distance,
    confidence: vector.confidence,
    observed_at_ms: vector.observed_at_ms
  };
}

function makeVectorId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "vector-" +
    Math.random().toString(16).slice(2) +
    "-" +
    Date.now().toString(16)
  );
}

function cleanPoint(value: unknown): ProximityPoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const point = value as ProximityPoint;

  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }

  const z =
    typeof point.z === "number" && Number.isFinite(point.z)
      ? point.z
      : null;

  return {
    x: point.x,
    y: point.y,
    z
  };
}

function cleanTargetType(value: unknown): ProximityTargetType | null {
  if (
    value === "actor" ||
    value === "job" ||
    value === "surface" ||
    value === "carrier" ||
    value === "gate" ||
    value === "moment" ||
    value === "decal" ||
    value === "asset" ||
    value === "unknown"
  ) {
    return value;
  }

  return null;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  if (value < 0) return 0;
  if (value > 1) return 1;

  return value;
}

function cleanTime(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return Date.now();
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
