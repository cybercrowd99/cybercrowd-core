// src/cybercrowd-case-health.ts
//
// CyberCrowd Case Health
//
// ONE JOB:
// Check whether a CyberCrowd case surface is stable, overloaded, stalled,
// broken, or ready for analysis.
//
// This is CASE HEALTH.
// This is a top-level CyberCrowd surface logic.
// This is NOT a folder.
// This is NOT src/cybercrowd-case/case-health.ts.
// This is NOT src/cybercrowd/case/case-health.ts.
// This is NOT src/cybercrowd/case-health.ts.
// This is NOT punishment.
// This is NOT hidden control.
// This is NOT ranking.
// This is NOT a feed.
// This is NOT court authority.
// This is NOT enforcement.
// This is NOT surveillance.
// This is NOT parenting.
// This is NOT algorithmic judgment.
//
// LOCKED PATH:
// src/cybercrowd-case-health.ts
//
// LOCKED RULE:
// Case Health checks the condition.
// It does not judge.
// It does not punish.
// It does not enforce.
// It only reports whether the case can keep moving.
//
// CASE SURFACE STACK:
// CyberCrowd Case opens and owns the case.
// Case Health checks case stability.
// Case Analysis reads what the case means.
// Case Exit closes, routes, releases, seals, or escalates the case.

import type {
  CasePriority,
  CaseRecord,
  CaseStatus
} from "./cybercrowd-case";

export type CaseHealthStatus =
  | "stable"
  | "watch"
  | "overloaded"
  | "stalled"
  | "broken"
  | "ready_for_analysis"
  | "ready_for_exit"
  | "sealed"
  | "burned"
  | "unknown";

export type CaseHealthReason =
  | "case-open"
  | "case-held"
  | "case-active"
  | "case-stalled"
  | "case-resolved"
  | "case-released"
  | "case-sealed"
  | "case-burned"
  | "missing-case"
  | "missing-owner"
  | "missing-title"
  | "missing-timing"
  | "too-many-tags"
  | "age-pressure"
  | "critical-priority"
  | "overload-pressure"
  | "ready-for-analysis"
  | "ready-for-exit"
  | "unknown";

export type CaseHealthPressure =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface CaseHealthInput {
  case: CaseRecord | null;

  now_ms?: number;
  max_open_age_ms?: number;
  max_stalled_age_ms?: number;
  max_tags?: number;
  overload_score?: number | null;

  data?: Record<string, unknown>;
}

export interface CaseHealthRecord {
  health_id: string;

  case_id: string | null;
  case_status: CaseStatus | null;
  case_priority: CasePriority | null;

  status: CaseHealthStatus;
  reason: CaseHealthReason;
  pressure: CaseHealthPressure;

  stable: boolean;
  overloaded: boolean;
  stalled: boolean;
  broken: boolean;
  ready_for_analysis: boolean;
  ready_for_exit: boolean;

  age_ms: number | null;
  open_age_ms: number | null;
  stalled_age_ms: number | null;
  overload_score: number;

  checked_at_ms: number;
  source_updated_at_ms: number | null;

  notes: string[];

  data: Record<string, unknown>;
}

export interface CaseHealthState {
  status: CaseHealthStatus | "idle";
  stable_count: number;
  watch_count: number;
  overloaded_count: number;
  stalled_count: number;
  broken_count: number;
  ready_for_analysis_count: number;
  ready_for_exit_count: number;
  sealed_count: number;
  burned_count: number;
  last_case_id: string | null;
  last_reason: CaseHealthReason;
  last_updated_at_ms: number;
}

export interface CaseHealthResult {
  ok: boolean;
  state: CaseHealthState;
  health?: CaseHealthRecord;
  records: CaseHealthRecord[];
  stable: CaseHealthRecord[];
  watch: CaseHealthRecord[];
  blocked: CaseHealthRecord[];
  error?: string;
}

export interface CaseHealthSnapshot {
  state: CaseHealthState;
  records: CaseHealthRecord[];
  stable: CaseHealthRecord[];
  watch: CaseHealthRecord[];
  blocked: CaseHealthRecord[];
  ready_for_analysis: CaseHealthRecord[];
  ready_for_exit: CaseHealthRecord[];
  stable_surface: boolean;
}

