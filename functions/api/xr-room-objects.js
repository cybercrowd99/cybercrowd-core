/**
 * functions/api/xr-room-objects.js
 *
 * CyberCrowd XR Room Objects 
 *
 * ONE JOB:
 * Maintain the XR room objects state domain.
 *
 * This is NOT:
 * - room status
 * - room occupants
 * - room scene
 * - snapshot aggregation
 * - identity authentication
 * - chat
 * - PING creation
 * - Magic Cursor
 * - rendering
 * - AI behavior
 *
 * This only answers:
 * "What objects currently belong to this XR room state?"
 *
 * Flow:
 *
 * XR Client
 *    ↓
 * xr-room-objects.js
 *    ↓
 * Objects state
 *    ↓
 * XR snapshot aggregator
 */

const ROOM_OBJECTS_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_OBJECTS = 100;

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

  const previous = await readObjects(
    env,
    roomId
  );

  const now = new Date().toISOString();

  const state = {
    room_id: roomId,

    active_objects: cleanArray(
      body.active_objects ||
      body.activeObjects
    ),

    created_at:
      previous?.created_at ||
      now,

    updated_at: now
  };

  await env.IDENTITY.put(
    "xr-room-state:objects:" + roomId,
    JSON.stringify(state),
    {
      expirationTtl: ROOM_OBJECTS_TTL_SECONDS
    }
  );

  return json({
    ok: true,
    room_id: roomId,
    object_count: state.active_objects.length,
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

  const state = await readObjects(
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

async function readObjects(env, roomId) {
  const raw = await env.IDENTITY.get(
    "xr-room-state:objects:" + roomId
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

  return value.slice(0, MAX_OBJECTS);
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
