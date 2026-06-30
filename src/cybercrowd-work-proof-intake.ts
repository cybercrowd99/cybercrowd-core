// src/cybercrowd-work-proof-intake.ts
//
// CyberCrowd Work Proof Intake Organ
//
// ONE JOB:
// Receive proof submitted against a work order before that proof becomes
// resume proof, work history, skill evidence, payment support, or dispute material.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// A work order can require proof.
// Proof intake receives proof.
// Resume proof records accepted proof.
//
// Intake is submission.
// Intake is not verification.
// Intake is not payment approval.
// Intake is not resume proof by itself.

export type WorkProofIntakeKind =
  | "footprint"
  | "moment"
  | "photo"
  | "before-after"
  | "proximity"
  | "signature"
  | "reference"
  | "note"
  | "media"
  | "custom";

export type WorkProofIntakeStatus =
  | "submitted"
  | "acknowledged"
  | "under-review"
  | "accepted"
  | "rejected"
  | "disputed"
  | "sealed"
  | "burned";

export type WorkProofIntakeVisibility =
  | "private"
  | "public"
  | "limited";

export interface WorkProofAttachment {
  attachment_id: string;
  kind: "image" | "video" | "audio" | "document" | "link" | "data" | "other";
  ref_id: string | null;
  url: string | null;
  label: string | null;
  added_at_ms: number;
}

export interface WorkProofIntakeRecord {
  intake_id: string;

  tenant_id: string;

  work_order_id: string;
  job_id: string | null;
  match_id: string | null;
  ping_id: string | null;
  moment_id: string | null;
  surface_id: string | null;

  submitter_private_id: string;
  submitter_public_id: string | null;

  requester_private_id: string | null;
  requester_public_id: string | null;

  kind: WorkProofIntakeKind;
  status: WorkProofIntakeStatus;
  visibility: WorkProofIntakeVisibility;

  title: string;
  description: string | null;

  proof_rule_id: string | null;
  proof_ref_id: string | null;

  attachments: WorkProofAttachment[];

  submitted_at_ms: number;
  updated_at_ms: number;

  acknowledged_at_ms: number | null;
  review_started_at_ms: number | null;
  accepted_at_ms: number | null;
  rejected_at_ms: number | null;
  disputed_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  review_note: string | null;
  rejection_reason: string | null;
  dispute_reason: string | null;

  data: Record<string, unknown>;
}

export interface SubmitWorkProofRequest {
  tenant_id: string;

  work_order_id: string;
  job_id?: string | null;
  match_id?: string | null;
  ping_id?: string | null;
  moment_id?: string | null;
  surface_id?: string | null;

  submitter_private_id: string;
  submitter_public_id?: string | null;

  requester_private_id?: string | null;
  requester_public_id?: string | null;

  kind: WorkProofIntakeKind;
  visibility?: WorkProofIntakeVisibility;

  title: string;
  description?: string | null;

  proof_rule_id?: string | null;
  proof_ref_id?: string | null;

  attachments?: WorkProofAttachmentInput[];

  data?: Record<string, unknown>;
}

export interface WorkProofAttachmentInput {
  kind: "image" | "video" | "audio" | "document" | "link" | "data" | "other";
  ref_id?: string | null;
  url?: string | null;
  label?: string | null;
}

export interface WorkProofIntakeResult {
  ok: boolean;
  intake?: WorkProofIntakeRecord;
  error?: string;
}

export interface WorkProofIntakeListResult {
  ok: boolean;
  intakes: WorkProofIntakeRecord[];
  error?: string;
}

export interface WorkProofIntakeOrgan {
  submit(request: SubmitWorkProofRequest): Promise<WorkProofIntakeResult>;

  acknowledge(intake_id: string): Promise<WorkProofIntakeResult>;

  startReview(intake_id: string): Promise<WorkProofIntakeResult>;

  accept(
    intake_id: string,
    note?: string | null
  ): Promise<WorkProofIntakeResult>;

