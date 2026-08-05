/**
 * functions/api/xr-room-scene.js
 *
 * CyberCrowd XR Room Scene 
 *
 * ONE JOB:
 * Maintain the XR room scene state domain.
 *
 * This is NOT:
 * - room status
 * - room occupants
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
 * "What is the current XR room scene state?"
 *
 * Flow:
 *
 * XR Client
 *    ↓
 * xr-room-scene.js
 *    ↓
 * Scene state
 *    ↓
 * XR snapshot aggregator
 */

const ROOM_SCENE_TTL_SECONDS = 60 * 60 * 24 * 7;

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

  const previous = await readScene(
    env,
    roomId
  );

  const now = new Date().toISOString();

  const state = {
    room_id: roomId,

    scene_state: cleanObject(
      body.scene_state ||
      body.sceneState
    ),

    geometry_version: cleanText(
      body.geometry_version ||
      body.geometryVersion ||
      previous?.geometry_version ||
      "1"
    ),

    created_at:
      previous?.created_at ||
      now,

    updated_at: now
  };

  await env.IDENTITY.put(
    "xr-room-state:scene:" + roomId,
    JSON.stringify(state),
    {
      expirationTtl: ROOM_SCENE_TTL_SECONDS
    }
  );

  return json({
    ok: true,
    room_id: roomId,
    geometry_version: state.geometry_version,
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

  const state = await readScene(
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

async function readScene(env, roomId) {
  const raw = await env.IDENTITY.get(
    "xr-room-state:scene:" + roomId
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

function cleanObject(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value;
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
