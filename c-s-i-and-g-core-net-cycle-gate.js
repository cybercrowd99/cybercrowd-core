// c-s-i-and-g-core-net-cycle-gate.js
// CyberCrowd — Core NET Cycle Gate
// 
// Owns:
// - receiving sealed Core authority certificate records
// - verifying sealed certificates before Core-to-NET handoff
// - sending only sealed, verified, non-executed certificate records to the Core-to-NET Handoff Contract
// - blocking 000, sensitive, private, token, session, health, biometric, raw sensor, and location material
// - preserving the closed-loop Core → NET cycle trail without execution
//
// Does NOT own:
// - NET provider adapters
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
// - authority execution

const CyberCrowdCoreNetCycleGate = (() => {
  const ACCEPTED_SEALED_STATUS = "core_authority_certificate_sealed_no_execution";
  const ACCEPTED_VERIFIED_STATUS = "core_authority_certificate_verified_no_execution";
  const ACCEPTED_HANDOFF_STATUS = "core_ready_for_net_no_external_call";

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
    verified: [],
    handoffs: [],
    held: [],
    rejected: []
  };

  let CoreCertificateSealGate = null;
  let NetHandoffContract = null;

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
    CoreCertificateSealGate =
      deps.CoreCertificateSealGate ||
      deps.coreCertificateSealGate ||
      deps.certificateSealGate ||
      CoreCertificateSealGate ||
      safeRequire("./c-s-i-and-g-core-certificate-seal-gate.js") ||
      null;

    NetHandoffContract =
      deps.NetHandoffContract ||
      deps.netHandoffContract ||
      deps.handoffContract ||
      NetHandoffContract ||
      safeRequire("./c-s-i-and-g-net-handoff-contract.js") ||
      null;

    state.configured = Boolean(CoreCertificateSealGate && NetHandoffContract);

    return {
      configured: state.configured,
      has_core_certificate_seal_gate: Boolean(CoreCertificateSealGate),
      has_net_handoff_contract: Boolean(NetHandoffContract)
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
      id: makeId("coreNetCycleHold"),
      held_at: now(),
      reason,
      target: clone(target),
      cycle_ready: false,
      net_ready: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_core_net_cycle_gate"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("coreNetCycleReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      cycle_ready: false,
      net_ready: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_core_net_cycle_gate"
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
      id: makeId("coreNetCycleReceive"),
      received_at: now(),
      input: clone(input),
      cycle_ready: false,
      net_ready: false,
      authority_allowed: false,
      release_allowed: false,
      certificate_valid: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_core_net_cycle_gate"
    };

    state.received.push(record);
    return record;
  }

  function isSealedCoreCertificate(input = {}) {
    if (!input || typeof input !== "object") {
      return false;
    }

    if (
      CoreCertificateSealGate &&
      typeof CoreCertificateSealGate.canEnterCoreToNetHandoff === "function"
    ) {
      return CoreCertificateSealGate.canEnterCoreToNetHandoff(input);
    }

    return (
      input.status === ACCEPTED_SEALED_STATUS &&
      input.certificate_valid === true &&
      input.authority_allowed === true &&
      input.release_allowed === true &&
      input.external_call_allowed === false &&
      input.executed === false &&
      input.certificate &&
      input.certificate.status === "authority_certificate_sealed"
    );
  }

  function verifySealed(input = {}) {
    configure();

    if (!isSealedCoreCertificate(input)) {
      return hold(input, "CORE_NET_CYCLE_REQUIRES_SEALED_CORE_CERTIFICATE");
    }

    if (
      !CoreCertificateSealGate ||
      typeof CoreCertificateSealGate.verifySealed !== "function"
    ) {
      return hold(input, "CORE_CERTIFICATE_SEAL_GATE_VERIFY_NOT_AVAILABLE");
    }

    const verified = CoreCertificateSealGate.verifySealed(input);

    const ok = Boolean(
      verified &&
      typeof verified === "object" &&
      verified.status === ACCEPTED_VERIFIED_STATUS &&
      verified.valid === true &&
      verified.certificate_valid === true &&
      verified.authority_allowed === true &&
      verified.release_allowed === true &&
      verified.external_call_allowed === false &&
      verified.executed === false
    );

    const record = {
      id: makeId("coreNetCycleVerify"),
      verified_at: now(),
      sealed_record_id: input.id || null,
      verified: clone(verified),
      sealed_record: clone(input),
      cycle_ready: ok,
      net_ready: false,
      authority_allowed: ok,
      release_allowed: ok,
      certificate_valid: ok,
      external_call_allowed: false,
      executed: false,
      status: ok
        ? "core_net_cycle_certificate_verified"
        : "core_net_cycle_certificate_failed_verify"
    };

    state.verified.push(record);

    if (!ok) {
      return hold(record, "CORE_NET_CYCLE_CERTIFICATE_VERIFY_FAILED");
    }

    return record;
  }

  function buildHandoffPayload(sealedRecord = {}, verifyRecord = {}, reason = "CORE_CERTIFICATE_RETURNING_TO_NET_HANDOFF") {
    return {
      id: makeId("coreNetCyclePayload"),
      built_at: now(),
      source: "core_net_cycle_gate",
      reason,
      sealed_record_id: sealedRecord.id || null,
      verify_record_id: verifyRecord.id || null,
      certificate:
        sealedRecord.certificate ||
        null,
      release_record:
        sealedRecord.release_record ||
        null,
      release_result:
        sealedRecord.release_result ||
        null,
      verification: clone(verifyRecord),
      cycle_ready: true,
      authority_allowed: true,
      release_allowed: true,
      certificate_valid: true,
      external_call_allowed: false,
      executed: false,
      status: "core_net_cycle_payload_ready"
    };
  }

  function handoffAllows(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.status === ACCEPTED_HANDOFF_STATUS &&
      result.net_ready === true &&
      result.authority_allowed === true &&
      result.release_allowed === true &&
      result.certificate_valid === true &&
      result.external_call_allowed === false &&
      result.executed === false
    );
  }

  function sendToNetHandoff(sealedRecord = {}, reason = "CORE_SEALED_CERTIFICATE_TO_NET_HANDOFF") {
    configure();

    const received = recordReceived(sealedRecord);

    if (!sealedRecord || typeof sealedRecord !== "object") {
      return reject(
        {
          received,
          sealedRecord
        },
        "INVALID_CORE_NET_CYCLE_INPUT"
      );
    }

    if (containsBlockedMaterial(sealedRecord)) {
      return hold(
        {
          received,
          sealedRecord
        },
        "CORE_NET_CYCLE_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!isSealedCoreCertificate(sealedRecord)) {
      return hold(
        {
          received,
          sealedRecord
        },
        "CORE_NET_CYCLE_REQUIRES_SEALED_CERTIFICATE_RECORD"
      );
    }

    const verifyRecord = verifySealed(sealedRecord);

    if (
      !verifyRecord ||
      typeof verifyRecord !== "object" ||
      verifyRecord.status !== "core_net_cycle_certificate_verified"
    ) {
      return hold(
        {
          received,
          sealedRecord,
          verifyRecord
        },
        "CORE_NET_CYCLE_CERTIFICATE_NOT_VERIFIED"
      );
    }

    if (!NetHandoffContract || typeof NetHandoffContract.review !== "function") {
      return hold(
        {
          received,
          sealedRecord,
          verifyRecord
        },
        "NET_HANDOFF_CONTRACT_NOT_AVAILABLE"
      );
    }

    const payload = buildHandoffPayload(sealedRecord, verifyRecord, reason);

    const handoff = NetHandoffContract.review(payload, {
      source: "core_net_cycle_gate",
      target: "net_receiver_pending"
    });

    if (!handoffAllows(handoff)) {
      return hold(
        {
          received,
          sealedRecord,
          verifyRecord,
          payload,
          handoff
        },
        "NET_HANDOFF_CONTRACT_DID_NOT_ACCEPT_CORE_CYCLE"
      );
    }

    const cycle = {
      id: makeId("coreNetCycle"),
      handed_off_at: now(),
      received_id: received.id,
      sealed_record_id: sealedRecord.id || null,
      verify_record_id: verifyRecord.id || null,
      payload: clone(payload),
      handoff: clone(handoff),
      cycle_ready: true,
      net_ready: true,
      authority_allowed: true,
      release_allowed: true,
      certificate_valid: true,
      external_call_allowed: false,
      executed: false,
      status: "core_net_cycle_handoff_ready_no_external_call"
    };

    state.handoffs.push(cycle);
    return cycle;
  }

  function receiveFromCertificateSealGate(input = {}, options = {}) {
    configure(options.deps || {});

    if (isSealedCoreCertificate(input)) {
      return sendToNetHandoff(
        input,
        options.reason || "SEALED_CORE_CERTIFICATE_SENT_TO_NET_HANDOFF"
      );
    }

    if (
      !CoreCertificateSealGate ||
      typeof CoreCertificateSealGate.receiveFromReleaseReturnGate !== "function"
    ) {
      return hold(input, "CORE_CERTIFICATE_SEAL_GATE_NOT_AVAILABLE");
    }

    const sealed = CoreCertificateSealGate.receiveFromReleaseReturnGate(input, options);

    if (!isSealedCoreCertificate(sealed)) {
      return hold(
        {
          input,
          sealed
        },
        "CORE_CERTIFICATE_SEAL_GATE_DID_NOT_SEAL_FOR_NET_CYCLE"
      );
    }

    return sendToNetHandoff(
      sealed,
      options.reason || "CERTIFICATE_SEAL_OUTPUT_SENT_TO_NET_HANDOFF"
    );
  }

  function canEnterNetReceiver(cycleRecord = {}) {
    return Boolean(
      cycleRecord &&
      typeof cycleRecord === "object" &&
      cycleRecord.status === "core_net_cycle_handoff_ready_no_external_call" &&
      cycleRecord.cycle_ready === true &&
      cycleRecord.net_ready === true &&
      cycleRecord.authority_allowed === true &&
      cycleRecord.release_allowed === true &&
      cycleRecord.certificate_valid === true &&
      cycleRecord.external_call_allowed === false &&
      cycleRecord.executed === false &&
      cycleRecord.handoff &&
      cycleRecord.handoff.status === ACCEPTED_HANDOFF_STATUS
    );
  }

  function readHandoff(cycleRecord = {}) {
    if (!canEnterNetReceiver(cycleRecord)) {
      return null;
    }

    return clone(cycleRecord.handoff);
  }

  function peekHandoffs() {
    return clone(state.handoffs);
  }

  function pullNextHandoff() {
    const next = state.handoffs.shift();

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
    sendToNetHandoff,
    receiveFromCertificateSealGate,
    verifySealed,
    buildHandoffPayload,
    isSealedCoreCertificate,
    containsBlockedMaterial,
    handoffAllows,
    canEnterNetReceiver,
    readHandoff,
    peekHandoffs,
    pullNextHandoff,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreNetCycleGate;
}
