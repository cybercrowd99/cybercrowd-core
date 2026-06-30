// src/cybercrowd-work-proof-review.ts
//
// CyberCrowd Work Proof Review Organ
//
// ONE JOB:
// Review submitted work proof and decide what happens before it becomes
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
// Intake is submission.
// Review is decision.
// Resume Proof is history.
//
// A review decision is evidence.
// A review decision is not authority.
// A review decision is not automatic payment.
// A review decision is not hidden punishment.

export type WorkProofReviewDecision =
  | "accepted"
  | "rejected"
  | "needs-more-evidence"
  | "disputed"
  | "sealed"
  | "burned";

export type WorkProofReviewStatus =
  | "open"
  | "decided"
  | "returned"
  | "disputed"
  | "sealed"
  | "burned";

export type WorkProofReviewSource =
  | "work-proof-intake"
  | "work-order"
  | "counterclaim"
  | "manual"
  | "unknown";

export type WorkProofReviewEvidenceKind =
  | "intake"
  | "work-order"
  | "footprint"
  | "moment"
  | "proximity"
  | "media"
  | "note"
  | "counterclaim"
  | "other";

export interface WorkProofReviewEvidence {
  evidence_id: string;
  kind: WorkProofReviewEvidenceKind;
  ref_id: string | null;
  text: string | null;
  added_at_ms: number;
}

export interface WorkProofReviewRecord {
  review_id: string;

  tenant_id: string;

  intake_id: string;
  work_order_id: string | null;
  job_id: string | null;
  match_id: string | null;
  ping_id: string | null;
  moment_id: string | null;
  surface_id: string | null;

  submitter_private_id: string | null;
  submitter_public_id: string | null;

  reviewer_private_id: string | null;
  reviewer_public_id: string | null;

  source: WorkProofReviewSource;
  status: WorkProofReviewStatus;
  decision: WorkProofReviewDecision | null;

  title: string;
  review_note: string | null;
  decision_reason: string | null;

  evidence: WorkProofReviewEvidence[];

  created_at_ms: number;
  updated_at_ms: number;
  decided_at_ms: number | null;
  returned_at_ms: number | null;
  disputed_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface CreateWorkProofReviewRequest {
  tenant_id: string;

  intake_id: string;
  work_order_id?: string | null;
  job_id?: string | null;
  match_id?: string | null;
  ping_id?: string | null;
  moment_id?: string | null;
  surface_id?: string | null;

  submitter_private_id?: string | null;
  submitter_public_id?: string | null;

  reviewer_private_id?: string | null;
  reviewer_public_id?: string | null;

  source?: WorkProofReviewSource;

  title: string;
  review_note?: string | null;

  evidence?: WorkProofReviewEvidenceInput[];

  data?: Record<string, unknown>;
}

export interface WorkProofReviewEvidenceInput {
  kind: WorkProofReviewEvidenceKind;
  ref_id?: string | null;
  text?: string | null;
}

export interface WorkProofReviewDecisionRequest {
  review_id: string;
  reviewer_private_id?: string | null;
  reviewer_public_id?: string | null;
  reason?: string | null;
}

export interface WorkProofReviewResult {
  ok: boolean;
  review?: WorkProofReviewRecord;
  error?: string;
}

export interface WorkProofReviewListResult {
  ok: boolean;
  reviews: WorkProofReviewRecord[];
  error?: string;
}

export interface WorkProofReviewOrgan {
  create(request: CreateWorkProofReviewRequest): Promise<WorkProofReviewResult>;

  accept(request: WorkProofReviewDecisionRequest): Promise<WorkProofReviewResult>;

  reject(request: WorkProofReviewDecisionRequest): Promise<WorkProofReviewResult>;

  requestMoreEvidence(
    request: WorkProofReviewDecisionRequest
  ): Promise<WorkProofReviewResult>;

  dispute(request: WorkProofReviewDecisionRequest): Promise<WorkProofReviewResult>;

  seal(review_id: string): Promise<WorkProofReviewResult>;

  burn(review_id: string): Promise<WorkProofReviewResult>;

  addEvidence(
    review_id: string,
    evidence: WorkProofReviewEvidenceInput
  ): Promise<WorkProofReviewResult>;

  get(review_id: string): Promise<WorkProofReviewRecord | null>;

  listForIntake(intake_id: string): Promise<WorkProofReviewListResult>;

  listForWorkOrder(work_order_id: string): Promise<WorkProofReviewListResult>;

  listForJob(job_id: string): Promise<WorkProofReviewListResult>;

