// c-s-i-and-g-equilibrium-bundle.js
// CyberCrowd — Equilibrium Authority Bundle
// 
// Owns:
// - forming authority-ready bundles only after lane balance
// - requiring identity, evidence, movement, and authority review lanes
// - refusing 000 as an authority source
// - checking pressure reports before authority can be marked ready
// - holding bundles that are tilted, under-classified, or over-compressed
//
// Does NOT own:
// - raw signal intake
// - Dewey final classification
// - identity creation
// - payment
// - sessions
// - cookies
// - KV storage
// - external APIs
// - scraping
// - UI
// - actual authority execution

const CyberCrowdEquilibriumBundle = (() => {
  const LANE_000 = "000_future_sci_fi_unclassified";

  const REQUIRED_LANES = [
    "identity_lane",
    "evidence_lane",
    "movement_lane",
    "authority_review_lane"
  ];

  const state = {
    bundles: [],
    ready: [],
    held: [],
    rejected: []
  };

  let PressureLedger = null;

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function safeRequire(path) {
    if (typeof require === "undefined") {
      return null;
    }

    try {
      return require(path);
    } catch (error) {
      return null;
    }
  }

  function configure(deps = {}) {
    PressureLedger =
      deps.PressureLedger ||
      deps.pressureLedger ||
      PressureLedger ||
      safeRequire("./c-s-i-and-g-pressure-ledger.js") ||
      null;

    return {
      configured: Boolean(PressureLedger),
      has_pressure_ledger: Boolean(PressureLedger)
    };
  }

  function normalizeLanes(lanes) {
    if (!lanes) {
      return [];
    }

    if (Array.isArray(lanes)) {
      return lanes.map((lane) => String(lane));
    }

    return [String(lanes)];
  }

  function hasRequiredLanes(lanes) {
    const cleanLanes = normalizeLanes(lanes);
    return REQUIRED_LANES.every((lane) => cleanLanes.includes(lane));
  }

  function has000(lanes) {
    return normalizeLanes(lanes).includes(LANE_000);
  }

  function hold(target, reason) {
    const record = {
      id: makeId("bundleHold"),
      held_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      status: "held_by_equilibrium_bundle"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("bundleReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      status: "rejected_by_equilibrium_bundle"
    };

    state.rejected.push(record);
    return record;
  }

  function inspectPressure(input = {}) {
    configure();

    if (!PressureLedger || typeof PressureLedger.inspectSignal !== "function") {
      return {
        available: false,
        reason: "PRESSURE_LEDGER_NOT_AVAILABLE",
        authority_allowed: false
      };
    }

    return {
      available: true,
      report: PressureLedger.inspectSignal({
        source: "equilibrium_bundle",
        reason: "BUNDLE_PRESSURE_INSPECTION",
        signal: input.signal,
        signal_id: input.signal_id || null,
        lanes: input.lanes,
        attrs: input.attrs || {},
        amount: input.amount || 1
      })
    };
  }

  function pressureBlocksAuthority(pressureInspection) {
    if (!pressureInspection || !pressureInspection.available) {
      return true;
    }

    const report = pressureInspection.report;

    if (!report || typeof report !== "object") {
      return true;
    }

    return Boolean(
      report.compression && report.compression.over_compressed ||
      report.classification && report.classification.under_classified ||
      report.tilt && report.tilt.tilted
    );
  }

  function build(input = {}) {
    const lanes = normalizeLanes(input.lanes);

    const bundle = {
      id: makeId("equilibriumBundle"),
      built_at: now(),
      source: input.source || "unknown_source",
      signal_id: input.signal_id || null,
      signal: clone(input.signal || null),
      attrs: clone(input.attrs || {}),
      lanes,
      required_lanes: clone(REQUIRED_LANES),
      pressure_inspection: null,
      authority_allowed: false,
      status: "bundle_built"
    };

    state.bundles.push(bundle);
    return bundle;
  }

  function review(bundle) {
    if (!bundle || typeof bundle !== "object") {
      return reject(bundle, "INVALID_BUNDLE");
    }

    if (has000(bundle.lanes)) {
      return hold(bundle, "000_CANNOT_FORM_AUTHORITY");
    }

    if (!hasRequiredLanes(bundle.lanes)) {
      return hold(bundle, "MISSING_REQUIRED_AUTHORITY_LANES");
    }

    const pressureInspection = inspectPressure({
      signal: bundle.signal,
      signal_id: bundle.signal_id,
      lanes: bundle.lanes,
      attrs: bundle.attrs
    });

    bundle.pressure_inspection = clone(pressureInspection);

    if (pressureBlocksAuthority(pressureInspection)) {
      return hold(bundle, "PRESSURE_REPORT_BLOCKED_AUTHORITY");
    }

    const ready = {
      id: makeId("authorityReady"),
      ready_at: now(),
      bundle: clone(bundle),
      authority_allowed: true,
      status: "authority_bundle_ready"
    };

    state.ready.push(ready);
    return ready;
  }

  function form(input = {}) {
    const bundle = build(input);
    return review(bundle);
  }

  function canExecuteAuthority(result) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.authority_allowed === true &&
      result.status === "authority_bundle_ready"
    );
  }

  function getState() {
    return clone(state);
  }

  return {
    LANE_000,
    REQUIRED_LANES,
    configure,
    build,
    review,
    form,
    inspectPressure,
    pressureBlocksAuthority,
    canExecuteAuthority,
    hasRequiredLanes,
    has000,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdEquilibriumBundle;
}
