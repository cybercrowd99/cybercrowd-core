// src/cybercrowd-work-history-to-skill-ledger-bridge.ts
//
// CyberCrowd Work History To Skill Ledger Bridge Organ
//
// ONE JOB:
// Move proof-backed Work History skill signals into a Skill Ledger creation payload.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// Work History shows what happened.
// Bridge prepares skill evidence.
// Skill Ledger stores the skill trail.
//
// A bridge record is preparation.
// A bridge record is not automatic authority.
// A bridge record is not a hidden score.
// A bridge record is not automatic payment.
// A bridge record is not hidden punishment.

export type WorkHistoryToSkillLedgerBridgeStatus =
  | "prepared"
  | "sent"
  | "linked"
  | "rejected"
  | "sealed"
  | "burned";

export type WorkHistoryToSkillLedgerBridgeSource =
  | "work-history"
  | "resume-to-work-history-bridge"
  | "resume-proof"
  | "manual"
  | "unknown";

export type SkillLedgerPayloadSignal =
  | "completed-work"
  | "verified-proof"
  | "repeat-work"
  | "reference"
  | "training"
  | "license"
  | "creator-work"
  | "service-work"
  | "field-work"
  | "manual"
  | "other";

export interface WorkHistorySkillEvidenceRef {
  evidence_id: string;
  kind:
    | "work-history"
    | "resume-proof"
    | "work-order"
    | "job"
    | "moment"
    | "surface"
    | "reference"
    | "training"
    | "license"
    | "note"
    | "other";
  ref_id: string | null;
  text: string | null;
  added_at_ms: number;
}

export interface SkillLedgerPayloadTag {
  tag: string;
  weight: number;
  signal: SkillLedgerPayloadSignal;
  source: string | null;
}

export interface SkillLedgerPayload {
  actor_private_id: string;
  actor_public_id: string | null;

  work_history_entry_id: string;
  resume_proof_id: string | null;
  job_id: string | null;
  moment_id: string | null;
  surface_id: string | null;

  visibility: "private" | "public" | "limited";

  title: string;
  summary: string | null;

  skill_tags: SkillLedgerPayloadTag[];
  evidence: WorkHistorySkillEvidenceRef[];

  occurred_at_ms: number;

  data: Record<string, unknown>;
}

export interface WorkHistoryToSkillLedgerBridgeRecord {
  bridge_id: string;

  tenant_id: string;

  work_history_entry_id: string;
  resume_to_work_history_bridge_id: string | null;
  resume_proof_id: string | null;
  work_order_id: string | null;
  job_id: string | null;
  moment_id: string | null;
  surface_id: string | null;

  actor_private_id: string;
  actor_public_id: string | null;

  source: WorkHistoryToSkillLedgerBridgeSource;
  status: WorkHistoryToSkillLedgerBridgeStatus;

  skill_ledger_entry_id: string | null;

  payload: SkillLedgerPayload;

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

export interface PrepareWorkHistoryToSkillLedgerRequest {
  tenant_id: string;

  work_history_entry_id: string;
  resume_to_work_history_bridge_id?: string | null;
  resume_proof_id?: string | null;
  work_order_id?: string | null;
  job_id?: string | null;
  moment_id?: string | null;
  surface_id?: string | null;

  actor_private_id: string;
  actor_public_id?: string | null;

  source?: WorkHistoryToSkillLedgerBridgeSource;

  visibility?: "private" | "public" | "limited";

  title: string;
  summary?: string | null;

  skill_tags?: SkillLedgerPayloadTagInput[];
  evidence?: WorkHistorySkillEvidenceInput[];

  occurred_at_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface SkillLedgerPayloadTagInput {
  tag: string;
  weight?: number;
  signal?: SkillLedgerPayloadSignal;
  source?: string | null;
}

export interface WorkHistorySkillEvidenceInput {
  kind:
    | "work-history"
    | "resume-proof"
    | "work-order"
    | "job"
    | "moment"
    | "surface"
    | "reference"
    | "training"
    | "license"
    | "note"
    | "other";
  ref_id?: string | null;
  text?: string | null;
}

export interface WorkHistoryToSkillLedgerBridgeResult {
  ok: boolean;
  bridge?: WorkHistoryToSkillLedgerBridgeRecord;
  error?: string;
}

export interface WorkHistoryToSkillLedgerBridgeListResult {
  ok: boolean;
  bridges: WorkHistoryToSkillLedgerBridgeRecord[];
  error?: string;
}

export interface WorkHistoryToSkillLedgerBridgeOrgan {
  prepare(
    request: PrepareWorkHistoryToSkillLedgerRequest
  ): Promise<WorkHistoryToSkillLedgerBridgeResult>;

