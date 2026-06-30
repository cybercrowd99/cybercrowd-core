// src/cybercrowd-email-send-archive.ts
//
// CyberCrowd Email Send Archive
//
// ONE JOB:
// Prevent repeated paid emails to the same address by recording safe
// email-send history without storing raw Turnstile tokens.
//
// This is EMAIL SEND ARCHIVE.
// This is resend-cost control.
// This is NOT Turnstile token storage.
// This is NOT auth secret storage.
// This is NOT password storage.
// This is NOT session storage.
// This is NOT hidden control.
// This is NOT punishment.
// This is NOT ranking.
// This is NOT a feed.
// This is NOT surveillance.
//
// LOCKED RULE:
// Save the email-send record.
// Do not save the Turnstile token.
//
// Email archive controls resend cost.
// Turnstile only proves human.
//
// SAFE CHAIN:
// User enters email.
// Turnstile verifies human.
// Normalize email.
// Hash email.
// Check send archive.
// If recent: DO NOT SEND AGAIN.
// If not recent: send email.
// Archive send record.

export type EmailSendStatus =
  | "sent"
  | "blocked_recent"
  | "pending"
  | "failed"
  | "bounced"
  | "suppressed"
  | "sealed"
  | "burned";

export type EmailSendReason =
  | "new-send"
  | "recent-send-exists"
  | "provider-accepted"
  | "provider-failed"
  | "bounce-reported"
  | "suppression-reported"
  | "manual"
  | "sealed"
  | "burned"
  | "unknown";

export type EmailSendPurpose =
  | "verification"
  | "login"
  | "setup"
  | "password-reset"
  | "notice"
  | "unknown";

export interface EmailSendArchiveInput {
  email: string;
  purpose?: EmailSendPurpose;
  provider?: string | null;
  provider_message_id?: string | null;
  request_id?: string | null;
  status?: EmailSendStatus;
  data?: Record<string, unknown>;
}

export interface EmailSendCheckInput {
  email: string;
  purpose?: EmailSendPurpose;
  now_ms?: number;
  resend_window_ms?: number;
}

export interface EmailSendArchiveRecord {
  record_id: string;

  email_hash: string;
  email_mask: string;

  purpose: EmailSendPurpose;
  status: EmailSendStatus;
  reason: EmailSendReason;

  provider: string | null;
  provider_message_id: string | null;
  request_id: string | null;

  sent_at_ms: number | null;
  last_attempt_at_ms: number;
  attempt_count: number;

  created_at_ms: number;
  updated_at_ms: number;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface EmailSendArchiveDecision {
  ok_to_send: boolean;
  email_hash: string;
  email_mask: string;
  purpose: EmailSendPurpose;
  reason: EmailSendReason;
  existing_record: EmailSendArchiveRecord | null;
  next_allowed_at_ms: number | null;
  resend_window_ms: number;
}

export interface EmailSendArchiveState {
  status: EmailSendStatus | "idle";
  record_count: number;
  sent_count: number;
  blocked_recent_count: number;
  failed_count: number;
  bounced_count: number;
  suppressed_count: number;
  sealed_count: number;
  burned_count: number;
  last_email_hash: string | null;
  last_reason: EmailSendReason;
  last_updated_at_ms: number;
}

export interface EmailSendArchiveResult {
  ok: boolean;
  state: EmailSendArchiveState;
  record?: EmailSendArchiveRecord;
  decision?: EmailSendArchiveDecision;
  records: EmailSendArchiveRecord[];
  sent: EmailSendArchiveRecord[];
  blocked: EmailSendArchiveRecord[];
  failed: EmailSendArchiveRecord[];
  error?: string;
}

export interface EmailSendArchiveSnapshot {
  state: EmailSendArchiveState;
  records: EmailSendArchiveRecord[];
  sent: EmailSendArchiveRecord[];
  blocked: EmailSendArchiveRecord[];
  failed: EmailSendArchiveRecord[];
  stable: boolean;
}

export class CyberCrowdEmailSendArchive {
  private records = new Map<string, EmailSendArchiveRecord>();
  private sentRecords = new Map<string, EmailSendArchiveRecord>();
  private blockedRecords = new Map<string, EmailSendArchiveRecord>();
  private failedRecords = new Map<string, EmailSendArchiveRecord>();

