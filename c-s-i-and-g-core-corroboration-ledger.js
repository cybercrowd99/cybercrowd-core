// c-s-i-and-g-core-corroboration-ledger.js
// CyberCrowd — Core Corroboration Ledger
//
// Owns:
// - receiving low-trust Core evidence lane context records
// - grouping evidence by provider / intent / subject / context target
// - holding single-source evidence until corroborated
// - marking multi-source evidence as corroborated support
// - keeping corroboration separate from authority, identity, movement, and final classification
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

const CyberCrowdCoreCorroborationLedger = (() => {
  const ACCEPTED_CONTEXT_LEDGER_STATUS = "core_bundle_context_recorded_no_authority";
  const ACCEPTED_AUDIO_CONTEXT_STATUS = "core_audio_ping_peg_context_recorded_no_authority";

  const ACCEPTED_INPUT_STATUSES = [
    ACCEPTED_CONTEXT_LEDGER_STATUS,
    ACCEPTED_AUDIO_CONTEXT_STATUS
  ];

  const CORROBORATED_STATUS = "core_evidence_context_corroborated_no_authority";
  const PENDING_STATUS = "core_evidence_context_corroboration_pending_no_authority";

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
    groups: {},
    pending: [],
    corroborated: [],
    held: [],
    rejected: []
  };

  let CoreBundleContextLedger = null;
  let CoreAudioPingPegContextLedgerBridge = null;

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

    CoreAudioPingPegContextLedgerBridge =
      deps.CoreAudioPingPegContextLedgerBridge ||
      deps.coreAudioPingPegContextLedgerBridge ||
      deps.audioPingPegContextLedgerBridge ||
      CoreAudioPingPegContextLedgerBridge ||
      safeRequire("./c-s-i-and-g-core-audio-ping-peg-context-ledger-bridge.js") ||
      null;

    state.configured = Boolean(
      CoreBundleContextLedger ||
      CoreAudioPingPegContextLedgerBridge
    );

    return {
      configured: state.configured,
      has_core_bundle_context_ledger: Boolean(CoreBundleContextLedger),
      has_core_audio_ping_peg_context_ledger_bridge: Boolean(CoreAudioPingPegContextLedgerBridge)
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

  function normalizeLaneList(lanes) {
    if (!lanes) {
      return [];
    }

    if (Array.isArray(lanes)) {
      return lanes.map((lane) => cleanText(lane)).filter(Boolean);
    }

    return [cleanText(lanes)].filter(Boolean);
  }

  function hold(target, reason) {
    const record = {
      id: makeId("coreCorroborationHold"),
      held_at: now(),
      reason,
      target: clone(target),
      corroborated: false,
      corroboration_pending: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_corroboration_ledger"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreCorroborationReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      corroborated: false,
      corroboration_pending: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_corroboration_ledger"
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
      id: makeId("coreCorroborationReceive"),
      received_at: now(),
      input: clone(input),
      corroborated: false,
      corroboration_pending: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_corroboration_ledger"
    };

    state.received.push(record);
    return record;
  }

  function isContextLedgerRecord(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreAudioPingPegContextLedgerBridge &&
      typeof CoreAudioPingPegContextLedgerBridge.canEnterBundleCandidateReview === "function" &&
      CoreAudioPingPegContextLedgerBridge.canEnterBundleCandidateReview(input)
    ) {
      return true;
    }

    return Boolean(
      ACCEPTED_INPUT_STATUSES.includes(input.status) &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false
    );
  }

  function readContext(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (
      input.context_ledger_result &&
      input.context_ledger_result.status === ACCEPTED_CONTEXT_LEDGER_STATUS
    ) {
      return input.context_ledger_result;
    }

    if (input.status === ACCEPTED_CONTEXT_LEDGER_STATUS) {
      return input;
    }

    if (input.context && typeof input.context === "object") {
      return input.context;
    }

    if (input.bundle_context && typeof input.bundle_context === "object") {
      return input.bundle_context;
    }

    return input;
  }

  function contextLooksClean(context = {}) {
    return Boolean(
      context &&
      typeof context === "object" &&
      context.authority_allowed === false &&
      context.external_call_allowed === false &&
      context.executed === false
    );
  }

  function readProvider(input = {}, context = {}) {
    const provider = cleanText(
      input.provider ||
      input.platform ||
      context.provider ||
      context.platform ||
      context.context &&
      context.context.provider ||
      context.context &&
      context.context.platform ||
      context.evidence_packet &&
      context.evidence_packet.provider ||
      context.evidence_packet &&
      context.evidence_packet.platform ||
      "unknown_provider"
    );

    if (provider.includes("spotify")) {
      return "spotify";
    }

    if (provider.includes("pandora")) {
      return "pandora";
    }

    if (provider.includes("smart") && provider.includes("ring")) {
      return "smart_ring";
    }

    if (provider.includes("phone")) {
      return "phone_edge";
    }

    return provider || "unknown_provider";
  }

  function readIntent(input = {}, context = {}) {
    return cleanText(
      input.intent ||
      context.intent ||
      context.context &&
      context.context.intent ||
      context.evidence_packet &&
      context.evidence_packet.intent ||
      "unknown_intent"
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
      context.evidence_packet &&
      context.evidence_packet.subject_hint ||
      "unknown_subject"
    );
  }

  function readLane(input = {}, context = {}) {
    const lanes = [
      ...normalizeLaneList(input.lanes),
      ...normalizeLaneList(context.lanes),
      ...normalizeLaneList(context.context && context.context.lanes)
    ];

    if (lanes.includes("evidence_lane")) {
      return "evidence_lane";
    }

    return lanes[0] || "evidence_lane";
  }

  function readSourceId(input = {}, context = {}) {
    return cleanText(
      input.id ||
      input.audio_bundle_bridge_id ||
      input.audio_evidence_review_id ||
      input.core_review_result_id ||
      input.bundle_context_id ||
      context.id ||
      context.received_id ||
      context.source_context_id ||
      context.context &&
      context.context.id ||
      makeId("unknownSource")
    );
  }

  function readSourceFamily(input = {}, context = {}) {
    return cleanText(
      input.provider_family ||
      context.provider_family ||
      context.context &&
      context.context.provider_family ||
      context.evidence_kind ||
      "general_evidence_context"
    );
  }

  function groupKeyFor(input = {}, context = {}) {
    const lane = readLane(input, context);
    const intent = readIntent(input, context);
    const subject = readSubject(input, context);

    return [
      lane,
      intent,
      subject
    ].join("::");
  }

  function buildSourceSummary(input = {}, context = {}) {
    return {
      id: readSourceId(input, context),
      provider: readProvider(input, context),
      provider_family: readSourceFamily(input, context),
      intent: readIntent(input, context),
      subject_hint: readSubject(input, context),
      lane: readLane(input, context),
      low_trust_provider_context: Boolean(
        input.low_trust_provider_context ||
        context.low_trust_provider_context ||
        context.context &&
        context.context.low_trust_provider_context
      ),
      corroboration_required: Boolean(
        input.corroboration_required ||
        context.corroboration_required ||
        context.context &&
        context.context.corroboration_required
      )
    };
  }

  function uniqueValues(items
