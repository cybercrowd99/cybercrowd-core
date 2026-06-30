// src/cybercrowd-turnstile-router.ts
//
// CyberCrowd Turnstile Router
//
// ONE JOB:
// Route dispatched recall decisions into the correct Chat surface.
//
// This is operator-grade turnstile routing.
// This is CORE chat routing physics.
// This is NOT discovery.
// This is NOT ranking.
// This is NOT a feed.
// This is NOT ads.
// This is NOT search.
// This is NOT marketplace UI.
// This is NOT punishment.
// This is NOT hidden control.
//
// LOCKED RULE:
// Dispatch decides what kind of recall fired.
// Turnstile Router decides which Chat surface receives it.
//
// Actor notice goes to actor notice surface.
// High tier goes to arena high-tier surface.
// Arena pulse goes to arena kind surface.
// Calendar goes to actor calendar surface.
// Manual review goes to actor review surface.
// Silent goes to actor silent surface.
// Ignore, decay, unknown, or invalid decisions do not route.

export type TurnstileDispatchType =
  | "silent"
  | "actor_notice"
  | "calendar"
  | "high_tier"
  | "arena_pulse"
  | "interruption"
  | "manual_review"
  | "decay"
  | "ignore";

export type TurnstileRecallKind =
  | "item"
  | "food"
  | "service"
  | "place"
  | "event"
  | "other";

export type TurnstileSurfaceKind =
  | "actor_notice"
  | "actor_calendar"
  | "actor_review"
  | "actor_silent"
  | "arena_high_tier"
  | "arena_kind"
  | "interruption"
  | "none";

export interface TurnstileDecisionInput {
  type: TurnstileDispatchType;

  actor_id: string;

  recall_id?: string | null;
  ping_id?: string | null;

  kind?: TurnstileRecallKind;

  target_lane_id?: string | null;
  target_lane_kind?: string | null;

  label?: string | null;
  strength?: number | null;

  source_ref_id?: string | null;

  data?: Record<string, unknown>;
}

export interface TurnstileRoute {
  route_id: string;

  surface: string | null;
  surface_kind: TurnstileSurfaceKind;

  pulse: TurnstileDecisionInput | null;

  actor_id: string | null;

  type: TurnstileDispatchType | "invalid";
  kind: TurnstileRecallKind;

  routed: boolean;
  reason: string;

  created_at_ms: number;

  data: Record<string, unknown>;
}

export interface TurnstileRouterState {
  routed_count: number;
  blocked_count: number;
  last_surface: string | null;
  last_type: TurnstileDispatchType | "invalid" | null;
  last_reason: string | null;
  last_updated_at_ms: number;
}

export interface TurnstileRouterResult {
  ok: boolean;
  route: TurnstileRoute;
  state: TurnstileRouterState;
  error?: string;
}

export interface TurnstileRouterSnapshot {
  state: TurnstileRouterState;
  routes: TurnstileRoute[];
  routed: TurnstileRoute[];
  blocked: TurnstileRoute[];
  stable: boolean;
}

export class TurnstileRouter {
  private routes: TurnstileRoute[] = [];

  private state: TurnstileRouterState = {
    routed_count: 0,
    blocked_count: 0,
    last_surface: null,
    last_type: null,
    last_reason: null,
    last_updated_at_ms: Date.now()
  };

