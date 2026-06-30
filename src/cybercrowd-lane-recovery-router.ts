// src/cybercrowd-lane-recovery-router.ts
//
// CyberCrowd Lane Recovery Router Organ
//
// ONE JOB:
// Route drifted, deferred, or scattered meaning back toward the correct active lane
// after Thread Continuity Guard detects lane drift or sequence break.
//
// This is CORE physics.
// This is NOT persona.
// This is NOT IDL.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// Thread Continuity Guard detects drift.
// Lane Recovery Router chooses the recovery path.
// Current work lane stays protected.

export type LaneRecoveryStatus =
  | "idle"
  | "routing"
  | "recovered"
  | "deferred"
  | "quarantined"
  | "sealed"
  | "burned";

export type LaneRecoveryRouteAction =
  | "return-to-active-lane"
  | "defer"
  | "quarantine"
  | "handoff"
  | "ignore"
  | "seal"
  | "burn";

export type LaneRecoveryReason =
  | "lane-drift"
  | "sequence-break"
  | "current-job-risk"
  | "narrative-deferred"
  | "meaning-pressure-release"
  | "manual"
  | "unknown";

export type LaneRecoveryLaneKind =
  | "identity"
  | "work"
  | "physics"
  | "persona"
  | "reputation"
  | "governance"
  | "system"
  | "manual"
  | "unknown";

export interface LaneRecoveryTarget {
  lane_id: string;
  lane_kind: LaneRecoveryLaneKind;
  title: string;
  current_job: string | null;
  sequence_number: number;
  source_ref_id: string | null;
  data: Record<string, unknown>;
}

export interface LaneRecoveryInput {
  input_id?: string | null;
  at_ms: number;

  incoming_lane_id: string;
  incoming_lane_kind?: LaneRecoveryLaneKind;

  active_lane_id: string;
  active_lane_kind?: LaneRecoveryLaneKind;

  current_job?: string | null;
  sequence_number?: number | null;

  reason?: LaneRecoveryReason;
  message?: string | null;
  source_ref_id?: string | null;

  data?: Record<string, unknown>;
}

export interface LaneRecoveryRecord {
  recovery_id: string;

  input_id: string | null;
  at_ms: number;

  incoming_lane_id: string;
  incoming_lane_kind: LaneRecoveryLaneKind;

  active_lane_id: string;
  active_lane_kind: LaneRecoveryLaneKind;

  current_job: string | null;
  sequence_number: number | null;

  action: LaneRecoveryRouteAction;
  reason: LaneRecoveryReason;
  message: string | null;

  target: LaneRecoveryTarget | null;

  recovered: boolean;
  deferred: boolean;
  quarantined: boolean;
  sealed: boolean;

  source_ref_id: string | null;

  created_at_ms: number;
  updated_at_ms: number;

  data: Record<string, unknown>;
}

export interface LaneRecoveryState {
  status: LaneRecoveryStatus;
  active_lane_id: string | null;
  active_lane_kind: LaneRecoveryLaneKind;
  recovered_count: number;
  deferred_count: number;
  quarantined_count: number;
  ignored_count: number;
  last_action: LaneRecoveryRouteAction | null;
  last_reason: LaneRecoveryReason;
  last_updated_at_ms: number;
}

export interface LaneRecoveryDecisionParams {
  allow_handoff?: boolean;
  quarantine_unknown_lane?: boolean;
  defer_sequence_break?: boolean;
}

export interface LaneRecoveryResult {
  ok: boolean;
  state: LaneRecoveryState;
  record?: LaneRecoveryRecord;
  recovered: LaneRecoveryRecord[];
  deferred: LaneRecoveryRecord[];
  quarantined: LaneRecoveryRecord[];
  error?: string;
}

export interface LaneRecoverySnapshot {
  state: LaneRecoveryState;
  recovered: LaneRecoveryRecord[];
  deferred: LaneRecoveryRecord[];
  quarantined: LaneRecoveryRecord[];
  records: LaneRecoveryRecord[];
  stable: boolean;
}

export class LaneRecoveryRouter {
  private state: LaneRecoveryState;
  private records = new Map<string, LaneRecoveryRecord>();
  private recovered = new Map<string, LaneRecoveryRecord>();
  private deferred = new Map<string, LaneRecoveryRecord>();
  private quarantined = new Map<string, LaneRecoveryRecord>();

