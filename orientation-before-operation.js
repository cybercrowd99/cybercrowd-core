// orientation-before-operation.js
// CyberCrowd Core — Orientation Before Operation
// Owns: checking whether the current model orientation matches incoming reality
// before allowing an operation to continue.
// Prevents stale-state drift, wrong-board operation, and double-mirror lock.
// Does not create identities, arbitrate, punish, enforce, or render UI.

import SovereignCoreAPI from "./sovereign-core-api.js";

const OrientationBeforeOperation = (() => {
  let orientations = {};
  let checks = [];

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function requireTarget(targetId) {
    if (!targetId) {
      throw new Error("TARGET_ID_REQUIRED");
    }
  }

  function setOrientation(targetId, orientation = {}) {
    requireTarget(targetId);

    const record = {
      orientation_id: makeId("orientation"),
      target_id: targetId,
      orientation,
      established_at: now(),
      updated_at: now(),
      status: "oriented"
    };

    orientations[targetId] = record;

    SovereignCoreAPI.emitReplayEvent(targetId, "ORIENTATION_ESTABLISHED", record);

    return clone(record);
  }

  function getOrientation(targetId) {
    requireTarget(targetId);
    return clone(orientations[targetId] || null);
  }

  function compareOrientation(expected = {}, observed = {}) {
    const expectedKeys = Object.keys(expected);

    const mismatches = expectedKeys.filter((key) => {
      return JSON.stringify(expected[key]) !== JSON.stringify(observed[key]);
    });

    return {
      matched: mismatches.length === 0,
      mismatches
    };
  }

  function checkBeforeOperation(targetId, operationType, observedOrientation = {}) {
    requireTarget(targetId);

    if (!operationType) {
      throw new Error("OPERATION_TYPE_REQUIRED");
    }

    const current = orientations[targetId];

    if (!current) {
      const check = {
        check_id: makeId("orientationCheck"),
        target_id: targetId,
        operation_type: operationType,
        allowed: false,
        reason: "ORIENTATION_NOT_ESTABLISHED",
        observed_orientation: observedOrientation,
        checked_at: now()
      };

      checks.push(check);
      SovereignCoreAPI.emitReplayEvent(targetId, "ORIENTATION_CHECK_FAILED", check);
      return clone(check);
    }

    const comparison = compareOrientation(current.orientation, observedOrientation);

    const check = {
      check_id: makeId("orientationCheck"),
      target_id: targetId,
      operation_type: operationType,
      allowed: comparison.matched,
      reason: comparison.matched ? "OK" : "ORIENTATION_MISMATCH",
      expected_orientation: current.orientation,
      observed_orientation: observedOrientation,
      mismatches: comparison.mismatches,
      checked_at: now()
    };

    checks.push(check);

    SovereignCoreAPI.emitReplayEvent(
      targetId,
      comparison.matched ? "ORIENTATION_CHECK_PASSED" : "ORIENTATION_CHECK_FAILED",
      check
    );

    return clone(check);
  }

  function touchReality(targetId, realityTouchpoint = {}) {
    requireTarget(targetId);

    const touch = {
      touch_id: makeId("realityTouch"),
      target_id: targetId,
      reality_touchpoint: realityTouchpoint,
      touched_at: now()
    };

    SovereignCoreAPI.emitReplayEvent(targetId, "REALITY_TOUCHPOINT_RECORDED", touch);

    return clone(touch);
  }

  function resetOrientation(targetId, newOrientation = {}, reason = "manual_reorientation") {
    requireTarget(targetId);

    const previous = orientations[targetId] || null;

    const record = {
      orientation_id: makeId("orientation"),
      target_id: targetId,
      previous_orientation: previous ? previous.orientation : null,
      orientation: newOrientation,
      reason,
      established_at: now(),
      updated_at: now(),
      status: "reoriented"
    };

    orientations[targetId] = record;

    SovereignCoreAPI.emitReplayEvent(targetId, "ORIENTATION_RESET", record);

    return clone(record);
  }

  function detectDoubleMirror(targetId, signals = {}) {
    requireTarget(targetId);

    const symptoms = [];

    if (signals.repeated_reconstruction === true) {
      symptoms.push("REPEATED_RECONSTRUCTION");
    }

    if (signals.stale_state_used === true) {
      symptoms.push("STALE_STATE_USED");
    }

    if (signals.operation_before_orientation === true) {
      symptoms.push("OPERATION_BEFORE_ORIENTATION");
    }

    if (signals.model_referencing_model === true) {
      symptoms.push("MODEL_REFERENCING_MODEL");
    }

    const status = {
      target_id: targetId,
      double_mirror_detected: symptoms.length > 0,
      symptoms,
      checked_at: now()
    };

    SovereignCoreAPI.emitReplayEvent(targetId, "DOUBLE_MIRROR_CHECK", status);

    return clone(status);
  }

  function getChecks(targetId = null) {
    if (!targetId) {
      return clone(checks);
    }

    return clone(checks.filter((check) => check.target_id === targetId));
  }

  function reset(reason = "manual_reset") {
    orientations = {};
    checks = [];

    return {
      reset: true,
      reason,
      timestamp: now()
    };
  }

  return {
    setOrientation,
    getOrientation,
    checkBeforeOperation,
    touchReality,
    resetOrientation,
    detectDoubleMirror,
    getChecks,
    reset
  };
})();

if (typeof window !== "undefined") {
  window.OrientationBeforeOperation = OrientationBeforeOperation;
}

export default OrientationBeforeOperation;
