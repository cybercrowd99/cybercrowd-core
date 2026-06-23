// identity-sealing.js
// CyberCrowd Core — Identity Sealing
// Owns: taking an identity origin, creating an identity seal,
// and verifying that seal.
// Does not create identities, fork realms, arbitrate, enforce, punish, or render UI.

const IdentitySealing = (() => {
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

    return `seal.${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function requireOrigin(origin = {}) {
    if (!origin.identity_id) throw new Error("Identity seal requires identity_id.");
    if (!origin.created_at) throw new Error("Identity seal requires created_at.");
    if (!origin.representation_organ_id) throw new Error("Identity seal requires representation_organ_id.");
    if (!origin.continuity_id) throw new Error("Identity seal requires continuity_id.");
    if (!origin.identity_created_event) throw new Error("Identity seal requires identity_created_event.");
  }

  function createSeal(origin = {}, doctrineVersion = "core.v1") {
    requireOrigin(origin);

    const originHash = simpleHash(stableStringify({
      identity_id: origin.identity_id,
      seed: origin.seed || null,
      created_at: origin.created_at,
      representation_organ_id: origin.representation_organ_id
    }));

    const replayRootHash = simpleHash(stableStringify({
      identity_created_event: origin.identity_created_event,
      origin_hash: originHash
    }));

    const continuityRootHash = simpleHash(stableStringify({
      continuity_id: origin.continuity_id,
      replay_root_hash: replayRootHash
    }));

    return clone({
      identity_id: origin.identity_id,
      identity_seal: {
        origin_hash: originHash,
        replay_root_hash: replayRootHash,
        continuity_root_hash: continuityRootHash,
        doctrine_version: doctrineVersion,
        sealed_at: now()
      },
      status: "sealed"
    });
  }

  function verifySeal(origin = {}, sealRecord = {}) {
    requireOrigin(origin);

    if (!sealRecord.identity_seal) {
      throw new Error("Seal record requires identity_seal.");
    }

    const expected = createSeal(
      origin,
      sealRecord.identity_seal.doctrine_version || "core.v1"
    );

    const expectedSeal = expected.identity_seal;
    const actualSeal = sealRecord.identity_seal;

    return clone({
      identity_id: origin.identity_id,
      valid:
        actualSeal.origin_hash === expectedSeal.origin_hash &&
        actualSeal.replay_root_hash === expectedSeal.replay_root_hash &&
        actualSeal.continuity_root_hash === expectedSeal.continuity_root_hash,
      checked_at: now(),
      expected: {
        origin_hash: expectedSeal.origin_hash,
        replay_root_hash: expectedSeal.replay_root_hash,
        continuity_root_hash: expectedSeal.continuity_root_hash
      },
      actual: {
        origin_hash: actualSeal.origin_hash,
        replay_root_hash: actualSeal.replay_root_hash,
        continuity_root_hash: actualSeal.continuity_root_hash
      }
    });
  }

  return {
    createSeal,
    verifySeal
  };
})();

if (typeof window !== "undefined") {
  window.IdentitySealing = IdentitySealing;
}

export default IdentitySealing;
