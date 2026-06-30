// src/cybercrowd-arena-pulse-router.ts
//
// CyberCrowd Arena Pulse Router Organ
//
// ONE JOB:
// Route live Arena Floor signals into the correct CORE lane without letting
// pulse traffic overload, scatter, or hijack the active system.
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
// Arena Pulse Router moves live signals to the right lane.
// Cognitive Load Buffer absorbs pulse overload.

import {
  CognitiveLoadBuffer,
  CognitiveLoadState
} from "./cybercrowd-cognitive-load-buffer";

export type ArenaPulseStatus =
  | "idle"
  | "routing"
  | "routed"
  | "deferred"
  | "quarantined"
  | "overloaded"
  | "sealed"
  | "burned";

export type ArenaPulseAction =
  | "route"
  | "defer"
  | "quarantine"
  | "drop"
  | "seal"
  | "burn";

export type ArenaPulseKind =
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

export type ArenaPulseLaneKind =
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

export type ArenaPulsePriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type ArenaPulseReason =
  | "arena-floor-signal"
  | "lane-routing"
  | "overload-protection"
  | "unknown-destination"
  | "manual"
  | "unknown";

export interface ArenaPulseInput {
  pulse_id?: string | null;

  source_lane_id: string;
  source_lane_kind?: ArenaPulseLaneKind;

  target_lane_id?: string | null;
  target_lane_kind?: ArenaPulseLaneKind;

  kind?: ArenaPulseKind;
  priority?: ArenaPulsePriority;
  reason?: ArenaPulseReason;

  payload?: Record<string, unknown>;

  source_ref_id?: string | null;

  at_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface ArenaPulseRoute {
  route_id: string;

  pulse_id: string;

  source_lane_id: string;
  source_lane_kind: ArenaPulseLaneKind;

  target_lane_id: string | null;
  target_lane_kind: ArenaPulseLaneKind;

  kind: ArenaPulseKind;
  priority: ArenaPulsePriority;

  action: ArenaPulseAction;
  status: ArenaPulseStatus;
  reason: ArenaPulseReason;

  payload: Record<string, unknown>;

  routed: boolean;
  deferred: boolean;
  quarantined: boolean;
  dropped: boolean;
  sealed: boolean;
  burned: boolean;

  source_ref_id: string | null;

  created_at_ms: number;
  updated_at_ms: number;
  routed_at_ms: number | null;
  deferred_at_ms: number | null;
  quarantined_at_ms: number | null;
  dropped_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  load: CognitiveLoadState;

  data: Record<string, unknown>;
}

export interface ArenaPulseState {
  status: ArenaPulseStatus;

  routed_count: number;
  deferred_count: number;
  quarantined_count: number;
  dropped_count: number;
  sealed_count: number;
  burned_count: number;

  last_action: ArenaPulseAction | null;
  last_reason: ArenaPulseReason;
  last_updated_at_ms: number;

  load: CognitiveLoadState;
}

export interface ArenaPulseDecisionParams {
  defer_low_priority?: boolean;
  quarantine_unknown_target?: boolean;
  drop_when_overloaded?: boolean;
  route_critical_when_overloaded?: boolean;
}

export interface ArenaPulseResult {
  ok: boolean;
  state: ArenaPulseState;
  route?: ArenaPulseRoute;
  routes: ArenaPulseRoute[];
  routed: ArenaPulseRoute[];
  deferred: ArenaPulseRoute[];
  quarantined: ArenaPulseRoute[];
  error?: string;
}

export interface ArenaPulseSnapshot {
  state: ArenaPulseState;
  routes: ArenaPulseRoute[];
  routed: ArenaPulseRoute[];
  deferred: ArenaPulseRoute[];
  quarantined: ArenaPulseRoute[];
  overloaded: boolean;
  stable: boolean;
}

export interface ArenaPulseRouterOrgan {
  route(
    input: ArenaPulseInput,
    params?: ArenaPulseDecisionParams
  ): ArenaPulseResult;

  routeBatch(
    inputs: ArenaPulseInput[],
    params?: ArenaPulseDecisionParams
  ): ArenaPulseResult;

  defer(route_id: string): ArenaPulseResult;
  quarantine(route_id: string): ArenaPulseResult;
  drop(route_id: string): ArenaPulseResult;
  seal(route_id: string): ArenaPulseResult;
  burn(route_id: string): ArenaPulseResult;

  get(route_id: string): ArenaPulseRoute | null;

