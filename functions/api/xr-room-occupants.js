/**
 * functions/api/xr-room-occupants.js
 *
 * CyberCrowd XR Room Occupants
 *
 * ONE JOB:
 * Maintain the XR room occupants state domain.
 *
 * This is NOT:
 * - room status
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
 * "Who is currently registered as an occupant in this XR room?"
 *
 * Flow:
 *
 * XR Client
 *    ↓
 * xr-room-occupants.js
 *    ↓
 * Occupants state
 *    ↓
 * XR snapshot aggregator
 */

const ROOM_OCCUPANTS_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_OCCUPANTS = 100;

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

  const now = new Date().toISOString();

  const occupants = cleanArray(
    body.occupants
  );

  const state = {
    room_id: roomId,

    occupants,

    created_at: now,

    updated_at: now
  };

  await env.IDENTITY.put(
    "xr-room-state:occupants:" + roomId,
    JSON.stringify(state),
    {
      expirationTtl: ROOM_OCCUPANTS_TTL_SECONDS
    }
  );

  return json({
    ok: true,
    room_id: roomId,
    occupant_count: occupants.length,
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

  const state = await readOccupants(
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

async function readOccupants(env, roomId) {
  const raw = await env.IDENTITY.get(
    "xr-room-state:occupants:" + roomId
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

function cleanArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_OCCUPANTS);
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
