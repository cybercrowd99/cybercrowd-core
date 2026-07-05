// src/core/account-continuity-exit-survey-router.js
// CyberCrowd Core — Account Continuity Exit Survey Router
// Owns: preparing safe optional exit survey packets during termination / exit stage.
// Rule: Leaving is still service. Ask why, do not punish.
// Survey is optional. Always say thank you. No pressure. No punishment. No identity exposure.
// Does not: send email, stop termination, reopen accounts, force response,
// punish leaving, expose identity evidence, include private proof,
// include address/phone/first name/raw uIDL, run payments, or deal directly with customer.

const AccountContinuityExitSurveyRouter = (() => {
  const surveys = [];

  const SURVEY_TYPES = [
    "termination_exit",
    "account_closure",
    "service_exit",
    "repair_discovery_followup",
    "archive_recovery_exit",
  ];

  const RESPONSE_STATES = [
    "not_answered",
    "answered",
    "skipped",
    "declined",
    "requested_no_contact",
  ];

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

  function normalizeSurveyType(value) {
    const clean = normalizeText(value);

    if (SURVEY_TYPES.includes(clean)) {
      return clean;
    }

    return "termination_exit";
  }

  function normalizeResponseState(value) {
    const clean = normalizeText(value);

    if (RESPONSE_STATES.includes(clean)) {
      return clean;
    }

    return "not_answered";
  }

  function normalizeSafeReference(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return "";
    }

    return clean
      .replace(/\s+/g, " ")
      .replace(/[<>]/g, "")
      .trim();
  }

  function maskUidl(uidl) {
    const clean = normalizeText(uidl);

    if (!clean) {
      return "";
    }

    if (clean.length <= 8) {
      return `${clean.slice(0, 2)}***`;
    }

    return `${clean.slice(0, 4)}***${clean.slice(-4)}`;
  }

  function normalizeSurveyInput(input = {}) {
    const cleanInput = requireObject(input, "SURVEY_INPUT_REQUIRED");

    return {
      uidl: normalizeText(cleanInput.uidl),
      uidl_hint: normalizeText(cleanInput.uidl_hint) || maskUidl(cleanInput.uidl),
      account_number: normalizeSafeReference(cleanInput.account_number),
      account_tag: normalizeSafeReference(cleanInput.account_tag),
      report_id: normalizeSafeReference(cleanInput.report_id),
      termination_reference_id: normalizeSafeReference(cleanInput.termination_reference_id),
      archive_reference_id: normalizeSafeReference(cleanInput.archive_reference_id),
      recovery_review_id: normalizeSafeReference(cleanInput.recovery_review_id),
      survey_type: normalizeSurveyType(cleanInput.survey_type),
      termination_finalized: normalizeBoolean(cleanInput.termination_finalized),
      exit_stage_ready: cleanInput.exit_stage_ready !== false,
      survey_allowed: cleanInput.survey_allowed !== false,
      do_not_contact: normalizeBoolean(cleanInput.do_not_contact),
      prior_survey_count: normalizeNumber(cleanInput.prior_survey_count, 0),
      one_question: sanitizeEmailText(cleanInput.one_question) || "What made you leave?",
      offer_label: sanitizeEmailText(cleanInput.offer_label),
      offer_url: normalizeText(cleanInput.offer_url),
      feedback_url: normalizeText(cleanInput.feedback_url),
      allow_offer_path: normalizeBoolean(cleanInput.allow_offer_path),
      allow_feedback_path: cleanInput.allow_feedback_path !== false,
      safe_notes: normalizeSafeNotes(cleanInput.safe_notes),
    };
  }

  function normalizeSafeNotes(notes) {
    return normalizeList(notes).map((note) => sanitizeEmailText(note)).filter(Boolean);
  }

  function sanitizeEmailText(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return "";
    }

    return clean
      .replace(/\bpassword\b/gi, "credential")
      .replace(/\btoken\b/gi, "credential")
      .replace(/\bsecret\b/gi, "protected detail")
      .replace(/\bprivate proof\b/gi, "private verification")
      .replace(/\bidentity evidence\b/gi, "verification detail")
      .replace(/\bfirst name\b/gi, "name detail")
      .replace(/\bhome address\b/gi, "address detail")
      .replace(/\bphone number\b/gi, "phone detail")
      .replace(/\braw uIDL\b/gi, "protected uIDL")
      .replace(/\bfull uIDL\b/gi, "protected uIDL")
      .replace(/\barchive contents\b/gi, "archive detail");
  }

  function evaluateSurvey(input) {
    const failures = [];

    if (!input.exit_stage_ready) {
      failures.push("EXIT_STAGE_NOT_READY");
    }

    if (!input.survey_allowed) {
      failures.push("SURVEY_NOT_ALLOWED");
    }

    if (input.do_not_contact) {
      failures.push("DO_NOT_CONTACT");
    }

    if (input.prior_survey_count > 0) {
      failures.push("SURVEY_ALREADY_OFFERED");
    }

    if (!hasSafeReference(input)) {
      failures.push("NO_SAFE_REFERENCE");
    }

    if (!input.one_question) {
      failures.push("QUESTION_REQUIRED");
    }

    if (!input.allow_feedback_path && !input.allow_offer_path) {
      failures.push("NO_RESPONSE_PATH_ALLOWED");
    }

    return {
      allowed: failures.length === 0,
      failures,
    };
  }

  function hasSafeReference(input) {
    return Boolean(
      input.account_number ||
      input.account_tag ||
      input.uidl_hint ||
      input.report_id ||
      input.termination_reference_id ||
      input.archive_reference_id ||
      input.recovery_review_id
    );
  }

  function routeExitSurvey(input = {}) {
    const normalized = normalizeSurveyInput(input);
    const evaluation = evaluateSurvey(normalized);

    const survey = {
      survey_id: makeId("accountContinuityExitSurvey"),
      created_at: now(),
      uidl: normalized.uidl,
      uidl_hint: normalized.uidl_hint,
      account_number: normalized.account_number,
      account_tag: normalized.account_tag,
      report_id: normalized.report_id,
      termination_reference_id: normalized.termination_reference_id,
      archive_reference_id: normalized.archive_reference_id,
      recovery_review_id: normalized.recovery_review_id,
      survey_type: normalized.survey_type,
      status: evaluation.allowed ? "survey_ready" : "blocked",
      failures: clone(evaluation.failures),
      safe_references: buildSafeReferences(normalized),
      question: normalized.one_question,
      survey_packet: evaluation.allowed ? buildSurveyPacket(normalized) : null,
      safe_summary: buildSafeSummary(normalized, evaluation),
      paper_ladder_row: buildPaperLadderRow(normalized, evaluation),
    };

    surveys.push(clone(survey));

    return clone(survey);
  }

  function buildSafeReferences(input) {
    const references = [];

    if (input.account_number) {
      references.push({
        type: "account_number",
        value: input.account_number,
      });
    }

    if (input.account_tag) {
      references.push({
        type: "account_tag",
        value: input.account_tag,
      });
    }

    if (input.uidl_hint) {
      references.push({
        type: "masked_uidl_hint",
        value: input.uidl_hint,
      });
    }

    if (input.report_id) {
      references.push({
        type: "report_id",
        value: input.report_id,
      });
    }

    if (input.termination_reference_id) {
      references.push({
        type: "termination_reference",
        value: input.termination_reference_id,
      });
    }

    if (input.archive_reference_id) {
      references.push({
        type: "archive_reference",
        value: input.archive_reference_id,
      });
    }

    if (input.recovery_review_id) {
      references.push({
        type: "recovery_review_reference",
        value: input.recovery_review_id,
      });
    }

    return references;
  }

  function buildSurveyPacket(input) {
    return {
      packet_id: makeId("accountContinuityExitSurveyPacket"),
      created_at: now(),
      packet_type: "account_continuity_exit_survey",
      survey_type: input.survey_type,
      subject: "CyberCrowd Exit Service Survey",
      body: buildSurveyBody(input),
      question: input.one_question,
      feedback_url: input.allow_feedback_path ? input.feedback_url : "",
      offer_label: input.allow_offer_path ? input.offer_label : "",
      offer_url: input.allow_offer_path ? input.offer_url : "",
      safe_references: buildSafeReferences(input),
      identity_boundary: "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
      optional: true,
      pressure_allowed: false,
      punishment_allowed: false,
      termination_stop_allowed: false,
      silent_reopen_allowed: false,
      thank_you_required: true,
      provider_ready: true,
    };
  }

  function buildSurveyBody(input) {
    const lines = [];

    lines.push("Your account termination request has reached its exit service stage.");
    lines.push("");
    lines.push("Leaving is still service.");
    lines.push("");
    lines.push("CyberCrowd would like to ask one optional question:");
    lines.push("");
    lines.push(input.one_question);
    lines.push("");
    lines.push("This survey is optional.");
    lines.push("It does not reopen your account.");
    lines.push("It does not stop your termination request.");
    lines.push("It does not affect your account status.");
    lines.push("It helps us understand what should be improved.");
    lines.push("");
    lines.push("Thank you.");

    if (input.allow_feedback_path && input.feedback_url) {
      lines.push("");
      lines.push(`Share feedback: ${input.feedback_url}`);
    }

    if (input.allow_offer_path && input.offer_label) {
      lines.push("");
      lines.push(buildOfferLine(input));
    }

    lines.push("");
    lines.push("No pressure.");
    lines.push("No punishment.");
    lines.push("No identity exposure.");
    lines.push("");
    lines.push("This message uses safe account/report references only.");
    lines.push("It does not include address, phone number, first name, private verification detail, raw uIDL, credentials, archive contents, or unnecessary identity detail.");

    return lines.join("\n");
  }

  function buildOfferLine(input) {
    if (input.offer_url) {
      return `${input.offer_label}: ${input.offer_url}`;
    }

    return input.offer_label;
  }

  function buildSafeSummary(input, evaluation) {
    if (!evaluation.allowed) {
      return {
        headline: "Exit survey blocked",
        body: "Exit survey signal exists, but survey handoff is not allowed.",
        safe_tags: ["blocked", "exit_survey", "optional"],
        failure_codes: clone(evaluation.failures),
      };
    }

    return {
      headline: "Exit survey ready",
      body: "Optional exit survey is ready with thank-you language and safe references only.",
      safe_tags: ["survey_ready", "exit_survey", "thank_you", "no_pressure"],
      failure_codes: [],
    };
  }

  function buildPaperLadderRow(input, evaluation) {
    return {
      row_id: makeId("accountContinuityExitSurveyPaperRow"),
      created_at: now(),
      survey_type: input.survey_type,
      status: evaluation.allowed ? "survey_ready" : "blocked",
      has_account_number: Boolean(input.account_number),
      has_account_tag: Boolean(input.account_tag),
      has_masked_uidl_hint: Boolean(input.uidl_hint),
      has_report_id: Boolean(input.report_id),
      has_termination_reference: Boolean(input.termination_reference_id),
      has_archive_reference: Boolean(input.archive_reference_id),
      has_recovery_review_reference: Boolean(input.recovery_review_id),
      termination_finalized: input.termination_finalized,
      exit_stage_ready: input.exit_stage_ready,
      survey_allowed: input.survey_allowed,
      do_not_contact: input.do_not_contact,
      prior_survey_count: input.prior_survey_count,
      allow_feedback_path: input.allow_feedback_path,
      allow_offer_path: input.allow_offer_path,
      thank_you_required: true,
      failure_count: evaluation.failures.length,
      boundary: "EXIT_SURVEY_OPTIONAL_THANK_YOU_NO_PRESSURE_NO_PUNISHMENT_NO_IDENTITY_EXPOSURE",
    };
  }

  function markSurveyResponse(surveyId, response = {}) {
    const survey = surveys.find((item) => item.survey_id === surveyId);

    if (!survey) {
      throw new Error("SURVEY_NOT_FOUND");
    }

    const cleanResponse =
      response && typeof response === "object" && !Array.isArray(response)
        ? response
        : {};

    const responseState = normalizeResponseState(cleanResponse.response_state);
    const requestedNoContact = normalizeBoolean(cleanResponse.requested_no_contact);

    survey.response = {
      recorded_at: now(),
      response_state: requestedNoContact ? "requested_no_contact" : responseState,
      answered: responseState === "answered",
      skipped: responseState === "skipped",
      declined: responseState === "declined",
      requested_no_contact: requestedNoContact,
      safe_feedback: sanitizeEmailText(cleanResponse.safe_feedback),
      thank_you: buildThankYou(responseState, requestedNoContact),
    };

    survey.status = deriveStatusAfterResponse(survey.response);

    return clone(survey);
  }

  function buildThankYou(responseState, requestedNoContact) {
    if (requestedNoContact) {
      return "Thank you. Your boundary is recorded, and no further exit survey outreach should be sent for this lane.";
    }

    if (responseState === "answered") {
      return "Thank you. Your feedback is recorded.";
    }

    if (responseState === "skipped") {
      return "Thank you. Your choice to skip is recorded.";
    }

    if (responseState === "declined") {
      return "Thank you. Your choice is recorded, and no answer is required.";
    }

    return "Thank you.";
  }

  function deriveStatusAfterResponse(response) {
    if (response.requested_no_contact) {
      return "do_not_contact_recorded";
    }

    if (response.answered) {
      return "survey_answered";
    }

    if (response.skipped) {
      return "survey_skipped";
    }

    if (response.declined) {
      return "survey_declined";
    }

    return "survey_response_recorded";
  }

  function listSurveys(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const surveyId = normalizeText(cleanFilter.survey_id);
    const reportId = normalizeText(cleanFilter.report_id);
    const status = normalizeText(cleanFilter.status);
    const surveyType = normalizeText(cleanFilter.survey_type);

    return surveys
      .filter((survey) => {
        if (uidl && survey.uidl !== uidl) {
          return false;
        }

        if (surveyId && survey.survey_id !== surveyId) {
          return false;
        }

        if (reportId && survey.report_id !== reportId) {
          return false;
        }

        if (status && survey.status !== status) {
          return false;
        }

        if (surveyType && survey.survey_type !== surveyType) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestSurvey() {
    if (!surveys.length) {
      return null;
    }

    return clone(surveys[surveys.length - 1]);
  }

  function listPaperLadderRows(filter = {}) {
    return listSurveys(filter).map((survey) => clone(survey.paper_ladder_row));
  }

  function clearSurveys() {
    surveys.length = 0;
    return true;
  }

  return {
    routeExitSurvey,
    markSurveyResponse,
    listSurveys,
    latestSurvey,
    listPaperLadderRows,
    clearSurveys,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityExitSurveyRouter;
}
