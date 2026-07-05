// c-s-i-and-g-core-audio-ping-peg-evidence-receiver.js
// CyberCrowd — Core Audio Ping Peg Evidence Receiver
//
// Owns:
// - receiving NET-returned audio ping / peg evidence candidate records
// - validating Spotify / Pandora / future audio provider evidence candidates
// - sending clean audio ping / peg candidates into the Core Evidence Review Ledger
// - preserving audio evidence review trail without authority
// - keeping provider ping / peg evidence separate from identity, movement, and authority
//
// Does NOT own:
// - Spotify API calls
// - Pandora API calls
// - provider OAuth
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
// - authority execution
// - final Dewey classification

const CyberCrowdCoreAudioPingPegEvidenceReceiver = (() => {
  const ACCEPTED_AUDIO_CORE_RETURN_STATUS = "audio_ping_peg_returned_to_core_evidence_candidate_no_authority";

  const ACCEPTED_CORE_CANDIDATE_STATUSES = [
    "net_result_to_core_evidence_candidate_ready",
    "net_result_core_bridge_ready_no_authority",
    "core_evidence_candidate_ready_no_authority"
  ];

  const ACCEPTED_CORE_REVIEW_STATUSES = [
    "core_evidence_reviewed_no_authority",
    "core_evidence_review_ready_no_authority",
    "core_evidence_review_needs_corroboration_no_authority"
  ];

  const PROVIDER_FAMILY = "audio_platform_ping_peg";

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
    reviewed: [],
    held: [],
    rejected: []
  };

  let AudioPingPegCoreReturnBridge = null;
  let CoreEvidenceReviewLedger = null;

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
    AudioPingPegCoreReturnBridge =
      deps.AudioPingPegCoreReturnBridge ||
      deps.audioPingPegCoreReturnBridge ||
      deps.audioCoreReturnBridge ||
      AudioPingPegCoreReturnBridge ||
      safeRequire("./c-s-i-and-g-net-audio-ping-peg-core-return-bridge.js") ||
      null;

    CoreEvidenceReviewLedger =
      deps.CoreEvidenceReviewLedger ||
      deps.coreEvidenceReviewLedger ||
      deps.evidenceReviewLedger ||
      CoreEvidenceReviewLedger ||
      safeRequire("./c-s-i-and-g-core-evidence-review-ledger.js") ||
      null;

    state.configured = Boolean(
      AudioPingPegCoreReturnBridge ||
      CoreEvidenceReviewLedger
    );

    return {
      configured: state.configured,
      has_audio_ping_peg_core_return_bridge: Boolean(AudioPingPegCoreReturnBridge),
      has_core_evidence_review_ledger: Boolean(CoreEvidenceReviewLedger)
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

  function hold(target, reason) {
    const record = {
      id: makeId("coreAudioPingPegEvidenceHold"),
      held_at: now(),
      reason,
      target: clone(target),
      provider_family: PROVIDER_FAMILY,
      core_evidence_reviewed: false,
      evidence_candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_audio_ping_peg_evidence_receiver"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreAudioPingPegEvidenceReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      provider_family: PROVIDER_FAMILY,
      core_evidence_reviewed: false,
      evidence_candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_audio_ping_peg_evidence_receiver"
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
      id: makeId("coreAudioPingPegEvidenceReceive"),
      received_at: now(),
      input: clone(input),
      provider_family: PROVIDER_FAMILY,
      core_evidence_reviewed: false,
      evidence_candidate_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_audio_ping_peg_evidence_receiver"
    };

    state.received.push(record);
    return record;
  }

  function isAudioCoreReturn(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      AudioPingPegCoreReturnBridge &&
      typeof AudioPingPegCoreReturnBridge.canEnterCoreEvidenceReview === "function"
    ) {
      return AudioPingPegCoreReturnBridge.canEnterCoreEvidenceReview(input);
    }

    return (
      input.status === ACCEPTED_AUDIO_CORE_RETURN_STATUS &&
      input.core_return_ready === true &&
      input.evidence_candidate_ready === true &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      input.net_result_core_bridge_result
    );
  }

  function readCoreEvidenceCandidate(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (ACCEPTED_CORE_CANDIDATE_STATUSES.includes(input.status)) {
      return input;
    }

    if (
      input.net_result_core_bridge_result &&
      ACCEPTED_CORE_CANDIDATE_STATUSES.includes(input.net_result_core_bridge_result.status)
    ) {
      return input.net_result_core_bridge_result;
    }

    if (
      AudioPingPegCoreReturnBridge &&
      typeof AudioPingPegCoreReturnBridge.readCoreEvidenceCandidate === "function"
    ) {
      return AudioPingPegCoreReturnBridge.readCoreEvidenceCandidate(input);
    }

    return null;
  }

  function candidateLooksClean(candidate = {}) {
    return Boolean(
      candidate &&
      typeof candidate === "object" &&
      ACCEPTED_CORE_CANDIDATE_STATUSES.includes(candidate.status) &&
      candidate.authority_allowed === false &&
      candidate.external_call_allowed === false &&
      candidate.executed === false
    );
  }

  function readProvider(input = {}, candidate = {}) {
    const provider = cleanText(
      input.provider ||
      input.platform ||
      candidate.provider ||
      candidate.platform ||
      candidate.core_return_packet &&
      candidate.core_return_packet.provider ||
      candidate.core_return_packet &&
      candidate.core_return_packet.platform ||
      "future_audio_platform"
    );

    if (provider.includes("spotify")) {
      return "spotify";
    }

    if (provider.includes("pandora")) {
      return "pandora";
    }

    return provider || "future_audio_platform";
  }

  function readIntent(input = {}, candidate = {}) {
    return cleanText(
      input.intent ||
      candidate.intent ||
      candidate.core_return_packet &&
      candidate.core_return_packet.intent ||
      "ping_peg"
    );
  }

  function buildEvidenceReviewPacket(input = {}, candidate = {}, reason = "CORE_AUDIO_PING_PEG_EVIDENCE_REVIEW") {
    const provider = readProvider(input, candidate);
    const intent = readIntent(input, candidate);

    return {
      id: makeId("coreAudioPingPegEvidencePacket"),
      created_at: now(),
      source: "core_audio_ping_peg_evidence_receiver",
      reason,
      provider_family: PROVIDER_FAMILY,
      provider,
      platform: provider,
      intent,
      subject_hint:
        input.subject_hint ||
        candidate.subject_hint ||
        candidate.core_return_packet &&
        candidate.core_return_packet.subject_hint ||
        null,
      audio_core_return_id: input.id || null,
      core_evidence_candidate_id: candidate.id || null,
      core_evidence_candidate: clone(candidate),
      original_audio_return: clone(input),
      retrieval_performed: false,
      evidence_kind: "audio_ping_peg_provider_result_stub",
      confidence_level: "low_trust_provider_context",
      corroboration_required: true,
      evidence_candidate_ready: true,
      allowed_future_use: [
        "core_evidence_review",
        "core_evidence_bundle_bridge",
        "core_bundle_context_ledger",
        "corroboration_review"
      ],
      blocked_current_use: [
        "authority_execution",
        "identity_creation",
        "movement_approval",
        "final_dewey_classification",
        "direct_spotify_api_call",
        "direct_pandora_api_call",
        "direct_provider_api_call",
        "oauth",
        "credential_storage",
        "token_storage",
        "scraping",
        "session_use",
        "cookie_use",
        "kv_write",
        "payment",
        "real_world_execution"
      ],
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "core_audio_ping_peg_evidence_packet_no_authority"
    };
  }

  function coreReviewLooksReady(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      (
        ACCEPTED_CORE_REVIEW_STATUSES.includes(result.status) ||
        result.status === "core_evidence_reviewed_no_authority" ||
        result.status === "core_evidence_review_needs_corroboration_no_authority"
      ) &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function callCoreEvidenceReviewLedger(packet = {}) {
    if (!CoreEvidenceReviewLedger) {
      return null;
    }

    if (typeof CoreEvidenceReviewLedger.review === "function") {
      return CoreEvidenceReviewLedger.review(packet);
    }

    if (typeof CoreEvidenceReviewLedger.receive === "function") {
      return CoreEvidenceReviewLedger.receive(packet);
    }

    if (typeof CoreEvidenceReviewLedger.record === "function") {
      return CoreEvidenceReviewLedger.record(packet);
    }

    if (typeof CoreEvidenceReviewLedger.accept === "function") {
      return CoreEvidenceReviewLedger.accept(packet);
    }

    if (typeof CoreEvidenceReviewLedger.receiveFromNetResultCoreBridge === "function") {
      return CoreEvidenceReviewLedger.receiveFromNetResultCoreBridge(packet);
    }

    return null;
  }

  function makeLocalReview(packet = {}, reason = "LOCAL_AUDIO_EVIDENCE_REVIEW_PRESERVED") {
    return {
      id: makeId("coreAudioPingPegLocalEvidenceReview"),
      reviewed_at: now(),
      source: "core_audio_ping_peg_evidence_receiver",
      reason,
      provider_family: PROVIDER_FAMILY,
      provider: packet.provider || "future_audio_platform",
      platform: packet.platform || packet.provider || "future_audio_platform",
      intent: packet.intent || "ping_peg",
      subject_hint: packet.subject_hint || null,
      evidence_packet: clone(packet),
      evidence_candidate_ready: true,
      evidence_reviewed: true,
      corroboration_required: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "core_evidence_review_needs_corroboration_no_authority"
    };
  }

  function receiveEvidence(input = {}, options = {}) {
    configure(options.deps || {});

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CORE_AUDIO_PING_PEG_EVIDENCE_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_AUDIO_PING_PEG_EVIDENCE_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!isAudioCoreReturn(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_AUDIO_PING_PEG_EVIDENCE_REQUIRES_AUDIO_CORE_RETURN"
      );
    }

    const candidate = readCoreEvidenceCandidate(input);

    if (!candidate) {
      return hold(
        {
          received,
          input
        },
        "CORE_AUDIO_PING_PEG_EVIDENCE_MISSING_CORE_EVIDENCE_CANDIDATE"
      );
    }

    if (!candidateLooksClean(candidate)) {
      return hold(
        {
          received,
          input,
          candidate
        },
        "CORE_AUDIO_PING_PEG_EVIDENCE_CANDIDATE_NOT_CLEAN"
      );
    }

    if (containsBlockedMaterial(candidate)) {
      return hold(
        {
          received,
          input,
          candidate
        },
        "CORE_AUDIO_PING_PEG_EVIDENCE_CANDIDATE_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const packet = buildEvidenceReviewPacket(
      input,
      candidate,
      options.reason || "CORE_AUDIO_PING_PEG_EVIDENCE_REVIEW"
    );

    if (containsBlockedMaterial(packet)) {
      return hold(
        {
          received,
          input,
          candidate,
          packet
        },
        "CORE_AUDIO_PING_PEG_EVIDENCE_PACKET_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const reviewResult = callCoreEvidenceReviewLedger(packet);

    const normalizedReview = coreReviewLooksReady(reviewResult)
      ? reviewResult
      : makeLocalReview(
          packet,
          reviewResult
            ? "CORE_EVIDENCE_REVIEW_LEDGER_RETURNED_UNSUPPORTED_STATUS_LOCAL_REVIEW_PRESERVED"
            : "CORE_EVIDENCE_REVIEW_LEDGER_NOT_CALLABLE_LOCAL_REVIEW_PRESERVED"
        );

    if (!coreReviewLooksReady(normalizedReview)) {
      return hold(
        {
          received,
          input,
          candidate,
          packet,
          reviewResult,
          normalizedReview
        },
        "CORE_AUDIO_PING_PEG_EVIDENCE_REVIEW_DID_NOT_ACCEPT"
      );
    }

    const reviewed = {
      id: makeId("coreAudioPingPegEvidenceReview"),
      reviewed_at: now(),
      received_id: received.id,
      audio_core_return_id: input.id || null,
      core_evidence_candidate_id: candidate.id || null,
      provider_family: PROVIDER_FAMILY,
      provider: packet.provider,
      platform: packet.platform,
      intent: packet.intent,
      subject_hint: packet.subject_hint || null,
      evidence_packet: clone(packet),
      core_review_result: clone(normalizedReview),
      core_evidence_reviewed: true,
      evidence_candidate_ready: true,
      corroboration_required: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "core_audio_ping_peg_evidence_reviewed_no_authority"
    };

    state.reviewed.push(reviewed);
    return reviewed;
  }

  function receiveFromAudioCoreReturnBridge(input = {}, options = {}) {
    configure(options.deps || {});

    if (isAudioCoreReturn(input)) {
      return receiveEvidence(input, options);
    }

    if (
      !AudioPingPegCoreReturnBridge ||
      typeof AudioPingPegCoreReturnBridge.receiveFromResultLedgerBridge !== "function"
    ) {
      return hold(input, "AUDIO_PING_PEG_CORE_RETURN_BRIDGE_NOT_AVAILABLE");
    }

    const returned = AudioPingPegCoreReturnBridge.receiveFromResultLedgerBridge(input, options);

    if (!isAudioCoreReturn(returned)) {
      return hold(
        {
          input,
          returned
        },
        "AUDIO_PING_PEG_CORE_RETURN_BRIDGE_DID_NOT_CREATE_CORE_RETURN"
      );
    }

    return receiveEvidence(returned, options);
  }

  function canEnterEvidenceBundleBridge(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === "core_audio_ping_peg_evidence_reviewed_no_authority" &&
      result.core_evidence_reviewed === true &&
      result.evidence_candidate_ready === true &&
      result.corroboration_required === true &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false &&
      result.core_review_result
    );
  }

  function readCoreReviewResult(result = {}) {
    if (!canEnterEvidenceBundleBridge(result)) {
      return null;
    }

    return clone(result.core_review_result);
  }

  function peekReviewed() {
    return clone(state.reviewed);
  }

  function pullNextReviewed() {
    const next = state.reviewed.shift();

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
    PROVIDER_FAMILY,
    configure,
    receiveEvidence,
    receiveFromAudioCoreReturnBridge,
    buildEvidenceReviewPacket,
    isAudioCoreReturn,
    readCoreEvidenceCandidate,
    candidateLooksClean,
    readProvider,
    readIntent,
    coreReviewLooksReady,
    containsBlockedMaterial,
    canEnterEvidenceBundleBridge,
    readCoreReviewResult,
    peekReviewed,
    pullNextReviewed,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreAudioPingPegEvidenceReceiver;
}
