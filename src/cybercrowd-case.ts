// src/cybercrowd-case.ts
//
// CyberCrowd Case
//
// ONE JOB:
// Open, hold, read, update, seal, and burn CyberCrowd cases without
// turning them into punishment or hidden control.
//
// This is CASE handling.
// This is a top-level CyberCrowd surface logic.
// This is NOT a folder.
// This is NOT src/cybercrowd-case/case-core.ts.
// This is NOT src/cybercrowd/case/case-core.ts.
// This is NOT src/cybercrowd/case-core.ts.
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
// src/cybercrowd-case.ts
//
// LOCKED RULE:
// A case is not punishment.
// A case is a held condition that needs clean handling.
//
// CASE SURFACE STACK INSIDE THIS FILE:
// Case Core opens and owns the case.
// Case Health checks case stability.
// Case Analysis reads what the case means.
// Case Exit closes, routes, releases, seals, or escalates the case.

export type CaseStatus =
  | "open"
  | "held"
  | "active"
  | "stalled"
  | "resolved"
  | "released"
  | "sealed"
  | "burned";

export type CaseKind =
  | "identity"
  | "movement"
  | "placement"
  | "work"
  | "arena"
  | "memory"
  | "conflict"
  | "clarity"
  | "health"
  | "unknown";

export type CasePriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type CaseReason =
  | "opened"
  | "held-condition"
  | "updated"
  | "activated"
  | "stalled"
  | "resolved"
  | "released"
  | "sealed"
  | "burned"
  | "manual"
  | "unknown";

export interface CaseActorRef {
  actor_id: string;
  public_id?: string | null;
  role?: "owner" | "subject" | "witness" | "handler" | "unknown";
}

export interface CaseOpenInput {
  title: string;
  kind?: CaseKind;
  priority?: CasePriority;
  owner_actor_id: string;

  subject_actor_id?: string | null;
  source_ref_id?: string | null;
  lane_ref_id?: string | null;

  summary?: string | null;
  tags?: string[];

  data?: Record<string, unknown>;
}

export interface CaseUpdateInput {
  case_id: string;

  title?: string;
  kind?: CaseKind;
  priority?: CasePriority;
  status?: CaseStatus;

  summary?: string | null;
  tags?: string[];

  source_ref_id?: string | null;
  lane_ref_id?: string | null;

  data?: Record<string, unknown>;
}

export interface CaseRecord {
  case_id: string;

  title: string;
  kind: CaseKind;
  priority: CasePriority;
  status: CaseStatus;
  reason: CaseReason;

  owner_actor_id: string;
  subject_actor_id: string | null;

  actors: CaseActorRef[];

  summary: string | null;
  tags: string[];

  source_ref_id: string | null;
  lane_ref_id: string | null;

  created_at_ms: number;
  updated_at_ms: number;
  opened_at_ms: number;
  held_at_ms: number | null;
  active_at_ms: number | null;
  stalled_at_ms: number | null;
  resolved_at_ms: number | null;
  released_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface CaseState {
  status: CaseStatus | "idle";
  open_count: number;
  held_count: number;
  active_count: number;
  stalled_count: number;
  resolved_count: number;
  released_count: number;
  sealed_count: number;
  burned_count: number;
  last_case_id: string | null;
  last_reason: CaseReason;
  last_updated_at_ms: number;
}

export interface CaseResult {
  ok: boolean;
  state: CaseState;
  case?: CaseRecord;
  cases: CaseRecord[];
  open: CaseRecord[];
  held: CaseRecord[];
  active: CaseRecord[];
  stalled: CaseRecord[];
  error?: string;
}

export interface CaseSnapshot {
  state: CaseState;
  cases: CaseRecord[];
  open: CaseRecord[];
  held: CaseRecord[];
  active: CaseRecord[];
  stalled: CaseRecord[];
  stable: boolean;
}

export class CyberCrowdCase {
  private cases = new Map<string, CaseRecord>();
  private openCases = new Map<string, CaseRecord>();
  private heldCases = new Map<string, CaseRecord>();
  private activeCases = new Map<string, CaseRecord>();
  private stalledCases = new Map<string, CaseRecord>();