  /**
   * Route one dispatched recall decision into Chat.
   */
  turnstile(decision: TurnstileDecisionInput): TurnstileRouterResult {
    const now = Date.now();

    const type = cleanDispatchType(decision?.type);
    const actorId = cleanId(decision?.actor_id);
    const kind = cleanRecallKind(decision?.kind ?? "other");

    if (!type) {
      return this.block("INVALID_DISPATCH_TYPE", decision, now);
    }

    if (!actorId) {
      return this.block("ACTOR_ID_REQUIRED", decision, now);
    }

    const surface = surfaceFor(type, actorId, kind);

    if (!surface) {
      return this.block("NO_CHAT_SURFACE_FOR_DECISION", decision, now);
    }

    const route: TurnstileRoute = {
      route_id: makeId("turnstile-route"),

      surface,
      surface_kind: surfaceKindFor(type),

      pulse: cloneDecision(decision),

      actor_id: actorId,

      type,
      kind,

      routed: true,
      reason: "routed",

      created_at_ms: now,

      data: publicDataOnly(decision?.data ?? {})
    };

    this.routes.push(cloneRoute(route));
    this.routes = this.routes.slice(-500);

    this.state = {
      routed_count: this.state.routed_count + 1,
      blocked_count: this.state.blocked_count,
      last_surface: surface,
      last_type: type,
      last_reason: "routed",
      last_updated_at_ms: now
    };

    return {
      ok: true,
      route: cloneRoute(route),
      state: this.getState()
    };
  }

  /**
   * Route many decisions into Chat.
   */
  turnstileBatch(decisions: TurnstileDecisionInput[]): TurnstileRouterResult[] {
    if (!Array.isArray(decisions)) {
      const blocked = this.block(
        "TURNSTILE_DECISIONS_REQUIRED",
        null,
        Date.now()
      );

      return [blocked];
    }

    return decisions.map((decision) => this.turnstile(decision));
  }

