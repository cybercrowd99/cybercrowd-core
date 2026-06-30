// src/cybercrowd-reputation-to-profile-bridge.ts
//
// CyberCrowd Reputation To Profile Bridge Organ
//
// ONE JOB:
// Move approved Work Reputation Surface signals into a public profile payload
// without exposing protected identity, private notes, hidden evidence, or review rails.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// Reputation Surface prepares readable trust signals.
// Bridge controls what crosses into public profile.
// Public Profile shows the human-facing resume identity.
//
// private_id stays protected.
// public_id is the public rail.
//
// No hidden score.
// No invisible ranking.
// No silent rejection.
// No protected identity leak.

export type ReputationToProfileBridgeStatus =
  | "prepared"
  | "sent"
  | "linked"
  | "rejected"
  | "sealed"
  | "burned";

export type ReputationToProfileBridgeSource =
  | "work-reputation-surface"
  | "skill-ledger"
  | "work-history"
  | "resume-proof"
  | "manual"
  | "unknown";

export type ProfileSignalKind =
  | "completed-work"
  | "verified-proof"
  | "repeat-work"
  | "reference"
  | "training"
  | "license"
  | "creator-work"
  | "service-work"
  | "field-work"
  | "skill"
  | "resume-proof"
  | "work-history"
  | "other";

export type ProfileSignalStrength =
  | "low"
  | "normal"
  | "strong";

export interface ProfileBridgeSignal {
  signal_id: string;
  kind: ProfileSignalKind;
  label: string;
  summary: string | null;
  strength: ProfileSignalStrength;
  ref_id: string | null;
  added_at_ms: number;
}

export interface ProfileBridgeSkill {
  tag: string;
  label: string;
  evidence_count: number;
  strongest_signal: ProfileSignalStrength;
}

export interface ProfileBridgeEvidenceRef {
  evidence_id: string;
  kind:
    | "work-reputation-surface"
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
  added_at_ms: number;
}

export interface ReputationToProfilePayload {
  actor_public_id: string;

  profile_title: string;
  profile_summary: string | null;

  signals: ProfileBridgeSignal[];
  skills: ProfileBridgeSkill[];
  evidence: ProfileBridgeEvidenceRef[];

  public_note: string | null;

  source_surface_id: string;
  source_visibility: "public" | "limited";

  occurred_at_ms: number;

  data: Record<string, unknown>;
}

export interface ReputationToProfileBridgeRecord {
  bridge_id: string;

  tenant_id: string;

  reputation_surface_id: string;
  skill_ledger_entry_id: string | null;
  work_history_entry_id: string | null;
  resume_proof_id: string | null;
  work_order_id: string | null;
  job_id: string | null;
  moment_id: string | null;

  actor_private_id: string;
  actor_public_id: string;

  source: ReputationToProfileBridgeSource;
  status: ReputationToProfileBridgeStatus;

  public_profile_entry_id: string | null;

  payload: ReputationToProfilePayload;

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

export interface PrepareReputationToProfileRequest {
  tenant_id: string;

  reputation_surface_id: string;
  skill_ledger_entry_id?: string | null;
  work_history_entry_id?: string | null;
  resume_proof_id?: string | null;
  work_order_id?: string | null;
  job_id?: string | null;
  moment_id?: string | null;

  actor_private_id: string;
  actor_public_id: string;

  source?: ReputationToProfileBridgeSource;

  profile_title: string;
  profile_summary?: string | null;

  public_note?: string | null;

  source_visibility?: "public" | "limited";

  signals?: ProfileBridgeSignalInput[];
  skills?: ProfileBridgeSkillInput[];
  evidence?: ProfileBridgeEvidenceInput[];

  occurred_at_ms?: number | null;

  data?: Record<string, unknown>;
}

export interface ProfileBridgeSignalInput {
  kind: ProfileSignalKind;
  label: string;
  summary?: string | null;
  strength?: ProfileSignalStrength;
  ref_id?: string | null;
}

export interface ProfileBridgeSkillInput {
  tag: string;
  label?: string | null;
  evidence_count?: number;
  strongest_signal?: ProfileSignalStrength;
}

export interface ProfileBridgeEvidenceInput {
  kind:
    | "work-reputation-surface"
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
}

export interface ReputationToProfileBridgeResult {
  ok: boolean;
  bridge?: ReputationToProfileBridgeRecord;
  error?: string;
}

export interface ReputationToProfileBridgeListResult {
  ok: boolean;
  bridges: ReputationToProfileBridgeRecord[];
  error?: string;
}

export interface ReputationToProfileBridgeOrgan {
  prepare(
    request: PrepareReputationToProfileRequest
  ): Promise<ReputationToProfileBridgeResult>;