  private state: CaseState = {
    status: "idle",
    open_count: 0,
    held_count: 0,
    active_count: 0,
    stalled_count: 0,
    resolved_count: 0,
    released_count: 0,
    sealed_count: 0,
    burned_count: 0,
    last_case_id: null,
    last_reason: "unknown",
    last_updated_at_ms: Date.now()
  };

  /**
   * Open one CyberCrowd case.
   */
  open(input: CaseOpenInput): CaseResult {
    const title = cleanText(input?.title, 180);
    const ownerActorId = cleanId(input?.owner_actor_id);

    if (!title) {
      return this.result("CASE_TITLE_REQUIRED");
    }

    if (!ownerActorId) {
      return this.result("CASE_OWNER_REQUIRED");
    }

    const now = Date.now();
    const subjectActorId = cleanNullableId(input?.subject_actor_id ?? null);

    const caseRecord: CaseRecord = {
      case_id: makeId("case"),

      title,
      kind: cleanCaseKind(input?.kind ?? "unknown"),
      priority: cleanCasePriority(input?.priority ?? "normal"),
      status: "open",
      reason: "opened",

      owner_actor_id: ownerActorId,
      subject_actor_id: subjectActorId,

      actors: buildActors(ownerActorId, subjectActorId),

      summary: cleanNullableText(input?.summary ?? null, 1200),
      tags: cleanTags(input?.tags ?? []),

      source_ref_id: cleanNullableId(input?.source_ref_id ?? null),
      lane_ref_id: cleanNullableId(input?.lane_ref_id ?? null),

      created_at_ms: now,
      updated_at_ms: now,
      opened_at_ms: now,
      held_at_ms: null,
      active_at_ms: null,
      stalled_at_ms: null,
      resolved_at_ms: null,
      released_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      data: publicDataOnly(input?.data ?? {})
    };

    this.storeCase(caseRecord);
    this.recount("open", caseRecord.case_id, "opened", now);

    return this.result(undefined, caseRecord);
  }

  /**
   * Update case content without deciding punishment.
   */
  update(input: CaseUpdateInput): CaseResult {
    const caseId = cleanId(input?.case_id);

    if (!caseId) {
      return this.result("CASE_ID_REQUIRED");
    }

    const existing = this.cases.get(caseId);

    if (!existing) {
      return this.result("CASE_NOT_FOUND");
    }

    if (existing.status === "burned") {
      return this.result("CASE_BURNED");
    }

    if (existing.status === "sealed") {
      return this.result("CASE_SEALED");
    }

    const now = Date.now();
    const requestedStatus = input?.status
      ? cleanCaseStatus(input.status)
      : existing.status;

    if (!canMove(existing.status, requestedStatus)) {
      return this.result("CASE_STATE_LOCKED", existing);
    }

    const updated: CaseRecord = {
      ...cloneCase(existing),

      title: input?.title ? cleanText(input.title, 180) : existing.title,
      kind: input?.kind ? cleanCaseKind(input.kind) : existing.kind,
      priority: input?.priority
        ? cleanCasePriority(input.priority)
        : existing.priority,
      status: requestedStatus,
      reason: reasonFromStatus(requestedStatus, "updated"),

      summary:
        input?.summary !== undefined
          ? cleanNullableText(input.summary, 1200)
          : existing.summary,

      tags: input?.tags ? cleanTags(input.tags) : existing.tags,

      source_ref_id:
        input?.source_ref_id !== undefined
          ? cleanNullableId(input.source_ref_id)
          : existing.source_ref_id,

      lane_ref_id:
        input?.lane_ref_id !== undefined
          ? cleanNullableId(input.lane_ref_id)
          : existing.lane_ref_id,

      updated_at_ms: now,

      held_at_ms:
        requestedStatus === "held" ? now : existing.held_at_ms,
      active_at_ms:
        requestedStatus === "active" ? now : existing.active_at_ms,
      stalled_at_ms:
        requestedStatus === "stalled" ? now : existing.stalled_at_ms,
      resolved_at_ms:
        requestedStatus === "resolved" ? now : existing.resolved_at_ms,
      released_at_ms:
        requestedStatus === "released" ? now : existing.released_at_ms,
      sealed_at_ms:
        requestedStatus === "sealed" ? now : existing.sealed_at_ms,
      burned_at_ms:
        requestedStatus === "burned" ? now : existing.burned_at_ms,

      data: publicDataOnly({
        ...existing.data,
        ...(input?.data ?? {})
      })
    };

    this.removeFromIndexes(updated.case_id);
    this.storeCase(updated);
    this.recount(updated.status, updated.case_id, updated.reason, now);

    return this.result(undefined, updated);
  }

