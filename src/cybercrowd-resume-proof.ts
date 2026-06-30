// src/cybercrowd-resume-proof.ts
//
// CyberCrowd Resume Proof Organ
//
// ONE JOB:
// Turn résumé history into proof-backed work history.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// A résumé is not what someone claims.
// A résumé is what their proof trail can show.
//
// Resume proof is evidence.
// Resume proof is not authority.
// Resume proof is not automatic trust.
// Resume proof is not a hidden score.

export type ResumeProofType =
  | "job-completed"
  | "job-accepted"
  | "showed-up"
  | "before-after"
  | "media-proof"
  | "reference"
  | "counterclaim"
  | "footprint"
  | "moment"
  | "proximity"
  | "skill-tag"
  | "training"
  | "license"
  | "other";

export type ResumeProofStatus =
  | "recorded"
  | "verified"
  | "disputed"
  | "rejected"
  | "sealed"
  | "burned";

export type ResumeProofVisibility =
  | "private"
  | "public"
  | "limited";

export type ResumeProofSourceOrgan =
  | "jobs"
  | "footprint"
  | "moment"
  | "ping"
  | "counterclaim"
  | "proximity"
  | "media"
  | "manual"
  | "unknown";

export interface ResumeProofEvidence {
  evidence_id: string;
  kind:
    | "job"
    | "footprint"
    | "moment"
    | "ping"
    | "counterclaim"
    | "proximity"
    | "media"
    | "reference"
    | "note"
    | "other";
  ref_id: string | null;
  text: string | null;
  added_at_ms: number;
}

export interface ResumeSkillTag {
  tag: string;
  weight: number;
  source: string | null;
}

export interface ResumeProofRecord {
  proof_id: string;

  actor_private_id: string;
  actor_public_id: string | null;

  job_id: string | null;
  moment_id: string | null;
  footprint_id: string | null;
  ping_id: string | null;
  counterclaim_id: string | null;
  proximity_id: string | null;

  type: ResumeProofType;
  status: ResumeProofStatus;
  visibility: ResumeProofVisibility;
  source_organ: ResumeProofSourceOrgan;

  title: string;
  summary: string | null;

  skill_tags: ResumeSkillTag[];
  evidence: ResumeProofEvidence[];

  occurred_at_ms: number;
  created_at_ms: number;
  updated_at_ms: number;

  verified_at_ms: number | null;
  disputed_at_ms: number | null;
  rejected_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  resolution_note: string | null;

  data: Record<string, unknown>;
}

export interface CreateResumeProofRequest {
  actor_private_id: string;
  actor_public_id?: string | null;

  job_id?: string | null;
  moment_id?: string | null;
  footprint_id?: string | null;
  ping_id?: string | null;
  counterclaim_id?: string | null;
  proximity_id?: string | null;

  type: ResumeProofType;
  visibility?: ResumeProofVisibility;
  source_organ?: ResumeProofSourceOrgan;

  title: string;
  summary?: string | null;

  skill_tags?: ResumeSkillTagInput[];
  evidence?: ResumeProofEvidenceInput[];

  occurred_at_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface ResumeSkillTagInput {
  tag: string;
  weight?: number;
  source?: string | null;
}

export interface ResumeProofEvidenceInput {
  kind:
    | "job"
    | "footprint"
    | "moment"
    | "ping"
    | "counterclaim"
    | "proximity"
    | "media"
    | "reference"
    | "note"
    | "other";
  ref_id?: string | null;
  text?: string | null;
}

export interface ResumeProofResult {
  ok: boolean;
  proof?: ResumeProofRecord;
  error?: string;
}

export interface ResumeProofListResult {
  ok: boolean;
  proofs: ResumeProofRecord[];
  error?: string;
}

export interface ResumeProofPublicCard {
  proof_id: string;
  actor_public_id: string | null;
  type: ResumeProofType;
  title: string;
  summary: string | null;
  skill_tags: ResumeSkillTag[];
  occurred_at_ms: number;
  status: ResumeProofStatus;
}

export interface ResumeProofOrgan {
  create(request: CreateResumeProofRequest): Promise<ResumeProofResult>;

  verify(
    proof_id: string,
    note?: string | null
  ): Promise<ResumeProofResult>;

  dispute(
    proof_id: string,
    note?: string | null
  ): Promise<ResumeProofResult>;

