// src/vessel-runtime-bind.js
// CyberCrowd Mobile Physics Prototype
// Vessel Runtime Bind
//
// Purpose:
// Bind live vessel runtime state into the local NET chain.
//
// Owns:
// - runtime state collection
// - runtime packet assembly
// - optional packet shaper handoff
// - runtime-to-bridge handoff
// - clean runtime result
//
// Does NOT own:
// - physics math
// - moment recording internals
// - packet shaping internals
// - identity authority
// - movement authority
// - login/password/session
// - cookies/KV/EAT
// - server checks

import {
  runVesselIdentityBridge,
} from "./vessel-identity-bridge.js";

function nowISO() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPacketShaper(value) {
  return (
    value &&
    typeof value.push === "function" &&
    typeof value.emit === "function"
  );
}

function assembleRuntimePacket(runtimeState = {}) {
  const {
    activation = null,
    rotation = null,
    moment = null,
    freshness = null,
    tool = null,
    dt = null,
  } = runtimeState;

  return {
    activation,
    rotation,
    moment,
    freshness,
    tool,
    dt,
    emittedAt: nowISO(),
    authorityNote: "LOCAL_RUNTIME_PACKET_ONLY",
  };
}

export function bindVesselRuntime(runtimeState = {}, options = {}) {
  const {
    shaper = null,
    bridgeOptions = {},
  } = options;

  // Step 1: assemble runtime packet
  const packet = assembleRuntimePacket(runtimeState);

  let shapedPackets = [packet];
  let shaperPushResult = null;
  let shaperEmitResult = null;

  // Step 2: optionally pass through MomentPacketShaper
  if (isPacketShaper(shaper)) {
    shaperPushResult = shaper.push(packet);
    shaperEmitResult = shaper.emit();

    if (Array.isArray(shaperEmitResult) && shaperEmitResult.length) {
      shapedPackets = shaperEmitResult;
    }
  }

  // Step 3: run identity bridge
  const bridgeResult = runVesselIdentityBridge(
    shapedPackets,
    bridgeOptions
  );

  // Step 4: return clean runtime bind result
  return {
    ok: true,
    boundAt: nowISO(),

    packet: clone(packet),
    shapedPackets: clone(shapedPackets),

    shaperUsed: isPacketShaper(shaper),
    shaperPushResult: shaperPushResult ? clone(shaperPushResult) : null,
    shaperEmitResult: shaperEmitResult ? clone(shaperEmitResult) : null,

    bridgeResult,

    authorityNote:
      "LOCAL_RUNTIME_BIND_ONLY_SERVER_AUTHORITY_REQUIRED",
  };
}

export const VesselRuntimeBind = {
  bindVesselRuntime,
};
