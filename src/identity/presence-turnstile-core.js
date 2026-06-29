// src/identity/identity-turnstile-core.js
// CyberCrowd Identity Turnstile
//
// Rigid static checks + flex presence where allowed.
// No elevation. No authority grant. Only pass/fail identity validation.
//
// This worker validates:
//   - tenant identity
//   - session ownership
//   - lane continuity
//   - presence authority
//   - session freshness
//
// It does NOT grant access.
// It does NOT elevate authority.
// It only confirms whether the identity is allowed to pass the turnstile.
//
// All decisions are symbolic, not financial.

import { TurnstileStorage } from "../../lib/turnstile-storage";
import { makeKCBlock } from "../../lib/kc-block";
import { makeLotBlock } from "../../lib/lot-block";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return json(
        { ok: false, reason: "method-not-allowed" },
        405
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(
        { ok: false, reason: "invalid-json" },
        400
      );
    }

    const tenant_id = String(payload.tenant_id || "").trim();
    const session_id = String(payload.session_id || "").trim();
    const lane_id = String(payload.lane_id || "").trim();
    const presence_token = String(payload.presence_token || "").trim();

    if (!tenant_id || !session_id || !lane_id || !presence_token) {
      return json(
        { ok: false, reason: "missing-fields" },
        400
      );
    }

    if (!env.IDENTITY_TURNSTILE) {
      return json(
        { ok: false, reason: "missing-turnstile-storage" },
        500
      );
    }

    const storage = new TurnstileStorage(env.IDENTITY_TURNSTILE);

    // --- Tenant Validation ---
    const tenantRecord = await storage.getTenant(tenant_id);

    if (!tenantRecord) {
      return json(
        { ok: false, reason: "tenant-not-found" },
        404
      );
    }

    // --- Session Validation ---
    const sessionRecord = await storage.getSession(session_id);

    if (!sessionRecord || sessionRecord.tenant_id !== tenant_id) {
      return json(
        { ok: false, reason: "session-mismatch" },
        403
      );
    }

    // --- Lane Continuity ---
    if (sessionRecord.lane_id !== lane_id) {
      return json(
        { ok: false, reason: "lane-mismatch" },
        403
      );
    }

    // --- Presence Token Validation (flex allowed) ---
    const presenceValid = await storage.verifyPresence(
      tenant_id,
      session_id,
      presence_token
    );

    if (!presenceValid) {
      return json(
        { ok: false, reason: "presence-invalid" },
        403
      );
    }

    // --- Rigid Static TTL + Last Seen Validation ---
    const now = Date.now();

    const ttl = Number(env.SESSION_TTL_MS ?? 30000);
    const lastSeen = Number(sessionRecord.last_seen);

    if (!Number.isFinite(ttl) || ttl <= 0 || ttl > 86400000) {
      return json(
        { ok: false, reason: "invalid-session-ttl" },
        500
      );
    }

    if (!Number.isFinite(lastSeen) || lastSeen <= 0) {
      return json(
        { ok: false, reason: "invalid-session-record" },
        500
      );
    }

    if (lastSeen > now) {
      return json(
        { ok: false, reason: "clock-drift" },
        500
      );
    }

    if (now - lastSeen >= ttl) {
      return json(
        { ok: false, reason: "session-expired" },
        403
      );
    }

    // --- Update Last Seen (flex allowed) ---
    await storage.updateLastSeen(session_id, now);

    // --- KC + LOT Blocks ---
    const kc = makeKCBlock({
      tenant_id,
      session_id,
      lane_id,
      decision: "turnstile-pass"
    });

    const lot = makeLotBlock({
      lot: "IDL",
      item: "turnstile-pass",
      tenant_id,
      session_id,
      lane_id,
      timestamp: now
    });

    return json(
      {
        ok: true,
        reason: null,
        kc,
        lot
      },
      200
    );
  }
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
