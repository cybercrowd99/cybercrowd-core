// src/cybercrowd-ping-recall-engine.ts
//
// CyberCrowd Ping Recall Engine
//
// ONE JOB:
// Store latent intent pings and fire them when reality collides
// with the stored conditions: label, tag, value, or time.
//
// This is CORE recall physics.
// This is NOT a search engine.
// This is NOT a listing.
// This is NOT a feed.
// This is NOT ads.
// This is NOT ranking.
// This is NOT punishment.
// This is NOT hidden control.
//
// Just neutral pings waiting for collision.
//
// LOCKED RULE:
// If the ping requires a condition, reality must provide that condition.
// Missing required reality = no collision.

export type PingKind =
  | "item"
  | "food"
  | "service"
  | "place"
  | "event"
  | "other";

export type PingStatus =
  | "active"
  | "fired"
  | "expired"
  | "disabled"
  | "sealed"
  | "burned";

export interface PingIntent {
  ping_id: string;
  actor_id: string;

  kind: PingKind;
  label: string;
  note: string | null;

  tags: string[];
  min_value: number | null;
  expires_at_ms: number | null;

  one_shot: boolean;
  cooldown_ms: number | null;
  last_fired_at_ms: number | null;

  status: PingStatus;

  created_at_ms: number;
  updated_at_ms: number;

  data: Record<string, unknown>;
}

export interface CreatePingIntentRequest {
  actor_id: string;

  kind: PingKind;
  label: string;
  note?: string | null;

  tags?: string[];
  min_value?: number | null;
  expires_at_ms?: number | null;

  one_shot?: boolean;
  cooldown_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface CollisionContext {
  actor_id: string;

  kind?: PingKind;

  item_label?: string;
  tags?: string[];
  value?: number;

  place_id?: string;
  place_label?: string;

  time_ms?: number;

  source_ref_id?: string | null;

  data?: Record<string, unknown>;
}

export interface PingRecallEvent {
  recall_id: string;
  ping_id: string;
  actor_id: string;

  kind: PingKind;
  label: string;

  context: CollisionContext;

  created_at_ms: number;
}

export interface PingRecallSnapshot {
  intents: PingIntent[];
  events: PingRecallEvent[];
  active: PingIntent[];
  fired: PingIntent[];
  expired: PingIntent[];
  disabled: PingIntent[];
  stable: boolean;
}

export class PingRecallEngine {
  private intents = new Map<string, PingIntent>();
  private events: PingRecallEvent[] = [];

  /**
   * Create a latent intent ping.
   */
  createIntent(request: CreatePingIntentRequest): PingIntent {
    const actorId = cleanId(request?.actor_id);
    const label = cleanText(request?.label, 240);
    const kind = cleanKind(request?.kind);

    if (!actorId) {
      throw new Error("ACTOR_ID_REQUIRED");
    }

    if (!label) {
      throw new Error("PING_LABEL_REQUIRED");
    }

    const now = Date.now();

    const ping: PingIntent = {
      ping_id: makeId("ping-intent"),
      actor_id: actorId,

      kind,
      label,
      note: cleanNullableText(request?.note ?? null, 1000),

      tags: normList(request?.tags),
      min_value: cleanNullableNumber(request?.min_value ?? null),
      expires_at_ms: cleanNullableTimestamp(request?.expires_at_ms ?? null),

      one_shot: request?.one_shot === true,
      cooldown_ms: cleanNullablePositiveNumber(request?.cooldown_ms ?? null),
      last_fired_at_ms: null,

      status: "active",

      created_at_ms: now,
      updated_at_ms: now,

      data: publicDataOnly(request?.data ?? {})
    };

    this.intents.set(ping.ping_id, cloneIntent(ping));

    return cloneIntent(ping);
  }

