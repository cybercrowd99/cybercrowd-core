/**
 * functions/api/xr-room-event.js
 *
 * CyberCrowd XR Room Event 
 *
 * ONE JOB:
 * Store validated XR room events after they have been wrapped
 * by xr-event-envelope.js.
 *
 * This is NOT:
 * - XR event creation
 * - XR envelope creation
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
 * "What XR events happened in this room?"
 *
 * Flow:
 *
 * XR Client
 *    ↓
 * xr-event-envelope.js
 *    ↓
 * xr-room-event.js
 *    ↓
 * XR room event history
 *    ↓
 * XR replay / state systems
 */

const EVENT_TTL_SECONDS = 60 * 60 * 24 * 30;
const INDEX_TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_INDEX_ITEMS = 100;

const ALLOWED_EVENT_TYPES = new Set([
  "XR_ROOM_ENTER",
  "XR_ROOM_EXIT",
  "XR_GEOMETRY_UPDATE",
  "XR_SLAM_STATE",
  "XR_OBJECT_UPDATE",
  "XR_SURFACE_UPDATE",
  "XR_STATE_CHANGE"
]);

const ALLOWED_SURFACES = new Set([
  "phone",
  "dashboard",
  "xr",
  "pos",
  "camera",
  "vehicle",
  "wall",
  "browser",
  "scanner",
  "shop_tile",
  "headset",
  "object_link",
  "internal",
  "unknown"
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

  const envelopeId = cleanText(
    body.envelope_id ||
    body.envelopeId
  );

  if (!envelopeId) {
    return json({
      ok: false,
      error: "ENVELOPE_ID_REQUIRED"
    }, 400);
  }

  const envelope = await readEnvelope(
    env,
    envelopeId
  );

  if (!envelope) {
    return json({
      ok: false,
      error: "XR_EVENT_ENVELOPE_NOT_FOUND"
    }, 404);
  }

  const eventType = normalizeEventType(
    envelope.event_type
  );

  if (!eventType) {
    return json({
      ok: false,
      error: "EVENT_TYPE_NOT_ALLOWED"
    }, 400);
  }

  const roomId = cleanText(
    envelope.room_id
  );

  if (!roomId) {
    return json({
      ok: false,
      error: "ROOM_ID_REQUIRED"
    }, 400);
  }

  const now = new Date().toISOString();

  const eventId =
    cleanText(
      body.event_id ||
      body.eventId
    ) ||
    makeId("XR_EVENT");

  const event = {
    event_id: eventId,

    envelope_id: envelopeId,

    room_id: roomId,

    event_type: eventType,

    source: cleanText(
      envelope.source ||
      "xr_client"
    ),

    surface: normalizeSurface(
      envelope.surface
    ),

    payload: cleanPayload(
      envelope.payload
    ),

    created_at: now,

    metadata: cleanMetadata(
      body.metadata
    )
  };

  await env.IDENTITY.put(
    "xr-room-event:" + eventId,
    JSON.stringify(event),
    {
      expirationTtl: EVENT_TTL_SECONDS
    }
  );

  await appendIndex(
    env,
    "xr-room-event:index:room:" + roomId,
    eventId
  );

  await appendSync(
    env,
    roomId,
    {
      type: "xr_room_event_created",
      event_id: eventId,
      envelope_id: envelopeId,
      event_type: eventType,
      at: now
    }
  );

  return json({
    ok: true,
    created: true,
    event_id: eventId,
    envelope_id: envelopeId,
    room_id: roomId,
    event_type: eventType
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

  const ids = await readIndex(
    env,
    "xr-room-event:index:room:" + roomId
  );

  const events = [];

  for (const id of ids) {
    const event = await readJsonKey(
      env,
      "xr-room-event:" + id
    );

    if (event) {
      events.push(event);
    }
  }

  return json({
    ok: true,
    room_id: roomId,
    count: events.length,
    events
  });
}

async function readEnvelope(env, envelopeId) {
  return readJsonKey(
    env,
    "xr-event-envelope:" + envelopeId
  );
}

async function readJsonKey(env, key) {
  const raw = await env.IDENTITY.get(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readIndex(env, key) {
  const raw = await env.IDENTITY.get(key);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch {
    return [];
  }
}

async function appendIndex(env, key, value) {
  const list = await readIndex(
    env,
    key
  );

  const next =
    list.filter(
      item => item !== value
    );

  next.unshift(value);

  await env.IDENTITY.put(
    key,
    JSON.stringify(
      next.slice(0, MAX_INDEX_ITEMS)
    ),
    {
      expirationTtl: INDEX_TTL_SECONDS
    }
  );
}

async function appendSync(env, targetId, event) {
  if (!targetId) {
    return;
  }

  const key = "sync:" + targetId;

  const trail = await readIndex(
    env,
    key
  );

  trail.unshift({
    sync_id: makeId("SYNC"),
    ...event
  });

  await env.IDENTITY.put(
    key,
    JSON.stringify(
      trail.slice(0, MAX_INDEX_ITEMS)
    ),
    {
      expirationTtl: INDEX_TTL_SECONDS
    }
  );
}

function normalizeEventType(value) {
  const clean =
    cleanText(value)
      .toUpperCase();

  return ALLOWED_EVENT_TYPES.has(clean)
    ? clean
    : "";
}

function normalizeSurface(value) {
  const clean =
    cleanText(value)
      .toLowerCase();

  return ALLOWED_SURFACES.has(clean)
    ? clean
    : "unknown";
}

function cleanPayload(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return deepClean(value);
}

function cleanMetadata(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return deepClean(value);
}

function deepClean(value) {
  if (Array.isArray(value)) {
    return value.map(item => deepClean(item));
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const cleaned = {};

    for (const key of Object.keys(value)) {
      const lower = key.toLowerCase();

      if (
        lower.includes("password") ||
        lower.includes("secret") ||
        lower.includes("token") ||
        lower.includes("cookie")
      ) {
        continue;
      }

      cleaned[key] = deepClean(
        value[key]
      );
    }

    return cleaned;
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

function makeId(prefix) {
  if (
    crypto &&
    crypto.randomUUID
  ) {
    return prefix + "." + crypto.randomUUID();
  }

  return (
    prefix +
    "." +
    Date.now() +
    "." +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}

function readRequestJson(request) {
  return request.json()
    .catch(() => null);
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}

