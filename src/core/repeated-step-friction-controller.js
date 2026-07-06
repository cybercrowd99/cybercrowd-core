// src/core/repeated-step-friction-controller.js
// CyberCrowd Core — Repeated Step Friction Controller
// Owns: coordinating repeated-step friction detection, ledger recording,
// NET-safe status handoff, adapter audit visibility, and optional repair discovery trigger.
// Rule: Detector finds friction. Ledger records repair evidence.
// NET receives safe status. Adapter audit checks the repeat point.
// Friction is sought after for fine tuning.
// No blame. No punishment. No identity exposure.
// Does not: blame the human, punish the human, block the account,
// expose identity evidence, include private proof, include address/phone/first name/raw uIDL,
// send email, run payments, reopen accounts, or deal directly with customer.

const RepeatedStepFrictionController = (() => {
  const cycles = [];

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function requireObject(value, errorCode) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(errorCode);
    }

    return value;
  }

  function requireFunction(value, errorCode) {
    if (typeof value !== "function") {
      throw new Error(errorCode);
    }

    return value;
  }

  function normalizeText(value) {
    if (!value || typeof value !== "string") {
      return "";
    }

    return value.trim();
  }

  function normalizeBoolean(value) {
    return value === true;
  }

  function normalizeControllerInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    return {
      friction_input: requireObject(cleanInput.friction_input, "FRICTION_INPUT_REQUIRED"),
      forward_to_net: cleanInput.forward_to_net !== false,
      trigger_repair_discovery: normalizeBoolean(cleanInput.trigger_repair_discovery),
      repair_discovery_input: normalizeRepairDiscoveryInput(cleanInput.repair_discovery_input),
      notes: normalizeText(cleanInput.notes),
    };
  }

  function normalizeRepairDiscoveryInput(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {};
    }

    return clone(input);
  }

  function normalizeDependencies(dependencies = {}) {
    const cleanDependencies = requireObject(dependencies, "DEPENDENCIES_REQUIRED");

    return {
      detector: requireObject(cleanDependencies.detector, "DETECTOR_REQUIRED"),
      status_ledger: requireObject(cleanDependencies.status_ledger, "STATUS_LEDGER_REQUIRED"),
      net_receiver: cleanDependencies.net_receiver || null,
      repair_discovery_router: cleanDependencies.repair_discovery_router || null,
    };
  }

  function assertDetector(detector) {
    requireFunction(
      detector.detectRepeatedStepFriction,
      "DETECTOR_DETECT_REPEATED_STEP_FRICTION_REQUIRED"
    );
  }

  function assertStatusLedger(ledger) {
    requireFunction(
      ledger.recordRepeatedStepFrictionStatus,
      "STATUS_LEDGER_RECORD_REPEATED_STEP_FRICTION_REQUIRED"
    );

    requireFunction(
      ledger.latestNetSummary,
      "STATUS_LEDGER_LATEST_NET_SUMMARY_REQUIRED"
    );
  }

  function assertNetReceiver(receiver) {
    if (!receiver) {
      return;
    }

    requireFunction(receiver.receiveStatus, "NET_RECEIVER_RECEIVE_STATUS_REQUIRED");
  }

  function assertRepairDiscoveryRouter(router) {
    if (!router) {
      return;
    }

    requireFunction(router.routeRepairDiscovery, "REPAIR_DISCOVERY_ROUTER_ROUTE_REQUIRED");
  }

  function runRepeatedStepFrictionCycle(input = {}, dependencies = {}) {
    const normalizedInput = normalizeControllerInput(input);
    const normalizedDependencies = normalizeDependencies(dependencies);

    assertDetector(normalizedDependencies.detector);
    assertStatusLedger(normalizedDependencies.status_ledger);
    assertNetReceiver(normalizedDependencies.net_receiver);
    assertRepairDiscoveryRouter(normalizedDependencies.repair_discovery_router);

    const cycle = {
      cycle_id: makeId("repeatedStepFrictionCycle"),
      started_at: now(),
      status: "started",
      notes: normalizedInput.notes,
      steps: [],
    };

    try {
      const detection = runStep(cycle, "DETECT_REPEATED_STEP_FRICTION", () => {
        return normalizedDependencies.detector.detectRepeatedStepFriction(
          normalizedInput.friction_input
        );
      });

      const ledgerEntry = runStep(cycle, "RECORD_REPAIR_EVIDENCE", () => {
        return normalizedDependencies.status_ledger.recordRepeatedStepFrictionStatus(
          detection
        );
      });

      const netSummary = runStep(cycle, "PREPARE_NET_SUMMARY", () => {
        return normalizedDependencies.status_ledger.latestNetSummary();
      });

      let netReceipt = null;

      if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && netSummary) {
        netReceipt = runStep(cycle, "FORWARD_NET_SAFE_STATUS", () => {
          return normalizedDependencies.net_receiver.receiveStatus(netSummary);
        });
      }

      const adapterAudit = runStep(cycle, "PREPARE_ADAPTER_AUDIT_VISIBILITY", () => {
        return buildAdapterAuditVisibility(netReceipt, netSummary, ledgerEntry, detection);
      });

      let repairDiscoverySignal = null;

      if (
        normalizedInput.trigger_repair_discovery &&
        shouldTriggerRepairDiscovery(detection, ledgerEntry) &&
        normalizedDependencies.repair_discovery_router
      ) {
        repairDiscoverySignal = runStep(cycle, "TRIGGER_REPAIR_DISCOVERY_SIGNAL", () => {
          return normalizedDependencies.repair_discovery_router.routeRepairDiscovery(
            buildRepairDiscoveryInput(
              normalizedInput.repair_discovery_input,
              detection,
              ledgerEntry,
              adapterAudit
            )
          );
        });
      }

      cycle.status = "completed";
      cycle.completed_at = now();
      cycle.detection = clone(detection);
      cycle.ledger_entry = clone(ledgerEntry);
      cycle.net_summary = clone(netSummary);
      cycle.net_receipt = clone(netReceipt);
      cycle.adapter_audit = clone(adapterAudit);
      cycle.repair_discovery_signal = clone(repairDiscoverySignal);
      cycle.boundary = buildBoundarySummary(detection, ledgerEntry, adapterAudit);

      cycles.push(clone(cycle));

      return clone(cycle);
    } catch (error) {
      cycle.status = "failed";
      cycle.failed_at = now();
      cycle.error = {
        name: error && error.name ? error.name : "Error",
        message: error && error.message ? error.message : "UNKNOWN_ERROR",
      };

      cycles.push(clone(cycle));

      return clone(cycle);
    }
  }

  function runStep(cycle, stepName, callback) {
    const step = {
      step_id: makeId("repeatedStepFrictionStep"),
      step: stepName,
      started_at: now(),
      status: "started",
    };

    cycle.steps.push(step);

    try {
      const result = callback();

      step.status = "completed";
      step.completed_at = now();
      step.result_summary = summarizeStepResult(result);

      return result;
    } catch (error) {
      step.status = "failed";
      step.failed_at = now();
      step.error = {
        name: error && error.name ? error.name : "Error",
        message: error && error.message ? error.message : "UNKNOWN_ERROR",
      };

      throw error;
    }
  }

  function summarizeStepResult(result) {
    if (!result || typeof result !== "object") {
      return {
        type: typeof result,
      };
    }

    return {
      detection_id: normalizeText(result.detection_id),
      entry_id: normalizeText(result.entry_id),
      status: normalizeText(result.status),
      ledger_state: normalizeText(result.ledger_state),
      net_state: normalizeText(result.net_state),
      friction_score: result.friction_score || result.score || 0,
      adapter:
        result.adapter ||
        (result.adapter_audit && result.adapter_audit.adapter) ||
        "",
      lane:
        result.lane ||
        (result.adapter_audit && result.adapter_audit.lane) ||
        "",
      surface:
        result.surface ||
        (result.adapter_audit && result.adapter_audit.surface) ||
        "",
      step_repeated:
        result.step_repeated ||
        (result.adapter_audit && result.adapter_audit.step_repeated) ||
        "",
    };
  }

  function shouldTriggerRepairDiscovery(detection, ledgerEntry) {
    const detectionStatus = detection && detection.status ? detection.status : "";
    const ledgerState = ledgerEntry && ledgerEntry.ledger_state ? ledgerEntry.ledger_state : "";

    if (detectionStatus === "critical_repeat_friction") {
      return true;
    }

    if (detectionStatus === "repeat_friction_detected") {
      return true;
    }

    if (ledgerState === "critical_repeat_friction") {
      return true;
    }

    if (ledgerState === "repeat_friction_detected") {
      return true;
    }

    return false;
  }

  function buildAdapterAuditVisibility(netReceipt, netSummary, ledgerEntry, detection) {
    const audit =
      netReceipt && netReceipt.adapter_audit
        ? netReceipt.adapter_audit
        : buildFallbackAdapterAudit(netSummary, ledgerEntry, detection);

    return {
      audit_visibility_id: makeId("repeatedStepFrictionAdapterAuditVisibility"),
      created_at: now(),
      detection_id:
        normalizeText(audit.detection_id) ||
        normalizeText(detection && detection.detection_id),
      adapter: normalizeText(audit.adapter),
      lane: normalizeText(audit.lane),
      surface: normalizeText(audit.surface),
      step_repeated: normalizeText(audit.step_repeated),
      retry_pattern: normalizeText(audit.retry_pattern),
      needs_audit: audit.needs_audit === true,
      audit_priority: normalizeText(audit.audit_priority),
      recommended_review: normalizeText(audit.recommended_review),
      visible_to_net: Boolean(netReceipt),
      fine_tuning_signal_visible: isFineTuningVisible(netReceipt, netSummary, ledgerEntry),
      repair_evidence_visible: isRepairEvidenceVisible(netReceipt, netSummary, ledgerEntry),
      no_blame: true,
      no_punishment: true,
      no_identity_exposure: true,
    };
  }

  function buildFallbackAdapterAudit(netSummary, ledgerEntry, detection) {
    const repeatedSteps =
      netSummary && Array.isArray(netSummary.repeated_steps)
        ? netSummary.repeated_steps
        : detection && Array.isArray(detection.repeated_steps)
          ? detection.repeated_steps
          : [];

    const primaryStep = choosePrimaryRepeatedStep(repeatedSteps);

    return {
      detection_id:
        normalizeText(netSummary && netSummary.detection_id) ||
        normalizeText(ledgerEntry && ledgerEntry.detection_id) ||
        normalizeText(detection && detection.detection_id),
      adapter: inferAdapter(netSummary, ledgerEntry, detection, primaryStep),
      lane:
        normalizeText(primaryStep && primaryStep.lane) ||
        normalizeText(netSummary && netSummary.lane) ||
        normalizeText(ledgerEntry && ledgerEntry.lane) ||
        normalizeText(detection && detection.lane),
      surface:
        normalizeText(primaryStep && primaryStep.surface) ||
        normalizeText(netSummary && netSummary.surface) ||
        normalizeText(ledgerEntry && ledgerEntry.surface) ||
        normalizeText(detection && detection.surface),
      step_repeated: buildStepRepeatedLabel(primaryStep),
      retry_pattern: buildRetryPattern(primaryStep),
      needs_audit: hasFineTuningSignal(netSummary, ledgerEntry, detection),
      audit_priority: deriveAuditPriority(netSummary, ledgerEntry, detection),
      recommended_review: buildRecommendedAuditReview(primaryStep),
    };
  }

  function choosePrimaryRepeatedStep(steps) {
    if (!Array.isArray(steps) || !steps.length) {
      return null;
    }

    return steps
      .slice()
      .sort((a, b) => {
        return scoreStepForAudit(b) - scoreStepForAudit(a);
      })[0];
  }

  function scoreStepForAudit(step = {}) {
    let score = 0;

    score += Number(step.event_count || 0);
    score += Number(step.failure_count || 0) * 2;
    score += Number(step.restart_count || 0) * 3;
    score += Number(step.timeout_count || 0) * 2;
    score += Number(step.backtrack_count || 0) * 2;
    score += Number(step.resend_count || 0) * 2;
    score += Number(step.retry_count || 0) * 2;
    score += Number(step.verification_repeat_count || 0);

    if (step.likely_frustration === true) {
      score += 5;
    }

    return score;
  }

  function inferAdapter(netSummary, ledgerEntry, detection, step) {
    const surface =
      normalizeText(step && step.surface) ||
      normalizeText(netSummary && netSummary.surface) ||
      normalizeText(ledgerEntry && ledgerEntry.surface) ||
      normalizeText(detection && detection.surface);

    const lane =
      normalizeText(step && step.lane) ||
      normalizeText(netSummary && netSummary.lane) ||
      normalizeText(ledgerEntry && ledgerEntry.lane) ||
      normalizeText(detection && detection.lane);

    if (surface) {
      return `${surface}-adapter`;
    }

    if (lane) {
      return `${lane}-adapter`;
    }

    return "unknown-adapter";
  }

  function buildStepRepeatedLabel(step) {
    if (!step) {
      return "none";
    }

    return (
      normalizeText(step.step_name) ||
      normalizeText(step.step_id) ||
      normalizeText(step.step_key) ||
      "unknown_step"
    );
  }

  function buildRetryPattern(step) {
    if (!step) {
      return "none";
    }

    const pieces = [];

    if (Number(step.failure_count || 0) > 0) {
      pieces.push(`failure:${step.failure_count}`);
    }

    if (Number(step.restart_count || 0) > 0) {
      pieces.push(`restart:${step.restart_count}`);
    }

    if (Number(step.timeout_count || 0) > 0) {
      pieces.push(`timeout:${step.timeout_count}`);
    }

    if (Number(step.backtrack_count || 0) > 0) {
      pieces.push(`backtrack:${step.backtrack_count}`);
    }

    if (Number(step.resend_count || 0) > 0) {
      pieces.push(`resend:${step.resend_count}`);
    }

    if (Number(step.retry_count || 0) > 0) {
      pieces.push(`retry:${step.retry_count}`);
    }

    if (Number(step.verification_repeat_count || 0) > 0) {
      pieces.push(`verification:${step.verification_repeat_count}`);
    }

    if (!pieces.length && Number(step.event_count || 0) > 0) {
      pieces.push(`repeat:${step.event_count}`);
    }

    return pieces.join(" · ") || "none";
  }

  function buildRecommendedAuditReview(step) {
    if (!step) {
      return "review repeat-language signal";
    }

    const actions = [];

    if (Number(step.failure_count || 0) > 0) {
      actions.push("inspect failure handoff");
    }

    if (Number(step.restart_count || 0) > 0) {
      actions.push("preserve progress before restart");
    }

    if (Number(step.timeout_count || 0) > 0) {
      actions.push("review timeout window");
    }

    if (Number(step.backtrack_count || 0) > 0) {
      actions.push("inspect back-button loop");
    }

    if (Number(step.resend_count || 0) > 0) {
      actions.push("review resend state");
    }

    if (Number(step.retry_count || 0) > 0) {
      actions.push("review retry copy and step lock");
    }

    if (Number(step.verification_repeat_count || 0) > 1) {
      actions.push("audit verification adapter");
    }

    if (!actions.length) {
      actions.push("review repeated step and remove unnecessary repeat");
    }

    return actions.join(" · ");
  }

  function hasFineTuningSignal(netSummary, ledgerEntry, detection) {
    if (
      netSummary &&
      netSummary.fine_tuning_summary &&
      netSummary.fine_tuning_summary.fine_tuning_signal_present === true
    ) {
      return true;
    }

    if (
      ledgerEntry &&
      ledgerEntry.fine_tuning_summary &&
      ledgerEntry.fine_tuning_summary.fine_tuning_signal_present === true
    ) {
      return true;
    }

    return Boolean(
      detection &&
      detection.repair_signal &&
      detection.repair_signal.repair_needed
    );
  }

  function deriveAuditPriority(netSummary, ledgerEntry, detection) {
    const priority =
      normalizeText(
        netSummary &&
          netSummary.fine_tuning_summary &&
          netSummary.fine_tuning_summary.priority
      ) ||
      normalizeText(
        ledgerEntry &&
          ledgerEntry.fine_tuning_summary &&
          ledgerEntry.fine_tuning_summary.priority
      );

    if (priority) {
      return priority;
    }

    const status =
      normalizeText(detection && detection.status) ||
      normalizeText(ledgerEntry && ledgerEntry.ledger_state);

    if (status === "critical_repeat_friction") {
      return "high";
    }

    if (status === "repeat_friction_detected") {
      return "medium";
    }

    if (status === "repeat_friction_possible") {
      return "review";
    }

    return "none";
  }

  function isFineTuningVisible(netReceipt, netSummary, ledgerEntry) {
    if (netReceipt && netReceipt.adapter_audit) {
      return Boolean(netReceipt.adapter_audit.needs_audit);
    }

    return hasFineTuningSignal(netSummary, ledgerEntry, null);
  }

  function isRepairEvidenceVisible(netReceipt, netSummary, ledgerEntry) {
    if (
      netReceipt &&
      netReceipt.repair_signal &&
      netReceipt.repair_signal.repair_needed === true
    ) {
      return true;
    }

    if (
      netSummary &&
      netSummary.repair_signal &&
      netSummary.repair_signal.repair_needed === true
    ) {
      return true;
    }

    if (
      ledgerEntry &&
      ledgerEntry.repair_signal &&
      ledgerEntry.repair_signal.repair_needed === true
    ) {
      return true;
    }

    return false;
  }

  function buildRepairDiscoveryInput(baseInput, detection, ledgerEntry, adapterAudit) {
    const cleanBase = baseInput && typeof baseInput === "object" && !Array.isArray(baseInput)
      ? clone(baseInput)
      : {};

    cleanBase.source = cleanBase.source || "core.repeated-step-friction-controller";
    cleanBase.trigger_reason = cleanBase.trigger_reason || "REPEATED_STEP_FRICTION_REPAIR_EVIDENCE";
    cleanBase.detection_id = cleanBase.detection_id || detection.detection_id;
    cleanBase.account_number = cleanBase.account_number || detection.account_number || ledgerEntry.account_number || "";
    cleanBase.account_tag = cleanBase.account_tag || detection.account_tag || ledgerEntry.account_tag || "";
    cleanBase.uidl_hint = cleanBase.uidl_hint || detection.uidl_hint || ledgerEntry.uidl_hint || "";
    cleanBase.report_id = cleanBase.report_id || detection.report_id || ledgerEntry.report_id || "";
    cleanBase.survey_id = cleanBase.survey_id || detection.survey_id || ledgerEntry.survey_id || "";
    cleanBase.lane = cleanBase.lane || adapterAudit.lane || detection.lane || ledgerEntry.lane || "";
    cleanBase.surface = cleanBase.surface || adapterAudit.surface || detection.surface || ledgerEntry.surface || "";
    cleanBase.repair_value = cleanBase.repair_value || "repeated_step_friction";
    cleanBase.safe_feedback = cleanBase.safe_feedback || buildRepairDiscoverySafeFeedback(adapterAudit);

    return cleanBase;
  }

  function buildRepairDiscoverySafeFeedback(adapterAudit) {
    return [
      "State the problem.",
      "Repeated-step friction was detected.",
      `Adapter: ${adapterAudit.adapter || "unknown"}.`,
      `Lane: ${adapterAudit.lane || "unknown"}.`,
      `Surface: ${adapterAudit.surface || "unknown"}.`,
      `Step repeated: ${adapterAudit.step_repeated || "unknown"}.`,
      `Retry pattern: ${adapterAudit.retry_pattern || "none"}.`,
      `Audit: ${adapterAudit.recommended_review || "review repeated step"}.`,
    ].join(" ");
  }

  function buildBoundarySummary(detection, ledgerEntry, adapterAudit) {
    return {
      cycle_value: "repeated_step_friction_to_repair_evidence",
      detection_state: normalizeText(detection && detection.status),
      ledger_state: normalizeText(ledgerEntry && ledgerEntry.ledger_state),
      adapter: normalizeText(adapterAudit && adapterAudit.adapter),
      lane: normalizeText(adapterAudit && adapterAudit.lane),
      surface: normalizeText(adapterAudit && adapterAudit.surface),
      step_repeated: normalizeText(adapterAudit && adapterAudit.step_repeated),
      retry_pattern: normalizeText(adapterAudit && adapterAudit.retry_pattern),
      needs_audit: Boolean(adapterAudit && adapterAudit.needs_audit),
      doctrine: "REPEATING_THE_HUMAN_IS_A_WARNING_FRICTION_IS_REPAIR_EVIDENCE",
      fine_tuning: "FRICTION_IS_SOUGHT_AFTER_FOR_FINE_TUNING",
      no_blame: true,
      no_punishment: true,
      no_identity_exposure: true,
    };
  }

  function listCycles(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const status = normalizeText(cleanFilter.status);
    const detectionId = normalizeText(cleanFilter.detection_id);
    const ledgerState = normalizeText(cleanFilter.ledger_state);
    const lane = normalizeText(cleanFilter.lane);
    const adapter = normalizeText(cleanFilter.adapter);

    return cycles
      .filter((cycle) => {
        if (status && cycle.status !== status) {
          return false;
        }

        if (detectionId) {
          const cycleDetectionId =
            cycle.detection && cycle.detection.detection_id
              ? cycle.detection.detection_id
              : "";

          if (cycleDetectionId !== detectionId) {
            return false;
          }
        }

        if (ledgerState) {
          const cycleLedgerState =
            cycle.ledger_entry && cycle.ledger_entry.ledger_state
              ? cycle.ledger_entry.ledger_state
              : "";

          if (cycleLedgerState !== ledgerState) {
            return false;
          }
        }

        if (lane) {
          const cycleLane =
            cycle.adapter_audit && cycle.adapter_audit.lane
              ? cycle.adapter_audit.lane
              : "";

          if (cycleLane !== lane) {
            return false;
          }
        }

        if (adapter) {
          const cycleAdapter =
            cycle.adapter_audit && cycle.adapter_audit.adapter
              ? cycle.adapter_audit.adapter
              : "";

          if (cycleAdapter !== adapter) {
            return false;
          }
        }

        return true;
      })
      .map(clone);
  }

  function latestCycle() {
    if (!cycles.length) {
      return null;
    }

    return clone(cycles[cycles.length - 1]);
  }

  function clearCycles() {
    cycles.length = 0;
    return true;
  }

  return {
    runRepeatedStepFrictionCycle,
    listCycles,
    latestCycle,
    clearCycles,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = RepeatedStepFrictionController;
}
