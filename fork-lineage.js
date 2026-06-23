// fork-lineage.js
// CyberCrowd Core — Fork Lineage
// Owns: computing and validating fork lineage from SovereignCoreAPI state.
// No sealing, no doctrine, no arbitration, no enforcement punishment, no UI.

import SovereignCoreAPI from "./sovereign-core-api.js";

const ForkLineage = (() => {
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

    return `forkLineage.${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function getStateParts(forkId) {
    const state = SovereignCoreAPI.getState();
    const fork = state.forks[forkId] || null;

    return {
      state,
      fork
    };
  }

  function computeForkLineage(forkId) {
    const { fork } = getStateParts(forkId);

    if (!fork) {
      return {
        fork_id: forkId,
        lineage_hash: null,
        valid: false,
        reason: "FORK_NOT_FOUND"
      };
    }

    const payload = {
      fork_id: fork.fork_id,
      identity_id: fork.identity_id,
      parent_id: fork.parent_id,
      fork_type: fork.fork_type,
      metadata: fork.metadata || {},
      created_at: fork.created_at
    };

    return clone({
      fork_id: forkId,
      identity_id: fork.identity_id,
      parent_id: fork.parent_id,
      fork_type: fork.fork_type,
      lineage_hash: simpleHash(stableStringify(payload)),
      valid: true,
      reason: "OK"
    });
  }

  function parentExists(state, parentId) {
    return Boolean(state.identities[parentId] || state.forks[parentId]);
  }

  function validateForkLineage(forkId) {
    const { state, fork } = getStateParts(forkId);
    const lineage = computeForkLineage(forkId);

    if (!lineage.valid) {
      return lineage;
    }

    if (!fork) {
      return {
        fork_id: forkId,
        valid: false,
        reason: "FORK_NOT_FOUND"
      };
    }

    if (!fork.parent_id) {
      return {
        fork_id: forkId,
        valid: false,
        reason: "PARENT_REQUIRED"
      };
    }

    if (!parentExists(state, fork.parent_id)) {
      return {
        fork_id: forkId,
        valid: false,
        reason: "PARENT_NOT_FOUND"
      };
    }

    const status = {
      fork_id: forkId,
      identity_id: fork.identity_id,
      parent_id: fork.parent_id,
      lineage_hash: lineage.lineage_hash,
      valid: true,
      reason: "OK",
      checked_at: now()
    };

    SovereignCoreAPI.emitReplayEvent(forkId, "FORK_LINEAGE_VALIDATED", status);

    return clone(status);
  }

  function computeIdentityLineage(identityId) {
    const state = SovereignCoreAPI.getState();

    if (!state.identities[identityId]) {
      return {
        identity_id: identityId,
        valid: false,
        reason: "IDENTITY_NOT_FOUND",
        forks: [],
        chain_hash: null
      };
    }

    const identityForks = Object.values(state.forks)
      .filter((fork) => fork.identity_id === identityId)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

    const lineage = identityForks.map((fork) => computeForkLineage(fork.fork_id));

    const chainHash = simpleHash(stableStringify({
      identity_id: identityId,
      fork_lineage: lineage
    }));

    return clone({
      identity_id: identityId,
      valid: lineage.every((item) => item.valid),
      reason: lineage.every((item) => item.valid) ? "OK" : "INVALID_FORK_IN_CHAIN",
      forks: lineage,
      chain_hash: chainHash,
      computed_at: now()
    });
  }

  function validateIdentityLineage(identityId) {
    const state = SovereignCoreAPI.getState();

    if (!state.identities[identityId]) {
      return {
        identity_id: identityId,
        valid: false,
        reason: "IDENTITY_NOT_FOUND",
        checked_at: now()
      };
    }

    const identityForks = Object.values(state.forks)
      .filter((fork) => fork.identity_id === identityId);

    const forkStatuses = identityForks.map((fork) => validateForkLineage(fork.fork_id));
    const allValid = forkStatuses.every((status) => status.valid);

    const chain = computeIdentityLineage(identityId);

    const status = {
      identity_id: identityId,
      chain_hash: chain.chain_hash,
      fork_count: forkStatuses.length,
      valid: allValid,
      reason: allValid ? "OK" : "INVALID_FORK_IN_CHAIN",
      checked_at: now()
    };

    SovereignCoreAPI.emitReplayEvent(identityId, "IDENTITY_LINEAGE_VALIDATED", status);

    return clone(status);
  }

  return {
    computeForkLineage,
    computeIdentityLineage,
    validateForkLineage,
    validateIdentityLineage
  };
})();

if (typeof window !== "undefined") {
  window.ForkLineage = ForkLineage;
}

export default ForkLineage;
