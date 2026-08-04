// origin-replay-lock.js
// CyberCrowd Core — Origin Replay Lock
// Owns: locking the first replay event so identity origin history
// becomes non-editable, non-deletable, and continuity-verifiable.
// Does not create identities, seal identities, fork realms, arbitrate, enforce, punish, or render UI.

const OriginReplayLock = (() => {
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

    return `originLock.${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function requireOriginEvent(originEvent = {}) {
    if (!originEvent.replay_event_id) throw new Error("Origin replay lock requires replay_event_id.");
    if (!originEvent.target_id) throw new Error("Origin replay lock requires target_id.");
    if (!originEvent.type) throw new Error("Origin replay lock requires event type.");
    if (!originEvent.timestamp) throw new Error("Origin replay lock requires timestamp.");

    if (originEvent.type !== "IDENTITY_CREATED") {
      throw new Error("Origin replay lock can only lock IDENTITY_CREATED events.");
    }
  }

  function lockOriginReplay(originEvent = {}, identitySeal = {}) {
    requireOriginEvent(originEvent);

    if (!identitySeal.origin_hash) {
      throw new Error("Origin replay lock requires identity seal origin_hash.");
    }

    if (!identitySeal.replay_root_hash) {
      throw new Error("Origin replay lock requires identity seal replay_root_hash.");
    }

    const lockHash = simpleHash(stableStringify({
      origin_event: originEvent,
      origin_hash: identitySeal.origin_hash,
      replay_root_hash: identitySeal.replay_root_hash
    }));

    return clone({
      target_id: originEvent.target_id,
      origin_replay_lock: {
        replay_event_id: originEvent.replay_event_id,
        event_type: originEvent.type,
        origin_hash: identitySeal.origin_hash,
        replay_root_hash: identitySeal.replay_root_hash,
        lock_hash: lockHash,
        locked_at: now(),
        locked: true
      },
      status: "origin_replay_locked"
    });
  }

  function verifyOriginReplayLock(originEvent = {}, identitySeal = {}, lockRecord = {}) {
    requireOriginEvent(originEvent);

    if (!lockRecord.origin_replay_lock) {
      throw new Error("Lock record requires origin_replay_lock.");
    }

    const expected = lockOriginReplay(originEvent, identitySeal);
    const expectedLock = expected.origin_replay_lock;
    const actualLock = lockRecord.origin_replay_lock;

    return clone({
      target_id: originEvent.target_id,
      valid:
        actualLock.replay_event_id === expectedLock.replay_event_id &&
        actualLock.event_type === expectedLock.event_type &&
        actualLock.origin_hash === expectedLock.origin_hash &&
        actualLock.replay_root_hash === expectedLock.replay_root_hash &&
        actualLock.lock_hash === expectedLock.lock_hash,
      checked_at: now(),
      expected: {
        replay_event_id: expectedLock.replay_event_id,
        event_type: expectedLock.event_type,
        origin_hash: expectedLock.origin_hash,
        replay_root_hash: expectedLock.replay_root_hash,
        lock_hash: expectedLock.lock_hash
      },
      actual: {
        replay_event_id: actualLock.replay_event_id,
        event_type: actualLock.event_type,
        origin_hash: actualLock.origin_hash,
        replay_root_hash: actualLock.replay_root_hash,
        lock_hash: actualLock.lock_hash
      }
    });
  }

  return {
    lockOriginReplay,
    verifyOriginReplayLock
  };
})();

if (typeof window !== "undefined") {
  window.OriginReplayLock = OriginReplayLock;
}

export default OriginReplayLock;
