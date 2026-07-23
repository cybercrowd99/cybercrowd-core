/**
 * functions/api/xr-room-snapshot.js
 *
 * CyberCrowd XR Room Snapshot
 *
 * ONE JOB:
 * Reflect the combined XR room state snapshot.
 *
 * This is NOT:
 * - room state ownership
 * - room status mutation
 * - occupant mutation
 * - scene mutation
 * - object mutation
 * - identity authentication
 * - chat
 * - PING creation
 * - Magic Cursor
 * - rendering
 * - AI behavior
 *
 * This only answers:
 * "What is the current combined XR room snapshot?"
 *
 * Flow:
 *
 * XR Client
 *    ↓
 * xr-room-snapshot.js
 *    ↓
 * Read-only composition
 *    ↓
 * XR renderer / coordination layers
 */

export async function onRequestOptions() {
  return json({ ok: true });
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

  const [
    status,
    occupants,
    scene,
    objects
  ] = await Promise.all([
    readDomain(
      env,
      "status",
      roomId
    ),
    readDomain(
      env,
      "occupants",
      roomId
    ),
    readDomain(
      env,
      "scene",
      roomId
    ),
    readDomain(
      env,
      "objects",
      roomId
    )
  ]);

  return json({
    ok: true,

    room_id: roomId,

    snapshot: {
      status,
      occupants,
      scene,
      objects
    },

    read_only: true
  });
}

async function readDomain(
  env,
  domain,
  roomId
) {
  const raw = await env.IDENTITY.get(
    "xr-room-state:" +
    domain +
    ":" +
    roomId
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

function cleanText(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return "";
  }

  return String(value).trim();
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
