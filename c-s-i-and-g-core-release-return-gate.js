// c-s-i-and-g-core-release-return-gate.js
// CyberCrowd — Core Release Return Gate
//
// Owns:
// - receiving formed Core equilibrium bundles
// - sending formed bundles into the Authority Release Gate
// - requiring depth-backed release review
// - blocking 000, sensitive, private, token, session, health, biometric, raw sensor, and location material
// - preserving release-return records without execution
//
// Does NOT own:
// - authority execution
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

const CyberCrowdCoreReleaseReturnGate = (() => {
  const ACCEPTED_FORMED_STATUS = "core_equilibrium_bundle_formed_release_not_allowed";
  const ACCEPTED_BUNDLE_STATUS = "authority_bundle_ready";
  const ACCEPTED_RELEASE_STATUS = "authority_release_ready";

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
    releases: [],
    held: [],
    rejected: []
  };

  let CoreBundleFormationGate = null;
  let AuthorityReleaseGate = null;

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
    CoreBundleFormationGate =
      deps.CoreBundleFormationGate ||
      deps.coreBundleFormationGate ||
      deps.formationGate ||
      CoreBundleFormationGate ||
      safeRequire("./c-s-i-and-g-core-bundle-formation-gate.js") ||
      null;

    AuthorityReleaseGate =
      deps.AuthorityReleaseGate ||
      deps.authorityReleaseGate ||
      deps.releaseGate ||
      AuthorityReleaseGate ||
      safeRequire("./c-s-i-and-g-authority-release-gate.js") ||
      null;

    state.configured = Boolean(CoreBundleFormationGate && AuthorityReleaseGate);

    return {
      configured: state.configured,
      has_core_bundle_formation_gate: Boolean(CoreBundleFormationGate),
      has_authority_release_gate: Boolean(AuthorityReleaseGate)
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
      id: makeId("coreReleaseReturnHold"),
      held_at: now(),
      reason,
      target: clone(target),
      release_ready: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_release_return_gate"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreReleaseReturnReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      release_ready: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_release_return_gate"
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
      id: makeId("coreReleaseReturnReceive"),
      received_at: now(),
      input: clone(input),
      release_ready: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_release_return_gate"
    };

    state.received.push(record);
    return record;
  }

  function isFormedCoreBundle(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreBundleFormationGate &&
      typeof CoreBundleFormationGate.canEnterReleaseGate === "function"
    ) {
      return CoreBundleFormationGate.canEnterReleaseGate(input);
    }

    return (
      input.status === ACCEPTED_FORMED_STATUS &&
      input.bundle_formed === true &&
      input.authority_allowed === true &&
      input.release_allowed === false &&
      input.certificate_valid === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      input.bundle_result &&
      input.bundle_result.status === ACCEPTED_BUNDLE_STATUS
    );
  }

  function readBundleResult(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (input.status === ACCEPTED_BUNDLE_STATUS) {
      return input;
    }

    if (
      input.bundle_result &&
      input.bundle_result.status === ACCEPTED_BUNDLE_STATUS
    ) {
      return input.bundle_result;
    }

    if (
      CoreBundleFormationGate &&
      typeof CoreBundleFormationGate.readBundleResult === "function"
    ) {
      return CoreBundleFormationGate.readBundleResult(input);
    }

    return null;
  }

  function releaseAllows(input = {}) {
    return Boolean(
      input &&
      typeof input === "object" &&
      input.status === ACCEPTED_RELEASE_STATUS &&
      input.release_allowed === true &&
      input.authority_allowed === true &&
      input.executed === false
    );
  }

  function reviewRelease(input = {}, reason = "CORE_FORMED_BUNDLE_TO_RELEASE_GATE") {
    configure();

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CORE_RELEASE_RETURN_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_RELEASE_RETURN_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!isFormedCoreBundle(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_RELEASE_RETURN_REQUIRES_FORMED_CORE_BUNDLE"
      );
    }

    const bundleResult = readBundleResult(input);

    if (!bundleResult) {
      return hold(
        {
          received,
          input
        },
        "CORE_RELEASE_RETURN_MISSING_BUNDLE_RESULT"
      );
    }

    if (!AuthorityReleaseGate || typeof AuthorityReleaseGate.review !== "function") {
      return hold(
        {
          received,
          input,
          bundleResult
        },
        "AUTHORITY_RELEASE_GATE_NOT_AVAILABLE"
      );
    }

    const releaseResult = AuthorityReleaseGate.review({
      source: "core_release_return_gate",
      reason,
      result: clone(bundleResult),
      bundle: clone(bundleResult.bundle || bundleResult),
      lanes:
        bundleResult.bundle &&
        bundleResult.bundle.lanes ||
        bundleResult.lanes ||
        [],
      attrs:
        bundleResult.bundle &&
        bundleResult.bundle.attrs ||
        bundleResult.attrs ||
        {}
    });

    if (!releaseAllows(releaseResult)) {
      return hold(
        {
          received,
          input,
          bundleResult,
          releaseResult
        },
        "AUTHORITY_RELEASE_GATE_DID_NOT_APPROVE_RELEASE"
      );
    }

    const releaseRecord = {
      id: makeId("coreReleaseReturn"),
      released_at: now(),
      received_id: received.id,
      source_formed_id: input.id || null,
      source_bundle_result_id: bundleResult.id || null,
      bundle_result: clone(bundleResult),
      release_result: clone(releaseResult),
      release_ready: true,
      authority_allowed: true,
      release_allowed: true,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "core_bundle_release_ready_certificate_not_sealed"
    };

    state.releases.push(releaseRecord);
    return releaseRecord;
  }

  function receiveFromFormationGate(input = {}, options = {}) {
    configure(options.deps || {});

    if (isFormedCoreBundle(input)) {
      return reviewRelease(
        input,
        options.reason || "FORMED_CORE_BUNDLE_REVIEWED_FOR_RELEASE"
      );
    }

    if (
      !CoreBundleFormationGate ||
      typeof CoreBundleFormationGate.receiveFromContextLedger !== "function"
    ) {
      return hold(input, "CORE_BUNDLE_FORMATION_GATE_NOT_AVAILABLE");
    }

    const formed = CoreBundleFormationGate.receiveFromContextLedger(input, options);

    if (!isFormedCoreBundle(formed)) {
      return hold(
        {
          input,
          formed
        },
        "CORE_BUNDLE_FORMATION_GATE_DID_NOT_FORM_RELEASE_READY_BUNDLE"
      );
    }

    return reviewRelease(
      formed,
      options.reason || "FORMATION_GATE_OUTPUT_REVIEWED_FOR_RELEASE"
    );
  }

  function canEnterCertificateLedger(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === "core_bundle_release_ready_certificate_not_sealed" &&
      result.release_ready === true &&
      result.authority_allowed === true &&
      result.release_allowed === true &&
      result.certificate_valid === false &&
      result.external_call_allowed === false &&
      result.executed === false &&
      result.release_result &&
      result.release_result.status === ACCEPTED_RELEASE_STATUS
    );
  }

  function readReleaseResult(result = {}) {
    if (!canEnterCertificateLedger(result)) {
      return null;
    }

    return clone(result.release_result);
  }

  function peekReleases() {
    return clone(state.releases);
  }

  function pullNextRelease() {
    const next = state.releases.shift();

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
    reviewRelease,
    receiveFromFormationGate,
    isFormedCoreBundle,
    readBundleResult,
    releaseAllows,
    containsBlockedMaterial,
    canEnterCertificateLedger,
    readReleaseResult,
    peekReleases,
    pullNextRelease,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreReleaseReturnGate;
}