export class CyberCrowdCaseHealth {
  private records = new Map<string, CaseHealthRecord>();
  private stableRecords = new Map<string, CaseHealthRecord>();
  private watchRecords = new Map<string, CaseHealthRecord>();
  private blockedRecords = new Map<string, CaseHealthRecord>();

  private state: CaseHealthState = {
    status: "idle",
    stable_count: 0,
    watch_count: 0,
    overloaded_count: 0,
    stalled_count: 0,
    broken_count: 0,
    ready_for_analysis_count: 0,
    ready_for_exit_count: 0,
    sealed_count: 0,
    burned_count: 0,
    last_case_id: null,
    last_reason: "unknown",
    last_updated_at_ms: Date.now()
  };

  /**
   * Check one CyberCrowd case surface.
   */
  check(input: CaseHealthInput): CaseHealthResult {
    const caseRecord = input?.case ?? null;
    const now = cleanTimestamp(input?.now_ms, Date.now());

    const health = buildHealthRecord({
      caseRecord,
      now,
      maxOpenAgeMs: cleanPositiveNumber(input?.max_open_age_ms, 86400000),
      maxStalledAgeMs: cleanPositiveNumber(input?.max_stalled_age_ms, 21600000),
      maxTags: cleanPositiveNumber(input?.max_tags, 20),
      overloadScore: cleanScore(input?.overload_score ?? 0),
      data: publicDataOnly(input?.data ?? {})
    });

    this.storeHealth(health);
    this.recount(health);

    return this.result(undefined, health);
  }

  /**
   * Check many CyberCrowd case surfaces.
   */
  checkBatch(inputs: CaseHealthInput[]): CaseHealthResult {
    if (!Array.isArray(inputs)) {
      return this.result("CASE_HEALTH_INPUTS_REQUIRED");
    }

    let last: CaseHealthRecord | undefined;

    for (const input of inputs) {
      const result = this.check(input);

      if (result.health) {
        last = result.health;
      }
    }

    return this.result(undefined, last);
  }

  /**
   * Read one health record.
   */
  get(health_id: string): CaseHealthRecord | null {
    const health = this.records.get(cleanId(health_id));
    return health ? cloneHealth(health) : null;
  }

