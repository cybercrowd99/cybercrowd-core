// c-s-i-and-g-core-evidence-review-ledger.js
// CyberCrowd — Core Evidence Review Ledger
// 
// Owns:
// - receiving evidence-candidate packets returned from NET
// - preserving provider outcome evidence as Core review material
// - checking evidence pressure without granting authority
// - separating evidence context from identity authority
// - holding weak, sensitive, unverified, or single-source evidence
// - creating Core evidence review records for later bundle consideration
//
// Does NOT own:
// - authority execution
// - identity creation
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

const CyberCrowdCoreEvidenceReviewLedger = (() => {
  const ACCEPTED_CORE_QUEUE_STATUS = "net_result_queued_for_core_evidence_review";
  const ACCEPTED_PACKET_STATUS = "net_result_core_evidence_candidate_ready";
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
    evidenceRecords: [],
    reviewed: [],
    held: [],
    rejected: []
  };

  let NetResultCoreBridge = null;
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
    NetResultCoreBridge =
      deps.NetResultCoreBridge ||
      deps.netResultCoreBridge ||
      deps.resultCoreBridge ||
      NetResultCoreBridge ||
      safeRequire("./c-s-i-and-g-net-result-core-bridge.js") ||
      null;

    PressureLedger =
      deps.PressureLedger ||
      deps.pressureLedger ||
      PressureLedger ||
      safeRequire("./c-s-i-and-g-pressure-ledger.js") ||
      null;

    state.configured = Boolean(NetResultCoreBridge || PressureLedger);

    return {
      configured: state.configured,
      has_net_result_core_bridge: Boolean(NetResultCoreBridge),
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

  function hold(target, reason) {
    const record = {
      id: makeId("coreEvidenceHold"),
      held_at: now(),
      reason,
      target: clone(target),
      evidence_ready: false,
      evidence_recorded: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_evidence_review_ledger"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreEvidenceReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      evidence_ready: false,
      evidence_recorded: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_evidence_review_ledger"
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
    const received = {
      id: makeId("coreEvidenceReceive"),
      received_at: now(),
      input: clone(input),
      evidence_ready: false,
      evidence_recorded: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_evidence_review_ledger"
    };

    state.received.push(received);
    return received;
  }

  function readPacket(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (input.status === ACCEPTED_PACKET_STATUS) {
      return input;
    }

    if (
      input.status === ACCEPTED_CORE_QUEUE_STATUS &&
      input.packet &&
      input.packet.status === ACCEPTED_PACKET_STATUS
    ) {
      return input.packet;
    }

    if (
      input.packet &&
      typeof input.packet === "object" &&
      input.packet.status === ACCEPTED_PACKET_STATUS
    ) {
      return input.packet;
    }

    if (
      input.result &&
      input.result.packet &&
      input.result.packet.status === ACCEPTED_PACKET_STATUS
    ) {
      return input.result.packet;
    }

    return null;
  }

  function isCoreEvidenceCandidate(input = {}) {
    const packet = readPacket(input);

    if (!packet || typeof packet !== "object") {
      return false;
    }

    if (
      NetResultCoreBridge &&
      typeof NetResultCoreBridge.canEnterCoreReview === "function" &&
      input.status === ACCEPTED_CORE_QUEUE_STATUS
    ) {
      return NetResultCoreBridge.canEnterCoreReview(input);
    }

    return (
      packet.status === ACCEPTED_PACKET_STATUS &&
      packet.core_ready === true &&
      packet.evidence_candidate === true &&
      packet.authority_allowed === false &&
      packet.external_call_allowed === false &&
      packet.executed === false &&
      Array.isArray(packet.lanes) &&
      packet.lanes.includes(CORE_EVIDENCE_LANE)
    );
  }

  function inspectPressure(packet = {}) {
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
        source: "core_evidence_review_ledger",
        reason: "CORE_EVIDENCE_CANDIDATE_PRESSURE_INSPECTION",
        signal: packet,
        signal_id: packet.id || null,
        lanes: packet.lanes || [CORE_EVIDENCE_LANE],
        attrs: packet.attrs || {
          evidence_pressure: 1,
          evidence_depth: true
        },
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

  function recordEvidence(input = {}, reason = "CORE_EVIDENCE_CANDIDATE_RECORDED") {
    configure();

    const received = recordReceived(input);
    const packet = readPacket(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CORE_EVIDENCE_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_EVIDENCE_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!isCoreEvidenceCandidate(input)) {
      return hold(
        {
          received,
          input,
          packet
        },
        "CORE_EVIDENCE_REQUIRES_NET_EVIDENCE_CANDIDATE"
      );
    }

    const pressureInspection = inspectPressure(packet);

    if (pressureNeedsHold(pressureInspection)) {
      return hold(
        {
          received,
          packet,
          pressureInspection
        },
        "CORE_EVIDENCE_PRESSURE_REQUIRES_HOLD"
      );
    }

    const evidenceRecord = {
      id: makeId("coreEvidenceRecord"),
      recorded_at: now(),
      reason,
      received_id: received.id,
      packet_id: packet.id || null,
      source_lane: packet.source_lane || "net_provider_result_context",
      target_lane: CORE_EVIDENCE_LANE,
      provider: packet.provider || null,
      outcome: packet.outcome || null,
      provider_result_id: packet.provider_result_id || null,
      provider_message_id: packet.provider_message_id || null,
      provider_reference: packet.provider_reference || null,
      source_pull_id: packet.source_pull_id || null,
      source_queue_id: packet.source_queue_id || null,
      source_envelope_id: packet.source_envelope_id || null,
      result_summary: clone(packet.result_summary || {}),
      safe_meta: clone(packet.safe_meta || {}),
      evidence_packet: clone(packet),
      pressure_inspection: clone(pressureInspection),
      lanes: [
        CORE_EVIDENCE_LANE
      ],
      attrs: {
        evidence_pressure: 1,
        evidence_depth: true,
        provider_result_depth: true,
        source_count: packet.attrs && packet.attrs.source_count || 1,
        identity_pressure: 0,
        movement_pressure: 0,
        authority_pressure: 0,
        unknown_pressure: 0
      },
      allowed_uses: [
        "evidence_review",
        "pressure_review",
        "future_bundle_context",
        "dewey_later_candidate_context"
      ],
      blocked_uses: [
        "authority_execution",
        "identity_creation",
        "private_identity_exposure",
        "credential_storage",
        "oauth",
        "external_api_call_from_evidence_ledger",
        "payment_from_evidence_ledger",
        "real_world_execution_from_evidence_ledger"
      ],
      evidence_ready: true,
      evidence_recorded: true,
      bundle_candidate: true,
      final_authority: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "core_evidence_candidate_recorded_no_authority"
    };

    state.evidenceRecords.push(evidenceRecord);
    return evidenceRecord;
  }

  function reviewEvidence(evidenceRecord = {}) {
    if (
      !evidenceRecord ||
      typeof evidenceRecord !== "object" ||
      evidenceRecord.status !== "core_evidence_candidate_recorded_no_authority"
    ) {
      return hold(evidenceRecord, "INVALID_CORE_EVIDENCE_RECORD_FOR_REVIEW");
    }

    if (containsBlockedMaterial(evidenceRecord)) {
      return hold(evidenceRecord, "CORE_EVIDENCE_REVIEW_BLOCKED_SENSITIVE_OR_000_MATERIAL");
    }

    const sourceCount =
      evidenceRecord.attrs &&
      Number(evidenceRecord.attrs.source_count || 0);

    const singleSource = sourceCount <= 1;

    const review = {
      id: makeId("coreEvidenceReview"),
      reviewed_at: now(),
      evidence_record_id: evidenceRecord.id,
      evidence_record: clone(evidenceRecord),
      review_notes: singleSource
        ? ["single_source_evidence_context_only"]
        : ["multi_source_evidence_context"],
      evidence_ready: true,
      evidence_recorded: true,
      bundle_candidate: true,
      needs_corroboration: singleSource,
      final_authority: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: singleSource
        ? "core_evidence_reviewed_needs_corroboration"
        : "core_evidence_reviewed_candidate_ready"
    };

    state.reviewed.push(review);
    return review;
  }

  function receiveFromNetBridge(input = {}, options = {}) {
    configure(options.deps || {});

    if (isCoreEvidenceCandidate(input)) {
      const evidence = recordEvidence(
        input,
        options.reason || "NET_RESULT_RETURNED_AS_CORE_EVIDENCE"
      );

      if (
        evidence &&
        typeof evidence === "object" &&
        evidence.status === "core_evidence_candidate_recorded_no_authority"
      ) {
        return reviewEvidence(evidence);
      }

      return evidence;
    }

    if (
      !NetResultCoreBridge ||
      typeof NetResultCoreBridge.receiveFromResultLedger !== "function"
    ) {
      return hold(input, "NET_RESULT_CORE_BRIDGE_NOT_AVAILABLE");
    }

    const queued = NetResultCoreBridge.receiveFromResultLedger(input, options);

    if (!isCoreEvidenceCandidate(queued)) {
      return hold(
        {
          input,
          queued
        },
        "NET_RESULT_CORE_BRIDGE_DID_NOT_CREATE_EVIDENCE_CANDIDATE"
      );
    }

    const evidence = recordEvidence(
      queued,
      options.reason || "BRIDGED_NET_RESULT_RECORDED_AS_CORE_EVIDENCE"
    );

    if (
      evidence &&
      typeof evidence === "object" &&
      evidence.status === "core_evidence_candidate_recorded_no_authority"
    ) {
      return reviewEvidence(evidence);
    }

    return evidence;
  }

  function canEnterBundleContext(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      (
        result.status === "core_evidence_reviewed_candidate_ready" ||
        result.status === "core_evidence_reviewed_needs_corroboration"
      ) &&
      result.evidence_ready === true &&
      result.evidence_recorded === true &&
      result.bundle_candidate === true &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function pullLatestReview() {
    const next = state.reviewed.shift();

    if (!next) {
      return null;
    }

    return clone(next);
  }

  function peekReviews() {
    return clone(state.reviewed);
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
    recordEvidence,
    reviewEvidence,
    receiveFromNetBridge,
    readPacket,
    isCoreEvidenceCandidate,
    inspectPressure,
    pressureNeedsHold,
    containsBlockedMaterial,
    canEnterBundleContext,
    pullLatestReview,
    peekReviews,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreEvidenceReviewLedger;
}