  /**
   * Reality collision:
   * “you walked by E45Z”
   * “egg rolls are here”
   * “plumber tag appeared”
   * “value crossed 300”
   */
  collide(context: CollisionContext): PingRecallEvent[] {
    const actorId = cleanId(context?.actor_id);

    if (!actorId) {
      return [];
    }

    const now = cleanTimestamp(context?.time_ms ?? null, Date.now());
    const events: PingRecallEvent[] = [];

    for (const ping of this.intents.values()) {
      const checked = this.refreshExpiry(ping, now);

      if (checked.actor_id !== actorId) continue;
      if (checked.status !== "active") continue;
      if (!this.cooldownReady(checked, now)) continue;
      if (!this.matches(checked, context)) continue;

      const event: PingRecallEvent = {
        recall_id: makeId("ping-recall"),
        ping_id: checked.ping_id,
        actor_id: checked.actor_id,

        kind: checked.kind,
        label: checked.label,

        context: cloneContext(context),

        created_at_ms: now
      };

      events.push(cloneEvent(event));
      this.events.push(cloneEvent(event));

      const updated: PingIntent = {
        ...cloneIntent(checked),
        status: checked.one_shot ? "fired" : "active",
        last_fired_at_ms: now,
        updated_at_ms: now
      };

      this.intents.set(updated.ping_id, cloneIntent(updated));
    }

    this.events = this.events.slice(-500);

    return events;
  }

  /**
   * Read one intent.
   */
  getIntent(ping_id: string): PingIntent | null {
    const ping = this.intents.get(cleanId(ping_id));
    return ping ? cloneIntent(ping) : null;
  }

