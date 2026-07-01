// src/vessel-identity-bridge.js
// CyberCrowd Mobile Physics Prototype
// Vessel Identity Bridge
//
// Purpose:
// Connect shaped moment packets to identity convergence and pass local readiness
// into the Octopus window.
//
// Owns:
// - bridge coordination
// - packet-to-convergence handoff
// - convergence-to-Octopus handoff
// - clean local bridge result
//
// Does NOT own:
// - touch physics math
// - vessel activation calculation
// - moment recording
// - packet shaping internals
// - identity authority
// - login authority
// - password validation
// - server session authority
// - EAT minting
// - cookie creation
// - KV writes
// - movement authorization

import {
  evaluateIdentityConvergence,
} from "./identity-convergence-engine.js";

import {
  openOctopusWindow,
  evaluateOctopusWindow,
} from "./octopus/octopus-window.js";

function nowISO() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePackets(input) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.filter((packet) => packet && typeof packet === "object");
  }

  if (typeof input === "object") {
    return [input];
  }

  return [];
}

export function runVesselIdentityBridge(packetsOrPacket, options = {}) {
  const {
    autoOpenOctopus = true,
    convergenceOptions = {},
    octopusOptions = {},
  } = options;

  // Step 1: normalize packets
  const packets = normalizePackets(packetsOrPacket);

  if (!packets.length) {
    return {
      ok: false,
      reason: "VALID_SHAPED_PACKET_REQUIRED",
      bridgedAt: nowISO(),
      authorityNote: "NO_BRIDGE_SIGNAL_CREATED",
    };
  }

  let octopusOpenResult = null;   // window open status
  let octopusSignal = null;       // window evaluation signal

  // Step 2: run identity convergence
  const convergenceResult = evaluateIdentityConvergence(
    packets,
    convergenceOptions
  );

  // Step 3: optionally open Octopus window
  if (autoOpenOctopus) {
    octopusOpenResult = openOctopusWindow({
      openedBy: "vessel-identity-bridge",
    });
  }

  // Step 4: evaluate Octopus window using convergence result
  octopusSignal = evaluateOctopusWindow(
    convergenceResult,
    octopusOptions
  );

  // Step 5: return clean bridge result
  return {
    ok: true,
    bridgedAt: nowISO(),

    packetCount: packets.length,
    packets: clone(packets),

    convergenceResult,
    octopusOpenResult,
    octopusSignal,

    identityReadyLocal:
      convergenceResult &&
      convergenceResult.identityReady === true,

    movementReadyLocal:
      octopusSignal &&
      octopusSignal.movementReadiness === "movement-ready-local",

    authorityNote:
      "LOCAL_BRIDGE_ONLY_SERVER_AUTHORITY_REQUIRED",
  };
}

export function runVesselIdentityBridgeFromShaper(shaper, options = {}) {
  if (!shaper || typeof shaper.peekEmitted !== "function") {
    return {
      ok: false,
      reason: "VALID_PACKET_SHAPER_REQUIRED",
      bridgedAt: nowISO(),
      authorityNote: "NO_BRIDGE_SIGNAL_CREATED",
    };
  }

  const packets = shaper.peekEmitted();

  return runVesselIdentityBridge(packets, options);
}

export const VesselIdentityBridge = {
  runVesselIdentityBridge,
  runVesselIdentityBridgeFromShaper,
};
