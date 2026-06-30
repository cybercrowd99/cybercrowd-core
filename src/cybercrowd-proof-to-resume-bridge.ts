// src/cybercrowd-proof-to-resume-bridge.ts
//
// CyberCrowd Proof To Resume Bridge Organ
//
// ONE JOB:
// Move accepted work proof review into a Resume Proof creation payload.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// Intake is submission.
// Review is decision.
// Bridge is handoff.
// Resume Proof is history.
//
// Review accepts proof.
// Bridge prepares the resume proof record.
// Resume Proof stores the human work trail.
//
// A bridge record is preparation.
// A bridge record is not automatic authority.
// A bridge record is not automatic payment.
// A bridge record is not hidden punishment.

export type ProofToResumeBridgeStatus =
  | "prepared"
  | "sent"
  | "linked"
  | "rejected"
  | "sealed"
  | "burned";

export type ProofToResumeBridgeSource =
  | "work-proof-review"
  | "work-proof-intake"
  | "work-order"
  | "manual"
  | "unknown";

export type ProofToResumeType =
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

export interface ProofToResumeEvidenceRef {
  evidence_id: string;
  kind:
    | "review"
    | "intake"
    | "work-order"
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

export interface ProofToResumeSkillTag {
  tag: string;
  weight: number;
  source: string | null;
}

export interface ProofToResumePayload {
  actor_private_id: string;
  actor_public_id: string | null;

  job_id: string | null;
  moment_id: string | null;
  footprint_id: string | null;
  ping_id: string | null;
  counterclaim_id: string | null;
  proximity_id: string | null;

  type: ProofToResumeType;
  visibility: "private" | "public" | "limited";
  source_organ: "jobs" | "footprint" | "moment" | "ping" | "counterclaim" | "proximity" | "media" | "manual" | "unknown";

  title: string;
  summary: string | null;

  skill_tags: ProofToResumeSkillTag[];
  evidence: ProofToResumeEvidenceRef[];

  occurred_at_ms: number;
  data: Record<string, unknown>;
}

export interface ProofToResumeBridgeRecord {
  bridge_id: string;

  tenant_id: string;

  review_id: string;
  intake_id: string | null;
  work_order_id: string | null;
  job_id: string | null;
  match_id: string | null;
  ping_id: string | null;
  moment_id: string | null;
  surface_id: string | null;

  actor_private_id: string;
  actor_public_id: string | null;

  source: ProofToResumeBridgeSource;
  status: ProofToResumeBridgeStatus;

  resume_proof_id: string | null;

  payload: ProofToResumePayload;

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

export interface PrepareProofToResumeRequest {
  tenant_id: string;

  review_id: string;
  intake_id?: string | null;
  work_order_id?: string | null;
  job_id?: string | null;
  match_id?: string | null;
  ping_id?: string | null;
  moment_id?: string | null;
  surface_id?: string | null;

  actor_private_id: string;
  actor_public_id?: string | null;

  source?: ProofToResumeBridgeSource;

  resume_type: ProofToResumeType;
  visibility?: "private" | "public" | "limited";

  title: string;
  summary?: string | null;

  footprint_id?: string | null;
  counterclaim_id?: string | null;
  proximity_id?: string | null;

  occurred_at_ms?: number | null;

  skill_tags?: ProofToResumeSkillTagInput[];
  evidence?: ProofToResumeEvidenceInput[];

  data?: Record<string, unknown>;
}

export interface ProofToResumeSkillTagInput {
  tag: string;
  weight?: number;
  source?: string | null;
}

export interface ProofToResumeEvidenceInput {
  kind:
    | "review"
    | "intake"
    | "work-order"
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

export interface ProofToResumeBridgeResult {
  ok: boolean;
  bridge?: ProofToResumeBridgeRecord;
  error?: string;
}

export interface ProofToResumeBridgeListResult {
  ok: boolean;
  bridges: ProofToResumeBridgeRecord[];
  error?: string;
}

export interface ProofToResumeBridgeOrgan {
  prepare(
    request: PrepareProofToResumeRequest
  ): Promise<ProofToResumeBridgeResult>;

  markSent(
    bridge_id: string
  ): Promise<ProofToResumeBridgeResult>;

  linkResumeProof(
    bridge_id: string,
    resume_proof_id: string
  ): Promise<ProofToResumeBridgeResult>;

