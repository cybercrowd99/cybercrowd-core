// functions/api/auth/set-password.js
//
// CyberCrowd Auth — Set Password
//
// ONE JOB:
// Save password, create session, set cookie, and report the exact failure stage.
//
// No NET.
// No route guessing.
// No silent failure.

const ONE_WEEK_SECONDS = 86400 * 7;

function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers();

  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");

  Object.entries(extraHeaders || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
      return;
    }

    headers.set(key, value);
  });

  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers
  });
}

function makeToken(bytes = 32) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);

  return [...array]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function checkPasswordRule(password) {
  const value = String(password || "");

  if (value.length < 8) {
    return "password_too_short";
  }

  if (value.length > 19) {
    return "password_too_long";
  }

  if (!/[A-Z]/.test(value)) {
    return "password_needs_uppercase";
  }

  if (!/[a-z]/.test(value)) {
    return "password_needs_lowercase";
  }

  if (!/[0-9]/.test(value)) {
    return "password_needs_number";
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return "password_needs_symbol";
  }

  return "";
}

async function hashPassword(email, password) {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(email.toLowerCase().trim()),
      iterations: 150000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  return [...new Uint8Array(bits)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function readSetupRecord(env, setupToken) {
  const keys = [
    `setup:${setupToken}`,
    `setup-token:${setupToken}`,
    `setup_token:${setupToken}`,
    `verify:${setupToken}`,
    `verification:${setupToken}`
  ];

  for (const key of keys) {
    const raw = await env.IDENTITY.get(key);

    if (!raw) {
      continue;
    }

    return {
      key,
      raw
    };
  }

  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let stage = "start";

  try {
    stage = "read_body";

    const body = await request.json().catch(() => null);

    const setupToken = String(
      body?.token ||
      body?.setupToken ||
      body?.setup ||
      ""
    ).trim();

    const password = String(body?.password || "");

    const confirmPassword =
      body?.confirmPassword === undefined
        ? ""
        : String(body.confirmPassword || "");

    stage = "validate_input";

    if (!setupToken) {
      return json(
        {
          success: false,
          ok: false,
          stage,
          error: "missing_setup_token"
        },
        400
      );
    }

    const passwordError = checkPasswordRule(password);

    if (passwordError) {
      return json(
        {
          success: false,
          ok: false,
          stage,
          error: passwordError
        },
        400
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return json(
        {
          success: false,
          ok: false,
          stage,
          error: "passwords_do_not_match"
        },
        400
      );
    }

    stage = "check_kv";

    if (!env?.IDENTITY) {
      return json(
        {
          success: false,
          ok: false,
          stage,
          error: "identity_kv_missing"
        },
        500
      );
    }

    stage = "read_setup_token";

    const setupFound = await readSetupRecord(env, setupToken);

    if (!setupFound) {
      return json(
        {
          success: false,
          ok: false,
          stage,
          error: "invalid_or_expired_setup_token"
        },
        403
      );
    }

    stage = "parse_setup_record";

    let setupRecord;

    try {
      setupRecord = JSON.parse(setupFound.raw);
    } catch {
      return json(
        {
          success: false,
          ok: false,
          stage,
          error: "setup_record_corrupt"
        },
        500
      );
    }

    stage = "validate_setup_record";

    const email = String(
      setupRecord.email || ""
    ).toLowerCase().trim();

    const identityActiveId = String(
      setupRecord["identity-active-id"] ||
      setupRecord.identity_active_id ||
      setupRecord.identityActiveId ||
      setupRecord.identity_id ||
      setupRecord.identityId ||
      ""
    ).trim();

    if (!email || !email.includes("@")) {
      return json(
        {
          success: false,
          ok: false,
          stage,
          error: "setup_email_invalid"
        },
        500
      );
    }

    if (!identityActiveId) {
      return json(
        {
          success: false,
          ok: false,
          stage,
          error: "identity_active_id_missing"
        },
        500
      );
    }

    stage = "hash_password";

    const passwordHash = await hashPassword(
      email,
      password
    );

    const now = Date.now();
    const eat = makeToken(32);

    const userRecord = {
      "identity-active-id": identityActiveId,
      identity_active_id: identityActiveId,
      identity_id: identityActiveId,
      identityId: identityActiveId,
      email,
      verified: true,
      passwordHash,
      password_hash: passwordHash,
      password_rule: "8-19_upper_lower_number_symbol",
      createdAt:
        setupRecord.createdAt ||
        setupRecord.created_at ||
        now,
      passwordSetAt: now,
      password_set_at: now,
      updatedAt: now,
      updated_at: now
    };

    const sessionRecord = {
      eat,
      token: eat,
      "identity-active-id": identityActiveId,
      identity_active_id: identityActiveId,
      identity_id: identityActiveId,
      identityId: identityActiveId,
      email,
      epoch: now,
      band: "user",
      created_at: new Date(now).toISOString(),
      expires_at: new Date(
        now + ONE_WEEK_SECONDS * 1000
      ).toISOString()
    };

    stage = "write_user_identity";

    await env.IDENTITY.put(
      `user:${identityActiveId}`,
      JSON.stringify(userRecord)
    );

    await env.IDENTITY.put(
      `user-email:${email}`,
      identityActiveId
    );

    if (env.USERS) {
      stage = "write_user_users_kv";

      await env.USERS.put(
        `user:${identityActiveId}`,
        JSON.stringify(userRecord)
      );

      await env.USERS.put(
        `user-email:${email}`,
        identityActiveId
      );
    }

    stage = "write_session";

    if (env.SESSION) {
      await env.SESSION.put(
        `session:${eat}`,
        JSON.stringify(sessionRecord),
        {
          expirationTtl: ONE_WEEK_SECONDS
        }
      );
    }

    await env.IDENTITY.put(
      `session:${eat}`,
      JSON.stringify(sessionRecord),
      {
        expirationTtl: ONE_WEEK_SECONDS
      }
    );

    stage = "delete_setup_token";

    await env.IDENTITY.delete(setupFound.key);

    stage = "return_success";

    return json(
      {
        success: true,
        ok: true,
        stage,
        identity_active_id: identityActiveId,
        redirect: "/dashboard-surface.html"
      },
      200,
      {
        "Set-Cookie": [
          `session=${eat}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ONE_WEEK_SECONDS}`,
          `cc_session=${eat}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ONE_WEEK_SECONDS}`,
          `EAT=${eat}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ONE_WEEK_SECONDS}`
        ]
      }
    );
  } catch (error) {
    return json(
      {
        success: false,
        ok: false,
        stage,
        error: "set_password_failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown set password error."
      },
      500
    );
  }
}