  reject(
    intake_id: string,
    reason?: string | null
  ): Promise<WorkProofIntakeResult>;

  dispute(
    intake_id: string,
    reason?: string | null
  ): Promise<WorkProofIntakeResult>;

  seal(intake_id: string): Promise<WorkProofIntakeResult>;

  burn(intake_id: string): Promise<WorkProofIntakeResult>;

  addAttachment(
    intake_id: string,
    attachment: WorkProofAttachmentInput
  ): Promise<WorkProofIntakeResult>;

  get(intake_id: string): Promise<WorkProofIntakeRecord | null>;

  listForWorkOrder(work_order_id: string): Promise<WorkProofIntakeListResult>;

  listForSubmitter(
    submitter_private_id: string
  ): Promise<WorkProofIntakeListResult>;

  listForJob(job_id: string): Promise<WorkProofIntakeListResult>;

  listPendingReview(): Promise<WorkProofIntakeListResult>;
}

export class InMemoryWorkProofIntakeOrgan implements WorkProofIntakeOrgan {
  private readonly intakes = new Map<string, WorkProofIntakeRecord>();
  private readonly workOrderIndex = new Map<string, Set<string>>();
  private readonly submitterIndex = new Map<string, Set<string>>();
  private readonly jobIndex = new Map<string, Set<string>>();

  async submit(
    request: SubmitWorkProofRequest
  ): Promise<WorkProofIntakeResult> {
    const tenant_id = cleanId(request?.tenant_id);
    const work_order_id = cleanId(request?.work_order_id);
    const submitter_private_id = cleanId(request?.submitter_private_id);

    const job_id = cleanNullableId(request?.job_id ?? null);
    const match_id = cleanNullableId(request?.match_id ?? null);
    const ping_id = cleanNullableId(request?.ping_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const surface_id = cleanNullableId(request?.surface_id ?? null);

    const submitter_public_id = cleanNullableId(
      request?.submitter_public_id ?? null
    );

    const requester_private_id = cleanNullableId(
      request?.requester_private_id ?? null
    );

    const requester_public_id = cleanNullableId(
      request?.requester_public_id ?? null
    );

    const kind = cleanProofKind(request?.kind);
    const visibility = cleanVisibility(request?.visibility ?? "private");

    const title = cleanText(request?.title ?? "", 240);
    const description = cleanNullableText(request?.description ?? null, 4000);

    const proof_rule_id = cleanNullableId(request?.proof_rule_id ?? null);
    const proof_ref_id = cleanNullableId(request?.proof_ref_id ?? null);

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
      };
    }

    if (!work_order_id) {
      return {
        ok: false,
        error: "WORK_ORDER_ID_REQUIRED"
      };
    }

    if (!submitter_private_id) {
      return {
        ok: false,
        error: "SUBMITTER_PRIVATE_ID_REQUIRED"
      };
    }

    if (!kind) {
      return {
        ok: false,
        error: "PROOF_KIND_INVALID"
      };
    }

    if (!title) {
      return {
        ok: false,
        error: "PROOF_TITLE_REQUIRED"
      };
    }

    const now = Date.now();

    const intake: WorkProofIntakeRecord = {
      intake_id: makeIntakeId(),

      tenant_id,

      work_order_id,
      job_id,
      match_id,
      ping_id,
      moment_id,
      surface_id,

      submitter_private_id,
      submitter_public_id,

      requester_private_id,
      requester_public_id,

      kind,
      status: "submitted",
      visibility,

      title,
      description,

      proof_rule_id,
      proof_ref_id,

      attachments: normalizeAttachments(request?.attachments ?? [], now),

      submitted_at_ms: now,
      updated_at_ms: now,

      acknowledged_at_ms: null,
      review_started_at_ms: null,
      accepted_at_ms: null,
      rejected_at_ms: null,
      disputed_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      review_note: null,
      rejection_reason: null,
      dispute_reason: null,

      data: cloneData(request?.data ?? {})
    };

