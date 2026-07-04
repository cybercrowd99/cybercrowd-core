// c-s-i-and-g-pressure-ledger.js
// CyberCrowd — Pressure Ledger
//
// Owns:
// - recording lane pressure events
// - tracking pressure by lane
// - detecting over-compression
// - detecting under-classification
// - detecting lane tilt
// - producing pressure reports for Core / Intake / 000
//
// Does NOT own:
// - authority execution
// - Dewey final classification
// - identity creation
// - payment
// - sessions
// - cookies
// - KV storage
// - external APIs
// - scraping
// - UI

const CyberCrowdPressureLedger = (() => {
  const state = {
    events: [],
    lanes: Object.create(null),
    holds: [],
    reports: []
  };

  const DEFAULT_LIMITS = {
    tiltGap: 3,
    overCompressionLimit: 1,
    underClassificationLimit: 1
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

  function ensureLane(laneId) {
    const cleanLane = String(laneId || "000_future_sci_fi_unclassified");

    if (!state.lanes[cleanLane]) {
      state.lanes[cleanLane] = {
        lane: cleanLane,
        pressure: 0,
        events: [],
        last_updated: null
      };
    }

    return state.lanes[cleanLane];
  }

  function normalizeLanes(lanes) {
    if (!lanes) {
      return ["000_future_sci_fi_unclassified"];
    }

    if (Array.isArray(lanes)) {
      return lanes.length > 0
        ? lanes.map((lane) => String(lane))
        : ["000_future_sci_fi_unclassified"];
    }

    return [String(lanes)];
  }

  function recordPressure(input = {}) {
    const lanes = normalizeLanes(input.lanes || input.lane);
    const amount = Number.isFinite(input.amount) ? input.amount : 1;

    const event = {
      id: makeId("pressure"),
      recorded_at: now(),
      source: input.source || "unknown_source",
      reason: input.reason || "PRESSURE_RECORDED",
      lanes,
      amount,
      signal_id: input.signal_id || null,
      authority_allowed: false,
      meta: clone(input.meta || {}),
      status: "pressure_recorded"
    };

    state.events.push(event);

    lanes.forEach((laneId) => {
      const lane = ensureLane(laneId);
      lane.pressure += amount;
      lane.events.push(event.id);
      lane.last_updated = event.recorded_at;
    });

    return event;
  }

  function hold(target, reason) {
    const record = {
      id: makeId("pressureHold"),
      held_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      status: "held_by_pressure_ledger"
    };

    state.holds.push(record);
    return record;
  }

  function getLanePressure(laneId) {
    const lane = ensureLane(laneId);
    return lane.pressure;
  }

  function getAllPressure() {
    const out = Object.create(null);

    Object.keys(state.lanes).forEach((laneId) => {
      out[laneId] = state.lanes[laneId].pressure;
    });

    return out;
  }

  function detectTilt(lanes, options = {}) {
    const limits = {
      ...DEFAULT_LIMITS,
      ...options
    };

    const cleanLanes = normalizeLanes(lanes);
    const pressures = cleanLanes.map((laneId) => getLanePressure(laneId));

    const maxPressure = Math.max(...pressures);
    const minPressure = Math.min(...pressures);
    const gap = maxPressure - minPressure;

    const report = {
      id: makeId("tiltReport"),
      checked_at: now(),
      lanes: cleanLanes,
      pressures,
      max_pressure: maxPressure,
      min_pressure: minPressure,
      gap,
      tilted: gap > limits.tiltGap,
      reason: gap > limits.tiltGap ? "LANE_PRESSURE_TILT" : "NO_TILT",
      authority_allowed: false,
      status: "tilt_checked"
    };

    state.reports.push(report);

    if (report.tilted) {
      hold(report, "LANE_PRESSURE_TILT");
    }

    return report;
  }

  function detectOverCompression(input = {}) {
    const rawSignal = input.signal;
    const lanes = normalizeLanes(input.lanes);
    const attrs = input.attrs || {};

    const signalText = typeof rawSignal === "string"
      ? rawSignal
      : JSON.stringify(rawSignal || {});

    const signalSize = signalText.trim().length;
    const laneCount = lanes.length;
    const attrCount = Object.keys(attrs).filter((key) => {
      return attrs[key] && attrs[key] !== 0 && attrs[key] !== false;
    }).length;

    const compressed =
      signalSize > 120 &&
      laneCount <= DEFAULT_LIMITS.overCompressionLimit;

    const report = {
      id: makeId("compressionReport"),
      checked_at: now(),
      signal_size: signalSize,
      lane_count: laneCount,
      attr_count: attrCount,
      lanes,
      over_compressed: compressed,
      reason: compressed ? "POSSIBLE_OVER_COMPRESSION" : "NO_OVER_COMPRESSION",
      authority_allowed: false,
      status: "compression_checked"
    };

    state.reports.push(report);

    if (compressed) {
      hold(
        {
          signal: rawSignal,
          lanes,
          attrs,
          report
        },
        "POSSIBLE_OVER_COMPRESSION"
      );
    }

    return report;
  }

  function detectUnderClassification(input = {}) {
    const lanes = normalizeLanes(input.lanes);
    const attrs = input.attrs || {};

    const pressureKeys = [
      "identity_pressure",
      "evidence_pressure",
      "movement_pressure",
      "authority_pressure",
      "unknown_pressure",
      "text_pressure"
    ];

    const activePressureCount = pressureKeys.filter((key) => {
      return Number(attrs[key] || 0) > 0;
    }).length;

    const underClassified =
      activePressureCount > lanes.length &&
      lanes.length <= DEFAULT_LIMITS.underClassificationLimit;

    const report = {
      id: makeId("classificationReport"),
      checked_at: now(),
      lanes,
      active_pressure_count: activePressureCount,
      lane_count: lanes.length,
      under_classified: underClassified,
      reason: underClassified ? "POSSIBLE_UNDER_CLASSIFICATION" : "NO_UNDER_CLASSIFICATION",
      authority_allowed: false,
      status: "classification_checked"
    };

    state.reports.push(report);

    if (underClassified) {
      hold(
        {
          lanes,
          attrs,
          report
        },
        "POSSIBLE_UNDER_CLASSIFICATION"
      );
    }

    return report;
  }

  function inspectSignal(input = {}) {
    const pressureEvent = recordPressure({
      source: input.source || "pressure_ledger_inspection",
      reason: input.reason || "SIGNAL_INSPECTION_PRESSURE",
      lanes: input.lanes,
      amount: input.amount || 1,
      signal_id: input.signal_id || null,
      meta: {
        attrs: input.attrs || null
      }
    });

    const compression = detectOverCompression({
      signal: input.signal,
      lanes: input.lanes,
      attrs: input.attrs
    });

    const classification = detectUnderClassification({
      lanes: input.lanes,
      attrs: input.attrs
    });

    const tilt = detectTilt(input.lanes);

    return {
      id: makeId("pressureInspection"),
      inspected_at: now(),
      pressure_event: pressureEvent,
      compression,
      classification,
      tilt,
      authority_allowed: false,
      status: "pressure_inspection_complete"
    };
  }

  function shouldHold(report) {
    if (!report || typeof report !== "object") {
      return true;
    }

    return Boolean(
      report.tilted ||
      report.over_compressed ||
      report.under_classified
    );
  }

  function getState() {
    return clone(state);
  }

  return {
    recordPressure,
    inspectSignal,
    detectTilt,
    detectOverCompression,
    detectUnderClassification,
    getLanePressure,
    getAllPressure,
    shouldHold,
    hold,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdPressureLedger;
}
