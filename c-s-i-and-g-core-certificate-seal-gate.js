// c-s-i-and-g-core-certificate-seal-gate.js
// CyberCrowd — Core Certificate Seal Gate
// 
// Owns:
// - receiving Core release-ready records
// - sealing authority release certificates through the Authority Certificate Ledger
// - blocking release records that have not passed the Authority Release Gate
// - preserving certificate seal trail without execution
// - keeping certificate proof separate from real-world authority execution
//
// Does NOT own:
// - authority execution
// - real-world execution
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

const CyberCrowdCoreCertificateSealGate = (() => {
  const ACCEPTED_RELEASE_RECORD_STATUS = "core_bundle_release_ready_certificate_not_sealed";
  const ACCEPTED_RELEASE_STATUS = "authority_release_ready";
  const ACCEPTED_CERTIFICATE_STATUS = "authority_certificate_sealed";

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
    sealed: [],
    held: [],
    rejected: []
  };

  let CoreReleaseReturnGate = null;
  let AuthorityCertificateLedger = null;

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
    CoreReleaseReturnGate =
      deps.CoreReleaseReturnGate ||
      deps.coreReleaseReturnGate ||
      deps.releaseReturnGate ||
      CoreReleaseReturnGate ||
      safeRequire("./c-s-i-and-g-core-release-return-gate.js") ||
      null;

    AuthorityCertificateLedger =
      deps.AuthorityCertificateLedger ||
      deps.authorityCertificateLedger ||
      deps.certificateLedger ||
      AuthorityCertificateLedger ||
      safeRequire("./c-s-i-and-g-authority-certificate-ledger.js") ||
      null;

    state.configured = Boolean(CoreReleaseReturnGate && AuthorityCertificateLedger);

    return {
      configured: state.configured,
      has_core_release_return_gate: Boolean(CoreReleaseReturnGate),
      has_authority_certificate_ledger: Boolean(AuthorityCertificateLedger)
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
      id: makeId("coreCertificateSealHold"),
      held_at: now(),
      reason,
      target: clone(target),
      certificate_valid: false,
      authority_allowed: false,
      release_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_certificate_seal_gate"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreCertificateSealReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      certificate_valid: false,
      authority_allowed: false,
      release_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_certificate_seal_gate"
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
      id: makeId("coreCertificateSealReceive"),
      received_at: now(),
      input: clone(input),
      certificate_valid: false,
      authority_allowed: false,
      release_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_certificate_seal_gate"
    };

    state.received.push(record);
    return record;
  }

  function isCoreReleaseReady(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreReleaseReturnGate &&
      typeof CoreReleaseReturnGate.canEnterCertificateLedger === "function"
    ) {
      return CoreReleaseReturnGate.canEnterCertificateLedger(input);
    }

    return (
      input.status === ACCEPTED_RELEASE_RECORD_STATUS &&
      input.release_ready === true &&
      input.authority_allowed === true &&
      input.release_allowed === true &&
      input.certificate_valid === false &&
      input.external_call_allowed === false &&
      input.executed === false &&
      input.release_result &&
      input.release_result.status === ACCEPTED_RELEASE_STATUS
    );
  }

  function readReleaseResult(input = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }

    if (input.status === ACCEPTED_RELEASE_STATUS) {
      return input;
    }

    if (
      input.release_result &&
      input.release_result.status === ACCEPTED_RELEASE_STATUS
    ) {
      return input.release_result;
    }

    if (
      CoreReleaseReturnGate &&
      typeof CoreReleaseReturnGate.readReleaseResult === "function"
    ) {
      return CoreReleaseReturnGate.readReleaseResult(input);
    }

    return null;
  }

  function certificateLooksSealed(certificate = {}) {
    return Boolean(
      certificate &&
      typeof certificate === "object" &&
      certificate.status === ACCEPTED_CERTIFICATE_STATUS &&
      certificate.certificate_valid === true &&
      certificate.authority_allowed === true &&
      certificate.release_allowed === true &&
      certificate.executed === false
    );
  }

  function sealCertificate(input = {}, reason = "CORE_RELEASE_READY_CERTIFICATE_SEAL") {
    configure();

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CORE_CERTIFICATE_SEAL_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_CERTIFICATE_SEAL_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!isCoreReleaseReady(input)) {
      return hold(
        {
          received,
          input
        },
        "CORE_CERTIFICATE_SEAL_REQUIRES_RELEASE_READY_RECORD"
      );
    }

    const releaseResult = readReleaseResult(input);

    if (!releaseResult) {
      return hold(
        {
          received,
          input
        },
        "CORE_CERTIFICATE_SEAL_MISSING_RELEASE_RESULT"
      );
    }

    if (
      !AuthorityCertificateLedger ||
      typeof AuthorityCertificateLedger.seal !== "function"
    ) {
      return hold(
        {
          received,
          input,
          releaseResult
        },
        "AUTHORITY_CERTIFICATE_LEDGER_NOT_AVAILABLE"
      );
    }

    const certificate = AuthorityCertificateLedger.seal({
      ...clone(releaseResult),
      source: "core_certificate_seal_gate",
      reason,
      core_release_record_id: input.id || null
    });

    if (!certificateLooksSealed(certificate)) {
      return hold(
        {
          received,
          input,
          releaseResult,
          certificate
        },
        "AUTHORITY_CERTIFICATE_LEDGER_DID_NOT_SEAL_CERTIFICATE"
      );
    }

    const sealed = {
      id: makeId("coreCertificateSeal"),
      sealed_at: now(),
      received_id: received.id,
      source_release_record_id: input.id || null,
      source_release_result_id: releaseResult.id || null,
      release_record: clone(input),
      release_result: clone(releaseResult),
      certificate: clone(certificate),
      certificate_valid: true,
      authority_allowed: true,
      release_allowed: true,
      external_call_allowed: false,
      executed: false,
      status: "core_authority_certificate_sealed_no_execution"
    };

    state.sealed.push(sealed);
    return sealed;
  }

  function receiveFromReleaseReturnGate(input = {}, options = {}) {
    configure(options.deps || {});

    if (isCoreReleaseReady(input)) {
      return sealCertificate(
        input,
        options.reason || "RELEASE_RETURN_RECORD_SEALED_BY_CORE"
      );
    }

    if (
      !CoreReleaseReturnGate ||
      typeof CoreReleaseReturnGate.receiveFromFormationGate !== "function"
    ) {
      return hold(input, "CORE_RELEASE_RETURN_GATE_NOT_AVAILABLE");
    }

    const releaseReady = CoreReleaseReturnGate.receiveFromFormationGate(input, options);

    if (!isCoreReleaseReady(releaseReady)) {
      return hold(
        {
          input,
          releaseReady
        },
        "CORE_RELEASE_RETURN_GATE_DID_NOT_CREATE_RELEASE_READY_RECORD"
      );
    }

    return sealCertificate(
      releaseReady,
      options.reason || "FORMATION_OUTPUT_RELEASED_AND_SEALED_BY_CORE"
    );
  }

  function verifySealed(sealedRecord = {}) {
    configure();

    if (
      !sealedRecord ||
      typeof sealedRecord !== "object" ||
      sealedRecord.status !== "core_authority_certificate_sealed_no_execution"
    ) {
      return hold(sealedRecord, "INVALID_CORE_SEALED_RECORD_FOR_VERIFY");
    }

    if (containsBlockedMaterial(sealedRecord)) {
      return hold(sealedRecord, "CORE_SEALED_RECORD_VERIFY_BLOCKED_SENSITIVE_OR_000_MATERIAL");
    }

    if (
      !AuthorityCertificateLedger ||
      typeof AuthorityCertificateLedger.verify !== "function"
    ) {
      return hold(sealedRecord, "AUTHORITY_CERTIFICATE_LEDGER_VERIFY_NOT_AVAILABLE");
    }

    const verified = AuthorityCertificateLedger.verify(sealedRecord.certificate);

    const valid = Boolean(
      verified &&
      typeof verified === "object" &&
      verified.status === "authority_certificate_verified" &&
      verified.valid === true &&
      verified.authority_allowed === true &&
      verified.release_allowed === true &&
      verified.executed === false
    );

    return {
      id: makeId("coreCertificateSealVerify"),
      verified_at: now(),
      sealed_record_id: sealedRecord.id || null,
      certificate_id:
        sealedRecord.certificate &&
        sealedRecord.certificate.id ||
        null,
      ledger_verify: clone(verified),
      valid,
      certificate_valid: valid,
      authority_allowed: valid,
      release_allowed: valid,
      external_call_allowed: false,
      executed: false,
      status: valid
        ? "core_authority_certificate_verified_no_execution"
        : "core_authority_certificate_failed_verify"
    };
  }

  function canEnterCoreToNetHandoff(sealedRecord = {}) {
    return Boolean(
      sealedRecord &&
      typeof sealedRecord === "object" &&
      sealedRecord.status === "core_authority_certificate_sealed_no_execution" &&
      sealedRecord.certificate_valid === true &&
      sealedRecord.authority_allowed === true &&
      sealedRecord.release_allowed === true &&
      sealedRecord.external_call_allowed === false &&
      sealedRecord.executed === false &&
      sealedRecord.certificate &&
      sealedRecord.certificate.status === ACCEPTED_CERTIFICATE_STATUS
    );
  }

  function readCertificate(sealedRecord = {}) {
    if (!canEnterCoreToNetHandoff(sealedRecord)) {
      return null;
    }

    return clone(sealedRecord.certificate);
  }

  function peekSealed() {
    return clone(state.sealed);
  }

  function pullNextSealed() {
    const next = state.sealed.shift();

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
    sealCertificate,
    receiveFromReleaseReturnGate,
    verifySealed,
    isCoreReleaseReady,
    readReleaseResult,
    certificateLooksSealed,
    containsBlockedMaterial,
    canEnterCoreToNetHandoff,
    readCertificate,
    peekSealed,
    pullNextSealed,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreCertificateSealGate;
}