  getState(): ArenaPulseState;
  getRoutes(): ArenaPulseRoute[];
  getRouted(): ArenaPulseRoute[];
  getDeferred(): ArenaPulseRoute[];
  getQuarantined(): ArenaPulseRoute[];

  getLoad(): CognitiveLoadState;

  snapshot(): ArenaPulseSnapshot;
  reset(): void;
}

export class ArenaPulseRouter implements ArenaPulseRouterOrgan {
  private readonly routes = new Map<string, ArenaPulseRoute>();
  private readonly routed = new Map<string, ArenaPulseRoute>();
  private readonly deferred = new Map<string, ArenaPulseRoute>();
  private readonly quarantined = new Map<string, ArenaPulseRoute>();

  private readonly clb = new CognitiveLoadBuffer({
    critical_density: 1.0,
    absorption_rate: 0.12
  });

  private state: ArenaPulseState;

  constructor(initial?: Partial<ArenaPulseState>) {
    const now = Date.now();
    const load = this.clb.getState();

    this.state = {
      status: cleanStatus(initial?.status ?? "idle"),

      routed_count: cleanCount(initial?.routed_count ?? 0),
      deferred_count: cleanCount(initial?.deferred_count ?? 0),
      quarantined_count: cleanCount(initial?.quarantined_count ?? 0),
      dropped_count: cleanCount(initial?.dropped_count ?? 0),
      sealed_count: cleanCount(initial?.sealed_count ?? 0),
      burned_count: cleanCount(initial?.burned_count ?? 0),

      last_action: cleanNullableAction(initial?.last_action ?? null),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now),

      load: cloneLoad(initial?.load ?? load)
    };
  }

  /**
   * Route one live arena pulse.
   */
  route(
    input: ArenaPulseInput,
    params: ArenaPulseDecisionParams = {}
  ): ArenaPulseResult {
    const sourceLaneId = cleanId(input?.source_lane_id);
    const targetLaneId = cleanNullableId(input?.target_lane_id ?? null);

    if (!sourceLaneId) {
      return this.result("SOURCE_LANE_ID_REQUIRED");
    }

    const now = cleanTimestamp(input?.at_ms ?? null, Date.now());

    const sourceLaneKind = cleanLaneKind(input?.source_lane_kind ?? "unknown");
    const targetLaneKind = cleanLaneKind(input?.target_lane_kind ?? "unknown");

    const kind = cleanKind(input?.kind ?? "unknown");
    const priority = cleanPriority(input?.priority ?? "normal");
    const reason = cleanReason(input?.reason ?? "arena-floor-signal");

    const load = this.applyLoad(priorityLoad(priority));

    const action = this.decideAction(
      targetLaneId,
      priority,
      load.overloaded,
      params
    );

    const route: ArenaPulseRoute = {
      route_id: makeId("arena-pulse-route"),

      pulse_id: cleanNullableId(input?.pulse_id ?? null) ?? makeId("arena-pulse"),

      source_lane_id: sourceLaneId,
      source_lane_kind: sourceLaneKind,

      target_lane_id: targetLaneId,
      target_lane_kind: targetLaneKind,

      kind,
      priority,

      action,
      status: statusFromAction(action, load.overloaded),
      reason,

      payload: publicDataOnly(input?.payload ?? {}),

      routed: action === "route",
      deferred: action === "defer",
      quarantined: action === "quarantine",
      dropped: action === "drop",
      sealed: false,
      burned: false,

      source_ref_id: cleanNullableId(input?.source_ref_id ?? null),

      created_at_ms: now,
      updated_at_ms: now,
      routed_at_ms: action === "route" ? now : null,
      deferred_at_ms: action === "defer" ? now : null,
      quarantined_at_ms: action === "quarantine" ? now : null,
      dropped_at_ms: action === "drop" ? now : null,
      sealed_at_ms: null,
      burned_at_ms: null,

      load: cloneLoad(load),

      data: publicDataOnly(input?.data ?? {})
    };

    this.routes.set(route.route_id, cloneRoute(route));

    if (route.routed) {
      this.routed.set(route.route_id, cloneRoute(route));
      this.state.routed_count += 1;
    }

    if (route.deferred) {
      this.deferred.set(route.route_id, cloneRoute(route));
      this.state.deferred_count += 1;
    }

    if (route.quarantined) {
      this.quarantined.set(route.route_id, cloneRoute(route));
      this.state.quarantined_count += 1;
    }

    if (route.dropped) {
      this.state.dropped_count += 1;
    }

    this.state = {
      ...this.state,
      status: route.status,
      last_action: action,
      last_reason: reason,
      last_updated_at_ms: now,
      load: cloneLoad(load)
    };

    return this.result(undefined, route);
  }

