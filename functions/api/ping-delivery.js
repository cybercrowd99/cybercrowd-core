/**
 * functions/api/ping-delivery.js
 *
 * CyberCrowd PING Delivery
 *
 * ONE JOB:
 * Record final delivery only after carrier-route.js selected a route.
 *
 * This is NOT chat.
 * This is NOT email.
 * This is NOT notification spam.
 * This does NOT create a PING.
 * This does NOT choose a carrier.
 * This does NOT bypass ping-throttle.js.
 *
 * Required flow:
 * ping-from-relevance.js creates PING
 *   ↓
 * ping-throttle.js allows ready_to_fire or fire_now
 *   ↓
 * carrier-route.js selects route
 *   ↓
 * ping-delivery.js records delivery
 *   ↓
 * ping-ack.js lets identity act
 */

const DELIVERY_TTL_SECONDS = 60 * 60 * 24 * 30;
const INDEX_TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_INDEX_ITEMS = 100;

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
  "email",
  "internal",
  "unknown"
]);

const ALLOWED_DELIVERY_STATUS = new Set([
  "delivered",
  "visible",
  "queued",
  "failed",
  "missed"
]);

const ALLOWED_ROUTE_STATUS = new Set([
  "selected"
]);

const BLOCKED_PING_STATUS = new Set([
  "silent",
  "hold",
  "held",
  "blocked",
  "resolved",
  "ignored",
  "deleted",
  "delivery_failed"
]);