  listOpen(): Promise<WorkProofReviewListResult>;
}

export class InMemoryWorkProofReviewOrgan implements WorkProofReviewOrgan {
  private readonly reviews = new Map<string, WorkProofReviewRecord>();
  private readonly intakeIndex = new Map<string, Set<string>>();
  private readonly workOrderIndex = new Map<string, Set<string>>();
  private readonly jobIndex = new Map<string, Set<string>>();

  async create(
    request: CreateWorkProofReviewRequest
  ): Promise<WorkProofReviewResult> {
    const tenant_id = cleanId(request?.tenant_id);
    const intake_id = cleanId(request?.intake_id);

    const work_order_id = cleanNullableId(request?.work_order_id ?? null);
    const job_id = cleanNullableId(request?.job_id ?? null);
    const match_id = cleanNullableId(request?.match_id ?? null);
    const ping_id = cleanNullableId(request?.ping_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const surface_id = cleanNullableId(request?.surface_id ?? null);

    const submitter_private_id = cleanNullableId(
      request?.submitter_private_id ?? null
    );

    const submitter_public_id = cleanNullableId(
      request?.submitter_public_id ?? null
    );

    const reviewer_private_id = cleanNullableId(
      request?.reviewer_private_id ?? null
    );

    const reviewer_public_id = cleanNullableId(
      request?.reviewer_public_id ?? null
    );

    const source = cleanSource(request?.source ?? "unknown");
    const title = cleanText(request?.title ?? "", 240);
    const review_note = cleanNullableText(request?.review_note ?? null, 4000);

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
      };
    }

    if (!intake_id) {
      return {
        ok: false,
        error: "INTAKE_ID_REQUIRED"
      };
    }

    if (!title) {
      return {
        ok: false,
        error: "REVIEW_TITLE_REQUIRED"
      };
    }

    const now = Date.now();

    const review: WorkProofReviewRecord = {
      review_id: makeReviewId(),

      tenant_id,

      intake_id,
      work_order_id,
      job_id,
      match_id,
      ping_id,
      moment_id,
      surface_id,

      submitter_private_id,
      submitter_public_id,

      reviewer_private_id,
      reviewer_public_id,

      source,
      status: "open",
      decision: null,

      title,
      review_note,
      decision_reason: null,

      evidence: normalizeEvidenceList(request?.evidence ?? [], now),

      created_at_ms: now,
      updated_at_ms: now,
      decided_at_ms: null,
      returned_at_ms: null,
      disputed_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      data: cloneData(request?.data ?? {})
    };

    this.reviews.set(review.review_id, cloneReview(review));

    this.addIndex(this.intakeIndex, intake_id, review.review_id);

    if (work_order_id) {
      this.addIndex(this.workOrderIndex, work_order_id, review.review_id);
    }

    if (job_id) {
      this.addIndex(this.jobIndex, job_id, review.review_id);
    }

    return {
      ok: true,
      review: cloneReview(review)
    };
  }

  async accept(
    request: WorkProofReviewDecisionRequest
  ): Promise<WorkProofReviewResult> {
    return this.decide(request, "accepted");
  }

  async reject(
    request: WorkProofReviewDecisionRequest
  ): Promise<WorkProofReviewResult> {
    return this.decide(request, "rejected");
  }

  async requestMoreEvidence(
    request: WorkProofReviewDecisionRequest
  ): Promise<WorkProofReviewResult> {
    return this.decide(request, "needs-more-evidence");
  }

  async dispute(
    request: WorkProofReviewDecisionRequest
  ): Promise<WorkProofReviewResult> {
    return this.decide(request, "disputed");
  }

  async seal(review_id: string): Promise<WorkProofReviewResult> {
    const review = this.reviews.get(cleanId(review_id));

    if (!review) {
      return {
        ok: false,
        error: "WORK_PROOF_REVIEW_NOT_FOUND"
      };
    }

    if (!canMove(review.status, "sealed")) {
      return {
        ok: false,
        error: "WORK_PROOF_REVIEW_STATE_LOCKED"
      };
    }

    const now = Date.now();

    review.status = "sealed";
    review.decision = "sealed";
    review.updated_at_ms = now;
    review.sealed_at_ms = now;

    return {
      ok: true,
      review: cloneReview(review)
    };
  }