  /**
   * Route a batch of live arena pulses.
   */
  routeBatch(
    inputs: ArenaPulseInput[],
    params: ArenaPulseDecisionParams = {}
  ): ArenaPulseResult {
    if (!Array.isArray(inputs)) {
      return this.result("ARENA_PULSE_INPUTS_REQUIRED");
    }

    let lastRoute: ArenaPulseRoute | undefined;

    this.state = {
      ...this.state,
      status: "routing",
      last_updated_at_ms: Date.now()
    };

    for (const input of inputs) {
      const result = this.route(input, params);

      if (result.route) {
        lastRoute = result.route;
      }
    }

    return this.result(undefined, lastRoute);
  }

  /**
   * Defer an existing pulse route.
   */
  defer(route_id: string): ArenaPulseResult {
    const route = this.routes.get(cleanId(route_id));

    if (!route) {
      return this.result("ARENA_PULSE_ROUTE_NOT_FOUND");
    }

    if (!canMove(route.status, "deferred")) {
      return this.result("ARENA_PULSE_STATE_LOCKED", route);
    }

    const now = Date.now();

    const updated: ArenaPulseRoute = {
      ...cloneRoute(route),
      action: "defer",
      status: "deferred",
      routed: false,
      deferred: true,
      quarantined: false,
      dropped: false,
      updated_at_ms: now,
      deferred_at_ms: now
    };

    this.routes.set(updated.route_id, cloneRoute(updated));
    this.routed.delete(updated.route_id);
    this.quarantined.delete(updated.route_id);
    this.deferred.set(updated.route_id, cloneRoute(updated));

    this.state = {
      ...this.state,
      status: "deferred",
      deferred_count: this.state.deferred_count + 1,
      last_action: "defer",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Quarantine an existing pulse route.
   */
  quarantine(route_id: string): ArenaPulseResult {
    const route = this.routes.get(cleanId(route_id));

    if (!route) {
      return this.result("ARENA_PULSE_ROUTE_NOT_FOUND");
    }

    if (!canMove(route.status, "quarantined")) {
      return this.result("ARENA_PULSE_STATE_LOCKED", route);
    }

    const now = Date.now();

    const updated: ArenaPulseRoute = {
      ...cloneRoute(route),
      action: "quarantine",
      status: "quarantined",
      routed: false,
      deferred: false,
      quarantined: true,
      dropped: false,
      updated_at_ms: now,
      quarantined_at_ms: now
    };

    this.routes.set(updated.route_id, cloneRoute(updated));
    this.routed.delete(updated.route_id);
    this.deferred.delete(updated.route_id);
    this.quarantined.set(updated.route_id, cloneRoute(updated));

    this.state = {
      ...this.state,
      status: "quarantined",
      quarantined_count: this.state.quarantined_count + 1,
      last_action: "quarantine",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Drop an existing pulse route without claiming punishment.
   */
  drop(route_id: string): ArenaPulseResult {
    const route = this.routes.get(cleanId(route_id));

    if (!route) {
      return this.result("ARENA_PULSE_ROUTE_NOT_FOUND");
    }

    if (!canMove(route.status, "idle")) {
      return this.result("ARENA_PULSE_STATE_LOCKED", route);
    }

    const now = Date.now();

    const updated: ArenaPulseRoute = {
      ...cloneRoute(route),
      action: "drop",
      status: "idle",
      routed: false,
      deferred: false,
      quarantined: false,
      dropped: true,
      updated_at_ms: now,
      dropped_at_ms: now
    };

    this.routes.set(updated.route_id, cloneRoute(updated));
    this.routed.delete(updated.route_id);
    this.deferred.delete(updated.route_id);
    this.quarantined.delete(updated.route_id);

    this.state = {
      ...this.state,
      status: "idle",
      dropped_count: this.state.dropped_count + 1,
      last_action: "drop",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Seal an existing pulse route.
   */
  seal(route_id: string): ArenaPulseResult {
    const route = this.routes.get(cleanId(route_id));

    if (!route) {
      return this.result("ARENA_PULSE_ROUTE_NOT_FOUND");
    }

    if (!canMove(route.status, "sealed")) {
      return this.result("ARENA_PULSE_STATE_LOCKED", route);
    }

    const now = Date.now();

    const updated: ArenaPulseRoute = {
      ...cloneRoute(route),
      action: "seal",
      status: "sealed",
      sealed: true,
      updated_at_ms: now,
      sealed_at_ms: now
    };

    this.routes.set(updated.route_id, cloneRoute(updated));

    if (this.routed.has(updated.route_id)) {
      this.routed.set(updated.route_id, cloneRoute(updated));
    }

    if (this.deferred.has(updated.route_id)) {
      this.deferred.set(updated.route_id, cloneRoute(updated));
    }

    if (this.quarantined.has(updated.route_id)) {
      this.quarantined.set(updated.route_id, cloneRoute(updated));
    }

    this.state = {
      ...this.state,
      status: "sealed",
      sealed_count: this.state.sealed_count + 1,
      last_action: "seal",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Burn an existing pulse route from live memory.
   */
  burn(route_id: string): ArenaPulseResult {
    const cleanRouteId = cleanId(route_id);
    const route = this.routes.get(cleanRouteId);

    if (!route) {
      return this.result("ARENA_PULSE_ROUTE_NOT_FOUND");
    }

    this.routes.delete(cleanRouteId);
    this.routed.delete(cleanRouteId);
    this.deferred.delete(cleanRouteId);
    this.quarantined.delete(cleanRouteId);

    const now = Date.now();

    const burned: ArenaPulseRoute = {
      ...cloneRoute(route),
      action: "burn",
      status: "burned",
      burned: true,
      sealed: true,
      updated_at_ms: now,
      burned_at_ms: now
    };

    this.state = {
      ...this.state,
      status: "burned",
      burned_count: this.state.burned_count + 1,
      last_action: "burn",
      last_reason: burned.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, burned);
  }

  get(route_id: string): ArenaPulseRoute | null {
    const route = this.routes.get(cleanId(route_id));
    return route ? cloneRoute(route) : null;
  }

  getState(): ArenaPulseState {
    return {
      status: this.state.status,

      routed_count: this.state.routed_count,
      deferred_count: this.state.deferred_count,
      quarantined_count: this.state.quarantined_count,
      dropped_count: this.state.dropped_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,

      last_action: this.state.last_action,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms,

      load: cloneLoad(this.state.load)
    };
  }

  getRoutes(): ArenaPulseRoute[] {
    return Array.from(this.routes.values())
      .map(cloneRoute)
      .sort(compareRoutes);
  }

  getRouted(): ArenaPulseRoute[] {
    return Array.from(this.routed.values())
      .map(cloneRoute)
      .sort(compareRoutes);
  }

  getDeferred(): ArenaPulseRoute[] {
    return Array.from(this.deferred.values())
      .map(cloneRoute)
      .sort(compareRoutes);
  }

  getQuarantined(): ArenaPulseRoute[] {
    return Array.from(this.quarantined.values())
      .map(cloneRoute)
      .sort(compareRoutes);
  }

  getLoad(): CognitiveLoadState {
    return this.clb.getState();
  }

  snapshot(): ArenaPulseSnapshot {
    const state = this.getState();

    return {
      state,
      routes: this.getRoutes(),
      routed: this.getRouted(),
      deferred: this.getDeferred(),
      quarantined: this.getQuarantined(),
      overloaded: state.load.overloaded || state.status === "overloaded",
      stable:
        state.status === "idle" ||
        state.status === "routed" ||
        state.status === "deferred"
    };
  }

  reset(): void {
    this.routes.clear();
    this.routed.clear();
    this.deferred.clear();
    this.quarantined.clear();
    this.clb.reset();

    this.state = {
      status: "idle",

      routed_count: 0,
      deferred_count: 0,
      quarantined_count: 0,
      dropped_count: 0,
      sealed_count: 0,
      burned_count: 0,

      last_action: null,
      last_reason: "unknown",
      last_updated_at_ms: Date.now(),

      load: this.clb.getState()
    };
  }

  private decideAction(
    targetLaneId: string | null,
    priority: ArenaPulsePriority,
    overloaded: boolean,
    params: ArenaPulseDecisionParams
  ): ArenaPulseAction {
    if (
      overloaded &&
      params.route_critical_when_overloaded === true &&
      priority === "critical" &&
      targetLaneId
    ) {
      return "route";
    }

    if (overloaded && params.drop_when_overloaded === true) {
      return "drop";
    }

    if (overloaded) {
      return "defer";
    }

    if (params.defer_low_priority === true && priority === "low") {
      return "defer";
    }

    if (params.quarantine_unknown_target === true && !targetLaneId) {
      return "quarantine";
    }

    if (!targetLaneId) {
      return "defer";
    }

    return "route";
  }

  private applyLoad(delta: number): CognitiveLoadState {
    return this.clb.apply({
      at_ms: Date.now(),
      delta_update_volume: delta
    });
  }

  private result(
    error?: string,
    route?: ArenaPulseRoute
  ): ArenaPulseResult {
    return {
      ok: !error,
      state: this.getState(),
      route: route ? cloneRoute(route) : undefined,
      routes: this.getRoutes(),
      routed: this.getRouted(),
      deferred: this.getDeferred(),
      quarantined: this.getQuarantined(),
      error
    };
  }
}

export const CyberCrowdArenaPulseRouter =
  new ArenaPulseRouter();

function canMove(from: ArenaPulseStatus, to: ArenaPulseStatus): boolean {
  if (from === "burned") {
    return false;
  }

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) {
    return true;
  }

  if (
    from === "idle" ||
    from === "routing" ||
    from === "routed" ||
    from === "deferred" ||
    from === "quarantined" ||
    from === "overloaded"
  ) {
    return (
      to === "idle" ||
      to === "routed" ||
      to === "deferred" ||
      to === "quarantined" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function statusFromAction(
  action: ArenaPulseAction,
  overloaded: boolean
): ArenaPulseStatus {
  if (overloaded && action !== "route") return "overloaded";
  if (action === "route") return "routed";
  if (action === "defer") return "deferred";
  if (action === "quarantine") return "quarantined";
  if (action === "drop") return "idle";
  if (action === "seal") return "sealed";
  if (action === "burn") return "burned";

  return "idle";
}

function priorityLoad(priority: ArenaPulsePriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 2;
  if (priority === "normal") return 1;
  if (priority === "low") return 0.5;

  return 1;
}

function compareRoutes(a: ArenaPulseRoute, b: ArenaPulseRoute): number {
  const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return b.created_at_ms - a.created_at_ms;
}

function priorityRank(priority: ArenaPulsePriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "normal") return 2;
  if (priority === "low") return 1;

  return 2;
}

function cleanStatus(value: unknown): ArenaPulseStatus {
  if (
    value === "idle" ||
    value === "routing" ||
    value === "routed" ||
    value === "deferred" ||
    value === "quarantined" ||
    value === "overloaded" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "idle";
}

function cleanNullableAction(value: unknown): ArenaPulseAction | null {
  if (
    value === "route" ||
    value === "defer" ||
    value === "quarantine" ||
    value === "drop" ||
    value === "seal" ||
    value === "burn"
  ) {
    return value;
  }

  return null;
}

function cleanReason(value: unknown): ArenaPulseReason {
  if (
    value === "arena-floor-signal" ||
    value === "lane-routing" ||
    value === "overload-protection" ||
    value === "unknown-destination" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanKind(value: unknown): ArenaPulseKind {
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

function cleanLaneKind(value: unknown): ArenaPulseLaneKind {
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

function cleanPriority(value: unknown): ArenaPulsePriority {
  if (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  return "normal";
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

function cloneRoute(route: ArenaPulseRoute): ArenaPulseRoute {
  return {
    route_id: route.route_id,

    pulse_id: route.pulse_id,

    source_lane_id: route.source_lane_id,
    source_lane_kind: route.source_lane_kind,

    target_lane_id: route.target_lane_id ?? null,
    target_lane_kind: route.target_lane_kind,

    kind: route.kind,
    priority: route.priority,

    action: route.action,
    status: route.status,
    reason: route.reason,

    payload: publicDataOnly(route.payload),

    routed: route.routed,
    deferred: route.deferred,
    quarantined: route.quarantined,
    dropped: route.dropped,
    sealed: route.sealed,
    burned: route.burned,

    source_ref_id: route.source_ref_id ?? null,

    created_at_ms: route.created_at_ms,
    updated_at_ms: route.updated_at_ms,
    routed_at_ms: route.routed_at_ms ?? null,
    deferred_at_ms: route.deferred_at_ms ?? null,
    quarantined_at_ms: route.quarantined_at_ms ?? null,
    dropped_at_ms: route.dropped_at_ms ?? null,
    sealed_at_ms: route.sealed_at_ms ?? null,
    burned_at_ms: route.burned_at_ms ?? null,

    load: cloneLoad(route.load),

    data: publicDataOnly(route.data)
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
