// src/cybercrowd-work-match-router.ts
//
// CyberCrowd Work Match Router Organ
//
// ONE JOB:
// Match live needs to proof-backed humans without becoming a dead application board.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
// This is NOT a hidden ranking system.
//
// Needs / Wants Filter separates need from want.
// Skill Ledger shows proof-backed skills.
// Work History shows proof-backed timeline.
// Proximity shows where movement can happen.
// Job Ping asks the human yes / no / later.
//
// Work Match Router connects them.
//
// A match is a route suggestion.
// A match is not authority.
// A match is not ownership.
// A match is not forced acceptance.
// A match is not invisible punishment.

export type WorkMatchSource =
  | "needs-wants"
  | "jobs"
  | "services"
  | "presence"
  | "manual"
  | "unknown";

export type WorkMatchStatus =
  | "candidate"
  | "pinged"
  | "accepted"
  | "declined"
  | "later"
  | "expired"
  | "cancelled"
  | "sealed"
  | "burned";

export type WorkMatchReason =
  | "skill-match"
  | "proof-match"
  | "proximity-match"
  | "availability-match"
  | "history-match"
  | "manual-match"
  | "unknown";

export interface WorkMatchSkillNeed {
  tag: string;
  weight?: number;
}

export interface WorkMatchCandidateSkill {
  tag: string;
  weight?: number;
  proof_count?: number;
}

export interface WorkMatchCandidate {
  actor_private_id: string;
  actor_public_id?: string | null;
  available?: boolean;
  proximity_distance?: number | null;
  skills?: WorkMatchCandidateSkill[];
  proof_count?: number;
  completed_jobs?: number;
  data?: Record<string, unknown>;
}

export interface WorkMatchRequest {
  tenant_id: string;
  need_id?: string | null;
  job_id?: string | null;
  moment_id?: string | null;
  surface_id?: string | null;
  source?: WorkMatchSource;
  required_skills?: WorkMatchSkillNeed[];
  preferred_skills?: WorkMatchSkillNeed[];
  candidates: WorkMatchCandidate[];
  max_results?: number;
  data?: Record<string, unknown>;
}

export interface WorkMatchScoreBreakdown {
  skill_score: number;
  proof_score: number;
  proximity_score: number;
  availability_score: number;
  history_score: number;
  total_score: number;
}

export interface WorkMatchRecord {
  match_id: string;

  tenant_id: string;
  need_id: string | null;
  job_id: string | null;
  moment_id: string | null;
  surface_id: string | null;

  source: WorkMatchSource;
  status: WorkMatchStatus;

  actor_private_id: string;
  actor_public_id: string | null;

  reasons: WorkMatchReason[];
  score: WorkMatchScoreBreakdown;

  required_skill_hits: string[];
  preferred_skill_hits: string[];
  missing_required_skills: string[];

  created_at_ms: number;
  updated_at_ms: number;
  pinged_at_ms: number | null;
  accepted_at_ms: number | null;
  declined_at_ms: number | null;
  later_at_ms: number | null;
  expired_at_ms: number | null;
  cancelled_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface WorkMatchResult {
  ok: boolean;
  matches: WorkMatchRecord[];
  error?: string;
}

export interface WorkMatchSingleResult {
  ok: boolean;
  match?: WorkMatchRecord;
  error?: string;
}

export interface WorkMatchOrgan {
  route(request: WorkMatchRequest): Promise<WorkMatchResult>;

  ping(match_id: string): Promise<WorkMatchSingleResult>;

  accept(match_id: string): Promise<WorkMatchSingleResult>;

  decline(match_id: string): Promise<WorkMatchSingleResult>;

  later(match_id: string): Promise<WorkMatchSingleResult>;

  expire(match_id: string): Promise<WorkMatchSingleResult>;

  cancel(match_id: string): Promise<WorkMatchSingleResult>;

  seal(match_id: string): Promise<WorkMatchSingleResult>;

  burn(match_id: string): Promise<WorkMatchSingleResult>;