  markSent(
    bridge_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeResult>;

  linkSkillLedgerEntry(
    bridge_id: string,
    skill_ledger_entry_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeResult>;

  reject(
    bridge_id: string,
    reason?: string | null
  ): Promise<WorkHistoryToSkillLedgerBridgeResult>;

  seal(
    bridge_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeResult>;

  burn(
    bridge_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeResult>;

  addSkillTag(
    bridge_id: string,
    skill: SkillLedgerPayloadTagInput
  ): Promise<WorkHistoryToSkillLedgerBridgeResult>;

  addEvidence(
    bridge_id: string,
    evidence: WorkHistorySkillEvidenceInput
  ): Promise<WorkHistoryToSkillLedgerBridgeResult>;

  get(
    bridge_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeRecord | null>;

  listForWorkHistory(
    work_history_entry_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeListResult>;

  listForActor(
    actor_private_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeListResult>;

  listForJob(
    job_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeListResult>;

  listPrepared(): Promise<WorkHistoryToSkillLedgerBridgeListResult>;
}

export class InMemoryWorkHistoryToSkillLedgerBridgeOrgan
  implements WorkHistoryToSkillLedgerBridgeOrgan {
  private readonly bridges =
    new Map<string, WorkHistoryToSkillLedgerBridgeRecord>();

  private readonly workHistoryIndex = new Map<string, Set<string>>();
  private readonly actorIndex = new Map<string, Set<string>>();
  private readonly jobIndex = new Map<string, Set<string>>();

  async prepare(
    request: PrepareWorkHistoryToSkillLedgerRequest
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    const tenant_id = cleanId(request?.tenant_id);
    const work_history_entry_id = cleanId(request?.work_history_entry_id);
    const actor_private_id = cleanId(request?.actor_private_id);

    const actor_public_id = cleanNullableId(request?.actor_public_id ?? null);

    const resume_to_work_history_bridge_id = cleanNullableId(
      request?.resume_to_work_history_bridge_id ?? null
    );

    const resume_proof_id = cleanNullableId(request?.resume_proof_id ?? null);
    const work_order_id = cleanNullableId(request?.work_order_id ?? null);
    const job_id = cleanNullableId(request?.job_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const surface_id = cleanNullableId(request?.surface_id ?? null);

    const source = cleanSource(request?.source ?? "work-history");
    const visibility = cleanVisibility(request?.visibility ?? "private");

    const title = cleanText(request?.title ?? "", 240);
    const summary = cleanNullableText(request?.summary ?? null, 2000);

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
      };
    }

    if (!work_history_entry_id) {
      return {
        ok: false,
        error: "WORK_HISTORY_ENTRY_ID_REQUIRED"
      };
    }

    if (!actor_private_id) {
      return {
        ok: false,
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    if (!title) {
      return {
        ok: false,
        error: "SKILL_LEDGER_TITLE_REQUIRED"
      };
    }

    const now = Date.now();

    const occurred_at_ms = cleanTimeOrDefault(
      request?.occurred_at_ms ?? null,
      now
    );

    const evidence = normalizeEvidenceList(
      [
        {
          kind: "work-history",
          ref_id: work_history_entry_id,
          text: "Source work history entry"
        },
        ...(request?.evidence ?? [])
      ],
      now
    );

    if (resume_proof_id) {
      evidence.push({
        evidence_id: makeEvidenceId(),
        kind: "resume-proof",
        ref_id: resume_proof_id,
        text: "Source resume proof",
        added_at_ms: now
      });
    }

    if (work_order_id) {
      evidence.push({
        evidence_id: makeEvidenceId(),
        kind: "work-order",
        ref_id: work_order_id,
        text: "Source work order",
        added_at_ms: now
      });
    }

    const skill_tags = normalizeSkillTags(request?.skill_tags ?? []);

    if (skill_tags.length === 0) {
      return {
        ok: false,
        error: "SKILL_TAG_REQUIRED"
      };
    }

    const payload: SkillLedgerPayload = {
      actor_private_id,
      actor_public_id,

      work_history_entry_id,
      resume_proof_id,
      job_id,
      moment_id,
      surface_id,

      visibility,

      title,
      summary,

      skill_tags,
      evidence: evidence.slice(0, 100),

      occurred_at_ms,

      data: cloneData(request?.data ?? {})
    };

    const bridge: WorkHistoryToSkillLedgerBridgeRecord = {
      bridge_id: makeBridgeId(),

      tenant_id,

      work_history_entry_id,
      resume_to_work_history_bridge_id,
      resume_proof_id,
      work_order_id,
      job_id,
      moment_id,
      surface_id,

      actor_private_id,
      actor_public_id,

      source,
      status: "prepared",

      skill_ledger_entry_id: null,

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

    this.addIndex(
      this.workHistoryIndex,
      work_history_entry_id,
      bridge.bridge_id
    );

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
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    return this.transition(bridge_id, "sent", null);
  }

  async linkSkillLedgerEntry(
    bridge_id: string,
    skill_ledger_entry_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));
    const ledgerId = cleanId(skill_ledger_entry_id);

    if (!bridge) {
      return {
        ok: false,
        error: "WORK_HISTORY_TO_SKILL_LEDGER_BRIDGE_NOT_FOUND"
      };
    }

    if (!ledgerId) {
      return {
        ok: false,
        error: "SKILL_LEDGER_ENTRY_ID_REQUIRED"
      };
    }

    if (!canMove(bridge.status, "linked")) {
      return {
        ok: false,
        error: "WORK_HISTORY_TO_SKILL_LEDGER_BRIDGE_STATE_LOCKED"
      };
    }

    const now = Date.now();

    bridge.status = "linked";
    bridge.skill_ledger_entry_id = ledgerId;
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
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    return this.transition(bridge_id, "rejected", reason);
  }

  async seal(
    bridge_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    return this.transition(bridge_id, "sealed", null);
  }

  async burn(
    bridge_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    return this.transition(bridge_id, "burned", null);
  }

  async addSkillTag(
    bridge_id: string,
    skill: SkillLedgerPayloadTagInput
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "WORK_HISTORY_TO_SKILL_LEDGER_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "WORK_HISTORY_TO_SKILL_LEDGER_BRIDGE_LOCKED"
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
      (item) => item.tag === tag.tag && item.signal === tag.signal
    );

    if (existing) {
      existing.weight = Math.max(existing.weight, tag.weight);
      existing.source = existing.source ?? tag.source;
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

  async addEvidence(
    bridge_id: string,
    evidence: WorkHistorySkillEvidenceInput
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "WORK_HISTORY_TO_SKILL_LEDGER_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "WORK_HISTORY_TO_SKILL_LEDGER_BRIDGE_LOCKED"
      };
    }

    const item = normalizeEvidence(evidence, Date.now());

    if (!item) {
      return {
        ok: false,
        error: "EVIDENCE_INVALID"
      };
    }

    bridge.payload.evidence.push(item);
    bridge.payload.evidence = bridge.payload.evidence.slice(0, 100);
    bridge.updated_at_ms = Date.now();

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async get(
    bridge_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeRecord | null> {
    const bridge = this.bridges.get(cleanId(bridge_id));
    return bridge ? cloneBridge(bridge) : null;
  }

  async listForWorkHistory(
    work_history_entry_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeListResult> {
    const cleanEntry = cleanId(work_history_entry_id);

    if (!cleanEntry) {
      return {
        ok: false,
        bridges: [],
        error: "WORK_HISTORY_ENTRY_ID_REQUIRED"
      };
    }

    const ids = this.workHistoryIndex.get(cleanEntry) ?? new Set<string>();

    return {
      ok: true,
      bridges: this.recordsFromIds(ids)
    };
  }

  async listForActor(
    actor_private_id: string
  ): Promise<WorkHistoryToSkillLedgerBridgeListResult> {
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
  ): Promise<WorkHistoryToSkillLedgerBridgeListResult> {
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

  async listPrepared(): Promise<WorkHistoryToSkillLedgerBridgeListResult> {
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
    this.workHistoryIndex.clear();
    this.actorIndex.clear();
    this.jobIndex.clear();
  }

  private async transition(
    bridge_id: string,
    status: WorkHistoryToSkillLedgerBridgeStatus,
    note: string | null
  ): Promise<WorkHistoryToSkillLedgerBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "WORK_HISTORY_TO_SKILL_LEDGER_BRIDGE_NOT_FOUND"
      };
    }

    if (!canMove(bridge.status, status)) {
      return {
        ok: false,
        error: "WORK_HISTORY_TO_SKILL_LEDGER_BRIDGE_STATE_LOCKED"
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

  private recordsFromIds(
    ids: Set<string>
  ): WorkHistoryToSkillLedgerBridgeRecord[] {
    return Array.from(ids)
      .map((id) => this.bridges.get(id))
      .filter(
        (item): item is WorkHistoryToSkillLedgerBridgeRecord =>
          Boolean(item)
      )
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

export const CyberCrowdWorkHistoryToSkillLedgerBridge =
  new InMemoryWorkHistoryToSkillLedgerBridgeOrgan();

export function isWorkHistoryToSkillLedgerBridgeStatus(
  value: unknown
): value is WorkHistoryToSkillLedgerBridgeStatus {
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
  from: WorkHistoryToSkillLedgerBridgeStatus,
  to: WorkHistoryToSkillLedgerBridgeStatus
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

function normalizeEvidenceList(
  evidence: WorkHistorySkillEvidenceInput[],
  now: number
): WorkHistorySkillEvidenceRef[] {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .map((item) => normalizeEvidence(item, now))
    .filter((item): item is WorkHistorySkillEvidenceRef => Boolean(item))
    .slice(0, 100);
}

function normalizeEvidence(
  evidence: WorkHistorySkillEvidenceInput,
  now: number
): WorkHistorySkillEvidenceRef | null {
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
): value is WorkHistorySkillEvidenceRef["kind"] {
  return (
    value === "work-history" ||
    value === "resume-proof" ||
    value === "work-order" ||
    value === "job" ||
    value === "moment" ||
    value === "surface" ||
    value === "reference" ||
    value === "training" ||
    value === "license" ||
    value === "note" ||
    value === "other"
  );
}

function normalizeSkillTags(
  skills: SkillLedgerPayloadTagInput[]
): SkillLedgerPayloadTag[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const byKey = new Map<string, SkillLedgerPayloadTag>();

  for (const skill of skills) {
    const tag = normalizeSkillTag(skill);

    if (!tag) continue;

    const key = tag.tag + "::" + tag.signal;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, tag);
      continue;
    }

    existing.weight = Math.max(existing.weight, tag.weight);
    existing.source = existing.source ?? tag.source;
  }

  return Array.from(byKey.values()).slice(0, 50);
}

function normalizeSkillTag(
  skill: SkillLedgerPayloadTagInput
): SkillLedgerPayloadTag | null {
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
    signal: cleanSignal(skill.signal ?? "completed-work"),
    source: cleanNullableText(skill.source ?? null, 180)
  };
}

function cleanSignal(value: unknown): SkillLedgerPayloadSignal {
  if (
    value === "completed-work" ||
    value === "verified-proof" ||
    value === "repeat-work" ||
    value === "reference" ||
    value === "training" ||
    value === "license" ||
    value === "creator-work" ||
    value === "service-work" ||
    value === "field-work" ||
    value === "manual" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

function cleanSource(
  value: unknown
): WorkHistoryToSkillLedgerBridgeSource {
  if (
    value === "work-history" ||
    value === "resume-to-work-history-bridge" ||
    value === "resume-proof" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanVisibility(
  value: unknown
): SkillLedgerPayload["visibility"] {
  if (
    value === "private" ||
    value === "public" ||
    value === "limited"
  ) {
    return value;
  }

  return "private";
}

function makeBridgeId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-history-to-skill-ledger-bridge-" +
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
    "work-history-skill-evidence-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneBridge(
  bridge: WorkHistoryToSkillLedgerBridgeRecord
): WorkHistoryToSkillLedgerBridgeRecord {
  return {
    bridge_id: bridge.bridge_id,

    tenant_id: bridge.tenant_id,

    work_history_entry_id: bridge.work_history_entry_id,
    resume_to_work_history_bridge_id:
      bridge.resume_to_work_history_bridge_id ?? null,
    resume_proof_id: bridge.resume_proof_id ?? null,
    work_order_id: bridge.work_order_id ?? null,
    job_id: bridge.job_id ?? null,
    moment_id: bridge.moment_id ?? null,
    surface_id: bridge.surface_id ?? null,

    actor_private_id: bridge.actor_private_id,
    actor_public_id: bridge.actor_public_id ?? null,

    source: bridge.source,
    status: bridge.status,

    skill_ledger_entry_id: bridge.skill_ledger_entry_id ?? null,

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

function clonePayload(payload: SkillLedgerPayload): SkillLedgerPayload {
  return {
    actor_private_id: payload.actor_private_id,
    actor_public_id: payload.actor_public_id ?? null,

    work_history_entry_id: payload.work_history_entry_id,
    resume_proof_id: payload.resume_proof_id ?? null,
    job_id: payload.job_id ?? null,
    moment_id: payload.moment_id ?? null,
    surface_id: payload.surface_id ?? null,

    visibility: payload.visibility,

    title: payload.title,
    summary: payload.summary ?? null,

    skill_tags: payload.skill_tags.map(cloneSkillTag),
    evidence: payload.evidence.map(cloneEvidence),

    occurred_at_ms: payload.occurred_at_ms,

    data: cloneData(payload.data)
  };
}

function cloneSkillTag(skill: SkillLedgerPayloadTag): SkillLedgerPayloadTag {
  return {
    tag: skill.tag,
    weight: skill.weight,
    signal: skill.signal,
    source: skill.source ?? null
  };
}

function cloneEvidence(
  evidence: WorkHistorySkillEvidenceRef
): WorkHistorySkillEvidenceRef {
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
