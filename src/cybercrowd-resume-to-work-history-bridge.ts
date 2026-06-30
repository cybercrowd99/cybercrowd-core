// src/cybercrowd-resume-to-work-history-bridge.ts
//
// CyberCrowd Resume To Work History Bridge Organ
//
// ONE JOB:
// Move accepted Resume Proof into a Work History creation payload.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// Resume Proof stores proof.
// Bridge prepares work history.
// Work History organizes the human timeline.
//
// A bridge record is preparation.
// A bridge record is not automatic authority.
// A bridge record is not automatic payment.
// A bridge record is not hidden punishment.

export type ResumeToWorkHistoryBridgeStatus =
  | "prepared"
  | "sent"
  | "linked"
  | "rejected"
  | "sealed"
  | "burned";

export type ResumeToWorkHistoryBridgeSource =
  | "resume-proof"
  | "work-proof-review"
  | "proof-to-resume-bridge"
  | "manual"
  | "unknown";

export type WorkHistoryPayloadType =
  | "job"
  | "service"
  | "creator-work"
  | "training"
  | "license"
  | "reference"
  | "proof"
  | "other";

export interface ResumeToWorkHistoryProofRef {
  proof_id: string;
  type: string;
  status: string;
  visibility: string;
  occurred_at_ms: number;
}

export interface ResumeToWorkHistorySkillTag {
  tag: string;
  weight: number;
}

export interface ResumeToWorkHistoryPayload {
  actor_private_id: string;
  actor_public_id: string | null;

  type: WorkHistoryPayloadType;
  visibility: "private" | "public" | "limited";
  status: "draft" | "active";

  title: string;
  summary: string | null;

  job_id: string | null;
  surface_id: string | null;
  moment_id: string | null;

  proof_refs: ResumeToWorkHistoryProofRef[];
  skill_tags: ResumeToWorkHistorySkillTag[];

  started_at_ms: number | null;
  ended_at_ms: number | null;
  occurred_at_ms: number;

  data: Record<string, unknown>;
}

export interface ResumeToWorkHistoryBridgeRecord {
  bridge_id: string;

  tenant_id: string;

  resume_proof_id: string;
  proof_to_resume_bridge_id: string | null;
  work_order_id: string | null;
  job_id: string | null;
  moment_id: string | null;
  surface_id: string | null;

  actor_private_id: string;
  actor_public_id: string | null;

  source: ResumeToWorkHistoryBridgeSource;
  status: ResumeToWorkHistoryBridgeStatus;

  work_history_entry_id: string | null;

  payload: ResumeToWorkHistoryPayload;

  created_at_ms: number;
  updated_at_ms: number;
  sent_at_ms: number | null;
  linked_at_ms: number | null;
  rejected_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  rejection_reason: string | null;

  data: Record<string, unknown>;
}

export interface PrepareResumeToWorkHistoryRequest {
  tenant_id: string;

  resume_proof_id: string;
  proof_to_resume_bridge_id?: string | null;
  work_order_id?: string | null;
  job_id?: string | null;
  moment_id?: string | null;
  surface_id?: string | null;

  actor_private_id: string;
  actor_public_id?: string | null;

  source?: ResumeToWorkHistoryBridgeSource;

  work_history_type: WorkHistoryPayloadType;
  visibility?: "private" | "public" | "limited";
  status?: "draft" | "active";

  title: string;
  summary?: string | null;

  proof_refs?: ResumeToWorkHistoryProofRefInput[];
  skill_tags?: ResumeToWorkHistorySkillTagInput[];

  started_at_ms?: number | null;
  ended_at_ms?: number | null;
  occurred_at_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface ResumeToWorkHistoryProofRefInput {
  proof_id: string;
  type?: string;
  status?: string;
  visibility?: string;
  occurred_at_ms?: number | null;
}

export interface ResumeToWorkHistorySkillTagInput {
  tag: string;
  weight?: number;
}

export interface ResumeToWorkHistoryBridgeResult {
  ok: boolean;
  bridge?: ResumeToWorkHistoryBridgeRecord;
  error?: string;
}

export interface ResumeToWorkHistoryBridgeListResult {
  ok: boolean;
  bridges: ResumeToWorkHistoryBridgeRecord[];
  error?: string;
}

export interface ResumeToWorkHistoryBridgeOrgan {
  prepare(
    request: PrepareResumeToWorkHistoryRequest
  ): Promise<ResumeToWorkHistoryBridgeResult>;