  reject(
    bridge_id: string,
    reason?: string | null
  ): Promise<ProofToResumeBridgeResult>;

  seal(
    bridge_id: string
  ): Promise<ProofToResumeBridgeResult>;

  burn(
    bridge_id: string
  ): Promise<ProofToResumeBridgeResult>;

  addEvidence(
    bridge_id: string,
    evidence: ProofToResumeEvidenceInput
  ): Promise<ProofToResumeBridgeResult>;

  addSkillTag(
    bridge_id: string,
    skill: ProofToResumeSkillTagInput
  ): Promise<ProofToResumeBridgeResult>;

  get(
    bridge_id: string
  ): Promise<ProofToResumeBridgeRecord | null>;

  listForReview(
    review_id: string
  ): Promise<ProofToResumeBridgeListResult>;

  listForWorkOrder(
    work_order_id: string
  ): Promise<ProofToResumeBridgeListResult>;

  listForActor(
    actor_private_id: string
  ): Promise<ProofToResumeBridgeListResult>;

  listPrepared(): Promise<ProofToResumeBridgeListResult>;
}

export class InMemoryProofToResumeBridgeOrgan implements ProofToResumeBridgeOrgan {
  private readonly bridges = new Map<string, ProofToResumeBridgeRecord>();
  private readonly reviewIndex = new Map<string, Set<string>>();
  private readonly workOrderIndex = new Map<string, Set<string>>();
  private readonly actorIndex = new Map<string, Set<string>>();

  async prepare(
    request: PrepareProofToResumeRequest
  ): Promise<ProofToResumeBridgeResult> {
    const tenant_id = cleanId(request?.tenant_id);
    const review_id = cleanId(request?.review_id);
    const actor_private_id = cleanId(request?.actor_private_id);

    const actor_public_id = cleanNullableId(request?.actor_public_id ?? null);

    const intake_id = cleanNullableId(request?.intake_id ?? null);
    const work_order_id = cleanNullableId(request?.work_order_id ?? null);
    const job_id = cleanNullableId(request?.job_id ?? null);
    const match_id = cleanNullableId(request?.match_id ?? null);
    const ping_id = cleanNullableId(request?.ping_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const surface_id = cleanNullableId(request?.surface_id ?? null);

    const footprint_id = cleanNullableId(request?.footprint_id ?? null);
    const counterclaim_id = cleanNullableId(request?.counterclaim_id ?? null);
    const proximity_id = cleanNullableId(request?.proximity_id ?? null);

    const source = cleanSource(request?.source ?? "work-proof-review");
    const resume_type = cleanResumeType(request?.resume_type);
    const visibility = cleanVisibility(request?.visibility ?? "private");

    const title = cleanText(request?.title ?? "", 240);
    const summary = cleanNullableText(request?.summary ?? null, 2000);

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
      };
    }

    if (!review_id) {
      return {
        ok: false,
        error: "REVIEW_ID_REQUIRED"
      };
    }

