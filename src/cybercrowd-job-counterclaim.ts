// src/cybercrowd-job-counterclaim.ts
//
// CyberCrowd Job Counterclaim Organ
//
// ONE JOB:
// Give humans a clean challenge path when a job is marked filled,
// cancelled, late, completed, rejected, disputed, or moved incorrectly.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT punishment.
// This is NOT authority.
//
// A counterclaim is a structured challenge.
// A counterclaim is evidence.
// A counterclaim is not automatic victory.
// A counterclaim is not hidden punishment.
//
// Root rule:
// No invisible punishment.
// No silent rejection.
// No dead-end job status.

export type JobCounterclaimType =
  | "accepted-first"
  | "showed-up"
  | "completed-work"
  | "cancelled-unfairly"
  | "already-filled"
  | "proof-wrong"
  | "payment-dispute"
  | "timing-dispute"
  | "status-dispute"
  | "other";

export type JobCounterclaimStatus =
  | "open"
  | "acknowledged"
  | "under-review"
  | "resolved"
  | "rejected"
  | "cancelled";

export type JobCounterclaimPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export interface JobCounterclaimEvidence {
  evidence_id: string;
  kind: "footprint" | "moment" | "ping" | "proximity" | "media" | "note" | "other";
  ref_id: string | null;
  text: string | null;
  added_at_ms: number;
}

export interface JobCounterclaimRecord {
  counterclaim_id: string;
  job_id: string;
  claimant_private_id: string;
  claimant_public_id: string | null;
  moment_id: string | null;
  footprint_id: string | null;
  ping_id: string | null;
  type: JobCounterclaimType;
  status: JobCounterclaimStatus;
  priority: JobCounterclaimPriority;
  reason: string;
  evidence: JobCounterclaimEvidence[];
  created_at_ms: number;
  updated_at_ms: number;
  acknowledged_at_ms: number | null;
  review_started_at_ms: number | null;
  resolved_at_ms: number | null;
  rejected_at_ms: number | null;
  cancelled_at_ms: number | null;
  resolution_note: string | null;
  data: Record<string, unknown>;
}

export interface SubmitJobCounterclaimRequest {
  job_id: string;
  claimant_private_id: string;
  claimant_public_id?: string | null;
  moment_id?: string | null;
  footprint_id?: string | null;
  ping_id?: string | null;
  type: JobCounterclaimType;
  priority?: JobCounterclaimPriority;
  reason: string;
  evidence?: JobCounterclaimEvidenceInput[];
  data?: Record<string, unknown>;
}

export interface JobCounterclaimEvidenceInput {
  kind: "footprint" | "moment" | "ping" | "proximity" | "media" | "note" | "other";
  ref_id?: string | null;
  text?: string | null;
}

export interface JobCounterclaimResult {
  ok: boolean;
  counterclaim?: JobCounterclaimRecord;
  error?: string;
}

export interface JobCounterclaimListResult {
  ok: boolean;
  counterclaims: JobCounterclaimRecord[];
  error?: string;
}

export interface JobCounterclaimOrgan {
  submit(request: SubmitJobCounterclaimRequest): Promise<JobCounterclaimResult>;
  acknowledge(counterclaim_id: string): Promise<JobCounterclaimResult>;
  startReview(counterclaim_id: string): Promise<JobCounterclaimResult>;
  resolve(counterclaim_id: string, note?: string | null): Promise<JobCounterclaimResult>;
  reject(counterclaim_id: string, note?: string | null): Promise<JobCounterclaimResult>;
  cancel(counterclaim_id: string): Promise<JobCounterclaimResult>;
  addEvidence(
    counterclaim_id: string,
    evidence: JobCounterclaimEvidenceInput
  ): Promise<JobCounterclaimResult>;
  get(counterclaim_id: string): Promise<JobCounterclaimRecord | null>;
  listForJob(job_id: string): Promise<JobCounterclaimListResult>;
  listForClaimant(claimant_private_id: string): Promise<JobCounterclaimListResult>;
  listOpen(): Promise<JobCounterclaimListResult>;
}

export class InMemoryJobCounterclaimOrgan implements JobCounterclaimOrgan {
  private readonly counterclaims = new Map<string, JobCounterclaimRecord>();
  private readonly jobIndex = new Map<string, Set<string>>();
  private readonly claimantIndex = new Map<string, Set<string>>();