  markSent(
    bridge_id: string
  ): Promise<ReputationToProfileBridgeResult>;

  linkPublicProfileEntry(
    bridge_id: string,
    public_profile_entry_id: string
  ): Promise<ReputationToProfileBridgeResult>;

  reject(
    bridge_id: string,
    reason?: string | null
  ): Promise<ReputationToProfileBridgeResult>;

  seal(
    bridge_id: string
  ): Promise<ReputationToProfileBridgeResult>;

  burn(
    bridge_id: string
  ): Promise<ReputationToProfileBridgeResult>;

  addSignal(
    bridge_id: string,
    signal: ProfileBridgeSignalInput
  ): Promise<ReputationToProfileBridgeResult>;

  addSkill(
    bridge_id: string,
    skill: ProfileBridgeSkillInput
  ): Promise<ReputationToProfileBridgeResult>;

  addEvidence(
    bridge_id: string,
    evidence: ProfileBridgeEvidenceInput
  ): Promise<ReputationToProfileBridgeResult>;

  get(
    bridge_id: string
  ): Promise<ReputationToProfileBridgeRecord | null>;

  getPublicPayload(
    bridge_id: string
  ): Promise<ReputationToProfilePayload | null>;

  listForReputationSurface(
    reputation_surface_id: string
  ): Promise<ReputationToProfileBridgeListResult>;

  listForPublicActor(
    actor_public_id: string
  ): Promise<ReputationToProfileBridgeListResult>;

  listPrepared(): Promise<ReputationToProfileBridgeListResult>;
}

export class InMemoryReputationToProfileBridgeOrgan
  implements ReputationToProfileBridgeOrgan {
  private readonly bridges =
    new Map<string, ReputationToProfileBridgeRecord>();

  private readonly reputationSurfaceIndex = new Map<string, Set<string>>();
  private readonly publicActorIndex = new Map<string, Set<string>>();

  async prepare(
    request: PrepareReputationToProfileRequest
  ): Promise<ReputationToProfileBridgeResult> {
    const tenant_id = cleanId(request?.tenant_id);
    const reputation_surface_id = cleanId(request?.reputation_surface_id);

    const actor_private_id = cleanId(request?.actor_private_id);
    const actor_public_id = cleanId(request?.actor_public_id);

    const skill_ledger_entry_id = cleanNullableId(
      request?.skill_ledger_entry_id ?? null
    );

    const work_history_entry_id = cleanNullableId(
      request?.work_history_entry_id ?? null
    );

    const resume_proof_id = cleanNullableId(request?.resume_proof_id ?? null);
    const work_order_id = cleanNullableId(request?.work_order_id ?? null);
    const job_id = cleanNullableId(request?.job_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);

    const source = cleanSource(request?.source ?? "work-reputation-surface");
    const source_visibility = cleanSourceVisibility(
      request?.source_visibility ?? "public"
    );

    const profile_title = cleanText(request?.profile_title ?? "", 240);
    const profile_summary = cleanNullableText(
      request?.profile_summary ?? null,
      2000
    );

    const public_note = cleanNullableText(request?.public_note ?? null, 2000);

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
      };
    }

    if (!reputation_surface_id) {
      return {
        ok: false,
        error: "REPUTATION_SURFACE_ID_REQUIRED"
      };
    }

    if (!actor_private_id) {
      return {
        ok: false,
        error: "ACTOR_PRIVATE_ID_REQUIRED"
      };
    }

    if (!actor_public_id) {
      return {
        ok: false,
        error: "ACTOR_PUBLIC_ID_REQUIRED"
      };
    }