export async function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env || !env.IDENTITY) {
    return json({ ok: false, error: "IDENTITY_KV_MISSING" }, 500);
  }

  const session = await readVerifiedSession(request, env);

  if (!session) {
    return json({ ok: false, error: "SESSION_REQUIRED" }, 401);
  }

  const actorIdentityId = getIdentityIdFromSession(session);

  if (!actorIdentityId) {
    return json({ ok: false, error: "SESSION_IDENTITY_MISSING" }, 401);
  }

  const body = await readRequestJson(request);

  if (!body) {
    return json({ ok: false, error: "JSON_REQUIRED" }, 400);
  }

  const pingId = cleanText(body.ping_id || body.pingId || body.id);

  if (!pingId) {
    return json({ ok: false, error: "PING_ID_REQUIRED" }, 400);
  }

  const rawPing = await readPing(env, pingId);

  if (!rawPing) {
    return json({ ok: false, error: "PING_NOT_FOUND" }, 404);
  }

  const ping = normalizePing(rawPing, pingId);

  const isReceiver = ping.to_identity_id === actorIdentityId;
  const isSender = ping.from_identity_id === actorIdentityId;

  if (!isReceiver && !isSender) {
    return json({ ok: false, error: "PING_ACCESS_DENIED" }, 403);
  }

  if (BLOCKED_PING_STATUS.has(ping.status)) {
    return json(
      {
        ok: false,
        error: "PING_NOT_DELIVERABLE",
        ping_id: ping.id,
        ping_status: ping.status,
        reason: "blocked_ping_status"
      },
      409
    );
  }

  const routeId = cleanText(
    body.carrier_route_id ||
      body.carrierRouteId ||
      body.route_id ||
      body.routeId ||
      ping.route_id ||
      ping.carrier_route_id ||
      ""
  );

  if (!routeId) {
    return json(
      {
        ok: false,
        error: "CARRIER_ROUTE_REQUIRED",
        ping_id: ping.id,
        reason: "delivery_requires_existing_carrier_route"
      },
      409
    );
  }

  const carrierRoute = await readCarrierRoute(env, routeId);

  if (!carrierRoute) {
    return json(
      {
        ok: false,
        error: "CARRIER_ROUTE_NOT_FOUND",
        ping_id: ping.id,
        carrier_route_id: routeId
      },
      404
    );
  }

  const routeCheck = checkCarrierRouteForDelivery(ping, carrierRoute, actorIdentityId);

  if (!routeCheck.ok) {
    return json(
      {
        ok: false,
        error: routeCheck.error,
        ping_id: ping.id,
        carrier_route_id: routeId,
        reason: routeCheck.reason
      },
      routeCheck.status
    );
  }

  const surface = normalizeSurface(
    body.surface ||
      body.active_surface ||
      body.activeSurface ||
      carrierRoute.surface ||
      ping.surface ||
      "unknown"
  );

  if (!ALLOWED_SURFACES.has(surface)) {
    return json(
      {
        ok: false,
        error: "DELIVERY_SURFACE_NOT_ALLOWED",
        allowed: Array.from(ALLOWED_SURFACES)
      },
      400
    );
  }

  const status = cleanText(body.status || "delivered").toLowerCase();

  if (!ALLOWED_DELIVERY_STATUS.has(status)) {
    return json(
      {
        ok: false,
        error: "DELIVERY_STATUS_NOT_ALLOWED",
        allowed: Array.from(ALLOWED_DELIVERY_STATUS)
      },
      400
    );
  }

  const now = new Date().toISOString();
  const deliveryId = cleanText(body.delivery_id || body.deliveryId) || makeId("DELIVERY");

  const delivery = {
    id: deliveryId,
    ping_id: ping.id,
    carrier_route_id: carrierRoute.id,

    from_identity_id: ping.from_identity_id,
    to_identity_id: ping.to_identity_id,
    actor_identity_id: actorIdentityId,

    surface,
    carrier: cleanText(body.carrier) || cleanText(carrierRoute.carrier) || surface,
    status,

    route_status: cleanText(carrierRoute.status),
    route_reason: cleanText(carrierRoute.reason),

    throttle_id: ping.throttle_id || carrierRoute.throttle_id || null,
    throttle_decision: ping.throttle_decision || carrierRoute.throttle_decision || null,

    object_id: ping.object_id || null,
    intent_id: ping.intent_id || null,
    proximity_id: ping.proximity_id || null,
    relevance_id: ping.relevance_id || null,

    presence_id:
      cleanText(body.presence_id || body.presenceId) ||
      cleanText(carrierRoute.presence_id || carrierRoute.presenceId) ||
      null,

    delivered_at: now,
    created_at: now,
    updated_at: now,

    metadata: cleanMetadata(body.metadata)
  };

  await env.IDENTITY.put("ping-delivery:" + delivery.id, JSON.stringify(delivery), {
    expirationTtl: DELIVERY_TTL_SECONDS
  });

  await appendIndex(env, "ping-delivery:index:ping:" + ping.id, delivery.id);
  await appendIndex(env, "ping-delivery:index:to:" + ping.to_identity_id, delivery.id);
  await appendIndex(env, "ping-delivery:index:surface:" + surface, delivery.id);
  await appendIndex(env, "ping-delivery:index:route:" + carrierRoute.id, delivery.id);

  const nextPing = {
    ...rawPing,

    id: ping.id,
    ping_id: ping.id,

    from_identity_id: ping.from_identity_id,
    to_identity_id: ping.to_identity_id,

    object_id: ping.object_id || null,
    intent_id: ping.intent_id || null,
    proximity_id: ping.proximity_id || null,
    relevance_id: ping.relevance_id || null,

    route_id: carrierRoute.id,
    carrier_route_id: carrierRoute.id,

    delivery_id: delivery.id,
    delivered_at: now,

    surface,
    carrier: delivery.carrier,

    delivery_status: status,
    status: status === "failed" ? "delivery_failed" : "delivered",

    updated_at: now
  };

  await env.IDENTITY.put("ping:" + ping.id, JSON.stringify(nextPing), {
    expirationTtl: DELIVERY_TTL_SECONDS
  });

  await appendSync(env, ping.id, {
    type: "ping_delivered",
    ping_id: ping.id,
    carrier_route_id: carrierRoute.id,
    delivery_id: delivery.id,
    surface,
    carrier: delivery.carrier,
    status: delivery.status,
    to_identity_id: ping.to_identity_id,
    from_identity_id: ping.from_identity_id,
    at: now
  });

  await appendSync(env, ping.to_identity_id, {
    type: "identity_ping_delivered",
    ping_id: ping.id,
    carrier_route_id: carrierRoute.id,
    delivery_id: delivery.id,
    surface,
    carrier: delivery.carrier,
    status: delivery.status,
    from_identity_id: ping.from_identity_id,
    object_id: ping.object_id || null,
    at: now
  });

  await appendSync(env, ping.from_identity_id, {
    type: "sent_ping_delivered",
    ping_id: ping.id,
    carrier_route_id: carrierRoute.id,
    delivery_id: delivery.id,
    surface,
    carrier: delivery.carrier,
    status: delivery.status,
    to_identity_id: ping.to_identity_id,
    object_id: ping.object_id || null,
    at: now
  });

  if (ping.object_id) {
    await appendSync(env, ping.object_id, {
      type: "object_ping_delivered",
      ping_id: ping.id,
      carrier_route_id: carrierRoute.id,
      delivery_id: delivery.id,
      surface,
      carrier: delivery.carrier,
      status: delivery.status,
      at: now
    });
  }

  return json({
    ok: true,
    created: true,
    delivery_id: delivery.id,
    carrier_route_id: carrierRoute.id,
    ping_id: ping.id,
    surface: delivery.surface,
    carrier: delivery.carrier,
    status: delivery.status,
    from_identity_id: delivery.from_identity_id,
    to_identity_id: delivery.to_identity_id,
    object_id: delivery.object_id,
    intent_id: delivery.intent_id,
    proximity_id: delivery.proximity_id,
    relevance_id: delivery.relevance_id,
    ping_created: false,
    route_created: false
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env || !env.IDENTITY) {
    return json({ ok: false, error: "IDENTITY_KV_MISSING" }, 500);
  }

  const session = await readVerifiedSession(request, env);

  if (!session) {
    return json({ ok: false, error: "SESSION_REQUIRED" }, 401);
  }

  const identityId = getIdentityIdFromSession(session);

  if (!identityId) {
    return json({ ok: false, error: "SESSION_IDENTITY_MISSING" }, 401);
  }

  const url = new URL(request.url);
  const pingId = cleanText(url.searchParams.get("ping_id") || url.searchParams.get("pingId"));

  if (!pingId) {
    return json({ ok: false, error: "PING_ID_REQUIRED" }, 400);
  }

  const rawPing = await readPing(env, pingId);

  if (!rawPing) {
    return json({ ok: false, error: "PING_NOT_FOUND" }, 404);
  }

  const ping = normalizePing(rawPing, pingId);

  if (ping.to_identity_id !== identityId && ping.from_identity_id !== identityId) {
    return json({ ok: false, error: "PING_ACCESS_DENIED" }, 403);
  }

  const ids = await readIndex(env, "ping-delivery:index:ping:" + ping.id);
  const deliveries = [];

  for (const id of ids) {
    const delivery = await readDelivery(env, id);

    if (!delivery) continue;

    deliveries.push(cleanDeliveryForReturn(delivery));
  }

  return json({
    ok: true,
    ping_id: ping.id,
    count: deliveries.length,
    deliveries
  });
}