  async submit(
    request: SubmitJobCounterclaimRequest
  ): Promise<JobCounterclaimResult> {
    const job_id = cleanId(request?.job_id);
    const claimant_private_id = cleanId(request?.claimant_private_id);
    const claimant_public_id = cleanNullableId(request?.claimant_public_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const footprint_id = cleanNullableId(request?.footprint_id ?? null);
    const ping_id = cleanNullableId(request?.ping_id ?? null);
    const type = cleanCounterclaimType(request?.type);
    const priority = cleanPriority(request?.priority ?? "normal");
    const reason = cleanText(request?.reason ?? "", 4000);

    if (!job_id) {
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };
    }

    if (!claimant_private_id) {
      return {
        ok: false,
        error: "CLAIMANT_PRIVATE_ID_REQUIRED"
      };
    }

    if (!type) {
      return {
        ok: false,
        error: "COUNTERCLAIM_TYPE_INVALID"
      };
    }

    if (!reason) {
      return {
        ok: false,
        error: "COUNTERCLAIM_REASON_REQUIRED"
      };
    }

    const now = Date.now();

    const counterclaim: JobCounterclaimRecord = {
      counterclaim_id: makeCounterclaimId(),
      job_id,
      claimant_private_id,
      claimant_public_id,
      moment_id,
      footprint_id,
      ping_id,
      type,
      status: "open",
      priority,
      reason,
      evidence: normalizeEvidenceList(request.evidence ?? [], now),
      created_at_ms: now,
      updated_at_ms: now,
      acknowledged_at_ms: null,
      review_started_at_ms: null,
      resolved_at_ms: null,
      rejected_at_ms: null,
      cancelled_at_ms: null,
      resolution_note: null,
      data: cloneData(request.data ?? {})
    };

    this.counterclaims.set(
      counterclaim.counterclaim_id,
      cloneCounterclaim(counterclaim)
    );

    this.addIndex(this.jobIndex, job_id, counterclaim.counterclaim_id);
    this.addIndex(
      this.claimantIndex,
      claimant_private_id,
      counterclaim.counterclaim_id
    );

    return {
      ok: true,
      counterclaim: cloneCounterclaim(counterclaim)
    };
  }

  async acknowledge(counterclaim_id: string): Promise<JobCounterclaimResult> {
    const counterclaim = this.counterclaims.get(cleanId(counterclaim_id));

    if (!counterclaim) {
      return {
        ok: false,
        error: "COUNTERCLAIM_NOT_FOUND"
      };
    }

    if (!canMove(counterclaim.status, "acknowledged")) {
      return {
        ok: false,
        error: "COUNTERCLAIM_STATE_LOCKED"
      };
    }

    const now = Date.now();

    counterclaim.status = "acknowledged";
    counterclaim.acknowledged_at_ms = now;
    counterclaim.updated_at_ms = now;

    return {
      ok: true,
      counterclaim: cloneCounterclaim(counterclaim)
    };
  }

  async startReview(counterclaim_id: string): Promise<JobCounterclaimResult> {
    const counterclaim = this.counterclaims.get(cleanId(counterclaim_id));

    if (!counterclaim) {
      return {
        ok: false,
        error: "COUNTERCLAIM_NOT_FOUND"
      };
    }

    if (!canMove(counterclaim.status, "under-review")) {
      return {
        ok: false,
        error: "COUNTERCLAIM_STATE_LOCKED"
      };
    }

    const now = Date.now();

    counterclaim.status = "under-review";
    counterclaim.review_started_at_ms = now;
    counterclaim.updated_at_ms = now;

    if (!counterclaim.acknowledged_at_ms) {
      counterclaim.acknowledged_at_ms = now;
    }

    return {
      ok: true,
      counterclaim: cloneCounterclaim(counterclaim)
    };
  }

  async resolve(
    counterclaim_id: string,
    note: string | null = null
  ): Promise<JobCounterclaimResult> {
    const counterclaim = this.counterclaims.get(cleanId(counterclaim_id));

    if (!counterclaim) {
      return {
        ok: false,
        error: "COUNTERCLAIM_NOT_FOUND"
      };
    }

    if (!canMove(counterclaim.status, "resolved")) {
      return {
        ok: false,
        error: "COUNTERCLAIM_STATE_LOCKED"
      };
    }

    const now = Date.now();

    counterclaim.status = "resolved";
    counterclaim.resolved_at_ms = now;
    counterclaim.updated_at_ms = now;
    counterclaim.resolution_note = cleanNullableText(note, 4000);

    return {
      ok: true,
      counterclaim: cloneCounterclaim(counterclaim)
    };
  }