  /**
   * Read current state.
   */
  getState(): TurnstileRouterState {
    return {
      routed_count: this.state.routed_count,
      blocked_count: this.state.blocked_count,
      last_surface: this.state.last_surface,
      last_type: this.state.last_type,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  /**
   * Read all recent routes.
   */
  getRoutes(): TurnstileRoute[] {
    return this.routes
      .map(cloneRoute)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  /**
   * Read routed records only.
   */
  getRouted(): TurnstileRoute[] {
    return this.getRoutes().filter((route) => route.routed);
  }

  /**
   * Read blocked records only.
   */
  getBlocked(): TurnstileRoute[] {
    return this.getRoutes().filter((route) => !route.routed);
  }

  /**
   * Read operational snapshot.
   */
  snapshot(): TurnstileRouterSnapshot {
    return {
      state: this.getState(),
      routes: this.getRoutes(),
      routed: this.getRouted(),
      blocked: this.getBlocked(),
      stable: true
    };
  }

  /**
   * Reset live turnstile memory.
   */
  reset(): void {
    this.routes = [];

    this.state = {
      routed_count: 0,
      blocked_count: 0,
      last_surface: null,
      last_type: null,
      last_reason: null,
      last_updated_at_ms: Date.now()
    };
  }

  private block(
    reason: string,
    decision: TurnstileDecisionInput | null,
    at_ms: number
  ): TurnstileRouterResult {
    const route: TurnstileRoute = {
      route_id: makeId("turnstile-block"),

      surface: null,
      surface_kind: "none",

      pulse: decision ? cloneDecision(decision) : null,

      actor_id: cleanNullableId(decision?.actor_id ?? null),

      type: cleanDispatchType(decision?.type) ?? "invalid",
      kind: cleanRecallKind(decision?.kind ?? "other"),

      routed: false,
      reason,

      created_at_ms: at_ms,

      data: publicDataOnly(decision?.data ?? {})
    };

    this.routes.push(cloneRoute(route));
    this.routes = this.routes.slice(-500);

    this.state = {
      routed_count: this.state.routed_count,
      blocked_count: this.state.blocked_count + 1,
      last_surface: null,
      last_type: route.type,
      last_reason: reason,
      last_updated_at_ms: at_ms
    };

    return {
      ok: false,
      route: cloneRoute(route),
      state: this.getState(),
      error: reason
    };
  }
}

export const CyberCrowdTurnstileRouter =
  new TurnstileRouter();

/**
 * Direct operator-grade turnstile function.
 */
export function turnstile(
  decision: TurnstileDecisionInput
): TurnstileRoute {
  return CyberCrowdTurnstileRouter.turnstile(decision).route;
}

function surfaceFor(
  type: TurnstileDispatchType,
  actorId: string,
  kind: TurnstileRecallKind
): string | null {
  switch (type) {
    case "actor_notice":
      return `chat:actor:${actorId}:notice`;

    case "high_tier":
      return "chat:arena:high-tier";

    case "arena_pulse":
      return `chat:arena:${kind}`;

    case "calendar":
      return `chat:actor:${actorId}:calendar`;

    case "manual_review":
      return `chat:actor:${actorId}:review`;

    case "silent":
      return `chat:actor:${actorId}:silent`;

    case "interruption":
      return `chat:actor:${actorId}:interruption`;

    case "decay":
    case "ignore":
      return null;

    default:
      return null;
  }
}

function surfaceKindFor(type: TurnstileDispatchType): TurnstileSurfaceKind {
  switch (type) {
    case "actor_notice":
      return "actor_notice";

    case "calendar":
      return "actor_calendar";

    case "manual_review":
      return "actor_review";

    case "silent":
      return "actor_silent";

    case "high_tier":
      return "arena_high_tier";

    case "arena_pulse":
      return "arena_kind";

    case "interruption":
      return "interruption";

    default:
      return "none";
  }
}

function cleanDispatchType(value: unknown): TurnstileDispatchType | null {
  if (
    value === "silent" ||
    value === "actor_notice" ||
    value === "calendar" ||
    value === "high_tier" ||
    value === "arena_pulse" ||
    value === "interruption" ||
    value === "manual_review" ||
    value === "decay" ||
    value === "ignore"
  ) {
    return value;
  }

  return null;
}

function cleanRecallKind(value: unknown): TurnstileRecallKind {
  if (
    value === "item" ||
    value === "food" ||
    value === "service" ||
    value === "place" ||
    value === "event" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
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

function cloneRoute(route: TurnstileRoute): TurnstileRoute {
  return {
    route_id: route.route_id,

    surface: route.surface ?? null,
    surface_kind: route.surface_kind,

    pulse: route.pulse ? cloneDecision(route.pulse) : null,

    actor_id: route.actor_id ?? null,

    type: route.type,
    kind: route.kind,

    routed: route.routed,
    reason: route.reason,

    created_at_ms: route.created_at_ms,

    data: publicDataOnly(route.data)
  };
}

function cloneDecision(
  decision: TurnstileDecisionInput
): TurnstileDecisionInput {
  const cloned: TurnstileDecisionInput = {
    type: cleanDispatchType(decision.type) ?? "ignore",
    actor_id: cleanId(decision.actor_id),
    kind: cleanRecallKind(decision.kind ?? "other"),
    data: publicDataOnly(decision.data ?? {})
  };

  const recallId = cleanNullableId(decision.recall_id ?? null);
  if (recallId) cloned.recall_id = recallId;

  const pingId = cleanNullableId(decision.ping_id ?? null);
  if (pingId) cloned.ping_id = pingId;

  const targetLaneId = cleanNullableId(decision.target_lane_id ?? null);
  if (targetLaneId) cloned.target_lane_id = targetLaneId;

  const targetLaneKind = cleanNullableText(decision.target_lane_kind ?? null, 120);
  if (targetLaneKind) cloned.target_lane_kind = targetLaneKind;

  const label = cleanNullableText(decision.label ?? null, 240);
  if (label) cloned.label = label;

  const strength = cleanNullableNumber(decision.strength ?? null);
  if (strength != null) cloned.strength = strength;

  const sourceRefId = cleanNullableId(decision.source_ref_id ?? null);
  if (sourceRefId) cloned.source_ref_id = sourceRefId;

  return cloned;
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

function cleanNullableNumber(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, Math.min(1, value));
  }

  return null;
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
