// c-s-i-and-g-authority-certificate-ledger.js
// CyberCrowd — Authority Certificate Ledger
//
// Owns:
// - recording authority release certificates
// - preserving proof that release passed bundle + depth gates
// - sealing authority-ready state without performing execution
// - creating immutable-style local audit records
// - allowing later systems to verify release readiness
//
// Does NOT own:
// - raw signal intake
// - 000 preservation
// - Dewey final classification
// - identity creation
// - payment
// - sessions
// - cookies
// - KV storage
// - external APIs
// - scraping
// - UI
// - real-world execution

const CyberCrowdAuthorityCertificateLedger = (() => {
  const state = {
    configured: false,
    certificates: [],
    verified: [],
    held: [],
    rejected: []
  };

  let AuthorityReleaseGate = null;

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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
    AuthorityReleaseGate =
      deps.AuthorityReleaseGate ||
      deps.authorityReleaseGate ||
      deps.releaseGate ||
      AuthorityReleaseGate ||
      safeRequire("./c-s-i-and-g-authority-release-gate.js") ||
      null;

    state.configured = Boolean(AuthorityReleaseGate);

    return {
      configured: state.configured,
      has_authority_release_gate: Boolean(AuthorityReleaseGate)
    };
  }

  function hold(target, reason) {
    const record = {
      id: makeId("authorityCertificateHold"),
      held_at: now(),
      reason,
      target: clone(target),
      certificate_valid: false,
      authority_allowed: false,
      executed: false,
      status: "held_by_authority_certificate_ledger"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("authorityCertificateReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      certificate_valid: false,
      authority_allowed: false,
      executed: false,
      status: "rejected_by_authority_certificate_ledger"
    };

    state.rejected.push(record);
    return record;
  }

  function looksReleaseReady(input = {}) {
    configure();

    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      input.status === "authority_release_ready" &&
      input.release_allowed === true &&
      input.authority_allowed === true &&
      input.executed === false
    ) {
      return true;
    }

    if (
      AuthorityReleaseGate &&
      typeof AuthorityReleaseGate.canExecuteAuthority === "function"
    ) {
      return AuthorityReleaseGate.canExecuteAuthority(input);
    }

    return false;
  }

  function seal(input = {}) {
    if (!input || typeof input !== "object") {
      return reject(input, "INVALID_CERTIFICATE_INPUT");
    }

    if (!looksReleaseReady(input)) {
      return hold(input, "AUTHORITY_RELEASE_NOT_READY_FOR_CERTIFICATE");
    }

    const certificate = {
      id: makeId("authorityCertificate"),
      sealed_at: now(),
      release_id: input.id || null,
      request_id: input.request_id || null,
      source: input.source || "authority_certificate_ledger",
      bundle: clone(input.bundle || null),
      lanes: clone(input.lanes || []),
      depth_result: clone(input.depth_result || null),
      release_record: clone(input),
      certificate_valid: true,
      authority_allowed: true,
      release_allowed: true,
      executed: false,
      status: "authority_certificate_sealed"
    };

    state.certificates.push(certificate);
    return certificate;
  }

  function verify(certificate) {
    if (!certificate || typeof certificate !== "object") {
      return reject(certificate, "INVALID_CERTIFICATE_FOR_VERIFY");
    }

    const valid =
      certificate.status === "authority_certificate_sealed" &&
      certificate.certificate_valid === true &&
      certificate.authority_allowed === true &&
      certificate.release_allowed === true &&
      certificate.executed === false;

    const record = {
      id: makeId("authorityCertificateVerify"),
      verified_at: now(),
      certificate_id: certificate.id || null,
      valid,
      reason: valid
        ? "AUTHORITY_CERTIFICATE_VALID"
        : "AUTHORITY_CERTIFICATE_INVALID",
      certificate: clone(certificate),
      authority_allowed: valid,
      release_allowed: valid,
      executed: false,
      status: valid
        ? "authority_certificate_verified"
        : "authority_certificate_failed_verify"
    };

    state.verified.push(record);

    if (!valid) {
      hold(record, "AUTHORITY_CERTIFICATE_FAILED_VERIFY");
    }

    return record;
  }

  function sealFromReleaseGate(input = {}) {
    configure();

    if (
      AuthorityReleaseGate &&
      typeof AuthorityReleaseGate.review === "function" &&
      input.status !== "authority_release_ready"
    ) {
      const release = AuthorityReleaseGate.review(input);

      if (!looksReleaseReady(release)) {
        return hold(
          {
            input,
            release
          },
          "RELEASE_GATE_DID_NOT_APPROVE_CERTIFICATE"
        );
      }

      return seal(release);
    }

    return seal(input);
  }

  function findByReleaseId(releaseId) {
    return state.certificates.filter((certificate) => {
      return certificate.release_id === releaseId;
    }).map(clone);
  }

  function canExecuteAuthority(certificate) {
    return Boolean(
      certificate &&
      typeof certificate === "object" &&
      certificate.status === "authority_certificate_sealed" &&
      certificate.certificate_valid === true &&
      certificate.authority_allowed === true &&
      certificate.release_allowed === true &&
      certificate.executed === false
    );
  }

  function getState() {
    return clone(state);
  }

  return {
    configure,
    seal,
    sealFromReleaseGate,
    verify,
    findByReleaseId,
    looksReleaseReady,
    canExecuteAuthority,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdAuthorityCertificateLedger;
}