  async reject(
    counterclaim_id: string,
    note: string | null = null
  ): Promise<JobCounterclaimResult> {
    const counterclaim = this.counterclaims.get(cleanId(counterclaim_id));

    if (!counterclaim) {
      return {
        ok: false,
        error: "COUNTERCLAIM_NOT_FOUND"
      };
    }

    if (!canMove(counterclaim.status, "rejected")) {
      return {
        ok: false,
        error: "COUNTERCLAIM_STATE_LOCKED"
      };
    }

    const now = Date.now();

    counterclaim.status = "rejected";
    counterclaim.rejected_at_ms = now;
    counterclaim.updated_at_ms = now;
    counterclaim.resolution_note = cleanNullableText(note, 4000);

    return {
      ok: true,
      counterclaim: cloneCounterclaim(counterclaim)
    };
  }

  async cancel(counterclaim_id: string): Promise<JobCounterclaimResult> {
    const counterclaim = this.counterclaims.get(cleanId(counterclaim_id));

    if (!counterclaim) {
      return {
        ok: false,
        error: "COUNTERCLAIM_NOT_FOUND"
      };
    }

    if (!canMove(counterclaim.status, "cancelled")) {
      return {
        ok: false,
        error: "COUNTERCLAIM_STATE_LOCKED"
      };
    }

    const now = Date.now();

    counterclaim.status = "cancelled";
    counterclaim.cancelled_at_ms = now;
    counterclaim.updated_at_ms = now;

    return {
      ok: true,
      counterclaim: cloneCounterclaim(counterclaim)
    };
  }

  async addEvidence(
    counterclaim_id: string,
    evidence: JobCounterclaimEvidenceInput
  ): Promise<JobCounterclaimResult> {
    const counterclaim = this.counterclaims.get(cleanId(counterclaim_id));

    if (!counterclaim) {
      return {
        ok: false,
        error: "COUNTERCLAIM_NOT_FOUND"
      };
    }

    if (isFinalStatus(counterclaim.status)) {
      return {
        ok: false,
        error: "COUNTERCLAIM_STATE_LOCKED"
      };
    }

    const item = normalizeEvidence(evidence, Date.now());

    if (!item) {
      return {
        ok: false,
        error: "EVIDENCE_INVALID"
      };
    }

    counterclaim.evidence.push(item);
    counterclaim.updated_at_ms = Date.now();

    return {
      ok: true,
      counterclaim: cloneCounterclaim(counterclaim)
    };
  }

  async get(counterclaim_id: string): Promise<JobCounterclaimRecord | null> {
    const counterclaim = this.counterclaims.get(cleanId(counterclaim_id));
    return counterclaim ? cloneCounterclaim(counterclaim) : null;
  }

  async listForJob(job_id: string): Promise<JobCounterclaimListResult> {
    const cleanJobId = cleanId(job_id);

    if (!cleanJobId) {
      return {
        ok: false,
        counterclaims: [],
        error: "JOB_ID_REQUIRED"
      };
    }

    const ids = this.jobIndex.get(cleanJobId) ?? new Set<string>();

    return {
      ok: true,
      counterclaims: this.recordsFromIds(ids)
    };
  }

