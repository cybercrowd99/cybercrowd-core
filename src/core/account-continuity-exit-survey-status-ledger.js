// src/core/account-continuity-exit-survey-status-ledger.js
// CyberCrowd Core — Account Continuity Exit Survey Status Ledger
// Owns: recording exit survey states, response states, thank-you state,
// optional rant value, and preparing NET-safe summaries.
// Rule: Survey routed. Survey-ready / blocked recorded. Safe references recorded.
// Response recorded if answered. Thank-you state recorded. NET-safe summary prepared.
// Rant rule: never leave the rant out. Mean truth has value when handled safely.
// Does not: send email, stop termination, reopen accounts, force response,
// punish leaving, expose identity evidence, include private proof,
// include address/phone/first name/raw uIDL, run payments, or deal directly with customer.

const AccountContinuityExitSurveyStatusLedger = (() => {
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

  function normalizeSafeSummary(summary = {}) {
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
      return {
        headline: "",
        body: "",
        safe_tags: [],
        failure_codes: [],
      };
    }

    return {
      headline: normalizeText(summary.headline),
      body: normalizeText(summary.body),
      safe_tags: normalizeList(summary.safe_tags),
      failure_codes: normalizeList(summary.failure_codes),
    };
  }

  function normalizeSurveyPacket(packet = null) {
    if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
      return null;
    }

    return {
      packet_id: normalizeText(packet.packet_id),
      created_at: normalizeText(packet.created_at),
      packet_type: normalizeText(packet.packet_type),
      survey_type: normalizeText(packet.survey_type),
      subject: normalizeText(packet.subject),
      body_present: Boolean(normalizeText(packet.body)),
      question: normalizeText(packet.question),
      feedback_url_present: Boolean(normalizeText(packet.feedback_url)),
      offer_label: normalizeText(packet.offer_label),
      offer_url_present: Boolean(normalizeText(packet.offer_url)),
      identity_boundary: normalizeText(packet.identity_boundary),
      optional: packet.optional !== false,
      pressure_allowed: normalizeBoolean(packet.pressure_allowed),
      punishment_allowed: normalizeBoolean(packet.punishment_allowed),
      termination_stop_allowed: normalizeBoolean(packet.termination_stop_allowed),
      silent_reopen_allowed: normalizeBoolean(packet.silent_reopen_allowed),
      thank_you_required: packet.thank_you_required !== false,
      provider_ready: normalizeBoolean(packet.provider_ready),
      safe_references: normalizeSafeReferences(packet.safe_references),
    };
  }

  function normalizePaperLadderRow(row = {}) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return {
        survey_type: "",
        status: "",
        has_account_number: false,
        has_account_tag: false,
        has_masked_uidl_hint: false,
        has_report_id: false,
        has_termination_reference: false,
        has_archive_reference: false,
        has_recovery_review_reference: false,
        termination_finalized: false,
        exit_stage_ready: false,
        survey_allowed: false,
        do_not_contact: false,
        prior_survey_count: 0,
        allow_feedback_path: false,
        allow_offer_path: false,
        thank_you_required: true,
        failure_count: 0,
      };
    }

    return {
      row_id: normalizeText(row.row_id),
      created_at: normalizeText(row.created_at),
      survey_type: normalizeText(row.survey_type),
      status: normalizeText(row.status),
      has_account_number: normalizeBoolean(row.has_account_number),
      has_account_tag: normalizeBoolean(row.has_account_tag),
      has_masked_uidl_hint: normalizeBoolean(row.has_masked_uidl_hint),
      has_report_id: normalizeBoolean(row.has_report_id),
      has_termination_reference: normalizeBoolean(row.has_termination_reference),
      has_archive_reference: normalizeBoolean(row.has_archive_reference),
      has_recovery_review_reference: normalizeBoolean(row.has_recovery_review_reference),
      termination_finalized: normalizeBoolean(row.termination_finalized),
      exit_stage_ready: normalizeBoolean(row.exit_stage_ready),
      survey_allowed: normalizeBoolean(row.survey_allowed),
      do_not_contact: normalizeBoolean(row.do_not_contact),
      prior_survey_count: normalizeNumber(row.prior_survey_count, 0),
      allow_feedback_path: normalizeBoolean(row.allow_feedback_path),
      allow_offer_path: normalizeBoolean(row.allow_offer_path),
      thank_you_required: row.thank_you_required !== false,
      failure_count: normalizeNumber(row.failure_count, 0),
      boundary: normalizeText(row.boundary),
    };
  }

  function normalizeResponse(response = null) {
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return null;
    }

    const safeFeedback = normalizeText(response.safe_feedback);
    const rantDetected = detectRantValue(safeFeedback);

    return {
      recorded_at: normalizeText(response.recorded_at),
      response_state: normalizeText(response.response_state),
      answered: normalizeBoolean(response.answered),
      skipped: normalizeBoolean(response.skipped),
      declined: normalizeBoolean(response.declined),
      requested_no_contact: normalizeBoolean(response.requested_no_contact),
      safe_feedback_present: Boolean(safeFeedback),
      safe_feedback_length: safeFeedback.length,
      rant_detected: rantDetected.detected,
      rant_value_level: rantDetected.level,
      rant_value_reason: rantDetected.reason,
      thank_you: normalizeText(response.thank_you),
    };
  }

  function detectRantValue(text) {
    const clean = normalizeText(text);

    if (!clean) {
      return {
        detected: false,
        level: "none",
        reason: "",
      };
    }

    const wordCount = clean.split(/\s+/).filter(Boolean).length;
    const hasStrongTone = /!{2,}|[A-Z]{5,}|\b(angry|mad|furious|ridiculous|broken|hate|done|never|awful|terrible)\b/i.test(clean);

    if (wordCount >= 80 || hasStrongTone) {
      return {
        detected: true,
        level: wordCount >= 150 ? "full_rant" : "rant_signal",
        reason: "MEAN_TRUTH_SIGNAL_PRESENT",
      };
    }

    return {
      detected: false,
      level: "plain_feedback",
      reason: "FEEDBACK_PRESENT",
    };
  }

  function normalizeSurvey(survey = {}) {
    const cleanSurvey = requireObject(survey, "SURVEY_REQUIRED");

    return {
      survey_id: requireText(cleanSurvey.survey_id, "SURVEY_ID_REQUIRED"),
      created_at: normalizeText(cleanSurvey.created_at),
      uidl: normalizeText(cleanSurvey.uidl),
      uidl_hint: normalizeText(cleanSurvey.uidl_hint),
      account_number: normalizeText(cleanSurvey.account_number),
      account_tag: normalizeText(cleanSurvey.account_tag),
      report_id: normalizeText(cleanSurvey.report_id),
      termination_reference_id: normalizeText(cleanSurvey.termination_reference_id),
      archive_reference_id: normalizeText(cleanSurvey.archive_reference_id),
      recovery_review_id: normalizeText(cleanSurvey.recovery_review_id),
      survey_type: normalizeText(cleanSurvey.survey_type) || "termination_exit",
      status: requireText(cleanSurvey.status, "STATUS_REQUIRED"),
      failures: normalizeList(cleanSurvey.failures),
      safe_references: normalizeSafeReferences(cleanSurvey.safe_references),
      question: normalizeText(cleanSurvey.question),
      survey_packet: normalizeSurveyPacket(cleanSurvey.survey_packet),
      safe_summary: normalizeSafeSummary(cleanSurvey.safe_summary),
      paper_ladder_row: normalizePaperLadderRow(cleanSurvey.paper_ladder_row),
      response: normalizeResponse(cleanSurvey.response),
    };
  }

  function deriveLedgerState(survey) {
    if (survey.status === "survey_ready") {
      return "survey_ready";
    }

    if (survey.status === "blocked") {
      return "blocked";
    }

    if (survey.status === "survey_answered") {
      return "survey_answered";
    }

    if (survey.status === "survey_skipped") {
      return "survey_skipped";
    }

    if (survey.status === "survey_declined") {
      return "survey_declined";
    }

    if (survey.status === "survey_response_recorded") {
      return "survey_response_recorded";
    }

    if (survey.status === "do_not_contact_recorded") {
      return "do_not_contact_recorded";
    }

    return "unknown";
  }

  function recordExitSurveyStatus(survey = {}) {
    const normalizedSurvey = normalizeSurvey(survey);
    const ledgerState = deriveLedgerState(normalizedSurvey);

    const entry = {
      entry_id: makeId("accountContinuityExitSurveyStatus"),
      recorded_at: now(),
      source: "core.account-continuity-exit-survey-router",
      survey_id: normalizedSurvey.survey_id,
      survey_type: normalizedSurvey.survey_type,
      uidl: normalizedSurvey.uidl,
      uidl_hint: normalizedSurvey.uidl_hint,
      account_number: normalizedSurvey.account_number,
      account_tag: normalizedSurvey.account_tag,
      report_id: normalizedSurvey.report_id,
      termination_reference_id: normalizedSurvey.termination_reference_id,
      archive_reference_id: normalizedSurvey.archive_reference_id,
      recovery_review_id: normalizedSurvey.recovery_review_id,
      status: normalizedSurvey.status,
      ledger_state: ledgerState,
      failures: clone(normalizedSurvey.failures),
      safe_references: clone(normalizedSurvey.safe_references),
      question: normalizedSurvey.question,
      survey_packet_summary: buildSurveyPacketSummary(normalizedSurvey.survey_packet),
      response_summary: buildResponseSummary(normalizedSurvey.response),
      thank_you_summary: buildThankYouSummary(normalizedSurvey.response),
      rant_summary: buildRantSummary(normalizedSurvey.response),
      safe_summary: buildSafeSummary(normalizedSurvey, ledgerState),
      survey_summary: buildSurveySummary(normalizedSurvey),
      paper_ladder_row: buildPaperLadderRow(normalizedSurvey, ledgerState),
      net_summary: buildNetSummary(normalizedSurvey, ledgerState),
    };

    entries.push(clone(entry));

    return clone(entry);
  }

  function buildSurveyPacketSummary(packet) {
    if (!packet) {
      return {
        packet_present: false,
        provider_ready: false,
        optional: true,
        pressure_allowed: false,
        punishment_allowed: false,
        termination_stop_allowed: false,
        silent_reopen_allowed: false,
        thank_you_required: true,
      };
    }

    return {
      packet_present: true,
      packet_id: packet.packet_id,
      packet_type: packet.packet_type,
      survey_type: packet.survey_type,
      subject: packet.subject,
      body_present: packet.body_present,
      question: packet.question,
      feedback_url_present: packet.feedback_url_present,
      offer_label: packet.offer_label,
      offer_url_present: packet.offer_url_present,
      identity_boundary: packet.identity_boundary,
      provider_ready: packet.provider_ready,
      optional: packet.optional,
      pressure_allowed: packet.pressure_allowed,
      punishment_allowed: packet.punishment_allowed,
      termination_stop_allowed: packet.termination_stop_allowed,
      silent_reopen_allowed: packet.silent_reopen_allowed,
      thank_you_required: packet.thank_you_required,
      safe_reference_count: packet.safe_references.length,
    };
  }

  function buildResponseSummary(response) {
    if (!response) {
      return {
        response_present: false,
        response_state: "not_answered",
        answered: false,
        skipped: false,
        declined: false,
        requested_no_contact: false,
        safe_feedback_present: false,
      };
    }

    return {
      response_present: true,
      recorded_at: response.recorded_at,
      response_state: response.response_state,
      answered: response.answered,
      skipped: response.skipped,
      declined: response.declined,
      requested_no_contact: response.requested_no_contact,
      safe_feedback_present: response.safe_feedback_present,
      safe_feedback_length: response.safe_feedback_length,
    };
  }

  function buildThankYouSummary(response) {
    if (!response) {
      return {
        thank_you_required: true,
        thank_you_present: false,
        message: "",
      };
    }

    return {
      thank_you_required: true,
      thank_you_present: Boolean(response.thank_you),
      message: response.thank_you || "Thank you.",
    };
  }

  function buildRantSummary(response) {
    if (!response) {
      return {
        rant_allowed: true,
        rant_present: false,
        rant_value_level: "none",
        reason: "",
        doctrine: "NEVER_LEAVE_THE_RANT_OUT",
      };
    }

    return {
      rant_allowed: true,
      rant_present: response.rant_detected,
      rant_value_level: response.rant_value_level,
      reason: response.rant_value_reason,
      doctrine: "MEAN_TRUTH_HAS_VALUE_WHEN_HANDLED_SAFELY",
    };
  }

  function buildSafeSummary(survey, ledgerState) {
    if (ledgerState === "blocked") {
      return {
        headline: "Exit survey blocked",
        body: "Exit survey signal exists, but survey handoff is not allowed.",
        safe_tags: ["blocked", "exit_survey", "optional"],
        failure_codes: clone(survey.failures),
      };
    }

    if (ledgerState === "survey_ready") {
      return {
        headline: "Exit survey ready",
        body: "Optional exit survey is ready with thank-you language and safe references only.",
        safe_tags: ["survey_ready", "exit_survey", "thank_you", "no_pressure", "rant_allowed"],
        failure_codes: [],
      };
    }

    if (ledgerState === "survey_answered") {
      return {
        headline: "Exit survey answered",
        body: "Exit survey response was recorded safely.",
        safe_tags: ["survey_answered", "thank_you", "feedback_value", "rant_allowed"],
        failure_codes: [],
      };
    }

    if (ledgerState === "survey_skipped") {
      return {
        headline: "Exit survey skipped",
        body: "The person chose to skip the optional survey.",
        safe_tags: ["survey_skipped", "thank_you", "optional_choice"],
        failure_codes: [],
      };
    }

    if (ledgerState === "survey_declined") {
      return {
        headline: "Exit survey declined",
        body: "The person declined the optional survey.",
        safe_tags: ["survey_declined", "thank_you", "no_pressure"],
        failure_codes: [],
      };
    }

    if (ledgerState === "do_not_contact_recorded") {
      return {
        headline: "Do-not-contact recorded",
        body: "The person requested no further exit survey outreach.",
        safe_tags: ["do_not_contact", "respect_boundary", "thank_you"],
        failure_codes: [],
      };
    }

    if (ledgerState === "survey_response_recorded") {
      return {
        headline: "Exit survey response recorded",
        body: "Exit survey response state was recorded safely.",
        safe_tags: ["survey_response_recorded", "thank_you"],
        failure_codes: [],
      };
    }

    return {
      headline: "Exit survey state unknown",
      body: "Exit survey status exists but does not match a known ledger state.",
      safe_tags: ["unknown", "exit_survey"],
      failure_codes: clone(survey.failures),
    };
  }

  function buildSurveySummary(survey) {
    const response = survey.response;

    return {
      survey_type: survey.survey_type,
      question_present: Boolean(survey.question),
      packet_present: Boolean(survey.survey_packet),
      provider_ready: survey.survey_packet ? survey.survey_packet.provider_ready : false,
      optional: survey.survey_packet ? survey.survey_packet.optional : true,
      pressure_allowed: survey.survey_packet ? survey.survey_packet.pressure_allowed : false,
      punishment_allowed: survey.survey_packet ? survey.survey_packet.punishment_allowed : false,
      termination_stop_allowed: survey.survey_packet
        ? survey.survey_packet.termination_stop_allowed
        : false,
      silent_reopen_allowed: survey.survey_packet
        ? survey.survey_packet.silent_reopen_allowed
        : false,
      thank_you_required: true,
      thank_you_present: response ? Boolean(response.thank_you) : false,
      safe_reference_count: survey.safe_references.length,
      failure_count: survey.failures.length,
      response_present: Boolean(response),
      answered: response ? response.answered : false,
      skipped: response ? response.skipped : false,
      declined: response ? response.declined : false,
      requested_no_contact: response ? response.requested_no_contact : false,
      rant_allowed: true,
      rant_present: response ? response.rant_detected : false,
      rant_value_level: response ? response.rant_value_level : "none",
    };
  }

  function buildPaperLadderRow(survey, ledgerState) {
    const response = survey.response;

    return {
      row_id: makeId("accountContinuityExitSurveyStatusPaperRow"),
      survey_id: survey.survey_id,
      recorded_at: now(),
      survey_type: survey.survey_type,
      ledger_state: ledgerState,
      has_account_number: Boolean(survey.account_number),
      has_account_tag: Boolean(survey.account_tag),
      has_masked_uidl_hint: Boolean(survey.uidl_hint),
      has_report_id: Boolean(survey.report_id),
      has_termination_reference: Boolean(survey.termination_reference_id),
      has_archive_reference: Boolean(survey.archive_reference_id),
      has_recovery_review_reference: Boolean(survey.recovery_review_id),
      packet_present: Boolean(survey.survey_packet),
      provider_ready: survey.survey_packet ? survey.survey_packet.provider_ready : false,
      response_present: Boolean(response),
      answered: response ? response.answered : false,
      skipped: response ? response.skipped : false,
      declined: response ? response.declined : false,
      requested_no_contact: response ? response.requested_no_contact : false,
      thank_you_present: response ? Boolean(response.thank_you) : false,
      rant_allowed: true,
      rant_present: response ? response.rant_detected : false,
      rant_value_level: response ? response.rant_value_level : "none",
      failure_count: survey.failures.length,
      boundary: "EXIT_SURVEY_STATUS_SAFE_REFERENCES_THANK_YOU_RANT_ALLOWED_NO_PRESSURE_NO_PUNISHMENT",
    };
  }

  function buildNetSummary(survey, ledgerState) {
    return {
      survey_id: survey.survey_id,
      survey_type: survey.survey_type,
      uidl_hint: survey.uidl_hint,
      account_number: survey.account_number,
      account_tag: survey.account_tag,
      report_id: survey.report_id,
      termination_reference_id: survey.termination_reference_id,
      archive_reference_id: survey.archive_reference_id,
      recovery_review_id: survey.recovery_review_id,
      status: survey.status,
      ledger_state: ledgerState,
      safe_references: clone(survey.safe_references),
      question: survey.question,
      display_summary: buildSafeSummary(survey, ledgerState),
      survey_summary: buildSurveySummary(survey),
      survey_packet_summary: buildSurveyPacketSummary(survey.survey_packet),
      response_summary: buildResponseSummary(survey.response),
      thank_you_summary: buildThankYouSummary(survey.response),
      rant_summary: buildRantSummary(survey.response),
      failures: clone(survey.failures),
      identity_boundary: "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
      service_boundary: "SURVEY_OPTIONAL_THANK_YOU_RANT_ALLOWED_NO_PRESSURE_NO_PUNISHMENT",
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
    const surveyId = normalizeText(cleanFilter.survey_id);
    const reportId = normalizeText(cleanFilter.report_id);
    const ledgerState = normalizeText(cleanFilter.ledger_state);
    const status = normalizeText(cleanFilter.status);
    const surveyType = normalizeText(cleanFilter.survey_type);

    return entries
      .filter((entry) => {
        if (uidl && entry.uidl !== uidl) {
          return false;
        }

        if (surveyId && entry.survey_id !== surveyId) {
          return false;
        }

        if (reportId && entry.report_id !== reportId) {
          return false;
        }

        if (ledgerState && entry.ledger_state !== ledgerState) {
          return false;
        }

        if (status && entry.status !== status) {
          return false;
        }

        if (surveyType && entry.survey_type !== surveyType) {
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
    recordExitSurveyStatus,
    latestEntry,
    latestNetSummary,
    listEntries,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityExitSurveyStatusLedger;
}
