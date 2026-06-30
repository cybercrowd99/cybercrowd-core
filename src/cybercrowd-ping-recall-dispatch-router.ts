// src/cybercrowd-ping-recall-dispatch-router.ts
//
// CyberCrowd Ping Recall Dispatch Router
//
// ONE JOB:
// Route fired Ping Recall events into the correct lane without turning recall
// into discovery, ranking, a feed, ads, or hidden control.
//
// This is CORE recall physics.
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
// Dispatch is not discovery.
// Dispatch is not ranking.
// Dispatch is not a feed.
// Dispatch only routes a fired recall event.
//
// Ping Recall Engine detects collision.
// Ping Recall Dispatch Router routes fired recall.

export type DispatchType =
  | "silent"
  | "actor_notice"
  | "calendar"
  | "high_tier"
  | "arena_pulse"
  | "interruption"
  | "manual_review"
  | "decay"
  | "ignore";

export type DispatchStatus =
  | "pending"
  | "dispatched"
  | "deferred"
  | "ignored"
  | "sealed"
  | "burned";

export type DispatchReason =
  | "fired-recall"
  | "high-strength"
  | "time-based"
  | "actor-visible"
  | "arena-route"
  | "focus-protected"
  | "manual-review"
  | "decay"
  | "low-strength"
  | "unknown";

export type RecallKind =
  | "item"
  | "food"
  | "service"
  | "place"
  | "event"
  | "other";

export interface RecallDispatchContext {
  actor_id: string;

  recall_id: string;
  ping_id: string;

  kind: RecallKind;
  label: string;

  strength?: number;

  item_label?: string;
  tags?: string[];
  value?: number;

  place_id?: string;
  place_label?: string;

  time_ms?: number;

  source_ref_id?: string | null;

  data?: Record<string, unknown>;
}

export interface DispatchDecisionParams {
  high_tier_strength?: number;
  manual_review_strength?: number;
  ignore_below_strength?: number;

  prefer_arena_pulse?: boolean;
  focus_window_active?: boolean;
  calendar_for_events?: boolean;
  actor_notice_for_high_tier?: boolean;
}

export interface DispatchDecision {
  decision_id: string;

  type: DispatchType;
  status: DispatchStatus;
  reason: DispatchReason;

  actor_id: string;
  recall_id: string;
  ping_id: string;

  kind: RecallKind;
  label: string;

  strength: number;

  target_lane_id: string | null;
  target_lane_kind: string | null;

  created_at_ms: number;
  updated_at_ms: number;

  dispatched_at_ms: number | null;
  deferred_at_ms: number | null;
  ignored_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  context: RecallDispatchContext;

  data: Record<string, unknown>;
}

export interface DispatchRouterState {
  status: DispatchStatus | "idle";
  dispatched_count: number;
  deferred_count: number;
  ignored_count: number;
  sealed_count: number;
  burned_count: number;
  last_type: DispatchType | null;
  last_reason: DispatchReason;
  last_updated_at_ms: number;
}

export interface DispatchRouterResult {
  ok: boolean;
  state: DispatchRouterState;
  decision?: DispatchDecision;
  decisions: DispatchDecision[];
  dispatched: DispatchDecision[];
  deferred: DispatchDecision[];
  ignored: DispatchDecision[];
  error?: string;
}

export interface DispatchRouterSnapshot {
  state: DispatchRouterState;
  decisions: DispatchDecision[];
  dispatched: DispatchDecision[];
  deferred: DispatchDecision[];
  ignored: DispatchDecision[];
  stable: boolean;
}

export class PingRecallDispatchRouter {
  private decisions = new Map<string, DispatchDecision>();
  private dispatched = new Map<string, DispatchDecision>();
  private deferred = new Map<string, DispatchDecision>();
  private ignored = new Map<string, DispatchDecision>();

  private state: DispatchRouterState;

