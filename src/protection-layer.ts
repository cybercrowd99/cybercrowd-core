// src/protection-layer.ts
// CyberCrowd Protection Layer — Firewall Organ
//
// Sits in front of organs:
// allocator, arena, presence, collapse, adworm, cursor, and future service organs.
//
// Purpose:
// - No elevation.
// - No hidden authority.
// - No caller bypass.
// - No organ driven outside its safe moment.
// - Pure mechanical gating + request masking.
//
// This is not auth.
// This is not presence.
// This is not collapse.
// This is not allocator authority.
// This is the firewall organ in front of them.

export type CallerType = "human" | "service" | "device" | "lane_agent";

export type AuthorityLane =
  | "public"
  | "tenant"
  | "operator"
  | "collapse-only";

export type ProtectionDenyReason =
  | "organ-unknown"
  | "action-unknown"
  | "caller-denied"
  | "lane-denied"
  | "missing-tenant"
  | "missing-moment"
  | "rate-limit"
  | "concurrent-limit"
  | "invalid-context";

export interface ProtectionContext {
  caller_type: CallerType;
  tenant_id: string | null;
  authority_lane: AuthorityLane;
  moment_id: string;
  surface_id: string;
  ip_hash: string;
  device_fingerprint?: string;
}

export interface ProtectionRule {
  organ: string;
  action: string;
  allowed_callers: CallerType[];
  allowed_lanes: AuthorityLane[];
  max_rate_per_minute: number;
  max_concurrent_per_tenant?: number;
  requires_tenant: boolean;
  requires_moment: boolean;
}

export interface ProtectionDecision {
  ok: boolean;
  reason?: ProtectionDenyReason;
  masked_request?: Record<string, unknown>;
}

export interface ProtectionRateState {
  increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; allowed: boolean }>;

  currentConcurrent(
    tenant_id: string,
    organ: string,
    action: string
  ): Promise<number>;
}

export interface ProtectionLayerOptions {
  rules: ProtectionRule[];
  rateState: ProtectionRateState;
}

export class ProtectionLayer {
  private readonly rulesByKey: Map<string, ProtectionRule>;
  private readonly knownOrgans: Set<string>;
  private readonly rateState: ProtectionRateState;

  constructor(options: ProtectionLayerOptions) {
    if (!options || !Array.isArray(options.rules)) {
      throw new Error("PROTECTION_RULES_REQUIRED");
    }

    if (!options.rateState) {
      throw new Error("PROTECTION_RATE_STATE_REQUIRED");
    }

    this.rulesByKey = new Map();
    this.knownOrgans = new Set();
    this.rateState = options.rateState;

    for (const rule of options.rules) {
      const cleanRule = normalizeRule(rule);

      if (!cleanRule) {
        continue;
      }

      const key = this.makeKey(cleanRule.organ, cleanRule.action);

      this.rulesByKey.set(key, cleanRule);
      this.knownOrgans.add(cleanRule.organ);
    }
  }

  async protect(
    organ: string,
    action: string,
    ctx: ProtectionContext,
    request: unknown
  ): Promise<ProtectionDecision> {
    const cleanOrgan = cleanId(organ);
    const cleanAction = cleanId(action);

    if (!cleanOrgan || !cleanAction || !isValidContext(ctx)) {
      return {
        ok: false,
        reason: "invalid-context"
      };
    }

    if (!this.knownOrgans.has(cleanOrgan)) {
      return {
        ok: false,
        reason: "organ-unknown"
      };
    }

    const key = this.makeKey(cleanOrgan, cleanAction);
    const rule = this.rulesByKey.get(key);

    if (!rule) {
      return {
        ok: false,
        reason: "action-unknown"
      };
    }

    if (!rule.allowed_callers.includes(ctx.caller_type)) {
      return {
        ok: false,
        reason: "caller-denied"
      };
    }

    if (!rule.allowed_lanes.includes(ctx.authority_lane)) {
      return {
        ok: false,
        reason: "lane-denied"
      };
    }

    if (rule.requires_tenant && !cleanNullableId(ctx.tenant_id)) {
      return {
        ok: false,
        reason: "missing-tenant"
      };
    }

    if (rule.requires_moment && !cleanId(ctx.moment_id)) {
      return {
        ok: false,
        reason: "missing-moment"
      };
    }

    const rateKey = this.makeRateKey(cleanOrgan, cleanAction, ctx);
    const rate = await this.rateState.increment(rateKey, 60_000);

    if (!rate.allowed || rate.count > rule.max_rate_per_minute) {
      return {
        ok: false,
        reason: "rate-limit"
      };
    }

    if (
      typeof rule.max_concurrent_per_tenant === "number" &&
      rule.max_concurrent_per_tenant >= 0 &&
      ctx.tenant_id
    ) {
      const concurrent = await this.rateState.currentConcurrent(
        ctx.tenant_id,
        cleanOrgan,
        cleanAction
      );

      if (concurrent >= rule.max_concurrent_per_tenant) {
        return {
          ok: false,
          reason: "concurrent-limit"
        };
      }
    }

    return {
      ok: true,
      masked_request: this.maskRequest(cleanOrgan, cleanAction, request)
    };
  }