  markSent(
    bridge_id: string
  ): Promise<ResumeToWorkHistoryBridgeResult>;

  linkWorkHistoryEntry(
    bridge_id: string,
    work_history_entry_id: string
  ): Promise<ResumeToWorkHistoryBridgeResult>;

  reject(
    bridge_id: string,
    reason?: string | null
  ): Promise<ResumeToWorkHistoryBridgeResult>;

  seal(
    bridge_id: string
  ): Promise<ResumeToWorkHistoryBridgeResult>;

  burn(
    bridge_id: string
  ): Promise<ResumeToWorkHistoryBridgeResult>;

  addProofRef(
    bridge_id: string,
    proof: ResumeToWorkHistoryProofRefInput
  ): Promise<ResumeToWorkHistoryBridgeResult>;

  addSkillTag(
    bridge_id: string,
    skill: ResumeToWorkHistorySkillTagInput
  ): Promise<ResumeToWorkHistoryBridgeResult>;

  get(
    bridge_id: string
  ): Promise<ResumeToWorkHistoryBridgeRecord | null>;

  listForResumeProof(
    resume_proof_id: string
  ): Promise<ResumeToWorkHistoryBridgeListResult>;

  listForActor(
    actor_private_id: string
  ): Promise<ResumeToWorkHistoryBridgeListResult>;

  listForJob(
    job_id: string
  ): Promise<ResumeToWorkHistoryBridgeListResult>;