  get(match_id: string): Promise<WorkMatchRecord | null>;

  listForJob(job_id: string): Promise<WorkMatchResult>;

  listForNeed(need_id: string): Promise<WorkMatchResult>;

  listForActor(actor_private_id: string): Promise<WorkMatchResult>;
}

export class InMemoryWorkMatchRouter implements WorkMatchOrgan {
  private readonly matches = new Map<string, WorkMatchRecord>();
  private readonly jobIndex = new Map<string, Set<string>>();
  private readonly needIndex = new Map<string, Set<string>>();
  private readonly actorIndex = new Map<string, Set<string>>();

  async route(request: WorkMatchRequest): Promise<WorkMatchResult> {
    const tenant_id = cleanId(request?.tenant_id);

    if (!tenant_id) {
      return {
        ok: false,
        matches: [],
        error: "TENANT_ID_REQUIRED"
      };
    }

    if (!Array.isArray(request?.candidates)) {
      return {
        ok: false,
        matches: [],
        error: "CANDIDATES_REQUIRED"
      };
    }

    const need_id = cleanNullableId(request?.need_id ?? null);
    const job_id = cleanNullableId(request?.job_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const surface_id = cleanNullableId(request?.surface_id ?? null);
    const source = cleanSource(request?.source ?? "unknown");

    const required_skills = normalizeSkillNeeds(request?.required_skills ?? []);
    const preferred_skills = normalizeSkillNeeds(request?.preferred_skills ?? []);

    const maxResults = cleanLimit(request?.max_results ?? 10);

    const created: WorkMatchRecord[] = [];

    for (const candidate of request.candidates) {
      const match = this.buildMatch({
        tenant_id,
        need_id,
        job_id,
        moment_id,
        surface_id,
        source,
        required_skills,
        preferred_skills,
        candidate,
        data: request?.data ?? {}
      });

      if (!match) continue;

      if (match.missing_required_skills.length > 0) continue;

      created.push(match);
    }

    const sorted = created
      .sort((a, b) => b.score.total_score - a.score.total_score)
      .slice(0, maxResults);

    for (const match of sorted) {
      this.matches.set(match.match_id, cloneMatch(match));

      if (match.job_id) {
        this.addIndex(this.jobIndex, match.job_id, match.match_id);
      }

      if (match.need_id) {
        this.addIndex(this.needIndex, match.need_id, match.match_id);
      }

      this.addIndex(this.actorIndex, match.actor_private_id, match.match_id);
    }

    return {
      ok: true,
      matches: sorted.map(cloneMatch)
    };
  }

  async ping(match_id: string): Promise<WorkMatchSingleResult> {
    return this.transition(match_id, "pinged");
  }

  async accept(match_id: string): Promise<WorkMatchSingleResult> {
    return this.transition(match_id, "accepted");
  }

  async decline(match_id: string): Promise<WorkMatchSingleResult> {
    return this.transition(match_id, "declined");
  }

  async later(match_id: string): Promise<WorkMatchSingleResult> {
    return this.transition(match_id, "later");
  }

  async expire(match_id: string): Promise<WorkMatchSingleResult> {
    return this.transition(match_id, "expired");
  }

  async cancel(match_id: string): Promise<WorkMatchSingleResult> {
    return this.transition(match_id, "cancelled");
  }

  async seal(match_id: string): Promise<WorkMatchSingleResult> {
    return this.transition(match_id, "sealed");
  }

  async burn(match_id: string): Promise<WorkMatchSingleResult> {
    return this.transition(match_id, "burned");
  }

  async get(match_id: string): Promise<WorkMatchRecord | null> {
    const match = this.matches.get(cleanId(match_id));
    return match ? cloneMatch(match) : null;
  }

  async listForJob(job_id: string): Promise<WorkMatchResult> {
    const cleanJob = cleanId(job_id);

    if (!cleanJob) {
      return {
        ok: false,
        matches: [],
        error: "JOB_ID_REQUIRED"
      };
    }

    const ids = this.jobIndex.get(cleanJob) ?? new Set<string>();

    return {
      ok: true,
      matches: this.recordsFromIds(ids)
    };
  }

  async listForNeed(need_id: string): Promise<WorkMatchResult> {
    const cleanNeed = cleanId(need_id);

    if (!cleanNeed) {
      return {
        ok: false,
        matches: [],
        error: "NEED_ID_REQUIRED"
      };
    }

    const ids = this.needIndex.get(cleanNeed) ?? new Set<string>();

    return {
      ok: true,
      matches: this.recordsFromIds(ids)
    };
  }

  async listForActor(actor_private_id: string): Promise<WorkMatchResult> {
    const cleanActor = cleanId(actor_private_id);

    if (!cleanActor) {
      return {
        ok: false,
        matches: [],
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.actorIndex.get(cleanActor) ?? new Set<string>();

    return {
      ok: true,
      matches: this.recordsFromIds(ids)
    };
  }

  reset(): void {
    this.matches.clear();
    this.jobIndex.clear();
    this.needIndex.clear();
    this.actorIndex.clear();
  }

  private buildMatch(input: {
    tenant_id: string;
    need_id: string | null;
    job_id: string | null;
    moment_id: string | null;
    surface_id: string | null;
    source: WorkMatchSource;
    required_skills: WorkMatchSkillNeed[];
    preferred_skills: WorkMatchSkillNeed[];
    candidate: WorkMatchCandidate;
    data: Record<string, unknown>;
  }): WorkMatchRecord | null {
    const actor_private_id = cleanId(input.candidate?.actor_private_id);
    const actor_public_id = cleanNullableId(input.candidate?.actor_public_id ?? null);

    if (!actor_private_id) {
      return null;
    }

    const candidateSkills = normalizeCandidateSkills(input.candidate?.skills ?? []);

    const requiredHits = skillHits(input.required_skills, candidateSkills);
    const preferredHits = skillHits(input.preferred_skills, candidateSkills);
    const missingRequired = missingSkills(input.required_skills, candidateSkills);

    const score = calculateScore({
      required_skills: input.required_skills,
      preferred_skills: input.preferred_skills,
      required_hits: requiredHits,
      preferred_hits: preferredHits,
      candidate: input.candidate
    });

    const reasons = collectReasons(score, input.candidate);

    const now = Date.now();

    return {
      match_id: makeMatchId(),

      tenant_id: input.tenant_id,
      need_id: input.need_id,
      job_id: input.job_id,
      moment_id: input.moment_id,
      surface_id: input.surface_id,

      source: input.source,
      status: "candidate",

      actor_private_id,
      actor_public_id,

      reasons,
      score,

      required_skill_hits: requiredHits,
      preferred_skill_hits: preferredHits,
      missing_required_skills: missingRequired,

      created_at_ms: now,
      updated_at_ms: now,
      pinged_at_ms: null,
      accepted_at_ms: null,
      declined_at_ms: null,
      later_at_ms: null,
      expired_at_ms: null,
      cancelled_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      data: {
        ...cloneData(input.data),
        candidate: cloneData(input.candidate?.data ?? {})
      }
    };
  }

  private async transition(
    match_id: string,
    status: WorkMatchStatus
  ): Promise<WorkMatchSingleResult> {
    const match = this.matches.get(cleanId(match_id));

    if (!match) {
      return {
        ok: false,
        error: "WORK_MATCH_NOT_FOUND"
      };
    }

    if (!canMove(match.status, status)) {
      return {
        ok: false,
        error: "WORK_MATCH_STATE_LOCKED"
      };
    }

    const now = Date.now();

    match.status = status;
    match.updated_at_ms = now;

    if (status === "pinged") match.pinged_at_ms = now;
    if (status === "accepted") match.accepted_at_ms = now;
    if (status === "declined") match.declined_at_ms = now;
    if (status === "later") match.later_at_ms = now;
    if (status === "expired") match.expired_at_ms = now;
    if (status === "cancelled") match.cancelled_at_ms = now;
    if (status === "sealed") match.sealed_at_ms = now;
    if (status === "burned") match.burned_at_ms = now;

    return {
      ok: true,
      match: cloneMatch(match)
    };
  }

  private recordsFromIds(ids: Set<string>): WorkMatchRecord[] {
    return Array.from(ids)
      .map((id) => this.matches.get(id))
      .filter((match): match is WorkMatchRecord => Boolean(match))
      .map(cloneMatch)
      .sort((a, b) => b.score.total_score - a.score.total_score);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    match_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(match_id);
    index.set(key, existing);
  }
}

export const CyberCrowdWorkMatchRouter =
  new InMemoryWorkMatchRouter();

export function isWorkMatchStatus(
  value: unknown
): value is WorkMatchStatus {
  return (
    value === "candidate" ||
    value === "pinged" ||
    value === "accepted" ||
    value === "declined" ||
    value === "later" ||
    value === "expired" ||
    value === "cancelled" ||
    value === "sealed" ||
    value === "burned"
  );
}

function calculateScore(input: {
  required_skills: WorkMatchSkillNeed[];
  preferred_skills: WorkMatchSkillNeed[];
  required_hits: string[];
  preferred_hits: string[];
  candidate: WorkMatchCandidate;
}): WorkMatchScoreBreakdown {
  const requiredPossible = Math.max(input.required_skills.length, 1);
  const preferredPossible = Math.max(input.preferred_skills.length, 1);

  const requiredScore =
    input.required_skills.length === 0
      ? 20
      : (input.required_hits.length / requiredPossible) * 40;

  const preferredScore =
    input.preferred_skills.length === 0
      ? 10
      : (input.preferred_hits.length / preferredPossible) * 20;

  const skill_score = clamp(requiredScore + preferredScore, 0, 60);

  const proof_count =
    typeof input.candidate.proof_count === "number" &&
    Number.isFinite(input.candidate.proof_count)
      ? input.candidate.proof_count
      : 0;

  const completed_jobs =
    typeof input.candidate.completed_jobs === "number" &&
    Number.isFinite(input.candidate.completed_jobs)
      ? input.candidate.completed_jobs
      : 0;

  const proof_score = clamp(proof_count * 2, 0, 15);
  const history_score = clamp(completed_jobs * 1.5, 0, 10);

  const availability_score = input.candidate.available === true ? 10 : 0;

  const distance =
    typeof input.candidate.proximity_distance === "number" &&
    Number.isFinite(input.candidate.proximity_distance)
      ? input.candidate.proximity_distance
      : null;

  const proximity_score =
    distance === null
      ? 0
      : clamp(10 - distance / 10, 0, 10);

  const total_score = clamp(
    skill_score +
      proof_score +
      history_score +
      availability_score +
      proximity_score,
    0,
    100
  );

  return {
    skill_score,
    proof_score,
    proximity_score,
    availability_score,
    history_score,
    total_score
  };
}

function collectReasons(
  score: WorkMatchScoreBreakdown,
  candidate: WorkMatchCandidate
): WorkMatchReason[] {
  const reasons: WorkMatchReason[] = [];

  if (score.skill_score > 0) reasons.push("skill-match");
  if (score.proof_score > 0) reasons.push("proof-match");
  if (score.proximity_score > 0) reasons.push("proximity-match");
  if (score.availability_score > 0) reasons.push("availability-match");
  if (score.history_score > 0) reasons.push("history-match");

  if (reasons.length === 0 && candidate.actor_private_id) {
    reasons.push("unknown");
  }

  return reasons;
}

function skillHits(
  needs: WorkMatchSkillNeed[],
  skills: WorkMatchCandidateSkill[]
): string[] {
  const skillSet = new Set(skills.map((skill) => skill.tag));

  return needs
    .map((need) => need.tag)
    .filter((tag) => skillSet.has(tag));
}

function missingSkills(
  needs: WorkMatchSkillNeed[],
  skills: WorkMatchCandidateSkill[]
): string[] {
  const skillSet = new Set(skills.map((skill) => skill.tag));

  return needs
    .map((need) => need.tag)
    .filter((tag) => !skillSet.has(tag));
}

function normalizeSkillNeeds(
  needs: WorkMatchSkillNeed[]
): WorkMatchSkillNeed[] {
  if (!Array.isArray(needs)) {
    return [];
  }

  const byTag = new Map<string, WorkMatchSkillNeed>();

  for (const need of needs) {
    const tag = cleanSkillTag(need?.tag);

    if (!tag) continue;

    byTag.set(tag, {
      tag,
      weight: normalizeWeight(need?.weight ?? 1)
    });
  }

  return Array.from(byTag.values()).slice(0, 50);
}

function normalizeCandidateSkills(
  skills: WorkMatchCandidateSkill[]
): WorkMatchCandidateSkill[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const byTag = new Map<string, WorkMatchCandidateSkill>();

  for (const skill of skills) {
    const tag = cleanSkillTag(skill?.tag);

    if (!tag) continue;

    byTag.set(tag, {
      tag,
      weight: normalizeWeight(skill?.weight ?? 1),
      proof_count: cleanNonNegativeNumber(skill?.proof_count ?? 0)
    });
  }

  return Array.from(byTag.values()).slice(0, 100);
}

function canMove(
  from: WorkMatchStatus,
  to: WorkMatchStatus
): boolean {
  if (from === "burned") {
    return false;
  }

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) {
    return true;
  }

  if (from === "candidate") {
    return (
      to === "pinged" ||
      to === "cancelled" ||
      to === "expired" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "pinged") {
    return (
      to === "accepted" ||
      to === "declined" ||
      to === "later" ||
      to === "expired" ||
      to === "cancelled" ||
      to === "burned"
    );
  }

  if (
    from === "accepted" ||
    from === "declined" ||
    from === "later" ||
    from === "expired" ||
    from === "cancelled"
  ) {
    return (
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function cloneMatch(match: WorkMatchRecord): WorkMatchRecord {
  return {
    match_id: match.match_id,

    tenant_id: match.tenant_id,
    need_id: match.need_id ?? null,
    job_id: match.job_id ?? null,
    moment_id: match.moment_id ?? null,
    surface_id: match.surface_id ?? null,

    source: match.source,
    status: match.status,

    actor_private_id: match.actor_private_id,
    actor_public_id: match.actor_public_id ?? null,

    reasons: [...match.reasons],
    score: {
      skill_score: match.score.skill_score,
      proof_score: match.score.proof_score,
      proximity_score: match.score.proximity_score,
      availability_score: match.score.availability_score,
      history_score: match.score.history_score,
      total_score: match.score.total_score
    },

    required_skill_hits: [...match.required_skill_hits],
    preferred_skill_hits: [...match.preferred_skill_hits],
    missing_required_skills: [...match.missing_required_skills],

    created_at_ms: match.created_at_ms,
    updated_at_ms: match.updated_at_ms,
    pinged_at_ms: match.pinged_at_ms ?? null,
    accepted_at_ms: match.accepted_at_ms ?? null,
    declined_at_ms: match.declined_at_ms ?? null,
    later_at_ms: match.later_at_ms ?? null,
    expired_at_ms: match.expired_at_ms ?? null,
    cancelled_at_ms: match.cancelled_at_ms ?? null,
    sealed_at_ms: match.sealed_at_ms ?? null,
    burned_at_ms: match.burned_at_ms ?? null,

    data: cloneData(match.data)
  };
}

function cleanSource(value: unknown): WorkMatchSource {
  if (
    value === "needs-wants" ||
    value === "jobs" ||
    value === "services" ||
    value === "presence" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function makeMatchId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-match-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cleanLimit(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return Math.min(value, 100);
  }

  return 10;
}

function normalizeWeight(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  if (value < 0) return 0;
  if (value > 10) return 10;

  return value;
}

function cleanNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) return 0;

  return value;
}

function cleanSkillTag(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
  }