  hold(case_id: string): CaseResult {
    return this.transition(case_id, "held");
  }

  activate(case_id: string): CaseResult {
    return this.transition(case_id, "active");
  }

  stall(case_id: string): CaseResult {
    return this.transition(case_id, "stalled");
  }

  resolve(case_id: string): CaseResult {
    return this.transition(case_id, "resolved");
  }

  release(case_id: string): CaseResult {
    return this.transition(case_id, "released");
  }

  seal(case_id: string): CaseResult {
    return this.transition(case_id, "sealed");
  }

  burn(case_id: string): CaseResult {
    const caseId = cleanId(case_id);

    if (!caseId) {
      return this.result("CASE_ID_REQUIRED");
    }

    const existing = this.cases.get(caseId);

    if (!existing) {
      return this.result("CASE_NOT_FOUND");
    }

    this.cases.delete(caseId);
    this.removeFromIndexes(caseId);

    const now = Date.now();

    const burned: CaseRecord = {
      ...cloneCase(existing),
      status: "burned",
      reason: "burned",
      updated_at_ms: now,
      burned_at_ms: now
    };

    this.recount("burned", caseId, "burned", now);

    return this.result(undefined, burned);
  }

  get(case_id: string): CaseRecord | null {
    const caseRecord = this.cases.get(cleanId(case_id));
    return caseRecord ? cloneCase(caseRecord) : null;
  }