  private state: EmailSendArchiveState = {
    status: "idle",
    record_count: 0,
    sent_count: 0,
    blocked_recent_count: 0,
    failed_count: 0,
    bounced_count: 0,
    suppressed_count: 0,
    sealed_count: 0,
    burned_count: 0,
    last_email_hash: null,
    last_reason: "unknown",
    last_updated_at_ms: Date.now()
  };

  /**
   * Check whether an email may be sent without repeating paid sends.
   */
  canSend(input: EmailSendCheckInput): EmailSendArchiveResult {
    const normalized = normalizeEmail(input?.email);

    if (!normalized) {
      return this.result("EMAIL_REQUIRED");
    }

    const now = cleanTimestamp(input?.now_ms, Date.now());
    const purpose = cleanPurpose(input?.purpose ?? "verification");
    const resendWindowMs = cleanPositiveNumber(
      input?.resend_window_ms,
      15 * 60 * 1000
    );

    const emailHash = hashEmail(normalized);
    const existing = this.findLatest(emailHash, purpose);

    if (!existing || existing.status === "burned") {
      const decision: EmailSendArchiveDecision = {
        ok_to_send: true,
        email_hash: emailHash,
        email_mask: maskEmail(normalized),
        purpose,
        reason: "new-send",
        existing_record: null,
        next_allowed_at_ms: null,
        resend_window_ms: resendWindowMs
      };

      return this.result(undefined, undefined, decision);
    }

    const lastAttempt = existing.last_attempt_at_ms || existing.sent_at_ms || 0;
    const nextAllowedAtMs = lastAttempt + resendWindowMs;

    if (
      existing.status === "sent" ||
      existing.status === "pending" ||
      existing.status === "blocked_recent"
    ) {
      if (now < nextAllowedAtMs) {
        const decision: EmailSendArchiveDecision = {
          ok_to_send: false,
          email_hash: emailHash,
          email_mask: maskEmail(normalized),
          purpose,
          reason: "recent-send-exists",
          existing_record: cloneRecord(existing),
          next_allowed_at_ms: nextAllowedAtMs,
          resend_window_ms: resendWindowMs
        };

        return this.result(undefined, existing, decision);
      }
    }

    const decision: EmailSendArchiveDecision = {
      ok_to_send: true,
      email_hash: emailHash,
      email_mask: maskEmail(normalized),
      purpose,
      reason: "new-send",
      existing_record: cloneRecord(existing),
      next_allowed_at_ms: null,
      resend_window_ms: resendWindowMs
    };

    return this.result(undefined, existing, decision);
  }

  /**
   * Record an email send attempt after the resend check.
   */
  recordSend(input: EmailSendArchiveInput): EmailSendArchiveResult {
    const normalized = normalizeEmail(input?.email);

    if (!normalized) {
      return this.result("EMAIL_REQUIRED");
    }

    const now = Date.now();
    const purpose = cleanPurpose(input?.purpose ?? "verification");
    const status = cleanStatus(input?.status ?? "sent");
    const emailHash = hashEmail(normalized);
    const existing = this.findLatest(emailHash, purpose);

    const record: EmailSendArchiveRecord = {
      record_id: existing?.record_id ?? makeId("email-send"),

      email_hash: emailHash,
      email_mask: maskEmail(normalized),

      purpose,
      status,
      reason: reasonFromStatus(status),

      provider: cleanNullableText(input?.provider ?? null, 80),
      provider_message_id: cleanNullableId(input?.provider_message_id ?? null),
      request_id: cleanNullableId(input?.request_id ?? null),

      sent_at_ms: status === "sent" ? now : existing?.sent_at_ms ?? null,
      last_attempt_at_ms: now,
      attempt_count: (existing?.attempt_count ?? 0) + 1,

      created_at_ms: existing?.created_at_ms ?? now,
      updated_at_ms: now,
      sealed_at_ms: existing?.sealed_at_ms ?? null,
      burned_at_ms: existing?.burned_at_ms ?? null,

      data: publicDataOnly({
        ...(existing?.data ?? {}),
        ...(input?.data ?? {})
      })
    };

    this.storeRecord(record);
    this.recount(record);

    return this.result(undefined, record);
  }

