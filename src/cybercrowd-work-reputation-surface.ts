// src/cybercrowd-work-reputation-surface.ts
//
// CyberCrowd Work Reputation Surface Organ
//
// ONE JOB:
// Present proof-backed work signals without turning Skill Ledger into hidden scoring.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// Skill Ledger stores skill evidence.
// Work Reputation Surface displays readable trust signals.
//
// No hidden score.
// No invisible ranking.
// No silent rejection.
// No invisible punishment.

export type WorkReputationSurfaceStatus =
  | "draft"
  | "active"
  | "limited"
  | "sealed"
  | "burned";

export type WorkReputationSurfaceVisibility =
  | "private"
  | "public"
  | "limited";

export type WorkReputationSignalKind =
  | "completed-work"
  | "verified-proof"
  | "repeat-work"
  | "reference"
  | "training"
  | "license"
  | "creator-work"
  | "service-work"
  | "field-work"
  | "skill-ledger"
  | "work-history"
  | "resume-proof"
  | "other";

export type WorkReputationSignalStrength =
  | "low"
  | "normal"
  | "strong";

export interface WorkReputationSignal {
  signal_id: string;
  kind: WorkReputationSignalKind;
  label: string;
  summary: string | null;
  strength: WorkReputationSignalStrength;
  ref_id: string | null;
  visible: boolean;
  added_at_ms: number;
}

export interface WorkReputationSkillView {
  tag: string;
  label: string;
  evidence_count: number;
  strongest_signal: WorkReputationSignalStrength;
  visibility: WorkReputationSurfaceVisibility;
}

export interface WorkReputationEvidenceRef {
  evidence_id: string;
  kind:
    | "skill-ledger"
    | "work-history"
    | "resume-proof"
    | "work-order"
    | "job"
    | "moment"
    | "reference"
    | "note"
    | "other";
  ref_id: string | null;
  text: string | null;
  visible: boolean;
  added_at_ms: number;
}

export interface WorkReputationSurfaceRecord {
  surface_id: string;

  tenant_id: string;

  actor_private_id: string;
  actor_public_id: string | null;

  source:
    | "skill-ledger"
    | "work-history"
    | "resume-proof"
    | "manual"
    | "unknown";

  status: WorkReputationSurfaceStatus;
  visibility: WorkReputationSurfaceVisibility;

  title: string;
  summary: string | null;

  signals: WorkReputationSignal[];
  skills: WorkReputationSkillView[];
  evidence: WorkReputationEvidenceRef[];

  public_note: string | null;
  private_note: string | null;

  created_at_ms: number;
  updated_at_ms: number;
  activated_at_ms: number | null;
  limited_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface CreateWorkReputationSurfaceRequest {
  tenant_id: string;

  actor_private_id: string;
  actor_public_id?: string | null;

  source?:
    | "skill-ledger"
    | "work-history"
    | "resume-proof"
    | "manual"
    | "unknown";

  visibility?: WorkReputationSurfaceVisibility;

  title: string;
  summary?: string | null;

  signals?: WorkReputationSignalInput[];
  skills?: WorkReputationSkillInput[];
  evidence?: WorkReputationEvidenceInput[];

  public_note?: string | null;
  private_note?: string | null;

  data?: Record<string, unknown>;
}

export interface WorkReputationSignalInput {
  kind: WorkReputationSignalKind;
  label: string;
  summary?: string | null;
  strength?: WorkReputationSignalStrength;
  ref_id?: string | null;
  visible?: boolean;
}

export interface WorkReputationSkillInput {
  tag: string;
  label?: string | null;
  evidence_count?: number;
  strongest_signal?: WorkReputationSignalStrength;
  visibility?: WorkReputationSurfaceVisibility;
}

export interface WorkReputationEvidenceInput {
  kind:
    | "skill-ledger"
    | "work-history"
    | "resume-proof"
    | "work-order"
    | "job"
    | "moment"
    | "reference"
    | "note"
    | "other";
  ref_id?: string | null;
  text?: string | null;
  visible?: boolean;
}

export interface WorkReputationSurfaceResult {
  ok: boolean;
  surface?: WorkReputationSurfaceRecord;
  error?: string;
}

export interface WorkReputationSurfaceListResult {
  ok: boolean;
  surfaces: WorkReputationSurfaceRecord[];
  error?: string;
}

export interface WorkReputationSurfaceOrgan {
  create(
    request: CreateWorkReputationSurfaceRequest
  ): Promise<WorkReputationSurfaceResult>;

  activate(surface_id: string): Promise<WorkReputationSurfaceResult>;