  listPrepared(): Promise<ResumeToWorkHistoryBridgeListResult>;
}

export class InMemoryResumeToWorkHistoryBridgeOrgan
  implements ResumeToWorkHistoryBridgeOrgan {
  private readonly bridges = new Map<string, ResumeToWorkHistoryBridgeRecord>();
  private readonly resumeProofIndex = new Map<string, Set<string>>();
  private readonly actorIndex = new Map<string, Set<string>>();
  private readonly jobIndex = new Map<string, Set<string>>();

  async prepare(
    request: PrepareResumeToWorkHistoryRequest
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    const tenant_id = cleanId(request?.tenant_id);
    const resume_proof_id = cleanId(request?.resume_proof_id);
    const actor_private_id = cleanId(request?.actor_private_id);

    const actor_public_id = cleanNullableId(request?.actor_public_id ?? null);

    const proof_to_resume_bridge_id = cleanNullableId(
      request?.proof_to_resume_bridge_id ?? null
    );

    const work_order_id = cleanNullableId(request?.work_order_id ?? null);
    const job_id = cleanNullableId(request?.job_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const surface_id = cleanNullableId(request?.surface_id ?? null);

    const source = cleanSource(request?.source ?? "resume-proof");
    const work_history_type = cleanWorkHistoryType(request?.work_history_type);
    const visibility = cleanVisibility(request?.visibility ?? "private");
    const status = cleanInitialStatus(request?.status ?? "active");

    const title = cleanText(request?.title ?? "", 240);
    const summary = cleanNullableText(request?.summary ?? null, 2000);

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
      };
    }

    if (!resume_proof_id) {
      return {
        ok: false,
        error: "RESUME_PROOF_ID_REQUIRED"
      };
    }

    if (!actor_private_id) {
      return {
        ok: false,
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    if (!work_history_type) {
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

    const occurred_at_ms = cleanTimeOrDefault(
      request?.occurred_at_ms ?? null,
      now
    );

    const proof_refs = normalizeProofRefs(
      [
        {
          proof_id: resume_proof_id,
          type: work_history_type,
          status: "recorded",
          visibility,
          occurred_at_ms
        },
        ...(request?.proof_refs ?? [])
      ],
      occurred_at_ms
    );

    const payload: ResumeToWorkHistoryPayload = {
      actor_private_id,
      actor_public_id,

      type: work_history_type,
      visibility,
      status,

      title,
      summary,

      job_id,
      surface_id,
      moment_id,

      proof_refs,
      skill_tags: normalizeSkillTags(request?.skill_tags ?? []),

      started_at_ms: cleanTimeOrNull(request?.started_at_ms ?? null),
      ended_at_ms: cleanTimeOrNull(request?.ended_at_ms ?? null),
      occurred_at_ms,

      data: cloneData(request?.data ?? {})
    };

    const bridge: ResumeToWorkHistoryBridgeRecord = {
      bridge_id: makeBridgeId(),

      tenant_id,

      resume_proof_id,
      proof_to_resume_bridge_id,
      work_order_id,
      job_id,
      moment_id,
      surface_id,

      actor_private_id,
      actor_public_id,

      source,
      status: "prepared",

      work_history_entry_id: null,

      payload,

      created_at_ms: now,
      updated_at_ms: now,
      sent_at_ms: null,
      linked_at_ms: null,
      rejected_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      rejection_reason: null,

      data: cloneData(request?.data ?? {})
    };

    this.bridges.set(bridge.bridge_id, cloneBridge(bridge));

    this.addIndex(this.resumeProofIndex, resume_proof_id, bridge.bridge_id);
    this.addIndex(this.actorIndex, actor_private_id, bridge.bridge_id);

    if (job_id) {
      this.addIndex(this.jobIndex, job_id, bridge.bridge_id);
    }

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async markSent(
    bridge_id: string
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    return this.transition(bridge_id, "sent", null);
  }

  async linkWorkHistoryEntry(
    bridge_id: string,
    work_history_entry_id: string
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));
    const entryId = cleanId(work_history_entry_id);

    if (!bridge) {
      return {
        ok: false,
        error: "RESUME_TO_WORK_HISTORY_BRIDGE_NOT_FOUND"
      };
    }

    if (!entryId) {
      return {
        ok: false,
        error: "WORK_HISTORY_ENTRY_ID_REQUIRED"
      };
    }

    if (!canMove(bridge.status, "linked")) {
      return {
        ok: false,
        error: "RESUME_TO_WORK_HISTORY_BRIDGE_STATE_LOCKED"
      };
    }

    const now = Date.now();

    bridge.status = "linked";
    bridge.work_history_entry_id = entryId;
    bridge.linked_at_ms = now;
    bridge.updated_at_ms = now;

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async reject(
    bridge_id: string,
    reason: string | null = null
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    return this.transition(bridge_id, "rejected", reason);
  }

  async seal(
    bridge_id: string
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    return this.transition(bridge_id, "sealed", null);
  }

  async burn(
    bridge_id: string
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    return this.transition(bridge_id, "burned", null);
  }

  async addProofRef(
    bridge_id: string,
    proof: ResumeToWorkHistoryProofRefInput
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "RESUME_TO_WORK_HISTORY_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "RESUME_TO_WORK_HISTORY_BRIDGE_LOCKED"
      };
    }

    const ref = normalizeProofRef(proof, Date.now());

    if (!ref) {
      return {
        ok: false,
        error: "PROOF_REF_INVALID"
      };
    }

    const exists = bridge.payload.proof_refs.some(
      (item) => item.proof_id === ref.proof_id
    );

    if (!exists) {
      bridge.payload.proof_refs.push(ref);
      bridge.payload.proof_refs = bridge.payload.proof_refs.slice(0, 100);
    }

    bridge.updated_at_ms = Date.now();

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async addSkillTag(
    bridge_id: string,
    skill: ResumeToWorkHistorySkillTagInput
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "RESUME_TO_WORK_HISTORY_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "RESUME_TO_WORK_HISTORY_BRIDGE_LOCKED"
      };
    }

    const tag = normalizeSkillTag(skill);

    if (!tag) {
      return {
        ok: false,
        error: "SKILL_TAG_INVALID"
      };
    }

    const existing = bridge.payload.skill_tags.find(
      (item) => item.tag === tag.tag
    );

    if (existing) {
      existing.weight = Math.max(existing.weight, tag.weight);
    } else {
      bridge.payload.skill_tags.push(tag);
    }

    bridge.payload.skill_tags = bridge.payload.skill_tags.slice(0, 50);
    bridge.updated_at_ms = Date.now();

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async get(
    bridge_id: string
  ): Promise<ResumeToWorkHistoryBridgeRecord | null> {
    const bridge = this.bridges.get(cleanId(bridge_id));
    return bridge ? cloneBridge(bridge) : null;
  }

  async listForResumeProof(
    resume_proof_id: string
  ): Promise<ResumeToWorkHistoryBridgeListResult> {
    const cleanProof = cleanId(resume_proof_id);

    if (!cleanProof) {
      return {
        ok: false,
        bridges: [],
        error: "RESUME_PROOF_ID_REQUIRED"
      };
    }

    const ids = this.resumeProofIndex.get(cleanProof) ?? new Set<string>();

    return {
      ok: true,
      bridges: this.recordsFromIds(ids)
    };
  }

  async listForActor(
    actor_private_id: string
  ): Promise<ResumeToWorkHistoryBridgeListResult> {
    const cleanActor = cleanId(actor_private_id);

    if (!cleanActor) {
      return {
        ok: false,
        bridges: [],
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.actorIndex.get(cleanActor) ?? new Set<string>();

    return {
      ok: true,
      bridges: this.recordsFromIds(ids)
    };
  }

  async listForJob(
    job_id: string
  ): Promise<ResumeToWorkHistoryBridgeListResult> {
    const cleanJob = cleanId(job_id);

    if (!cleanJob) {
      return {
        ok: false,
        bridges: [],
        error: "JOB_ID_REQUIRED"
      };
    }

    const ids = this.jobIndex.get(cleanJob) ?? new Set<string>();

    return {
      ok: true,
      bridges: this.recordsFromIds(ids)
    };
  }

  async listPrepared(): Promise<ResumeToWorkHistoryBridgeListResult> {
    return {
      ok: true,
      bridges: Array.from(this.bridges.values())
        .filter((bridge) => bridge.status === "prepared")
        .map(cloneBridge)
        .sort((a, b) => b.created_at_ms - a.created_at_ms)
    };
  }

  reset(): void {
    this.bridges.clear();
    this.resumeProofIndex.clear();
    this.actorIndex.clear();
    this.jobIndex.clear();
  }

  private async transition(
    bridge_id: string,
    status: ResumeToWorkHistoryBridgeStatus,
    note: string | null
  ): Promise<ResumeToWorkHistoryBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "RESUME_TO_WORK_HISTORY_BRIDGE_NOT_FOUND"
      };
    }

    if (!canMove(bridge.status, status)) {
      return {
        ok: false,
        error: "RESUME_TO_WORK_HISTORY_BRIDGE_STATE_LOCKED"
      };
    }

    const now = Date.now();

    bridge.status = status;
    bridge.updated_at_ms = now;

    if (status === "sent") bridge.sent_at_ms = now;
    if (status === "rejected") {
      bridge.rejected_at_ms = now;
      bridge.rejection_reason = cleanNullableText(note, 4000);
    }
    if (status === "sealed") bridge.sealed_at_ms = now;
    if (status === "burned") bridge.burned_at_ms = now;

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  private recordsFromIds(ids: Set<string>): ResumeToWorkHistoryBridgeRecord[] {
    return Array.from(ids)
      .map((id) => this.bridges.get(id))
      .filter((item): item is ResumeToWorkHistoryBridgeRecord => Boolean(item))
      .map(cloneBridge)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    bridge_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(bridge_id);
    index.set(key, existing);
  }
}

export const CyberCrowdResumeToWorkHistoryBridge =
  new InMemoryResumeToWorkHistoryBridgeOrgan();

export function isResumeToWorkHistoryBridgeStatus(
  value: unknown
): value is ResumeToWorkHistoryBridgeStatus {
  return (
    value === "prepared" ||
    value === "sent" ||
    value === "linked" ||
    value === "rejected" ||
    value === "sealed" ||
    value === "burned"
  );
}

function canMove(
  from: ResumeToWorkHistoryBridgeStatus,
  to: ResumeToWorkHistoryBridgeStatus
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

  if (from === "prepared") {
    return (
      to === "sent" ||
      to === "linked" ||
      to === "rejected" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "sent") {
    return (
      to === "linked" ||
      to === "rejected" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "linked") {
    return (
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "rejected") {
    return to === "burned";
  }

  return false;
}

function normalizeProofRefs(
  refs: ResumeToWorkHistoryProofRefInput[],
  fallbackTime: number
): ResumeToWorkHistoryProofRef[] {
  if (!Array.isArray(refs)) {
    return [];
  }

  const byProof = new Map<string, ResumeToWorkHistoryProofRef>();

  for (const ref of refs) {
    const clean = normalizeProofRef(ref, fallbackTime);

    if (!clean) continue;

    byProof.set(clean.proof_id, clean);
  }

  return Array.from(byProof.values()).slice(0, 100);
}

function normalizeProofRef(
  ref: ResumeToWorkHistoryProofRefInput,
  fallbackTime: number
): ResumeToWorkHistoryProofRef | null {
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
    occurred_at_ms: cleanTimeOrDefault(ref.occurred_at_ms ?? null, fallbackTime)
  };
}

function normalizeSkillTags(
  skills: ResumeToWorkHistorySkillTagInput[]
): ResumeToWorkHistorySkillTag[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const byTag = new Map<string, ResumeToWorkHistorySkillTag>();

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
  skill: ResumeToWorkHistorySkillTagInput
): ResumeToWorkHistorySkillTag | null {
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

function cleanSource(
  value: unknown
): ResumeToWorkHistoryBridgeSource {
  if (
    value === "resume-proof" ||
    value === "work-proof-review" ||
    value === "proof-to-resume-bridge" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanWorkHistoryType(
  value: unknown
): WorkHistoryPayloadType | null {
  if (
    value === "job" ||
    value === "service" ||
    value === "creator-work" ||
    value === "training" ||
    value === "license" ||
    value === "reference" ||
    value === "proof" ||
    value === "other"
  ) {
    return value;
  }

  return null;
}

function cleanVisibility(
  value: unknown
): ResumeToWorkHistoryPayload["visibility"] {
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
): ResumeToWorkHistoryPayload["status"] {
  if (value === "draft" || value === "active") {
    return value;
  }

  return "active";
}

function makeBridgeId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "resume-to-work-history-bridge-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneBridge(
  bridge: ResumeToWorkHistoryBridgeRecord
): ResumeToWorkHistoryBridgeRecord {
  return {
    bridge_id: bridge.bridge_id,

    tenant_id: bridge.tenant_id,

    resume_proof_id: bridge.resume_proof_id,
    proof_to_resume_bridge_id: bridge.proof_to_resume_bridge_id ?? null,
    work_order_id: bridge.work_order_id ?? null,
    job_id: bridge.job_id ?? null,
    moment_id: bridge.moment_id ?? null,
    surface_id: bridge.surface_id ?? null,

    actor_private_id: bridge.actor_private_id,
    actor_public_id: bridge.actor_public_id ?? null,

    source: bridge.source,
    status: bridge.status,

    work_history_entry_id: bridge.work_history_entry_id ?? null,

    payload: clonePayload(bridge.payload),

    created_at_ms: bridge.created_at_ms,
    updated_at_ms: bridge.updated_at_ms,
    sent_at_ms: bridge.sent_at_ms ?? null,
    linked_at_ms: bridge.linked_at_ms ?? null,
    rejected_at_ms: bridge.rejected_at_ms ?? null,
    sealed_at_ms: bridge.sealed_at_ms ?? null,
    burned_at_ms: bridge.burned_at_ms ?? null,

    rejection_reason: bridge.rejection_reason ?? null,

    data: cloneData(bridge.data)
  };
}

function clonePayload(
  payload: ResumeToWorkHistoryPayload
): ResumeToWorkHistoryPayload {
  return {
    actor_private_id: payload.actor_private_id,
    actor_public_id: payload.actor_public_id ?? null,

    type: payload.type,
    visibility: payload.visibility,
    status: payload.status,

    title: payload.title,
    summary: payload.summary ?? null,

    job_id: payload.job_id ?? null,
    surface_id: payload.surface_id ?? null,
    moment_id: payload.moment_id ?? null,

    proof_refs: payload.proof_refs.map(cloneProofRef),
    skill_tags: payload.skill_tags.map(cloneSkillTag),

    started_at_ms: payload.started_at_ms ?? null,
    ended_at_ms: payload.ended_at_ms ?? null,
    occurred_at_ms: payload.occurred_at_ms,

    data: cloneData(payload.data)
  };
}

function cloneProofRef(
  ref: ResumeToWorkHistoryProofRef
): ResumeToWorkHistoryProofRef {
  return {
    proof_id: ref.proof_id,
    type: ref.type,
    status: ref.status,
    visibility: ref.visibility,
    occurred_at_ms: ref.occurred_at_ms
  };
}

function cloneSkillTag(
  skill: ResumeToWorkHistorySkillTag
): ResumeToWorkHistorySkillTag {
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