  async burn(review_id: string): Promise<WorkProofReviewResult> {
    const review = this.reviews.get(cleanId(review_id));

    if (!review) {
      return {
        ok: false,
        error: "WORK_PROOF_REVIEW_NOT_FOUND"
      };
    }

    if (!canMove(review.status, "burned")) {
      return {
        ok: false,
        error: "WORK_PROOF_REVIEW_STATE_LOCKED"
      };
    }

    const now = Date.now();

    review.status = "burned";
    review.decision = "burned";
    review.updated_at_ms = now;
    review.burned_at_ms = now;

    return {
      ok: true,
      review: cloneReview(review)
    };
  }

  async addEvidence(
    review_id: string,
    evidence: WorkProofReviewEvidenceInput
  ): Promise<WorkProofReviewResult> {
    const review = this.reviews.get(cleanId(review_id));

    if (!review) {
      return {
        ok: false,
        error: "WORK_PROOF_REVIEW_NOT_FOUND"
      };
    }

    if (review.status === "sealed" || review.status === "burned") {
      return {
        ok: false,
        error: "WORK_PROOF_REVIEW_LOCKED"
      };
    }

    const item = normalizeEvidence(evidence, Date.now());

    if (!item) {
      return {
        ok: false,
        error: "EVIDENCE_INVALID"
      };
    }

    review.evidence.push(item);
    review.updated_at_ms = Date.now();

    return {
      ok: true,
      review: cloneReview(review)
    };
  }

  async get(
    review_id: string
  ): Promise<WorkProofReviewRecord | null> {
    const review = this.reviews.get(cleanId(review_id));
    return review ? cloneReview(review) : null;
  }

  async listForIntake(
    intake_id: string
  ): Promise<WorkProofReviewListResult> {
    const cleanIntake = cleanId(intake_id);

    if (!cleanIntake) {
      return {
        ok: false,
        reviews: [],
        error: "INTAKE_ID_REQUIRED"
      };
    }

    const ids = this.intakeIndex.get(cleanIntake) ?? new Set<string>();

    return {
      ok: true,
      reviews: this.recordsFromIds(ids)
    };
  }

  async listForWorkOrder(
    work_order_id: string
  ): Promise<WorkProofReviewListResult> {
    const cleanWorkOrder = cleanId(work_order_id);

    if (!cleanWorkOrder) {
      return {
        ok: false,
        reviews: [],
        error: "WORK_ORDER_ID_REQUIRED"
      };
    }

    const ids = this.workOrderIndex.get(cleanWorkOrder) ?? new Set<string>();

    return {
      ok: true,
      reviews: this.recordsFromIds(ids)
    };
  }

  async listForJob(job_id: string): Promise<WorkProofReviewListResult> {
    const cleanJob = cleanId(job_id);

    if (!cleanJob) {
      return {
        ok: false,
        reviews: [],
        error: "JOB_ID_REQUIRED"
      };
    }

    const ids = this.jobIndex.get(cleanJob) ?? new Set<string>();

    return {
      ok: true,
      reviews: this.recordsFromIds(ids)
    };
  }

  async listOpen(): Promise<WorkProofReviewListResult> {
    return {
      ok: true,
      reviews: Array.from(this.reviews.values())
        .filter((review) => review.status === "open")
        .map(cloneReview)
        .sort((a, b) => b.created_at_ms - a.created_at_ms)
    };
  }

  reset(): void {
    this.reviews.clear();
    this.intakeIndex.clear();
    this.workOrderIndex.clear();
    this.jobIndex.clear();
  }

  private async decide(
    request: WorkProofReviewDecisionRequest,
    decision: WorkProofReviewDecision
  ): Promise<WorkProofReviewResult> {
    const review = this.reviews.get(cleanId(request?.review_id));

    if (!review) {
      return {
        ok: false,
        error: "WORK_PROOF_REVIEW_NOT_FOUND"
      };
    }

    const nextStatus = statusFromDecision(decision);

    if (!canMove(review.status, nextStatus)) {
      return {
        ok: false,
        error: "WORK_PROOF_REVIEW_STATE_LOCKED"
      };
    }

    const now = Date.now();

    const reviewer_private_id = cleanNullableId(
      request?.reviewer_private_id ?? null
    );

    const reviewer_public_id = cleanNullableId(
      request?.reviewer_public_id ?? null
    );

    if (reviewer_private_id) {
      review.reviewer_private_id = reviewer_private_id;
    }

    if (reviewer_public_id) {
      review.reviewer_public_id = reviewer_public_id;
    }

    review.status = nextStatus;
    review.decision = decision;
    review.decision_reason = cleanNullableText(request?.reason ?? null, 4000);
    review.updated_at_ms = now;

    if (decision === "accepted" || decision === "rejected") {
      review.decided_at_ms = now;
    }

    if (decision === "needs-more-evidence") {
      review.returned_at_ms = now;
    }

    if (decision === "disputed") {
      review.disputed_at_ms = now;
    }

    return {
      ok: true,
      review: cloneReview(review)
    };
  }