    if (!profile_title) {
      return {
        ok: false,
        error: "PROFILE_TITLE_REQUIRED"
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
          kind: "work-reputation-surface",
          ref_id: reputation_surface_id,
          text: "Source work reputation surface"
        },
        ...(request?.evidence ?? [])
      ],
      now
    );

    if (skill_ledger_entry_id) {
      evidence.push({
        evidence_id: makeEvidenceId(),
        kind: "skill-ledger",
        ref_id: skill_ledger_entry_id,
        text: "Source skill ledger entry",
        added_at_ms: now
      });
    }

    if (work_history_entry_id) {
      evidence.push({
        evidence_id: makeEvidenceId(),
        kind: "work-history",
        ref_id: work_history_entry_id,
        text: "Source work history entry",
        added_at_ms: now
      });
    }

    if (resume_proof_id) {
      evidence.push({
        evidence_id: makeEvidenceId(),
        kind: "resume-proof",
        ref_id: resume_proof_id,
        text: "Source resume proof",
        added_at_ms: now
      });
    }

    const payload: ReputationToProfilePayload = {
      actor_public_id,

      profile_title,
      profile_summary,

      signals: normalizeSignals(request?.signals ?? [], now),
      skills: normalizeSkills(request?.skills ?? []),
      evidence: evidence.slice(0, 100),

      public_note,

      source_surface_id: reputation_surface_id,
      source_visibility,

      occurred_at_ms,

      data: publicDataOnly(request?.data ?? {})
    };

    const bridge: ReputationToProfileBridgeRecord = {
      bridge_id: makeBridgeId(),

      tenant_id,

      reputation_surface_id,
      skill_ledger_entry_id,
      work_history_entry_id,
      resume_proof_id,
      work_order_id,
      job_id,
      moment_id,

      actor_private_id,
      actor_public_id,

      source,
      status: "prepared",

      public_profile_entry_id: null,

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
      this.reputationSurfaceIndex,
      reputation_surface_id,
      bridge.bridge_id
    );

    this.addIndex(this.publicActorIndex, actor_public_id, bridge.bridge_id);

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async markSent(
    bridge_id: string
  ): Promise<ReputationToProfileBridgeResult> {
    return this.transition(bridge_id, "sent", null);
  }

  async linkPublicProfileEntry(
    bridge_id: string,
    public_profile_entry_id: string
  ): Promise<ReputationToProfileBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));
    const profileEntryId = cleanId(public_profile_entry_id);

    if (!bridge) {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_NOT_FOUND"
      };
    }

    if (!profileEntryId) {
      return {
        ok: false,
        error: "PUBLIC_PROFILE_ENTRY_ID_REQUIRED"
      };
    }

    if (!canMove(bridge.status, "linked")) {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_STATE_LOCKED"
      };
    }

    const now = Date.now();

    bridge.status = "linked";
    bridge.public_profile_entry_id = profileEntryId;
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
  ): Promise<ReputationToProfileBridgeResult> {
    return this.transition(bridge_id, "rejected", reason);
  }

  async seal(
    bridge_id: string
  ): Promise<ReputationToProfileBridgeResult> {
    return this.transition(bridge_id, "sealed", null);
  }

  async burn(
    bridge_id: string
  ): Promise<ReputationToProfileBridgeResult> {
    return this.transition(bridge_id, "burned", null);
  }

  async addSignal(
    bridge_id: string,
    signal: ProfileBridgeSignalInput
  ): Promise<ReputationToProfileBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_LOCKED"
      };
    }

    const cleanSignal = normalizeSignal(signal, Date.now());

    if (!cleanSignal) {
      return {
        ok: false,
        error: "PROFILE_SIGNAL_INVALID"
      };
    }

    bridge.payload.signals.push(cleanSignal);
    bridge.payload.signals = bridge.payload.signals.slice(0, 100);
    bridge.updated_at_ms = Date.now();

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async addSkill(
    bridge_id: string,
    skill: ProfileBridgeSkillInput
  ): Promise<ReputationToProfileBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_LOCKED"
      };
    }

    const cleanSkill = normalizeSkill(skill);

    if (!cleanSkill) {
      return {
        ok: false,
        error: "PROFILE_SKILL_INVALID"
      };
    }

    const existing = bridge.payload.skills.find(
      (item) => item.tag === cleanSkill.tag
    );

    if (existing) {
      existing.evidence_count = Math.max(
        existing.evidence_count,
        cleanSkill.evidence_count
      );

      existing.strongest_signal = strongerSignal(
        existing.strongest_signal,
        cleanSkill.strongest_signal
      );

      existing.label = existing.label || cleanSkill.label;
    } else {
      bridge.payload.skills.push(cleanSkill);
    }

    bridge.payload.skills = bridge.payload.skills.slice(0, 100);
    bridge.updated_at_ms = Date.now();

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async addEvidence(
    bridge_id: string,
    evidence: ProfileBridgeEvidenceInput
  ): Promise<ReputationToProfileBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_NOT_FOUND"
      };
    }

    if (bridge.status === "sealed" || bridge.status === "burned") {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_LOCKED"
      };
    }

    const cleanEvidence = normalizeEvidence(evidence, Date.now());

    if (!cleanEvidence) {
      return {
        ok: false,
        error: "PROFILE_EVIDENCE_INVALID"
      };
    }

    bridge.payload.evidence.push(cleanEvidence);
    bridge.payload.evidence = bridge.payload.evidence.slice(0, 100);
    bridge.updated_at_ms = Date.now();

    return {
      ok: true,
      bridge: cloneBridge(bridge)
    };
  }

  async get(
    bridge_id: string
  ): Promise<ReputationToProfileBridgeRecord | null> {
    const bridge = this.bridges.get(cleanId(bridge_id));
    return bridge ? cloneBridge(bridge) : null;
  }

  async getPublicPayload(
    bridge_id: string
  ): Promise<ReputationToProfilePayload | null> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) return null;

    if (
      bridge.status !== "prepared" &&
      bridge.status !== "sent" &&
      bridge.status !== "linked" &&
      bridge.status !== "sealed"
    ) {
      return null;
    }

    return clonePayload(bridge.payload);
  }

  async listForReputationSurface(
    reputation_surface_id: string
  ): Promise<ReputationToProfileBridgeListResult> {
    const cleanSurface = cleanId(reputation_surface_id);

    if (!cleanSurface) {
      return {
        ok: false,
        bridges: [],
        error: "REPUTATION_SURFACE_ID_REQUIRED"
      };
    }

    const ids = this.reputationSurfaceIndex.get(cleanSurface) ?? new Set<string>();

    return {
      ok: true,
      bridges: this.recordsFromIds(ids)
    };
  }

  async listForPublicActor(
    actor_public_id: string
  ): Promise<ReputationToProfileBridgeListResult> {
    const cleanActor = cleanId(actor_public_id);

    if (!cleanActor) {
      return {
        ok: false,
        bridges: [],
        error: "ACTOR_PUBLIC_ID_REQUIRED"
      };
    }

    const ids = this.publicActorIndex.get(cleanActor) ?? new Set<string>();

    return {
      ok: true,
      bridges: this.recordsFromIds(ids)
    };
  }

  async listPrepared(): Promise<ReputationToProfileBridgeListResult> {
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
    this.reputationSurfaceIndex.clear();
    this.publicActorIndex.clear();
  }

  private async transition(
    bridge_id: string,
    status: ReputationToProfileBridgeStatus,
    note: string | null
  ): Promise<ReputationToProfileBridgeResult> {
    const bridge = this.bridges.get(cleanId(bridge_id));

    if (!bridge) {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_NOT_FOUND"
      };
    }

    if (!canMove(bridge.status, status)) {
      return {
        ok: false,
        error: "REPUTATION_TO_PROFILE_BRIDGE_STATE_LOCKED"
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
  ): ReputationToProfileBridgeRecord[] {
    return Array.from(ids)
      .map((id) => this.bridges.get(id))
      .filter((item): item is ReputationToProfileBridgeRecord => Boolean(item))
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

export const CyberCrowdReputationToProfileBridge =
  new InMemoryReputationToProfileBridgeOrgan();

export function isReputationToProfileBridgeStatus(
  value: unknown
): value is ReputationToProfileBridgeStatus {
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
  from: ReputationToProfileBridgeStatus,
  to: ReputationToProfileBridgeStatus
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

function normalizeSignals(
  signals: ProfileBridgeSignalInput[],
  now: number
): ProfileBridgeSignal[] {
  if (!Array.isArray(signals)) {
    return [];
  }

  return signals
    .map((signal) => normalizeSignal(signal, now))
    .filter((signal): signal is ProfileBridgeSignal => Boolean(signal))
    .slice(0, 100);
}

function normalizeSignal(
  signal: ProfileBridgeSignalInput,
  now: number
): ProfileBridgeSignal | null {
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
    added_at_ms: now
  };
}

function normalizeSkills(
  skills: ProfileBridgeSkillInput[]
): ProfileBridgeSkill[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const byTag = new Map<string, ProfileBridgeSkill>();

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

    existing.label = existing.label || cleanSkill.label;
  }

  return Array.from(byTag.values()).slice(0, 100);
}

function normalizeSkill(
  skill: ProfileBridgeSkillInput
): ProfileBridgeSkill | null {
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
    strongest_signal: cleanStrength(skill.strongest_signal ?? "normal")
  };
}