  /**
   * List all intents for one actor.
   */
  listIntentsForActor(actor_id: string): PingIntent[] {
    const actorId = cleanId(actor_id);

    return Array.from(this.intents.values())
      .filter((ping) => ping.actor_id === actorId)
      .map(cloneIntent)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  /**
   * List active intents for one actor.
   */
  listActiveForActor(actor_id: string): PingIntent[] {
    const actorId = cleanId(actor_id);
    const now = Date.now();

    return Array.from(this.intents.values())
      .map((ping) => this.refreshExpiry(ping, now))
      .filter((ping) => ping.actor_id === actorId && ping.status === "active")
      .map(cloneIntent)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  /**
   * Disable an intent without deleting it.
   */
  disable(ping_id: string): PingIntent | null {
    const pingId = cleanId(ping_id);
    const ping = this.intents.get(pingId);

    if (!ping) return null;

    const updated: PingIntent = {
      ...cloneIntent(ping),
      status: "disabled",
      updated_at_ms: Date.now()
    };

    this.intents.set(pingId, cloneIntent(updated));

    return cloneIntent(updated);
  }

  /**
   * Seal an intent without deleting it.
   */
  seal(ping_id: string): PingIntent | null {
    const pingId = cleanId(ping_id);
    const ping = this.intents.get(pingId);

    if (!ping) return null;

    const updated: PingIntent = {
      ...cloneIntent(ping),
      status: "sealed",
      updated_at_ms: Date.now()
    };

    this.intents.set(pingId, cloneIntent(updated));

    return cloneIntent(updated);
  }

  /**
   * Burn an intent from live memory.
   */
  burn(ping_id: string): PingIntent | null {
    const pingId = cleanId(ping_id);
    const ping = this.intents.get(pingId);

    if (!ping) return null;

    const burned: PingIntent = {
      ...cloneIntent(ping),
      status: "burned",
      updated_at_ms: Date.now()
    };

    this.intents.delete(pingId);

    return cloneIntent(burned);
  }

  /**
   * Read recall events.
   */
  listEvents(): PingRecallEvent[] {
    return this.events
      .map(cloneEvent)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  /**
   * Read full engine snapshot.
   */
  snapshot(): PingRecallSnapshot {
    const now = Date.now();

    const intents = Array.from(this.intents.values())
      .map((ping) => this.refreshExpiry(ping, now))
      .map(cloneIntent)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);

    return {
      intents,
      events: this.listEvents(),
      active: intents.filter((ping) => ping.status === "active"),
      fired: intents.filter((ping) => ping.status === "fired"),
      expired: intents.filter((ping) => ping.status === "expired"),
      disabled: intents.filter((ping) => ping.status === "disabled"),
      stable: true
    };
  }

  /**
   * Reset all live memory.
   */
  reset(): void {
    this.intents.clear();
    this.events = [];
  }

  private refreshExpiry(ping: PingIntent, at_ms: number): PingIntent {
    if (
      ping.status === "active" &&
      ping.expires_at_ms != null &&
      ping.expires_at_ms < at_ms
    ) {
      const expired: PingIntent = {
        ...cloneIntent(ping),
        status: "expired",
        updated_at_ms: at_ms
      };

      this.intents.set(expired.ping_id, cloneIntent(expired));

      return expired;
    }

    return cloneIntent(ping);
  }

  private cooldownReady(ping: PingIntent, at_ms: number): boolean {
    if (ping.cooldown_ms == null) return true;
    if (ping.last_fired_at_ms == null) return true;

    return at_ms - ping.last_fired_at_ms >= ping.cooldown_ms;
  }

  private matches(ping: PingIntent, ctx: CollisionContext): boolean {
    // LABEL (required → must exist)
    if (ping.label) {
      if (!ctx.item_label) return false;

      const a = norm(ping.label);
      const b = norm(ctx.item_label);

      if (!b.includes(a) && !a.includes(b)) {
        return false;
      }
    }

    // TAGS (required → must exist)
    const pingTags = normList(ping.tags);
    const ctxTags = normList(ctx.tags);

    if (pingTags.length) {
      if (!ctxTags.length) return false;

      const ctxSet = new Set(ctxTags);
      const hit = pingTags.some((tag) => ctxSet.has(tag));

      if (!hit) return false;
    }

    // VALUE (required → must exist)
    if (ping.min_value != null) {
      if (ctx.value == null) return false;
      if (ctx.value < ping.min_value) return false;
    }

    return true;
  }
}

export const CyberCrowdPingRecallEngine =
  new PingRecallEngine();

function norm(str: string): string {
  return str.trim().toLowerCase();
}

function normList(list: string[] | undefined): string[] {
  return list ? list.map(norm).filter((s) => s.length > 0) : [];
}

function cleanKind(value: unknown): PingKind {
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

function cloneIntent(ping: PingIntent): PingIntent {
  return {
    ping_id: ping.ping_id,
    actor_id: ping.actor_id,

    kind: ping.kind,
    label: ping.label,
    note: ping.note ?? null,

    tags: normList(ping.tags),
    min_value: ping.min_value ?? null,
    expires_at_ms: ping.expires_at_ms ?? null,

    one_shot: ping.one_shot,
    cooldown_ms: ping.cooldown_ms ?? null,
    last_fired_at_ms: ping.last_fired_at_ms ?? null,

    status: ping.status,

    created_at_ms: ping.created_at_ms,
    updated_at_ms: ping.updated_at_ms,

    data: publicDataOnly(ping.data)
  };
}

function cloneContext(ctx: CollisionContext): CollisionContext {
  const cloned: CollisionContext = {
    actor_id: cleanId(ctx.actor_id),
    data: publicDataOnly(ctx.data ?? {})
  };

  if (ctx.kind) {
    cloned.kind = cleanKind(ctx.kind);
  }

  const itemLabel = cleanText(ctx.item_label, 240);
  if (itemLabel) {
    cloned.item_label = itemLabel;
  }

  const tags = normList(ctx.tags);
  if (tags.length) {
    cloned.tags = tags;
  }

  const value = cleanNullableNumber(ctx.value ?? null);
  if (value != null) {
    cloned.value = value;
  }

  const placeId = cleanId(ctx.place_id);
  if (placeId) {
    cloned.place_id = placeId;
  }

  const placeLabel = cleanText(ctx.place_label, 240);
  if (placeLabel) {
    cloned.place_label = placeLabel;
  }

  const timeMs = cleanNullableTimestamp(ctx.time_ms ?? null);
  if (timeMs != null) {
    cloned.time_ms = timeMs;
  }

  const sourceRefId = cleanNullableId(ctx.source_ref_id ?? null);
  if (sourceRefId) {
    cloned.source_ref_id = sourceRefId;
  }

  return cloned;
}

function cloneEvent(event: PingRecallEvent): PingRecallEvent {
  return {
    recall_id: event.recall_id,
    ping_id: event.ping_id,
    actor_id: event.actor_id,

    kind: event.kind,
    label: event.label,

    context: cloneContext(event.context),

    created_at_ms: event.created_at_ms
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

function cleanNullableNumber(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return null;
}

function cleanNullablePositiveNumber(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
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

function cleanNullableText(
  value: unknown,
  maxLength: number
): string | null {
  const text = cleanText(value, maxLength);
  return text || null;
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
