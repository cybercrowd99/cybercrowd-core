// c-s-i-and-g-core-bundle-context-ledger.js
// CyberCrowd — Core Bundle Context Ledger
// 
// Owns:
// - receiving lane context packets before bundle formation
// - storing evidence, identity, movement, and authority-review context separately
// - accepting evidence-only context from the Core Evidence to Bundle Bridge
// - checking whether a future equilibrium bundle has enough separated context
// - preserving incomplete bundle candidates without granting authority
//
// Does NOT own:
// - authority execution
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

const CyberCrowdCoreBundleContextLedger = (() => {
  const REQUIRED_LANES = [
    "identity_lane",
    "evidence_lane",
    "movement_lane",
    "authority_review_lane"
  ];

  const ACCEPTED_EVIDENCE_CONTEXT_STATUS = [
    "evidence_bundle_context_ready",
    "evidence_bundle_context_ready_needs_corroboration"
  ];

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
    contexts: [],
    candidates: [],
    held: [],
    rejected: []
  };

  let CoreEvidenceBundleBridge = null;
  let PressureLedger = null;

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
    CoreEvidenceBundleBridge =
      deps.CoreEvidenceBundleBridge ||
      deps.coreEvidenceBundleBridge ||
      deps.evidenceBundleBridge ||
      CoreEvidenceBundleBridge ||
      safeRequire("./c-s-i-and-g-core-evidence-bundle-bridge.js") ||
      null;

    PressureLedger =
      deps.PressureLedger ||
      deps.pressureLedger ||
      PressureLedger ||
      safeRequire("./c-s-i-and-g-pressure-ledger.js") ||
      null;

    state.configured = Boolean(CoreEvidenceBundleBridge || PressureLedger);

    return {
      configured: state.configured,
      has_core_evidence_bundle_bridge: Boolean(CoreEvidenceBundleBridge),
      has_pressure_ledger: Boolean(PressureLedger)
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
      id: makeId("bundleContextHold"),
      held_at: now(),
      reason,
      target: clone(target),
      bundle_candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_bundle_context_ledger"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("bundleContextReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      bundle_candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_bundle_context_ledger"
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
      id: makeId("bundleContextReceive"),
      received_at: now(),
      input: clone(input),
      bundle_candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_bundle_context_ledger"
    };

    state.received.push(record);
    return record;
  }

  function detectLane(input = {}) {
    const lanes = normalizeLanes(input.lanes);

    if (lanes.includes("identity_lane")) {
      return "identity_lane";
    }

    if (lanes.includes("evidence_lane")) {
      return "evidence_lane";
    }

    if (lanes.includes("movement_lane")) {
      return "movement_lane";
    }

    if (lanes.includes("authority_review_lane")) {
      return "authority_review_lane";
    }

    if (input.target_lane && REQUIRED_LANES.includes(input.target_lane)) {
      return input.target_lane;
    }

    if (input.source_lane && REQUIRED_LANES.includes(input.source_lane)) {
      return input.source_lane;
    }

    return null;
  }

  function isEvidenceContext(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreEvidenceBundleBridge &&
      typeof CoreEvidenceBundleBridge.canEnterBundle === "function"
    ) {
      return CoreEvidenceBundleBridge.canEnterBundle(input);
    }

    return (
      ACCEPTED_EVIDENCE_CONTEXT_STATUS.includes(input.status) &&
      input.bundle_context_ready === true &&
      input.evidence_ready === true &&
      input.evidence_only === true &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      normalizeLanes(input.lanes).includes("evidence_lane")
    );
  }

  function isGenericLaneContext(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    const lane = detectLane(input);

    if (!lane) {
      return false;
    }

    return (
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false
    );
  }

  function inspectPressure(context = {}) {
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
        source: "core_bundle_context_ledger",
        reason: "BUNDLE_CONTEXT_PRESSURE_INSPECTION",
        signal: context,
        signal_id: context.id || null,
        lanes: context.lanes || [detectLane(context)],
        attrs: context.attrs || {},
        amount: 1
      })
    };
  }

  function pressureNeedsHold(pressureInspection) {
    if (!pressureInspection || !pressureInspection.available) {
      return false;
    }

    const report = pressureInspection.report;

    if (!report || typeof report !== "object") {
      return false;
    }

    return Boolean(
      report.compression && report.compression.over_compressed ||
      report.classification && report.classification.under_classified ||
      report.tilt && report.tilt.tilted
    );
  }

  function addContext(input = {}, reason = "BUNDLE_CONTEXT_RECORDED") {
    configure();

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_BUNDLE_CONTEXT_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "BUNDLE_CONTEXT_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const evidenceContext = isEvidenceContext(input);
    const genericContext = isGenericLaneContext(input);

    if (!evidenceContext && !genericContext) {
      return hold(
        {
          received,
          input
        },
        "BUNDLE_CONTEXT_REQUIRES_VALID_NON_AUTHORITY_LANE_CONTEXT"
      );
    }

    const lane = detectLane(input);

    if (!lane) {
      return hold(
        {
          received,
          input
        },
        "BUNDLE_CONTEXT_LANE_NOT_FOUND"
      );
    }

    const pressureInspection = inspectPressure(input);

    if (pressureNeedsHold(pressureInspection)) {
      return hold(
        {
          received,
          input,
          pressureInspection
        },
        "BUNDLE_CONTEXT_PRESSURE_REQUIRES_HOLD"
      );
    }

    const context = {
      id: makeId("bundleContext"),
      recorded_at: now(),
      reason,
      received_id: received.id,
      source_context_id: input.id || null,
      lane,
      context_type: evidenceContext
        ? "evidence_bundle_context"
        : "generic_bundle_lane_context",
      context: clone(input),
      pressure_inspection: clone(pressureInspection),
      attrs: clone(input.attrs || {}),
      lanes: [
        lane
      ],
      corroboration_required: Boolean(input.corroboration_required),
      bundle_context_ready: true,
      bundle_candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      allowed_uses: [
        "future_bundle_candidate",
        "lane_balance_review",
        "pressure_review",
        "corroboration_review"
      ],
      blocked_uses: [
        "authority_execution",
        "identity_creation",
        "movement_approval",
        "private_identity_exposure",
        "external_api_call_from_context_ledger",
        "payment_from_context_ledger",
        "real_world_execution_from_context_ledger"
      ],
      status: "core_bundle_context_recorded_no_authority"
    };

    state.contexts.push(context);
    return context;
  }

  function receiveFromEvidenceBridge(input = {}, options = {}) {
    configure(options.deps || {});

    if (isEvidenceContext(input)) {
      return addContext(
        input,
        options.reason || "EVIDENCE_BRIDGE_CONTEXT_RECORDED"
      );
    }

    if (
      !CoreEvidenceBundleBridge ||
      typeof CoreEvidenceBundleBridge.receiveFromEvidenceLedger !== "function"
    ) {
      return hold(input, "CORE_EVIDENCE_BUNDLE_BRIDGE_NOT_AVAILABLE");
    }

    const packet = CoreEvidenceBundleBridge.receiveFromEvidenceLedger(input, options);

    if (!isEvidenceContext(packet)) {
      return hold(
        {
          input,
          packet
        },
        "EVIDENCE_BRIDGE_DID_NOT_CREATE_BUNDLE_CONTEXT"
      );
    }

    return addContext(
      packet,
      options.reason || "EVIDENCE_BRIDGE_CREATED_CONTEXT_RECORDED"
    );
  }

  function getContextsByLane(lane) {
    return state.contexts.filter((context) => {
      return context.lane === lane;
    });
  }

  function hasRequiredLanes(contexts = state.contexts) {
    return REQUIRED_LANES.every((lane) => {
      return contexts.some((context) => context.lane === lane);
    });
  }

  function latestByLane(contexts = state.contexts) {
    const out = Object.create(null);

    contexts.forEach((context) => {
      if (!out[context.lane]) {
        out[context.lane] = context;
        return;
      }

      if (String(context.recorded_at) > String(out[context.lane].recorded_at)) {
        out[context.lane] = context;
      }
    });

    return out;
  }

  function buildCandidate(contexts = state.contexts, reason = "CORE_BUNDLE_CONTEXT_CANDIDATE_BUILT") {
    const usableContexts = Array.isArray(contexts)
      ? contexts.filter((context) => {
          return (
            context &&
            typeof context === "object" &&
            context.status === "core_bundle_context_recorded_no_authority" &&
            context.bundle_context_ready === true &&
            context.authority_allowed === false &&
            context.external_call_allowed === false &&
            context.executed === false
          );
        })
      : [];

    if (usableContexts.length === 0) {
      return hold(
        {
          contexts
        },
        "NO_VALID_CONTEXTS_FOR_BUNDLE_CANDIDATE"
      );
    }

    const laneMap = latestByLane(usableContexts);
    const lanes = Object.keys(laneMap);

    const missingLanes = REQUIRED_LANES.filter((lane) => {
      return !lanes.includes(lane);
    });

    const selectedContexts = REQUIRED_LANES
      .filter((lane) => laneMap[lane])
      .map((lane) => laneMap[lane]);

    const attrs = selectedContexts.reduce((out, context) => {
      const sourceAttrs = context.attrs || {};

      Object.keys(sourceAttrs).forEach((key) => {
        const value = sourceAttrs[key];

        if (typeof value === "number") {
          out[key] = Number(out[key] || 0) + value;
          return;
        }

        if (value === true) {
          out[key] = true;
        }
      });

      return out;
    }, {
      identity_pressure: 0,
      evidence_pressure: 0,
      movement_pressure: 0,
      authority_pressure: 0,
      unknown_pressure: 0
    });

    const corroborationRequired = selectedContexts.some((context) => {
      return context.corroboration_required === true;
    });

    const candidate = {
      id: makeId("bundleContextCandidate"),
      built_at: now(),
      reason,
      required_lanes: clone(REQUIRED_LANES),
      present_lanes: lanes,
      missing_lanes: missingLanes,
      contexts: clone(selectedContexts),
      attrs,
      corroboration_required: corroborationRequired,
      bundle_candidate_ready: missingLanes.length === 0 && corroborationRequired === false,
      bundle_context_ready: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: missingLanes.length === 0 && corroborationRequired === false
        ? "core_bundle_context_candidate_ready_no_authority"
        : "core_bundle_context_candidate_incomplete"
    };

    state.candidates.push(candidate);
    return candidate;
  }

  function canEnterEquilibriumBundle(candidate = {}) {
    return Boolean(
      candidate &&
      typeof candidate === "object" &&
      candidate.status === "core_bundle_context_candidate_ready_no_authority" &&
      candidate.bundle_candidate_ready === true &&
      candidate.bundle_context_ready === true &&
      candidate.authority_allowed === false &&
      candidate.external_call_allowed === false &&
      candidate.executed === false &&
      Array.isArray(candidate.present_lanes) &&
      REQUIRED_LANES.every((lane) => candidate.present_lanes.includes(lane))
    );
  }

  function toEquilibriumBundleInput(candidate = {}) {
    if (!canEnterEquilibriumBundle(candidate)) {
      return hold(candidate, "BUNDLE_CONTEXT_CANDIDATE_NOT_READY_FOR_EQUILIBRIUM_BUNDLE");
    }

    return {
      id: makeId("equilibriumBundleInput"),
      built_at: now(),
      source: "core_bundle_context_ledger",
      signal_id: candidate.id,
      signal: clone(candidate),
      attrs: clone(candidate.attrs || {}),
      lanes: clone(REQUIRED_LANES),
      contexts: clone(candidate.contexts || []),
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "equilibrium_bundle_input_ready_no_authority"
    };
  }

  function peekContexts() {
    return clone(state.contexts);
  }

  function peekCandidates() {
    return clone(state.candidates);
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
    addContext,
    receiveFromEvidenceBridge,
    buildCandidate,
    toEquilibriumBundleInput,
    isEvidenceContext,
    isGenericLaneContext,
    detectLane,
    getContextsByLane,
    hasRequiredLanes,
    canEnterEquilibriumBundle,
    containsBlockedMaterial,
    inspectPressure,
    pressureNeedsHold,
    peekContexts,
    peekCandidates,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreBundleContextLedger;
}