  reject(
    proof_id: string,
    note?: string | null
  ): Promise<ResumeProofResult>;

  seal(
    proof_id: string
  ): Promise<ResumeProofResult>;

  burn(
    proof_id: string
  ): Promise<ResumeProofResult>;

  addEvidence(
    proof_id: string,
    evidence: ResumeProofEvidenceInput
  ): Promise<ResumeProofResult>;

  addSkillTag(
    proof_id: string,
    skill: ResumeSkillTagInput
  ): Promise<ResumeProofResult>;

  get(
    proof_id: string
  ): Promise<ResumeProofRecord | null>;

  listForActor(
    actor_private_id: string
  ): Promise<ResumeProofListResult>;

  listForPublicActor(
    actor_public_id: string
  ): Promise<ResumeProofListResult>;

  listForJob(
    job_id: string
  ): Promise<ResumeProofListResult>;

  listBySkill(
    skill_tag: string
  ): Promise<ResumeProofListResult>;

  publicCard(
    proof_id: string
  ): Promise<ResumeProofPublicCard | null>;
}

export class InMemoryResumeProofOrgan implements ResumeProofOrgan {
  private readonly proofs = new Map<string, ResumeProofRecord>();
  private readonly privateActorIndex = new Map<string, Set<string>>();
  private readonly publicActorIndex = new Map<string, Set<string>>();
  private readonly jobIndex = new Map<string, Set<string>>();
  private readonly skillIndex = new Map<string, Set<string>>();

