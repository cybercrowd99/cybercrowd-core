/**
 * functions/api/xr-room-status.js
 *
 * CyberCrowd XR Room Status
 *
 * ONE JOB:
 * Maintain the XR room status state domain.
 *
 * This is NOT:
 * - room occupants
 * - room scene
 * - room objects
 * - snapshot aggregation
 * - identity authentication
 * - chat
 * - PING creation
 * - Magic Cursor
 * - rendering
 * - AI behavior
 *
 * This only answers:
 * "What is the current XR room status?"
 *
 * Flow:
 *
 * XR Client
 *    ↓
 * xr-room-status.js
 *    ↓
 * Room status state
 *    ↓
 * XR snapshot aggregator
 */

const ROOM_STATUS_TTL_SECONDS = 60 * 60 * 24 * 7;

const ALLOWED_STATUS = new Set([
  "active",
  "paused",
  "closed"
]);

export async function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env || !env.IDENTITY) {
    return json({
      ok: false,
      error: "IDENTITY_KV_MISSING"
    }, 500);
  }

  const body = await readRequestJson(request);

  if (!body) {
    return json({
      ok: false,
      error: "JSON_REQUIRED"
    }, 400);
  }

  const roomId = cleanText(
    body.room_id ||
    body.roomId
  );

  if (!roomId) {
    return json({
      ok: false,
      error: "ROOM_ID_REQUIRED"
    }, 400);
  }

  const current = await readStatus(
    env,
    roomId
  );

  const now = new Date().toISOString();

  const state = {
    room_id: roomId,

    status: normalizeStatus(
      body.status ||
      current?.status ||
      "active"
    ),

    updated_at: now,

    created_at:
      current?.created_at ||
      now
  };

  await env.IDENTITY.put(
    "xr-room-state:status:" + roomId,
    JSON.stringify(state),
    {
      expirationTtl: ROOM_STATUS_TTL_SECONDS
    }
  );

  return json({
    ok: true,
    room_id: roomId,
    status: state.status,
    updated_at: now
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env || !env.IDENTITY) {
    return json({
      ok: false,
      error: "IDENTITY_KV_MISSING"
    }, 500);
  }

  const url = new URL(request.url);

  const roomId = cleanText(
    url.searchParams.get("room_id") ||
    url.searchParams.get("roomId")
  );

  if (!roomId) {
    return json({
      ok: false,
      error: "ROOM_ID_REQUIRED"
    }, 400);
  }

  const state = await readStatus(
    env,
    roomId
  );

  return json({
    ok: true,
    room_id: roomId,
    exists: !!state,
    state
  });
}

async function readStatus(env, roomId) {
  const raw = await env.IDENTITY.get(
    "xr-room-state:status:" + roomId
  );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeStatus(value) {
  const clean =
    cleanText(value)
      .toLowerCase();

  if (ALLOWED_STATUS.has(clean)) {
    return clean;
  }

  return "active";
}

function cleanText(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return "";
  }

  return String(value).trim();
}

function readRequestJson(request) {
  return request.json().catch(() => null);
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