  limit(surface_id: string): Promise<WorkReputationSurfaceResult>;

  seal(surface_id: string): Promise<WorkReputationSurfaceResult>;

  burn(surface_id: string): Promise<WorkReputationSurfaceResult>;

  addSignal(
    surface_id: string,
    signal: WorkReputationSignalInput
  ): Promise<WorkReputationSurfaceResult>;

  addSkill(
    surface_id: string,
    skill: WorkReputationSkillInput
  ): Promise<WorkReputationSurfaceResult>;

  addEvidence(
    surface_id: string,
    evidence: WorkReputationEvidenceInput
  ): Promise<WorkReputationSurfaceResult>;

  setNotes(
    surface_id: string,
    public_note?: string | null,
    private_note?: string | null
  ): Promise<WorkReputationSurfaceResult>;

  get(surface_id: string): Promise<WorkReputationSurfaceRecord | null>;

  getPublicView(surface_id: string): Promise<WorkReputationSurfaceRecord | null>;

  listForActor(
    actor_private_id: string
  ): Promise<WorkReputationSurfaceListResult>;

  listPublicForActor(
    actor_public_id: string
  ): Promise<WorkReputationSurfaceListResult>;
}

export class InMemoryWorkReputationSurfaceOrgan
  implements WorkReputationSurfaceOrgan {
  private readonly surfaces = new Map<string, WorkReputationSurfaceRecord>();
  private readonly actorPrivateIndex = new Map<string, Set<string>>();
  private readonly actorPublicIndex = new Map<string, Set<string>>();

  async create(
    request: CreateWorkReputationSurfaceRequest
  ): Promise<WorkReputationSurfaceResult> {
    const tenant_id = cleanId(request?.tenant_id);
    const actor_private_id = cleanId(request?.actor_private_id);
    const actor_public_id = cleanNullableId(request?.actor_public_id ?? null);

    const source = cleanSource(request?.source ?? "unknown");
    const visibility = cleanVisibility(request?.visibility ?? "private");

    const title = cleanText(request?.title ?? "", 240);
    const summary = cleanNullableText(request?.summary ?? null, 2000);

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
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
        error: "WORK_REPUTATION_TITLE_REQUIRED"
      };
    }

    const now = Date.now();

    const surface: WorkReputationSurfaceRecord = {
      surface_id: makeSurfaceId(),

      tenant_id,

      actor_private_id,
      actor_public_id,

      source,
      status: "draft",
      visibility,

      title,
      summary,

      signals: normalizeSignals(request?.signals ?? [], now),
      skills: normalizeSkills(request?.skills ?? []),
      evidence: normalizeEvidenceList(request?.evidence ?? [], now),

      public_note: cleanNullableText(request?.public_note ?? null, 2000),
      private_note: cleanNullableText(request?.private_note ?? null, 4000),

      created_at_ms: now,
      updated_at_ms: now,
      activated_at_ms: null,
      limited_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      data: cloneData(request?.data ?? {})
    };

    this.surfaces.set(surface.surface_id, cloneSurface(surface));

    this.addIndex(this.actorPrivateIndex, actor_private_id, surface.surface_id);

    if (actor_public_id) {
      this.addIndex(this.actorPublicIndex, actor_public_id, surface.surface_id);
    }