  /**
   * Record that a send was blocked because a recent send already exists.
   */
  recordBlockedRecent(input: EmailSendArchiveInput): EmailSendArchiveResult {
    return this.recordSend({
      ...input,
      status: "blocked_recent",
      data: {
        ...(input?.data ?? {}),
        blocked_reason: "recent-send-exists"
      }
    });
  }

  /**
   * Record provider failure without storing auth secrets.
   */
  recordFailed(input: EmailSendArchiveInput): EmailSendArchiveResult {
    return this.recordSend({
      ...input,
      status: "failed"
    });
  }

  /**
   * Record a bounce event.
   */
  recordBounced(input: EmailSendArchiveInput): EmailSendArchiveResult {
    return this.recordSend({
      ...input,
      status: "bounced"
    });
  }

  /**
   * Record provider suppression event.
   */
  recordSuppressed(input: EmailSendArchiveInput): EmailSendArchiveResult {
    return this.recordSend({
      ...input,
      status: "suppressed"
    });
  }

  /**
   * Seal an email-send record without deleting it.
   */
  seal(record_id: string): EmailSendArchiveResult {
    return this.transition(record_id, "sealed");
  }

  /**
   * Burn an email-send record from live archive memory.
   */
  burn(record_id: string): EmailSendArchiveResult {
    const recordId = cleanId(record_id);

    if (!recordId) {
      return this.result("RECORD_ID_REQUIRED");
    }

    const existing = this.records.get(recordId);

    if (!existing) {
      return this.result("EMAIL_SEND_RECORD_NOT_FOUND");
    }

    this.records.delete(recordId);
    this.sentRecords.delete(recordId);
    this.blockedRecords.delete(recordId);
    this.failedRecords.delete(recordId);

    const now = Date.now();

    const burned: EmailSendArchiveRecord = {
      ...cloneRecord(existing),
      status: "burned",
      reason: "burned",
      updated_at_ms: now,
      burned_at_ms: now
    };

    this.recount(burned);

    return this.result(undefined, burned);
  }

  /**
   * Read one record.
   */
  get(record_id: string): EmailSendArchiveRecord | null {
    const record = this.records.get(cleanId(record_id));
    return record ? cloneRecord(record) : null;
  }

  /**
   * Read latest record by email and purpose.
   */
  getByEmail(
    email: string,
    purpose: EmailSendPurpose = "verification"
  ): EmailSendArchiveRecord | null {
    const normalized = normalizeEmail(email);

    if (!normalized) {
      return null;
    }

    return this.findLatest(hashEmail(normalized), cleanPurpose(purpose));
  }

