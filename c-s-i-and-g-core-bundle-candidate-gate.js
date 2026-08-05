// c-s-i-and-g-core-bundle-candidate-gate.js
// CyberCrowd — Core Bundle Candidate Gate
// 
// Owns:
// - receiving bundle-ready context from Core support bridges
// - checking whether evidence context can become a bundle candidate
// - separating candidate readiness from authority release
// - holding weak, single-source, pending, or unbalanced candidates
// - preparing clean candidate packets for later bundle formation
//
// Does NOT own:
// - authority execution
// - identity creation
// - movement approval
// - final Dewey classification
// - provider execution
// - OAuth
// - credential storage
// - token storage
// - scraping
// - webhook delivery
// - payment
// - sessions
// - cookies
// - KV storage
// - UI
// - real-world execution

const CyberCrowdCoreBundleCandidateGate = (() => {
  const ACCEPTED_CORROBORATED_SUPPORT_STATUS = "core_corroborated_support_recorded_no_authority";
  const ACCEPTED_CONTEXT_LEDGER_STATUS = "core_bundle_context_recorded_no_authority";
  const CANDIDATE_READY_STATUS = "core_bundle_candidate_ready_no_authority";
  const CANDIDATE_PENDING_STATUS = "core_bundle_candidate_pending_no_authority";

  const REQUIRED_LANES = [
    "evidence_lane"
  ];

  const BLOCKED_MARKERS = [
    "000_future_sci_fi_unclassified",
    "null horizon authority",
    "000 authority",
    "authority_from_000",
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
    "client_secret",
    "client secret",
    "api_key",
    "api key",
    "oauth",
    "spotify_oauth",
    "spotify oauth",
    "spotify_token",
    "spotify token",
    "pandora_oauth",
    "pandora oauth",
    "pandora_token",
    "pandora token",
    "refresh credential",
    "login credential",
    "scrape",
    "scraping",
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
    candidates: [],
    pending: [],
    held: [],
    rejected: []
  };

  let CoreCorroboratedSupportBridge = null;
  let CoreBundleContextLedger = null;
  let CoreBundleFormationGate = null;

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
    CoreCorroboratedSupportBridge =
      deps.CoreCorroboratedSupportBridge ||
      deps.coreCorroboratedSupportBridge ||
      deps.corroboratedSupportBridge ||
      CoreCorroboratedSupportBridge ||
      safeRequire("./c-s-i-and-g-core-corroborated-support-bridge.js") ||
      null;

    CoreBundleContextLedger =
      deps.CoreBundleContextLedger ||
      deps.coreBundleContextLedger ||
      deps.bundleContextLedger ||
      CoreBundleContextLedger ||
      safeRequire("./c-s-i-and-g-core-bundle-context-ledger.js") ||
      null;

    CoreBundleFormationGate =
      deps.CoreBundleFormationGate ||
      deps.coreBundleFormationGate ||
      deps.bundleFormationGate ||
      CoreBundleFormationGate ||
      safeRequire("./c-s-i-and-g-core-bundle-formation-gate.js") ||
      null;

    state.configured = Boolean(
      CoreCorroboratedSupportBridge ||
      CoreBundleContextLedger ||
      CoreBundleFormationGate
    );

    return {
      configured: state.configured,
      has_core_corroborated_support_bridge: Boolean(CoreCorroboratedSupportBridge),
      has_core_bundle_context_ledger: Boolean(CoreBundleContextLedger),
      has_core_bundle_formation_gate: Boolean(CoreBundleFormationGate)
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

  function cleanText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeList(value) {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.map((item) => cleanText(item)).filter(Boolean);
    }

    return [cleanText(value)].filter(Boolean);
  }

  function containsBlockedMaterial(input) {
    const text = toText(input);

    return BLOCKED_MARKERS.some((marker) => {
      return text.includes(marker);
    });
  }

  function hold(target, reason) {
    const record = {
      id: makeId("coreBundleCandidateHold"),
      held_at: now(),
      reason,
      target: clone(target),
      candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_bundle_candidate_gate"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreBundleCandidateReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_bundle_candidate_gate"
    };

    state.rejected.push(record);
    return record;
  }

  function recordReceived(input = {}) {
    const record = {
      id: makeId("coreBundleCandidateReceive"),
      received_at: now(),
      input: clone(input),
      candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_bundle_candidate_gate"
    };

    state.received.push(record);
    return record;
  }

  function isContextLedgerRecord(input = {}) {
    return Boolean(
      input &&
      typeof input === "object" &&
      input.status === ACCEPTED_CONTEXT_LEDGER_STATUS &&
      input.bundle_context_ready === true &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false
    );
  }

  function isCorroboratedSupportBridgeRecord(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreCorroboratedSupportBridge &&
      typeof CoreCorroboratedSupportBridge.canEnterBundleCandidateBuild === "function" &&
      CoreCorroboratedSupportBridge.canEnterBundleCandidateBuild(input)
    ) {
      return true;
    }

    return Boolean(
      input.status === ACCEPTED_CORROBORATED_SUPPORT_STATUS &&
      input.corroborated_support_ready === true &&
      input.context_ledger_recorded === true &&
      input.evidence_support_ready === true &&
      input.evidence_only === true &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      input.context_ledger_result &&
      input.context_ledger_result.status === ACCEPTED_CONTEXT_LEDGER_STATUS
    );
  }

  function readContextLedgerResult(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (isContextLedgerRecord(input)) {
      return input;
    }

    if (
      CoreCorroboratedSupportBridge &&
      typeof CoreCorroboratedSupportBridge.readContextLedgerResult === "function"
    ) {
      const bridgeContext = CoreCorroboratedSupportBridge.readContextLedgerResult(input);

      if (bridgeContext) {
        return bridgeContext;
      }
    }

    if (input.context_ledger_result && isContextLedgerRecord(input.context_ledger_result)) {
      return input.context_ledger_result;
    }

    return null;
  }

  function readLaneSet(input = {}, context = {}) {
    const lanes = [
      ...normalizeList(input.lane),
      ...normalizeList(input.lanes),
      ...normalizeList(context.lane),
      ...normalizeList(context.lanes),
      ...normalizeList(context.context && context.context.lanes)
    ];

    const unique = Array.from(new Set(lanes));

    if (!unique.length) {
      return [
        "evidence_lane"
      ];
    }

    return unique;
  }

  function readIntent(input = {}, context = {}) {
    return cleanText(
      input.intent ||
      context.intent ||
      context.context &&
      context.context.intent ||
      "bundle_candidate_review"
    );
  }

  function readSubject(input = {}, context = {}) {
    return cleanText(
      input.subject_hint ||
      input.subject ||
      context.subject_hint ||
      context.subject ||
      context.context &&
      context.context.subject_hint ||
      "unknown_subject"
    );
  }

  function readAttrs(input = {}, context = {}) {
    return Object.assign(
      {},
      context.attrs || {},
      context.context && context.context.attrs || {},
      input.attrs || {}
    );
  }

  function readEvidenceSupport(input = {}, context = {}) {
    return Boolean(
      input.evidence_support_ready ||
      context.evidence_support_ready ||
      context.context &&
      context.context.evidence_support_ready ||
      input.corroborated_support_ready ||
      context.corroborated ||
      context.context &&
      context.context.corroborated
    );
  }

  function hasRequiredLanes(lanes = []) {
    return REQUIRED_LANES.every((lane) => lanes.includes(lane));
  }

  function buildCandidatePacket(input = {}, context = {}, reason = "CORE_BUNDLE_CANDIDATE_FROM_CORROBORATED_SUPPORT") {
    const lanes = readLaneSet(input, context);
    const attrs = readAttrs(input, context);

    return {
      id: makeId("coreBundleCandidate"),
      created_at: now(),
      source: "core_bundle_candidate_gate",
      reason,
      input_id: input.id || null,
      context_ledger_record_id: context.id || null,
      lane: lanes[0] || "evidence_lane",
      lanes,
      intent: readIntent(input, context),
      subject_hint: readSubject(input, context),
      attrs,
      context: clone(context),
      original_input: clone(input),
      required_lanes: clone(REQUIRED_LANES),
      has_required_lanes: hasRequiredLanes(lanes),
      evidence_support_ready: readEvidenceSupport(input, context),
      bundle_context_ready: Boolean(context.bundle_context_ready),
      corroborated: Boolean(
        input.corroborated_support_ready ||
        context.corroborated ||
        context.context &&
        context.context.corroborated
      ),
      single_source_hold: Boolean(
        input.single_source_hold ||
        context.single_source_hold ||
        context.context &&
        context.context.single_source_hold
      ),
      candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      allowed_future_use: [
        "core_bundle_formation_gate",
        "lane_balance_review",
        "future_equilibrium_bundle_build"
      ],
      blocked_current_use: [
        "authority_execution",
        "identity_creation",
        "movement_approval",
        "final_dewey_classification",
        "provider_execution",
        "external_api_call_from_bundle_candidate_gate",
        "payment",
        "real_world_execution"
      ],
      status: CANDIDATE_PENDING_STATUS
    };
  }

  function candidateLooksReady(candidate = {}) {
    return Boolean(
      candidate &&
      typeof candidate === "object" &&
      candidate.has_required_lanes === true &&
      candidate.evidence_support_ready === true &&
      candidate.bundle_context_ready === true &&
      candidate.corroborated === true &&
      candidate.single_source_hold === false &&
      candidate.authority_allowed === false &&
      candidate.external_call_allowed === false &&
      candidate.executed === false
    );
  }

  function markCandidateReady(candidate = {}) {
    const ready = Object.assign({}, clone(candidate), {
      candidate_ready: true,
      reviewed_at: now(),
      status: CANDIDATE_READY_STATUS
    });

    state.candidates.push(ready);
    return ready;
  }

  function markCandidatePending(candidate = {}, reason = "CORE_BUNDLE_CANDIDATE_NOT_READY") {
    const pending = Object.assign({}, clone(candidate), {
      pending_reason: reason,
      candidate_ready: false,
      reviewed_at: now(),
      status: CANDIDATE_PENDING_STATUS
    });

    state.pending.push(pending);
    return pending;
  }

  function receive(input = {}, options = {}) {
    configure(options.deps || {});

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CORE_BUNDLE_CANDIDATE_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_BUNDLE_CANDIDATE_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!isCorroboratedSupportBridgeRecord(input) && !isContextLedgerRecord(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_BUNDLE_CANDIDATE_REQUIRES_CORROBORATED_SUPPORT_OR_CONTEXT_LEDGER_RECORD"
      );
    }

    const context = readContextLedgerResult(input);

    if (!context) {
      return hold(
        {
          received,
          input
        },
        "CORE_BUNDLE_CANDIDATE_MISSING_CONTEXT_LEDGER_RECORD"
      );
    }

    if (containsBlockedMaterial(context)) {
      return hold(
        {
          received,
          input,
          context
        },
        "CORE_BUNDLE_CANDIDATE_CONTEXT_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const candidate = buildCandidatePacket(
      input,
      context,
      options.reason || "CORE_BUNDLE_CANDIDATE_FROM_CORROBORATED_SUPPORT"
    );

    if (containsBlockedMaterial(candidate)) {
      return hold(
        {
          received,
          input,
          context,
          candidate
        },
        "CORE_BUNDLE_CANDIDATE_PACKET_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!candidateLooksReady(candidate)) {
      return markCandidatePending(candidate, "CORE_BUNDLE_CANDIDATE_FAILED_READINESS_CHECK");
    }

    return markCandidateReady(candidate);
  }

  function receiveFromCorroboratedSupportBridge(input = {}, options = {}) {
    configure(options.deps || {});

    if (isCorroboratedSupportBridgeRecord(input)) {
      return receive(input, options);
    }

    if (
      !CoreCorroboratedSupportBridge ||
      typeof CoreCorroboratedSupportBridge.receiveFromCorroborationLedger !== "function"
    ) {
      return hold(input, "CORE_CORROBORATED_SUPPORT_BRIDGE_NOT_AVAILABLE");
    }

    const bridged = CoreCorroboratedSupportBridge.receiveFromCorroborationLedger(input, options);

    if (!isCorroboratedSupportBridgeRecord(bridged)) {
      return hold(
        {
          input,
          bridged
        },
        "CORE_CORROBORATED_SUPPORT_BRIDGE_DID_NOT_CREATE_BUNDLE_CANDIDATE_INPUT"
      );
    }

    return receive(bridged, options);
  }

  function canEnterBundleFormation(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === CANDIDATE_READY_STATUS &&
      result.candidate_ready === true &&
      result.evidence_support_ready === true &&
      result.bundle_context_ready === true &&
      result.corroborated === true &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function readCandidate(result = {}) {
    if (!canEnterBundleFormation(result)) {
      return null;
    }

    return clone(result);
  }

  function pullNextCandidate() {
    const next = state.candidates.shift();

    if (!next) {
      return null;
    }

    return clone(next);
  }

  function peekCandidates() {
    return clone(state.candidates);
  }

  function peekPending() {
    return clone(state.pending);
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
    CANDIDATE_READY_STATUS,
    CANDIDATE_PENDING_STATUS,
    REQUIRED_LANES,
    configure,
    receive,
    receiveFromCorroboratedSupportBridge,
    isCorroboratedSupportBridgeRecord,
    isContextLedgerRecord,
    readContextLedgerResult,
    buildCandidatePacket,
    candidateLooksReady,
    markCandidateReady,
    markCandidatePending,
    canEnterBundleFormation,
    readCandidate,
    pullNextCandidate,
    peekCandidates,
    peekPending,
    containsBlockedMaterial,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreBundleCandidateGate;
}
