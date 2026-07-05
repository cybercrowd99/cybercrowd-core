// c-s-i-and-g-core-organ-controller.js
// CyberCrowd — CSI&G Core Organ Controller
//
// Owns:
// - tying the CSI&G Core proof ladder into one organ-facing controller
// - receiving safe Core inputs
// - routing evidence through review, corroboration, support, candidate, formation, release, seal, and NET cycle readiness
// - returning one readable organ status
// - stopping before authority execution
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

const CyberCrowdCoreOrganController = (() => {
  const ORGAN_NAME = "csi_and_g_core_organ";
  const ORGAN_READY_STATUS = "csi_and_g_core_organ_ready_no_authority";
  const ORGAN_PENDING_STATUS = "csi_and_g_core_organ_pending_no_authority";
  const ORGAN_HELD_STATUS = "csi_and_g_core_organ_held_no_authority";
  const ORGAN_REJECTED_STATUS = "csi_and_g_core_organ_rejected_no_authority";

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
    runs: [],
    ready: [],
    pending: [],
    held: [],
    rejected: []
  };

  let CoreEvidenceReviewLedger = null;
  let CoreEvidenceBundleBridge = null;
  let CoreAudioEvidenceReceiver = null;
  let CoreAudioBundleBridge = null;
  let CoreAudioContextLedgerBridge = null;
  let CoreCorroborationLedger = null;
  let CoreCorroboratedSupportBridge = null;
  let CoreBundleCandidateGate = null;
  let CoreBundleFormationGate = null;
  let CoreReleaseReturnGate = null;
  let CoreCertificateSealGate = null;
  let CoreNetCycleGate = null;

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
    CoreEvidenceReviewLedger =
      deps.CoreEvidenceReviewLedger ||
      deps.coreEvidenceReviewLedger ||
      deps.evidenceReviewLedger ||
      CoreEvidenceReviewLedger ||
      safeRequire("./c-s-i-and-g-core-evidence-review-ledger.js") ||
      null;

    CoreEvidenceBundleBridge =
      deps.CoreEvidenceBundleBridge ||
      deps.coreEvidenceBundleBridge ||
      deps.evidenceBundleBridge ||
      CoreEvidenceBundleBridge ||
      safeRequire("./c-s-i-and-g-core-evidence-bundle-bridge.js") ||
      null;

    CoreAudioEvidenceReceiver =
      deps.CoreAudioEvidenceReceiver ||
      deps.coreAudioEvidenceReceiver ||
      deps.audioEvidenceReceiver ||
      CoreAudioEvidenceReceiver ||
      safeRequire("./c-s-i-and-g-core-audio-ping-peg-evidence-receiver.js") ||
      null;

    CoreAudioBundleBridge =
      deps.CoreAudioBundleBridge ||
      deps.coreAudioBundleBridge ||
      deps.audioBundleBridge ||
      CoreAudioBundleBridge ||
      safeRequire("./c-s-i-and-g-core-audio-ping-peg-bundle-bridge.js") ||
      null;

    CoreAudioContextLedgerBridge =
      deps.CoreAudioContextLedgerBridge ||
      deps.coreAudioContextLedgerBridge ||
      deps.audioContextLedgerBridge ||
      CoreAudioContextLedgerBridge ||
      safeRequire("./c-s-i-and-g-core-audio-ping-peg-context-ledger-bridge.js") ||
      null;

    CoreCorroborationLedger =
      deps.CoreCorroborationLedger ||
      deps.coreCorroborationLedger ||
      deps.corroborationLedger ||
      CoreCorroborationLedger ||
      safeRequire("./c-s-i-and-g-core-corroboration-ledger.js") ||
      null;

    CoreCorroboratedSupportBridge =
      deps.CoreCorroboratedSupportBridge ||
      deps.coreCorroboratedSupportBridge ||
      deps.corroboratedSupportBridge ||
      CoreCorroboratedSupportBridge ||
      safeRequire("./c-s-i-and-g-core-corroborated-support-bridge.js") ||
      null;

    CoreBundleCandidateGate =
      deps.CoreBundleCandidateGate ||
      deps.coreBundleCandidateGate ||
      deps.bundleCandidateGate ||
      CoreBundleCandidateGate ||
      safeRequire("./c-s-i-and-g-core-bundle-candidate-gate.js") ||
      null;

    CoreBundleFormationGate =
      deps.CoreBundleFormationGate ||
      deps.coreBundleFormationGate ||
      deps.bundleFormationGate ||
      CoreBundleFormationGate ||
      safeRequire("./c-s-i-and-g-core-bundle-formation-gate.js") ||
      null;

    CoreReleaseReturnGate =
      deps.CoreReleaseReturnGate ||
      deps.coreReleaseReturnGate ||
      deps.releaseReturnGate ||
      CoreReleaseReturnGate ||
      safeRequire("./c-s-i-and-g-core-release-return-gate.js") ||
      null;

    CoreCertificateSealGate =
      deps.CoreCertificateSealGate ||
      deps.coreCertificateSealGate ||
      deps.certificateSealGate ||
      CoreCertificateSealGate ||
      safeRequire("./c-s-i-and-g-core-certificate-seal-gate.js") ||
      null;

    CoreNetCycleGate =
      deps.CoreNetCycleGate ||
      deps.coreNetCycleGate ||
      deps.netCycleGate ||
      CoreNetCycleGate ||
      safeRequire("./c-s-i-and-g-core-net-cycle-gate.js") ||
      null;

    state.configured = Boolean(
      CoreEvidenceReviewLedger ||
      CoreEvidenceBundleBridge ||
      CoreAudioEvidenceReceiver ||
      CoreAudioBundleBridge ||
      CoreAudioContextLedgerBridge ||
      CoreCorroborationLedger ||
      CoreCorroboratedSupportBridge ||
      CoreBundleCandidateGate ||
      CoreBundleFormationGate ||
      CoreReleaseReturnGate ||
      CoreCertificateSealGate ||
      CoreNetCycleGate
    );

    return {
      configured: state.configured,
      has_core_evidence_review_ledger: Boolean(CoreEvidenceReviewLedger),
      has_core_evidence_bundle_bridge: Boolean(CoreEvidenceBundleBridge),
      has_core_audio_evidence_receiver: Boolean(CoreAudioEvidenceReceiver),
      has_core_audio_bundle_bridge: Boolean(CoreAudioBundleBridge),
      has_core_audio_context_ledger_bridge: Boolean(CoreAudioContextLedgerBridge),
      has_core_corroboration_ledger: Boolean(CoreCorroborationLedger),
      has_core_corroborated_support_bridge: Boolean(CoreCorroboratedSupportBridge),
      has_core_bundle_candidate_gate: Boolean(CoreBundleCandidateGate),
      has_core_bundle_formation_gate: Boolean(CoreBundleFormationGate),
      has_core_release_return_gate: Boolean(CoreReleaseReturnGate),
      has_core_certificate_seal_gate: Boolean(CoreCertificateSealGate),
      has_core_net_cycle_gate: Boolean(CoreNetCycleGate)
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

  function containsBlockedMaterial(input) {
    const text = toText(input);

    return BLOCKED_MARKERS.some((marker) => {
      return text.includes(marker);
    });
  }

  function recordReceived(input = {}) {
    const record = {
      id: makeId("csiCoreOrganReceive"),
      received_at: now(),
      input: clone(input),
      organ: ORGAN_NAME,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_csi_and_g_core_organ_controller"
    };

    state.received.push(record);
    return record;
  }

  function hold(target, reason) {
    const record = {
      id: makeId("csiCoreOrganHold"),
      held_at: now(),
      organ: ORGAN_NAME,
      reason,
      target: clone(target),
      organ_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: ORGAN_HELD_STATUS
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("csiCoreOrganReject"),
      rejected_at: now(),
      organ: ORGAN_NAME,
      reason,
      target: clone(target),
      organ_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: ORGAN_REJECTED_STATUS
    };

    state.rejected.push(record);
    return record;
  }

  function markPending(run = {}, reason = "CSI_AND_G_CORE_ORGAN_PENDING") {
    const record = Object.assign({}, clone(run), {
      reviewed_at: now(),
      pending_reason: reason,
      organ_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: ORGAN_PENDING_STATUS
    });

    state.pending.push(record);
    state.runs.push(record);
    return record;
  }

  function markReady(run = {}) {
    const record = Object.assign({}, clone(run), {
      reviewed_at: now(),
      organ_ready: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: ORGAN_READY_STATUS
    });

    state.ready.push(record);
    state.runs.push(record);
    return record;
  }

  function callStep(tool, methodNames = [], input = {}, options = {}) {
    if (!tool) {
      return null;
    }

    for (let index = 0; index < methodNames.length; index += 1) {
      const methodName = methodNames[index];

      if (typeof tool[methodName] === "function") {
        return tool[methodName](input, options);
      }
    }

    return null;
  }

  function stepSucceeded(result = {}) {
    return Boolean(
      result &&
      typeof result === "object" &&
      result.authority_allowed === false &&
      result.external_call_allowed === false &&
      result.executed === false &&
      !String(result.status || "").includes("rejected") &&
      !String(result.status || "").includes("held")
    );
  }

  function stepLooksReady(result = {}, readyFlags = []) {
    if (!stepSucceeded(result)) {
      return false;
    }

    return readyFlags.every((flag) => result[flag] === true);
  }

  function buildStep(name, result = {}) {
    return {
      name,
      at: now(),
      status: result && result.status || "step_not_available",
      ready: Boolean(result),
      result: clone(result),
      authority_allowed: false,
      external_call_allowed: false,
      executed: false
    };
  }

  function readInputKind(input = {}) {
    const kind = cleanText(
      input.kind ||
      input.input_kind ||
      input.source_kind ||
      input.evidence_kind ||
      input.provider_family ||
      input.provider ||
      input.platform ||
      ""
    );

    if (kind.includes("audio") || kind.includes("spotify") || kind.includes("pandora")) {
      return "audio_ping_peg";
    }

    if (kind.includes("witness") || kind.includes("ring") || kind.includes("phone")) {
      return "witness_context";
    }

    if (kind.includes("corroborated")) {
      return "corroborated_support";
    }

    if (kind.includes("candidate")) {
      return "bundle_candidate";
    }

    return "general_evidence_context";
  }

  function makeLocalStepResult(input = {}, status, flags = {}) {
    return Object.assign(
      {
        id: makeId("csiCoreOrganLocalStep"),
        created_at: now(),
        source: "csi_and_g_core_organ_controller",
        input: clone(input),
        authority_allowed: false,
        external_call_allowed: false,
        executed: false,
        status
      },
      flags || {}
    );
  }

  function reviewEvidence(input = {}, options = {}) {
    const result = callStep(
      CoreEvidenceReviewLedger,
      [
        "receive",
        "review",
        "recordEvidence",
        "record",
        "add"
      ],
      input,
      options
    );

    if (result) {
      return result;
    }

    return makeLocalStepResult(
      input,
      "core_evidence_review_local_preserved_no_authority",
      {
        evidence_reviewed: true,
        evidence_only: true
      }
    );
  }

  function bridgeEvidenceBundle(reviewResult = {}, options = {}) {
    const result = callStep(
      CoreEvidenceBundleBridge,
      [
        "receiveFromEvidenceReview",
        "bridgeEvidence",
        "receive",
        "bridge",
        "record"
      ],
      reviewResult,
      options
    );

    if (result) {
      return result;
    }

    return makeLocalStepResult(
      reviewResult,
      "core_evidence_bundle_bridge_local_preserved_no_authority",
      {
        evidence_bundle_ready: true,
        evidence_only: true
      }
    );
  }

  function runAudioPath(input = {}, options = {}) {
    const audioEvidence = callStep(
      CoreAudioEvidenceReceiver,
      [
        "receiveFromCoreReturnBridge",
        "receive",
        "recordEvidence",
        "record"
      ],
      input,
      options
    ) || makeLocalStepResult(
      input,
      "core_audio_ping_peg_evidence_local_preserved_no_authority",
      {
        audio_evidence_ready: true,
        evidence_only: true
      }
    );

    const audioBundle = callStep(
      CoreAudioBundleBridge,
      [
        "receiveFromAudioEvidenceReceiver",
        "receive",
        "bridge",
        "record"
      ],
      audioEvidence,
      options
    ) || makeLocalStepResult(
      audioEvidence,
      "core_audio_ping_peg_bundle_local_preserved_no_authority",
      {
        audio_bundle_ready: true,
        evidence_only: true
      }
    );

    const audioContext = callStep(
      CoreAudioContextLedgerBridge,
      [
        "receiveFromAudioBundleBridge",
        "receive",
        "bridge",
        "record"
      ],
      audioBundle,
      options
    ) || makeLocalStepResult(
      audioBundle,
      "core_audio_ping_peg_context_recorded_no_authority",
      {
        bundle_context_ready: true,
        corroboration_required: true,
        evidence_only: true
      }
    );

    return {
      audioEvidence,
      audioBundle,
      audioContext
    };
  }

  function runCorroborationPath(contextInput = {}, options = {}) {
    const corroboration = callStep(
      CoreCorroborationLedger,
      [
        "recordContext",
        "receiveFromAudioContextLedgerBridge",
        "receive",
        "record"
      ],
      contextInput,
      options
    );

    if (!corroboration) {
      return {
        corroboration: makeLocalStepResult(
          contextInput,
          "core_evidence_context_corroboration_pending_no_authority",
          {
            corroborated: false,
            corroboration_pending: true,
            single_source_hold: true,
            evidence_only: true
          }
        ),
        support: null,
        candidate: null
      };
    }

    if (
      CoreCorroborationLedger &&
      typeof CoreCorroborationLedger.canSupportBundle === "function" &&
      !CoreCorroborationLedger.canSupportBundle(corroboration)
    ) {
      return {
        corroboration,
        support: null,
        candidate: null
      };
    }

    const support = callStep(
      CoreCorroboratedSupportBridge,
      [
        "bridgeSupport",
        "receiveFromCorroborationLedger",
        "receive",
        "bridge"
      ],
      corroboration,
      options
    );

    if (!support) {
      return {
        corroboration,
        support: makeLocalStepResult(
          corroboration,
          "core_corroborated_support_recorded_local_no_authority",
          {
            corroborated_support_ready: true,
            context_ledger_recorded: true,
            evidence_support_ready: true,
            evidence_only: true
          }
        ),
        candidate: null
      };
    }

    const candidate = callStep(
      CoreBundleCandidateGate,
      [
        "receive",
        "receiveFromCorroboratedSupportBridge",
        "record",
        "bridge"
      ],
      support,
      options
    );

    return {
      corroboration,
      support,
      candidate
    };
  }

  function runCandidatePath(input = {}, options = {}) {
    const candidate = callStep(
      CoreBundleCandidateGate,
      [
        "receive",
        "receiveFromCorroboratedSupportBridge",
        "record"
      ],
      input,
      options
    );

    return {
      candidate
    };
  }

  function runFormationPath(candidate = {}, options = {}) {
    const formation = callStep(
      CoreBundleFormationGate,
      [
        "receive",
        "formBundle",
        "buildBundle",
        "evaluate",
        "record"
      ],
      candidate,
      options
    );

    const safeFormation = formation || makeLocalStepResult(
      candidate,
      "core_bundle_formation_waiting_for_existing_gate_no_authority",
      {
        bundle_formation_ready: false,
        evidence_only: true
      }
    );

    const release = callStep(
      CoreReleaseReturnGate,
      [
        "receive",
        "reviewRelease",
        "returnRelease",
        "record"
      ],
      safeFormation,
      options
    );

    const safeRelease = release || makeLocalStepResult(
      safeFormation,
      "core_release_return_waiting_for_existing_gate_no_authority",
      {
        release_return_ready: false,
        evidence_only: true
      }
    );

    const seal = callStep(
      CoreCertificateSealGate,
      [
        "receive",
        "sealCertificate",
        "seal",
        "record"
      ],
      safeRelease,
      options
    );

    const safeSeal = seal || makeLocalStepResult(
      safeRelease,
      "core_certificate_seal_waiting_for_existing_gate_no_authority",
      {
        certificate_seal_ready: false,
        evidence_only: true
      }
    );

    const netCycle = callStep(
      CoreNetCycleGate,
      [
        "receive",
        "prepareNetCycle",
        "prepare",
        "record"
      ],
      safeSeal,
      options
    );

    const safeNetCycle = netCycle || makeLocalStepResult(
      safeSeal,
      "core_net_cycle_waiting_for_existing_gate_no_authority",
      {
        net_cycle_ready: false,
        evidence_only: true
      }
    );

    return {
      formation: safeFormation,
      release: safeRelease,
      seal: safeSeal,
      netCycle: safeNetCycle
    };
  }

  function buildOrganRun(input = {}, received = {}, options = {}) {
    const inputKind = readInputKind(input);
    const steps = [];

    let contextInput = input;
    let candidate = null;

    if (inputKind === "audio_ping_peg") {
      const audioPath = runAudioPath(input, options);

      steps.push(buildStep("core_audio_evidence_receiver", audioPath.audioEvidence));
      steps.push(buildStep("core_audio_bundle_bridge", audioPath.audioBundle));
      steps.push(buildStep("core_audio_context_ledger_bridge", audioPath.audioContext));

      contextInput = audioPath.audioContext;
    } else if (inputKind === "bundle_candidate") {
      const candidatePath = runCandidatePath(input, options);

      candidate = candidatePath.candidate;
      steps.push(buildStep("core_bundle_candidate_gate", candidate));
    } else {
      const review = reviewEvidence(input, options);
      const evidenceBundle = bridgeEvidenceBundle(review, options);

      steps.push(buildStep("core_evidence_review_ledger", review));
      steps.push(buildStep("core_evidence_bundle_bridge", evidenceBundle));

      contextInput = evidenceBundle;
    }

    if (!candidate) {
      const corroborationPath = runCorroborationPath(contextInput, options);

      steps.push(buildStep("core_corroboration_ledger", corroborationPath.corroboration));

      if (corroborationPath.support) {
        steps.push(buildStep("core_corroborated_support_bridge", corroborationPath.support));
      }

      if (corroborationPath.candidate) {
        candidate = corroborationPath.candidate;
        steps.push(buildStep("core_bundle_candidate_gate", candidate));
      }
    }

    let formationPath = null;

    if (
      candidate &&
      CoreBundleCandidateGate &&
      typeof CoreBundleCandidateGate.canEnterBundleFormation === "function" &&
      CoreBundleCandidateGate.canEnterBundleFormation(candidate)
    ) {
      formationPath = runFormationPath(candidate, options);

      steps.push(buildStep("core_bundle_formation_gate", formationPath.formation));
      steps.push(buildStep("core_release_return_gate", formationPath.release));
      steps.push(buildStep("core_certificate_seal_gate", formationPath.seal));
      steps.push(buildStep("core_net_cycle_gate", formationPath.netCycle));
    }

    return {
      id: makeId("csiCoreOrganRun"),
      organ: ORGAN_NAME,
      received_id: received.id,
      input_kind: inputKind,
      created_at: now(),
      steps,
      candidate: clone(candidate),
      formation_path: clone(formationPath),
      organ_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: ORGAN_PENDING_STATUS
    };
  }

  function organLooksReady(run = {}) {
    if (!run || typeof run !== "object") {
      return false;
    }

    const steps = Array.isArray(run.steps) ? run.steps : [];
    const blockedStep = steps.find((step) => {
      const status = String(step.status || "");
      return (
        status.includes("rejected") ||
        status.includes("held") ||
        status.includes("blocked")
      );
    });

    if (blockedStep) {
      return false;
    }

    const hasCandidateReady = Boolean(
      run.candidate &&
      run.candidate.candidate_ready === true &&
      run.candidate.authority_allowed === false &&
      run.candidate.external_call_allowed === false &&
      run.candidate.executed === false
    );

    const hasNetCycleReady = Boolean(
      run.formation_path &&
      run.formation_path.netCycle &&
      (
        run.formation_path.netCycle.net_cycle_ready === true ||
        String(run.formation_path.netCycle.status || "").includes("net_cycle")
      ) &&
      run.formation_path.netCycle.authority_allowed === false &&
      run.formation_path.netCycle.external_call_allowed === false &&
      run.formation_path.netCycle.executed === false
    );

    return Boolean(
      hasCandidateReady &&
      hasNetCycleReady &&
      run.authority_allowed === false &&
      run.external_call_allowed === false &&
      run.executed === false
    );
  }

  function receive(input = {}, options = {}) {
    configure(options.deps || {});

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CSI_AND_G_CORE_ORGAN_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CSI_AND_G_CORE_ORGAN_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const run = buildOrganRun(input, received, options);

    if (containsBlockedMaterial(run)) {
      return hold(
        {
          received,
          input,
          run
        },
        "CSI_AND_G_CORE_ORGAN_RUN_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    if (!organLooksReady(run)) {
      return markPending(run, "CSI_AND_G_CORE_ORGAN_WAITING_FOR_CORROBORATED_CANDIDATE_OR_NET_CYCLE");
    }

    return markReady(run);
  }

  function receiveAudioPingPeg(input = {}, options = {}) {
    return receive(
      Object.assign({}, clone(input), {
        kind: "audio_ping_peg"
      }),
      options
    );
  }

  function receiveWitnessContext(input = {}, options = {}) {
    return receive(
      Object.assign({}, clone(input), {
        kind: "witness_context"
      }),
      options
    );
  }

  function receiveBundleCandidate(input = {}, options = {}) {
    return receive(
      Object.assign({}, clone(input), {
        kind: "bundle_candidate"
      }),
      options
    );
  }

  function organStatus() {
    return {
      organ: ORGAN_NAME,
      configured: state.configured,
      received_count: state.received.length,
      run_count: state.runs.length,
      ready_count: state.ready.length,
      pending_count: state.pending.length,
      held_count: state.held.length,
      rejected_count: state.rejected.length,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: state.ready.length > 0 ? ORGAN_READY_STATUS : ORGAN_PENDING_STATUS
    };
  }

  function readLastRun() {
    if (!state.runs.length) {
      return null;
    }

    return clone(state.runs[state.runs.length - 1]);
  }

  function peekReady() {
    return clone(state.ready);
  }

  function peekPending() {
    return clone(state.pending);
  }

  function pullNextReady() {
    const next = state.ready.shift();

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
    ORGAN_NAME,
    ORGAN_READY_STATUS,
    ORGAN_PENDING_STATUS,
    ORGAN_HELD_STATUS,
    ORGAN_REJECTED_STATUS,
    configure,
    receive,
    receiveAudioPingPeg,
    receiveWitnessContext,
    receiveBundleCandidate,
    buildOrganRun,
    organLooksReady,
    organStatus,
    readLastRun,
    peekReady,
    peekPending,
    pullNextReady,
    containsBlockedMaterial,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreOrganController;
}
