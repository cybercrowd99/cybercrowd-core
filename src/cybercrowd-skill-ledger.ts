// src/cybercrowd-skill-ledger.ts
//
// CyberCrowd Skill Ledger Organ
//
// ONE JOB:
// Build a proof-backed skill ledger from resume proof and work history.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
// This is NOT a hidden score.
//
// Skills are supported by proof.
// Skills are not invented claims.
// Skills are not authority.
// Skills are not automatic trust.
//
// Resume Proof records evidence.
// Work History organizes the timeline.
// Skill Ledger organizes the skill trail.

export type SkillLedgerSource =
  | "resume-proof"
  | "work-history"
  | "job"
  | "footprint"
  | "moment"
  | "reference"
  | "manual"
  | "unknown";

export type SkillLedgerStatus =
  | "active"
  | "disputed"
  | "sealed"
  | "hidden"
  | "burned";

export type SkillLedgerVisibility =
  | "private"
  | "public"
  | "limited";

export interface SkillLedgerProofRef {
  ref_id: string;
  source: SkillLedgerSource;
  status: string;
  occurred_at_ms: number;
}

export interface SkillLedgerRecord {
  skill_id: string;

  actor_private_id: string;
  actor_public_id: string | null;

  tag: string;
  label: string;

  status: SkillLedgerStatus;
  visibility: SkillLedgerVisibility;

  source: SkillLedgerSource;

  proof_refs: SkillLedgerProofRef[];

  weight: number;
  proof_count: number;

  first_seen_at_ms: number;
  last_seen_at_ms: number;
  created_at_ms: number;
  updated_at_ms: number;