    this.intakes.set(intake.intake_id, cloneIntake(intake));

    this.addIndex(this.workOrderIndex, work_order_id, intake.intake_id);
    this.addIndex(this.submitterIndex, submitter_private_id, intake.intake_id);

    if (job_id) {
      this.addIndex(this.jobIndex, job_id, intake.intake_id);
    }

    return {
      ok: true,
      intake: cloneIntake(intake)
    };
  }

  async acknowledge(intake_id: string): Promise<WorkProofIntakeResult> {
    return this.transition(intake_id, "acknowledged", null);
  }

  async startReview(intake_id: string): Promise<WorkProofIntakeResult> {
    return this.transition(intake_id, "under-review", null);
  }

  async accept(
    intake_id: string,
    note: string | null = null
  ): Promise<WorkProofIntakeResult> {
    return this.transition(intake_id, "accepted", note);
  }

  async reject(
    intake_id: string,
    reason: string | null = null
  ): Promise<WorkProofIntakeResult> {
    return this.transition(intake_id, "rejected", reason);
  }

  async dispute(
    intake_id: string,
    reason: string | null = null
  ): Promise<WorkProofIntakeResult> {
    return this.transition(intake_id, "disputed", reason);
  }

  async seal(intake_id: string): Promise<WorkProofIntakeResult> {
    return this.transition(intake_id, "sealed", null);
  }

  async burn(intake_id: string): Promise<WorkProofIntakeResult> {
    return this.transition(intake_id, "burned", null);
  }

  async addAttachment(
    intake_id: string,
    attachment: WorkProofAttachmentInput
  ): Promise<WorkProofIntakeResult> {
    const intake = this.intakes.get(cleanId(intake_id));

    if (!intake) {
      return {
        ok: false,
        error: "WORK_PROOF_INTAKE_NOT_FOUND"
      };
    }

    if (intake.status === "sealed" || intake.status === "burned") {
      return {
        ok: false,
        error: "WORK_PROOF_INTAKE_LOCKED"
      };
    }

    const item = normalizeAttachment(attachment, Date.now());

    if (!item) {
      return {
        ok: false,
        error: "ATTACHMENT_INVALID"
      };
    }

    intake.attachments.push(item);
    intake.updated_at_ms = Date.now();

    return {
      ok: true,
      intake: cloneIntake(intake)
    };
  }

  async get(
    intake_id: string
  ): Promise<WorkProofIntakeRecord | null> {
    const intake = this.intakes.get(cleanId(intake_id));
    return intake ? cloneIntake(intake) : null;
  }

  async listForWorkOrder(
    work_order_id: string
  ): Promise<WorkProofIntakeListResult> {
    const cleanWorkOrder = cleanId(work_order_id);

    if (!cleanWorkOrder) {
      return {
        ok: false,
        intakes: [],
        error: "WORK_ORDER_ID_REQUIRED"
      };
    }

    const ids = this.workOrderIndex.get(cleanWorkOrder) ?? new Set<string>();

    return {
      ok: true,
      intakes: this.recordsFromIds(ids)
    };
  }

  async listForSubmitter(
    submitter_private_id: string
  ): Promise<WorkProofIntakeListResult> {
    const cleanSubmitter = cleanId(submitter_private_id);

    if (!cleanSubmitter) {
      return {
        ok: false,
        intakes: [],
        error: "SUBMITTER_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.submitterIndex.get(cleanSubmitter) ?? new Set<string>();

    return {
      ok: true,
      intakes: this.recordsFromIds(ids)
    };
  }

  async listForJob(job_id: string): Promise<WorkProofIntakeListResult> {
    const cleanJob = cleanId(job_id);

    if (!cleanJob) {
      return {
        ok: false,
        intakes: [],
        error: "JOB_ID_REQUIRED"
      };
    }

    const ids = this.jobIndex.get(cleanJob) ?? new Set<string>();

    return {
      ok: true,
      intakes: this.recordsFromIds(ids)
    };
  }

  async listPendingReview(): Promise<WorkProofIntakeListResult> {
    return {
      ok: true,
      intakes: Array.from(this.intakes.values())
        .filter(
          (intake) =>
            intake.status === "submitted" ||
            intake.status === "acknowledged" ||
            intake.status === "under-review"
        )
        .map(cloneIntake)
        .sort((a, b) => b.submitted_at_ms - a.submitted_at_ms)
    };
  }

  reset(): void {
    this.intakes.clear();
    this.workOrderIndex.clear();
    this.submitterIndex.clear();
    this.jobIndex.clear();
  }

  private async transition(
    intake_id: string,
    status: WorkProofIntakeStatus,
    note: string | null
  ): Promise<WorkProofIntakeResult> {
    const intake = this.intakes.get(cleanId(intake_id));

    if (!intake) {
      return {
        ok: false,
        error: "WORK_PROOF_INTAKE_NOT_FOUND"
      };
    }

    if (!canMove(intake.status, status)) {
      return {
        ok: false,
        error: "WORK_PROOF_INTAKE_STATE_LOCKED"
      };
    }

    const now = Date.now();

    intake.status = status;
    intake.updated_at_ms = now;

    if (status === "acknowledged") intake.acknowledged_at_ms = now;
    if (status === "under-review") {
      intake.review_started_at_ms = now;
      if (!intake.acknowledged_at_ms) intake.acknowledged_at_ms = now;
    }
    if (status === "accepted") {
      intake.accepted_at_ms = now;
      intake.review_note = cleanNullableText(note, 4000);
    }
    if (status === "rejected") {
      intake.rejected_at_ms = now;
      intake.rejection_reason = cleanNullableText(note, 4000);
    }
    if (status === "disputed") {
      intake.disputed_at_ms = now;
      intake.dispute_reason = cleanNullableText(note, 4000);
    }
    if (status === "sealed") intake.sealed_at_ms = now;
    if (status === "burned") intake.burned_at_ms = now;

    return {
      ok: true,
      intake: cloneIntake(intake)
    };
  }

  private recordsFromIds(ids: Set<string>): WorkProofIntakeRecord[] {
    return Array.from(ids)
      .map((id) => this.intakes.get(id))
      .filter((item): item is WorkProofIntakeRecord => Boolean(item))
      .map(cloneIntake)
      .sort((a, b) => b.submitted_at_ms - a.submitted_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    intake_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(intake_id);
    index.set(key, existing);
  }
}

export const CyberCrowdWorkProofIntake =
  new InMemoryWorkProofIntakeOrgan();

export function isWorkProofIntakeKind(
  value: unknown
): value is WorkProofIntakeKind {
  return (
    value === "footprint" ||
    value === "moment" ||
    value === "photo" ||
    value === "before-after" ||
    value === "proximity" ||
    value === "signature" ||
    value === "reference" ||
    value === "note" ||
    value === "media" ||
    value === "custom"
  );
}

export function isWorkProofIntakeStatus(
  value: unknown
): value is WorkProofIntakeStatus {
  return (
    value === "submitted" ||
    value === "acknowledged" ||
    value === "under-review" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "disputed" ||
    value === "sealed" ||
    value === "burned"
  );
}

function canMove(
  from: WorkProofIntakeStatus,
  to: WorkProofIntakeStatus
): boolean {
  if (from === "burned") return false;

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) return true;

  if (from === "submitted") {
    return (
      to === "acknowledged" ||
      to === "under-review" ||
      to === "accepted" ||
      to === "rejected" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "acknowledged") {
    return (
      to === "under-review" ||
      to === "accepted" ||
      to === "rejected" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "under-review") {
    return (
      to === "accepted" ||
      to === "rejected" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "accepted") {
    return (
      to === "sealed" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "rejected") {
    return (
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "disputed") {
    return (
      to === "under-review" ||
      to === "accepted" ||
      to === "rejected" ||
      to === "burned"
    );
  }

  return false;
}

function normalizeAttachments(
  attachments: WorkProofAttachmentInput[],
  now: number
): WorkProofAttachment[] {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((item) => normalizeAttachment(item, now))
    .filter((item): item is WorkProofAttachment => Boolean(item))
    .slice(0, 50);
}

function normalizeAttachment(
  attachment: WorkProofAttachmentInput,
  now: number
): WorkProofAttachment | null {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  if (!isAttachmentKind(attachment.kind)) {
    return null;
  }

  const ref_id = cleanNullableId(attachment.ref_id ?? null);
  const url = cleanNullableText(attachment.url ?? null, 2000);
  const label = cleanNullableText(attachment.label ?? null, 240);

  if (!ref_id && !url && !label) {
    return null;
  }

  return {
    attachment_id: makeAttachmentId(),
    kind: attachment.kind,
    ref_id,
    url,
    label,
    added_at_ms: now
  };
}

function isAttachmentKind(
  value: unknown
): value is WorkProofAttachment["kind"] {
  return (
    value === "image" ||
    value === "video" ||
    value === "audio" ||
    value === "document" ||
    value === "link" ||
    value === "data" ||
    value === "other"
  );
}

function cleanProofKind(value: unknown): WorkProofIntakeKind | null {
  return isWorkProofIntakeKind(value) ? value : null;
}

function cleanVisibility(value: unknown): WorkProofIntakeVisibility {
  if (
    value === "private" ||
    value === "public" ||
    value === "limited"
  ) {
    return value;
  }

  return "private";
}

function makeIntakeId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-proof-intake-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function makeAttachmentId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-proof-attachment-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneIntake(
  intake: WorkProofIntakeRecord
): WorkProofIntakeRecord {
  return {
    intake_id: intake.intake_id,

    tenant_id: intake.tenant_id,

    work_order_id: intake.work_order_id,
    job_id: intake.job_id ?? null,
    match_id: intake.match_id ?? null,
    ping_id: intake.ping_id ?? null,
    moment_id: intake.moment_id ?? null,
    surface_id: intake.surface_id ?? null,

    submitter_private_id: intake.submitter_private_id,
    submitter_public_id: intake.submitter_public_id ?? null,

    requester_private_id: intake.requester_private_id ?? null,
    requester_public_id: intake.requester_public_id ?? null,

    kind: intake.kind,
    status: intake.status,
    visibility: intake.visibility,

    title: intake.title,
    description: intake.description ?? null,

    proof_rule_id: intake.proof_rule_id ?? null,
    proof_ref_id: intake.proof_ref_id ?? null,

    attachments: intake.attachments.map(cloneAttachment),

    submitted_at_ms: intake.submitted_at_ms,
    updated_at_ms: intake.updated_at_ms,

    acknowledged_at_ms: intake.acknowledged_at_ms ?? null,
    review_started_at_ms: intake.review_started_at_ms ?? null,
    accepted_at_ms: intake.accepted_at_ms ?? null,
    rejected_at_ms: intake.rejected_at_ms ?? null,
    disputed_at_ms: intake.disputed_at_ms ?? null,
    sealed_at_ms: intake.sealed_at_ms ?? null,
    burned_at_ms: intake.burned_at_ms ?? null,

    review_note: intake.review_note ?? null,
    rejection_reason: intake.rejection_reason ?? null,
    dispute_reason: intake.dispute_reason ?? null,

    data: cloneData(intake.data)
  };
}

function cloneAttachment(
  attachment: WorkProofAttachment
): WorkProofAttachment {
  return {
    attachment_id: attachment.attachment_id,
    kind: attachment.kind,
    ref_id: attachment.ref_id ?? null,
    url: attachment.url ?? null,
    label: attachment.label ?? null,
    added_at_ms: attachment.added_at_ms
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
