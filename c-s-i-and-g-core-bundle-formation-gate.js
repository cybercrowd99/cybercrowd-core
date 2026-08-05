// c-s-i-and-g-core-bundle-formation-gate.js
// CyberCrowd — Core Bundle Formation Gate
// 
// Owns:
// - receiving ready bundle-context candidates from the Core Bundle Context Ledger
// - converting separated lane context into Equilibrium Bundle input
// - calling the Equilibrium Bundle gate
// - blocking incomplete, corroboration-needed, sensitive, or 000 candidates
// - preserving bundle formation results without releasing authority
//
// Does NOT own:
// - authority execution
// - authority release
// - certificate sealing
// - identity creation
// - movement approval
// - final Dewey classification
// - provider-specific adapters
// - OAuth
// - credential storage
// - external API calls
// - webhook delivery
// - scraping
// - payment
// - sessions
// - cookies
// - KV storage
// - UI
// - real-world execution

const CyberCrowdCoreBundleFormationGate = (() => {
  const REQUIRED_LANES = [
    "identity_lane",
    "evidence_lane",
    "movement_lane",
    "authority_review_lane"
  ];

  const ACCEPTED_CANDIDATE_STATUS = "core_bundle_context_candidate_ready_no_authority";
  const ACCEPTED_INPUT_STATUS = "equilibrium_bundle_input_ready_no_authority";

  const BLOCKED_MARKERS = [
    "000_future_sci_fi_unclassified",
    "null horizon",
    "preserved_in_000",
    "unclassified_signal_routed_to_000",
    "private_id",
    "private id",
    "private_identity",
    "private identity",
    "protected_identity",
    "protected identity",
    "internal_identity",
    "internal identity",
    "secret",
    "password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "bearer",
    "session",
    "cookie",
    "kv",
    "heart rate",
    "blood oxygen",
    "spo2",
    "sleep",
    "medical",
    "health",
    "biometric",
    "fingerprint",
    "face id",
    "dna",
    "gps",
    "precise location",
    "exact location",
    "latitude",
    "longitude",
    "raw_camera",
    "raw camera",
    "raw_microphone",
    "raw microphone",
    "camera stream",
    "microphone stream"
  ];

  const state = {
    configured: false,
    received: [],
    inputs: [],
    formed: [],
    held: [],
    rejected: []
  };

  let CoreBundleContextLedger = null;
  let EquilibriumBundle = null;

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return String(value);
    }
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
    CoreBundleContextLedger =
      deps.CoreBundleContextLedger ||
      deps.coreBundleContextLedger ||
      deps.bundleContextLedger ||
      CoreBundleContextLedger ||
      safeRequire("./c-s-i-and-g-core-bundle-context-ledger.js") ||
      null;

    EquilibriumBundle =
      deps.EquilibriumBundle ||
      deps.equilibriumBundle ||
      deps.bundleGate ||
      EquilibriumBundle ||
      safeRequire("./c-s-i-and-g-equilibrium-bundle.js") ||
      null;

    state.configured = Boolean(CoreBundleContextLedger && EquilibriumBundle);

    return {
      configured: state.configured,
      has_core_bundle_context_ledger: Boolean(CoreBundleContextLedger),
      has_equilibrium_bundle: Boolean(EquilibriumBundle)
    };
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
      id: makeId("bundleFormationHold"),
      held_at: now(),
      reason,
      target: clone(target),
      bundle_formed: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_bundle_formation_gate"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("bundleFormationReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      bundle_formed: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_bundle_formation_gate"
    };

    state.rejected.push(record);
    return record;
  }

  function containsBlockedMaterial(input) {
    const text = toText(input);

    return BLOCKED_MARKERS.some((marker) => {
      return text.includes(marker);
    });
  }

  function recordReceived(input = {}) {
    const record = {
      id: makeId("bundleFormationReceive"),
      received_at: now(),
      input: clone(input),
      bundle_formed: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_bundle_formation_gate"
    };

    state.received.push(record);
    return record;
  }

  function hasRequiredLanes(lanes) {
    const cleanLanes = normalizeLanes(lanes);

    return REQUIRED_LANES.every((lane) => {
      return cleanLanes.includes(lane);
    });
  }

  function isReadyContextCandidate(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreBundleContextLedger &&
      typeof CoreBundleContextLedger.canEnterEquilibriumBundle === "function"
    ) {
      return CoreBundleContextLedger.canEnterEquilibriumBundle(input);
    }

    return (
      input.status === ACCEPTED_CANDIDATE_STATUS &&
      input.bundle_candidate_ready === true &&
      input.bundle_context_ready === true &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      Array.isArray(input.present_lanes) &&
      hasRequiredLanes(input.present_lanes)
    );
  }

  function isBundleInput(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    return (
      input.status === ACCEPTED_INPUT_STATUS &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      hasRequiredLanes(input.lanes)
    );
  }

  function buildBundleInput(candidate = {}) {
    configure();

    if (!candidate || typeof candidate !== "object") {
      return reject(candidate, "INVALID_BUNDLE_CONTEXT_CANDIDATE");
    }

    if (containsBlockedMaterial(candidate)) {
      return hold(candidate, "BUNDLE_FORMATION_BLOCKED_SENSITIVE_OR_000_MATERIAL");
    }

    if (!isReadyContextCandidate(candidate)) {
      return hold(candidate, "BUNDLE_FORMATION_REQUIRES_READY_CONTEXT_CANDIDATE");
    }

    if (candidate.corroboration_required === true) {
      return hold(candidate, "BUNDLE_FORMATION_REQUIRES_CORROBORATION_FIRST");
    }

    if (
      CoreBundleContextLedger &&
      typeof CoreBundleContextLedger.toEquilibriumBundleInput === "function"
    ) {
      const ledgerInput = CoreBundleContextLedger.toEquilibriumBundleInput(candidate);

      if (isBundleInput(ledgerInput)) {
        state.inputs.push(ledgerInput);
        return ledgerInput;
      }

      return hold(
        {
          candidate,
          ledgerInput
        },
        "CONTEXT_LEDGER_DID_NOT_CREATE_VALID_BUNDLE_INPUT"
      );
    }

    const input = {
      id: makeId("equilibriumBundleInput"),
      built_at: now(),
      source: "core_bundle_formation_gate",
      signal_id: candidate.id || null,
      signal: clone(candidate),
      attrs: clone(candidate.attrs || {}),
      lanes: clone(REQUIRED_LANES),
      contexts: clone(candidate.contexts || []),
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: ACCEPTED_INPUT_STATUS
    };

    state.inputs.push(input);
    return input;
  }

  function formFromInput(bundleInput = {}) {
    configure();

    if (!bundleInput || typeof bundleInput !== "object") {
      return reject(bundleInput, "INVALID_EQUILIBRIUM_BUNDLE_INPUT");
    }

    if (containsBlockedMaterial(bundleInput)) {
      return hold(bundleInput, "BUNDLE_INPUT_BLOCKED_SENSITIVE_OR_000_MATERIAL");
    }

    if (!isBundleInput(bundleInput)) {
      return hold(bundleInput, "FORMATION_REQUIRES_VALID_EQUILIBRIUM_BUNDLE_INPUT");
    }

    if (!EquilibriumBundle || typeof EquilibriumBundle.form !== "function") {
      return hold(bundleInput, "EQUILIBRIUM_BUNDLE_GATE_NOT_AVAILABLE");
    }

    const result = EquilibriumBundle.form({
      source: "core_bundle_formation_gate",
      signal_id: bundleInput.signal_id || bundleInput.id || null,
      signal: clone(bundleInput.signal || bundleInput),
      attrs: clone(bundleInput.attrs || {}),
      lanes: clone(bundleInput.lanes || REQUIRED_LANES),
      contexts: clone(bundleInput.contexts || [])
    });

    const formed = {
      id: makeId("coreBundleFormation"),
      formed_at: now(),
      bundle_input_id: bundleInput.id || null,
      bundle_input: clone(bundleInput),
      bundle_result: clone(result),
      bundle_formed: Boolean(
        result &&
        typeof result === "object" &&
        result.status === "authority_bundle_ready" &&
        result.authority_allowed === true
      ),
      authority_allowed: Boolean(
        result &&
        typeof result === "object" &&
        result.status === "authority_bundle_ready" &&
        result.authority_allowed === true
      ),
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: Boolean(
        result &&
        typeof result === "object" &&
        result.status === "authority_bundle_ready" &&
        result.authority_allowed === true
      )
        ? "core_equilibrium_bundle_formed_release_not_allowed"
        : "core_equilibrium_bundle_not_ready"
    };

    state.formed.push(formed);

    if (formed.bundle_formed !== true) {
      return hold(formed, "EQUILIBRIUM_BUNDLE_GATE_DID_NOT_MARK_READY");
    }

    return formed;
  }

  function formFromCandidate(candidate = {}, options = {}) {
    configure(options.deps || {});

    const received = recordReceived(candidate);
    const bundleInput = buildBundleInput(candidate);

    if (!isBundleInput(bundleInput)) {
      return hold(
        {
          received,
          candidate,
          bundleInput
        },
        "BUNDLE_FORMATION_INPUT_NOT_READY"
      );
    }

    return formFromInput(bundleInput);
  }

  function receiveFromContextLedger(input = {}, options = {}) {
    configure(options.deps || {});

    if (isReadyContextCandidate(input)) {
      return formFromCandidate(input, options);
    }

    if (
      !CoreBundleContextLedger ||
      typeof CoreBundleContextLedger.buildCandidate !== "function"
    ) {
      return hold(input, "CORE_BUNDLE_CONTEXT_LEDGER_NOT_AVAILABLE");
    }

    const candidate = CoreBundleContextLedger.buildCandidate(
      undefined,
      options.reason || "FORMATION_GATE_REQUESTED_CONTEXT_CANDIDATE"
    );

    if (!isReadyContextCandidate(candidate)) {
      return hold(
        {
          input,
          candidate
        },
        "CONTEXT_LEDGER_DID_NOT_CREATE_READY_CANDIDATE"
      );
    }

    return formFromCandidate(candidate, options);
  }

  function canEnterReleaseGate(formed = {}) {
    return Boolean(
      formed &&
      typeof formed === "object" &&
      formed.status === "core_equilibrium_bundle_formed_release_not_allowed" &&
      formed.bundle_formed === true &&
      formed.authority_allowed === true &&
      formed.release_allowed === false &&
      formed.certificate_valid === false &&
      formed.external_call_allowed === false &&
      formed.executed === false &&
      formed.bundle_result &&
      formed.bundle_result.status === "authority_bundle_ready"
    );
  }

  function readBundleResult(formed = {}) {
    if (!canEnterReleaseGate(formed)) {
      return null;
    }

    return clone(formed.bundle_result);
  }

  function peekFormed() {
    return clone(state.formed);
  }

  function pullNextFormed() {
    const next = state.formed.shift();

    if (!next) {
      return null;
    }

    return clone(next);
  }

  function canExecuteAuthority() {
    return false;
  }

  function canCallExternal() {
    return false;
  }

  function getState() {
    return clone(state);
  }

  return {
    REQUIRED_LANES,
    configure,
    buildBundleInput,
    formFromInput,
    formFromCandidate,
    receiveFromContextLedger,
    isReadyContextCandidate,
    isBundleInput,
    hasRequiredLanes,
    containsBlockedMaterial,
    canEnterReleaseGate,
    readBundleResult,
    peekFormed,
    pullNextFormed,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreBundleFormationGate;
}