    return {
      ok: true,
      surface: cloneSurface(surface)
    };
  }

  async activate(surface_id: string): Promise<WorkReputationSurfaceResult> {
    return this.transition(surface_id, "active");
  }

  async limit(surface_id: string): Promise<WorkReputationSurfaceResult> {
    return this.transition(surface_id, "limited");
  }

  async seal(surface_id: string): Promise<WorkReputationSurfaceResult> {
    return this.transition(surface_id, "sealed");
  }

  async burn(surface_id: string): Promise<WorkReputationSurfaceResult> {
    return this.transition(surface_id, "burned");
  }

  async addSignal(
    surface_id: string,
    signal: WorkReputationSignalInput
  ): Promise<WorkReputationSurfaceResult> {
    const surface = this.surfaces.get(cleanId(surface_id));

    if (!surface) {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_NOT_FOUND"
      };
    }

    if (surface.status === "sealed" || surface.status === "burned") {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_LOCKED"
      };
    }

    const cleanSignal = normalizeSignal(signal, Date.now());

    if (!cleanSignal) {
      return {
        ok: false,
        error: "WORK_REPUTATION_SIGNAL_INVALID"
      };
    }

    surface.signals.push(cleanSignal);
    surface.signals = surface.signals.slice(0, 100);
    surface.updated_at_ms = Date.now();

    return {
      ok: true,
      surface: cloneSurface(surface)
    };
  }

  async addSkill(
    surface_id: string,
    skill: WorkReputationSkillInput
  ): Promise<WorkReputationSurfaceResult> {
    const surface = this.surfaces.get(cleanId(surface_id));

    if (!surface) {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_NOT_FOUND"
      };
    }

    if (surface.status === "sealed" || surface.status === "burned") {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_LOCKED"
      };
    }

    const cleanSkill = normalizeSkill(skill);

    if (!cleanSkill) {
      return {
        ok: false,
        error: "WORK_REPUTATION_SKILL_INVALID"
      };
    }

    const existing = surface.skills.find((item) => item.tag === cleanSkill.tag);

    if (existing) {
      existing.evidence_count = Math.max(
        existing.evidence_count,
        cleanSkill.evidence_count
      );

      existing.strongest_signal = strongerSignal(
        existing.strongest_signal,
        cleanSkill.strongest_signal
      );

      existing.visibility = mostVisible(existing.visibility, cleanSkill.visibility);
      existing.label = existing.label || cleanSkill.label;
    } else {
      surface.skills.push(cleanSkill);
    }

    surface.skills = surface.skills.slice(0, 100);
    surface.updated_at_ms = Date.now();

    return {
      ok: true,
      surface: cloneSurface(surface)
    };
  }

  async addEvidence(
    surface_id: string,
    evidence: WorkReputationEvidenceInput
  ): Promise<WorkReputationSurfaceResult> {
    const surface = this.surfaces.get(cleanId(surface_id));

    if (!surface) {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_NOT_FOUND"
      };
    }

    if (surface.status === "sealed" || surface.status === "burned") {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_LOCKED"
      };
    }

    const cleanEvidence = normalizeEvidence(evidence, Date.now());

    if (!cleanEvidence) {
      return {
        ok: false,
        error: "WORK_REPUTATION_EVIDENCE_INVALID"
      };
    }

    surface.evidence.push(cleanEvidence);
    surface.evidence = surface.evidence.slice(0, 100);
    surface.updated_at_ms = Date.now();

    return {
      ok: true,
      surface: cloneSurface(surface)
    };
  }

  async setNotes(
    surface_id: string,
    public_note: string | null = null,
    private_note: string | null = null
  ): Promise<WorkReputationSurfaceResult> {
    const surface = this.surfaces.get(cleanId(surface_id));

    if (!surface) {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_NOT_FOUND"
      };
    }

    if (surface.status === "sealed" || surface.status === "burned") {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_LOCKED"
      };
    }

    surface.public_note = cleanNullableText(public_note, 2000);
    surface.private_note = cleanNullableText(private_note, 4000);
    surface.updated_at_ms = Date.now();

    return {
      ok: true,
      surface: cloneSurface(surface)
    };
  }

  async get(
    surface_id: string
  ): Promise<WorkReputationSurfaceRecord | null> {
    const surface = this.surfaces.get(cleanId(surface_id));
    return surface ? cloneSurface(surface) : null;
  }

  async getPublicView(
    surface_id: string
  ): Promise<WorkReputationSurfaceRecord | null> {
    const surface = this.surfaces.get(cleanId(surface_id));

    if (!surface) return null;

    if (surface.visibility !== "public" || surface.status !== "active") {
      return null;
    }

    return publicSurface(surface);
  }

  async listForActor(
    actor_private_id: string
  ): Promise<WorkReputationSurfaceListResult> {
    const cleanActor = cleanId(actor_private_id);

    if (!cleanActor) {
      return {
        ok: false,
        surfaces: [],
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.actorPrivateIndex.get(cleanActor) ?? new Set<string>();

    return {
      ok: true,
      surfaces: this.recordsFromIds(ids)
    };
  }

  async listPublicForActor(
    actor_public_id: string
  ): Promise<WorkReputationSurfaceListResult> {
    const cleanActor = cleanId(actor_public_id);

    if (!cleanActor) {
      return {
        ok: false,
        surfaces: [],
        error: "ACTOR_PUBLIC_ID_REQUIRED"
      };
    }

    const ids = this.actorPublicIndex.get(cleanActor) ?? new Set<string>();

    return {
      ok: true,
      surfaces: this.recordsFromIds(ids)
        .filter(
          (surface) =>
            surface.visibility === "public" &&
            surface.status === "active"
        )
        .map(publicSurface)
    };
  }

  reset(): void {
    this.surfaces.clear();
    this.actorPrivateIndex.clear();
    this.actorPublicIndex.clear();
  }

  private async transition(
    surface_id: string,
    status: WorkReputationSurfaceStatus
  ): Promise<WorkReputationSurfaceResult> {
    const surface = this.surfaces.get(cleanId(surface_id));

    if (!surface) {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_NOT_FOUND"
      };
    }

    if (!canMove(surface.status, status)) {
      return {
        ok: false,
        error: "WORK_REPUTATION_SURFACE_STATE_LOCKED"
      };
    }

    const now = Date.now();

    surface.status = status;
    surface.updated_at_ms = now;

    if (status === "active") surface.activated_at_ms = now;
    if (status === "limited") surface.limited_at_ms = now;
    if (status === "sealed") surface.sealed_at_ms = now;
    if (status === "burned") surface.burned_at_ms = now;

    return {
      ok: true,
      surface: cloneSurface(surface)
    };
  }

  private recordsFromIds(ids: Set<string>): WorkReputationSurfaceRecord[] {
    return Array.from(ids)
      .map((id) => this.surfaces.get(id))
      .filter((item): item is WorkReputationSurfaceRecord => Boolean(item))
      .map(cloneSurface)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    surface_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(surface_id);
    index.set(key, existing);
  }
}