  private recordsFromIds(ids: Set<string>): WorkProofReviewRecord[] {
    return Array.from(ids)
      .map((id) => this.reviews.get(id))
      .filter((item): item is WorkProofReviewRecord => Boolean(item))
      .map(cloneReview)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    review_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(review_id);
    index.set(key, existing);
  }
}

export const CyberCrowdWorkProofReview =
  new InMemoryWorkProofReviewOrgan();

export function isWorkProofReviewDecision(
  value: unknown
): value is WorkProofReviewDecision {
  return (
    value === "accepted" ||
    value === "rejected" ||
    value === "needs-more-evidence" ||
    value === "disputed" ||
    value === "sealed" ||
    value === "burned"
  );
}

export function isWorkProofReviewStatus(
  value: unknown
): value is WorkProofReviewStatus {
  return (
    value === "open" ||
    value === "decided" ||
    value === "returned" ||
    value === "disputed" ||
    value === "sealed" ||
    value === "burned"
  );
}

function statusFromDecision(
  decision: WorkProofReviewDecision
): WorkProofReviewStatus {
  if (decision === "accepted") return "decided";
  if (decision === "rejected") return "decided";
  if (decision === "needs-more-evidence") return "returned";
  if (decision === "disputed") return "disputed";
  if (decision === "sealed") return "sealed";
  if (decision === "burned") return "burned";

  return "open";
}

function canMove(
  from: WorkProofReviewStatus,
  to: WorkProofReviewStatus
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

  if (from === "open") {
    return (
      to === "decided" ||
      to === "returned" ||
      to === "disputed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "returned") {
    return (
      to === "open" ||
      to === "decided" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "disputed") {
    return (
      to === "open" ||
      to === "decided" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "decided") {
    return (
      to === "disputed" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function normalizeEvidenceList(
  evidence: WorkProofReviewEvidenceInput[],
  now: number
): WorkProofReviewEvidence[] {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .map((item) => normalizeEvidence(item, now))
    .filter((item): item is WorkProofReviewEvidence => Boolean(item))
    .slice(0, 100);
}

function normalizeEvidence(
  evidence: WorkProofReviewEvidenceInput,
  now: number
): WorkProofReviewEvidence | null {
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
): value is WorkProofReviewEvidenceKind {
  return (
    value === "intake" ||
    value === "work-order" ||
    value === "footprint" ||
    value === "moment" ||
    value === "proximity" ||
    value === "media" ||
    value === "note" ||
    value === "counterclaim" ||
    value === "other"
  );
}

function cleanSource(value: unknown): WorkProofReviewSource {
  if (
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

function makeReviewId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-proof-review-" +
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
    "work-proof-review-evidence-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneReview(
  review: WorkProofReviewRecord
): WorkProofReviewRecord {
  return {
    review_id: review.review_id,

    tenant_id: review.tenant_id,

    intake_id: review.intake_id,
    work_order_id: review.work_order_id ?? null,
    job_id: review.job_id ?? null,
    match_id: review.match_id ?? null,
    ping_id: review.ping_id ?? null,
    moment_id: review.moment_id ?? null,
    surface_id: review.surface_id ?? null,

    submitter_private_id: review.submitter_private_id ?? null,
    submitter_public_id: review.submitter_public_id ?? null,

    reviewer_private_id: review.reviewer_private_id ?? null,
    reviewer_public_id: review.reviewer_public_id ?? null,

    source: review.source,
    status: review.status,
    decision: review.decision ?? null,

    title: review.title,
    review_note: review.review_note ?? null,
    decision_reason: review.decision_reason ?? null,

    evidence: review.evidence.map(cloneEvidence),

    created_at_ms: review.created_at_ms,
    updated_at_ms: review.updated_at_ms,
    decided_at_ms: review.decided_at_ms ?? null,
    returned_at_ms: review.returned_at_ms ?? null,
    disputed_at_ms: review.disputed_at_ms ?? null,
    sealed_at_ms: review.sealed_at_ms ?? null,
    burned_at_ms: review.burned_at_ms ?? null,

    data: cloneData(review.data)
  };
}

function cloneEvidence(
  evidence: WorkProofReviewEvidence
): WorkProofReviewEvidence {
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
