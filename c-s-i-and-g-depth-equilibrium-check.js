// c-s-i-and-g-depth-equilibrium-check.js
// CyberCrowd — Depth Equilibrium Check
// 
// Owns:
// - detecting superficial / fake equilibrium
// - checking balance below lane labels
// - blocking public pressure from becoming authority
// - blocking observation from becoming ownership
// - blocking private identity exposure
// - holding bundles that look balanced only on the surface
//
// Does NOT own:
// - raw signal intake
// - Dewey final classification
// - 000 preservation
// - authority execution
// - identity creation
// - payment
// - sessions
// - cookies
// - KV storage
// - external APIs
// - scraping
// - UI

const CyberCrowdDepthEquilibriumCheck = (() => {
  const LANE_000 = "000_future_sci_fi_unclassified";

  const REQUIRED_DEPTHS = [
    "identity_depth",
    "evidence_depth",
    "movement_depth",
    "authority_review_depth"
  ];

  const state = {
    reports: [],
    held: [],
    passed: [],
    rejected: []
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

  function toText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value.toLowerCase();
    }

    try {
      return JSON.stringify(value).toLowerCase();
    } catch (error) {
      return String(value).toLowerCase();
    }
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

  function hold(target, reason) {
    const record = {
      id: makeId("depthHold"),
      held_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      status: "held_by_depth_equilibrium_check"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("depthReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      status: "rejected_by_depth_equilibrium_check"
    };

    state.rejected.push(record);
    return record;
  }

  function detect000(input = {}) {
    const lanes = normalizeLanes(input.lanes || input.bundle && input.bundle.lanes);
    const text = toText(input);

    return {
      found: lanes.includes(LANE_000) || text.includes(LANE_000),
      reason: "000_CANNOT_PASS_DEPTH_AUTHORITY"
    };
  }

  function detectPublicPressureAuthority(input = {}) {
    const text = toText(input);

    const publicPressure =
      text.includes("public pressure") ||
      text.includes("public signal") ||
      text.includes("public review") ||
      text.includes("public lane") ||
      text.includes("crowd pressure");

    const authorityMovement =
      text.includes("authority_allowed") ||
      text.includes("execute") ||
      text.includes("approved") ||
      text.includes("authority_ready") ||
      text.includes("permission") ||
      text.includes("allow");

    return {
      found: publicPressure && authorityMovement,
      reason: "PUBLIC_PRESSURE_CANNOT_BECOME_AUTHORITY"
    };
  }

  function detectObservationOwnership(input = {}) {
    const text = toText(input);

    const observation =
      text.includes("observe") ||
      text.includes("observer") ||
      text.includes("watch") ||
      text.includes("witness") ||
      text.includes("camera") ||
      text.includes("photo") ||
      text.includes("video");

    const ownership =
      text.includes("own") ||
      text.includes("ownership") ||
      text.includes("possess") ||
      text.includes("possession") ||
      text.includes("control");

    return {
      found: observation && ownership,
      reason: "OBSERVATION_CANNOT_BECOME_OWNERSHIP"
    };
  }

  function detectPrivateIdentityExposure(input = {}) {
    const text = toText(input);

    const privateIdentity =
      text.includes("private id") ||
      text.includes("private identity") ||
      text.includes("protected identity") ||
      text.includes("internal identity");

    const publicMovement =
      text.includes("public") ||
      text.includes("share") ||
      text.includes("external") ||
      text.includes("broadcast") ||
      text.includes("publish");

    return {
      found: privateIdentity && publicMovement,
      reason: "PRIVATE_IDENTITY_CANNOT_EXPOSE_TO_PUBLIC_MOVEMENT"
    };
  }

  function detectLabelOnlyBalance(input = {}) {
    const lanes = normalizeLanes(input.lanes || input.bundle && input.bundle.lanes);
    const attrs =
      input.attrs ||
      input.bundle && input.bundle.attrs ||
      {};

    const hasLaneLabels = lanes.length >= 4;

    const depthSignals = {
      identity_depth: Boolean(
        attrs.identity_depth ||
        attrs.identity_proof ||
        attrs.identity_pressure > 0
      ),
      evidence_depth: Boolean(
        attrs.evidence_depth ||
        attrs.proof_depth ||
        attrs.evidence_pressure > 0
      ),
      movement_depth: Boolean(
        attrs.movement_depth ||
        attrs.route_depth ||
        attrs.movement_pressure > 0
      ),
      authority_review_depth: Boolean(
        attrs.authority_review_depth ||
        attrs.review_depth ||
        attrs.authority_pressure > 0
      )
    };

    const missingDepths = REQUIRED_DEPTHS.filter((depth) => !depthSignals[depth]);

    return {
      found: hasLaneLabels && missingDepths.length > 0,
      reason: "LABEL_BALANCE_WITHOUT_DEPTH",
      depthSignals,
      missingDepths
    };
  }

  function detectSingleSourceAuthority(input = {}) {
    const bundle = input.bundle || input;
    const attrs = bundle.attrs || input.attrs || {};
    const text = toText(bundle);

    const sourceCount =
      Number(attrs.source_count || attrs.sources || attrs.witness_count || 0);

    const claimsAuthority =
      text.includes("authority_ready") ||
      text.includes("authority_allowed") ||
      text.includes("execute") ||
      text.includes("approve");

    const singleSource =
      sourceCount === 1 ||
      text.includes("single source") ||
      text.includes("one source");

    return {
      found: claimsAuthority && singleSource,
      reason: "AUTHORITY_CANNOT_REST_ON_SINGLE_SOURCE_PRESSURE"
    };
  }

  function inspect(input = {}) {
    const checks = [
      detect000(input),
      detectPublicPressureAuthority(input),
      detectObservationOwnership(input),
      detectPrivateIdentityExposure(input),
      detectLabelOnlyBalance(input),
      detectSingleSourceAuthority(input)
    ];

    const failures = checks.filter((check) => check.found);

    const report = {
      id: makeId("depthReport"),
      checked_at: now(),
      failures,
      passed: failures.length === 0,
      authority_allowed: failures.length === 0,
      status: failures.length === 0
        ? "depth_equilibrium_passed"
        : "depth_equilibrium_failed"
    };

    state.reports.push(report);

    if (report.passed) {
      state.passed.push(report);
    } else {
      hold(
        {
          input,
          report
        },
        "DEPTH_EQUILIBRIUM_FAILED"
      );
    }

    return report;
  }

  function requireDepth(input = {}) {
    const report = inspect(input);

    if (!report.passed) {
      return {
        id: makeId("depthResult"),
        checked_at: now(),
        report,
        authority_allowed: false,
        status: "authority_blocked_by_depth_check"
      };
    }

    return {
      id: makeId("depthResult"),
      checked_at: now(),
      report,
      authority_allowed: true,
      status: "authority_depth_ready"
    };
  }

  function canExecuteAuthority(result) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.authority_allowed === true &&
      result.status === "authority_depth_ready"
    );
  }

  function getState() {
    return clone(state);
  }

  return {
    LANE_000,
    REQUIRED_DEPTHS,
    inspect,
    requireDepth,
    detect000,
    detectPublicPressureAuthority,
    detectObservationOwnership,
    detectPrivateIdentityExposure,
    detectLabelOnlyBalance,
    detectSingleSourceAuthority,
    canExecuteAuthority,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdDepthEquilibriumCheck;
}
