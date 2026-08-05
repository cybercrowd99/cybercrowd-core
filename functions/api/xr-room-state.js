/**
 * functions/api/xr-room-state.js
 *
 * CyberCrowd XR Room State 
 *
 * ONE JOB:
 * Maintain the current XR room state snapshot.
 *
 * This is NOT:
 * - XR event creation
 * - identity authentication
 * - chat
 * - PING creation
 * - Magic Cursor
 * - synthetic presence
 * - rendering
 * - AI behavior
 * - ownership transfer
 *
 * This only answers:
 * "What is the current XR room state?"
 *
 * Flow:
 *
 * XR Client
 *    ↓
 * xr-room-state.js
 *    ↓
 * Current room snapshot
 *    ↓
 * XR renderer / event systems
 */

const ROOM_TTL_SECONDS = 60 * 60 * 24 * 7;
const INDEX_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_INDEX_ITEMS = 100;

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

  const previous = await readRoomState(env, roomId);
  const now = new Date().toISOString();

  const stateId = cleanText(
    body.state_id ||
    body.stateId ||
    previous?.state_id
  ) || makeId("XR_STATE");

  const status = normalizeStatus(
    body.status ||
    previous?.status ||
    "active"
  );

  const state = {
    room_id: roomId,
    state_id: stateId,

    status,

    geometry_version: cleanText(
      body.geometry_version ||
      body.geometryVersion ||
      previous?.geometry_version ||
      "1"
    ),

    participants: cleanArray(
      body.participants
    ),

    surfaces: cleanArray(
      body.surfaces
    ),

    active_objects: cleanArray(
      body.active_objects ||
      body.activeObjects
    ),

    scene_state: cleanObject(
      body.scene_state ||
      body.sceneState
    ),

    created_at:
      previous?.created_at ||
      now,

    updated_at: now,

    metadata: cleanMetadata(
      body.metadata
    )
  };

  await env.IDENTITY.put(
    "xr-room:" + roomId,
    JSON.stringify(state),
    {
      expirationTtl: ROOM_TTL_SECONDS
    }
  );

  await env.IDENTITY.put(
    "xr-room-state:" + stateId,
    JSON.stringify(state),
    {
      expirationTtl: ROOM_TTL_SECONDS
    }
  );

  await appendIndex(
    env,
    "xr-room:index",
    roomId
  );

  await appendSync(
    env,
    roomId,
    {
      type: "xr_room_state_updated",
      room_id: roomId,
      state_id: stateId,
      status,
      geometry_version: state.geometry_version,
      at: now
    }
  );

  return json({
    ok: true,
    created: true,
    room_id: roomId,
    state_id: stateId,
    status,
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

  const state = await readRoomState(env, roomId);

  if (!state) {
    return json({
      ok: true,
      room_id: roomId,
      exists: false,
      state: null
    });
  }

  return json({
    ok: true,
    room_id: roomId,
    exists: true,
    state
  });
}

async function readRoomState(env, roomId) {
  const raw = await env.IDENTITY.get(
    "xr-room:" + roomId
  );

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function appendIndex(env, key, value) {
  const raw = await env.IDENTITY.get(key);

  let list = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch {
      list = [];
    }
  }

  list = list.filter(item => item !== value);

  list.unshift(value);

  list = list.slice(0, MAX_INDEX_ITEMS);

  await env.IDENTITY.put(
    key,
    JSON.stringify(list),
    {
      expirationTtl: INDEX_TTL_SECONDS
    }
  );
}

async function appendSync(env, targetId, event) {
  if (!targetId) return;

  const key = "sync:" + targetId;

  const raw = await env.IDENTITY.get(key);

  let trail = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        trail = parsed;
      }
    } catch {
      trail = [];
    }
  }

  trail.unshift({
    sync_id: makeId("SYNC"),
    ...event
  });

  trail = trail.slice(0, MAX_INDEX_ITEMS);

  await env.IDENTITY.put(
    key,
    JSON.stringify(trail),
    {
      expirationTtl: INDEX_TTL_SECONDS
    }
  );
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

function cleanArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_INDEX_ITEMS);
}

function cleanObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function cleanMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function cleanText(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).trim();
}

function makeId(prefix) {
  if (crypto && crypto.randomUUID) {
    return prefix + "." + crypto.randomUUID();
  }

  return prefix + "." + Date.now() + "." +
    Math.random().toString(36).slice(2, 10);
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