  sealed_at_ms: number | null;
  hidden_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface AddSkillLedgerRequest {
  actor_private_id: string;
  actor_public_id?: string | null;

  tag: string;
  label?: string | null;

  source?: SkillLedgerSource;
  visibility?: SkillLedgerVisibility;

  proof_ref?: SkillLedgerProofRefInput | null;

  weight?: number;
  occurred_at_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface SkillLedgerProofRefInput {
  ref_id: string;
  source?: SkillLedgerSource;
  status?: string;
  occurred_at_ms?: number | null;
}

export interface SkillLedgerResult {
  ok: boolean;
  skill?: SkillLedgerRecord;
  error?: string;
}

export interface SkillLedgerListResult {
  ok: boolean;
  skills: SkillLedgerRecord[];
  error?: string;
}

export interface PublicSkillLedgerRecord {
  skill_id: string;
  actor_public_id: string | null;
  tag: string;
  label: string;
  proof_count: number;
  first_seen_at_ms: number;
  last_seen_at_ms: number;
}

export interface SkillLedgerOrgan {
  add(request: AddSkillLedgerRequest): Promise<SkillLedgerResult>;

  dispute(skill_id: string): Promise<SkillLedgerResult>;

  seal(skill_id: string): Promise<SkillLedgerResult>;

  hide(skill_id: string): Promise<SkillLedgerResult>;

  burn(skill_id: string): Promise<SkillLedgerResult>;

  addProof(
    skill_id: string,
    proof: SkillLedgerProofRefInput
  ): Promise<SkillLedgerResult>;

  get(skill_id: string): Promise<SkillLedgerRecord | null>;

  listPrivate(
    actor_private_id: string
  ): Promise<SkillLedgerListResult>;

  listPublic(
    actor_public_id: string
  ): Promise<PublicSkillLedgerRecord[]>;

  listByTag(
    tag: string
  ): Promise<SkillLedgerListResult>;
}

export class InMemorySkillLedgerOrgan implements SkillLedgerOrgan {
  private readonly skills = new Map<string, SkillLedgerRecord>();
  private readonly actorTagIndex = new Map<string, string>();
  private readonly privateActorIndex = new Map<string, Set<string>>();
  private readonly publicActorIndex = new Map<string, Set<string>>();
  private readonly tagIndex = new Map<string, Set<string>>();

  async add(
    request: AddSkillLedgerRequest
  ): Promise<SkillLedgerResult> {
    const actor_private_id = cleanId(request?.actor_private_id);
    const actor_public_id = cleanNullableId(request?.actor_public_id ?? null);

    const tag = cleanSkillTag(request?.tag);
    const label = cleanLabel(request?.label ?? request?.tag ?? "");

    const source = cleanSource(request?.source ?? "unknown");
    const visibility = cleanVisibility(request?.visibility ?? "private");

    const weight = normalizeWeight(request?.weight ?? 1);
    const now = Date.now();
    const occurred_at_ms = cleanTimeOrDefault(
      request?.occurred_at_ms ?? null,
      now
    );

    if (!actor_private_id) {
      return {
        ok: false,
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    if (!tag) {
      return {
        ok: false,
        error: "SKILL_TAG_REQUIRED"
      };
    }

    const existingId = this.actorTagIndex.get(
      makeActorTagKey(actor_private_id, tag)
    );

    if (existingId) {
      return this.mergeExisting(
        existingId,
        {
          actor_private_id,
          actor_public_id,
          tag,
          label,
          source,
          visibility,
          proof_ref: request?.proof_ref ?? null,
          weight,
          occurred_at_ms,
          data: request?.data ?? {}
        }
      );
    }

    const proofRefs = normalizeProofRefs(
      request?.proof_ref ? [request.proof_ref] : [],
      occurred_at_ms
    );

    const skill: SkillLedgerRecord = {
      skill_id: makeSkillId(),

      actor_private_id,
      actor_public_id,

      tag,
      label,

      status: "active",
      visibility,

      source,

      proof_refs: proofRefs,

      weight,
      proof_count: proofRefs.length,

      first_seen_at_ms: occurred_at_ms,
      last_seen_at_ms: occurred_at_ms,
      created_at_ms: now,
      updated_at_ms: now,

      sealed_at_ms: null,
      hidden_at_ms: null,
      burned_at_ms: null,

      data: cloneData(request?.data ?? {})
    };

    this.skills.set(skill.skill_id, cloneSkill(skill));

    this.actorTagIndex.set(
      makeActorTagKey(actor_private_id, tag),
      skill.skill_id
    );

    this.addIndex(this.privateActorIndex, actor_private_id, skill.skill_id);

    if (actor_public_id) {
      this.addIndex(this.publicActorIndex, actor_public_id, skill.skill_id);
    }

    this.addIndex(this.tagIndex, tag, skill.skill_id);

    return {
      ok: true,
      skill: cloneSkill(skill)
    };
  }

  async dispute(
    skill_id: string
  ): Promise<SkillLedgerResult> {
    return this.transition(skill_id, "disputed");
  }

  async seal(
    skill_id: string
  ): Promise<SkillLedgerResult> {
    return this.transition(skill_id, "sealed");
  }

  async hide(
    skill_id: string
  ): Promise<SkillLedgerResult> {
    return this.transition(skill_id, "hidden");
  }

  async burn(
    skill_id: string
  ): Promise<SkillLedgerResult> {
    return this.transition(skill_id, "burned");
  }

  async addProof(
    skill_id: string,
    proof: SkillLedgerProofRefInput
  ): Promise<SkillLedgerResult> {
    const skill = this.skills.get(cleanId(skill_id));

    if (!skill) {
      return {
        ok: false,
        error: "SKILL_NOT_FOUND"
      };
    }

    if (skill.status === "sealed" || skill.status === "burned") {
      return {
        ok: false,
        error: "SKILL_LOCKED"
      };
    }

    const ref = normalizeProofRef(proof, Date.now());

    if (!ref) {
      return {
        ok: false,
        error: "PROOF_REF_INVALID"
      };
    }

    const existing = skill.proof_refs.find(
      (item) => item.ref_id === ref.ref_id && item.source === ref.source
    );

    if (!existing) {
      skill.proof_refs.push(ref);
      skill.proof_count = skill.proof_refs.length;
      skill.last_seen_at_ms = Math.max(skill.last_seen_at_ms, ref.occurred_at_ms);
      skill.first_seen_at_ms = Math.min(skill.first_seen_at_ms, ref.occurred_at_ms);
    }

    skill.updated_at_ms = Date.now();

    return {
      ok: true,
      skill: cloneSkill(skill)
    };
  }

  async get(
    skill_id: string
  ): Promise<SkillLedgerRecord | null> {
    const skill = this.skills.get(cleanId(skill_id));
    return skill ? cloneSkill(skill) : null;
  }

  async listPrivate(
    actor_private_id: string
  ): Promise<SkillLedgerListResult> {
    const cleanActor = cleanId(actor_private_id);

    if (!cleanActor) {
      return {
        ok: false,
        skills: [],
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.privateActorIndex.get(cleanActor) ?? new Set<string>();

    return {
      ok: true,
      skills: this.recordsFromIds(ids)
    };
  }

  async listPublic(
    actor_public_id: string
  ): Promise<PublicSkillLedgerRecord[]> {
    const cleanPublic = cleanId(actor_public_id);

    if (!cleanPublic) {
      return [];
    }

    const ids = this.publicActorIndex.get(cleanPublic) ?? new Set<string>();

    return this.recordsFromIds(ids)
      .filter((skill) => skill.visibility === "public")
      .filter((skill) => skill.status !== "hidden")
      .filter((skill) => skill.status !== "burned")
      .map(toPublicSkill);
  }

  async listByTag(
    tag: string
  ): Promise<SkillLedgerListResult> {
    const cleanTag = cleanSkillTag(tag);

    if (!cleanTag) {
      return {
        ok: false,
        skills: [],
        error: "SKILL_TAG_REQUIRED"
      };
    }

    const ids = this.tagIndex.get(cleanTag) ?? new Set<string>();

    return {
      ok: true,
      skills: this.recordsFromIds(ids)
    };
  }

  reset(): void {
    this.skills.clear();
    this.actorTagIndex.clear();
    this.privateActorIndex.clear();
    this.publicActorIndex.clear();
    this.tagIndex.clear();
  }

  private async mergeExisting(
    skill_id: string,
    request: {
      actor_private_id: string;
      actor_public_id: string | null;
      tag: string;
      label: string;
      source: SkillLedgerSource;
      visibility: SkillLedgerVisibility;
      proof_ref: SkillLedgerProofRefInput | null;
      weight: number;
      occurred_at_ms: number;
      data: Record<string, unknown>;
    }
  ): Promise<SkillLedgerResult> {
    const skill = this.skills.get(skill_id);

    if (!skill) {
      return {
        ok: false,
        error: "SKILL_NOT_FOUND"
      };
    }

    if (skill.status === "sealed" || skill.status === "burned") {
      return {
        ok: false,
        error: "SKILL_LOCKED"
      };
    }

    skill.weight = Math.max(skill.weight, request.weight);
    skill.label = skill.label || request.label;
    skill.last_seen_at_ms = Math.max(skill.last_seen_at_ms, request.occurred_at_ms);
    skill.first_seen_at_ms = Math.min(skill.first_seen_at_ms, request.occurred_at_ms);
    skill.updated_at_ms = Date.now();

    if (request.actor_public_id && !skill.actor_public_id) {
      skill.actor_public_id = request.actor_public_id;
      this.addIndex(this.publicActorIndex, request.actor_public_id, skill.skill_id);
    }

    if (skill.visibility !== "public" && request.visibility === "public") {
      skill.visibility = "public";
    }

    if (request.proof_ref) {
      const ref = normalizeProofRef(request.proof_ref, request.occurred_at_ms);

      if (ref) {
        const exists = skill.proof_refs.some(
          (item) => item.ref_id === ref.ref_id && item.source === ref.source
        );

        if (!exists) {
          skill.proof_refs.push(ref);
        }
      }
    }

    skill.proof_count = skill.proof_refs.length;

    skill.data = {
      ...cloneData(skill.data),
      ...cloneData(request.data)
    };

    return {
      ok: true,
      skill: cloneSkill(skill)
    };
  }

  private async transition(
    skill_id: string,
    status: SkillLedgerStatus
  ): Promise<SkillLedgerResult> {
    const skill = this.skills.get(cleanId(skill_id));

    if (!skill) {
      return {
        ok: false,
        error: "SKILL_NOT_FOUND"
      };
    }

    if (!canMove(skill.status, status)) {
      return {
        ok: false,
        error: "SKILL_STATE_LOCKED"
      };
    }

    const now = Date.now();

    skill.status = status;
    skill.updated_at_ms = now;

    if (status === "sealed") skill.sealed_at_ms = now;
    if (status === "hidden") skill.hidden_at_ms = now;
    if (status === "burned") skill.burned_at_ms = now;

    return {
      ok: true,
      skill: cloneSkill(skill)
    };
  }

  private recordsFromIds(ids: Set<string>): SkillLedgerRecord[] {
    return Array.from(ids)
      .map((id) => this.skills.get(id))
      .filter((skill): skill is SkillLedgerRecord => Boolean(skill))
      .map(cloneSkill)
      .sort((a, b) => b.last_seen_at_ms - a.last_seen_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    skill_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(skill_id);
    index.set(key, existing);
  }
}

export const CyberCrowdSkillLedger =
  new InMemorySkillLedgerOrgan();

export function isSkillLedgerSource(
  value: unknown
): value is SkillLedgerSource {
  return (
    value === "resume-proof" ||
    value === "work-history" ||
    value === "job" ||
    value === "footprint" ||
    value === "moment" ||
    value === "reference" ||
    value === "manual" ||
    value === "unknown"
  );
}

export function isSkillLedgerStatus(
  value: unknown
): value is SkillLedgerStatus {
  return (
    value === "active" ||
    value === "disputed" ||
    value === "sealed" ||
    value === "hidden" ||
    value === "burned"
  );
}

function canMove(
  from: SkillLedgerStatus,
  to: SkillLedgerStatus
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

  if (from === "active") {
    return (
      to === "disputed" ||
      to === "sealed" ||
      to === "hidden" ||
      to === "burned"
    );
  }

  if (from === "disputed") {
    return (
      to === "active" ||
      to === "hidden" ||
      to === "burned"
    );
  }

  if (from === "hidden") {
    return (
      to === "active" ||
      to === "burned"
    );
  }

  return false;
}

function normalizeProofRefs(
  refs: SkillLedgerProofRefInput[],
  fallbackTime: number
): SkillLedgerProofRef[] {
  if (!Array.isArray(refs)) {
    return [];
  }

  const byRef = new Map<string, SkillLedgerProofRef>();

  for (const ref of refs) {
    const clean = normalizeProofRef(ref, fallbackTime);

    if (!clean) continue;

    byRef.set(clean.source + ":" + clean.ref_id, clean);
  }

  return Array.from(byRef.values()).slice(0, 100);
}

function normalizeProofRef(
  ref: SkillLedgerProofRefInput,
  fallbackTime: number
): SkillLedgerProofRef | null {
  if (!ref || typeof ref !== "object") {
    return null;
  }

  const ref_id = cleanId(ref.ref_id);

  if (!ref_id) {
    return null;
  }

  return {
    ref_id,
    source: cleanSource(ref.source ?? "unknown"),
    status: cleanText(ref.status ?? "recorded", 80) || "recorded",
    occurred_at_ms: cleanTimeOrDefault(ref.occurred_at_ms ?? null, fallbackTime)
  };
}

function toPublicSkill(
  skill: SkillLedgerRecord
): PublicSkillLedgerRecord {
  return {
    skill_id: skill.skill_id,
    actor_public_id: skill.actor_public_id ?? null,
    tag: skill.tag,
    label: skill.label,
    proof_count: skill.proof_count,
    first_seen_at_ms: skill.first_seen_at_ms,
    last_seen_at_ms: skill.last_seen_at_ms
  };
}

function cloneSkill(
  skill: SkillLedgerRecord
): SkillLedgerRecord {
  return {
    skill_id: skill.skill_id,

    actor_private_id: skill.actor_private_id,
    actor_public_id: skill.actor_public_id ?? null,

    tag: skill.tag,
    label: skill.label,

    status: skill.status,
    visibility: skill.visibility,

    source: skill.source,

    proof_refs: skill.proof_refs.map(cloneProofRef),

    weight: skill.weight,
    proof_count: skill.proof_count,

    first_seen_at_ms: skill.first_seen_at_ms,
    last_seen_at_ms: skill.last_seen_at_ms,
    created_at_ms: skill.created_at_ms,
    updated_at_ms: skill.updated_at_ms,

    sealed_at_ms: skill.sealed_at_ms ?? null,
    hidden_at_ms: skill.hidden_at_ms ?? null,
    burned_at_ms: skill.burned_at_ms ?? null,

    data: cloneData(skill.data)
  };
}

function cloneProofRef(
  ref: SkillLedgerProofRef
): SkillLedgerProofRef {
  return {
    ref_id: ref.ref_id,
    source: ref.source,
    status: ref.status,
    occurred_at_ms: ref.occurred_at_ms
  };
}

function cleanSource(
  value: unknown
): SkillLedgerSource {
  return isSkillLedgerSource(value) ? value : "unknown";
}

function cleanVisibility(
  value: unknown
): SkillLedgerVisibility {
  if (
    value === "private" ||
    value === "public" ||
    value === "limited"
  ) {
    return value;
  }

  return "private";
}

function makeSkillId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "skill-ledger-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function makeActorTagKey(
  actor_private_id: string,
  tag: string
): string {
  return actor_private_id + "::" + tag;
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

function cleanLabel(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
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
