// c-s-i-and-g-authority-release-gate.js
// CyberCrowd — Authority Release Gate
// 
// Owns:
// - final release review after bundle readiness
// - requiring depth equilibrium before authority can be released
// - blocking 000 from authority release
// - recording release certificates
// - holding anything that looks ready but has not passed depth
//
// Does NOT own:
// - raw signal intake
// - 000 preservation
// - Dewey final classification
// - identity creation
// - payment
// - sessions
// - cookies
// - KV storage
// - external APIs
// - scraping
// - UI
// - real-world execution

const CyberCrowdAuthorityReleaseGate = (() => {
  const LANE_000 = "000_future_sci_fi_unclassified";

  const state = {
    configured: false,
    releaseRequests: [],
    released: [],
    held: [],
    rejected: []
  };

  let EquilibriumBundle = null;
  let DepthEquilibriumCheck = null;

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
    EquilibriumBundle =
      deps.EquilibriumBundle ||
      deps.equilibriumBundle ||
      deps.bundleGate ||
      EquilibriumBundle ||
      safeRequire("./c-s-i-and-g-equilibrium-bundle.js") ||
      null;

    DepthEquilibriumCheck =
      deps.DepthEquilibriumCheck ||
      deps.depthEquilibriumCheck ||
      deps.depthCheck ||
      DepthEquilibriumCheck ||
      safeRequire("./c-s-i-and-g-depth-equilibrium-check.js") ||
      null;

    state.configured = Boolean(EquilibriumBundle && DepthEquilibriumCheck);

    return {
      configured: state.configured,
      has_bundle_gate: Boolean(EquilibriumBundle),
      has_depth_check: Boolean(DepthEquilibriumCheck)
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

  function readBundle(input = {}) {
    if (input.bundle && typeof input.bundle === "object") {
      return input.bundle;
    }

    if (input.core_result && input.core_result.bundle) {
      return input.core_result.bundle;
    }

    if (input.result && input.result.bundle) {
      return input.result.bundle;
    }

    if (input.status === "authority_bundle_ready" && input.bundle) {
      return input.bundle;
    }

    return input;
  }

  function readLanes(input = {}) {
    const bundle = readBundle(input);

    return normalizeLanes(
      input.lanes ||
      bundle.lanes ||
      bundle.bundle && bundle.bundle.lanes ||
      []
    );
  }

  function has000(input = {}) {
    return readLanes(input).includes(LANE_000);
  }

  function hold(target, reason) {
    const record = {
      id: makeId("authorityReleaseHold"),
      held_at: now(),
      reason,
      target: clone(target),
      release_allowed: false,
      authority_allowed: false,
      executed: false,
      status: "held_by_authority_release_gate"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("authorityReleaseReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      release_allowed: false,
      authority_allowed: false,
      executed: false,
      status: "rejected_by_authority_release_gate"
    };

    state.rejected.push(record);
    return record;
  }

  function recordRequest(input = {}) {
    const request = {
      id: makeId("authorityReleaseRequest"),
      requested_at: now(),
      source: input.source || "unknown_source",
      input: clone(input),
      release_allowed: false,
      authority_allowed: false,
      executed: false,
      status: "authority_release_requested"
    };

    state.releaseRequests.push(request);
    return request;
  }

  function bundleLooksReady(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      input.status === "authority_bundle_ready" &&
      input.authority_allowed === true
    ) {
      return true;
    }

    if (
      input.bundle &&
      input.status === "authority_depth_ready" &&
      input.authority_allowed === true
    ) {
      return true;
    }

    if (
      input.result &&
      input.result.status === "authority_bundle_ready" &&
      input.result.authority_allowed === true
    ) {
      return true;
    }

    if (
      EquilibriumBundle &&
      typeof EquilibriumBundle.canExecuteAuthority === "function"
    ) {
      return EquilibriumBundle.canExecuteAuthority(input);
    }

    return false;
  }

  function runDepthCheck(input = {}) {
    configure();

    if (
      !DepthEquilibriumCheck ||
      typeof DepthEquilibriumCheck.requireDepth !== "function"
    ) {
      return {
        available: false,
        reason: "DEPTH_EQUILIBRIUM_CHECK_NOT_AVAILABLE",
        authority_allowed: false,
        status: "depth_check_unavailable"
      };
    }

    return DepthEquilibriumCheck.requireDepth(input);
  }

  function depthAllowsRelease(depthResult) {
    return Boolean(
      depthResult &&
      typeof depthResult === "object" &&
      depthResult.authority_allowed === true &&
      depthResult.status === "authority_depth_ready"
    );
  }

  function review(input = {}) {
    configure();

    const request = recordRequest(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          request,
          input
        },
        "INVALID_AUTHORITY_RELEASE_INPUT"
      );
    }

    if (has000(input)) {
      return hold(
        {
          request,
          input
        },
        "000_CANNOT_RELEASE_AUTHORITY"
      );
    }

    if (!bundleLooksReady(input)) {
      return hold(
        {
          request,
          input
        },
        "AUTHORITY_BUNDLE_NOT_READY"
      );
    }

    const bundle = readBundle(input);

    const depthResult = runDepthCheck({
      source: "authority_release_gate",
      bundle,
      lanes: readLanes(input),
      attrs: bundle.attrs || input.attrs || {},
      release_request_id: request.id
    });

    if (!depthAllowsRelease(depthResult)) {
      return hold(
        {
          request,
          input,
          depthResult
        },
        "DEPTH_EQUILIBRIUM_BLOCKED_AUTHORITY_RELEASE"
      );
    }

    const release = {
      id: makeId("authorityRelease"),
      released_at: now(),
      request_id: request.id,
      source: input.source || "authority_release_gate",
      bundle: clone(bundle),
      lanes: readLanes(input),
      depth_result: clone(depthResult),
      release_allowed: true,
      authority_allowed: true,
      executed: false,
      status: "authority_release_ready"
    };

    state.released.push(release);
    return release;
  }

  function canExecuteAuthority(result) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.release_allowed === true &&
      result.authority_allowed === true &&
      result.status === "authority_release_ready" &&
      result.executed === false
    );
  }

  function getState() {
    return clone(state);
  }

  return {
    LANE_000,
    configure,
    review,
    runDepthCheck,
    depthAllowsRelease,
    bundleLooksReady,
    readBundle,
    readLanes,
    has000,
    canExecuteAuthority,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdAuthorityReleaseGate;
}
