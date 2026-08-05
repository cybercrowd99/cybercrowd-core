// c-s-i-and-g-core-corroborated-support-bridge.js
// CyberCrowd — Core Corroborated Support Bridge
// 
// Owns:
// - receiving corroborated Core evidence context
// - converting corroborated evidence into bundle-support context
// - sending corroborated evidence support back toward the Core Bundle Context Ledger
// - keeping corroborated evidence separate from authority execution
// - preventing single-source or pending evidence from supporting bundle formation
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

const CyberCrowdCoreCorroboratedSupportBridge = (() => {
  const ACCEPTED_CORROBORATED_STATUS = "core_evidence_context_corroborated_no_authority";
  const ACCEPTED_CONTEXT_LEDGER_STATUS = "core_bundle_context_recorded_no_authority";
  const REQUIRED_UNIQUE_SOURCES = 2;

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
    support: [],
    recorded: [],
    held: [],
    rejected: []
  };

  let CoreCorroborationLedger = null;
  let CoreBundleContextLedger = null;

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
    CoreCorroborationLedger =
      deps.CoreCorroborationLedger ||
      deps.coreCorroborationLedger ||
      deps.corroborationLedger ||
      CoreCorroborationLedger ||
      safeRequire("./c-s-i-and-g-core-corroboration-ledger.js") ||
      null;

    CoreBundleContextLedger =
      deps.CoreBundleContextLedger ||
      deps.coreBundleContextLedger ||
      deps.bundleContextLedger ||
      CoreBundleContextLedger ||
      safeRequire("./c-s-i-and-g-core-bundle-context-ledger.js") ||
      null;

    state.configured = Boolean(
      CoreCorroborationLedger ||
      CoreBundleContextLedger
    );

    return {
      configured: state.configured,
      has_core_corroboration_ledger: Boolean(CoreCorroborationLedger),
      has_core_bundle_context_ledger: Boolean(CoreBundleContextLedger)
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
      id: makeId("coreCorroboratedSupportHold"),
      held_at: now(),
      reason,
      target: clone(target),
      corroborated_support_ready: false,
      context_ledger_recorded: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_corroborated_support_bridge"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreCorroboratedSupportReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      corroborated_support_ready: false,
      context_ledger_recorded: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_corroborated_support_bridge"
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
      id: makeId("coreCorroboratedSupportReceive"),
      received_at: now(),
      input: clone(input),
      corroborated_support_ready: false,
      context_ledger_recorded: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_corroborated_support_bridge"
    };

    state.received.push(record);
    return record;
  }

  function isCorroboratedSupport(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreCorroborationLedger &&
      typeof CoreCorroborationLedger.canSupportBundle === "function"
    ) {
      return CoreCorroborationLedger.canSupportBundle(input);
    }

    return Boolean(
      input.status === ACCEPTED_CORROBORATED_STATUS &&
      input.corroborated === true &&
      input.evidence_support_ready === true &&
      input.evidence_only === true &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      Number(input.unique_source_count || 0) >= REQUIRED_UNIQUE_SOURCES
    );
  }

  function readCorroboratedSupport(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (isCorroboratedSupport(input)) {
      return input;
    }

    if (
      CoreCorroborationLedger &&
      typeof CoreCorroborationLedger.readCorroboratedSupport === "function"
    ) {
      return CoreCorroborationLedger.readCorroboratedSupport(input);
    }

    return null;
  }

  function readLane(input = {}) {
    return cleanText(input.lane || "evidence_lane") || "evidence_lane";
  }

  function readIntent(input = {}) {
    return cleanText(input.intent || "corroborated_evidence_support");
  }

  function readSubject(input = {}) {
    return cleanText(input.subject_hint || "unknown_subject");
  }

  function buildSupportPacket(corroborated = {}, reason = "CORE_CORROBORATED_SUPPORT_TO_CONTEXT_LEDGER") {
    const lane = readLane(corroborated);
    const intent = readIntent(corroborated);
    const subject = readSubject(corroborated);

    return {
      id: makeId("coreCorroboratedSupportPacket"),
      created_at: now(),
      source: "core_corroborated_support_bridge",
      reason,
      lane,
      intent,
      subject_hint: subject,
      group_key: corroborated.group_key || null,
      corroborated_record_id: corroborated.id || null,
      unique_source_count: Number(corroborated.unique_source_count || 0),
      unique_provider_count: Number(corroborated.unique_provider_count || 0),
      unique_sources: clone(corroborated.unique_sources || []),
      unique_providers: clone(corroborated.unique_providers || []),
      provider_families: clone(corroborated.provider_families || []),
      sources: clone(corroborated.sources || []),
      corroborated_context: clone(corroborated),
      lanes: [
        "evidence_lane"
      ],
      attrs: {
        evidence_pressure: 1,
        corroborated_evidence_pressure: 1,
        corroboration_count: Number(corroborated.unique_source_count || 0),
        corroborated: true,
        low_trust_provider_context: false,
        single_source_hold: false
      },
      evidence_only: true,
      evidence_support_ready: true,
      bundle_context_ready: true,
      corroborated: true,
      corroboration_pending: false,
      single_source_hold: false,
      allowed_future_use: [
        "core_bundle_context_ledger",
        "core_bundle_context_candidate_support",
        "lane_balance_review",
        "future_equilibrium_bundle_context"
      ],
      blocked_current_use: [
        "authority_execution",
        "identity_creation",
        "movement_approval",
        "final_dewey_classification",
        "provider_execution",
        "external_api_call_from_corroborated_support_bridge",
        "payment",
        "real_world_execution"
      ],
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "core_corroborated_support_packet_no_authority"
    };
  }

  function contextLedgerLooksRecorded(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === ACCEPTED_CONTEXT_LEDGER_STATUS &&
      result.bundle_context_ready === true &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function callCoreBundleContextLedger(packet = {}) {
    if (!CoreBundleContextLedger) {
      return null;
    }

    if (typeof CoreBundleContextLedger.addContext === "function") {
      return CoreBundleContextLedger.addContext(
        packet,
        "CORROBORATED_EVIDENCE_SUPPORT_RECORDED"
      );
    }

    if (typeof CoreBundleContextLedger.receiveFromEvidenceBridge === "function") {
      return CoreBundleContextLedger.receiveFromEvidenceBridge(packet);
    }

    if (typeof CoreBundleContextLedger.receive === "function") {
      return CoreBundleContextLedger.receive(packet);
    }

    if (typeof CoreBundleContextLedger.record === "function") {
      return CoreBundleContextLedger.record(packet);
    }

    return null;
  }

  function makeLocalContextLedgerRecord(packet = {}, reason = "LOCAL_CORROBORATED_SUPPORT_CONTEXT_PRESERVED") {
    return {
      id: makeId("coreCorroboratedSupportLocalContext"),
      recorded_at: now(),
      source: "core_corroborated_support_bridge",
      reason,
      lane: "evidence_lane",
      context_type: "corroborated_evidence_support",
      context: clone(packet),
      attrs: clone(packet.attrs || {}),
      lanes: [
        "evidence_lane"
      ],
      evidence_only: true,
      evidence_support_ready: true,
      bundle_context_ready: true,
      corroborated: true,
      corroboration_pending: false,
      single_source_hold: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: ACCEPTED_CONTEXT_LEDGER_STATUS
    };
  }

  function bridgeSupport(input = {}, options = {}) {
    configure(options.deps || {});

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CORE_CORROBORATED_SUPPORT_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_CORROBORATED_SUPPORT_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const corroborated = readCorroboratedSupport(input);

    if (!corroborated) {
      return hold(
        {
          received,
          input
        },
        "CORE_CORROBORATED_SUPPORT_REQUIRES_CORROBORATED_RECORD"
      );
    }

    if (!isCorroboratedSupport(corroborated)) {
      return hold(
        {
          received,
          input,
          corroborated
        },
        "CORE_CORROBORATED_SUPPORT_RECORD_NOT_READY"
      );
    }

    if (containsBlockedMaterial(corroborated)) {
      return hold(
        {
          received,
          input,
          corroborated
        },
        "CORE_CORROBORATED_SUPPORT_RECORD_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const packet = buildSupportPacket(
      corroborated,
      options.reason || "CORE_CORROBORATED_SUPPORT_TO_CONTEXT_LEDGER"
    );

    if (containsBlockedMaterial(packet)) {
      return hold(
        {
          received,
          input,
          corroborated,
          packet
        },
        "CORE_CORROBORATED_SUPPORT_PACKET_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const ledgerResult = callCoreBundleContextLedger(packet);

    const normalizedLedger = contextLedgerLooksRecorded(ledgerResult)
      ? ledgerResult
      : makeLocalContextLedgerRecord(
          packet,
          ledgerResult
            ? "CORE_BUNDLE_CONTEXT_LEDGER_RETURNED_UNSUPPORTED_STATUS_LOCAL_CORROBORATED_CONTEXT"
            : "CORE_BUNDLE_CONTEXT_LEDGER_NOT_CALLABLE_LOCAL_CORROBORATED_CONTEXT"
        );

    if (!contextLedgerLooksRecorded(normalizedLedger)) {
      return hold(
        {
          received,
          input,
          corroborated,
          packet,
          ledgerResult,
          normalizedLedger
        },
        "CORE_CORROBORATED_SUPPORT_CONTEXT_LEDGER_DID_NOT_RECORD"
      );
    }

    const bridged = {
      id: makeId("coreCorroboratedSupportBridge"),
      bridged_at: now(),
      received_id: received.id,
      corroborated_record_id: corroborated.id || null,
      context_ledger_record_id: normalizedLedger.id || null,
      group_key: corroborated.group_key || null,
      lane: packet.lane,
      intent: packet.intent,
      subject_hint: packet.subject_hint,
      unique_source_count: packet.unique_source_count,
      unique_provider_count: packet.unique_provider_count,
      support_packet: clone(packet),
      context_ledger_result: clone(normalizedLedger),
      corroborated_support_ready: true,
      context_ledger_recorded: true,
      evidence_only: true,
      evidence_support_ready: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "core_corroborated_support_recorded_no_authority"
    };

    state.support.push(bridged);
    state.recorded.push(bridged);
    return bridged;
  }

  function receiveFromCorroborationLedger(input = {}, options = {}) {
    configure(options.deps || {});

    if (isCorroboratedSupport(input)) {
      return bridgeSupport(input, options);
    }

    if (
      !CoreCorroborationLedger ||
      typeof CoreCorroborationLedger.receiveFromAudioContextLedgerBridge !== "function"
    ) {
      return hold(input, "CORE_CORROBORATION_LEDGER_NOT_AVAILABLE");
    }

    const corroborated = CoreCorroborationLedger.receiveFromAudioContextLedgerBridge(input, options);

    if (!isCorroboratedSupport(corroborated)) {
      return hold(
        {
          input,
          corroborated
        },
        "CORE_CORROBORATION_LEDGER_DID_NOT_CREATE_CORROBORATED_SUPPORT"
      );
    }

    return bridgeSupport(corroborated, options);
  }

  function canEnterBundleCandidateBuild(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === "core_corroborated_support_recorded_no_authority" &&
      result.corroborated_support_ready === true &&
      result.context_ledger_recorded === true &&
      result.evidence_support_ready === true &&
      result.evidence_only === true &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false &&
      result.context_ledger_result &&
      result.context_ledger_result.status === ACCEPTED_CONTEXT_LEDGER_STATUS
    );
  }

  function readContextLedgerResult(result = {}) {
    if (!canEnterBundleCandidateBuild(result)) {
      return null;
    }

    return clone(result.context_ledger_result);
  }

  function peekSupport() {
    return clone(state.support);
  }

  function peekRecorded() {
    return clone(state.recorded);
  }

  function pullNextSupport() {
    const next = state.support.shift();

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
    REQUIRED_UNIQUE_SOURCES,
    configure,
    bridgeSupport,
    receiveFromCorroborationLedger,
    buildSupportPacket,
    isCorroboratedSupport,
    readCorroboratedSupport,
    contextLedgerLooksRecorded,
    containsBlockedMaterial,
    canEnterBundleCandidateBuild,
    readContextLedgerResult,
    peekSupport,
    peekRecorded,
    pullNextSupport,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreCorroboratedSupportBridge;
}
