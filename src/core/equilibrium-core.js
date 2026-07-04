// src/core/equilibrium-core.js
// CyberCrowd Core — Equilibrium Signal Rule
//
// Owns:
// - preserving incoming signals
// - analyzing attributes
// - routing known signals into lanes
// - routing unknown / future / unclassified signals into 000
// - tracking lane pressure
// - checking tilt
// - allowing authority only after equilibrium
//
// Does NOT own:
// - UI
// - Dewey final classification
// - identity creation
// - public authority
// - private identity exposure
// - payment
// - session cookies
// - KV storage
// - scraping
// - external API calls

const CyberCrowdEquilibriumCore = (() => {
  const LANE_000 = "000_future_sci_fi_unclassified";

  const state = {
    preserved: [],
    routed: [],
    held: [],
    executed: [],
    lanePressure: Object.create(null)
  };

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function preserve(signal) {
    const record = {
      id: makeId("signal"),
      received_at: now(),
      signal: clone(signal),
      status: "preserved"
    };

    state.preserved.push(record);
    return record;
  }

  function analyze(signal) {
    const attrs = {
      has_signal: signal !== null && signal !== undefined,
      type: typeof signal,
      keys: [],
      text_pressure: 0,
      evidence_pressure: 0,
      identity_pressure: 0,
      movement_pressure: 0,
      authority_pressure: 0,
      unknown_pressure: 0
    };

    if (signal && typeof signal === "object") {
      attrs.keys = Object.keys(signal);

      const text = JSON.stringify(signal).toLowerCase();

      if (text.includes("identity") || text.includes("private") || text.includes("public id")) {
        attrs.identity_pressure += 1;
      }

      if (text.includes("proof") || text.includes("evidence") || text.includes("receipt") || text.includes("witness")) {
        attrs.evidence_pressure += 1;
      }

      if (text.includes("move") || text.includes("route") || text.includes("send") || text.includes("ship")) {
        attrs.movement_pressure += 1;
      }

      if (text.includes("approve") || text.includes("execute") || text.includes("authority") || text.includes("allow")) {
        attrs.authority_pressure += 1;
      }

      if (text.includes("future") || text.includes("sci-fi") || text.includes("unknown") || text.includes("impossible")) {
        attrs.unknown_pressure += 1;
      }
    }

    if (typeof signal === "string") {
      const text = signal.toLowerCase();

      attrs.text_pressure = signal.trim().length > 0 ? 1 : 0;

      if (text.includes("identity") || text.includes("private") || text.includes("public id")) {
        attrs.identity_pressure += 1;
      }

      if (text.includes("proof") || text.includes("evidence") || text.includes("receipt") || text.includes("witness")) {
        attrs.evidence_pressure += 1;
      }

      if (text.includes("move") || text.includes("route") || text.includes("send") || text.includes("ship")) {
        attrs.movement_pressure += 1;
      }

      if (text.includes("approve") || text.includes("execute") || text.includes("authority") || text.includes("allow")) {
        attrs.authority_pressure += 1;
      }

      if (text.includes("future") || text.includes("sci-fi") || text.includes("unknown") || text.includes("impossible")) {
        attrs.unknown_pressure += 1;
      }
    }

    return attrs;
  }

  function classify(attrs) {
    const lanes = [];

    if (!attrs || !attrs.has_signal) {
      return lanes;
    }

    if (attrs.identity_pressure > 0) {
      lanes.push("identity_lane");
    }

    if (attrs.evidence_pressure > 0) {
      lanes.push("evidence_lane");
    }

    if (attrs.movement_pressure > 0) {
      lanes.push("movement_lane");
    }

    if (attrs.authority_pressure > 0) {
      lanes.push("authority_review_lane");
    }

    if (attrs.unknown_pressure > 0) {
      lanes.push(LANE_000);
    }

    return lanes;
  }

  function route(record, lanes) {
    const routeRecord = {
      id: makeId("route"),
      signal_id: record.id,
      routed_at: now(),
      lanes: clone(lanes),
      status: "routed"
    };

    state.routed.push(routeRecord);
    return routeRecord;
  }

  function hold(target, reason) {
    const holdRecord = {
      id: makeId("hold"),
      held_at: now(),
      reason,
      target: clone(target),
      status: "held"
    };

    state.held.push(holdRecord);
    return holdRecord;
  }

  function updatePressure(lanes) {
    lanes.forEach((lane) => {
      if (!state.lanePressure[lane]) {
        state.lanePressure[lane] = 0;
      }

      state.lanePressure[lane] += 1;
    });

    return clone(state.lanePressure);
  }

  function checkTilt(lanes) {
    const tilt = {
      tilted: false,
      reason: null,
      lanes: clone(lanes)
    };

    const pressureValues = lanes.map((lane) => state.lanePressure[lane] || 0);

    if (pressureValues.length === 0) {
      tilt.tilted = true;
      tilt.reason = "NO_LANE_PRESSURE_FOUND";
      return tilt;
    }

    const maxPressure = Math.max(...pressureValues);
    const minPressure = Math.min(...pressureValues);

    if (maxPressure - minPressure > 3) {
      tilt.tilted = true;
      tilt.reason = "LANE_PRESSURE_IMBALANCE";
      return tilt;
    }

    return tilt;
  }

  function canFormAuthorityBundle(lanes) {
    if (!Array.isArray(lanes)) {
      return false;
    }

    if (lanes.includes(LANE_000)) {
      return false;
    }

    return (
      lanes.includes("identity_lane") &&
      lanes.includes("evidence_lane") &&
      lanes.includes("movement_lane") &&
      lanes.includes("authority_review_lane")
    );
  }

  function buildBundle(record, attrs, lanes) {
    return {
      id: makeId("authorityBundle"),
      built_at: now(),
      signal_id: record.id,
      attrs: clone(attrs),
      lanes: clone(lanes),
      status: "bundle_built"
    };
  }

  function isEquilibrium(bundle) {
    if (!bundle || !Array.isArray(bundle.lanes)) {
      return false;
    }

    if (bundle.lanes.includes(LANE_000)) {
      return false;
    }

    const required = [
      "identity_lane",
      "evidence_lane",
      "movement_lane",
      "authority_review_lane"
    ];

    const hasRequiredLanes = required.every((lane) => bundle.lanes.includes(lane));

    if (!hasRequiredLanes) {
      return false;
    }

    const pressure = bundle.attrs;

    const hasIdentity = pressure.identity_pressure > 0;
    const hasEvidence = pressure.evidence_pressure > 0;
    const hasMovement = pressure.movement_pressure > 0;
    const hasAuthorityReview = pressure.authority_pressure > 0;

    return hasIdentity && hasEvidence && hasMovement && hasAuthorityReview;
  }

  function executeAuthority(bundle) {
    const execution = {
      id: makeId("authorityExecution"),
      executed_at: now(),
      bundle: clone(bundle),
      status: "authority_ready"
    };

    state.executed.push(execution);
    return execution;
  }

  function onSignal(signal) {
    const record = preserve(signal);

    const attrs = analyze(signal);
    const lanes = classify(attrs);

    if (lanes.length === 0) {
      route(record, [LANE_000]);
      updatePressure([LANE_000]);

      return hold(record, "UNCLASSIFIED_SIGNAL_ROUTED_TO_000");
    }

    route(record, lanes);
    updatePressure(lanes);

    const tilt = checkTilt(lanes);

    if (tilt.tilted) {
      return hold(
        {
          record,
          attrs,
          lanes,
          tilt
        },
        tilt.reason
      );
    }

    if (!canFormAuthorityBundle(lanes)) {
      return hold(
        {
          record,
          attrs,
          lanes
        },
        "NOT_READY_FOR_AUTHORITY_BUNDLE"
      );
    }

    const bundle = buildBundle(record, attrs, lanes);

    if (!isEquilibrium(bundle)) {
      route(record, [LANE_000]);

      return hold(
        {
          record,
          attrs,
          lanes,
          bundle
        },
        "FAILED_EQUILIBRIUM_CHECK"
      );
    }

    return executeAuthority(bundle);
  }

  function getState() {
    return clone(state);
  }

  return {
    LANE_000,
    onSignal,
    preserve,
    analyze,
    classify,
    route,
    updatePressure,
    checkTilt,
    canFormAuthorityBundle,
    buildBundle,
    isEquilibrium,
    executeAuthority,
    hold,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdEquilibriumCore;
}
