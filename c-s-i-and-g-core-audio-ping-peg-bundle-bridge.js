// c-s-i-and-g-core-audio-ping-peg-bundle-bridge.js
// CyberCrowd — Core Audio Ping Peg Bundle Bridge
//
// Owns:
// - receiving reviewed Core audio ping / peg evidence records
// - extracting Core evidence review results
// - sending audio ping / peg reviewed evidence toward the Core Evidence to Bundle Bridge
// - preserving audio provider evidence as evidence-only bundle context
// - keeping Spotify / Pandora / future audio evidence separate from authority
//
// Does NOT own:
// - authority execution
// - identity creation
// - movement approval
// - final Dewey classification
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

const CyberCrowdCoreAudioPingPegBundleBridge = (() => {
  const ACCEPTED_AUDIO_REVIEW_STATUS = "core_audio_ping_peg_evidence_reviewed_no_authority";

  const ACCEPTED_CORE_REVIEW_STATUSES = [
    "core_evidence_reviewed_no_authority",
    "core_evidence_review_ready_no_authority",
    "core_evidence_review_needs_corroboration_no_authority"
  ];

  const ACCEPTED_BUNDLE_CONTEXT_STATUSES = [
    "evidence_bundle_context_ready",
    "evidence_bundle_context_ready_needs_corroboration"
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
    bridged: [],
    held: [],
    rejected: []
  };

  let CoreAudioPingPegEvidenceReceiver = null;
  let CoreEvidenceBundleBridge = null;

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
    CoreAudioPingPegEvidenceReceiver =
      deps.CoreAudioPingPegEvidenceReceiver ||
      deps.coreAudioPingPegEvidenceReceiver ||
      deps.audioPingPegEvidenceReceiver ||
      CoreAudioPingPegEvidenceReceiver ||
      safeRequire("./c-s-i-and-g-core-audio-ping-peg-evidence-receiver.js") ||
      null;

    CoreEvidenceBundleBridge =
      deps.CoreEvidenceBundleBridge ||
      deps.coreEvidenceBundleBridge ||
      deps.evidenceBundleBridge ||
      CoreEvidenceBundleBridge ||
      safeRequire("./c-s-i-and-g-core-evidence-bundle-bridge.js") ||
      null;

    state.configured = Boolean(
      CoreAudioPingPegEvidenceReceiver ||
      CoreEvidenceBundleBridge
    );

    return {
      configured: state.configured,
      has_core_audio_ping_peg_evidence_receiver: Boolean(CoreAudioPingPegEvidenceReceiver),
      has_core_evidence_bundle_bridge: Boolean(CoreEvidenceBundleBridge)
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
      id: makeId("coreAudioPingPegBundleHold"),
      held_at: now(),
      reason,
      target: clone(target),
      provider_family: PROVIDER_FAMILY,
      evidence_bundle_context_ready: false,
      corroboration_required: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_audio_ping_peg_bundle_bridge"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreAudioPingPegBundleReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      provider_family: PROVIDER_FAMILY,
      evidence_bundle_context_ready: false,
      corroboration_required: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_audio_ping_peg_bundle_bridge"
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
      id: makeId("coreAudioPingPegBundleReceive"),
      received_at: now(),
      input: clone(input),
      provider_family: PROVIDER_FAMILY,
      evidence_bundle_context_ready: false,
      corroboration_required: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_audio_ping_peg_bundle_bridge"
    };

    state.received.push(record);
    return record;
  }

  function isReviewedAudioEvidence(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreAudioPingPegEvidenceReceiver &&
      typeof CoreAudioPingPegEvidenceReceiver.canEnterEvidenceBundleBridge === "function"
    ) {
      return CoreAudioPingPegEvidenceReceiver.canEnterEvidenceBundleBridge(input);
    }

    return (
      input.status === ACCEPTED_AUDIO_REVIEW_STATUS &&
      input.core_evidence_reviewed === true &&
      input.evidence_candidate_ready === true &&
      input.corroboration_required === true &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      input.core_review_result
    );
  }

  function readCoreReviewResult(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (ACCEPTED_CORE_REVIEW_STATUSES.includes(input.status)) {
      return input;
    }

    if (
      input.core_review_result &&
      ACCEPTED_CORE_REVIEW_STATUSES.includes(input.core_review_result.status)
    ) {
      return input.core_review_result;
    }

    if (
      CoreAudioPingPegEvidenceReceiver &&
      typeof CoreAudioPingPegEvidenceReceiver.readCoreReviewResult === "function"
    ) {
      return CoreAudioPingPegEvidenceReceiver.readCoreReviewResult(input);
    }

    return null;
  }

  function coreReviewLooksClean(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      ACCEPTED_CORE_REVIEW_STATUSES.includes(result.status) &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function readProvider(input = {}, review = {}) {
    const provider = cleanText(
      input.provider ||
      input.platform ||
      review.provider ||
      review.platform ||
      review.evidence_packet &&
      review.evidence_packet.provider ||
      review.evidence_packet &&
      review.evidence_packet.platform ||
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

  function readIntent(input = {}, review = {}) {
    return cleanText(
      input.intent ||
      review.intent ||
      review.evidence_packet &&
      review.evidence_packet.intent ||
      "ping_peg"
    );
  }

  function buildEvidenceBundlePacket(input = {}, review = {}, reason = "CORE_AUDIO_PING_PEG_EVIDENCE_TO_BUNDLE") {
    const provider = readProvider(input, review);
    const intent = readIntent(input, review);

    return {
      id: makeId("coreAudioPingPegEvidenceBundlePacket"),
      created_at: now(),
      source: "core_audio_ping_peg_bundle_bridge",
      reason,
      provider_family: PROVIDER_FAMILY,
      provider,
      platform: provider,
      intent,
      subject_hint:
        input.subject_hint ||
        review.subject_hint ||
        review.evidence_packet &&
        review.evidence_packet.subject_hint ||
        null,
      audio_evidence_review_id: input.id || null,
      core_review_result_id: review.id || null,
      reviewed_evidence: clone(review),
      original_audio_evidence_review: clone(input),
      evidence_kind: "audio_ping_peg_provider_result_stub",
      evidence_only: true,
      evidence_ready: true,
      bundle_context_ready: false,
      low_trust_provider_context: true,
      corroboration_required: true,
      allowed_future_use: [
        "core_evidence_bundle_bridge",
        "core_bundle_context_ledger",
        "corroboration_review",
        "future_equilibrium_bundle_context"
      ],
      blocked_current_use: [
        "authority_execution",
        "identity_creation",
        "movement_approval",
        "final_dewey_classification",
        "provider_execution",
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
      status: "core_audio_ping_peg_evidence_bundle_packet_no_authority"
    };
  }

  function bundleContextLooksReady(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      ACCEPTED_BUNDLE_CONTEXT_STATUSES.includes(result.status) &&
      result.bundle_context_ready === true &&
      result.evidence_ready === true &&
      result.evidence_only === true &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function callCoreEvidenceBundleBridge(packet = {}) {
    if (!CoreEvidenceBundleBridge) {
      return null;
    }

    if (typeof CoreEvidenceBundleBridge.receiveFromEvidenceLedger === "function") {
      return CoreEvidenceBundleBridge.receiveFromEvidenceLedger(packet);
    }

    if (typeof CoreEvidenceBundleBridge.buildBundleContext === "function") {
      return CoreEvidenceBundleBridge.buildBundleContext(packet);
    }

    if (typeof CoreEvidenceBundleBridge.receive === "function") {
      return CoreEvidenceBundleBridge.receive(packet);
    }

    if (typeof CoreEvidenceBundleBridge.review === "function") {
      return CoreEvidenceBundleBridge.review(packet);
    }

    return null;
  }

  function makeLocalBundleContext(packet = {}, reason = "LOCAL_AUDIO_EVIDENCE_BUNDLE_CONTEXT_PRESERVED") {
    return {
      id: makeId("coreAudioPingPegLocalBundleContext"),
      created_at: now(),
      source: "core_audio_ping_peg_bundle_bridge",
      reason,
      provider_family: PROVIDER_FAMILY,
      provider: packet.provider || "future_audio_platform",
      platform: packet.platform || packet.provider || "future_audio_platform",
      intent: packet.intent || "ping_peg",
      subject_hint: packet.subject_hint || null,
      reviewed_evidence: clone(packet.reviewed_evidence || null),
      evidence_packet: clone(packet),
      lanes: [
        "evidence_lane"
      ],
      evidence_only: true,
      evidence_ready: true,
      bundle_context_ready: true,
      low_trust_provider_context: true,
      corroboration_required: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "evidence_bundle_context_ready_needs_corroboration"
    };
  }

  function bridgeToBundleContext(input = {}, options = {}) {
    configure(options.deps || {});

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CORE_AUDIO_PING_PEG_BUNDLE_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_AUDIO_PING_PEG_BUNDLE_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!isReviewedAudioEvidence(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_AUDIO_PING_PEG_BUNDLE_REQUIRES_REVIEWED_AUDIO_EVIDENCE"
      );
    }

    const review = readCoreReviewResult(input);

    if (!review) {
      return hold(
        {
          received,
          input
        },
        "CORE_AUDIO_PING_PEG_BUNDLE_MISSING_CORE_REVIEW_RESULT"
      );
    }

    if (!coreReviewLooksClean(review)) {
      return hold(
        {
          received,
          input,
          review
        },
        "CORE_AUDIO_PING_PEG_BUNDLE_REVIEW_RESULT_NOT_CLEAN"
      );
    }

    if (containsBlockedMaterial(review)) {
      return hold(
        {
          received,
          input,
          review
        },
        "CORE_AUDIO_PING_PEG_BUNDLE_REVIEW_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const packet = buildEvidenceBundlePacket(
      input,
      review,
      options.reason || "CORE_AUDIO_PING_PEG_EVIDENCE_TO_BUNDLE"
    );

    if (containsBlockedMaterial(packet)) {
      return hold(
        {
          received,
          input,
          review,
          packet
        },
        "CORE_AUDIO_PING_PEG_BUNDLE_PACKET_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const bundleContext = callCoreEvidenceBundleBridge(packet);

    const normalizedContext = bundleContextLooksReady(bundleContext)
      ? bundleContext
      : makeLocalBundleContext(
          packet,
          bundleContext
            ? "CORE_EVIDENCE_BUNDLE_BRIDGE_RETURNED_UNSUPPORTED_STATUS_LOCAL_CONTEXT_PRESERVED"
            : "CORE_EVIDENCE_BUNDLE_BRIDGE_NOT_CALLABLE_LOCAL_CONTEXT_PRESERVED"
        );

    if (!bundleContextLooksReady(normalizedContext)) {
      return hold(
        {
          received,
          input,
          review,
          packet,
          bundleContext,
          normalizedContext
        },
        "CORE_AUDIO_PING_PEG_BUNDLE_DID_NOT_CREATE_CONTEXT"
      );
    }

    const bridged = {
      id: makeId("coreAudioPingPegBundleBridge"),
      bridged_at: now(),
      received_id: received.id,
      audio_evidence_review_id: input.id || null,
      core_review_result_id: review.id || null,
      provider_family: PROVIDER_FAMILY,
      provider: packet.provider,
      platform: packet.platform,
      intent: packet.intent,
      subject_hint: packet.subject_hint || null,
      evidence_bundle_packet: clone(packet),
      bundle_context: clone(normalizedContext),
      evidence_bundle_context_ready: true,
      evidence_only: true,
      low_trust_provider_context: true,
      corroboration_required: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "core_audio_ping_peg_bundle_context_ready_no_authority"
    };

    state.bridged.push(bridged);
    return bridged;
  }

  function receiveFromAudioEvidenceReceiver(input = {}, options = {}) {
    configure(options.deps || {});

    if (isReviewedAudioEvidence(input)) {
      return bridgeToBundleContext(input, options);
    }

    if (
      !CoreAudioPingPegEvidenceReceiver ||
      typeof CoreAudioPingPegEvidenceReceiver.receiveFromAudioCoreReturnBridge !== "function"
    ) {
      return hold(input, "CORE_AUDIO_PING_PEG_EVIDENCE_RECEIVER_NOT_AVAILABLE");
    }

    const reviewed = CoreAudioPingPegEvidenceReceiver.receiveFromAudioCoreReturnBridge(input, options);

    if (!isReviewedAudioEvidence(reviewed)) {
      return hold(
        {
          input,
          reviewed
        },
        "CORE_AUDIO_PING_PEG_EVIDENCE_RECEIVER_DID_NOT_CREATE_REVIEWED_EVIDENCE"
      );
    }

    return bridgeToBundleContext(reviewed, options);
  }

  function canEnterCoreBundleContextLedger(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === "core_audio_ping_peg_bundle_context_ready_no_authority" &&
      result.evidence_bundle_context_ready === true &&
      result.evidence_only === true &&
      result.low_trust_provider_context === true &&
      result.corroboration_required === true &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false &&
      result.bundle_context &&
      ACCEPTED_BUNDLE_CONTEXT_STATUSES.includes(result.bundle_context.status)
    );
  }

  function readBundleContext(result = {}) {
    if (!canEnterCoreBundleContextLedger(result)) {
      return null;
    }

    return clone(result.bundle_context);
  }

  function peekBridged() {
    return clone(state.bridged);
  }

  function pullNextBridged() {
    const next = state.bridged.shift();

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
    bridgeToBundleContext,
    receiveFromAudioEvidenceReceiver,
    buildEvidenceBundlePacket,
    isReviewedAudioEvidence,
    readCoreReviewResult,
    coreReviewLooksClean,
    readProvider,
    readIntent,
    bundleContextLooksReady,
    containsBlockedMaterial,
    canEnterCoreBundleContextLedger,
    readBundleContext,
    peekBridged,
    pullNextBridged,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreAudioPingPegBundleBridge;
}