export const CyberCrowdWorkReputationSurface =
  new InMemoryWorkReputationSurfaceOrgan();

export function isWorkReputationSurfaceStatus(
  value: unknown
): value is WorkReputationSurfaceStatus {
  return (
    value === "draft" ||
    value === "active" ||
    value === "limited" ||
    value === "sealed" ||
    value === "burned"
  );
}

function canMove(
  from: WorkReputationSurfaceStatus,
  to: WorkReputationSurfaceStatus
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
      to === "limited" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "active") {
    return (
      to === "limited" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  if (from === "limited") {
    return (
      to === "active" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function publicSurface(
  surface: WorkReputationSurfaceRecord
): WorkReputationSurfaceRecord {
  const clone = cloneSurface(surface);

  clone.actor_private_id = "";
  clone.private_note = null;

  clone.signals = clone.signals.filter((signal) => signal.visible);
  clone.evidence = clone.evidence.filter((evidence) => evidence.visible);
  clone.skills = clone.skills.filter((skill) => skill.visibility === "public");

  return clone;
}

function normalizeSignals(
  signals: WorkReputationSignalInput[],
  now: number
): WorkReputationSignal[] {
  if (!Array.isArray(signals)) {
    return [];
  }

  return signals
    .map((signal) => normalizeSignal(signal, now))
    .filter((signal): signal is WorkReputationSignal => Boolean(signal))
    .slice(0, 100);
}

function normalizeSignal(
  signal: WorkReputationSignalInput,
  now: number
): WorkReputationSignal | null {
  if (!signal || typeof signal !== "object") {
    return null;
  }

  const kind = cleanSignalKind(signal.kind);
  const label = cleanText(signal.label, 240);

  if (!kind || !label) {
    return null;
  }

  return {
    signal_id: makeSignalId(),
    kind,
    label,
    summary: cleanNullableText(signal.summary ?? null, 2000),
    strength: cleanStrength(signal.strength ?? "normal"),
    ref_id: cleanNullableId(signal.ref_id ?? null),
    visible: signal.visible !== false,
    added_at_ms: now
  };
}

function normalizeSkills(
  skills: WorkReputationSkillInput[]
): WorkReputationSkillView[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const byTag = new Map<string, WorkReputationSkillView>();

  for (const skill of skills) {
    const cleanSkill = normalizeSkill(skill);

    if (!cleanSkill) continue;

    const existing = byTag.get(cleanSkill.tag);

    if (!existing) {
      byTag.set(cleanSkill.tag, cleanSkill);
      continue;
    }

    existing.evidence_count = Math.max(
      existing.evidence_count,
      cleanSkill.evidence_count
    );

    existing.strongest_signal = strongerSignal(
      existing.strongest_signal,
      cleanSkill.strongest_signal
    );

    existing.visibility = mostVisible(existing.visibility, cleanSkill.visibility);
  }

  return Array.from(byTag.values()).slice(0, 100);
}

function normalizeSkill(
  skill: WorkReputationSkillInput
): WorkReputationSkillView | null {
  if (!skill || typeof skill !== "object") {
    return null;
  }

  const tag = cleanSkillTag(skill.tag);

  if (!tag) {
    return null;
  }

  return {
    tag,
    label: cleanText(skill.label ?? tag, 240) || tag,
    evidence_count: cleanCount(skill.evidence_count ?? 1),
    strongest_signal: cleanStrength(skill.strongest_signal ?? "normal"),
    visibility: cleanVisibility(skill.visibility ?? "private")
  };
}

function normalizeEvidenceList(
  evidence: WorkReputationEvidenceInput[],
  now: number
): WorkReputationEvidenceRef[] {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .map((item) => normalizeEvidence(item, now))
    .filter((item): item is WorkReputationEvidenceRef => Boolean(item))
    .slice(0, 100);
}

function normalizeEvidence(
  evidence: WorkReputationEvidenceInput,
  now: number
): WorkReputationEvidenceRef | null {
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
    visible: evidence.visible !== false,
    added_at_ms: now
  };
}

function isEvidenceKind(
  value: unknown
): value is WorkReputationEvidenceRef["kind"] {
  return (
    value === "skill-ledger" ||
    value === "work-history" ||
    value === "resume-proof" ||
    value === "work-order" ||
    value === "job" ||
    value === "moment" ||
    value === "reference" ||
    value === "note" ||
    value === "other"
  );
}

function cleanSignalKind(value: unknown): WorkReputationSignalKind | null {
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
    value === "skill-ledger" ||
    value === "work-history" ||
    value === "resume-proof" ||
    value === "other"
  ) {
    return value;
  }

  return null;
}

function cleanSource(
  value: unknown
): WorkReputationSurfaceRecord["source"] {
  if (
    value === "skill-ledger" ||
    value === "work-history" ||
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
): WorkReputationSurfaceVisibility {
  if (
    value === "private" ||
    value === "public" ||
    value === "limited"
  ) {
    return value;
  }

  return "private";
}

function cleanStrength(
  value: unknown
): WorkReputationSignalStrength {
  if (
    value === "low" ||
    value === "normal" ||
    value === "strong"
  ) {
    return value;
  }

  return "normal";
}

function strongerSignal(
  a: WorkReputationSignalStrength,
  b: WorkReputationSignalStrength
): WorkReputationSignalStrength {
  const rank: Record<WorkReputationSignalStrength, number> = {
    low: 1,
    normal: 2,
    strong: 3
  };

  return rank[b] > rank[a] ? b : a;
}

function mostVisible(
  a: WorkReputationSurfaceVisibility,
  b: WorkReputationSurfaceVisibility
): WorkReputationSurfaceVisibility {
  if (a === "public" || b === "public") return "public";
  if (a === "limited" || b === "limited") return "limited";
  return "private";
}

function cleanCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  if (value < 0) return 0;
  if (value > 100000) return 100000;

  return Math.floor(value);
}

function makeSurfaceId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-reputation-surface-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function makeSignalId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-reputation-signal-" +
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
    "work-reputation-evidence-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneSurface(
  surface: WorkReputationSurfaceRecord
): WorkReputationSurfaceRecord {
  return {
    surface_id: surface.surface_id,

    tenant_id: surface.tenant_id,

    actor_private_id: surface.actor_private_id,
    actor_public_id: surface.actor_public_id ?? null,

    source: surface.source,
    status: surface.status,
    visibility: surface.visibility,

    title: surface.title,
    summary: surface.summary ?? null,

    signals: surface.signals.map(cloneSignal),
    skills: surface.skills.map(cloneSkill),
    evidence: surface.evidence.map(cloneEvidence),

    public_note: surface.public_note ?? null,
    private_note: surface.private_note ?? null,

    created_at_ms: surface.created_at_ms,
    updated_at_ms: surface.updated_at_ms,
    activated_at_ms: surface.activated_at_ms ?? null,
    limited_at_ms: surface.limited_at_ms ?? null,
    sealed_at_ms: surface.sealed_at_ms ?? null,
    burned_at_ms: surface.burned_at_ms ?? null,

    data: cloneData(surface.data)
  };
}

function cloneSignal(signal: WorkReputationSignal): WorkReputationSignal {
  return {
    signal_id: signal.signal_id,
    kind: signal.kind,
    label: signal.label,
    summary: signal.summary ?? null,
    strength: signal.strength,
    ref_id: signal.ref_id ?? null,
    visible: signal.visible,
    added_at_ms: signal.added_at_ms
  };
}

function cloneSkill(skill: WorkReputationSkillView): WorkReputationSkillView {
  return {
    tag: skill.tag,
    label: skill.label,
    evidence_count: skill.evidence_count,
    strongest_signal: skill.strongest_signal,
    visibility: skill.visibility
  };
}

function cloneEvidence(
  evidence: WorkReputationEvidenceRef
): WorkReputationEvidenceRef {
  return {
    evidence_id: evidence.evidence_id,
    kind: evidence.kind,
    ref_id: evidence.ref_id ?? null,
    text: evidence.text ?? null,
    visible: evidence.visible,
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