    if (!actor_private_id) {
      return {
        ok: false,
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    if (!resume_type) {
      return {
        ok: false,
        error: "RESUME_TYPE_INVALID"
      };
    }

    if (!title) {
      return {
        ok: false,
        error: "RESUME_PROOF_TITLE_REQUIRED"
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
          kind: "review",
          ref_id: review_id,
          text: "Accepted work proof review"
        },
        ...(request?.evidence ?? [])
      ],
      now
    );

    if (intake_id) {
      evidence.push({
        evidence_id: makeEvidenceId(),
        kind: "intake",
        ref_id: intake_id,
        text: "Source work proof intake",
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

    const payload: ProofToResumePayload = {
      actor_private_id,
      actor_public_id,

      job_id,
      moment_id,
      footprint_id,
      ping_id,
      counterclaim_id,
      proximity_id,

      type: resume_type,
      visibility,
      source_organ: sourceOrganFromBridgeSource(source),

      title,
      summary,

      skill_tags: normalizeSkillTags(request?.skill_tags ?? []),
      evidence: evidence.slice(0, 100),

      occurred_at_ms,
      data: cloneData(request?.data ?? {})
    };

    const bridge: ProofToResumeBridgeRecord = {
      bridge_id: makeBridgeId(),

      tenant_id,

      review_id,
      intake_id,
      work_order_id,
      job_id,
      match_id,
      ping_id,
      moment_id,
      surface_id,

      actor_private_id,
      actor_public_id,

      source,
      status: "prepared",

      resume_proof_id: null,

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

    this.addIndex(this.reviewIndex, review_id, bridge.bridge_id);
    this.addIndex(this.actorIndex, actor_private_id, bridge.bridge_id);

    if (work_order_id) {
      this.addIndex(this.workOrderIndex, work_order_id, bridge.bridge_id);
    }

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async markSent(
    bridge_id: string
  ): Promise<ProofToResumeBridgeResult> {
    return this.transition(bridge_id, "sent", null);
  }

  async linkResumeProof(
    bridge_id: string,
    resume_proof_id: string
  ): Promise<ProofToResumeBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));
    const proofId = cleanId(resume_proof_id);

    if (!bridge) {
      return {
        ok: false,
        error: "PROOF_TO_RESUME_BRIDGE_NOT_FOUND"
      };
    }

    if (!proofId) {
      return {
        ok: false,
        error: "RESUME_PROOF_ID_REQUIRED"
      };
    }

    if (!canMove(bridge.status, "linked")) {
      return {
        ok: false,
        error: "PROOF_TO_RESUME_BRIDGE_STATE_LOCKED"
      };
    }

    const now = Date.now();

    bridge.status = "linked";
    bridge.resume_proof_id = proofId;
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
  ): Promise<ProofToResumeBridgeResult> {
    return this.transition(bridge_id, "rejected", reason);
  }

  async seal(
    bridge_id: string
  ): Promise<ProofToResumeBridgeResult> {
    return this.transition(bridge_id, "sealed", null);
  }

  async burn(
    bridge_id: string
  ): Promise<ProofToResumeBridgeResult> {
    return this.transition(bridge_id, "burned", null);
  }

  async addEvidence(
    bridge_id: string,
    evidence: ProofToResumeEvidenceInput
  ): Promise<ProofToResumeBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "PROOF_TO_RESUME_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "PROOF_TO_RESUME_BRIDGE_LOCKED"
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

  async addSkillTag(
    bridge_id: string,
    skill: ProofToResumeSkillTagInput
  ): Promise<ProofToResumeBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "PROOF_TO_RESUME_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "PROOF_TO_RESUME_BRIDGE_LOCKED"
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

  async get(
    bridge_id: string
  ): Promise<ProofToResumeBridgeRecord | null> {
    const bridge = this.bridges.get(cleanId(bridge_id));
    return bridge ? cloneBridge(bridge) : null;
  }

  async listForReview(
    review_id: string
  ): Promise<ProofToResumeBridgeListResult> {
    const cleanReview = cleanId(review_id);

    if (!cleanReview) {
      return {
        ok: false,
        bridges: [],
        error: "REVIEW_ID_REQUIRED"
      };
    }

    const ids = this.reviewIndex.get(cleanReview) ?? new Set<string>();

    return {
      ok: true,
      bridges: this.recordsFromIds(ids)
    };
  }

  async listForWorkOrder(
    work_order_id: string
  ): Promise<ProofToResumeBridgeListResult> {
    const cleanWorkOrder = cleanId(work_order_id);

    if (!cleanWorkOrder) {
      return {
        ok: false,
        bridges: [],
        error: "WORK_ORDER_ID_REQUIRED"
      };
    }

    const ids = this.workOrderIndex.get(cleanWorkOrder) ?? new Set<string>();

    return {
      ok: true,
      bridges: this.recordsFromIds(ids)
    };
  }

  async listForActor(
    actor_private_id: string
  ): Promise<ProofToResumeBridgeListResult> {
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

  async listPrepared(): Promise<ProofToResumeBridgeListResult> {
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
    this.reviewIndex.clear();
    this.workOrderIndex.clear();
    this.actorIndex.clear();
  }

  private async transition(
    bridge_id: string,
    status: ProofToResumeBridgeStatus,
    note: string | null
  ): Promise<ProofToResumeBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "PROOF_TO_RESUME_BRIDGE_NOT_FOUND"
      };
    }

    if (!canMove(bridge.status, status)) {
      return {
        ok: false,
        error: "PROOF_TO_RESUME_BRIDGE_STATE_LOCKED"
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

  private recordsFromIds(ids: Set<string>): ProofToResumeBridgeRecord[] {
    return Array.from(ids)
      .map((id) => this.bridges.get(id))
      .filter((item): item is ProofToResumeBridgeRecord => Boolean(item))
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

export const CyberCrowdProofToResumeBridge =
  new InMemoryProofToResumeBridgeOrgan();

export function isProofToResumeBridgeStatus(
  value: unknown
): value is ProofToResumeBridgeStatus {
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
  from: ProofToResumeBridgeStatus,
  to: ProofToResumeBridgeStatus
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

function sourceOrganFromBridgeSource(
  source: ProofToResumeBridgeSource
): ProofToResumePayload["source_organ"] {
  if (source === "work-proof-review") return "manual";
  if (source === "work-proof-intake") return "manual";
  if (source === "work-order") return "jobs";
  if (source === "counterclaim") return "counterclaim";
  if (source === "manual") return "manual";

  return "unknown";
}

function normalizeEvidenceList(
  evidence: ProofToResumeEvidenceInput[],
  now: number
): ProofToResumeEvidenceRef[] {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .map((item) => normalizeEvidence(item, now))
    .filter((item): item is ProofToResumeEvidenceRef => Boolean(item))
    .slice(0, 100);
}

function normalizeEvidence(
  evidence: ProofToResumeEvidenceInput,
  now: number
): ProofToResumeEvidenceRef | null {
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
): value is ProofToResumeEvidenceRef["kind"] {
  return (
    value === "review" ||
    value === "intake" ||
    value === "work-order" ||
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
  skills: ProofToResumeSkillTagInput[]
): ProofToResumeSkillTag[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const byTag = new Map<string, ProofToResumeSkillTag>();

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
  skill: ProofToResumeSkillTagInput
): ProofToResumeSkillTag | null {
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

function cleanSource(value: unknown): ProofToResumeBridgeSource {
  if (
    value === "work-proof-review" ||
    value === "work-proof-intake" ||
    value === "work-order" ||
    value === "counterclaim" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanResumeType(value: unknown): ProofToResumeType | null {
  if (
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
  ) {
    return value;
  }

  return null;
}

function cleanVisibility(
  value: unknown
): ProofToResumePayload["visibility"] {
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
    "proof-to-resume-bridge-" +
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
    "proof-to-resume-evidence-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneBridge(
  bridge: ProofToResumeBridgeRecord
): ProofToResumeBridgeRecord {
  return {
    bridge_id: bridge.bridge_id,

    tenant_id: bridge.tenant_id,

    review_id: bridge.review_id,
    intake_id: bridge.intake_id ?? null,
    work_order_id: bridge.work_order_id ?? null,
    job_id: bridge.job_id ?? null,
    match_id: bridge.match_id ?? null,
    ping_id: bridge.ping_id ?? null,
    moment_id: bridge.moment_id ?? null,
    surface_id: bridge.surface_id ?? null,

    actor_private_id: bridge.actor_private_id,
    actor_public_id: bridge.actor_public_id ?? null,

    source: bridge.source,
    status: bridge.status,

    resume_proof_id: bridge.resume_proof_id ?? null,

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
  payload: ProofToResumePayload
): ProofToResumePayload {
  return {
    actor_private_id: payload.actor_private_id,
    actor_public_id: payload.actor_public_id ?? null,

    job_id: payload.job_id ?? null,
    moment_id: payload.moment_id ?? null,
    footprint_id: payload.footprint_id ?? null,
    ping_id: payload.ping_id ?? null,
    counterclaim_id: payload.counterclaim_id ?? null,
    proximity_id: payload.proximity_id ?? null,

    type: payload.type,
    visibility: payload.visibility,
    source_organ: payload.source_organ,

    title: payload.title,
    summary: payload.summary ?? null,

    skill_tags: payload.skill_tags.map(cloneSkillTag),
    evidence: payload.evidence.map(cloneEvidence),

    occurred_at_ms: payload.occurred_at_ms,
    data: cloneData(payload.data)
  };
}

function cloneEvidence(
  evidence: ProofToResumeEvidenceRef
): ProofToResumeEvidenceRef {
  return {
    evidence_id: evidence.evidence_id,
    kind: evidence.kind,
    ref_id: evidence.ref_id ?? null,
    text: evidence.text ?? null,
    added_at_ms: evidence.added_at_ms
  };
}

function cloneSkillTag(
  skill: ProofToResumeSkillTag
): ProofToResumeSkillTag {
  return {
    tag: skill.tag,
    weight: skill.weight,
    source: skill.source ?? null
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