  getState(): EmailSendArchiveState {
    return {
      status: this.state.status,
      record_count: this.state.record_count,
      sent_count: this.state.sent_count,
      blocked_recent_count: this.state.blocked_recent_count,
      failed_count: this.state.failed_count,
      bounced_count: this.state.bounced_count,
      suppressed_count: this.state.suppressed_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_email_hash: this.state.last_email_hash,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getRecords(): EmailSendArchiveRecord[] {
    return Array.from(this.records.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  getSent(): EmailSendArchiveRecord[] {
    return Array.from(this.sentRecords.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  getBlocked(): EmailSendArchiveRecord[] {
    return Array.from(this.blockedRecords.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  getFailed(): EmailSendArchiveRecord[] {
    return Array.from(this.failedRecords.values())
      .map(cloneRecord)
      .sort(compareRecords);
  }

  snapshot(): EmailSendArchiveSnapshot {
    return {
      state: this.getState(),
      records: this.getRecords(),
      sent: this.getSent(),
      blocked: this.getBlocked(),
      failed: this.getFailed(),
      stable:
        this.state.status === "idle" ||
        this.state.status === "sent" ||
        this.state.status === "blocked_recent" ||
        this.state.status === "pending"
    };
  }

  reset(): void {
    this.records.clear();
    this.sentRecords.clear();
    this.blockedRecords.clear();
    this.failedRecords.clear();

    this.state = {
      status: "idle",
      record_count: 0,
      sent_count: 0,
      blocked_recent_count: 0,
      failed_count: 0,
      bounced_count: 0,
      suppressed_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_email_hash: null,
      last_reason: "unknown",
      last_updated_at_ms: Date.now()
    };
  }

  private transition(
    record_id: string,
    status: EmailSendStatus
  ): EmailSendArchiveResult {
    const recordId = cleanId(record_id);

    if (!recordId) {
      return this.result("RECORD_ID_REQUIRED");
    }

    const existing = this.records.get(recordId);

    if (!existing) {
      return this.result("EMAIL_SEND_RECORD_NOT_FOUND");
    }

    if (existing.status === "burned") {
      return this.result("EMAIL_SEND_RECORD_BURNED", existing);
    }

    const now = Date.now();

    const updated: EmailSendArchiveRecord = {
      ...cloneRecord(existing),
      status,
      reason: reasonFromStatus(status),
      updated_at_ms: now,
      sealed_at_ms: status === "sealed" ? now : existing.sealed_at_ms,
      burned_at_ms: status === "burned" ? now : existing.burned_at_ms
    };

    this.removeFromIndexes(updated.record_id);
    this.storeRecord(updated);
    this.recount(updated);

    return this.result(undefined, updated);
  }

  private findLatest(
    emailHash: string,
    purpose: EmailSendPurpose
  ): EmailSendArchiveRecord | null {
    const matches = this.getRecords().filter(
      (record) =>
        record.email_hash === emailHash &&
        record.purpose === purpose &&
        record.status !== "burned"
    );

    return matches[0] ?? null;
  }

  private storeRecord(record: EmailSendArchiveRecord): void {
    this.records.set(record.record_id, cloneRecord(record));

    if (record.status === "sent" || record.status === "pending") {
      this.sentRecords.set(record.record_id, cloneRecord(record));
    }

    if (record.status === "blocked_recent") {
      this.blockedRecords.set(record.record_id, cloneRecord(record));
    }

    if (
      record.status === "failed" ||
      record.status === "bounced" ||
      record.status === "suppressed"
    ) {
      this.failedRecords.set(record.record_id, cloneRecord(record));
    }

    if (this.records.size > 1000) {
      const old = this.getRecords().slice(1000);

      for (const item of old) {
        this.records.delete(item.record_id);
        this.removeFromIndexes(item.record_id);
      }
    }
  }

  private removeFromIndexes(recordId: string): void {
    this.sentRecords.delete(recordId);
    this.blockedRecords.delete(recordId);
    this.failedRecords.delete(recordId);
  }

  private recount(last: EmailSendArchiveRecord): void {
    const records = Array.from(this.records.values());

    this.state = {
      status: last.status,
      record_count: records.length,
      sent_count: records.filter((record) => record.status === "sent").length,
      blocked_recent_count:
        records.filter((record) => record.status === "blocked_recent").length,
      failed_count: records.filter((record) => record.status === "failed").length,
      bounced_count: records.filter((record) => record.status === "bounced").length,
      suppressed_count:
        records.filter((record) => record.status === "suppressed").length,
      sealed_count: records.filter((record) => record.status === "sealed").length,
      burned_count:
        this.state.burned_count + (last.status === "burned" ? 1 : 0),
      last_email_hash: last.email_hash,
      last_reason: last.reason,
      last_updated_at_ms: last.updated_at_ms
    };
  }

  private result(
    error?: string,
    record?: EmailSendArchiveRecord,
    decision?: EmailSendArchiveDecision
  ): EmailSendArchiveResult {
    return {
      ok: !error,
      state: this.getState(),
      record: record ? cloneRecord(record) : undefined,
      decision: decision ? cloneDecision(decision) : undefined,
      records: this.getRecords(),
      sent: this.getSent(),
      blocked: this.getBlocked(),
      failed: this.getFailed(),
      error
    };
  }
}

export const CyberCrowdEmailSendArchiveSurface =
  new CyberCrowdEmailSendArchive();

function reasonFromStatus(status: EmailSendStatus): EmailSendReason {
  if (status === "sent") return "provider-accepted";
  if (status === "blocked_recent") return "recent-send-exists";
  if (status === "failed") return "provider-failed";
  if (status === "bounced") return "bounce-reported";
  if (status === "suppressed") return "suppression-reported";
  if (status === "sealed") return "sealed";
  if (status === "burned") return "burned";

  return "unknown";
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const clean = String(value).trim().toLowerCase();

  if (!clean || clean.length > 254) {
    return "";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return "";
  }

  return clean;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return "unknown";
  }

  const visibleName =
    name.length <= 2
      ? name[0] + "*"
      : name.slice(0, 2) + "*".repeat(Math.min(6, name.length - 2));

  const [domainName, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");

  const visibleDomain =
    domainName.length <= 2
      ? domainName[0] + "*"
      : domainName.slice(0, 2) + "*".repeat(Math.min(6, domainName.length - 2));

  return `${visibleName}@${visibleDomain}.${tld || "x"}`;
}

function hashEmail(email: string): string {
  let hash = 2166136261;

  for (let index = 0; index < email.length; index += 1) {
    hash ^= email.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `email_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function cleanPurpose(value: unknown): EmailSendPurpose {
  if (
    value === "verification" ||
    value === "login" ||
    value === "setup" ||
    value === "password-reset" ||
    value === "notice" ||
    value === "unknown"
  ) {
    return value;
  }

  return "verification";
}

function cleanStatus(value: unknown): EmailSendStatus {
  if (
    value === "sent" ||
    value === "blocked_recent" ||
    value === "pending" ||
    value === "failed" ||
    value === "bounced" ||
    value === "suppressed" ||
    value === "sealed" ||
    value === "burned"
  ) {
    return value;
  }

  return "sent";
}

function compareRecords(
  a: EmailSendArchiveRecord,
  b: EmailSendArchiveRecord
): number {
  return b.updated_at_ms - a.updated_at_ms;
}

function cloneRecord(
  record: EmailSendArchiveRecord
): EmailSendArchiveRecord {
  return {
    record_id: record.record_id,

    email_hash: record.email_hash,
    email_mask: record.email_mask,

    purpose: record.purpose,
    status: record.status,
    reason: record.reason,

    provider: record.provider ?? null,
    provider_message_id: record.provider_message_id ?? null,
    request_id: record.request_id ?? null,

    sent_at_ms: record.sent_at_ms ?? null,
    last_attempt_at_ms: record.last_attempt_at_ms,
    attempt_count: record.attempt_count,

    created_at_ms: record.created_at_ms,
    updated_at_ms: record.updated_at_ms,
    sealed_at_ms: record.sealed_at_ms ?? null,
    burned_at_ms: record.burned_at_ms ?? null,

    data: publicDataOnly(record.data)
  };
}

function cloneDecision(
  decision: EmailSendArchiveDecision
): EmailSendArchiveDecision {
  return {
    ok_to_send: decision.ok_to_send,
    email_hash: decision.email_hash,
    email_mask: decision.email_mask,
    purpose: decision.purpose,
    reason: decision.reason,
    existing_record: decision.existing_record
      ? cloneRecord(decision.existing_record)
      : null,
    next_allowed_at_ms: decision.next_allowed_at_ms ?? null,
    resend_window_ms: decision.resend_window_ms
  };
}

function makeId(prefix: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return (
    prefix +
    "-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
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

function cleanPositiveNumber(value: unknown, fallback: number): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
}

function cleanTimestamp(value: unknown, fallback: number): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
}

function cleanNullableText(
  value: unknown,
  maxLength: number
): string | null {
  const clean = cleanText(value, maxLength);
  return clean || null;
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
