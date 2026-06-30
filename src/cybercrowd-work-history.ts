// src/cybercrowd-work-history.ts
//
// CyberCrowd Work History Organ
//
// ONE JOB:
// Compile proof-backed resume records into readable work history.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// Work history is assembled from proof.
// Work history does not invent claims.
// Work history does not expose protected identity.
// Work history does not grant authority.
//
// Resume Proof records the evidence.
// Work History organizes that evidence into a timeline.

export type WorkHistoryEntryType =
  | "job"
  | "service"
  | "creator-work"
  | "training"
  | "license"
  | "reference"
  | "proof"
  | "other";

export type WorkHistoryVisibility =
  | "private"
  | "public"
  | "limited";

export type WorkHistoryStatus =
  | "draft"
  | "active"
  | "sealed"
  | "disputed"
  | "hidden"
  | "burned";

export interface WorkHistoryProofRef {
  proof_id: string;
  type: string;
  status: string;
  visibility: string;
  occurred_at_ms: number;
}

export interface WorkHistorySkillTag {
  tag: string;
  weight: number;
}

export interface WorkHistoryEntry {
  entry_id: string;

  actor_private_id: string;
  actor_public_id: string | null;

  type: WorkHistoryEntryType;
  status: WorkHistoryStatus;
  visibility: WorkHistoryVisibility;

  title: string;
  summary: string | null;

  job_id: string | null;
  surface_id: string | null;
  moment_id: string | null;

  proof_refs: WorkHistoryProofRef[];
  skill_tags: WorkHistorySkillTag[];

  started_at_ms: number | null;
  ended_at_ms: number | null;
  occurred_at_ms: number;