  async listForClaimant(
    claimant_private_id: string
  ): Promise<JobCounterclaimListResult> {
    const cleanClaimantId = cleanId(claimant_private_id);

    if (!cleanClaimantId) {
      return {
        ok: false,
        counterclaims: [],
        error: "CLAIMANT_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.claimantIndex.get(cleanClaimantId) ?? new Set<string>();

    return {
      ok: true,
      counterclaims: this.recordsFromIds(ids)
    };
  }

  async listOpen(): Promise<JobCounterclaimListResult> {
    return {
      ok: true,
      counterclaims: Array.from(this.counterclaims.values())
        .filter((item) => !isFinalStatus(item.status))
        .map(cloneCounterclaim)
        .sort((a, b) => b.created_at_ms - a.created_at_ms)
    };
  }

  reset(): void {
    this.counterclaims.clear();
    this.jobIndex.clear();
    this.claimantIndex.clear();
  }

  private recordsFromIds(ids: Set<string>): JobCounterclaimRecord[] {
    return Array.from(ids)
      .map((id) => this.counterclaims.get(id))
      .filter((item): item is JobCounterclaimRecord => Boolean(item))
      .map(cloneCounterclaim)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    counterclaim_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(counterclaim_id);
    index.set(key, existing);
  }
}

export const CyberCrowdJobCounterclaims =
  new InMemoryJobCounterclaimOrgan();

export function isJobCounterclaimType(
  value: unknown
): value is JobCounterclaimType {
  return (
    value === "accepted-first" ||
    value === "showed-up" ||
    value === "completed-work" ||
    value === "cancelled-unfairly" ||
    value === "already-filled" ||
    value === "proof-wrong" ||
    value === "payment-dispute" ||
    value === "timing-dispute" ||
    value === "status-dispute" ||
    value === "other"
  );
}

export function isJobCounterclaimStatus(
  value: unknown
): value is JobCounterclaimStatus {
  return (
    value === "open" ||
    value === "acknowledged" ||
    value === "under-review" ||
    value === "resolved" ||
    value === "rejected" ||
    value === "cancelled"
  );
}

export function isJobCounterclaimPriority(
  value: unknown
): value is JobCounterclaimPriority {
  return (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "urgent"
  );
}

function canMove(
  from: JobCounterclaimStatus,
  to: JobCounterclaimStatus
): boolean {
  if (isFinalStatus(from)) {
    return false;
  }

  if (from === to) {
    return true;
  }

  if (from === "open") {
    return (
      to === "acknowledged" ||
      to === "under-review" ||
      to === "resolved" ||
      to === "rejected" ||
      to === "cancelled"
    );
  }

  if (from === "acknowledged") {
    return (
      to === "under-review" ||
      to === "resolved" ||
      to === "rejected" ||
      to === "cancelled"
    );
  }

  if (from === "under-review") {
    return (
      to === "resolved" ||
      to === "rejected" ||
      to === "cancelled"
    );
  }

  return false;
}

function isFinalStatus(status: JobCounterclaimStatus): boolean {
  return (
    status === "resolved" ||
    status === "rejected" ||
    status === "cancelled"
  );
}

function normalizeEvidenceList(
  evidence: JobCounterclaimEvidenceInput[],
  now: number
): JobCounterclaimEvidence[] {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .map((item) => normalizeEvidence(item, now))
    .filter((item): item is JobCounterclaimEvidence => Boolean(item))
    .slice(0, 50);
}

function normalizeEvidence(
  evidence: JobCounterclaimEvidenceInput,
  now: number
): JobCounterclaimEvidence | null {
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
): value is JobCounterclaimEvidence["kind"] {
  return (
    value === "footprint" ||
    value === "moment" ||
    value === "ping" ||
    value === "proximity" ||
    value === "media" ||
    value === "note" ||
    value === "other"
  );
}

function cleanCounterclaimType(
  value: unknown
): JobCounterclaimType | null {
  return isJobCounterclaimType(value) ? value : null;
}

function cleanPriority(value: unknown): JobCounterclaimPriority {
  return isJobCounterclaimPriority(value) ? value : "normal";
}

function makeCounterclaimId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "counterclaim-" +
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
    "evidence-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneCounterclaim(
  record: JobCounterclaimRecord
): JobCounterclaimRecord {
  return {
    counterclaim_id: record.counterclaim_id,
    job_id: record.job_id,
    claimant_private_id: record.claimant_private_id,
    claimant_public_id: record.claimant_public_id ?? null,
    moment_id: record.moment_id ?? null,
    footprint_id: record.footprint_id ?? null,
    ping_id: record.ping_id ?? null,
    type: record.type,
    status: record.status,
    priority: record.priority,
    reason: record.reason,
    evidence: record.evidence.map(cloneEvidence),
    created_at_ms: record.created_at_ms,
    updated_at_ms: record.updated_at_ms,
    acknowledged_at_ms: record.acknowledged_at_ms ?? null,
    review_started_at_ms: record.review_started_at_ms ?? null,
    resolved_at_ms: record.resolved_at_ms ?? null,
    rejected_at_ms: record.rejected_at_ms ?? null,
    cancelled_at_ms: record.cancelled_at_ms ?? null,
    resolution_note: record.resolution_note ?? null,
    data: cloneData(record.data)
  };
}

function cloneEvidence(
  evidence: JobCounterclaimEvidence
): JobCounterclaimEvidence {
  return {
    evidence_id: evidence.evidence_id,
    kind: evidence.kind,
    ref_id: evidence.ref_id ?? null,
    text: evidence.text ?? null,
    added_at_ms: evidence.added_at_ms
  };
}

function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  const text = cleanText(value, maxLength);
  return text || null;
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
