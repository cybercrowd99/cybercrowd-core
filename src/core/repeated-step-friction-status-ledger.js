// src/core/repeated-step-friction-status-ledger.js
// CyberCrowd Core — Repeated Step Friction Status Ledger
// Owns: recording repeated-step friction detections and preparing NET-safe summaries.
// Rule: Detector finds repeated-step friction. Ledger records repair evidence.
// NET receives safe status. Repeating the human is a warning.
// Friction is not blame. Friction is sought after for fine tuning.
// Friction is repair evidence.
// Does not: blame the human, punish the human, block the account,
// expose identity evidence, include private proof, include address/phone/first name/raw uIDL,
// send email, run payments, reopen accounts, or deal directly with customer.

const RepeatedStepFrictionStatusLedger = (() => {
  const entries = [];

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

  function requireText(value, errorCode) {
    if (!value || typeof value !== "string" || !value.trim()) {
      throw new Error(errorCode);
    }

    return value.trim();
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

  function normalizeNumber(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return number;
  }

  function normalizeList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  function normalizeSafeReferences(references) {
    if (!Array.isArray(references)) {
      return [];
    }

    return references.map((reference) => {
      const cleanReference =
        reference && typeof reference === "object" && !Array.isArray(reference)
          ? reference
          : {};

      return {
        type: normalizeText(cleanReference.type),
        value: normalizeText(cleanReference.value),
      };
    }).filter((reference) => reference.type && reference.value);
  }

  function normalizeRepeatedSteps(steps) {
    if (!Array.isArray(steps)) {
      return [];
    }

    return steps.map((step) => {
      const cleanStep = step && typeof step === "object" && !Array.isArray(step)
        ? step
        : {};

      return {
        step_key: normalizeText(cleanStep.step_key),
        step_id: normalizeText(cleanStep.step_id),
        step_name: normalizeText(cleanStep.step_name),
        lane: normalizeText(cleanStep.lane),
        surface: normalizeText(cleanStep.surface),
        first_seen_at: normalizeText(cleanStep.first_seen_at),
        last_seen_at: normalizeText(cleanStep.last_seen_at),
        window_ms: normalizeNumber(cleanStep.window_ms, 0),
        event_count: normalizeNumber(cleanStep.event_count, 0),
        failure_count: normalizeNumber(cleanStep.failure_count, 0),
        restart_count: normalizeNumber(cleanStep.restart_count, 0),
        timeout_count: normalizeNumber(cleanStep.timeout_count, 0),
        backtrack_count: normalizeNumber(cleanStep.backtrack_count, 0),
        resend_count: normalizeNumber(cleanStep.resend_count, 0),
        retry_count: normalizeNumber(cleanStep.retry_count, 0),
        verification_repeat_count: normalizeNumber(cleanStep.verification_repeat_count, 0),
        repeat_detected: normalizeBoolean(cleanStep.repeat_detected),
        likely_frustration: normalizeBoolean(cleanStep.likely_frustration),
        safe_tags: normalizeList(cleanStep.safe_tags),
      };
    }).filter((step) => step.step_key || step.step_id || step.step_name);
  }

  function normalizeLanguageSignals(signals) {
    if (!Array.isArray(signals)) {
      return [];
    }

    return signals.map((signal) => {
      const cleanSignal =
        signal && typeof signal === "object" && !Array.isArray(signal)
          ? signal
          : {};

      return {
        signal_id: normalizeText(cleanSignal.signal_id),
        type: normalizeText(cleanSignal.type),
        matched: normalizeText(cleanSignal.matched),
        safe_label: normalizeText(cleanSignal.safe_label),
      };
    }).filter((signal) => signal.type || signal.safe_label);
  }

  function normalizeRepairSignal(signal = {}) {
    if (!signal || typeof signal !== "object" || Array.isArray(signal)) {
      return {
        repair_signal_id: "",
        repair_needed: false,
        signal_type: "",
        state: "",
        score: 0,
        source: "",
        safe_references: [],
        repeated_step_count: 0,
        language_signal_count: 0,
        suggested_next_lane: "",
        suggested_prompt: "",
        doctrine: "",
      };
    }

    return {
      repair_signal_id: normalizeText(signal.repair_signal_id),
      repair_needed: normalizeBoolean(signal.repair_needed),
      signal_type: normalizeText(signal.signal_type),
      state: normalizeText(signal.state),
      score: normalizeNumber(signal.score, 0),
      source: normalizeText(signal.source),
      safe_references: normalizeSafeReferences(signal.safe_references),
      repeated_step_count: normalizeNumber(signal.repeated_step_count, 0),
      language_signal_count: normalizeNumber(signal.language_signal_count, 0),
      suggested_next_lane: normalizeText(signal.suggested_next_lane),
      suggested_prompt: normalizeText(signal.suggested_prompt),
      doctrine: normalizeText(signal.doctrine),
    };
  }

  function normalizeSafeSummary(summary = {}) {
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
      return {
        headline: "",
        body: "",
        safe_tags: [],
      };
    }

    return {
      headline: normalizeText(summary.headline),
      body: normalizeText(summary.body),
      safe_tags: normalizeList(summary.safe_tags),
    };
  }

  function normalizePaperLadderRow(row = {}) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return {
        state: "",
        score: 0,
        lane: "",
        surface: "",
        has_account_number: false,
        has_account_tag: false,
        has_masked_uidl_hint: false,
        has_report_id: false,
        has_survey_id: false,
        repeated_step_count: 0,
        language_signal_count: 0,
        repair_needed: false,
      };
    }

    return {
      row_id: normalizeText(row.row_id),
      created_at: normalizeText(row.created_at),
      state: normalizeText(row.state),
      score: normalizeNumber(row.score, 0),
      lane: normalizeText(row.lane),
      surface: normalizeText(row.surface),
      has_account_number: normalizeBoolean(row.has_account_number),
      has_account_tag: normalizeBoolean(row.has_account_tag),
      has_masked_uidl_hint: normalizeBoolean(row.has_masked_uidl_hint),
      has_report_id: normalizeBoolean(row.has_report_id),
      has_survey_id: normalizeBoolean(row.has_survey_id),
      repeated_step_count: normalizeNumber(row.repeated_step_count, 0),
      language_signal_count: normalizeNumber(row.language_signal_count, 0),
      repair_needed: normalizeBoolean(row.repair_needed),
      boundary: normalizeText(row.boundary),
    };
  }

  function normalizeDetection(detection = {}) {
    const cleanDetection = requireObject(detection, "DETECTION_REQUIRED");

    return {
      detection_id: requireText(cleanDetection.detection_id, "DETECTION_ID_REQUIRED"),
      created_at: normalizeText(cleanDetection.created_at),
      uidl: normalizeText(cleanDetection.uidl),
      uidl_hint: normalizeText(cleanDetection.uidl_hint),
      account_number: normalizeText(cleanDetection.account_number),
      account_tag: normalizeText(cleanDetection.account_tag),
      report_id: normalizeText(cleanDetection.report_id),
      survey_id: normalizeText(cleanDetection.survey_id),
      session_id_hint: normalizeText(cleanDetection.session_id_hint),
      lane: normalizeText(cleanDetection.lane),
      surface: normalizeText(cleanDetection.surface),
      status: requireText(cleanDetection.status, "STATUS_REQUIRED"),
      friction_score: normalizeNumber(cleanDetection.friction_score, 0),
      repeated_steps: normalizeRepeatedSteps(cleanDetection.repeated_steps),
      language_signals: normalizeLanguageSignals(cleanDetection.language_signals),
      repair_signal: normalizeRepairSignal(cleanDetection.repair_signal),
      safe_summary: normalizeSafeSummary(cleanDetection.safe_summary),
      paper_ladder_row: normalizePaperLadderRow(cleanDetection.paper_ladder_row),
    };
  }

  function deriveLedgerState(detection) {
    if (detection.status === "critical_repeat_friction") {
      return "critical_repeat_friction";
    }

    if (detection.status === "repeat_friction_detected") {
      return "repeat_friction_detected";
    }

    if (detection.status === "repeat_friction_possible") {
      return "repeat_friction_possible";
    }

    if (detection.status === "no_repeat_friction_detected") {
      return "no_repeat_friction_detected";
    }

    return "unknown";
  }

  function recordRepeatedStepFrictionStatus(detection = {}) {
    const normalizedDetection = normalizeDetection(detection);
    const ledgerState = deriveLedgerState(normalizedDetection);

    const entry = {
      entry_id: makeId("repeatedStepFrictionStatus"),
      recorded_at: now(),
      source: "core.repeated-step-friction-detector",
      detection_id: normalizedDetection.detection_id,
      uidl: normalizedDetection.uidl,
      uidl_hint: normalizedDetection.uidl_hint,
      account_number: normalizedDetection.account_number,
      account_tag: normalizedDetection.account_tag,
      report_id: normalizedDetection.report_id,
      survey_id: normalizedDetection.survey_id,
      session_id_hint: normalizedDetection.session_id_hint,
      lane: normalizedDetection.lane,
      surface: normalizedDetection.surface,
      status: normalizedDetection.status,
      ledger_state: ledgerState,
      friction_score: normalizedDetection.friction_score,
      repeated_steps: clone(normalizedDetection.repeated_steps),
      language_signals: clone(normalizedDetection.language_signals),
      repair_signal: clone(normalizedDetection.repair_signal),
      safe_summary: buildSafeSummary(normalizedDetection, ledgerState),
      friction_summary: buildFrictionSummary(normalizedDetection),
      fine_tuning_summary: buildFineTuningSummary(normalizedDetection, ledgerState),
      paper_ladder_row: buildPaperLadderRow(normalizedDetection, ledgerState),
      net_summary: buildNetSummary(normalizedDetection, ledgerState),
    };

    entries.push(clone(entry));

    return clone(entry);
  }

  function buildSafeSummary(detection, ledgerState) {
    if (ledgerState === "critical_repeat_friction") {
      return {
        headline: "Critical repeated-step friction recorded",
        body: "Repeated-step friction likely contributed to an exit or abandonment event.",
        safe_tags: ["critical_repeat_friction", "repair_evidence", "fine_tuning_needed"],
      };
    }

    if (ledgerState === "repeat_friction_detected") {
      return {
        headline: "Repeated-step friction recorded",
        body: "The human appears to have repeated the same step enough to create repair evidence.",
        safe_tags: ["repeat_friction_detected", "repair_evidence", "fine_tuning_signal"],
      };
    }

    if (ledgerState === "repeat_friction_possible") {
      return {
        headline: "Possible repeated-step friction recorded",
        body: "There is a possible repeated-step frustration signal that may need review.",
        safe_tags: ["repeat_friction_possible", "review_needed", "fine_tuning_candidate"],
      };
    }

    if (ledgerState === "no_repeat_friction_detected") {
      return {
        headline: "No repeated-step friction recorded",
        body: "No repeated-step repair signal was detected in this input.",
        safe_tags: ["no_repeat_friction"],
      };
    }

    return {
      headline: "Repeated-step friction state unknown",
      body: "Repeated-step friction status exists but does not match a known ledger state.",
      safe_tags: ["unknown", "review_needed"],
    };
  }

  function buildFrictionSummary(detection) {
    return {
      state: detection.status,
      score: detection.friction_score,
      repeated_step_count: detection.repeated_steps.length,
      language_signal_count: detection.language_signals.length,
      repair_needed: detection.repair_signal.repair_needed,
      suggested_next_lane: detection.repair_signal.suggested_next_lane,
      suggested_prompt: detection.repair_signal.suggested_prompt,
      likely_exit_cause: detection.status === "critical_repeat_friction",
      fine_tuning_needed:
        detection.status === "critical_repeat_friction" ||
        detection.status === "repeat_friction_detected" ||
        detection.status === "repeat_friction_possible",
      blame_assigned: false,
      punishment_allowed: false,
      human_block_allowed: false,
    };
  }

  function buildFineTuningSummary(detection, ledgerState) {
    const repairEvidence = ledgerState !== "no_repeat_friction_detected";

    return {
      fine_tuning_signal_present: repairEvidence,
      sought_after_for_fine_tuning: repairEvidence,
      reason: repairEvidence
        ? "FRICTION_REVEALS_WHERE_THE_SYSTEM_FORCED_REPEAT_WORK"
        : "NO_REPEAT_FRICTION_SIGNAL",
      priority: deriveFineTuningPriority(ledgerState),
      recommended_review: repairEvidence
        ? "Review repeated step, remove unnecessary repeat, clarify state, or preserve progress."
        : "",
      state_the_problem_prompt: repairEvidence ? "State the problem." : "",
      doctrine: "FRICTION_IS_REPAIR_EVIDENCE_NOT_HUMAN_BLAME",
    };
  }

  function deriveFineTuningPriority(ledgerState) {
    if (ledgerState === "critical_repeat_friction") {
      return "high";
    }

    if (ledgerState === "repeat_friction_detected") {
      return "medium";
    }

    if (ledgerState === "repeat_friction_possible") {
      return "review";
    }

    return "none";
  }

  function buildPaperLadderRow(detection, ledgerState) {
    return {
      row_id: makeId("repeatedStepFrictionStatusPaperRow"),
      detection_id: detection.detection_id,
      recorded_at: now(),
      ledger_state: ledgerState,
      score: detection.friction_score,
      lane: detection.lane,
      surface: detection.surface,
      has_account_number: Boolean(detection.account_number),
      has_account_tag: Boolean(detection.account_tag),
      has_masked_uidl_hint: Boolean(detection.uidl_hint),
      has_report_id: Boolean(detection.report_id),
      has_survey_id: Boolean(detection.survey_id),
      has_session_hint: Boolean(detection.session_id_hint),
      repeated_step_count: detection.repeated_steps.length,
      language_signal_count: detection.language_signals.length,
      repair_needed: detection.repair_signal.repair_needed,
      fine_tuning_needed: ledgerState !== "no_repeat_friction_detected",
      blame_assigned: false,
      boundary: "REPEATED_STEP_FRICTION_IS_SOUGHT_AFTER_FOR_FINE_TUNING_NOT_HUMAN_BLAME",
    };
  }

  function buildNetSummary(detection, ledgerState) {
    return {
      detection_id: detection.detection_id,
      uidl_hint: detection.uidl_hint,
      account_number: detection.account_number,
      account_tag: detection.account_tag,
      report_id: detection.report_id,
      survey_id: detection.survey_id,
      session_id_hint: detection.session_id_hint,
      lane: detection.lane,
      surface: detection.surface,
      status: detection.status,
      ledger_state: ledgerState,
      friction_score: detection.friction_score,
      repeated_steps: clone(detection.repeated_steps),
      language_signals: clone(detection.language_signals),
      repair_signal: clone(detection.repair_signal),
      display_summary: buildSafeSummary(detection, ledgerState),
      friction_summary: buildFrictionSummary(detection),
      fine_tuning_summary: buildFineTuningSummary(detection, ledgerState),
      identity_boundary: "SAFE_REFERENCES_ONLY_NO_IDENTITY_EXPOSURE",
      service_boundary: "FRICTION_IS_REPAIR_EVIDENCE_NOT_HUMAN_BLAME",
    };
  }

  function latestEntry() {
    if (!entries.length) {
      return null;
    }

    return clone(entries[entries.length - 1]);
  }

  function latestNetSummary() {
    const latest = latestEntry();

    if (!latest) {
      return null;
    }

    return clone(latest.net_summary);
  }

  function listEntries(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const detectionId = normalizeText(cleanFilter.detection_id);
    const reportId = normalizeText(cleanFilter.report_id);
    const surveyId = normalizeText(cleanFilter.survey_id);
    const ledgerState = normalizeText(cleanFilter.ledger_state);
    const lane = normalizeText(cleanFilter.lane);

    return entries
      .filter((entry) => {
        if (uidl && entry.uidl !== uidl) {
          return false;
        }

        if (detectionId && entry.detection_id !== detectionId) {
          return false;
        }

        if (reportId && entry.report_id !== reportId) {
          return false;
        }

        if (surveyId && entry.survey_id !== surveyId) {
          return false;
        }

        if (ledgerState && entry.ledger_state !== ledgerState) {
          return false;
        }

        if (lane && entry.lane !== lane) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function listPaperLadderRows(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.paper_ladder_row));
  }

  function clearEntries() {
    entries.length = 0;
    return true;
  }

  return {
    recordRepeatedStepFrictionStatus,
    latestEntry,
    latestNetSummary,
    listEntries,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = RepeatedStepFrictionStatusLedger;
      }