  /**
   * Read current health state.
   */
  getState(): CaseHealthState {
    return {
      status: this.state.status,
      stable_count: this.state.stable_count,
      watch_count: this.state.watch_count,
      overloaded_count: this.state.overloaded_count,
      stalled_count: this.state.stalled_count,
      broken_count: this.state.broken_count,
      ready_for_analysis_count: this.state.ready_for_analysis_count,
      ready_for_exit_count: this.state.ready_for_exit_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_case_id: this.state.last_case_id,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getRecords(): CaseHealthRecord[] {
    return Array.from(this.records.values())
      .map(cloneHealth)
      .sort(compareHealthRecords);
  }

  getStable(): CaseHealthRecord[] {
    return Array.from(this.stableRecords.values())
      .map(cloneHealth)
      .sort(compareHealthRecords);
  }

  getWatch(): CaseHealthRecord[] {
    return Array.from(this.watchRecords.values())
      .map(cloneHealth)
      .sort(compareHealthRecords);
  }

  getBlocked(): CaseHealthRecord[] {
    return Array.from(this.blockedRecords.values())
      .map(cloneHealth)
      .sort(compareHealthRecords);
  }

  getReadyForAnalysis(): CaseHealthRecord[] {
    return this.getRecords().filter((record) => record.ready_for_analysis);
  }

  getReadyForExit(): CaseHealthRecord[] {
    return this.getRecords().filter((record) => record.ready_for_exit);
  }

  snapshot(): CaseHealthSnapshot {
    return {
      state: this.getState(),
      records: this.getRecords(),
      stable: this.getStable(),
      watch: this.getWatch(),
      blocked: this.getBlocked(),
      ready_for_analysis: this.getReadyForAnalysis(),
      ready_for_exit: this.getReadyForExit(),
      stable_surface:
        this.state.status === "idle" ||
        this.state.status === "stable" ||
        this.state.status === "ready_for_analysis" ||
        this.state.status === "ready_for_exit"
    };
  }

  reset(): void {
    this.records.clear();
    this.stableRecords.clear();
    this.watchRecords.clear();
    this.blockedRecords.clear();

    this.state = {
      status: "idle",
      stable_count: 0,
      watch_count: 0,
      overloaded_count: 0,
      stalled_count: 0,
      broken_count: 0,
      ready_for_analysis_count: 0,
      ready_for_exit_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_case_id: null,
      last_reason: "unknown",
      last_updated_at_ms: Date.now()
    };
  }

  private storeHealth(health: CaseHealthRecord): void {
    this.records.set(health.health_id, cloneHealth(health));

    if (
      health.status === "stable" ||
      health.status === "ready_for_analysis" ||
      health.status === "ready_for_exit"
    ) {
      this.stableRecords.set(health.health_id, cloneHealth(health));
    }

    if (health.status === "watch" || health.status === "stalled") {
      this.watchRecords.set(health.health_id, cloneHealth(health));
    }

    if (
      health.status === "overloaded" ||
      health.status === "broken" ||
      health.status === "sealed" ||
      health.status === "burned"
    ) {
      this.blockedRecords.set(health.health_id, cloneHealth(health));
    }

    if (this.records.size > 500) {
      const old = this.getRecords().slice(500);

      for (const record of old) {
        this.records.delete(record.health_id);
        this.stableRecords.delete(record.health_id);
        this.watchRecords.delete(record.health_id);
        this.blockedRecords.delete(record.health_id);
      }
    }
  }

  private recount(last: CaseHealthRecord): void {
    const records = Array.from(this.records.values());

    this.state = {
      status: last.status,
      stable_count: records.filter((record) => record.status === "stable").length,
      watch_count: records.filter((record) => record.status === "watch").length,
      overloaded_count:
        records.filter((record) => record.status === "overloaded").length,
      stalled_count: records.filter((record) => record.status === "stalled").length,
      broken_count: records.filter((record) => record.status === "broken").length,
      ready_for_analysis_count:
        records.filter((record) => record.ready_for_analysis).length,
      ready_for_exit_count:
        records.filter((record) => record.ready_for_exit).length,
      sealed_count: records.filter((record) => record.status === "sealed").length,
      burned_count: records.filter((record) => record.status === "burned").length,
      last_case_id: last.case_id,
      last_reason: last.reason,
      last_updated_at_ms: last.checked_at_ms
    };
  }

  private result(
    error?: string,
    health?: CaseHealthRecord
  ): CaseHealthResult {
    return {
      ok: !error,
      state: this.getState(),
      health: health ? cloneHealth(health) : undefined,
      records: this.getRecords(),
      stable: this.getStable(),
      watch: this.getWatch(),
      blocked: this.getBlocked(),
      error
    };
  }
}

export const CyberCrowdCaseHealthSurface =
  new CyberCrowdCaseHealth();

function buildHealthRecord(input: {
  caseRecord: CaseRecord | null;
  now: number;
  maxOpenAgeMs: number;
  maxStalledAgeMs: number;
  maxTags: number;
  overloadScore: number;
  data: Record<string, unknown>;
}): CaseHealthRecord {
  const notes: string[] = [];
  const caseRecord = input.caseRecord;

  if (!caseRecord) {
    return {
      health_id: makeId("case-health"),
      case_id: null,
      case_status: null,
      case_priority: null,
      status: "broken",
      reason: "missing-case",
      pressure: "critical",
      stable: false,
      overloaded: false,
      stalled: false,
      broken: true,
      ready_for_analysis: false,
      ready_for_exit: false,
      age_ms: null,
      open_age_ms: null,
      stalled_age_ms: null,
      overload_score: input.overloadScore,
      checked_at_ms: input.now,
      source_updated_at_ms: null,
      notes: ["case record is missing"],
      data: input.data
    };
  }

  const ageMs = Math.max(0, input.now - caseRecord.created_at_ms);
  const openAgeMs =
    caseRecord.status === "open"
      ? Math.max(0, input.now - caseRecord.opened_at_ms)
      : null;

  const stalledAgeMs =
    caseRecord.status === "stalled" && caseRecord.stalled_at_ms
      ? Math.max(0, input.now - caseRecord.stalled_at_ms)
      : null;

  if (!cleanId(caseRecord.owner_actor_id)) {
    notes.push("owner actor is missing");
  }

  if (!cleanText(caseRecord.title, 180)) {
    notes.push("case title is missing");
  }

  if (!caseRecord.created_at_ms || !caseRecord.updated_at_ms) {
    notes.push("case timing is missing");
  }

  if (caseRecord.tags.length > input.maxTags) {
    notes.push("case has too many tags");
  }

  if (openAgeMs != null && openAgeMs > input.maxOpenAgeMs) {
    notes.push("open case age exceeds health limit");
  }

  if (stalledAgeMs != null && stalledAgeMs > input.maxStalledAgeMs) {
    notes.push("stalled case age exceeds health limit");
  }

  if (input.overloadScore >= 0.85) {
    notes.push("case has critical overload pressure");
  } else if (input.overloadScore >= 0.65) {
    notes.push("case has overload pressure");
  }

  const broken =
    !cleanId(caseRecord.owner_actor_id) ||
    !cleanText(caseRecord.title, 180) ||
    !caseRecord.created_at_ms ||
    !caseRecord.updated_at_ms;

  const sealed = caseRecord.status === "sealed";
  const burned = caseRecord.status === "burned";
  const stalled =
    caseRecord.status === "stalled" ||
    (stalledAgeMs != null && stalledAgeMs > input.maxStalledAgeMs);

  const overloaded =
    input.overloadScore >= 0.65 ||
    (openAgeMs != null && openAgeMs > input.maxOpenAgeMs) ||
    caseRecord.priority === "critical";

  const readyForExit =
    caseRecord.status === "resolved" || caseRecord.status === "released";

  const readyForAnalysis =
    !broken &&
    !sealed &&
    !burned &&
    !overloaded &&
    !stalled &&
    (caseRecord.status === "open" ||
      caseRecord.status === "held" ||
      caseRecord.status === "active");

  const status = decideHealthStatus({
    broken,
    sealed,
    burned,
    stalled,
    overloaded,
    readyForAnalysis,
    readyForExit,
    caseStatus: caseRecord.status
  });

  const reason = decideHealthReason({
    status,
    caseStatus: caseRecord.status,
    priority: caseRecord.priority,
    broken,
    sealed,
    burned,
    stalled,
    overloaded,
    readyForAnalysis,
    readyForExit,
    openAgeMs,
    maxOpenAgeMs: input.maxOpenAgeMs,
    stalledAgeMs,
    maxStalledAgeMs: input.maxStalledAgeMs
  });

  return {
    health_id: makeId("case-health"),

    case_id: caseRecord.case_id,
    case_status: caseRecord.status,
    case_priority: caseRecord.priority,

    status,
    reason,
    pressure: decidePressure(caseRecord.priority, input.overloadScore, status),

    stable:
      status === "stable" ||
      status === "ready_for_analysis" ||
      status === "ready_for_exit",

    overloaded,
    stalled,
    broken,
    ready_for_analysis: readyForAnalysis,
    ready_for_exit: readyForExit,

    age_ms: ageMs,
    open_age_ms: openAgeMs,
    stalled_age_ms: stalledAgeMs,
    overload_score: input.overloadScore,

    checked_at_ms: input.now,
    source_updated_at_ms: caseRecord.updated_at_ms,

    notes,

    data: input.data
  };
}

function decideHealthStatus(input: {
  broken: boolean;
  sealed: boolean;
  burned: boolean;
  stalled: boolean;
  overloaded: boolean;
  readyForAnalysis: boolean;
  readyForExit: boolean;
  caseStatus: CaseStatus;
}): CaseHealthStatus {
  if (input.burned) return "burned";
  if (input.sealed) return "sealed";
  if (input.broken) return "broken";
  if (input.overloaded) return "overloaded";
  if (input.stalled) return "stalled";
  if (input.readyForExit) return "ready_for_exit";
  if (input.readyForAnalysis) return "ready_for_analysis";

  if (input.caseStatus === "held") {
    return "watch";
  }

  return "stable";
}

function decideHealthReason(input: {
  status: CaseHealthStatus;
  caseStatus: CaseStatus;
  priority: CasePriority;
  broken: boolean;
  sealed: boolean;
  burned: boolean;
  stalled: boolean;
  overloaded: boolean;
  readyForAnalysis: boolean;
  readyForExit: boolean;
  openAgeMs: number | null;
  maxOpenAgeMs: number;
  stalledAgeMs: number | null;
  maxStalledAgeMs: number;
}): CaseHealthReason {
  if (input.burned) return "case-burned";
  if (input.sealed) return "case-sealed";
  if (input.broken) return "missing-case";

  if (
    input.stalledAgeMs != null &&
    input.stalledAgeMs > input.maxStalledAgeMs
  ) {
    return "case-stalled";
  }

  if (
    input.openAgeMs != null &&
    input.openAgeMs > input.maxOpenAgeMs
  ) {
    return "age-pressure";
  }

  if (input.priority === "critical") return "critical-priority";
  if (input.overloaded) return "overload-pressure";
  if (input.readyForExit) return "ready-for-exit";
  if (input.readyForAnalysis) return "ready-for-analysis";

  if (input.caseStatus === "open") return "case-open";
  if (input.caseStatus === "held") return "case-held";
  if (input.caseStatus === "active") return "case-active";
  if (input.caseStatus === "stalled") return "case-stalled";
  if (input.caseStatus === "resolved") return "case-resolved";
  if (input.caseStatus === "released") return "case-released";
  if (input.caseStatus === "sealed") return "case-sealed";
  if (input.caseStatus === "burned") return "case-burned";

  return "unknown";
}

function decidePressure(
  priority: CasePriority,
  overloadScore: number,
  status: CaseHealthStatus
): CaseHealthPressure {
  if (status === "broken" || status === "burned") return "critical";
  if (status === "overloaded") return "high";
  if (priority === "critical") return "critical";
  if (overloadScore >= 0.85) return "critical";
  if (overloadScore >= 0.65) return "high";
  if (priority === "high") return "medium";
  if (priority === "normal") return "low";

  return "none";
}

function compareHealthRecords(
  a: CaseHealthRecord,
  b: CaseHealthRecord
): number {
  const pressureDelta = pressureWeight(b.pressure) - pressureWeight(a.pressure);

  if (pressureDelta !== 0) {
    return pressureDelta;
  }

  return b.checked_at_ms - a.checked_at_ms;
}

function pressureWeight(pressure: CaseHealthPressure): number {
  if (pressure === "critical") return 5;
  if (pressure === "high") return 4;
  if (pressure === "medium") return 3;
  if (pressure === "low") return 2;
  return 1;
}

function cloneHealth(health: CaseHealthRecord): CaseHealthRecord {
  return {
    health_id: health.health_id,

    case_id: health.case_id ?? null,
    case_status: health.case_status ?? null,
    case_priority: health.case_priority ?? null,

    status: health.status,
    reason: health.reason,
    pressure: health.pressure,

    stable: health.stable,
    overloaded: health.overloaded,
    stalled: health.stalled,
    broken: health.broken,
    ready_for_analysis: health.ready_for_analysis,
    ready_for_exit: health.ready_for_exit,

    age_ms: health.age_ms ?? null,
    open_age_ms: health.open_age_ms ?? null,
    stalled_age_ms: health.stalled_age_ms ?? null,
    overload_score: health.overload_score,

    checked_at_ms: health.checked_at_ms,
    source_updated_at_ms: health.source_updated_at_ms ?? null,

    notes: [...health.notes],

    data: publicDataOnly(health.data)
  };
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

function cleanPositiveNumber(value: unknown, fallback: number): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
}

function cleanScore(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, Math.min(1, value));
  }

  return 0;
}

function cleanTimestamp(value: unknown, fallback: number): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
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