  constructor(initial?: Partial<DispatchRouterState>) {
    const now = Date.now();

    this.state = {
      status: cleanRouterStatus(initial?.status ?? "idle"),
      dispatched_count: cleanCount(initial?.dispatched_count ?? 0),
      deferred_count: cleanCount(initial?.deferred_count ?? 0),
      ignored_count: cleanCount(initial?.ignored_count ?? 0),
      sealed_count: cleanCount(initial?.sealed_count ?? 0),
      burned_count: cleanCount(initial?.burned_count ?? 0),
      last_type: cleanNullableDispatchType(initial?.last_type ?? null),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Route one fired recall event.
   */
  route(
    context: RecallDispatchContext,
    params: DispatchDecisionParams = {}
  ): DispatchRouterResult {
    const actorId = cleanId(context?.actor_id);
    const recallId = cleanId(context?.recall_id);
    const pingId = cleanId(context?.ping_id);
    const label = cleanText(context?.label, 240);
    const kind = cleanKind(context?.kind);

    if (!actorId) {
      return this.result("ACTOR_ID_REQUIRED");
    }

    if (!recallId) {
      return this.result("RECALL_ID_REQUIRED");
    }

    if (!pingId) {
      return this.result("PING_ID_REQUIRED");
    }

    if (!label) {
      return this.result("RECALL_LABEL_REQUIRED");
    }

    const now = cleanTimestamp(context?.time_ms ?? null, Date.now());
    const strength = cleanStrength(context?.strength ?? 1);

    const type = this.decideType(kind, strength, context, params);
    const status = statusFromType(type);
    const reason = reasonFromType(type, strength, params);

    const decision: DispatchDecision = {
      decision_id: makeId("recall-dispatch"),

      type,
      status,
      reason,

      actor_id: actorId,
      recall_id: recallId,
      ping_id: pingId,

      kind,
      label,

      strength,

      target_lane_id: targetLaneIdFor(type, actorId, context),
      target_lane_kind: targetLaneKindFor(type),

      created_at_ms: now,
      updated_at_ms: now,

      dispatched_at_ms: status === "dispatched" ? now : null,
      deferred_at_ms: status === "deferred" ? now : null,
      ignored_at_ms: status === "ignored" ? now : null,
      sealed_at_ms: null,
      burned_at_ms: null,

      context: cloneContext({
        ...context,
        actor_id: actorId,
        recall_id: recallId,
        ping_id: pingId,
        kind,
        label,
        strength,
        time_ms: now
      }),

      data: publicDataOnly(context?.data ?? {})
    };

    this.storeDecision(decision);

    this.state = {
      ...this.state,
      status,
      last_type: type,
      last_reason: reason,
      last_updated_at_ms: now
    };

    if (status === "dispatched") {
      this.state.dispatched_count += 1;
    }

    if (status === "deferred") {
      this.state.deferred_count += 1;
    }

    if (status === "ignored") {
      this.state.ignored_count += 1;
    }

    return this.result(undefined, decision);
  }

  /**
   * Route multiple fired recall events.
   */
  routeBatch(
    contexts: RecallDispatchContext[],
    params: DispatchDecisionParams = {}
  ): DispatchRouterResult {
    if (!Array.isArray(contexts)) {
      return this.result("RECALL_DISPATCH_CONTEXTS_REQUIRED");
    }

    let lastDecision: DispatchDecision | undefined;

    for (const context of contexts) {
      const result = this.route(context, params);

      if (result.decision) {
        lastDecision = result.decision;
      }
    }

    return this.result(undefined, lastDecision);
  }

  /**
   * Mark a decision as dispatched.
   */
  dispatch(decision_id: string): DispatchRouterResult {
    return this.transition(decision_id, "dispatched");
  }

  /**
   * Defer a decision without losing it.
   */
  defer(decision_id: string): DispatchRouterResult {
    return this.transition(decision_id, "deferred");
  }

  /**
   * Ignore a decision without deleting it.
   */
  ignore(decision_id: string): DispatchRouterResult {
    return this.transition(decision_id, "ignored");
  }

  /**
   * Seal a decision without deleting it.
   */
  seal(decision_id: string): DispatchRouterResult {
    return this.transition(decision_id, "sealed");
  }

  /**
   * Burn a decision from live memory.
   */
  burn(decision_id: string): DispatchRouterResult {
    const decisionId = cleanId(decision_id);
    const decision = this.decisions.get(decisionId);

    if (!decision) {
      return this.result("DISPATCH_DECISION_NOT_FOUND");
    }

    this.decisions.delete(decisionId);
    this.dispatched.delete(decisionId);
    this.deferred.delete(decisionId);
    this.ignored.delete(decisionId);

    const now = Date.now();

    const burned: DispatchDecision = {
      ...cloneDecision(decision),
      status: "burned",
      updated_at_ms: now,
      burned_at_ms: now
    };

    this.state = {
      ...this.state,
      status: "burned",
      burned_count: this.state.burned_count + 1,
      last_type: burned.type,
      last_reason: burned.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, burned);
  }

  /**
   * Read one decision.
   */
  get(decision_id: string): DispatchDecision | null {
    const decision = this.decisions.get(cleanId(decision_id));
    return decision ? cloneDecision(decision) : null;
  }

  /**
   * Read router state.
   */
  getState(): DispatchRouterState {
    return {
      status: this.state.status,
      dispatched_count: this.state.dispatched_count,
      deferred_count: this.state.deferred_count,
      ignored_count: this.state.ignored_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_type: this.state.last_type,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getDecisions(): DispatchDecision[] {
    return Array.from(this.decisions.values())
      .map(cloneDecision)
      .sort(compareDecisions);
  }

  getDispatched(): DispatchDecision[] {
    return Array.from(this.dispatched.values())
      .map(cloneDecision)
      .sort(compareDecisions);
  }

  getDeferred(): DispatchDecision[] {
    return Array.from(this.deferred.values())
      .map(cloneDecision)
      .sort(compareDecisions);
  }

  getIgnored(): DispatchDecision[] {
    return Array.from(this.ignored.values())
      .map(cloneDecision)
      .sort(compareDecisions);
  }

  snapshot(): DispatchRouterSnapshot {
    return {
      state: this.getState(),
      decisions: this.getDecisions(),
      dispatched: this.getDispatched(),
      deferred: this.getDeferred(),
      ignored: this.getIgnored(),
      stable:
        this.state.status === "idle" ||
        this.state.status === "dispatched" ||
        this.state.status === "deferred" ||
        this.state.status === "ignored"
    };
  }

  reset(): void {
    this.decisions.clear();
    this.dispatched.clear();
    this.deferred.clear();
    this.ignored.clear();

    this.state = {
      status: "idle",
      dispatched_count: 0,
      deferred_count: 0,
      ignored_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_type: null,
      last_reason: "unknown",
      last_updated_at_ms: Date.now()
    };
  }

  private decideType(
    kind: RecallKind,
    strength: number,
    context: RecallDispatchContext,
    params: DispatchDecisionParams
  ): DispatchType {
    const highTierStrength = cleanStrength(params.high_tier_strength ?? 0.85);
    const manualReviewStrength = cleanStrength(
      params.manual_review_strength ?? 0.5
    );
    const ignoreBelowStrength = cleanStrength(
      params.ignore_below_strength ?? 0
    );

    if (strength <= ignoreBelowStrength) {
      return "ignore";
    }

    if (params.focus_window_active === true) {
      return "interruption";
    }

    if (params.calendar_for_events === true && kind === "event") {
      return "calendar";
    }

    if (
      params.actor_notice_for_high_tier === true &&
      strength >= highTierStrength
    ) {
      return "actor_notice";
    }

    if (strength >= highTierStrength) {
      return "high_tier";
    }

    if (params.prefer_arena_pulse === true) {
      return "arena_pulse";
    }

    if (strength >= manualReviewStrength && hasWeakRoute(context)) {
      return "manual_review";
    }

    if (kind === "other") {
      return "silent";
    }

    return "silent";
  }

  private transition(
    decision_id: string,
    status: DispatchStatus
  ): DispatchRouterResult {
    const decisionId = cleanId(decision_id);
    const decision = this.decisions.get(decisionId);

    if (!decision) {
      return this.result("DISPATCH_DECISION_NOT_FOUND");
    }

    if (!canMove(decision.status, status)) {
      return this.result("DISPATCH_DECISION_STATE_LOCKED", decision);
    }

    const now = Date.now();

    const updated: DispatchDecision = {
      ...cloneDecision(decision),
      status,
      updated_at_ms: now,
      dispatched_at_ms:
        status === "dispatched" ? now : decision.dispatched_at_ms,
      deferred_at_ms:
        status === "deferred" ? now : decision.deferred_at_ms,
      ignored_at_ms:
        status === "ignored" ? now : decision.ignored_at_ms,
      sealed_at_ms:
        status === "sealed" ? now : decision.sealed_at_ms,
      burned_at_ms:
        status === "burned" ? now : decision.burned_at_ms
    };

    this.removeFromIndexes(updated.decision_id);
    this.storeDecision(updated);

    this.state = {
      ...this.state,
      status,
      last_type: updated.type,
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    if (status === "dispatched") this.state.dispatched_count += 1;
    if (status === "deferred") this.state.deferred_count += 1;
    if (status === "ignored") this.state.ignored_count += 1;
    if (status === "sealed") this.state.sealed_count += 1;
    if (status === "burned") this.state.burned_count += 1;

    return this.result(undefined, updated);
  }

  private storeDecision(decision: DispatchDecision): void {
    this.decisions.set(decision.decision_id, cloneDecision(decision));

    if (decision.status === "dispatched") {
      this.dispatched.set(decision.decision_id, cloneDecision(decision));
    }

    if (decision.status === "deferred") {
      this.deferred.set(decision.decision_id, cloneDecision(decision));
    }

    if (decision.status === "ignored") {
      this.ignored.set(decision.decision_id, cloneDecision(decision));
    }

    if (this.decisions.size > 500) {
      const old = this.getDecisions().slice(500);

      for (const decisionRecord of old) {
        this.decisions.delete(decisionRecord.decision_id);
        this.removeFromIndexes(decisionRecord.decision_id);
      }
    }
  }

  private removeFromIndexes(decisionId: string): void {
    this.dispatched.delete(decisionId);
    this.deferred.delete(decisionId);
    this.ignored.delete(decisionId);
  }

  private result(
    error?: string,
    decision?: DispatchDecision
  ): DispatchRouterResult {
    return {
      ok: !error,
      state: this.getState(),
      decision: decision ? cloneDecision(decision) : undefined,
      decisions: this.getDecisions(),
      dispatched: this.getDispatched(),
      deferred: this.getDeferred(),
      ignored: this.getIgnored(),
      error
    };
  }
}

export const CyberCrowdPingRecallDispatchRouter =
  new PingRecallDispatchRouter();

function statusFromType(type: DispatchType): DispatchStatus {
  if (type === "ignore" || type === "decay") {
    return "ignored";
  }

  if (type === "interruption") {
    return "deferred";
  }

  return "dispatched";
}

function reasonFromType(
  type: DispatchType,
  strength: number,
  params: DispatchDecisionParams
): DispatchReason {
  const highTierStrength = cleanStrength(params.high_tier_strength ?? 0.85);

  if (type === "high_tier") return "high-strength";
  if (type === "actor_notice") return "actor-visible";
  if (type === "calendar") return "time-based";
  if (type === "arena_pulse") return "arena-route";
  if (type === "interruption") return "focus-protected";
  if (type === "manual_review") return "manual-review";
  if (type === "decay") return "decay";
  if (type === "ignore") return "low-strength";

  if (strength >= highTierStrength) {
    return "high-strength";
  }

  return "fired-recall";
}

function targetLaneIdFor(
  type: DispatchType,
  actorId: string,
  context: RecallDispatchContext
): string | null {
  if (type === "actor_notice") return `actor:${actorId}:notice`;
  if (type === "calendar") return `actor:${actorId}:calendar`;
  if (type === "high_tier") return `actor:${actorId}:high-tier`;
  if (type === "arena_pulse") return `arena:${context.kind}`;
  if (type === "interruption") return `actor:${actorId}:interruption`;
  if (type === "manual_review") return `actor:${actorId}:manual-review`;
  if (type === "silent") return `actor:${actorId}:silent-recall`;

  return null;
}

function targetLaneKindFor(type: DispatchType): string | null {
  if (type === "actor_notice") return "actor_notice";
  if (type === "calendar") return "calendar";
  if (type === "high_tier") return "high_tier";
  if (type === "arena_pulse") return "arena_pulse";
  if (type === "interruption") return "interruption";
  if (type === "manual_review") return "manual_review";
  if (type === "silent") return "silent";

  return null;
}

function hasWeakRoute(context: RecallDispatchContext): boolean {
  const hasLabel = Boolean(cleanText(context?.label, 240));
  const hasTags = normList(context?.tags).length > 0;
  const hasValue =
    typeof context?.value === "number" &&
    Number.isFinite(context.value);

  return !(hasLabel || hasTags || hasValue);
}

function canMove(from: DispatchStatus, to: DispatchStatus): boolean {
  if (from === "burned") return false;

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) return true;

  if (
    from === "pending" ||
    from === "dispatched" ||
    from === "deferred" ||
    from === "ignored"
  ) {
    return (
      to === "dispatched" ||
      to === "deferred" ||
      to === "ignored" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function cleanRouterStatus(value: unknown): DispatchRouterState["status"] {
  if (
    value === "idle" ||
    value === "pending" ||
    value === "dispatched" ||
    value === "deferred" ||
    value === "ignored" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "idle";
}

function cleanNullableDispatchType(value: unknown): DispatchType | null {
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

function cleanReason(value: unknown): DispatchReason {
  if (
    value === "fired-recall" ||
    value === "high-strength" ||
    value === "time-based" ||
    value === "actor-visible" ||
    value === "arena-route" ||
    value === "focus-protected" ||
    value === "manual-review" ||
    value === "decay" ||
    value === "low-strength" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanKind(value: unknown): RecallKind {
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

function compareDecisions(
  a: DispatchDecision,
  b: DispatchDecision
): number {
  const strengthDelta = b.strength - a.strength;

  if (strengthDelta !== 0) {
    return strengthDelta;
  }

  return b.created_at_ms - a.created_at_ms;
}

function cloneDecision(decision: DispatchDecision): DispatchDecision {
  return {
    decision_id: decision.decision_id,

    type: decision.type,
    status: decision.status,
    reason: decision.reason,

    actor_id: decision.actor_id,
    recall_id: decision.recall_id,
    ping_id: decision.ping_id,

    kind: decision.kind,
    label: decision.label,

    strength: decision.strength,

    target_lane_id: decision.target_lane_id ?? null,
    target_lane_kind: decision.target_lane_kind ?? null,

    created_at_ms: decision.created_at_ms,
    updated_at_ms: decision.updated_at_ms,

    dispatched_at_ms: decision.dispatched_at_ms ?? null,
    deferred_at_ms: decision.deferred_at_ms ?? null,
    ignored_at_ms: decision.ignored_at_ms ?? null,
    sealed_at_ms: decision.sealed_at_ms ?? null,
    burned_at_ms: decision.burned_at_ms ?? null,

    context: cloneContext(decision.context),

    data: publicDataOnly(decision.data)
  };
}

function cloneContext(context: RecallDispatchContext): RecallDispatchContext {
  const cloned: RecallDispatchContext = {
    actor_id: cleanId(context.actor_id),
    recall_id: cleanId(context.recall_id),
    ping_id: cleanId(context.ping_id),
    kind: cleanKind(context.kind),
    label: cleanText(context.label, 240),
    data: publicDataOnly(context.data ?? {})
  };

  const strength = cleanOptionalStrength(context.strength);
  if (strength != null) {
    cloned.strength = strength;
  }

  const itemLabel = cleanText(context.item_label, 240);
  if (itemLabel) {
    cloned.item_label = itemLabel;
  }

  const tags = normList(context.tags);
  if (tags.length) {
    cloned.tags = tags;
  }

  const value = cleanOptionalNumber(context.value);
  if (value != null) {
    cloned.value = value;
  }

  const placeId = cleanId(context.place_id);
  if (placeId) {
    cloned.place_id = placeId;
  }

  const placeLabel = cleanText(context.place_label, 240);
  if (placeLabel) {
    cloned.place_label = placeLabel;
  }

  const timeMs = cleanOptionalTimestamp(context.time_ms);
  if (timeMs != null) {
    cloned.time_ms = timeMs;
  }

  const sourceRefId = cleanNullableId(context.source_ref_id ?? null);
  if (sourceRefId) {
    cloned.source_ref_id = sourceRefId;
  }

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

function norm(str: string): string {
  return str.trim().toLowerCase();
}

function normList(list: string[] | undefined): string[] {
  return list ? list.map(norm).filter((s) => s.length > 0) : [];
}

function cleanStrength(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, Math.min(1, value));
  }

  return 1;
}

function cleanOptionalStrength(value: unknown): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, Math.min(1, value));
  }

  return undefined;
}

function cleanOptionalNumber(value: unknown): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return undefined;
}

function cleanOptionalTimestamp(value: unknown): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return undefined;
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
    return Math.floor(value);
  }

  return fallback;
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
