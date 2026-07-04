// c-s-i-and-g-equilibrium-pipeline.js
// CyberCrowd — Equilibrium Pipeline
//
// Owns:
// - one controlled pass through intake, bundle, release, and certificate
// - connecting the already-built CSI&G equilibrium modules
// - preserving the trail from signal to certificate-ready state
// - stopping whenever 000, tilt, shallow depth, or missing lanes appear
// - proving release readiness without real-world execution
//
// Does NOT own:
// - raw law definitions
// - 000 preservation logic
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

const CyberCrowdEquilibriumPipeline = (() => {
  const LANE_000 = "000_future_sci_fi_unclassified";

  const state = {
    configured: false,
    runs: [],
    completed: [],
    certified: [],
    held: [],
    rejected: []
  };

  let EquilibriumIntake = null;
  let EquilibriumBundle = null;
  let AuthorityReleaseGate = null;
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
    EquilibriumIntake =
      deps.EquilibriumIntake ||
      deps.equilibriumIntake ||
      deps.intake ||
      EquilibriumIntake ||
      safeRequire("./c-s-i-and-g-equilibrium-intake.js") ||
      null;

    EquilibriumBundle =
      deps.EquilibriumBundle ||
      deps.equilibriumBundle ||
      deps.bundleGate ||
      EquilibriumBundle ||
      safeRequire("./c-s-i-and-g-equilibrium-bundle.js") ||
      null;

    AuthorityReleaseGate =
      deps.AuthorityReleaseGate ||
      deps.authorityReleaseGate ||
      deps.releaseGate ||
      AuthorityReleaseGate ||
      safeRequire("./c-s-i-and-g-authority-release-gate.js") ||
      null;

    AuthorityCertificateLedger =
      deps.AuthorityCertificateLedger ||
      deps.authorityCertificateLedger ||
      deps.certificateLedger ||
      AuthorityCertificateLedger ||
      safeRequire("./c-s-i-and-g-authority-certificate-ledger.js") ||
      null;

    state.configured = Boolean(
      EquilibriumIntake &&
      EquilibriumBundle &&
      AuthorityReleaseGate &&
      AuthorityCertificateLedger
    );

    return {
      configured: state.configured,
      has_intake: Boolean(EquilibriumIntake),
      has_bundle_gate: Boolean(EquilibriumBundle),
      has_release_gate: Boolean(AuthorityReleaseGate),
      has_certificate_ledger: Boolean(AuthorityCertificateLedger)
    };
  }

  function normalizeLanes(lanes) {
    if (!lanes) {
      return [];
    }

    if (Array.isArray(lanes)) {
      return lanes.map((lane) => String(lane));
    }

    return [String(lanes)];
  }

  function hold(target, reason) {
    const record = {
      id: makeId("pipelineHold"),
      held_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      executed: false,
      status: "held_by_equilibrium_pipeline"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("pipelineReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      executed: false,
      status: "rejected_by_equilibrium_pipeline"
    };

    state.rejected.push(record);
    return record;
  }

  function recordRun(signal, options = {}) {
    const run = {
      id: makeId("equilibriumPipeline"),
      started_at: now(),
      source: options.source || "equilibrium_pipeline",
      signal: clone(signal),
      options: clone(options),
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      executed: false,
      status: "pipeline_started"
    };

    state.runs.push(run);
    return run;
  }

  function textOf(value) {
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

  function contains000(value) {
    const text = textOf(value);
    return text.includes(LANE_000) || text.includes("null horizon") || text.includes("000");
  }

  function runIntake(signal) {
    if (!EquilibriumIntake || typeof EquilibriumIntake.onSignal !== "function") {
      return {
        status: "intake_unavailable",
        reason: "EQUILIBRIUM_INTAKE_NOT_AVAILABLE",
        authority_allowed: false,
        executed: false
      };
    }

    return EquilibriumIntake.onSignal(signal);
  }

  function extractCoreResult(intakeResult) {
    if (!intakeResult || typeof intakeResult !== "object") {
      return null;
    }

    if (intakeResult.core_result) {
      return intakeResult.core_result;
    }

    if (intakeResult.result && intakeResult.result.core_result) {
      return intakeResult.result.core_result;
    }

    if (intakeResult.status === "authority_ready") {
      return intakeResult;
    }

    return null;
  }

  function extractBundleInput(signal, intakeResult) {
    const coreResult = extractCoreResult(intakeResult);

    if (!coreResult || typeof coreResult !== "object") {
      return null;
    }

    const coreBundle =
      coreResult.bundle ||
      coreResult.result && coreResult.result.bundle ||
      null;

    if (!coreBundle || typeof coreBundle !== "object") {
      return null;
    }

    return {
      source: "equilibrium_pipeline",
      signal_id: coreBundle.signal_id || coreResult.signal_id || null,
      signal,
      attrs: clone(coreBundle.attrs || {}),
      lanes: normalizeLanes(coreBundle.lanes || []),
      core_result: clone(coreResult),
      intake_result: clone(intakeResult)
    };
  }

  function formBundle(bundleInput) {
    if (!EquilibriumBundle || typeof EquilibriumBundle.form !== "function") {
      return {
        status: "bundle_gate_unavailable",
        reason: "EQUILIBRIUM_BUNDLE_GATE_NOT_AVAILABLE",
        authority_allowed: false,
        executed: false
      };
    }

    return EquilibriumBundle.form(bundleInput);
  }

  function bundleReady(bundleResult) {
    if (!bundleResult || typeof bundleResult !== "object") {
      return false;
    }

    if (
      bundleResult.status === "authority_bundle_ready" &&
      bundleResult.authority_allowed === true
    ) {
      return true;
    }

    if (
      EquilibriumBundle &&
      typeof EquilibriumBundle.canExecuteAuthority === "function"
    ) {
      return EquilibriumBundle.canExecuteAuthority(bundleResult);
    }

    return false;
  }

  function reviewRelease(bundleResult) {
    if (!AuthorityReleaseGate || typeof AuthorityReleaseGate.review !== "function") {
      return {
        status: "release_gate_unavailable",
        reason: "AUTHORITY_RELEASE_GATE_NOT_AVAILABLE",
        authority_allowed: false,
        release_allowed: false,
        executed: false
      };
    }

    return AuthorityReleaseGate.review({
      source: "equilibrium_pipeline",
      result: clone(bundleResult)
    });
  }

  function releaseReady(releaseResult) {
    if (!releaseResult || typeof releaseResult !== "object") {
      return false;
    }

    if (
      releaseResult.status === "authority_release_ready" &&
      releaseResult.release_allowed === true &&
      releaseResult.authority_allowed === true &&
      releaseResult.executed === false
    ) {
      return true;
    }

    if (
      AuthorityReleaseGate &&
      typeof AuthorityReleaseGate.canExecuteAuthority === "function"
    ) {
      return AuthorityReleaseGate.canExecuteAuthority(releaseResult);
    }

    return false;
  }

  function sealCertificate(releaseResult) {
    if (
      !AuthorityCertificateLedger ||
      typeof AuthorityCertificateLedger.seal !== "function"
    ) {
      return {
        status: "certificate_ledger_unavailable",
        reason: "AUTHORITY_CERTIFICATE_LEDGER_NOT_AVAILABLE",
        certificate_valid: false,
        authority_allowed: false,
        release_allowed: false,
        executed: false
      };
    }

    return AuthorityCertificateLedger.seal(releaseResult);
  }

  function certificateReady(certificate) {
    if (!certificate || typeof certificate !== "object") {
      return false;
    }

    if (
      certificate.status === "authority_certificate_sealed" &&
      certificate.certificate_valid === true &&
      certificate.authority_allowed === true &&
      certificate.release_allowed === true &&
      certificate.executed === false
    ) {
      return true;
    }

    if (
      AuthorityCertificateLedger &&
      typeof AuthorityCertificateLedger.canExecuteAuthority === "function"
    ) {
      return AuthorityCertificateLedger.canExecuteAuthority(certificate);
    }

    return false;
  }

  function run(signal, options = {}) {
    configure(options.deps || {});

    const runRecord = recordRun(signal, options);

    if (!state.configured) {
      return hold(
        {
          runRecord,
          configure: configure()
        },
        "EQUILIBRIUM_PIPELINE_NOT_CONFIGURED"
      );
    }

    const intakeResult = runIntake(signal);

    if (contains000(intakeResult)) {
      return hold(
        {
          runRecord,
          intakeResult
        },
        "PIPELINE_STOPPED_AT_000"
      );
    }

    const bundleInput = extractBundleInput(signal, intakeResult);

    if (!bundleInput) {
      return hold(
        {
          runRecord,
          intakeResult
        },
        "PIPELINE_NO_AUTHORITY_BUNDLE_INPUT"
      );
    }

    if (bundleInput.lanes.includes(LANE_000)) {
      return hold(
        {
          runRecord,
          intakeResult,
          bundleInput
        },
        "PIPELINE_000_CANNOT_FORM_AUTHORITY"
      );
    }

    const bundleResult = formBundle(bundleInput);

    if (!bundleReady(bundleResult)) {
      return hold(
        {
          runRecord,
          intakeResult,
          bundleInput,
          bundleResult
        },
        "PIPELINE_BUNDLE_NOT_READY"
      );
    }

    const releaseResult = reviewRelease(bundleResult);

    if (!releaseReady(releaseResult)) {
      return hold(
        {
          runRecord,
          intakeResult,
          bundleInput,
          bundleResult,
          releaseResult
        },
        "PIPELINE_RELEASE_NOT_READY"
      );
    }

    const certificate = sealCertificate(releaseResult);

    if (!certificateReady(certificate)) {
      return hold(
        {
          runRecord,
          intakeResult,
          bundleInput,
          bundleResult,
          releaseResult,
          certificate
        },
        "PIPELINE_CERTIFICATE_NOT_READY"
      );
    }

    const completed = {
      id: makeId("pipelineComplete"),
      completed_at: now(),
      run_id: runRecord.id,
      intake_result: clone(intakeResult),
      bundle_result: clone(bundleResult),
      release_result: clone(releaseResult),
      certificate: clone(certificate),
      authority_allowed: true,
      release_allowed: true,
      certificate_valid: true,
      executed: false,
      status: "pipeline_certified_no_execution"
    };

    state.completed.push(completed);
    state.certified.push(certificate);

    return completed;
  }

  function runFromBundle(bundleInput = {}, options = {}) {
    configure(options.deps || {});

    const runRecord = recordRun(
      {
        mode: "run_from_bundle",
        bundleInput
      },
      options
    );

    if (!state.configured) {
      return hold(
        {
          runRecord,
          configure: configure()
        },
        "EQUILIBRIUM_PIPELINE_NOT_CONFIGURED"
      );
    }

    if (contains000(bundleInput)) {
      return hold(
        {
          runRecord,
          bundleInput
        },
        "PIPELINE_000_CANNOT_FORM_AUTHORITY"
      );
    }

    const bundleResult = formBundle(bundleInput);

    if (!bundleReady(bundleResult)) {
      return hold(
        {
          runRecord,
          bundleInput,
          bundleResult
        },
        "PIPELINE_BUNDLE_NOT_READY"
      );
    }

    const releaseResult = reviewRelease(bundleResult);

    if (!releaseReady(releaseResult)) {
      return hold(
        {
          runRecord,
          bundleInput,
          bundleResult,
          releaseResult
        },
        "PIPELINE_RELEASE_NOT_READY"
      );
    }

    const certificate = sealCertificate(releaseResult);

    if (!certificateReady(certificate)) {
      return hold(
        {
          runRecord,
          bundleInput,
          bundleResult,
          releaseResult,
          certificate
        },
        "PIPELINE_CERTIFICATE_NOT_READY"
      );
    }

    const completed = {
      id: makeId("pipelineBundleComplete"),
      completed_at: now(),
      run_id: runRecord.id,
      bundle_result: clone(bundleResult),
      release_result: clone(releaseResult),
      certificate: clone(certificate),
      authority_allowed: true,
      release_allowed: true,
      certificate_valid: true,
      executed: false,
      status: "pipeline_bundle_certified_no_execution"
    };

    state.completed.push(completed);
    state.certified.push(certificate);

    return completed;
  }

  function verifyCertificate(certificate) {
    configure();

    if (
      !AuthorityCertificateLedger ||
      typeof AuthorityCertificateLedger.verify !== "function"
    ) {
      return hold(certificate, "CERTIFICATE_LEDGER_VERIFY_NOT_AVAILABLE");
    }

    return AuthorityCertificateLedger.verify(certificate);
  }

  function canExecuteAuthority(result) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.certificate_valid === true &&
      result.authority_allowed === true &&
      result.release_allowed === true &&
      result.executed === false &&
      (
        result.status === "pipeline_certified_no_execution" ||
        result.status === "pipeline_bundle_certified_no_execution"
      )
    );
  }

  function getState() {
    return clone(state);
  }

  return {
    LANE_000,
    configure,
    run,
    runFromBundle,
    runIntake,
    extractCoreResult,
    extractBundleInput,
    formBundle,
    reviewRelease,
    sealCertificate,
    verifyCertificate,
    bundleReady,
    releaseReady,
    certificateReady,
    canExecuteAuthority,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdEquilibriumPipeline;
}
