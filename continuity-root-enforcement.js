// continuity-root-enforcement.js
// CyberCrowd Core — Continuity Root Enforcement
// Pure enforcement/validation organ.
// Owns: recomputing replay root and continuity root from SovereignCoreAPI state,
// comparing against an existing identity seal, and emitting neutral validation events.
// Does not create identities, seal identities, lock replay, fork realms, arbitrate,
// punish, transport, or render UI.

import SovereignCoreAPI from "./sovereign-core-api.js";

const ContinuityRootEnforcement = (() => {
  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

    return `{${Object.keys(value).sort().map((key) => {
      return `${JSON.stringify(key)}:${stableStringify(value[key])}`;
    }).join(",")}}`;
  }

  function simpleHash(input) {
    let hash = 2166136261;

    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return `continuityRoot.${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function getIdentityState(identityId) {
    const state = SovereignCoreAPI.getState();
    const identity = state.identities[identityId];

    if (!identity) {
      return {
        state,
        identity: null,
        replayStream: null,
        continuityEntry: null
      };
    }

    const replayStream = state.replayStreams[identityId] || null;

    const continuityEntry = Object.values(state.continuities)
      .find((item) => item.identity_id === identityId) || null;

    return {
      state,
      identity,
      replayStream,
      continuityEntry
    };
  }

  function computeReplayRoot(identityId, identitySeal = null) {
    const { identity, replayStream } = getIdentityState(identityId);

    if (!identity) {
      return {
        identity_id: identityId,
        valid: false,
        reason: "IDENTITY_NOT_FOUND",
        replay_root_hash: null
      };
    }

    if (!replayStream || !Array.isArray(replayStream.events) || replayStream.events.length === 0) {
      return {
        identity_id: identityId,
        valid: false,
        reason: "REPLAY_ROOT_MISSING",
        replay_root_hash: null
      };
    }

    const firstEvent = replayStream.events[0];

    const originHash = identitySeal && identitySeal.origin_hash
      ? identitySeal.origin_hash
      : simpleHash(stableStringify({
        identity_id: identity.identity_id,
        seed: identity.seed || null,
        created_at: identity.created_at
      }));

    const replayRootHash = simpleHash(stableStringify({
      origin_hash: originHash,
      first_event: firstEvent
    }));

    return clone({
      identity_id: identityId,
      valid: true,
      reason: "OK",
      origin_hash: originHash,
      replay_root_hash: replayRootHash,
      first_event_id: firstEvent.replay_event_id || null
    });
  }

  function computeContinuityRoot(identityId, identitySeal = null) {
    const { continuityEntry } = getIdentityState(identityId);
    const replayRoot = computeReplayRoot(identityId, identitySeal);

    if (!replayRoot.valid) {
      return clone({
        identity_id: identityId,
        valid: false,
        reason: replayRoot.reason,
        continuity_root_hash: null
      });
    }

    if (!continuityEntry) {
      return clone({
        identity_id: identityId,
        valid: false,
        reason: "CONTINUITY_ROOT_MISSING",
        continuity_root_hash: null
      });
    }

    const continuityRootHash = simpleHash(stableStringify({
      continuity_id: continuityEntry.continuity_id,
      replay_root_hash: replayRoot.replay_root_hash
    }));

    return clone({
      identity_id: identityId,
      valid: true,
      reason: "OK",
      replay_root_hash: replayRoot.replay_root_hash,
      continuity_id: continuityEntry.continuity_id,
      continuity_root_hash: continuityRootHash
    });
  }

  function validateContinuityRoot(identityId, identitySeal = null) {
    const { identity } = getIdentityState(identityId);

    if (!identity) {
      return {
        identity_id: identityId,
        valid: false,
        reason: "IDENTITY_NOT_FOUND",
        checked_at: now()
      };
    }

    const continuityRoot = computeContinuityRoot(identityId, identitySeal);

    if (!continuityRoot.valid) {
      const blockedStatus = {
        identity_id: identityId,
        valid: false,
        reason: continuityRoot.reason,
        checked_at: now()
      };

      SovereignCoreAPI.emitReplayEvent(identityId, "CONTINUITY_ROOT_ENFORCED", blockedStatus);
      return blockedStatus;
    }

    const expectedContinuityRoot = identitySeal && identitySeal.continuity_root_hash
      ? identitySeal.continuity_root_hash
      : continuityRoot.continuity_root_hash;

    const status = {
      identity_id: identityId,
      valid: continuityRoot.continuity_root_hash === expectedContinuityRoot,
      reason: continuityRoot.continuity_root_hash === expectedContinuityRoot
        ? "OK"
        : "CONTINUITY_ROOT_MISMATCH",
      replay_root_hash: continuityRoot.replay_root_hash,
      continuity_id: continuityRoot.continuity_id,
      continuity_root_hash: continuityRoot.continuity_root_hash,
      expected_continuity_root_hash: expectedContinuityRoot,
      checked_at: now()
    };

    SovereignCoreAPI.emitReplayEvent(identityId, "CONTINUITY_ROOT_ENFORCED", status);

    return clone(status);
  }

  return {
    computeReplayRoot,
    computeContinuityRoot,
    validateContinuityRoot
  };
})();

if (typeof window !== "undefined") {
  window.ContinuityRootEnforcement = ContinuityRootEnforcement;
}

export default ContinuityRootEnforcement;
