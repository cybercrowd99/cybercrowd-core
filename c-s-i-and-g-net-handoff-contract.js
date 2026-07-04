// c-s-i-and-g-net-handoff-contract.js
// CyberCrowd — Core to NET Handoff Contract
//
// Owns:
// - converting certificate-ready equilibrium results into NET-ready envelopes
// - proving NET only receives released, certified, non-executed authority state
// - blocking 000 from NET handoff
// - stripping private identity material before external movement
// - preserving the handoff trail
//
// Does NOT own:
// - external API calls
// - OAuth
// - scraping
// - provider adapters
// - social adapters
// - webhook delivery
// - payment
// - sessions
// - cookies
// - KV storage
// - UI
// - real-world execution

const CyberCrowdNetHandoffContract = (() => {
  const LANE_000 = "000_future_sci_fi_unclassified";

  const PRIVATE_MARKERS = [
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
    "session",
    "cookie",
    "kv"
  ];

  const state = {
    configured: false,
    handoffs: [],
    sanitized: [],
    held: [],
    rejected: []
  };

  let EquilibriumPipeline = null;
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
    EquilibriumPipeline =
      deps.EquilibriumPipeline ||
      deps.equilibriumPipeline ||
      deps.pipeline ||
      EquilibriumPipeline ||
      safeRequire("./c-s-i-and-g-equilibrium-pipeline.js") ||
      null;

    AuthorityCertificateLedger =
      deps.AuthorityCertificateLedger ||
      deps.authorityCertificateLedger ||
      deps.certificateLedger ||
      AuthorityCertificateLedger ||
      safeRequire("./c-s-i-and-g-authority-certificate-ledger.js") ||
      null;

    state.configured = Boolean(
      EquilibriumPipeline ||
      AuthorityCertificateLedger
    );

    return {
      configured: state.configured,
      has_equilibrium_pipeline: Boolean(EquilibriumPipeline),
      has_certificate_ledger: Boolean(AuthorityCertificateLedger)
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
      id: makeId("netHandoffHold"),
      held_at: now(),
      reason,
      target: clone(target),
      net_ready: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      executed: false,
      status: "held_by_net_handoff_contract"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("netHandoffReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      net_ready: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      executed: false,
      status: "rejected_by_net_handoff_contract"
    };

    state.rejected.push(record);
    return record;
  }

  function contains000(input) {
    const text = toText(input);
    return (
      text.includes(LANE_000) ||
      text.includes("null horizon") ||
      text.includes("unclassified_signal_routed_to_000") ||
      text.includes("preserved_in_000")
    );
  }

  function containsPrivateMaterial(input) {
    const text = toText(input);
    return PRIVATE_MARKERS.some((marker) => text.includes(marker));
  }

  function certificateLooksValid(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      input.status === "authority_certificate_sealed" &&
      input.certificate_valid === true &&
      input.authority_allowed === true &&
      input.release_allowed === true &&
      input.executed === false
    ) {
      return true;
    }

    if (
      input.certificate &&
      input.certificate.status === "authority_certificate_sealed" &&
      input.certificate.certificate_valid === true &&
      input.certificate.authority_allowed === true &&
      input.certificate.release_allowed === true &&
      input.certificate.executed === false
    ) {
      return true;
    }

    if (
      AuthorityCertificateLedger &&
      typeof AuthorityCertificateLedger.canExecuteAuthority === "function"
    ) {
      return AuthorityCertificateLedger.canExecuteAuthority(input);
    }

    if (
      EquilibriumPipeline &&
      typeof EquilibriumPipeline.canExecuteAuthority === "function"
    ) {
      return EquilibriumPipeline.canExecuteAuthority(input);
    }

    return false;
  }

  function stripPrivateMaterial(value) {
    if (Array.isArray(value)) {
      return value.map(stripPrivateMaterial);
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    const out = {};

    Object.keys(value).forEach((key) => {
      const lowerKey = key.toLowerCase();

      const privateKey = PRIVATE_MARKERS.some((marker) => {
        return lowerKey.includes(marker.replace(/\s+/g, "_")) || lowerKey.includes(marker);
      });

      if (privateKey) {
        out[key] = "[REDACTED_BY_NET_HANDOFF_CONTRACT]";
        return;
      }

      out[key] = stripPrivateMaterial(value[key]);
    });

    return out;
  }

  function sanitize(input = {}) {
    const sanitized = stripPrivateMaterial(clone(input));

    const record = {
      id: makeId("netSanitize"),
      sanitized_at: now(),
      input: clone(input),
      sanitized,
      private_material_detected: containsPrivateMaterial(input),
      status: "sanitized_for_net_handoff"
    };

    state.sanitized.push(record);
    return record;
  }

  function buildEnvelope(input = {}, options = {}) {
    const sanitizeRecord = sanitize(input);

    return {
      id: makeId("netEnvelope"),
      built_at: now(),
      source: options.source || "csi_g_net_handoff_contract",
      target: options.target || "net_layer_pending",
      contract: "core_to_net_handoff",
      payload: sanitizeRecord.sanitized,
      sanitize_id: sanitizeRecord.id,
      net_ready: true,
      authority_allowed: true,
      release_allowed: true,
      certificate_valid: true,
      executed: false,
      external_call_allowed: false,
      status: "net_handoff_envelope_ready"
    };
  }

  function review(input = {}, options = {}) {
    configure(options.deps || {});

    if (!input || typeof input !== "object") {
      return reject(input, "INVALID_NET_HANDOFF_INPUT");
    }

    if (contains000(input)) {
      return hold(input, "000_CANNOT_MOVE_TO_NET");
    }

    if (!certificateLooksValid(input)) {
      return hold(input, "VALID_AUTHORITY_CERTIFICATE_REQUIRED_FOR_NET_HANDOFF");
    }

    const envelope = buildEnvelope(input, options);

    const handoff = {
      id: makeId("netHandoff"),
      handed_off_at: now(),
      source: options.source || "csi_g_net_handoff_contract",
      target: options.target || "net_layer_pending",
      envelope,
      net_ready: true,
      authority_allowed: true,
      release_allowed: true,
      certificate_valid: true,
      executed: false,
      external_call_allowed: false,
      status: "core_ready_for_net_no_external_call"
    };

    state.handoffs.push(handoff);
    return handoff;
  }

  function fromPipeline(signalOrBundle, options = {}) {
    configure(options.deps || {});

    if (
      !EquilibriumPipeline ||
      typeof EquilibriumPipeline.run !== "function"
    ) {
      return hold(signalOrBundle, "EQUILIBRIUM_PIPELINE_NOT_AVAILABLE_FOR_NET_HANDOFF");
    }

    const pipelineResult =
      options.mode === "bundle"
        ? EquilibriumPipeline.runFromBundle(signalOrBundle, options)
        : EquilibriumPipeline.run(signalOrBundle, options);

    if (!certificateLooksValid(pipelineResult)) {
      return hold(
        {
          signalOrBundle,
          pipelineResult
        },
        "PIPELINE_DID_NOT_PRODUCE_NET_READY_CERTIFICATE"
      );
    }

    return review(pipelineResult, {
      ...options,
      source: options.source || "equilibrium_pipeline_to_net_contract"
    });
  }

  function canEnterNet(result) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === "core_ready_for_net_no_external_call" &&
      result.net_ready === true &&
      result.authority_allowed === true &&
      result.release_allowed === true &&
      result.certificate_valid === true &&
      result.executed === false &&
      result.external_call_allowed === false
    );
  }

  function getState() {
    return clone(state);
  }

  return {
    LANE_000,
    configure,
    review,
    fromPipeline,
    sanitize,
    stripPrivateMaterial,
    buildEnvelope,
    contains000,
    containsPrivateMaterial,
    certificateLooksValid,
    canEnterNet,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdNetHandoffContract;
}
