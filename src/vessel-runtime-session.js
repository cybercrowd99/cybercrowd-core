// src/vessel-runtime-session.js
// CyberCrowd Mobile Physics Prototype
// Vessel Runtime Session
//
// Purpose:
// Hold one local runtime session around the vessel chain without
// becoming login/session authority.
//
// Owns:
// - local session container
// - local session timestamps
// - local packet memory
// - local bridge results
// - local session read
// - local session reset
//
// Does NOT own:
// - login/password authority
// - server session authority
// - cookies/KV/EAT
// - movement authorization
// - identity authority
// - packet shaping internals
// - physics math

import {
  bindVesselRuntime,
} from "./vessel-runtime-bind.js";

function nowISO() {
  return new Date().toISOString();
}

function makeSessionId(prefix = "local-vessel-session") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createVesselRuntimeSession(options = {}) {
  const {
    createdBy = "local-vessel-runtime",
  } = options;

  const sessionId = makeSessionId();
  const createdAt = nowISO();

  let lastBoundAt = null;
  let bindCount = 0;

  let lastPacket = null;
  let lastShapedPackets = null;
  let lastBridgeResult = null;
  let lastBindResult = null;

  function bind(runtimeState = {}, bindOptions = {}) {
    const result = bindVesselRuntime(runtimeState, bindOptions);

    bindCount += 1;
    lastBoundAt = nowISO();

    lastPacket = result.packet || null;
    lastShapedPackets = result.shapedPackets || null;
    lastBridgeResult = result.bridgeResult || null;
    lastBindResult = result;

    return {
      ok: true,
      sessionId,
      createdBy,
      createdAt,
      lastBoundAt,
      bindCount,

      lastPacket: lastPacket ? clone(lastPacket) : null,
      lastShapedPackets: lastShapedPackets ? clone(lastShapedPackets) : null,
      lastBridgeResult: lastBridgeResult ? clone(lastBridgeResult) : null,
      lastBindResult: lastBindResult ? clone(lastBindResult) : null,

      authorityNote:
        "LOCAL_RUNTIME_SESSION_ONLY_SERVER_AUTHORITY_REQUIRED",
    };
  }

  function read() {
    return {
      ok: true,
      sessionId,
      createdBy,
      createdAt,
      lastBoundAt,
      bindCount,

      lastPacket: lastPacket ? clone(lastPacket) : null,
      lastShapedPackets: lastShapedPackets ? clone(lastShapedPackets) : null,
      lastBridgeResult: lastBridgeResult ? clone(lastBridgeResult) : null,
      lastBindResult: lastBindResult ? clone(lastBindResult) : null,

      readAt: nowISO(),
      authorityNote:
        "LOCAL_RUNTIME_SESSION_READ_ONLY_SERVER_AUTHORITY_REQUIRED",
    };
  }

  function reset() {
    lastBoundAt = null;
    bindCount = 0;

    lastPacket = null;
    lastShapedPackets = null;
    lastBridgeResult = null;
    lastBindResult = null;

    return {
      ok: true,
      sessionId,
      resetAt: nowISO(),
      authorityNote:
        "LOCAL_RUNTIME_SESSION_RESET_ONLY_SERVER_AUTHORITY_REQUIRED",
    };
  }

  return {
    sessionId,
    createdBy,
    createdAt,
    bind,
    read,
    reset,
  };
}

export const VesselRuntimeSession = {
  createVesselRuntimeSession,
};
