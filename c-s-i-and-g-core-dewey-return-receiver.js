// c-s-i-and-g-core-dewey-return-receiver.js
// CyberCrowd — Core Dewey Return Receiver
//
// Owns:
// - receiving candidate-only Dewey return records from the NET witness cycle
// - validating that Dewey return material is candidate-only and non-authoritative
// - preserving Core-side Dewey return records for later review
// - blocking final classification, 000 authority, sensitive material, private identity, tokens, sessions, health, biometric, raw sensor, and precise location material
// - keeping Dewey return context separate from authority execution
//
// Does NOT own:
// - final Dewey classification
// - authority execution
// - identity creation
// - movement approval
// - provider adapters
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
// - device calls
// - real-world execution

const CyberCrowdCoreDeweyReturnReceiver = (() => {
  const ACCEPTED_NET_DEWEY_RETURN_STATUS = "net_cycle_witness_returned_to_dewey_candidate_only";

  const ACCEPTED_DEWEY_RESULT_STATUSES = [
    "witness_context_queued_for_dewey_later",
    "witness_context_processed_for_dewey_later"
  ];

  const BLOCKED_MARKERS = [
    "000_future_sci_fi_unclassified",
    "null horizon authority",
    "000 authority",
    "authority_from_000",
    "final_classification\":true",
    "final classification true",
    "final_dewey_classification",
    "final dewey classification",
    "dewey_final",
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
    accepted: [],
    held: [],
    rejected: []
  };

  let NetCycleWitnessDeweyReturn = null;
  let DeweyLater = null;

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
    NetCycleWitnessDeweyReturn =
      deps.NetCycleWitnessDeweyReturn ||
      deps.netCycleWitnessDeweyReturn ||
      deps.witnessDeweyReturn ||
      NetCycleWitnessDeweyReturn ||
      safeRequire("./c-s-i-and-g-net-cycle-witness-dewey-return.js") ||
      null;

    DeweyLater =
      deps.DeweyLater ||
      deps.deweyLater ||
      deps.deweyLaterReview ||
      DeweyLater ||
      safeRequire("./c-s-i-and-g-dewey-later.js") ||
      null;

    state.configured = Boolean(
      NetCycleWitnessDeweyReturn ||
      DeweyLater
    );

    return {
      configured: state.configured,
      has_net_cycle_witness_dewey_return: Boolean(NetCycleWitnessDeweyReturn),
      has_dewey_later: Boolean(DeweyLater)
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
      id: makeId("coreDeweyReturnHold"),
      held_at: now(),
      reason,
      target: clone(target),
      candidate_only: true,
      final_classification: false,
      core_return_accepted: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_dewey_return_receiver"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreDeweyReturnReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      candidate_only: true,
      final_classification: false,
      core_return_accepted: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_dewey_return_receiver"
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
      id: makeId("coreDeweyReturnReceive"),
      received_at: now(),
      input: clone(input),
      candidate_only: true,
      final_classification: false,
      core_return_accepted: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_dewey_return_receiver"
    };

    state.received.push(record);
    return record;
  }

  function isNetDeweyReturn(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      NetCycleWitnessDeweyReturn &&
      typeof NetCycleWitnessDeweyReturn.canReturnToCoreLater === "function"
    ) {
      return NetCycleWitnessDeweyReturn.canReturnToCoreLater(input);
    }

    return (
      input.status === ACCEPTED_NET_DEWEY_RETURN_STATUS &&
      input.dewey_return_ready === true &&
      input.candidate_only === true &&
      input.final_classification === false &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false
    );
  }

  function readDeweyResult(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (ACCEPTED_DEWEY_RESULT_STATUSES.includes(input.status)) {
      return input;
    }

    if (
      input.dewey_result &&
      ACCEPTED_DEWEY_RESULT_STATUSES.includes(input.dewey_result.status)
    ) {
      return input.dewey_result;
    }

    if (
      NetCycleWitnessDeweyReturn &&
      typeof NetCycleWitnessDeweyReturn.readDeweyResult === "function"
    ) {
      return NetCycleWitnessDeweyReturn.readDeweyResult(input);
    }

    return null;
  }

  function deweyResultIsCandidateOnly(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      ACCEPTED_DEWEY_RESULT_STATUSES.includes(result.status) &&
      result.candidate_only === true &&
      result.final_classification === false &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function readCandidateLanes(deweyResult = {}) {
    if (!deweyResult || typeof deweyResult !== "object") {
      return [];
    }

    if (Array.isArray(deweyResult.candidate_lanes)) {
      return deweyResult.candidate_lanes.map((lane) => String(lane));
    }

    if (Array.isArray(deweyResult.suggested_lanes)) {
      return deweyResult.suggested_lanes.map((lane) => String(lane));
    }

    if (Array.isArray(deweyResult.lanes)) {
      return deweyResult.lanes.map((lane) => String(lane));
    }

    return [];
  }

  function acceptReturn(input = {}, reason = "NET_DEWEY_CANDIDATE_RETURN_TO_CORE") {
    configure();

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CORE_DEWEY_RETURN_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_DEWEY_RETURN_BLOCKED_SENSITIVE_OR_FORBIDDEN_MATERIAL"
      );
    }

    if (!isNetDeweyReturn(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_DEWEY_RETURN_REQUIRES_NET_CANDIDATE_RETURN"
      );
    }

    const deweyResult = readDeweyResult(input);

    if (!deweyResult) {
      return hold(
        {
          received,
          input
        },
        "CORE_DEWEY_RETURN_MISSING_DEWEY_RESULT"
      );
    }

    if (!deweyResultIsCandidateOnly(deweyResult)) {
      return hold(
        {
          received,
          input,
          deweyResult
        },
        "CORE_DEWEY_RETURN_RESULT_NOT_CANDIDATE_ONLY"
      );
    }

    const candidateLanes = readCandidateLanes(deweyResult);

    const accepted = {
      id: makeId("coreDeweyReturn"),
      accepted_at: now(),
      reason,
      received_id: received.id,
      net_dewey_return_id: input.id || null,
      dewey_result_id: deweyResult.id || null,
      mode: input.mode || null,
      candidate_lanes: candidateLanes,
      net_return: clone(input),
      dewey_result: clone(deweyResult),
      candidate_only: true,
      final_classification: false,
      core_return_accepted: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      allowed_uses: [
        "later_core_review",
        "candidate_lane_pressure_review",
        "dewey_later_reference",
        "evidence_context_hint"
      ],
      blocked_uses: [
        "final_classification",
        "authority_execution",
        "identity_creation",
        "movement_approval",
        "provider_execution",
        "private_identity_exposure",
        "external_api_call_from_core_dewey_return_receiver"
      ],
      status: "core_dewey_candidate_return_accepted_no_authority"
    };

    state.accepted.push(accepted);
    return accepted;
  }

  function receiveFromNetDeweyReturn(input = {}, options = {}) {
    configure(options.deps || {});

    if (isNetDeweyReturn(input)) {
      return acceptReturn(
        input,
        options.reason || "NET_DEWEY_RETURN_ACCEPTED_BY_CORE"
      );
    }

    if (
      !NetCycleWitnessDeweyReturn ||
      typeof NetCycleWitnessDeweyReturn.receiveFromWitnessLedgerBridge !== "function"
    ) {
      return hold(input, "NET_CYCLE_WITNESS_DEWEY_RETURN_NOT_AVAILABLE");
    }

    const returned = NetCycleWitnessDeweyReturn.receiveFromWitnessLedgerBridge(input, options);

    if (!isNetDeweyReturn(returned)) {
      return hold(
        {
          input,
          returned
        },
        "NET_CYCLE_WITNESS_DEWEY_RETURN_DID_NOT_CREATE_CORE_RETURN"
      );
    }

    return acceptReturn(
      returned,
      options.reason || "NET_DEWEY_RETURN_OUTPUT_ACCEPTED_BY_CORE"
    );
  }

  function canEnterEvidenceHintBridge(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === "core_dewey_candidate_return_accepted_no_authority" &&
      result.core_return_accepted === true &&
      result.candidate_only === true &&
      result.final_classification === false &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function readAcceptedDeweyResult(result = {}) {
    if (!canEnterEvidenceHintBridge(result)) {
      return null;
    }

    return clone(result.dewey_result);
  }

  function peekAccepted() {
    return clone(state.accepted);
  }

  function pullNextAccepted() {
    const next = state.accepted.shift();

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
    configure,
    acceptReturn,
    receiveFromNetDeweyReturn,
    isNetDeweyReturn,
    readDeweyResult,
    deweyResultIsCandidateOnly,
    readCandidateLanes,
    containsBlockedMaterial,
    canEnterEvidenceHintBridge,
    readAcceptedDeweyResult,
    peekAccepted,
    pullNextAccepted,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreDeweyReturnReceiver;
}