function checkCarrierRouteForDelivery(ping, route, actorIdentityId) {
  const routeId = cleanText(route.id || route.route_id || route.routeId);
  const routePingId = cleanText(route.ping_id || route.pingId);
  const routeStatus = cleanText(route.status).toLowerCase();

  if (!routeId) {
    return {
      ok: false,
      status: 500,
      error: "CARRIER_ROUTE_ID_MISSING",
      reason: "route_record_missing_id"
    };
  }

  if (routePingId !== ping.id) {
    return {
      ok: false,
      status: 409,
      error: "CARRIER_ROUTE_PING_MISMATCH",
      reason: "route_does_not_belong_to_ping"
    };
  }

  if (!ALLOWED_ROUTE_STATUS.has(routeStatus)) {
    return {
      ok: false,
      status: 409,
      error: "CARRIER_ROUTE_NOT_SELECTED",
      reason: "route_status_must_be_selected"
    };
  }

  if (ping.route_id && ping.route_id !== routeId) {
    return {
      ok: false,
      status: 409,
      error: "PING_ROUTE_MISMATCH",
      reason: "ping_route_id_does_not_match_carrier_route_id"
    };
  }

  if (ping.carrier_route_id && ping.carrier_route_id !== routeId) {
    return {
      ok: false,
      status: 409,
      error: "PING_CARRIER_ROUTE_MISMATCH",
      reason: "ping_carrier_route_id_does_not_match_route"
    };
  }

  const routeFromId = cleanText(route.from_identity_id || route.fromIdentityId);
  const routeToId = cleanText(route.to_identity_id || route.toIdentityId);

  if (routeFromId && routeFromId !== ping.from_identity_id) {
    return {
      ok: false,
      status: 409,
      error: "CARRIER_ROUTE_FROM_MISMATCH",
      reason: "route_from_identity_does_not_match_ping"
    };
  }

  if (routeToId && routeToId !== ping.to_identity_id) {
    return {
      ok: false,
      status: 409,
      error: "CARRIER_ROUTE_TO_MISMATCH",
      reason: "route_to_identity_does_not_match_ping"
    };
  }

  if (actorIdentityId !== ping.from_identity_id && actorIdentityId !== ping.to_identity_id) {
    return {
      ok: false,
      status: 403,
      error: "DELIVERY_ACCESS_DENIED",
      reason: "actor_not_part_of_ping"
    };
  }

  return {
    ok: true,
    status: 200,
    reason: "carrier_route_valid"
  };
}

async function readVerifiedSession(request, env) {
  const token =
    getCookie(request, "session") ||
    getCookie(request, "cc_session") ||
    getCookie(request, "EAT") ||
    getBearerToken(request);

  if (!token) return null;

  return readJsonKey(env, "session:" + token);
}

function getIdentityIdFromSession(session) {
  return cleanText(
    session.identity_id ||
      session.identityId ||
      session.identity_active_id ||
      session["identity-active-id"] ||
      session.idl ||
      session.email ||
      ""
  );
}

