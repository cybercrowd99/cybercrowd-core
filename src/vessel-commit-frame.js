// src/vessel-commit-frame.js
// CyberCrowd Mobile Physics Prototype
// Vessel Commit Frame
//
// Purpose:
// Assemble and commit one local vessel frame from a moment packet and vessel state.
// The committed frame may be rendered to a local TV surface and/or saved by VCR.
//
// Owns:
// - local vessel frame assembly
// - local frame commit result
// - optional local timeline append
// - optional TV surface render handoff
//
// Does NOT own:
// - touch physics math
// - packet shaping internals
// - identity authority
// - movement authority
// - login/password/session
// - cookies/KV/EAT
// - server checks
// - permanent audit storage

function nowISO() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeFrameId(prefix = "vesselFrame") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
}

function hasRenderSurface(surface) {
  return surface && typeof surface.renderFrame === "function";
}

function normalizeFrames(momentPacket) {
  if (!momentPacket || typeof momentPacket !== "object") return [];

  if (Array.isArray(momentPacket.frames)) {
    return momentPacket.frames.filter(
      (frame) => frame && typeof frame === "object"
    );
  }

  return [momentPacket];
}

export function commitVesselFrame({
  vesselId = null,
  packetId = null,
  frameIndex = 0,
  momentPacket = null,
  vesselState = {},
  surface = null,
  timestamp = Date.now(),
  appendTimeline = true,
  render = true,
} = {}) {
  if (!momentPacket || typeof momentPacket !== "object") {
    return {
      ok: false,
      reason: "VALID_MOMENT_PACKET_REQUIRED",
      committedAt: nowISO(),
      authorityNote: "NO_FRAME_COMMITTED",
    };
  }

  if (render && surface && !hasRenderSurface(surface)) {
    return {
      ok: false,
      reason: "SURFACE_RENDER_FRAME_REQUIRED",
      committedAt: nowISO(),
      authorityNote: "NO_FRAME_COMMITTED",
    };
  }

  const frame = {
    ok: true,
    frameId: makeFrameId(),
    vesselId,
    packetId,
    frameIndex,
    timestamp,
    committedAt: nowISO(),

    state: vesselState && typeof vesselState === "object"
      ? clone(vesselState)
      : {},

    payload: {
      momentPacket: clone(momentPacket),
    },

    authorityNote:
      "LOCAL_VESSEL_FRAME_ONLY_SERVER_AUTHORITY_REQUIRED",
  };

  // Optional local timeline append.
  if (
    appendTimeline &&
    vesselState &&
    Array.isArray(vesselState.timeline)
  ) {
    vesselState.timeline.push(clone(frame));
  }

  // Optional local TV surface render handoff.
  if (render && hasRenderSurface(surface)) {
    surface.renderFrame(clone(frame));
  }

  return frame;
}

export function commitVesselPacket({
  vesselId = null,
  packetId = null,
  momentPacket = null,
  vesselState = {},
  surface = null,
  appendTimeline = true,
  render = true,
} = {}) {
  const frames = normalizeFrames(momentPacket);

  if (!frames.length) {
    return {
      ok: false,
      reason: "VALID_MOMENT_PACKET_OR_FRAMES_REQUIRED",
      committedAt: nowISO(),
      authorityNote: "NO_PACKET_FRAMES_COMMITTED",
    };
  }

  const committed = frames.map((frameData, index) =>
    commitVesselFrame({
      vesselId,
      packetId,
      frameIndex: index,
      momentPacket: frameData,
      vesselState,
      surface,
      appendTimeline,
      render,
    })
  );

  const failed = committed.filter((frame) => !frame.ok);

  return {
    ok: failed.length === 0,
    vesselId,
    packetId,
    committedAt: nowISO(),
    total: committed.length,
    failed: failed.length,
    frames: committed,
    authorityNote:
      "LOCAL_VESSEL_PACKET_COMMIT_ONLY_SERVER_AUTHORITY_REQUIRED",
  };
}

export const VesselCommitFrame = {
  commitVesselFrame,
  commitVesselPacket,
};
