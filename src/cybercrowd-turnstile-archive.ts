// src/cybercrowd-turnstile-archive.ts
//
// CyberCrowd Turnstile Archive
//
// ONE JOB:
// Record Turnstile pass/fail events in KV without storing raw Turnstile
// tokens or raw emails.
//
// Turnstile Archive proves the human check happened.
// One-Time Pass stops repeat paid emails.
//
// This file does NOT stop repeat paid emails by itself.
// That job belongs to src/cybercrowd-one-time-pass.ts.
//
// DO NOT store raw Turnstile token.
// DO NOT store raw email.
// DO NOT store password.
// DO NOT store session.
// DO NOT store auth secret.
//
// KV BINDING REQUIRED:
// CYBERCROWD_TURNSTILE_ARCHIVE
//
// KEY:
// turnstile:pass:<email_hash>:<timestamp_ms>

export interface CyberCrowdTurnstileArchiveKV {
  get(
    key: string,
    options?: "text" | "json" | { type?: "text" | "json" }
  ): Promise<unknown>;

  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
}

export type CyberCrowdTurnstileResult =
  | "success"
  | "failure";

export interface CyberCrowdTurnstilePassRecord {
  pass_id: string;

  email_hash: string;
  email_mask: string;

  turnstile_result: CyberCrowdTurnstileResult;
  turnstile_site_key: string | null;

  created_at_ms: number;

  ip_hash: string | null;
  user_agent_hash: string | null;
}

export interface CyberCrowdTurnstileArchiveResult {
  ok: boolean;
  key: string | null;
  pass: CyberCrowdTurnstilePassRecord | null;
  message: string;
}

export async function archiveCyberCrowdTurnstilePass(input: {
  kv: CyberCrowdTurnstileArchiveKV;
  email: string;
  turnstileResult: CyberCrowdTurnstileResult;
  turnstileSiteKey?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  ttlSeconds?: number;
  nowMs?: number;
}): Promise<CyberCrowdTurnstileArchiveResult> {
  const kv = input.kv;

  if (!kv) {
    return fail("KV missing: CYBERCROWD_TURNSTILE_ARCHIVE.");
  }

  const email = normalizeEmail(input.email);

  if (!email) {
    return fail("Email invalid.");
  }

  const nowMs = input.nowMs ?? Date.now();
  const ttlSeconds = input.ttlSeconds ?? 90 * 24 * 60 * 60;

  const emailHash = await hashEmail(email);

  const pass: CyberCrowdTurnstilePassRecord = {
    pass_id: makeId("cc-turnstile"),

    email_hash: emailHash,
    email_mask: maskEmail(email),

    turnstile_result: input.turnstileResult,
    turnstile_site_key: cleanNullableText(input.turnstileSiteKey ?? null, 120),

    created_at_ms: nowMs,

    ip_hash: input.ip ? await hashValue(input.ip) : null,
    user_agent_hash: input.userAgent
      ? await hashValue(input.userAgent)
      : null
  };

  const key = makeTurnstilePassKey(emailHash, nowMs);

  await kv.put(key, JSON.stringify(pass), {
    expirationTtl: ttlSeconds
  });

  return {
    ok: true,
    key,
    pass,
    message: "Turnstile pass archived."
  };
}

export function makeTurnstilePassKey(
  emailHash: string,
  timestampMs: number
): string {
  return `turnstile:pass:${emailHash}:${timestampMs}`;
}

function fail(message: string): CyberCrowdTurnstileArchiveResult {
  return {
    ok: false,
    key: null,
    pass: null,
    message
  };
}

function normalizeEmail(value: string): string {
  const email = String(value || "").trim().toLowerCase();

  if (!email) {
    return "";
  }

  if (email.length > 254) {
    return "";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "";
  }

  return email;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return "unknown";
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email);
  const digest = await crypto.subtle.digest("SHA-256", data);

  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `email_${hex}`;
}

async function hashValue(value: string): Promise<string> {
  const data = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", data);

  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `hash_${hex}`;
}

function cleanNullableText(
  value: string | null,
  maxLength: number
): string | null {
  const clean = String(value || "").trim();

  if (!clean) {
    return null;
  }

  return clean.slice(0, maxLength);
}

function makeId(prefix: string): string {
  if (crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