  constructor(initial?: Partial<LaneRecoveryState>) {
    const now = Date.now();

    this.state = {
      status: cleanStatus(initial?.status ?? "idle"),
      active_lane_id: cleanNullableId(initial?.active_lane_id ?? null),
      active_lane_kind: cleanLaneKind(initial?.active_lane_kind ?? "unknown"),
      recovered_count: cleanCount(initial?.recovered_count ?? 0),
      deferred_count: cleanCount(initial?.deferred_count ?? 0),
      quarantined_count: cleanCount(initial?.quarantined_count ?? 0),
      ignored_count: cleanCount(initial?.ignored_count ?? 0),
      last_action: cleanNullableAction(initial?.last_action ?? null),
      last_reason: cleanReason(initial?.last_reason ?? "unknown"),
      last_updated_at_ms: cleanTimestamp(initial?.last_updated_at_ms, now)
    };
  }

  /**
   * Route a drifted or scattered lane input.
   */
  route(
    input: LaneRecoveryInput,
    params: LaneRecoveryDecisionParams = {}
  ): LaneRecoveryResult {
    const incomingLaneId = cleanId(input?.incoming_lane_id);
    const activeLaneId = cleanId(input?.active_lane_id);

    const incomingLaneKind = cleanLaneKind(
      input?.incoming_lane_kind ?? "unknown"
    );

    const activeLaneKind = cleanLaneKind(
      input?.active_lane_kind ?? "unknown"
    );

    const reason = cleanReason(input?.reason ?? "unknown");

    if (!incomingLaneId) {
      return this.result("INCOMING_LANE_ID_REQUIRED");
    }

    if (!activeLaneId) {
      return this.result("ACTIVE_LANE_ID_REQUIRED");
    }

    const now = cleanTimestamp(input?.at_ms, Date.now());
    const sequenceNumber = cleanNullableSequence(input?.sequence_number ?? null);

    const action = this.decideAction(
      incomingLaneId,
      activeLaneId,
      incomingLaneKind,
      activeLaneKind,
      reason,
      params
    );

    const target = this.makeTarget(
      activeLaneId,
      activeLaneKind,
      input?.current_job ?? null,
      sequenceNumber,
      input?.source_ref_id ?? null,
      input?.data ?? {}
    );

    const record: LaneRecoveryRecord = {
      recovery_id: makeRecoveryId(),

      input_id: cleanNullableId(input?.input_id ?? null),
      at_ms: now,

      incoming_lane_id: incomingLaneId,
      incoming_lane_kind: incomingLaneKind,

      active_lane_id: activeLaneId,
      active_lane_kind: activeLaneKind,

      current_job: cleanNullableText(input?.current_job ?? null, 400),
      sequence_number: sequenceNumber,

      action,
      reason,
      message: cleanNullableText(input?.message ?? null, 1000),

      target:
        action === "return-to-active-lane" || action === "handoff"
          ? target
          : null,

      recovered: action === "return-to-active-lane" || action === "handoff",
      deferred: action === "defer",
      quarantined: action === "quarantine",
      sealed: false,

      source_ref_id: cleanNullableId(input?.source_ref_id ?? null),

      created_at_ms: now,
      updated_at_ms: now,

      data: publicDataOnly(input?.data ?? {})
    };

    this.records.set(record.recovery_id, cloneRecord(record));

    if (record.recovered) {
      this.recovered.set(record.recovery_id, cloneRecord(record));
      this.state.recovered_count += 1;
    }

    if (record.deferred) {
      this.deferred.set(record.recovery_id, cloneRecord(record));
      this.state.deferred_count += 1;
    }

    if (record.quarantined) {
      this.quarantined.set(record.recovery_id, cloneRecord(record));
      this.state.quarantined_count += 1;
    }

    if (action === "ignore") {
      this.state.ignored_count += 1;
    }

    this.state = {
      ...this.state,
      status: statusFromAction(action),
      active_lane_id: activeLaneId,
      active_lane_kind: activeLaneKind,
      last_action: action,
      last_reason: reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, record);
  }