  created_at_ms: number;
  updated_at_ms: number;
  sealed_at_ms: number | null;
  hidden_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface CreateWorkHistoryEntryRequest {
  actor_private_id: string;
  actor_public_id?: string | null;

  type: WorkHistoryEntryType;
  visibility?: WorkHistoryVisibility;
  status?: WorkHistoryStatus;

  title: string;
  summary?: string | null;

  job_id?: string | null;
  surface_id?: string | null;
  moment_id?: string | null;

  proof_refs?: WorkHistoryProofRefInput[];
  skill_tags?: WorkHistorySkillTagInput[];

  started_at_ms?: number | null;
  ended_at_ms?: number | null;
  occurred_at_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface WorkHistoryProofRefInput {
  proof_id: string;
  type?: string;
  status?: string;
  visibility?: string;
  occurred_at_ms?: number | null;
}

export interface WorkHistorySkillTagInput {
  tag: string;
  weight?: number;
}

export interface WorkHistoryResult {
  ok: boolean;
  entry?: WorkHistoryEntry;
  error?: string;
}

export interface WorkHistoryListResult {
  ok: boolean;
  entries: WorkHistoryEntry[];
  error?: string;
}

export interface PublicWorkHistoryEntry {
  entry_id: string;
  actor_public_id: string | null;
  type: WorkHistoryEntryType;
  title: string;
  summary: string | null;
  skill_tags: WorkHistorySkillTag[];
  occurred_at_ms: number;
  started_at_ms: number | null;
  ended_at_ms: number | null;
  proof_count: number;
}

export interface WorkHistoryOrgan {
  create(request: CreateWorkHistoryEntryRequest): Promise<WorkHistoryResult>;

  seal(entry_id: string): Promise<WorkHistoryResult>;

  dispute(entry_id: string): Promise<WorkHistoryResult>;

  hide(entry_id: string): Promise<WorkHistoryResult>;

  burn(entry_id: string): Promise<WorkHistoryResult>;

  addProof(
    entry_id: string,
    proof: WorkHistoryProofRefInput
  ): Promise<WorkHistoryResult>;

  addSkill(
    entry_id: string,
    skill: WorkHistorySkillTagInput
  ): Promise<WorkHistoryResult>;

  get(entry_id: string): Promise<WorkHistoryEntry | null>;

  listPrivate(
    actor_private_id: string
  ): Promise<WorkHistoryListResult>;

  listPublic(
    actor_public_id: string
  ): Promise<PublicWorkHistoryEntry[]>;

  listBySkill(
    skill_tag: string
  ): Promise<WorkHistoryListResult>;

  listByJob(
    job_id: string
  ): Promise<WorkHistoryListResult>;
}

export class InMemoryWorkHistoryOrgan implements WorkHistoryOrgan {
  private readonly entries = new Map<string, WorkHistoryEntry>();
  private readonly privateActorIndex = new Map<string, Set<string>>();
  private readonly publicActorIndex = new Map<string, Set<string>>();
  private readonly skillIndex = new Map<string, Set<string>>();
  private readonly jobIndex = new Map<string, Set<string>>();

  async create(
    request: CreateWorkHistoryEntryRequest
  ): Promise<WorkHistoryResult> {
    const actor_private_id = cleanId(request?.actor_private_id);
    const actor_public_id = cleanNullableId(request?.actor_public_id ?? null);

    const type = cleanEntryType(request?.type);
    const visibility = cleanVisibility(request?.visibility ?? "private");
    const status = cleanInitialStatus(request?.status ?? "active");

    const title = cleanText(request?.title ?? "", 240);
    const summary = cleanNullableText(request?.summary ?? null, 2000);

    const job_id = cleanNullableId(request?.job_id ?? null);
    const surface_id = cleanNullableId(request?.surface_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);

    if (!actor_private_id) {
      return {
        ok: false,
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    if (!type) {
      return {
        ok: false,
        error: "WORK_HISTORY_TYPE_INVALID"
      };
    }

    if (!title) {
      return {
        ok: false,
        error: "WORK_HISTORY_TITLE_REQUIRED"
      };
    }

    const now = Date.now();

    const entry: WorkHistoryEntry = {
      entry_id: makeWorkHistoryEntryId(),

      actor_private_id,
      actor_public_id,

      type,
      status,
      visibility,

      title,
      summary,

      job_id,
      surface_id,
      moment_id,

      proof_refs: normalizeProofRefs(request.proof_refs ?? [], now),
      skill_tags: normalizeSkillTags(request.skill_tags ?? []),

      started_at_ms: cleanTimeOrNull(request.started_at_ms ?? null),
      ended_at_ms: cleanTimeOrNull(request.ended_at_ms ?? null),
      occurred_at_ms: cleanTimeOrDefault(request.occurred_at_ms ?? null, now),

      created_at_ms: now,
      updated_at_ms: now,
      sealed_at_ms: null,
      hidden_at_ms: null,
      burned_at_ms: null,

      data: cloneData(request.data ?? {})
    };

    this.entries.set(entry.entry_id, cloneEntry(entry));

    this.addIndex(this.privateActorIndex, actor_private_id, entry.entry_id);

    if (actor_public_id) {
      this.addIndex(this.publicActorIndex, actor_public_id, entry.entry_id);
    }

    if (job_id) {
      this.addIndex(this.jobIndex, job_id, entry.entry_id);
    }

    for (const skill of entry.skill_tags) {
      this.addIndex(this.skillIndex, skill.tag, entry.entry_id);
    }

    return {
      ok: true,
      entry: cloneEntry(entry)
    };
  }

  async seal(entry_id: string): Promise<WorkHistoryResult> {
    return this.transition(entry_id, "sealed");
  }

  async dispute(entry_id: string): Promise<WorkHistoryResult> {
    return this.transition(entry_id, "disputed");
  }

  async hide(entry_id: string): Promise<WorkHistoryResult> {
    return this.transition(entry_id, "hidden");
  }

  async burn(entry_id: string): Promise<WorkHistoryResult> {
    return this.transition(entry_id, "burned");
  }

  async addProof(
    entry_id: string,
    proof: WorkHistoryProofRefInput
  ): Promise<WorkHistoryResult> {
    const entry = this.entries.get(cleanId(entry_id));

    if (!entry) {
      return {
        ok: false,
        error: "WORK_HISTORY_ENTRY_NOT_FOUND"
      };
    }

    if (entry.status === "sealed" || entry.status === "burned") {
      return {
        ok: false,
        error: "WORK_HISTORY_ENTRY_LOCKED"
      };
    }

    const ref = normalizeProofRef(proof, Date.now());

    if (!ref) {
      return {
        ok: false,
        error: "PROOF_REF_INVALID"
      };
    }

    const existing = entry.proof_refs.find(
      (item) => item.proof_id === ref.proof_id
    );

    if (!existing) {
      entry.proof_refs.push(ref);
    }

    entry.updated_at_ms = Date.now();

    return {
      ok: true,
      entry: cloneEntry(entry)
    };
  }

  async addSkill(
    entry_id: string,
    skill: WorkHistorySkillTagInput
  ): Promise<WorkHistoryResult> {
    const entry = this.entries.get(cleanId(entry_id));

    if (!entry) {
      return {
        ok: false,
        error: "WORK_HISTORY_ENTRY_NOT_FOUND"
      };
    }

    if (entry.status === "sealed" || entry.status === "burned") {
      return {
        ok: false,
        error: "WORK_HISTORY_ENTRY_LOCKED"
      };
    }

    const tag = normalizeSkillTag(skill);

    if (!tag) {
      return {
        ok: false,
        error: "SKILL_TAG_INVALID"
      };
    }

    const existing = entry.skill_tags.find(
      (item) => item.tag === tag.tag
    );

    if (existing) {
      existing.weight = Math.max(existing.weight, tag.weight);
    } else {
      entry.skill_tags.push(tag);
    }

    this.addIndex(this.skillIndex, tag.tag, entry.entry_id);

    entry.updated_at_ms = Date.now();

    return {
      ok: true,
      entry: cloneEntry(entry)
    };
  }

  async get(
    entry_id: string
  ): Promise<WorkHistoryEntry | null> {
    const entry = this.entries.get(cleanId(entry_id));
    return entry ? cloneEntry(entry) : null;
  }

  async listPrivate(
    actor_private_id: string
  ): Promise<WorkHistoryListResult> {
    const cleanActor = cleanId(actor_private_id);

    if (!cleanActor) {
      return {
        ok: false,
        entries: [],
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.privateActorIndex.get(cleanActor) ?? new Set<string>();

    return {
      ok: true,
      entries: this.recordsFromIds(ids)
    };
  }

  async listPublic(
    actor_public_id: string
  ): Promise<PublicWorkHistoryEntry[]> {
    const cleanPublic = cleanId(actor_public_id);

    if (!cleanPublic) {
      return [];
    }

    const ids = this.publicActorIndex.get(cleanPublic) ?? new Set<string>();

    return this.recordsFromIds(ids)
      .filter((entry) => entry.visibility === "public")
      .filter((entry) => entry.status !== "hidden")
      .filter((entry) => entry.status !== "burned")
      .map(toPublicEntry);
  }

  async listBySkill(
    skill_tag: string
  ): Promise<WorkHistoryListResult> {
    const cleanSkill = cleanSkillTag(skill_tag);

    if (!cleanSkill) {
      return {
        ok: false,
        entries: [],
        error: "SKILL_TAG_REQUIRED"
      };
    }

    const ids = this.skillIndex.get(cleanSkill) ?? new Set<string>();

    return {
      ok: true,
      entries: this.recordsFromIds(ids)
    };
  }

  async listByJob(
    job_id: string
  ): Promise<WorkHistoryListResult> {
    const cleanJob = cleanId(job_id);

    if (!cleanJob) {
      return {
        ok: false,
        entries: [],
        error: "JOB_ID_REQUIRED"
      };
    }

    const ids = this.jobIndex.get(cleanJob) ?? new Set<string>();

    return {
      ok: true,
      entries: this.recordsFromIds(ids)
    };
  }

  reset(): void {
    this.entries.clear();
    this.privateActorIndex.clear();
    this.publicActorIndex.clear();
    this.skillIndex.clear();
    this.jobIndex.clear();
  }

  private async transition(
    entry_id: string,
    status: WorkHistoryStatus
  ): Promise<WorkHistoryResult> {
    const entry = this.entries.get(cleanId(entry_id));

    if (!entry) {
      return {
        ok: false,
        error: "WORK_HISTORY_ENTRY_NOT_FOUND"
      };
    }

    if (!canMove(entry.status, status)) {
      return {
        ok: false,
        error: "WORK_HISTORY_STATE_LOCKED"
      };
    }

    const now = Date.now();

    entry.status = status;
    entry.updated_at_ms = now;

    if (status === "sealed") entry.sealed_at_ms = now;
    if (status === "hidden") entry.hidden_at_ms = now;
    if (status === "burned") entry.burned_at_ms = now;

    return {
      ok: true,
      entry: cloneEntry(entry)
    };
  }

  private recordsFromIds(ids: Set<string>): WorkHistoryEntry[] {
    return Array.from(ids)
      .map((id) => this.entries.get(id))
      .filter((entry): entry is WorkHistoryEntry => Boolean(entry))
      .map(cloneEntry)
      .sort((a, b) => b.occurred_at_ms - a.occurred_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    entry_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(entry_id);
    index.set(key, existing);
  }
}

export const CyberCrowdWorkHistory =
  new InMemoryWorkHistoryOrgan();

export function isWorkHistoryEntryType(
  value: unknown
): value is WorkHistoryEntryType {
  return (
    value === "job" ||
    value === "service" ||
    value === "creator-work" ||
    value === "training" ||
    value === "license" ||
    value === "reference" ||
    value === "proof" ||
    value === "other"
  );
}

export function isWorkHistoryStatus(
  value: unknown
): value is WorkHistoryStatus {
  return (
    value === "draft" ||
    value === "active" ||
    value === "sealed" ||
    value === "disputed" ||
    value === "hidden" ||
    value === "burned"
  );
}

function canMove(
  from: WorkHistoryStatus,
  to: WorkHistoryStatus
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

  if (from === "draft") {
    return (
      to === "active" ||
      to === "disputed" ||
      to === "hidden" ||
      to === "burned"
    );
  }

  if (from === "active") {
    return (
      to === "sealed" ||
      to === "disputed" ||
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

function toPublicEntry(
  entry: WorkHistoryEntry
): PublicWorkHistoryEntry {
  return {
    entry_id: entry.entry_id,
    actor_public_id: entry.actor_public_id ?? null,
    type: entry.type,
    title: entry.title,
    summary: entry.summary ?? null,
    skill_tags: entry.skill_tags.map(cloneSkillTag),
    occurred_at_ms: entry.occurred_at_ms,
    started_at_ms: entry.started_at_ms ?? null,
    ended_at_ms: entry.ended_at_ms ?? null,
    proof_count: entry.proof_refs.length
  };
}

function normalizeProofRefs(
  refs: WorkHistoryProofRefInput[],
  now: number
): WorkHistoryProofRef[] {
  if (!Array.isArray(refs)) {
    return [];
  }

  const byProof = new Map<string, WorkHistoryProofRef>();

  for (const ref of refs) {
    const clean = normalizeProofRef(ref, now);

    if (!clean) continue;

    byProof.set(clean.proof_id, clean);
  }

  return Array.from(byProof.values()).slice(0, 100);
}

function normalizeProofRef(
  ref: WorkHistoryProofRefInput,
  now: number
): WorkHistoryProofRef | null {
  if (!ref || typeof ref !== "object") {
    return null;
  }

  const proof_id = cleanId(ref.proof_id);

  if (!proof_id) {
    return null;
  }

  return {
    proof_id,
    type: cleanText(ref.type ?? "proof", 80) || "proof",
    status: cleanText(ref.status ?? "recorded", 80) || "recorded",
    visibility: cleanText(ref.visibility ?? "private", 80) || "private",
    occurred_at_ms: cleanTimeOrDefault(ref.occurred_at_ms ?? null, now)
  };
}

function normalizeSkillTags(
  skills: WorkHistorySkillTagInput[]
): WorkHistorySkillTag[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const byTag = new Map<string, WorkHistorySkillTag>();

  for (const skill of skills) {
    const tag = normalizeSkillTag(skill);

    if (!tag) continue;

    const existing = byTag.get(tag.tag);

    if (!existing) {
      byTag.set(tag.tag, tag);
      continue;
    }

    existing.weight = Math.max(existing.weight, tag.weight);
  }

  return Array.from(byTag.values()).slice(0, 50);
}

function normalizeSkillTag(
  skill: WorkHistorySkillTagInput
): WorkHistorySkillTag | null {
  if (!skill || typeof skill !== "object") {
    return null;
  }

  const tag = cleanSkillTag(skill.tag);

  if (!tag) {
    return null;
  }

  return {
    tag,
    weight: normalizeWeight(skill.weight ?? 1)
  };
}

function cleanEntryType(
  value: unknown
): WorkHistoryEntryType | null {
  return isWorkHistoryEntryType(value) ? value : null;
}

function cleanVisibility(
  value: unknown
): WorkHistoryVisibility {
  if (
    value === "private" ||
    value === "public" ||
    value === "limited"
  ) {
    return value;
  }

  return "private";
}

function cleanInitialStatus(
  value: unknown
): WorkHistoryStatus {
  if (
    value === "draft" ||
    value === "active"
  ) {
    return value;
  }

  return "active";
}

function makeWorkHistoryEntryId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-history-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneEntry(
  entry: WorkHistoryEntry
): WorkHistoryEntry {
  return {
    entry_id: entry.entry_id,

    actor_private_id: entry.actor_private_id,
    actor_public_id: entry.actor_public_id ?? null,

    type: entry.type,
    status: entry.status,
    visibility: entry.visibility,

    title: entry.title,
    summary: entry.summary ?? null,

    job_id: entry.job_id ?? null,
    surface_id: entry.surface_id ?? null,
    moment_id: entry.moment_id ?? null,

    proof_refs: entry.proof_refs.map(cloneProofRef),
    skill_tags: entry.skill_tags.map(cloneSkillTag),

    started_at_ms: entry.started_at_ms ?? null,
    ended_at_ms: entry.ended_at_ms ?? null,
    occurred_at_ms: entry.occurred_at_ms,

    created_at_ms: entry.created_at_ms,
    updated_at_ms: entry.updated_at_ms,
    sealed_at_ms: entry.sealed_at_ms ?? null,
    hidden_at_ms: entry.hidden_at_ms ?? null,
    burned_at_ms: entry.burned_at_ms ?? null,

    data: cloneData(entry.data)
  };
}

function cloneProofRef(
  ref: WorkHistoryProofRef
): WorkHistoryProofRef {
  return {
    proof_id: ref.proof_id,
    type: ref.type,
    status: ref.status,
    visibility: ref.visibility,
    occurred_at_ms: ref.occurred_at_ms
  };
}

function cloneSkillTag(
  skill: WorkHistorySkillTag
): WorkHistorySkillTag {
  return {
    tag: skill.tag,
    weight: skill.weight
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

function cleanTimeOrNull(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value;
  }

  return null;
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
