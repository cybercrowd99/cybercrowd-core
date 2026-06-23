// sovereign-core-api.js
// CyberCrowd Sovereign Core API
// Owns: identity ignition, realm/device forks, authority chains,
// arbitration decisions, continuity validation, replay emission,
// replay hash chaining, and neutral event listener hooks.
// Engine-room contract only. Does not enforce, punish, transport, or render UI.

const SovereignCoreAPI = (() => {
  let identities = {};
  let organs = {};
  let continuities = {};
  let replayStreams = {};
  let forks = {};
  let authorityChains = {};
  let replayLinks = {};
  let rulings = [];
  let listeners = [];

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
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

    return `hash.${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function requireIdentity(identityId) {
    if (!identityId || !identities[identityId]) {
      throw new Error("Unknown sovereign identity.");
    }

    return identities[identityId];
  }

  function requireFork(forkId) {
    if (!forkId || !forks[forkId]) {
      throw new Error("Unknown sovereign fork.");
    }

    return forks[forkId];
  }

  function validateReplayType(type) {
    if (!type || typeof type !== "string") {
      throw new Error("Replay event requires a string type.");
    }
  }

  function notifyListeners(event) {
    listeners.forEach((listener) => {
      try {
        listener(clone(event));
      } catch (error) {
        console.warn("SovereignCoreAPI listener failed.", error);
      }
    });
  }

  function onReplayEvent(listener) {
    if (typeof listener !== "function") {
      throw new Error("Replay listener must be a function.");
    }

    listeners.push(listener);

    return {
      listener_count: listeners.length,
      registered_at: now()
    };
  }

  function createIdentity(seed = null) {
    const identityId = makeId("identity");

    identities[identityId] = {
      identity_id: identityId,
      seed,
      created_at: now(),
      status: "active"
    };

    openReplayStream(identityId);
    emitReplayEvent(identityId, "IDENTITY_CREATED", { seed });

    return identityId;
  }

  function bindRepresentationOrgan(identityId) {
    requireIdentity(identityId);

    const organId = makeId("organ");

    organs[organId] = {
      organ_id: organId,
      identity_id: identityId,
      type: "representation",
      created_at: now(),
      status: "bound"
    };

    emitReplayEvent(identityId, "REPRESENTATION_ORGAN_BOUND", { organId });

    return organId;
  }

  function initContinuity(identityId) {
    requireIdentity(identityId);

    const continuityId = makeId("continuity");

    continuities[continuityId] = {
      continuity_id: continuityId,
      identity_id: identityId,
      created_at: now(),
      status: "initialized"
    };

    emitReplayEvent(identityId, "CONTINUITY_INITIALIZED", { continuityId });

    return continuityId;
  }

  function openReplayStream(targetId) {
    if (!targetId) {
      throw new Error("Replay stream requires targetId.");
    }

    if (!replayStreams[targetId]) {
      replayStreams[targetId] = {
        stream_id: makeId("replayStream"),
        target_id: targetId,
        created_at: now(),
        last_hash: "genesis",
        events: []
      };
    }

    return replayStreams[targetId].stream_id;
  }

  function emitReplayEvent(targetId, type, payload = {}) {
    if (!targetId) {
      throw new Error("Replay event requires targetId.");
    }

    validateReplayType(type);
    openReplayStream(targetId);

    const stream = replayStreams[targetId];
    const previousHash = stream.last_hash;

    const eventDraft = {
      replay_event_id: makeId("replayEvent"),
      stream_id: stream.stream_id,
      target_id: targetId,
      type,
      payload,
      previous_hash: previousHash,
      timestamp: now()
    };

    const eventHash = simpleHash(stableStringify(eventDraft));

    const event = {
      ...eventDraft,
      event_hash: eventHash
    };

    stream.events.push(event);
    stream.last_hash = eventHash;

    notifyListeners(event);

    return clone(event);
  }

  function forkRealm(identityId, forkType, metadata = {}) {
    requireIdentity(identityId);

    if (!forkType) {
      throw new Error("forkType is required.");
    }

    const forkId = makeId("fork");

    forks[forkId] = {
      fork_id: forkId,
      identity_id: identityId,
      parent_id: identityId,
      fork_type: forkType,
      metadata,
      created_at: now(),
      status: "active"
    };

    openReplayStream(forkId);
    linkForkToReplay(forkId, identityId);
    emitReplayEvent(forkId, "FORK_CREATED", { identityId, forkType, metadata });

    return forkId;
  }

  function registerDevice(identityId, deviceId, traits = {}) {
    requireIdentity(identityId);

    if (!deviceId) {
      throw new Error("deviceId is required.");
    }

    const forkId = forkRealm(identityId, "device", {
      device_id: deviceId,
      traits
    });

    emitReplayEvent(forkId, "DEVICE_REGISTERED", {
      identityId,
      deviceId,
      traits
    });

    return forkId;
  }

  function createAuthorityChain(parentId, childId, scope = {}) {
    if (!parentId) throw new Error("parentId is required.");
    if (!childId) throw new Error("childId is required.");

    const chainId = makeId("authorityChain");

    authorityChains[chainId] = {
      chain_id: chainId,
      parent_id: parentId,
      child_id: childId,
      scope,
      created_at: now(),
      status: "active"
    };

    emitReplayEvent(childId, "AUTHORITY_CHAIN_CREATED", {
      chainId,
      parentId,
      childId,
      scope
    });

    return chainId;
  }

  function linkForkToReplay(forkId, parentForkId) {
    requireFork(forkId);

    if (!parentForkId) {
      throw new Error("parentForkId is required.");
    }

    const linkId = makeId("replayLink");

    replayLinks[linkId] = {
      link_id: linkId,
      fork_id: forkId,
      parent_fork_id: parentForkId,
      created_at: now(),
      status: "linked"
    };

    return linkId;
  }

  function resolveConflict(subjectA, subjectB, context = {}) {
    const ruling = {
      ruling_id: makeId("ruling"),
      ruling_type: "conflict_resolution",
      subject_a: subjectA,
      subject_b: subjectB,
      context,
      decision: "needs_doctrine",
      created_at: now()
    };

    rulings.push(ruling);
    emitReplayEvent(ruling.ruling_id, "ARBITRATION_DECISION", ruling);

    return clone(ruling);
  }

  function applyDoctrine(ruleSetId, context = {}) {
    if (!ruleSetId) {
      throw new Error("ruleSetId is required.");
    }

    const decision = {
      decision_id: makeId("decision"),
      rule_set_id: ruleSetId,
      context,
      outcome: "doctrine_applied",
      created_at: now()
    };

    emitReplayEvent(decision.decision_id, "DOCTRINE_APPLIED", decision);

    return clone(decision);
  }

  function validateContinuity(targetId) {
    if (!targetId) {
      throw new Error("targetId is required.");
    }

    const hasIdentity = Boolean(identities[targetId]);
    const hasFork = Boolean(forks[targetId]);
    const hasReplay = Boolean(replayStreams[targetId]);

    const status = {
      target_id: targetId,
      identity_exists: hasIdentity,
      fork_exists: hasFork,
      replay_exists: hasReplay,
      valid: (hasIdentity || hasFork) && hasReplay,
      checked_at: now()
    };

    emitReplayEvent(targetId, "CONTINUITY_VALIDATED", status);

    return clone(status);
  }

  function issueRuling(targetId, rulingType, payload = {}) {
    if (!targetId) throw new Error("targetId is required.");
    if (!rulingType) throw new Error("rulingType is required.");

    const ruling = {
      ruling_id: makeId("ruling"),
      target_id: targetId,
      ruling_type: rulingType,
      payload,
      created_at: now(),
      status: "issued"
    };

    rulings.push(ruling);
    emitReplayEvent(targetId, "ARBITRATION_DECISION", ruling);

    return ruling.ruling_id;
  }

  function verifyReplayStream(targetId) {
    const stream = replayStreams[targetId];

    if (!stream) {
      return {
        target_id: targetId,
        valid: false,
        reason: "missing_replay_stream"
      };
    }

    let previousHash = "genesis";

    for (const event of stream.events) {
      const { event_hash, ...eventWithoutHash } = event;
      const expectedHash = simpleHash(stableStringify(eventWithoutHash));

      if (event.previous_hash !== previousHash) {
        return {
          target_id: targetId,
          valid: false,
          reason: "previous_hash_mismatch",
          event
        };
      }

      if (event_hash !== expectedHash) {
        return {
          target_id: targetId,
          valid: false,
          reason: "event_hash_mismatch",
          event
        };
      }

      previousHash = event_hash;
    }

    return {
      target_id: targetId,
      valid: true,
      event_count: stream.events.length,
      last_hash: stream.last_hash,
      checked_at: now()
    };
  }

  function getState() {
    return clone({
      identities,
      organs,
      continuities,
      replayStreams,
      forks,
      authorityChains,
      replayLinks,
      rulings
    });
  }

  function reset(reason = "manual_reset") {
    identities = {};
    organs = {};
    continuities = {};
    replayStreams = {};
    forks = {};
    authorityChains = {};
    replayLinks = {};
    rulings = [];
    listeners = [];

    return {
      reset: true,
      reason,
      timestamp: now()
    };
  }

  return {
    createIdentity,
    bindRepresentationOrgan,
    initContinuity,
    openReplayStream,
    emitReplayEvent,
    onReplayEvent,
    forkRealm,
    registerDevice,
    createAuthorityChain,
    linkForkToReplay,
    resolveConflict,
    applyDoctrine,
    validateContinuity,
    issueRuling,
    verifyReplayStream,
    getState,
    reset
  };
})();

if (typeof window !== "undefined") {
  window.SovereignCoreAPI = SovereignCoreAPI;
}

export default SovereignCoreAPI;
