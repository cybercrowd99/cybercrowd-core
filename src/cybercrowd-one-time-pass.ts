// src/cybercrowd-one-time-pass.ts
//
// CyberCrowd One-Time Pass
//
// ONE JOB:
// CyberCrowd-net records one temporary pass per email request,
// like Cloudflare records/verifies a Turnstile pass.
//
// Turnstile proves human.
// CyberCrowd One-Time Pass proves the email send ticket was already used.
//
// This stops repeat paid emails.
//
// DO NOT store raw Turnstile token.
// DO NOT store raw email.
// DO NOT store password.
// DO NOT store session.
// DO NOT store auth secret.
//
// KV BINDING REQUIRED:
// CYBERCROWD_ONE_TIME_PASS
//
// KEY:
// one-time-pass:verification:<email_hash>
//
// RULE:
// If pass exists -> do not send email.
// If pass missing -> create pass first -> send email.

export interface CyberCrowdOneTimePassKV {
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

export type CyberCrowdOneTimePassPurpose =
  | "verification"
  | "login"
  | "setup"
  | "password-reset";

export type CyberCrowdOneTimePassStatus =
  | "active"
  | "sent"
  | "blocked"
  | "failed";

export interface CyberCrowdOneTimePassRecord {
  pass_id: string;
  status: CyberCrowdOneTimePassStatus;
  purpose: CyberCrowdOneTimePassPurpose;

  email_hash: string;
  email_mask: string;

  created_at_ms: number;
  updated_at_ms: number;
  expires_at_ms: number;

  attempt_count: number;
}

export interface CyberCrowdOneTimePassResult {
  ok: boolean;
  can_send: boolean;

  action:
    | "one_time_pass_created"
    | "one_time_pass_exists"
    | "one_time_pass_marked_sent"
    | "one_time_pass_marked_failed"
    | "invalid_email"
    | "kv_missing";