  /**
   * Restore deferred records back toward the active lane.
   */
  restoreDeferred(limit: number = 10): LaneRecoveryResult {
    const cleanLimit = cleanPositiveCount(limit, 10);
    const now = Date.now();

    const records = Array.from(this.deferred.values())
      .sort((a, b) => b.created_at_ms - a.created_at_ms)
      .slice(0, cleanLimit);

    let lastRecord: LaneRecoveryRecord | undefined;

    for (const record of records) {
      const restored: LaneRecoveryRecord = {
        ...cloneRecord(record),
        action: "return-to-active-lane",
        recovered: true,
        deferred: false,
        quarantined: false,
        target: this.makeTarget(
          record.active_lane_id,
          record.active_lane_kind,
          record.current_job,
          record.sequence_number,
          record.source_ref_id,
          record.data
        ),
        updated_at_ms: now
      };

      this.deferred.delete(restored.recovery_id);
      this.recovered.set(restored.recovery_id, cloneRecord(restored));
      this.records.set(restored.recovery_id, cloneRecord(restored));

      this.state.recovered_count += 1;
      this.state.deferred_count = Math.max(0, this.state.deferred_count - 1);

      lastRecord = restored;
    }

    this.state = {
      ...this.state,
      status: "recovered",
      last_action: "return-to-active-lane",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    return this.result(undefined, lastRecord);
  }

  /**
   * Move a record into quarantine.
   */
  quarantine(
    recovery_id: string,
    reason: LaneRecoveryReason = "manual"
  ): LaneRecoveryResult {
    const cleanRecoveryId = cleanId(recovery_id);
    const record = this.records.get(cleanRecoveryId);

    if (!record) {
      return this.result("RECOVERY_RECORD_NOT_FOUND");
    }

    const now = Date.now();

    const updated: LaneRecoveryRecord = {
      ...cloneRecord(record),
      action: "quarantine",
      reason: cleanReason(reason),
      recovered: false,
      deferred: false,
      quarantined: true,
      target: null,
      updated_at_ms: now
    };

    this.records.set(updated.recovery_id, cloneRecord(updated));
    this.recovered.delete(updated.recovery_id);
    this.deferred.delete(updated.recovery_id);
    this.quarantined.set(updated.recovery_id, cloneRecord(updated));

    this.state = {
      ...this.state,
      status: "quarantined",
      quarantined_count: this.state.quarantined_count + 1,
      last_action: "quarantine",
      last_reason: updated.reason,
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Seal a recovery record without deleting it.
   */
  seal(recovery_id: string): LaneRecoveryResult {
    const cleanRecoveryId = cleanId(recovery_id);
    const record = this.records.get(cleanRecoveryId);

    if (!record) {
      return this.result("RECOVERY_RECORD_NOT_FOUND");
    }

    const now = Date.now();

    const updated: LaneRecoveryRecord = {
      ...cloneRecord(record),
      action: "seal",
      sealed: true,
      updated_at_ms: now
    };

    this.records.set(updated.recovery_id, cloneRecord(updated));

    if (this.recovered.has(updated.recovery_id)) {
      this.recovered.set(updated.recovery_id, cloneRecord(updated));
    }

    if (this.deferred.has(updated.recovery_id)) {
      this.deferred.set(updated.recovery_id, cloneRecord(updated));
    }

    if (this.quarantined.has(updated.recovery_id)) {
      this.quarantined.set(updated.recovery_id, cloneRecord(updated));
    }

    this.state = {
      ...this.state,
      status: "sealed",
      last_action: "seal",
      last_reason: "manual",
      last_updated_at_ms: now
    };

    return this.result(undefined, updated);
  }

  /**
   * Burn a recovery record from live memory.
   */
  burn(recovery_id: string): LaneRecoveryResult {
    const cleanRecoveryId = cleanId(recovery_id);
    const record = this.records.get(cleanRecoveryId);

    if (!record) {
      return this.result("RECOVERY_RECORD_NOT_FOUND");
    }

    this.records.delete(cleanRecoveryId);
    this.recovered.delete(cleanRecoveryId);
    this.deferred.delete(cleanRecoveryId);
    this.quarantined.delete(cleanRecoveryId);

    this.state = {
      ...this.state,
      status: "burned",
      last_action: "burn",
      last_reason: "manual",
      last_updated_at_ms: Date.now()
    };

    return this.result(undefined, {
      ...cloneRecord(record),
      action: "burn",
      sealed: true,
      updated_at_ms: Date.now()
    });
  }

  /**
   * Read one recovery record.
   */
  get(recovery_id: string): LaneRecoveryRecord | null {
    const record = this.records.get(cleanId(recovery_id));
    return record ? cloneRecord(record) : null;
  }

  /**
   * Read current state.
   */
  getState(): LaneRecoveryState {
    return {
      status: this.state.status,
      active_lane_id: this.state.active_lane_id,
      active_lane_kind: this.state.active_lane_kind,
      recovered_count: this.state.recovered_count,
      deferred_count: this.state.deferred_count,
      quarantined_count: this.state.quarantined_count,
      ignored_count: this.state.ignored_count,
      last_action: this.state.last_action,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getRecords(): LaneRecoveryRecord[] {
    return Array.from(this.records.values())
      .map(cloneRecord)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  getRecovered(): LaneRecoveryRecord[] {
    return Array.from(this.recovered.values())
      .map(cloneRecord)
      .sort((a, b) => b.updated_at_ms - a.updated_at_ms);
  }

  getDeferred(): LaneRecoveryRecord[] {
    return Array.from(this.deferred.values())
      .map(cloneRecord)
      .sort((a, b) => b.updated_at_ms - a.updated_at_ms);
  }

  getQuarantined(): LaneRecoveryRecord[] {
    return Array.from(this.quarantined.values())
      .map(cloneRecord)
      .sort((a, b) => b.updated_at_ms - a.updated_at_ms);
  }

  snapshot(): LaneRecoverySnapshot {
    return {
      state: this.getState(),
      recovered: this.getRecovered(),
      deferred: this.getDeferred(),
      quarantined: this.getQuarantined(),
      records: this.getRecords(),
      stable:
        this.state.status === "idle" ||
        this.state.status === "recovered"
    };
  }

  reset(at_ms: number = Date.now()): LaneRecoveryState {
    this.records.clear();
    this.recovered.clear();
    this.deferred.clear();
    this.quarantined.clear();

    this.state = {
      status: "idle",
      active_lane_id: null,
      active_lane_kind: "unknown",
      recovered_count: 0,
      deferred_count: 0,
      quarantined_count: 0,
      ignored_count: 0,
      last_action: null,
      last_reason: "unknown",
      last_updated_at_ms: cleanTimestamp(at_ms, Date.now())
    };

    return this.getState();
  }

  private decideAction(
    incomingLaneId: string,
    activeLaneId: string,
    incomingLaneKind: LaneRecoveryLaneKind,
    activeLaneKind: LaneRecoveryLaneKind,
    reason: LaneRecoveryReason,
    params: LaneRecoveryDecisionParams
  ): LaneRecoveryRouteAction {
    if (incomingLaneId === activeLaneId) {
      return "return-to-active-lane";
    }

    if (
      params.quarantine_unknown_lane === true &&
      incomingLaneKind === "unknown"
    ) {
      return "quarantine";
    }

    if (
      params.defer_sequence_break === true &&
      reason === "sequence-break"
    ) {
      return "defer";
    }

    if (
      params.allow_handoff === true &&
      incomingLaneKind !== "unknown" &&
      activeLaneKind !== "unknown" &&
      incomingLaneKind !== activeLaneKind
    ) {
      return "handoff";
    }

    if (
      reason === "lane-drift" ||
      reason === "current-job-risk"
    ) {
      return "return-to-active-lane";
    }

    if (
      reason === "narrative-deferred" ||
      reason === "meaning-pressure-release"
    ) {
      return "defer";
    }

    return "quarantine";
  }

  private makeTarget(
    laneId: string,
    laneKind: LaneRecoveryLaneKind,
    currentJob: unknown,
    sequenceNumber: number | null,
    sourceRefId: unknown,
    data: Record<string, unknown>
  ): LaneRecoveryTarget {
    return {
      lane_id: laneId,
      lane_kind: laneKind,
      title: titleFromLaneKind(laneKind),
      current_job: cleanNullableText(currentJob, 400),
      sequence_number: sequenceNumber ?? 0,
      source_ref_id: cleanNullableId(sourceRefId),
      data: publicDataOnly(data)
    };
  }

  private result(
    error?: string,
    record?: LaneRecoveryRecord
  ): LaneRecoveryResult {
    return {
      ok: !error,
      state: this.getState(),
      record: record ? cloneRecord(record) : undefined,
      recovered: this.getRecovered(),
      deferred: this.getDeferred(),
      quarantined: this.getQuarantined(),
      error
    };
  }
}

export const CyberCrowdLaneRecoveryRouter =
  new LaneRecoveryRouter();

function statusFromAction(action: LaneRecoveryRouteAction): LaneRecoveryStatus {
  if (action === "return-to-active-lane") return "recovered";
  if (action === "defer") return "deferred";
  if (action === "quarantine") return "quarantined";
  if (action === "handoff") return "routing";
  if (action === "ignore") return "idle";
  if (action === "seal") return "sealed";
  if (action === "burn") return "burned";

  return "idle";
}

function titleFromLaneKind(kind: LaneRecoveryLaneKind): string {
  if (kind === "identity") return "Identity Lane";
  if (kind === "work") return "Work Lane";
  if (kind === "physics") return "Physics Lane";
  if (kind === "persona") return "Persona Lane";
  if (kind === "reputation") return "Reputation Lane";
  if (kind === "governance") return "Governance Lane";
  if (kind === "system") return "System Lane";
  if (kind === "manual") return "Manual Lane";

  return "Unknown Lane";
}

function cleanStatus(value: unknown): LaneRecoveryStatus {
  if (
    value === "idle" ||
    value === "routing" ||
    value === "recovered" ||
    value === "deferred" ||
    value === "quarantined" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "idle";
}

function cleanNullableAction(value: unknown): LaneRecoveryRouteAction | null {
  if (
    value === "return-to-active-lane" ||
    value === "defer" ||
    value === "quarantine" ||
    value === "handoff" ||
    value === "ignore" ||
    value === "seal" ||
    value === "burn"
  ) {
    return value;
  }

  return null;
}

function cleanReason(value: unknown): LaneRecoveryReason {
  if (
    value === "lane-drift" ||
    value === "sequence-break" ||
    value === "current-job-risk" ||
    value === "narrative-deferred" ||
    value === "meaning-pressure-release" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function cleanLaneKind(value: unknown): LaneRecoveryLaneKind {
  if (
    value === "identity" ||
    value === "work" ||
    value === "physics" ||
    value === "persona" ||
    value === "reputation" ||
    value === "governance" ||
    value === "system" ||
    value === "manual" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function makeRecoveryId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "lane-recovery-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneRecord(record: LaneRecoveryRecord): LaneRecoveryRecord {
  return {
    recovery_id: record.recovery_id,

    input_id: record.input_id ?? null,
    at_ms: record.at_ms,

    incoming_lane_id: record.incoming_lane_id,
    incoming_lane_kind: record.incoming_lane_kind,

    active_lane_id: record.active_lane_id,
    active_lane_kind: record.active_lane_kind,

    current_job: record.current_job ?? null,
    sequence_number: record.sequence_number ?? null,

    action: record.action,
    reason: record.reason,
    message: record.message ?? null,

    target: record.target ? cloneTarget(record.target) : null,

    recovered: record.recovered,
    deferred: record.deferred,
    quarantined: record.quarantined,
    sealed: record.sealed,

    source_ref_id: record.source_ref_id ?? null,

    created_at_ms: record.created_at_ms,
    updated_at_ms: record.updated_at_ms,

    data: publicDataOnly(record.data)
  };
}

function cloneTarget(target: LaneRecoveryTarget): LaneRecoveryTarget {
  return {
    lane_id: target.lane_id,
    lane_kind: target.lane_kind,
    title: target.title,
    current_job: target.current_job ?? null,
    sequence_number: target.sequence_number,
    source_ref_id: target.source_ref_id ?? null,
    data: publicDataOnly(target.data)
  };
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

function cloneData(
  data: Record<string, unknown>
): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanPositiveCount(
  value: unknown,
  fallback: number
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
}

function cleanCount(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return Math.floor(value);
  }

  return 0;
}

function cleanNullableSequence(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return Math.floor(value);
  }

  return null;
}

function cleanTimestamp(
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