  async create(
    request: CreateResumeProofRequest
  ): Promise<ResumeProofResult> {
    const actor_private_id = cleanId(request?.actor_private_id);
    const actor_public_id = cleanNullableId(request?.actor_public_id ?? null);

    const job_id = cleanNullableId(request?.job_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const footprint_id = cleanNullableId(request?.footprint_id ?? null);
    const ping_id = cleanNullableId(request?.ping_id ?? null);
    const counterclaim_id = cleanNullableId(request?.counterclaim_id ?? null);
    const proximity_id = cleanNullableId(request?.proximity_id ?? null);

    const type = cleanResumeProofType(request?.type);
    const visibility = cleanVisibility(request?.visibility ?? "private");
    const source_organ = cleanSourceOrgan(request?.source_organ ?? "unknown");

    const title = cleanText(request?.title ?? "", 240);
    const summary = cleanNullableText(request?.summary ?? null, 2000);

    if (!actor_private_id) {
      return {
        ok: false,
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    if (!type) {
      return {
        ok: false,
        error: "RESUME_PROOF_TYPE_INVALID"
      };
    }

    if (!title) {
      return {
        ok: false,
        error: "RESUME_PROOF_TITLE_REQUIRED"
      };
    }

    const now = Date.now();

    const proof: ResumeProofRecord = {
      proof_id: makeResumeProofId(),

      actor_private_id,
      actor_public_id,

      job_id,
      moment_id,
      footprint_id,
      ping_id,
      counterclaim_id,
      proximity_id,

      type,
      status: "recorded",
      visibility,
      source_organ,

      title,
      summary,

      skill_tags: normalizeSkillTags(request.skill_tags ?? []),
      evidence: normalizeEvidenceList(request.evidence ?? [], now),

      occurred_at_ms: cleanTimeOrDefault(request.occurred_at_ms ?? null, now),
      created_at_ms: now,
      updated_at_ms: now,

      verified_at_ms: null,
      disputed_at_ms: null,
      rejected_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      resolution_note: null,

      data: cloneData(request.data ?? {})
    };

    this.proofs.set(proof.proof_id, cloneProof(proof));

    this.addIndex(this.privateActorIndex, actor_private_id, proof.proof_id);

    if (actor_public_id) {
      this.addIndex(this.publicActorIndex, actor_public_id, proof.proof_id);
    }

    if (job_id) {
      this.addIndex(this.jobIndex, job_id, proof.proof_id);
    }

    for (const skill of proof.skill_tags) {
      this.addIndex(this.skillIndex, skill.tag, proof.proof_id);
    }

    return {
      ok: true,
      proof: cloneProof(proof)
    };
  }

  async verify(
    proof_id: string,
    note: string | null = null
  ): Promise<ResumeProofResult> {
    return this.transition(proof_id, "verified", note);
  }

  async dispute(
    proof_id: string,
    note: string | null = null
  ): Promise<ResumeProofResult> {
    return this.transition(proof_id, "disputed", note);
  }

  async reject(
    proof_id: string,
    note: string | null = null
  ): Promise<ResumeProofResult> {
    return this.transition(proof_id, "rejected", note);
  }

  async seal(
    proof_id: string
  ): Promise<ResumeProofResult> {
    return this.transition(proof_id, "sealed", null);
  }

  async burn(
    proof_id: string
  ): Promise<ResumeProofResult> {
    return this.transition(proof_id, "burned", null);
  }

  async addEvidence(
    proof_id: string,
    evidence: ResumeProofEvidenceInput
  ): Promise<ResumeProofResult> {
    const proof = this.proofs.get(cleanId(proof_id));

    if (!proof) {
      return {
        ok: false,
        error: "RESUME_PROOF_NOT_FOUND"
      };
    }

    if (proof.status === "burned" || proof.status === "sealed") {
      return {
        ok: false,
        error: "RESUME_PROOF_LOCKED"
      };
    }

    const item = normalizeEvidence(evidence, Date.now());

    if (!item) {
      return {
        ok: false,
        error: "EVIDENCE_INVALID"
      };
    }

    proof.evidence.push(item);
    proof.updated_at_ms = Date.now();

    return {
      ok: true,
      proof: cloneProof(proof)
    };
  }

  async addSkillTag(
    proof_id: string,
    skill: ResumeSkillTagInput
  ): Promise<ResumeProofResult> {
    const proof = this.proofs.get(cleanId(proof_id));

    if (!proof) {
      return {
        ok: false,
        error: "RESUME_PROOF_NOT_FOUND"
      };
    }

    if (proof.status === "burned" || proof.status === "sealed") {
      return {
        ok: false,
        error: "RESUME_PROOF_LOCKED"
      };
    }

    const tag = normalizeSkillTag(skill);

    if (!tag) {
      return {
        ok: false,
        error: "SKILL_TAG_INVALID"
      };
    }

    const existing = proof.skill_tags.find(
      (item) => item.tag === tag.tag
    );

    if (existing) {
      existing.weight = Math.max(existing.weight, tag.weight);
      existing.source = existing.source ?? tag.source;
    } else {
      proof.skill_tags.push(tag);
    }

    proof.updated_at_ms = Date.now();

    this.addIndex(this.skillIndex, tag.tag, proof.proof_id);

    return {
      ok: true,
      proof: cloneProof(proof)
    };
  }

  async get(
    proof_id: string
  ): Promise<ResumeProofRecord | null> {
    const proof = this.proofs.get(cleanId(proof_id));
    return proof ? cloneProof(proof) : null;
  }

  async listForActor(
    actor_private_id: string
  ): Promise<ResumeProofListResult> {
    const cleanActor = cleanId(actor_private_id);

    if (!cleanActor) {
      return {
        ok: false,
        proofs: [],
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.privateActorIndex.get(cleanActor) ?? new Set<string>();

    return {
      ok: true,
      proofs: this.recordsFromIds(ids)
    };
  }

  async listForPublicActor(
    actor_public_id: string
  ): Promise<ResumeProofListResult> {
    const cleanPublic = cleanId(actor_public_id);

    if (!cleanPublic) {
      return {
        ok: false,
        proofs: [],
        error: "ACTOR_PUBLIC_ID_REQUIRED"
      };
    }

    const ids = this.publicActorIndex.get(cleanPublic) ?? new Set<string>();

    return {
      ok: true,
      proofs: this.recordsFromIds(ids).filter(
        (proof) => proof.visibility === "public"
      )
    };
  }

  async listForJob(
    job_id: string
  ): Promise<ResumeProofListResult> {
    const cleanJob = cleanId(job_id);

    if (!cleanJob) {
      return {
        ok: false,
        proofs: [],
        error: "JOB_ID_REQUIRED"
      };
    }

    const ids = this.jobIndex.get(cleanJob) ?? new Set<string>();

    return {
      ok: true,
      proofs: this.recordsFromIds(ids)
    };
  }

  async listBySkill(
    skill_tag: string
  ): Promise<ResumeProofListResult> {
    const cleanSkill = cleanSkillTag(skill_tag);

    if (!cleanSkill) {
      return {
        ok: false,
        proofs: [],
        error: "SKILL_TAG_REQUIRED"
      };
    }

    const ids = this.skillIndex.get(cleanSkill) ?? new Set<string>();

    return {
      ok: true,
      proofs: this.recordsFromIds(ids)
    };
  }

  async publicCard(
    proof_id: string
  ): Promise<ResumeProofPublicCard | null> {
    const proof = this.proofs.get(cleanId(proof_id));

    if (!proof) {
      return null;
    }

    if (proof.visibility !== "public") {
      return null;
    }

    if (proof.status === "burned" || proof.status === "rejected") {
      return null;
    }

    return {
      proof_id: proof.proof_id,
      actor_public_id: proof.actor_public_id ?? null,
      type: proof.type,
      title: proof.title,
      summary: proof.summary ?? null,
      skill_tags: proof.skill_tags.map(cloneSkillTag),
      occurred_at_ms: proof.occurred_at_ms,
      status: proof.status
    };
  }

  reset(): void {
    this.proofs.clear();
    this.privateActorIndex.clear();
    this.publicActorIndex.clear();
    this.jobIndex.clear();
    this.skillIndex.clear();
  }

  private async transition(
    proof_id: string,
    status: ResumeProofStatus,
    note: string | null
  ): Promise<ResumeProofResult> {
    const proof = this.proofs.get(cleanId(proof_id));

    if (!proof) {
      return {
        ok: false,
        error: "RESUME_PROOF_NOT_FOUND"
      };
    }

    if (!canMove(proof.status, status)) {
      return {
        ok: false,
        error: "RESUME_PROOF_STATE_LOCKED"
      };
    }

    const now = Date.now();

    proof.status = status;
    proof.updated_at_ms = now;
    proof.resolution_note = cleanNullableText(note, 4000);

    if (status === "verified") proof.verified_at_ms = now;
    if (status === "disputed") proof.disputed_at_ms = now;
    if (status === "rejected") proof.rejected_at_ms = now;
    if (status === "sealed") proof.sealed_at_ms = now;
    if (status === "burned") proof.burned_at_ms = now;

    return {
      ok: true,
      proof: cloneProof(proof)
    };
  }

  private recordsFromIds(ids: Set<string>): ResumeProofRecord[] {
    return Array.from(ids)
      .map((id) => this.proofs.get(id))
      .filter((proof): proof is ResumeProofRecord => Boolean(proof))
      .map(cloneProof)
      .sort((a, b) => b.occurred_at_ms - a.occurred_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    proof_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(proof_id);
    index.set(key, existing);
  }
}

export const CyberCrowdResumeProof =
  new InMemoryResumeProofOrgan();

export function isResumeProofType(
  value: unknown
): value is ResumeProofType {
  return (
    value === "job-completed" ||
    value === "job-accepted" ||
    value === "showed-up" ||
    value === "before-after" ||
    value === "media-proof" ||
    value === "reference" ||
    value === "counterclaim" ||
    value === "footprint" ||
    value === "moment" ||
    value === "proximity" ||
    value === "skill-tag" ||
    value === "training" ||
    value === "license" ||
    value === "other"
  );
}

export function isResumeProofStatus(
  value: unknown
): value is ResumeProofStatus {
  return (
    value === "recorded" ||
    value === "verified" ||
    value === "disputed" ||
    value === "rejected" ||
    value === "sealed" ||
    value === "burned"
  );
}

function canMove(
  from: ResumeProofStatus,
  to: ResumeProofStatus
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

  if (from === "recorded") {
    return (
      to === "verified" ||
      to === "disputed" ||
      to === "rejected" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "verified") {
    return (
      to === "disputed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "disputed") {
    return (
      to === "verified" ||
      to === "rejected" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "rejected") {
    return to === "burned";
  }

  return false;
}

function normalizeEvidenceList(
  evidence: ResumeProofEvidenceInput[],
  now: number
): ResumeProofEvidence[] {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .map((item) => normalizeEvidence(item, now))
    .filter((item): item is ResumeProofEvidence => Boolean(item))
    .slice(0, 100);
}

function normalizeEvidence(
  evidence: ResumeProofEvidenceInput,
  now: number
): ResumeProofEvidence | null {
  if (!evidence || typeof evidence !== "object") {
    return null;
  }

  if (!isEvidenceKind(evidence.kind)) {
    return null;
  }

  const ref_id = cleanNullableId(evidence.ref_id ?? null);
  const text = cleanNullableText(evidence.text ?? null, 4000);

  if (!ref_id && !text) {
    return null;
  }

  return {
    evidence_id: makeEvidenceId(),
    kind: evidence.kind,
    ref_id,
    text,
    added_at_ms: now
  };
}

function isEvidenceKind(
  value: unknown
): value is ResumeProofEvidence["kind"] {
  return (
    value === "job" ||
    value === "footprint" ||
    value === "moment" ||
    value === "ping" ||
    value === "counterclaim" ||
    value === "proximity" ||
    value === "media" ||
    value === "reference" ||
    value === "note" ||
    value === "other"
  );
}

function normalizeSkillTags(
  skills: ResumeSkillTagInput[]
): ResumeSkillTag[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const byTag = new Map<string, ResumeSkillTag>();

  for (const skill of skills) {
    const tag = normalizeSkillTag(skill);

    if (!tag) continue;

    const existing = byTag.get(tag.tag);

    if (!existing) {
      byTag.set(tag.tag, tag);
      continue;
    }

    existing.weight = Math.max(existing.weight, tag.weight);
    existing.source = existing.source ?? tag.source;
  }

  return Array.from(byTag.values()).slice(0, 50);
}

function normalizeSkillTag(
  skill: ResumeSkillTagInput
): ResumeSkillTag | null {
  if (!skill || typeof skill !== "object") {
    return null;
  }

  const tag = cleanSkillTag(skill.tag);

  if (!tag) {
    return null;
  }

  return {
    tag,
    weight: normalizeWeight(skill.weight ?? 1),
    source: cleanNullableText(skill.source ?? null, 180)
  };
}

function cleanResumeProofType(
  value: unknown
): ResumeProofType | null {
  return isResumeProofType(value) ? value : null;
}

function cleanVisibility(
  value: unknown
): ResumeProofVisibility {
  if (
    value === "private" ||
    value === "public" ||
    value === "limited"
  ) {
    return value;
  }

  return "private";
}

function cleanSourceOrgan(
  value: unknown
): ResumeProofSourceOrgan {
  if (
    value === "jobs" ||
    value === "footprint" ||
    value === "moment" ||
    value === "ping" ||
    value === "counterclaim" ||
    value === "proximity" ||
    value === "media" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function makeResumeProofId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "resume-proof-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function makeEvidenceId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "resume-evidence-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneProof(
  proof: ResumeProofRecord
): ResumeProofRecord {
  return {
    proof_id: proof.proof_id,

    actor_private_id: proof.actor_private_id,
    actor_public_id: proof.actor_public_id ?? null,

    job_id: proof.job_id ?? null,
    moment_id: proof.moment_id ?? null,
    footprint_id: proof.footprint_id ?? null,
    ping_id: proof.ping_id ?? null,
    counterclaim_id: proof.counterclaim_id ?? null,
    proximity_id: proof.proximity_id ?? null,

    type: proof.type,
    status: proof.status,
    visibility: proof.visibility,
    source_organ: proof.source_organ,

    title: proof.title,
    summary: proof.summary ?? null,

    skill_tags: proof.skill_tags.map(cloneSkillTag),
    evidence: proof.evidence.map(cloneEvidence),

    occurred_at_ms: proof.occurred_at_ms,
    created_at_ms: proof.created_at_ms,
    updated_at_ms: proof.updated_at_ms,

    verified_at_ms: proof.verified_at_ms ?? null,
    disputed_at_ms: proof.disputed_at_ms ?? null,
    rejected_at_ms: proof.rejected_at_ms ?? null,
    sealed_at_ms: proof.sealed_at_ms ?? null,
    burned_at_ms: proof.burned_at_ms ?? null,

    resolution_note: proof.resolution_note ?? null,

    data: cloneData(proof.data)
  };
}

function cloneSkillTag(
  skill: ResumeSkillTag
): ResumeSkillTag {
  return {
    tag: skill.tag,
    weight: skill.weight,
    source: skill.source ?? null
  };
}

function cloneEvidence(
  evidence: ResumeProofEvidence
): ResumeProofEvidence {
  return {
    evidence_id: evidence.evidence_id,
    kind: evidence.kind,
    ref_id: evidence.ref_id ?? null,
    text: evidence.text ?? null,
    added_at_ms: evidence.added_at_ms
  };
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

function normalizeWeight(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  if (value < 0) return 0;
  if (value > 10) return 10;

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

function cleanTimeOrDefault(
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
