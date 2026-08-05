// c-s-i-and-g-core-evidence-bundle-bridge.js
// CyberCrowd — Core Evidence to Bundle Bridge
// 
// Owns:
// - receiving reviewed Core evidence records
// - preparing evidence context for future equilibrium bundles
// - keeping evidence separate from identity, movement, and authority review
// - blocking weak / sensitive / unverified / 000 evidence from bundle context
// - preserving bundle-context packets without executing authority
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

const CyberCrowdCoreEvidenceBundleBridge = (() => {
  const ACCEPTED_REVIEW_READY = "core_evidence_reviewed_candidate_ready";
  const ACCEPTED_REVIEW_NEEDS_CORROBORATION = "core_evidence_reviewed_needs_corroboration";
  const CORE_EVIDENCE_LANE = "evidence_lane";

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
    packets: [],
    held: [],
    rejected: []
  };

  let CoreEvidenceReviewLedger = null;
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
    CoreEvidenceReviewLedger =
      deps.CoreEvidenceReviewLedger ||
      deps.coreEvidenceReviewLedger ||
      deps.evidenceLedger ||
      CoreEvidenceReviewLedger ||
      safeRequire("./c-s-i-and-g-core-evidence-review-ledger.js") ||
      null;

    EquilibriumBundle =
      deps.EquilibriumBundle ||
      deps.equilibriumBundle ||
      deps.bundleGate ||
      EquilibriumBundle ||
      safeRequire("./c-s-i-and-g-equilibrium-bundle.js") ||
      null;

    state.configured = Boolean(CoreEvidenceReviewLedger || EquilibriumBundle);

    return {
      configured: state.configured,
      has_core_evidence_review_ledger: Boolean(CoreEvidenceReviewLedger),
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

  function hold(target, reason) {
    const record = {
      id: makeId("evidenceBundleHold"),
      held_at: now(),
      reason,
      target: clone(target),
      bundle_context_ready: false,
      evidence_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_evidence_bundle_bridge"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("evidenceBundleReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      bundle_context_ready: false,
      evidence_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_evidence_bundle_bridge"
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
      id: makeId("evidenceBundleReceive"),
      received_at: now(),
      input: clone(input),
      bundle_context_ready: false,
      evidence_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_evidence_bundle_bridge"
    };

    state.received.push(record);
    return record;
  }

  function isReviewedEvidence(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreEvidenceReviewLedger &&
      typeof CoreEvidenceReviewLedger.canEnterBundleContext === "function"
    ) {
      return CoreEvidenceReviewLedger.canEnterBundleContext(input);
    }

    return (
      (
        input.status === ACCEPTED_REVIEW_READY ||
        input.status === ACCEPTED_REVIEW_NEEDS_CORROBORATION
      ) &&
      input.evidence_ready === true &&
      input.evidence_recorded === true &&
      input.bundle_candidate === true &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false
    );
  }

  function needsCorroboration(input = {}) {
    return Boolean(
      input &&
      typeof input === "object" &&
      (
        input.status === ACCEPTED_REVIEW_NEEDS_CORROBORATION ||
        input.needs_corroboration === true
      )
    );
  }

  function readEvidenceRecord(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (input.evidence_record && typeof input.evidence_record === "object") {
      return input.evidence_record;
    }

    if (
      input.evidence_record_id ||
      input.status === "core_evidence_candidate_recorded_no_authority"
    ) {
      return input;
    }

    return null;
  }

  function buildBundleContext(input = {}, reason = "CORE_EVIDENCE_READY_FOR_BUNDLE_CONTEXT") {
    configure();

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_EVIDENCE_BUNDLE_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "EVIDENCE_BUNDLE_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!isReviewedEvidence(input)) {
      return hold(
        {
          received,
          input
        },
        "EVIDENCE_BUNDLE_REQUIRES_REVIEWED_CORE_EVIDENCE"
      );
    }

    const evidenceRecord = readEvidenceRecord(input);

    if (!evidenceRecord) {
      return hold(
        {
          received,
          input
        },
        "EVIDENCE_BUNDLE_MISSING_EVIDENCE_RECORD"
      );
    }

    const corroborationRequired = needsCorroboration(input);

    const packet = {
      id: makeId("evidenceBundleContext"),
      built_at: now(),
      reason,
      source_review_id: input.id || null,
      source_evidence_record_id:
        evidenceRecord.id ||
        input.evidence_record_id ||
        null,
      source_lane: CORE_EVIDENCE_LANE,
      target: "future_equilibrium_bundle_context",
      evidence_record: clone(evidenceRecord),
      review: clone(input),
      lanes: [
        CORE_EVIDENCE_LANE
      ],
      attrs: {
        evidence_pressure: 1,
        evidence_depth: true,
        provider_result_depth: Boolean(
          evidenceRecord.attrs &&
          evidenceRecord.attrs.provider_result_depth
        ),
        source_count:
          evidenceRecord.attrs &&
          Number(evidenceRecord.attrs.source_count || 1) ||
          1,
        identity_pressure: 0,
        movement_pressure: 0,
        authority_pressure: 0,
        unknown_pressure: 0
      },
      corroboration_required: corroborationRequired,
      bundle_context_ready: true,
      evidence_ready: true,
      evidence_only: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      allowed_uses: [
        "future_equilibrium_bundle_context",
        "evidence_lane_context",
        "pressure_review_context",
        "corroboration_review"
      ],
      blocked_uses: [
        "authority_execution",
        "identity_creation",
        "movement_approval",
        "private_identity_exposure",
        "external_api_call_from_bridge",
        "payment_from_bridge",
        "real_world_execution_from_bridge"
      ],
      status: corroborationRequired
        ? "evidence_bundle_context_ready_needs_corroboration"
        : "evidence_bundle_context_ready"
    };

    state.packets.push(packet);
    return packet;
  }

  function receiveFromEvidenceLedger(input = {}, options = {}) {
    configure(options.deps || {});

    if (isReviewedEvidence(input)) {
      return buildBundleContext(
        input,
        options.reason || "REVIEWED_CORE_EVIDENCE_TO_BUNDLE_CONTEXT"
      );
    }

    if (
      !CoreEvidenceReviewLedger ||
      typeof CoreEvidenceReviewLedger.receiveFromNetBridge !== "function"
    ) {
      return hold(input, "CORE_EVIDENCE_REVIEW_LEDGER_NOT_AVAILABLE");
    }

    const reviewed = CoreEvidenceReviewLedger.receiveFromNetBridge(input, options);

    if (!isReviewedEvidence(reviewed)) {
      return hold(
        {
          input,
          reviewed
        },
        "CORE_EVIDENCE_LEDGER_DID_NOT_CREATE_REVIEWED_EVIDENCE"
      );
    }

    return buildBundleContext(
      reviewed,
      options.reason || "LEDGER_REVIEWED_EVIDENCE_TO_BUNDLE_CONTEXT"
    );
  }

  function canEnterBundle(packet = {}) {
    return Boolean(
      packet &&
      typeof packet === "object" &&
      (
        packet.status === "evidence_bundle_context_ready" ||
        packet.status === "evidence_bundle_context_ready_needs_corroboration"
      ) &&
      packet.bundle_context_ready === true &&
      packet.evidence_ready === true &&
      packet.evidence_only === true &&
      packet.authority_allowed === false &&
      packet.external_call_allowed === false &&
      packet.executed === false &&
      Array.isArray(packet.lanes) &&
      packet.lanes.includes(CORE_EVIDENCE_LANE)
    );
  }

  function canFormAuthorityBundle(packet = {}) {
    if (!canEnterBundle(packet)) {
      return false;
    }

    return false;
  }

  function peekPackets() {
    return clone(state.packets);
  }

  function pullNextPacket() {
    const next = state.packets.shift();

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
    CORE_EVIDENCE_LANE,
    configure,
    buildBundleContext,
    receiveFromEvidenceLedger,
    isReviewedEvidence,
    readEvidenceRecord,
    needsCorroboration,
    containsBlockedMaterial,
    canEnterBundle,
    canFormAuthorityBundle,
    peekPackets,
    pullNextPacket,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreEvidenceBundleBridge;
      }