  private makeKey(organ: string, action: string): string {
    return `${organ}:${action}`;
  }

  private makeRateKey(
    organ: string,
    action: string,
    ctx: ProtectionContext
  ): string {
    const tenant = cleanNullableId(ctx.tenant_id) ?? "no-tenant";
    const lane = ctx.authority_lane;
    const ip = cleanId(ctx.ip_hash) || "no-ip";
    const surface = cleanId(ctx.surface_id) || "no-surface";

    return `${organ}:${action}:${tenant}:${lane}:${surface}:${ip}`;
  }

  private maskRequest(
    organ: string,
    action: string,
    request: unknown
  ): Record<string, unknown> {
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      return {};
    }

    const clone = { ...(request as Record<string, unknown>) };

    if (organ === "allocator") {
      return pick(clone, ["action", "tenant_id", "tenantId", "lease_id", "leaseId", "port"]);
    }

    if (organ === "arena") {
      return pick(clone, ["tenant_id", "tenantId", "lease_id", "leaseId", "port", "service_id"]);
    }

    if (organ === "presence") {
      return pick(clone, [
        "tenant_id",
        "session_id",
        "lane_id",
        "presence_token",
        "moment_id",
        "surface_id"
      ]);
    }

    if (organ === "collapse") {
      return pick(clone, [
        "tenant_id",
        "session_id",
        "lane_id",
        "collapse_token",
        "collapse_intent",
        "moment_id",
        "surface_id"
      ]);
    }

    if (organ === "adworm") {
      delete clone["email"];
      delete clone["user_id"];
      delete clone["identity"];
      delete clone["presence_token"];
      delete clone["collapse_token"];
      return clone;
    }

    delete clone["identity"];
    delete clone["presence_token"];
    delete clone["collapse_token"];

    return clone;
  }
}

export class InMemoryRateState implements ProtectionRateState {
  private readonly counts = new Map<string, { count: number; resetAt: number }>();
  private readonly concurrent = new Map<string, number>();

  async increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; allowed: boolean }> {
    const cleanKey = cleanId(key);

    if (!cleanKey || !Number.isInteger(windowMs) || windowMs <= 0) {
      return {
        count: 0,
        allowed: false
      };
    }

    const now = Date.now();
    const existing = this.counts.get(cleanKey);

    if (!existing || existing.resetAt <= now) {
      this.counts.set(cleanKey, {
        count: 1,
        resetAt: now + windowMs
      });

      return {
        count: 1,
        allowed: true
      };
    }

    existing.count += 1;

    return {
      count: existing.count,
      allowed: true
    };
  }

  async currentConcurrent(
    tenant_id: string,
    organ: string,
    action: string
  ): Promise<number> {
    const key = this.makeConcurrentKey(tenant_id, organ, action);
    return this.concurrent.get(key) ?? 0;
  }

  startConcurrent(tenant_id: string, organ: string, action: string): void {
    const key = this.makeConcurrentKey(tenant_id, organ, action);
    const current = this.concurrent.get(key) ?? 0;

    this.concurrent.set(key, current + 1);
  }

  endConcurrent(tenant_id: string, organ: string, action: string): void {
    const key = this.makeConcurrentKey(tenant_id, organ, action);
    const current = this.concurrent.get(key) ?? 0;

    this.concurrent.set(key, Math.max(0, current - 1));
  }

  reset(): void {
    this.counts.clear();
    this.concurrent.clear();
  }

  private makeConcurrentKey(
    tenant_id: string,
    organ: string,
    action: string
  ): string {
    return `${cleanId(tenant_id)}:${cleanId(organ)}:${cleanId(action)}`;
  }
}