  key: string | null;
  pass: CyberCrowdOneTimePassRecord | null;
  message: string;
}

export async function createCyberCrowdOneTimePass(input: {
  kv: CyberCrowdOneTimePassKV;
  email: string;
  purpose?: CyberCrowdOneTimePassPurpose;
  ttlSeconds?: number;
  nowMs?: number;
}): Promise<CyberCrowdOneTimePassResult> {
  const kv = input.kv;

  if (!kv) {
    return fail("kv_missing", "CYBERCROWD_ONE_TIME_PASS KV is missing.");
  }

  const email = normalizeEmail(input.email);

  if (!email) {
    return fail("invalid_email", "Email is invalid.");
  }

  const purpose = input.purpose ?? "verification";
  const ttlSeconds = input.ttlSeconds ?? 900;
  const nowMs = input.nowMs ?? Date.now();

  const emailHash = await hashEmail(email);
  const key = makePassKey(purpose, emailHash);

  const existing = await kv.get(key, { type: "json" });

  if (existing && isPassRecord(existing)) {
    const updated: CyberCrowdOneTimePassRecord = {
      ...existing,
      status: "blocked",
      updated_at_ms: nowMs,
      attempt_count: existing.attempt_count + 1
    };

    await kv.put(key, JSON.stringify(updated), {
      expirationTtl: ttlSeconds
    });

    return {
      ok: true,
      can_send: false,
      action: "one_time_pass_exists",
      key,
      pass: updated,
      message: "Check your email."
    };
  }

  const pass: CyberCrowdOneTimePassRecord = {
    pass_id: makeId("cc-pass"),
    status: "active",
    purpose,

    email_hash: emailHash,
    email_mask: maskEmail(email),

    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    expires_at_ms: nowMs + ttlSeconds * 1000,

    attempt_count: 1
  };

  await kv.put(key, JSON.stringify(pass), {
    expirationTtl: ttlSeconds
  });

  return {
    ok: true,
    can_send: true,
    action: "one_time_pass_created",
    key,
    pass,
    message: "One-time pass created."
  };
}

export async function markCyberCrowdOneTimePassSent(input: {
  kv: CyberCrowdOneTimePassKV;
  key: string;
  ttlSeconds?: number;
  nowMs?: number;
}): Promise<CyberCrowdOneTimePassResult> {
  const kv = input.kv;

  if (!kv) {
    return fail("kv_missing", "CYBERCROWD_ONE_TIME_PASS KV is missing.");
  }

  const key = cleanKey(input.key);

  if (!key) {
    return fail("invalid_email", "Pass key is invalid.");
  }

  const ttlSeconds = input.ttlSeconds ?? 900;
  const nowMs = input.nowMs ?? Date.now();

  const existing = await kv.get(key, { type: "json" });

  if (!existing || !isPassRecord(existing)) {
    return {
      ok: false,
      can_send: false,
      action: "one_time_pass_exists",
      key,
      pass: null,
      message: "One-time pass not found."
    };
  }

  const updated: CyberCrowdOneTimePassRecord = {
    ...existing,
    status: "sent",
    updated_at_ms: nowMs
  };

  await kv.put(key, JSON.stringify(updated), {
    expirationTtl: ttlSeconds
  });

  return {
    ok: true,
    can_send: false,
    action: "one_time_pass_marked_sent",
    key,
    pass: updated,
    message: "One-time pass marked sent."
  };
}

export async function markCyberCrowdOneTimePassFailed(input: {
  kv: CyberCrowdOneTimePassKV;
  key: string;
  ttlSeconds?: number;
  nowMs?: number;
}): Promise<CyberCrowdOneTimePassResult> {
  const kv = input.kv;

  if (!kv) {
    return fail("kv_missing", "CYBERCROWD_ONE_TIME_PASS KV is missing.");
  }

  const key = cleanKey(input.key);

  if (!key) {
    return fail("invalid_email", "Pass key is invalid.");
  }

  const ttlSeconds = input.ttlSeconds ?? 900;
  const nowMs = input.nowMs ?? Date.now();

  const existing = await kv.get(key, { type: "json" });

  if (!existing || !isPassRecord(existing)) {
    return {
      ok: false,
      can_send: false,
      action: "one_time_pass_exists",
      key,
      pass: null,
      message: "One-time pass not found."
    };
  }

  const updated: CyberCrowdOneTimePassRecord = {
    ...existing,
    status: "failed",
    updated_at_ms: nowMs
  };

  await kv.put(key, JSON.stringify(updated), {
    expirationTtl: ttlSeconds
  });

  return {
    ok: true,
    can_send: false,
    action: "one_time_pass_marked_failed",
    key,
    pass: updated,
    message: "One-time pass marked failed."
  };
}

export function makePassKey(
  purpose: CyberCrowdOneTimePassPurpose,
  emailHash: string
): string {
  return `one-time-pass:${purpose}:${emailHash}`;
}

function fail(
  action: CyberCrowdOneTimePassResult["action"],
  message: string
): CyberCrowdOneTimePassResult {
  return {
    ok: false,
    can_send: false,
    action,
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

function makeId(prefix: string): string {
  if (crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function cleanKey(value: string): string {
  const key = String(value || "").trim();

  if (!key) {
    return "";
  }

  if (key.length > 300) {
    return "";
  }

  if (!/^one-time-pass:[a-z-]+:email_[a-f0-9]+$/.test(key)) {
    return "";
  }

  return key;
}

function isPassRecord(value: unknown): value is CyberCrowdOneTimePassRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as CyberCrowdOneTimePassRecord;

  return (
    typeof record.pass_id === "string" &&
    typeof record.status === "string" &&
    typeof record.purpose === "string" &&
    typeof record.email_hash === "string" &&
    typeof record.email_mask === "string" &&
    typeof record.created_at_ms === "number" &&
    typeof record.updated_at_ms === "number" &&
    typeof record.expires_at_ms === "number" &&
    typeof record.attempt_count === "number"
  );
}