  getState(): CaseState {
    return {
      status: this.state.status,
      open_count: this.state.open_count,
      held_count: this.state.held_count,
      active_count: this.state.active_count,
      stalled_count: this.state.stalled_count,
      resolved_count: this.state.resolved_count,
      released_count: this.state.released_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_case_id: this.state.last_case_id,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getCases(): CaseRecord[] {
    return Array.from(this.cases.values())
      .map(cloneCase)
      .sort(compareCases);
  }

  getOpen(): CaseRecord[] {
    return Array.from(this.openCases.values())
      .map(cloneCase)
      .sort(compareCases);
  }

  getHeld(): CaseRecord[] {
    return Array.from(this.heldCases.values())
      .map(cloneCase)
      .sort(compareCases);
  }

  getActive(): CaseRecord[] {
    return Array.from(this.activeCases.values())
      .map(cloneCase)
      .sort(compareCases);
  }

  getStalled(): CaseRecord[] {
    return Array.from(this.stalledCases.values())
      .map(cloneCase)
      .sort(compareCases);
  }

  snapshot(): CaseSnapshot {
    return {
      state: this.getState(),
      cases: this.getCases(),
      open: this.getOpen(),
      held: this.getHeld(),
      active: this.getActive(),
      stalled: this.getStalled(),
      stable:
        this.state.status === "idle" ||
        this.state.status === "open" ||
        this.state.status === "held" ||
        this.state.status === "active" ||
        this.state.status === "resolved" ||
        this.state.status === "released"
    };
  }

  reset(): void {
    this.cases.clear();
    this.openCases.clear();
    this.heldCases.clear();
    this.activeCases.clear();
    this.stalledCases.clear();

    this.state = {
      status: "idle",
      open_count: 0,
      held_count: 0,
      active_count: 0,
      stalled_count: 0,
      resolved_count: 0,
      released_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_case_id: null,
      last_reason: "unknown",
      last_updated_at_ms: Date.now()
    };
  }

  private transition(case_id: string, status: CaseStatus): CaseResult {
    const caseId = cleanId(case_id);

    if (!caseId) {
      return this.result("CASE_ID_REQUIRED");
    }

    const existing = this.cases.get(caseId);

    if (!existing) {
      return this.result("CASE_NOT_FOUND");
    }

    if (!canMove(existing.status, status)) {
      return this.result("CASE_STATE_LOCKED", existing);
    }

    const now = Date.now();

    const updated: CaseRecord = {
      ...cloneCase(existing),
      status,
      reason: reasonFromStatus(status),
      updated_at_ms: now,
      held_at_ms: status === "held" ? now : existing.held_at_ms,
      active_at_ms: status === "active" ? now : existing.active_at_ms,
      stalled_at_ms: status === "stalled" ? now : existing.stalled_at_ms,
      resolved_at_ms: status === "resolved" ? now : existing.resolved_at_ms,
      released_at_ms: status === "released" ? now : existing.released_at_ms,
      sealed_at_ms: status === "sealed" ? now : existing.sealed_at_ms,
      burned_at_ms: status === "burned" ? now : existing.burned_at_ms
    };

    this.removeFromIndexes(updated.case_id);
    this.storeCase(updated);
    this.recount(status, updated.case_id, updated.reason, now);

    return this.result(undefined, updated);
  }

  private storeCase(caseRecord: CaseRecord): void {
    this.cases.set(caseRecord.case_id, cloneCase(caseRecord));

    if (caseRecord.status === "open") {
      this.openCases.set(caseRecord.case_id, cloneCase(caseRecord));
    }

    if (caseRecord.status === "held") {
      this.heldCases.set(caseRecord.case_id, cloneCase(caseRecord));
    }

    if (caseRecord.status === "active") {
      this.activeCases.set(caseRecord.case_id, cloneCase(caseRecord));
    }

    if (caseRecord.status === "stalled") {
      this.stalledCases.set(caseRecord.case_id, cloneCase(caseRecord));
    }

    if (this.cases.size > 500) {
      const old = this.getCases().slice(500);

      for (const record of old) {
        this.cases.delete(record.case_id);
        this.removeFromIndexes(record.case_id);
      }
    }
  }

  private removeFromIndexes(caseId: string): void {
    this.openCases.delete(caseId);
    this.heldCases.delete(caseId);
    this.activeCases.delete(caseId);
    this.stalledCases.delete(caseId);
  }

  private recount(
    status: CaseStatus,
    caseId: string | null,
    reason: CaseReason,
    at_ms: number
  ): void {
    const cases = Array.from(this.cases.values());

    this.state = {
      status,
      open_count: cases.filter((record) => record.status === "open").length,
      held_count: cases.filter((record) => record.status === "held").length,
      active_count: cases.filter((record) => record.status === "active").length,
      stalled_count: cases.filter((record) => record.status === "stalled").length,
      resolved_count:
        cases.filter((record) => record.status === "resolved").length,
      released_count:
        cases.filter((record) => record.status === "released").length,
      sealed_count: cases.filter((record) => record.status === "sealed").length,
      burned_count:
        this.state.burned_count + (status === "burned" ? 1 : 0),
      last_case_id: caseId,
      last_reason: reason,
      last_updated_at_ms: at_ms
    };
  }

  private result(error?: string, caseRecord?: CaseRecord): CaseResult {
    return {
      ok: !error,
      state: this.getState(),
      case: caseRecord ? cloneCase(caseRecord) : undefined,
      cases: this.getCases(),
      open: this.getOpen(),
      held: this.getHeld(),
      active: this.getActive(),
      stalled: this.getStalled(),
      error
    };
  }
}

export const CyberCrowdCaseSurface =
  new CyberCrowdCase();

function canMove(from: CaseStatus, to: CaseStatus): boolean {
  if (from === "burned") return false;

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) return true;

  if (
    from === "open" ||
    from === "held" ||
    from === "active" ||
    from === "stalled"
  ) {
    return (
      to === "open" ||
      to === "held" ||
      to === "active" ||
      to === "stalled" ||
      to === "resolved" ||
      to === "released" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "resolved" || from === "released") {
    return to === "sealed" || to === "burned";
  }

  return false;
}

function reasonFromStatus(
  status: CaseStatus,
  fallback: CaseReason = "manual"
): CaseReason {
  if (status === "open") return "opened";
  if (status === "held") return "held-condition";
  if (status === "active") return "activated";
  if (status === "stalled") return "stalled";
  if (status === "resolved") return "resolved";
  if (status === "released") return "released";
  if (status === "sealed") return "sealed";
  if (status === "burned") return "burned";

  return fallback;
}

function buildActors(
  ownerActorId: string,
  subjectActorId: string | null
): CaseActorRef[] {
  const actors: CaseActorRef[] = [
    {
      actor_id: ownerActorId,
      public_id: null,
      role: "owner"
    }
  ];

  if (subjectActorId && subjectActorId !== ownerActorId) {
    actors.push({
      actor_id: subjectActorId,
      public_id: null,
      role: "subject"
    });
  }

  return actors;
}

function compareCases(a: CaseRecord, b: CaseRecord): number {
  const priorityDelta =
    priorityWeight(b.priority) - priorityWeight(a.priority);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return b.updated_at_ms - a.updated_at_ms;
}

function priorityWeight(priority: CasePriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "normal") return 2;
  return 1;
}

function cleanCaseKind(value: unknown): CaseKind {
  if (
    value === "identity" ||
    value === "movement" ||
    value === "placement" ||
    value === "work" ||
    value === "arena" ||
    value === "memory" ||
    value === "conflict" ||
    value === "clarity" ||
    value === "health" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanCaseStatus(value: unknown): CaseStatus {
  if (
    value === "open" ||
    value === "held" ||
    value === "active" ||
    value === "stalled" ||
    value === "resolved" ||
    value === "released" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "open";
}

function cleanCasePriority(value: unknown): CasePriority {
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

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const tags = value
    .map((tag) => cleanText(tag, 40).toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 20);
}

function cloneCase(caseRecord: CaseRecord): CaseRecord {
  return {
    case_id: caseRecord.case_id,

    title: caseRecord.title,
    kind: caseRecord.kind,
    priority: caseRecord.priority,
    status: caseRecord.status,
    reason: caseRecord.reason,

    owner_actor_id: caseRecord.owner_actor_id,
    subject_actor_id: caseRecord.subject_actor_id ?? null,

    actors: caseRecord.actors.map((actor) => ({
      actor_id: actor.actor_id,
      public_id: actor.public_id ?? null,
      role: actor.role ?? "unknown"
    })),

    summary: caseRecord.summary ?? null,
    tags: [...caseRecord.tags],

    source_ref_id: caseRecord.source_ref_id ?? null,
    lane_ref_id: caseRecord.lane_ref_id ?? null,

    created_at_ms: caseRecord.created_at_ms,
    updated_at_ms: caseRecord.updated_at_ms,
    opened_at_ms: caseRecord.opened_at_ms,
    held_at_ms: caseRecord.held_at_ms ?? null,
    active_at_ms: caseRecord.active_at_ms ?? null,
    stalled_at_ms: caseRecord.stalled_at_ms ?? null,
    resolved_at_ms: caseRecord.resolved_at_ms ?? null,
    released_at_ms: caseRecord.released_at_ms ?? null,
    sealed_at_ms: caseRecord.sealed_at_ms ?? null,
    burned_at_ms: caseRecord.burned_at_ms ?? null,

    data: publicDataOnly(caseRecord.data)
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

function cleanNullableText(
  value: unknown,
  maxLength: number
): string | null {
  const clean = cleanText(value, maxLength);
  return clean || null;
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