export const DEFAULT_PROTECTION_RULES: ProtectionRule[] = [
  {
    organ: "allocator",
    action: "allocate",
    allowed_callers: ["service", "device", "lane_agent"],
    allowed_lanes: ["tenant", "operator"],
    max_rate_per_minute: 120,
    max_concurrent_per_tenant: 64,
    requires_tenant: true,
    requires_moment: true
  },
  {
    organ: "allocator",
    action: "heartbeat",
    allowed_callers: ["service", "device", "lane_agent"],
    allowed_lanes: ["tenant", "operator"],
    max_rate_per_minute: 600,
    requires_tenant: true,
    requires_moment: true
  },
  {
    organ: "allocator",
    action: "release",
    allowed_callers: ["service", "device", "lane_agent"],
    allowed_lanes: ["tenant", "operator"],
    max_rate_per_minute: 240,
    requires_tenant: true,
    requires_moment: true
  },
  {
    organ: "allocator",
    action: "reclaim",
    allowed_callers: ["service", "lane_agent"],
    allowed_lanes: ["operator"],
    max_rate_per_minute: 30,
    requires_tenant: false,
    requires_moment: true
  },
  {
    organ: "presence",
    action: "validate",
    allowed_callers: ["human", "device", "lane_agent"],
    allowed_lanes: ["tenant", "operator"],
    max_rate_per_minute: 300,
    requires_tenant: true,
    requires_moment: true
  },
  {
    organ: "collapse",
    action: "record",
    allowed_callers: ["human"],
    allowed_lanes: ["collapse-only"],
    max_rate_per_minute: 3,
    requires_tenant: true,
    requires_moment: true
  }
];

function normalizeRule(rule: ProtectionRule): ProtectionRule | null {
  if (!rule || typeof rule !== "object") {
    return null;
  }

  const organ = cleanId(rule.organ);
  const action = cleanId(rule.action);

  if (!organ || !action) {
    return null;
  }

  const allowed_callers = Array.isArray(rule.allowed_callers)
    ? rule.allowed_callers.filter(isCallerType)
    : [];

  const allowed_lanes = Array.isArray(rule.allowed_lanes)
    ? rule.allowed_lanes.filter(isAuthorityLane)
    : [];

  const max_rate_per_minute = Number(rule.max_rate_per_minute);

  if (allowed_callers.length === 0) {
    return null;
  }

  if (allowed_lanes.length === 0) {
    return null;
  }

  if (!Number.isInteger(max_rate_per_minute) || max_rate_per_minute <= 0) {
    return null;
  }

  return {
    organ,
    action,
    allowed_callers,
    allowed_lanes,
    max_rate_per_minute,
    max_concurrent_per_tenant:
      typeof rule.max_concurrent_per_tenant === "number"
        ? rule.max_concurrent_per_tenant
        : undefined,
    requires_tenant: Boolean(rule.requires_tenant),
    requires_moment: Boolean(rule.requires_moment)
  };
}

function isValidContext(ctx: ProtectionContext): boolean {
  if (!ctx || typeof ctx !== "object") {
    return false;
  }

  if (!isCallerType(ctx.caller_type)) {
    return false;
  }

  if (!isAuthorityLane(ctx.authority_lane)) {
    return false;
  }

  if (!cleanId(ctx.moment_id)) {
    return false;
  }

  if (!cleanId(ctx.surface_id)) {
    return false;
  }

  if (!cleanId(ctx.ip_hash)) {
    return false;
  }

  if (ctx.tenant_id !== null && !cleanNullableId(ctx.tenant_id)) {
    return false;
  }

  return true;
}

function isCallerType(value: unknown): value is CallerType {
  return (
    value === "human" ||
    value === "service" ||
    value === "device" ||
    value === "lane_agent"
  );
}

function isAuthorityLane(value: unknown): value is AuthorityLane {
  return (
    value === "public" ||
    value === "tenant" ||
    value === "operator" ||
    value === "collapse-only"
  );
}

function pick(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      output[key] = source[key];
    }
  }

  return output;
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
