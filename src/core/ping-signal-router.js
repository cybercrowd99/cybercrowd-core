// src/core/ping-signal-router.js
// CyberCrowd Core
// Ping Signal Router
//
// Purpose:
// Route bound-ready IDL signals as CyberCrowd ping signals.
// Social IDL Binder → Ping Signal Router → downstream CyberCrowd lanes
//
// Owns:
// - ping envelope creation
// - routing status
// - provider/source carry-through
// - free/licensed summary carry-through
// - bound identity reference carry-through
//
// Does NOT own:
// - OAuth
// - scraping
// - raw intake
// - normalization
// - inventory creation
// - IDL background signal creation
// - identity proof
// - agreement approval
// - sessions
// - cookies/KV/EAT
// - server authority

function nowISO() {
  return new Date().toISOString();
}

function makePingId(prefix = "cyberPing") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
}

function safeClone(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function readRouteLane(boundSignal = {}) {
  if (!boundSignal || typeof boundSignal !== "object") {
    return "unrouted";
  }

  if (boundSignal.provider && boundSignal.source) {
    return `provider:${boundSignal.provider}:source:${boundSignal.source}`;
  }

  if (boundSignal.provider) {
    return `provider:${boundSignal.provider}`;
  }

  if (boundSignal.source) {
    return `source:${boundSignal.source}`;
  }

  return "core:identity-ledger";
}

function isBoundReady(boundSignal = {}) {
  return (
    boundSignal &&
    typeof boundSignal === "object" &&
    boundSignal.ok === true &&
    boundSignal.pendingIdentity === false &&
    Boolean(boundSignal.identityId)
  );
}

export async function routePingSignal(boundSignal = {}) {
  if (!boundSignal || typeof boundSignal !== "object") {
    return {
      ok: false,
      reason: "BOUND_IDL_SIGNAL_REQUIRED",
      routedAt: nowISO(),
      authorityNote: "NO_PING_SIGNAL_CREATED",
    };
  }

  if (!isBoundReady(boundSignal)) {
    return {
      ok: false,
      reason: "BOUND_READY_IDL_SIGNAL_REQUIRED",
      routedAt: nowISO(),

      binderId: boundSignal.binderId || null,
      idlSignalId: boundSignal.idlSignalId || null,
      identityId: boundSignal.identityId || null,
      pendingIdentity:
        boundSignal.pendingIdentity === undefined
          ? true
          : boundSignal.pendingIdentity,

      agreementRequired: safeClone(boundSignal.agreementRequired || {}),

      authorityNote:
        "PING_ROUTER_WAITING_FOR_BOUND_READY_IDL_SIGNAL",
    };
  }

  return {
    ok: true,

    pingId: makePingId(),
    routedAt: nowISO(),

    routeLane: readRouteLane(boundSignal),
    routeStatus: "queued",

    binderId: boundSignal.binderId || null,
    idlSignalId: boundSignal.idlSignalId || null,
    intakeId: boundSignal.intakeId || null,

    provider: boundSignal.provider || null,
    source: boundSignal.source || null,

    identityId: boundSignal.identityId,
    pendingIdentity: false,

    status: "ping-routed",
    inventoryState: "ping-signal",

    counts: safeClone(boundSignal.counts || {}),
    categoryCounts: safeClone(boundSignal.categoryCounts || {}),
    agreementRequired: safeClone(boundSignal.agreementRequired || {}),

    background: safeClone(boundSignal.background || {}),

    authorityNote:
      "PING_SIGNAL_ROUTED_FROM_BOUND_READY_IDL_SIGNAL_NOT_SERVER_AUTHORITY",
  };
}

export function readPingSignalRouterShape() {
  return {
    ok: true,
    name: "ping-signal-router",
    stage: "ping-route",
    accepts: ["boundSignal"],
    returns: [
      "pingId",
      "routeLane",
      "routeStatus",
      "binderId",
      "idlSignalId",
      "provider",
      "source",
      "identityId",
      "pendingIdentity",
      "status",
      "inventoryState",
      "counts",
      "categoryCounts",
      "agreementRequired",
      "background",
      "authorityNote",
    ],
    inventoryRule:
      "Ping routing carries gathered-ready inventory context forward.",
    identityRule:
      "Ping router does not prove or create Identity. It only routes caller-bound IDL signals.",
    agreementRule:
      "Agreement must already be accepted before bound-ready signals can route.",
    authorityNote:
      "PING_SIGNAL_ROUTER_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const PingSignalRouter = {
  routePingSignal,
  readPingSignalRouterShape,
};
