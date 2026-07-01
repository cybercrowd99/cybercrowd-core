// src/VCR-vessel-commit-retrospector.js
// CyberCrowd Mobile Physics Prototype
// Vessel Commit Retrospector (VCR)
//
// Purpose:
// Provide a local rewind mechanism for vessel commit frames.
// This restores the last known-good vessel commit snapshot without
// becoming login/session authority.
//
// Owns:
// - last-good vessel commit snapshot
// - rewind-to-snapshot behavior
// - analog frame memory
// - local snapshot read
//
// Does NOT own:
// - login/password authority
// - server session authority
// - cookies/KV/EAT
// - movement authorization
// - identity authority
// - packet shaping internals
// - physics math

function nowISO() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createVCRVesselCommitRetrospector() {
  let snapshot = null;
  let snapshotAt = null;
  let saveCount = 0;
  let rewindCount = 0;

  function save(commitFrame = null) {
    if (!commitFrame || typeof commitFrame !== "object") {
      return {
        ok: false,
        reason: "VALID_COMMIT_FRAME_REQUIRED",
        savedAt: nowISO(),
        authorityNote:
          "LOCAL_VCR_SAVE_ONLY_SERVER_AUTHORITY_REQUIRED",
      };
    }

    snapshot = clone(commitFrame);
    snapshotAt = nowISO();
    saveCount += 1;

    return {
      ok: true,
      savedAt: snapshotAt,
      saveCount,
      authorityNote:
        "LOCAL_VCR_SAVE_ONLY_SERVER_AUTHORITY_REQUIRED",
    };
  }

  function rewind() {
    if (!snapshot) {
      return {
        ok: false,
        reason: "NO_SNAPSHOT_AVAILABLE",
        rewindAt: nowISO(),
        authorityNote:
          "LOCAL_VCR_REWIND_ONLY_SERVER_AUTHORITY_REQUIRED",
      };
    }

    rewindCount += 1;

    return {
      ok: true,
      rewindAt: nowISO(),
      rewindCount,
      snapshot: clone(snapshot),
      snapshotAt,
      authorityNote:
        "LOCAL_VCR_REWIND_ONLY_SERVER_AUTHORITY_REQUIRED",
    };
  }

  function read() {
    return {
      ok: true,
      hasSnapshot: Boolean(snapshot),
      snapshot: snapshot ? clone(snapshot) : null,
      snapshotAt,
      saveCount,
      rewindCount,
      readAt: nowISO(),
      authorityNote:
        "LOCAL_VCR_READ_ONLY_SERVER_AUTHORITY_REQUIRED",
    };
  }

  function clear() {
    snapshot = null;
    snapshotAt = null;

    return {
      ok: true,
      clearedAt: nowISO(),
      saveCount,
      rewindCount,
      authorityNote:
        "LOCAL_VCR_CLEAR_ONLY_SERVER_AUTHORITY_REQUIRED",
    };
  }

  return {
    save,
    rewind,
    read,
    clear,
  };
}

export const VCRVesselCommitRetrospector = {
  createVCRVesselCommitRetrospector,
};
