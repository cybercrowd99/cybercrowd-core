// src/cybercrowd-secretary-coordination-layer.ts
//
// CyberCrowd Secretary Coordination Layer
//
// ONE JOB:
// Turn checked meaning into clean movement placement.
//
// This is CORE organism coordination.
// This is NOT discovery.
// This is NOT ranking.
// This is NOT a feed.
// This is NOT ads.
// This is NOT search.
// This is NOT marketplace UI.
// This is NOT punishment.
// This is NOT hidden control.
// This is NOT parenting.
// This is NOT supervision.
//
// LOCKED RULE:
// CyberAssistant = point check.
// Secretary = point placement.
//
// CyberAssistant asks: what is the point?
// Secretary answers: where does that point go?
//
// CyberAssistant handles meaning.
// Secretary handles movement.
//
// CyberAssistant checks perspective.
// Secretary coordinates placement.
//
// The Secretary does not predict.
// The Secretary does not suggest.
// The Secretary does not rank.
// The Secretary does not enforce.
// The Secretary does not decide life.
// The Secretary coordinates movement after the point is checked.

export type SecretaryPlacementType =
  | "turnstile"
  | "pole"
  | "window"
  | "touch"
  | "arena"
  | "interruption"
  | "calendar"
  | "silent"
  | "manual_review"
  | "hold"
  | "ignore";

export type SecretaryCoordinationStatus =
  | "pending"
  | "placed"
  | "held"
  | "ignored"
  | "sealed"
  | "burned";

export type SecretaryReason =
  | "point-checked"
  | "surface-placement"
  | "pole-placement"
  | "window-placement"
  | "touch-placement"
  | "arena-placement"
  | "focus-protected"
  | "calendar-placement"
  | "silent-placement"
  | "manual-review"
  | "weak-point"
  | "unknown";

export interface SecretaryPointCheck {
  point_id: string;
  actor_id: string;

  point: string;
  checked: boolean;

  source: "biff" | "cyberassistant" | "manual" | "system" | "unknown";

  strength?: number | null;
  priority?: number | null;

  created_at_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface SecretaryPlacementInput {
  point_check: SecretaryPointCheck;

  preferred_placement?: SecretaryPlacementType | null;

  surface?: string | null;
  pole?: string | null;
  window_id?: string | null;
  touch_id?: string | null;

  target_lane_id?: string | null;
  target_lane_kind?: string | null;

  source_ref_id?: string | null;

  data?: Record<string, unknown>;
}

export interface SecretaryPlacementRecord {
  placement_id: string;

  point_id: string;
  actor_id: string;

  point: string;

  placement_type: SecretaryPlacementType;
  status: SecretaryCoordinationStatus;
  reason: SecretaryReason;

  surface: string | null;
  pole: string | null;
  window_id: string | null;
  touch_id: string | null;

  target_lane_id: string | null;
  target_lane_kind: string | null;

  strength: number;
  priority: number;

  created_at_ms: number;
  updated_at_ms: number;
  placed_at_ms: number | null;
  held_at_ms: number | null;
  ignored_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  source_ref_id: string | null;

  point_check: SecretaryPointCheck;

  data: Record<string, unknown>;
}

export interface SecretaryCoordinationState {
  status: SecretaryCoordinationStatus | "idle";
  placed_count: number;
  held_count: number;
  ignored_count: number;
  sealed_count: number;
  burned_count: number;
  last_placement_type: SecretaryPlacementType | null;
  last_reason: SecretaryReason;
  last_updated_at_ms: number;
}

export interface SecretaryCoordinationParams {
  hold_when_unchecked?: boolean;
  ignore_weak_below?: number;
  prefer_window_when_surface_exists?: boolean;
  prefer_pole_when_pole_exists?: boolean;
}

export interface SecretaryCoordinationResult {
  ok: boolean;
  state: SecretaryCoordinationState;
  placement?: SecretaryPlacementRecord;
  placements: SecretaryPlacementRecord[];
  placed: SecretaryPlacementRecord[];
  held: SecretaryPlacementRecord[];
  ignored: SecretaryPlacementRecord[];
  error?: string;
}

export interface SecretaryCoordinationSnapshot {
  state: SecretaryCoordinationState;
  placements: SecretaryPlacementRecord[];
  placed: SecretaryPlacementRecord[];
  held: SecretaryPlacementRecord[];
  ignored: SecretaryPlacementRecord[];
  stable: boolean;
}

export class SecretaryCoordinationLayer {
  private placements = new Map<string, SecretaryPlacementRecord>();
  private placed = new Map<string, SecretaryPlacementRecord>();
  private held = new Map<string, SecretaryPlacementRecord>();
  private ignored = new Map<string, SecretaryPlacementRecord>();