function normalizeEvidenceList(
  evidence: ProfileBridgeEvidenceInput[],
  now: number
): ProfileBridgeEvidenceRef[] {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .map((item) => normalizeEvidence(item, now))
    .filter((item): item is ProfileBridgeEvidenceRef => Boolean(item))
    .slice(0, 100);
}

function normalizeEvidence(
  evidence: ProfileBridgeEvidenceInput,
  now: number
): ProfileBridgeEvidenceRef | null {
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
): value is ProfileBridgeEvidenceRef["kind"] {
  return (
    value === "work-reputation-surface" ||
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

function cleanSignalKind(value: unknown): ProfileSignalKind | null {
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
    value === "skill" ||
    value === "resume-proof" ||
    value === "work-history" ||
    value === "other"
  ) {
    return value;
  }

  return null;
}

function cleanSource(
  value: unknown
): ReputationToProfileBridgeSource {
  if (
    value === "work-reputation-surface" ||
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

function cleanSourceVisibility(
  value: unknown
): ReputationToProfilePayload["source_visibility"] {
  if (value === "public" || value === "limited") {
    return value;
  }

  return "public";
}

function cleanStrength(value: unknown): ProfileSignalStrength {
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
  a: ProfileSignalStrength,
  b: ProfileSignalStrength
): ProfileSignalStrength {
  const rank: Record<ProfileSignalStrength, number> = {
    low: 1,
    normal: 2,
    strong: 3
  };

  return rank[b] > rank[a] ? b : a;
}

function cleanCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  if (value < 0) return 0;
  if (value > 100000) return 100000;

  return Math.floor(value);
}

function publicDataOnly(
  data: Record<string, unknown>
): Record<string, unknown> {
  const clone = cloneData(data);
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(clone)) {
    const cleanKey = key.toLowerCase();

    if (
      cleanKey.includes("private") ||
      cleanKey.includes("secret") ||
      cleanKey.includes("token") ||
      cleanKey.includes("auth") ||
      cleanKey.includes("password")
    ) {
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

function makeBridgeId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "reputation-to-profile-bridge-" +
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
    "profile-signal-" +
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
    "profile-evidence-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneBridge(
  bridge: ReputationToProfileBridgeRecord
): ReputationToProfileBridgeRecord {
  return {
    bridge_id: bridge.bridge_id,

    tenant_id: bridge.tenant_id,

    reputation_surface_id: bridge.reputation_surface_id,
    skill_ledger_entry_id: bridge.skill_ledger_entry_id ?? null,
    work_history_entry_id: bridge.work_history_entry_id ?? null,
    resume_proof_id: bridge.resume_proof_id ?? null,
    work_order_id: bridge.work_order_id ?? null,
    job_id: bridge.job_id ?? null,
    moment_id: bridge.moment_id ?? null,

    actor_private_id: bridge.actor_private_id,
    actor_public_id: bridge.actor_public_id,

    source: bridge.source,
    status: bridge.status,

    public_profile_entry_id: bridge.public_profile_entry_id ?? null,

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
  payload: ReputationToProfilePayload
): ReputationToProfilePayload {
  return {
    actor_public_id: payload.actor_public_id,

    profile_title: payload.profile_title,
    profile_summary: payload.profile_summary ?? null,

    signals: payload.signals.map(cloneSignal),
    skills: payload.skills.map(cloneSkill),
    evidence: payload.evidence.map(cloneEvidence),

    public_note: payload.public_note ?? null,

    source_surface_id: payload.source_surface_id,
    source_visibility: payload.source_visibility,

    occurred_at_ms: payload.occurred_at_ms,

    data: publicDataOnly(payload.data)
  };
}

function cloneSignal(signal: ProfileBridgeSignal): ProfileBridgeSignal {
  return {
    signal_id: signal.signal_id,
    kind: signal.kind,
    label: signal.label,
    summary: signal.summary ?? null,
    strength: signal.strength,
    ref_id: signal.ref_id ?? null,
    added_at_ms: signal.added_at_ms
  };
}

function cloneSkill(skill: ProfileBridgeSkill): ProfileBridgeSkill {
  return {
    tag: skill.tag,
    label: skill.label,
    evidence_count: skill.evidence_count,
    strongest_signal: skill.strongest_signal
  };
}

function cloneEvidence(
  evidence: ProfileBridgeEvidenceRef
): ProfileBridgeEvidenceRef {
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