async function readRequestJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function readJsonKey(env, key) {
  const raw = await env.IDENTITY.get(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readPing(env, pingId) {
  const id = cleanText(pingId);

  if (!id) return null;

  return readJsonKey(env, "ping:" + id);
}

async function readCarrierRoute(env, routeId) {
  const id = cleanText(routeId);

  if (!id) return null;

  return readJsonKey(env, "carrier-route:" + id);
}

async function readDelivery(env, deliveryId) {
  const id = cleanText(deliveryId);

  if (!id) return null;

  return readJsonKey(env, "ping-delivery:" + id);
}

async function readIndex(env, key) {
  const raw = await env.IDENTITY.get(key);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string" && item.trim());
    }

    return [];
  } catch {
    return [];
  }
}

async function appendIndex(env, key, value) {
  if (!key || !value) return;

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

  list = list.filter((item) => item !== value);
  list.unshift(value);
  list = list.slice(0, MAX_INDEX_ITEMS);

  await env.IDENTITY.put(key, JSON.stringify(list), {
    expirationTtl: INDEX_TTL_SECONDS
  });
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

  await env.IDENTITY.put(key, JSON.stringify(trail), {
    expirationTtl: INDEX_TTL_SECONDS
  });
}

function normalizePing(ping, fallbackId) {
  return {
    ...ping,

    id: cleanText(ping.id || ping.ping_id || ping.pingId || fallbackId),

    from_identity_id: cleanText(
      ping.from_identity_id ||
        ping.fromIdentityId ||
        ping.sender_identity_id ||
        ping.senderIdentityId ||
        ""
    ),

    to_identity_id: cleanText(
      ping.to_identity_id ||
        ping.toIdentityId ||
        ping.receiver_identity_id ||
        ping.receiverIdentityId ||
        ""
    ),

    object_id: cleanText(ping.object_id || ping.objectId || ""),
    intent_id: cleanText(ping.intent_id || ping.intentId || ""),
    proximity_id: cleanText(ping.proximity_id || ping.proximityId || ""),
    relevance_id: cleanText(ping.relevance_id || ping.relevanceId || ""),

    route_id: cleanText(ping.route_id || ping.routeId || ""),
    carrier_route_id: cleanText(ping.carrier_route_id || ping.carrierRouteId || ""),

    throttle_id: cleanText(ping.throttle_id || ping.throttleId || ""),
    throttle_decision: cleanText(
      ping.throttle_decision ||
        ping.throttleDecision ||
        ""
    ).toLowerCase(),

    surface: normalizeSurface(ping.surface || ""),
    carrier: cleanText(ping.carrier || ""),
    status: cleanText(ping.status || "").toLowerCase()
  };
}

function cleanDeliveryForReturn(delivery) {
  return {
    id: delivery.id,
    ping_id: delivery.ping_id,
    carrier_route_id: delivery.carrier_route_id || null,
    from_identity_id: delivery.from_identity_id,
    to_identity_id: delivery.to_identity_id,
    actor_identity_id: delivery.actor_identity_id,
    surface: delivery.surface,
    carrier: delivery.carrier,
    status: delivery.status,
    route_status: delivery.route_status || null,
    throttle_id: delivery.throttle_id || null,
    throttle_decision: delivery.throttle_decision || null,
    object_id: delivery.object_id || null,
    intent_id: delivery.intent_id || null,
    proximity_id: delivery.proximity_id || null,
    relevance_id: delivery.relevance_id || null,
    presence_id: delivery.presence_id || null,
    delivered_at: delivery.delivered_at || null,
    created_at: delivery.created_at || null,
    updated_at: delivery.updated_at || null
  };
}

function normalizeSurface(value) {
  const clean = cleanText(value).toLowerCase();

  if (!clean) return "unknown";

  if (clean === "mobile") return "phone";
  if (clean === "phone_camera") return "camera";
  if (clean === "cam") return "camera";
  if (clean === "browser_tab") return "browser";
  if (clean === "web") return "browser";
  if (clean === "vr") return "xr";
  if (clean === "shop") return "shop_tile";
  if (clean === "tile") return "shop_tile";
  if (clean === "object") return "object_link";
  if (clean === "link") return "object_link";

  return clean;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const parts = header.split(";");

  for (const part of parts) {
    const index = part.indexOf("=");

    if (index === -1) continue;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return "";
}

function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) return "";

  return match[1].trim();
}

function cleanText(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).trim();
}

function cleanMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const cleaned = {};

  Object.keys(value).forEach((key) => {
    const lower = key.toLowerCase();

    if (
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("cookie")
    ) {
      return;
    }

    const item = value[key];

    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      cleaned[key] = item;
    }
  });

  return cleaned;
}

function makeId(prefix) {
  if (crypto && crypto.randomUUID) {
    return prefix + "." + crypto.randomUUID();
  }

  return prefix + "." + Date.now() + "." + Math.random().toString(36).slice(2, 10);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