  private state: SecretaryCoordinationState;

  constructor(initial?: Partial<SecretaryCoordinationState>) {
    const now = Date.now();

    this.state = {
      status: cleanStateStatus(initial?.status ?? "idle"),
      placed_count: cleanCount(initial?.placed_count ?? 0),
      held_count: cleanCount(initial?.held_count ?? 0),
      ignored_count: cleanCount(initial?.ignored_count ?? 0),
      sealed_count: cleanCount(initial?.sealed_count ?? 0),
      burned_count: cleanCount(initial?.burned_count ?? 0),
      last_placement_type: cleanNullablePlacementType(
        initial?.last_placement_type ?? null
      ),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Coordinate one checked point into movement placement.
   */
  coordinate(
    input: SecretaryPlacementInput,
    params: SecretaryCoordinationParams = {}
  ): SecretaryCoordinationResult {
    const pointCheck = cleanPointCheck(input?.point_check);

    if (!pointCheck) {
      return this.result("POINT_CHECK_REQUIRED");
    }

    if (!pointCheck.actor_id) {
      return this.result("ACTOR_ID_REQUIRED");
    }

    if (!pointCheck.point_id) {
      return this.result("POINT_ID_REQUIRED");
    }

    if (!pointCheck.point) {
      return this.result("POINT_REQUIRED");
    }

    const now = Date.now();
    const strength = cleanStrength(pointCheck.strength ?? 1);
    const priority = cleanPriority(pointCheck.priority ?? 0);

    const placementType = this.decidePlacementType(input, pointCheck, params);
    const status = statusFromPlacement(placementType, pointCheck, strength, params);
    const reason = reasonFromPlacement(placementType, status, pointCheck, strength);

    const placement: SecretaryPlacementRecord = {
      placement_id: makeId("secretary-placement"),

      point_id: pointCheck.point_id,
      actor_id: pointCheck.actor_id,

      point: pointCheck.point,

      placement_type: placementType,
      status,
      reason,

      surface: cleanNullableSurface(input?.surface ?? null),
      pole: cleanNullablePole(input?.pole ?? null),
      window_id: cleanNullableId(input?.window_id ?? null),
      touch_id: cleanNullableId(input?.touch_id ?? null),

      target_lane_id: cleanNullableId(input?.target_lane_id ?? null),
      target_lane_kind: cleanNullableText(input?.target_lane_kind ?? null, 120),

      strength,
      priority,

      created_at_ms: now,
      updated_at_ms: now,
      placed_at_ms: status === "placed" ? now : null,
      held_at_ms: status === "held" ? now : null,
      ignored_at_ms: status === "ignored" ? now : null,
      sealed_at_ms: null,
      burned_at_ms: null,

      source_ref_id: cleanNullableId(input?.source_ref_id ?? null),

      point_check: clonePointCheck(pointCheck),

      data: publicDataOnly(input?.data ?? {})
    };

    this.storePlacement(placement);

    this.state = {
      ...this.state,
      status,
      last_placement_type: placementType,
      last_reason: reason,
      last_updated_at_ms: now
    };

    if (status === "placed") {
      this.state.placed_count += 1;
    }

    if (status === "held") {
      this.state.held_count += 1;
    }

    if (status === "ignored") {
      this.state.ignored_count += 1;
    }

    return this.result(undefined, placement);
  }

  /**
   * Coordinate many checked points.
   */
  coordinateBatch(
    inputs: SecretaryPlacementInput[],
    params: SecretaryCoordinationParams = {}
  ): SecretaryCoordinationResult {
    if (!Array.isArray(inputs)) {
      return this.result("SECRETARY_COORDINATION_INPUTS_REQUIRED");
    }

    let lastPlacement: SecretaryPlacementRecord | undefined;

    for (const input of inputs) {
      const result = this.coordinate(input, params);

      if (result.placement) {
        lastPlacement = result.placement;
      }
    }

    return this.result(undefined, lastPlacement);
  }

  /**
   * Mark a placement as placed.
   */
  place(placement_id: string): SecretaryCoordinationResult {
    return this.transition(placement_id, "placed");
  }

  /**
   * Hold a placement without losing it.
   */
  hold(placement_id: string): SecretaryCoordinationResult {
    return this.transition(placement_id, "held");
  }

  /**
   * Ignore a placement without deleting it.
   */
  ignore(placement_id: string): SecretaryCoordinationResult {
    return this.transition(placement_id, "ignored");
  }

  /**
   * Seal a placement without deleting it.
   */
  seal(placement_id: string): SecretaryCoordinationResult {
    return this.transition(placement_id, "sealed");
  }

  /**
   * Burn a placement from live memory.
   */
  burn(placement_id: string): SecretaryCoordinationResult {
    const placementId = cleanId(placement_id);
    const placement = this.placements.get(placementId);

    if (!placement) {
      return this.result("SECRETARY_PLACEMENT_NOT_FOUND");
    }

    this.placements.delete(placementId);
    this.placed.delete(placementId);
    this.held.delete(placementId);
    this.ignored.delete(placementId);

    const now = Date.now();

    const burned: SecretaryPlacementRecord = {
      ...clonePlacement(placement),
      status: "burned",
      updated_at_ms: now,
      burned_at_ms: now
    };

    this.state = {
      ...this.state,
      status: "burned",
      burned_count: this.state.burned_count + 1,
      last_placement_type: burned.placement_type,
      last_reason: burned.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, burned);
  }

  /**
   * Read one placement.
   */
  get(placement_id: string): SecretaryPlacementRecord | null {
    const placement = this.placements.get(cleanId(placement_id));
    return placement ? clonePlacement(placement) : null;
  }

  /**
   * Read current state.
   */
  getState(): SecretaryCoordinationState {
    return {
      status: this.state.status,
      placed_count: this.state.placed_count,
      held_count: this.state.held_count,
      ignored_count: this.state.ignored_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_placement_type: this.state.last_placement_type,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getPlacements(): SecretaryPlacementRecord[] {
    return Array.from(this.placements.values())
      .map(clonePlacement)
      .sort(comparePlacements);
  }

  getPlaced(): SecretaryPlacementRecord[] {
    return Array.from(this.placed.values())
      .map(clonePlacement)
      .sort(comparePlacements);
  }

  getHeld(): SecretaryPlacementRecord[] {
    return Array.from(this.held.values())
      .map(clonePlacement)
      .sort(comparePlacements);
  }

  getIgnored(): SecretaryPlacementRecord[] {
    return Array.from(this.ignored.values())
      .map(clonePlacement)
      .sort(comparePlacements);
  }

  snapshot(): SecretaryCoordinationSnapshot {
    return {
      state: this.getState(),
      placements: this.getPlacements(),
      placed: this.getPlaced(),
      held: this.getHeld(),
      ignored: this.getIgnored(),
      stable:
        this.state.status === "idle" ||
        this.state.status === "placed" ||
        this.state.status === "held" ||
        this.state.status === "ignored"
    };
  }

  reset(): void {
    this.placements.clear();
    this.placed.clear();
    this.held.clear();
    this.ignored.clear();

    this.state = {
      status: "idle",
      placed_count: 0,
      held_count: 0,
      ignored_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_placement_type: null,
      last_reason: "unknown",
      last_updated_at_ms: Date.now()
    };
  }

  private decidePlacementType(
    input: SecretaryPlacementInput,
    pointCheck: SecretaryPointCheck,
    params: SecretaryCoordinationParams
  ): SecretaryPlacementType {
    const preferred = cleanNullablePlacementType(input?.preferred_placement ?? null);

    if (params.hold_when_unchecked === true && pointCheck.checked !== true) {
      return "hold";
    }

    if (preferred) {
      return preferred;
    }

    if (
      params.prefer_window_when_surface_exists === true &&
      cleanNullableSurface(input?.surface ?? null)
    ) {
      return "window";
    }

    if (
      params.prefer_pole_when_pole_exists === true &&
      cleanNullablePole(input?.pole ?? null)
    ) {
      return "pole";
    }

    if (cleanNullableSurface(input?.surface ?? null)) {
      return "turnstile";
    }

    if (cleanNullablePole(input?.pole ?? null)) {
      return "pole";
    }

    if (cleanNullableId(input?.window_id ?? null)) {
      return "window";
    }

    if (cleanNullableId(input?.touch_id ?? null)) {
      return "touch";
    }

    if (cleanNullableText(input?.target_lane_kind ?? null, 120) === "calendar") {
      return "calendar";
    }

    if (
      cleanNullableText(input?.target_lane_kind ?? null, 120) === "manual_review"
    ) {
      return "manual_review";
    }

    if (cleanNullableText(input?.target_lane_kind ?? null, 120) === "interruption") {
      return "interruption";
    }

    return "silent";
  }

  private transition(
    placement_id: string,
    status: SecretaryCoordinationStatus
  ): SecretaryCoordinationResult {
    const placementId = cleanId(placement_id);
    const placement = this.placements.get(placementId);

    if (!placement) {
      return this.result("SECRETARY_PLACEMENT_NOT_FOUND");
    }

    if (!canMove(placement.status, status)) {
      return this.result("SECRETARY_PLACEMENT_STATE_LOCKED", placement);
    }

    const now = Date.now();

    const updated: SecretaryPlacementRecord = {
      ...clonePlacement(placement),
      status,
      updated_at_ms: now,
      placed_at_ms: status === "placed" ? now : placement.placed_at_ms,
      held_at_ms: status === "held" ? now : placement.held_at_ms,
      ignored_at_ms: status === "ignored" ? now : placement.ignored_at_ms,
      sealed_at_ms: status === "sealed" ? now : placement.sealed_at_ms,
      burned_at_ms: status === "burned" ? now : placement.burned_at_ms
    };

    this.removeFromIndexes(updated.placement_id);
    this.storePlacement(updated);

    this.state = {
      ...this.state,
      status,
      last_placement_type: updated.placement_type,
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    if (status === "placed") this.state.placed_count += 1;
    if (status === "held") this.state.held_count += 1;
    if (status === "ignored") this.state.ignored_count += 1;
    if (status === "sealed") this.state.sealed_count += 1;
    if (status === "burned") this.state.burned_count += 1;

    return this.result(undefined, updated);
  }

  private storePlacement(placement: SecretaryPlacementRecord): void {
    this.placements.set(placement.placement_id, clonePlacement(placement));

    if (placement.status === "placed") {
      this.placed.set(placement.placement_id, clonePlacement(placement));
    }

    if (placement.status === "held") {
      this.held.set(placement.placement_id, clonePlacement(placement));
    }

    if (placement.status === "ignored") {
      this.ignored.set(placement.placement_id, clonePlacement(placement));
    }

    if (this.placements.size > 500) {
      const old = this.getPlacements().slice(500);

      for (const placementRecord of old) {
        this.placements.delete(placementRecord.placement_id);
        this.removeFromIndexes(placementRecord.placement_id);
      }
    }
  }

  private removeFromIndexes(placementId: string): void {
    this.placed.delete(placementId);
    this.held.delete(placementId);
    this.ignored.delete(placementId);
  }

  private result(
    error?: string,
    placement?: SecretaryPlacementRecord
  ): SecretaryCoordinationResult {
    return {
      ok: !error,
      state: this.getState(),
      placement: placement ? clonePlacement(placement) : undefined,
      placements: this.getPlacements(),
      placed: this.getPlaced(),
      held: this.getHeld(),
      ignored: this.getIgnored(),
      error
    };
  }
}

export const CyberCrowdSecretaryCoordinationLayer =
  new SecretaryCoordinationLayer();

function statusFromPlacement(
  placementType: SecretaryPlacementType,
  pointCheck: SecretaryPointCheck,
  strength: number,
  params: SecretaryCoordinationParams
): SecretaryCoordinationStatus {
  const ignoreBelow = cleanNullableStrength(params.ignore_weak_below ?? null);

  if (ignoreBelow != null && strength < ignoreBelow) {
    return "ignored";
  }

  if (placementType === "ignore") {
    return "ignored";
  }

  if (placementType === "hold") {
    return "held";
  }

  if (params.hold_when_unchecked === true && pointCheck.checked !== true) {
    return "held";
  }

  return "placed";
}

function reasonFromPlacement(
  placementType: SecretaryPlacementType,
  status: SecretaryCoordinationStatus,
  pointCheck: SecretaryPointCheck,
  strength: number
): SecretaryReason {
  if (status === "ignored") return "weak-point";
  if (status === "held") return "focus-protected";

  if (placementType === "turnstile") return "surface-placement";
  if (placementType === "pole") return "pole-placement";
  if (placementType === "window") return "window-placement";
  if (placementType === "touch") return "touch-placement";
  if (placementType === "arena") return "arena-placement";
  if (placementType === "interruption") return "focus-protected";
  if (placementType === "calendar") return "calendar-placement";
  if (placementType === "silent") return "silent-placement";
  if (placementType === "manual_review") return "manual-review";

  if (pointCheck.checked === true && strength > 0) {
    return "point-checked";
  }

  return "unknown";
}

function canMove(
  from: SecretaryCoordinationStatus,
  to: SecretaryCoordinationStatus
): boolean {
  if (from === "burned") return false;

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) return true;

  if (
    from === "pending" ||
    from === "placed" ||
    from === "held" ||
    from === "ignored"
  ) {
    return (
      to === "placed" ||
      to === "held" ||
      to === "ignored" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function cleanPointCheck(value: unknown): SecretaryPointCheck | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<SecretaryPointCheck>;

  const pointId = cleanId(raw.point_id);
  const actorId = cleanId(raw.actor_id);
  const point = cleanText(raw.point, 1000);

  if (!pointId || !actorId || !point) {
    return null;
  }

  return {
    point_id: pointId,
    actor_id: actorId,

    point,
    checked: raw.checked === true,

    source: cleanPointSource(raw.source ?? "unknown"),

    strength: cleanNullableStrength(raw.strength ?? null),
    priority: cleanNullablePriority(raw.priority ?? null),

    created_at_ms: cleanNullableTimestamp(raw.created_at_ms ?? null),

    data: publicDataOnly(raw.data ?? {})
  };
}

function cleanPointSource(
  value: unknown
): SecretaryPointCheck["source"] {
  if (
    value === "biff" ||
    value === "cyberassistant" ||
    value === "manual" ||
    value === "system" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanStateStatus(
  value: unknown
): SecretaryCoordinationState["status"] {
  if (
    value === "idle" ||
    value === "pending" ||
    value === "placed" ||
    value === "held" ||
    value === "ignored" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "idle";
}

function cleanNullablePlacementType(
  value: unknown
): SecretaryPlacementType | null {
  if (
    value === "turnstile" ||
    value === "pole" ||
    value === "window" ||
    value === "touch" ||
    value === "arena" ||
    value === "interruption" ||
    value === "calendar" ||
    value === "silent" ||
    value === "manual_review" ||
    value === "hold" ||
    value === "ignore"
  ) {
    return value;
  }

  return null;
}

function cleanReason(value: unknown): SecretaryReason {
  if (
    value === "point-checked" ||
    value === "surface-placement" ||
    value === "pole-placement" ||
    value === "window-placement" ||
    value === "touch-placement" ||
    value === "arena-placement" ||
    value === "focus-protected" ||
    value === "calendar-placement" ||
    value === "silent-placement" ||
    value === "manual-review" ||
    value === "weak-point" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function comparePlacements(
  a: SecretaryPlacementRecord,
  b: SecretaryPlacementRecord
): number {
  const priorityDelta = b.priority - a.priority;

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const strengthDelta = b.strength - a.strength;

  if (strengthDelta !== 0) {
    return strengthDelta;
  }

  return b.created_at_ms - a.created_at_ms;
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

function clonePlacement(
  placement: SecretaryPlacementRecord
): SecretaryPlacementRecord {
  return {
    placement_id: placement.placement_id,

    point_id: placement.point_id,
    actor_id: placement.actor_id,

    point: placement.point,

    placement_type: placement.placement_type,
    status: placement.status,
    reason: placement.reason,

    surface: placement.surface ?? null,
    pole: placement.pole ?? null,
    window_id: placement.window_id ?? null,
    touch_id: placement.touch_id ?? null,

    target_lane_id: placement.target_lane_id ?? null,
    target_lane_kind: placement.target_lane_kind ?? null,

    strength: placement.strength,
    priority: placement.priority,

    created_at_ms: placement.created_at_ms,
    updated_at_ms: placement.updated_at_ms,
    placed_at_ms: placement.placed_at_ms ?? null,
    held_at_ms: placement.held_at_ms ?? null,
    ignored_at_ms: placement.ignored_at_ms ?? null,
    sealed_at_ms: placement.sealed_at_ms ?? null,
    burned_at_ms: placement.burned_at_ms ?? null,

    source_ref_id: placement.source_ref_id ?? null,

    point_check: clonePointCheck(placement.point_check),

    data: publicDataOnly(placement.data)
  };
}

function clonePointCheck(pointCheck: SecretaryPointCheck): SecretaryPointCheck {
  return {
    point_id: pointCheck.point_id,
    actor_id: pointCheck.actor_id,

    point: pointCheck.point,
    checked: pointCheck.checked,

    source: pointCheck.source,

    strength: pointCheck.strength ?? null,
    priority: pointCheck.priority ?? null,

    created_at_ms: pointCheck.created_at_ms ?? null,

    data: publicDataOnly(pointCheck.data ?? {})
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

function cleanStrength(value: unknown): number {
  const clean = cleanNullableStrength(value);
  return clean ?? 1;
}

function cleanNullableStrength(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, Math.min(1, value));
  }

  return null;
}

function cleanPriority(value: unknown): number {
  const clean = cleanNullablePriority(value);
  return clean ?? 0;
}

function cleanNullablePriority(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, Math.min(100, Math.floor(value)));
  }

  return null;
}

function cleanNullableTimestamp(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return null;
}

function cleanTimestamp(
  value: unknown,
  fallback: number
): number {
  const clean = cleanNullableTimestamp(value);
  return clean ?? fallback;
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

function cleanNullableSurface(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const clean = String(value).trim();

  if (!clean || clean.length > 240) {
    return null;
  }

  if (!clean.startsWith("chat:")) {
    return null;
  }

  return clean;
}

function cleanNullablePole(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const clean = String(value).trim();

  if (!clean || clean.length > 180) {
    return null;
  }

  if (!clean.startsWith("pole:")) {
    return null;
  }

  return clean;
}

function cleanNullableText(
  value: unknown,
  maxLength: number
): string | null {
  const clean = cleanText(value, maxLength);
  return clean || null;
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
