// src/core/account-continuity-exit-survey-controller.js
// CyberCrowd Core — Account Continuity Exit Survey Controller
// Owns: coordinating exit survey routing, ledger recording, NET-safe status handoff,
// optional human response recording, thank-you state, and State the Problem truth capture.
// Rule: Router prepares survey. Ledger records truth. NET receives safe status.
// State the problem stays allowed. Thank you stays visible.
// No pressure. No punishment. No identity exposure.
// Does not: send email, stop termination, reopen accounts, force response,
// punish leaving, expose identity evidence, include private proof,
// include address/phone/first name/raw uIDL, run payments, or deal directly with customer.

const AccountContinuityExitSurveyController = (() => {
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
      survey_input: requireObject(cleanInput.survey_input, "SURVEY_INPUT_REQUIRED"),
      forward_to_net: cleanInput.forward_to_net !== false,
      record_response: normalizeBoolean(cleanInput.record_response),
      response: normalizeResponseInput(cleanInput.response),
      notes: normalizeText(cleanInput.notes),
    };
  }

  function normalizeResponseInput(response = {}) {
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return {
        response_state: "",
        requested_no_contact: false,
        safe_feedback: "",
      };
    }

    return {
      response_state: normalizeText(response.response_state),
      requested_no_contact: normalizeBoolean(response.requested_no_contact),
      safe_feedback: sanitizeSafeText(response.safe_feedback),
    };
  }

  function normalizeDependencies(dependencies = {}) {
    const cleanDependencies = requireObject(dependencies, "DEPENDENCIES_REQUIRED");

    return {
      survey_router: requireObject(cleanDependencies.survey_router, "SURVEY_ROUTER_REQUIRED"),
      status_ledger: requireObject(cleanDependencies.status_ledger, "STATUS_LEDGER_REQUIRED"),
      net_receiver: cleanDependencies.net_receiver || null,
    };
  }

  function assertSurveyRouter(router) {
    requireFunction(router.routeExitSurvey, "SURVEY_ROUTER_ROUTE_REQUIRED");
    requireFunction(router.markSurveyResponse, "SURVEY_ROUTER_RESPONSE_REQUIRED");
  }

  function assertStatusLedger(ledger) {
    requireFunction(ledger.recordExitSurveyStatus, "STATUS_LEDGER_RECORD_REQUIRED");
    requireFunction(ledger.latestNetSummary, "STATUS_LEDGER_NET_SUMMARY_REQUIRED");
  }

  function assertNetReceiver(receiver) {
    if (!receiver) {
      return;
    }

    requireFunction(receiver.receiveStatus, "NET_RECEIVER_RECEIVE_REQUIRED");
  }

  function runExitSurveyCycle(input = {}, dependencies = {}) {
    const normalizedInput = normalizeControllerInput(input);
    const normalizedDependencies = normalizeDependencies(dependencies);

    assertSurveyRouter(normalizedDependencies.survey_router);
    assertStatusLedger(normalizedDependencies.status_ledger);
    assertNetReceiver(normalizedDependencies.net_receiver);

    const cycle = {
      cycle_id: makeId("accountContinuityExitSurveyCycle"),
      started_at: now(),
      status: "started",
      steps: [],
      notes: normalizedInput.notes,
    };

    try {
      const survey = runStep(cycle, "ROUTE_EXIT_SURVEY", () => {
        return normalizedDependencies.survey_router.routeExitSurvey(
          normalizedInput.survey_input
        );
      });

      const firstLedgerEntry = runStep(cycle, "RECORD_SURVEY_STATUS", () => {
        return normalizedDependencies.status_ledger.recordExitSurveyStatus(survey);
      });

      const firstNetSummary = runStep(cycle, "PREPARE_NET_SUMMARY", () => {
        return normalizedDependencies.status_ledger.latestNetSummary();
      });

      if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && firstNetSummary) {
        runStep(cycle, "FORWARD_NET_SUMMARY", () => {
          return normalizedDependencies.net_receiver.receiveStatus(firstNetSummary);
        });
      }

      let responseSurvey = null;
      let responseLedgerEntry = null;
      let responseNetSummary = null;

      if (normalizedInput.record_response) {
        responseSurvey = runStep(cycle, "RECORD_HUMAN_RESPONSE", () => {
          return normalizedDependencies.survey_router.markSurveyResponse(
            survey.survey_id,
            normalizedInput.response
          );
        });

        responseLedgerEntry = runStep(cycle, "RECORD_RESPONSE_STATUS", () => {
          return normalizedDependencies.status_ledger.recordExitSurveyStatus(responseSurvey);
        });

        responseNetSummary = runStep(cycle, "PREPARE_RESPONSE_NET_SUMMARY", () => {
          return normalizedDependencies.status_ledger.latestNetSummary();
        });

        if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && responseNetSummary) {
          runStep(cycle, "FORWARD_RESPONSE_NET_SUMMARY", () => {
            return normalizedDependencies.net_receiver.receiveStatus(responseNetSummary);
          });
        }
      }

      cycle.status = "completed";
      cycle.completed_at = now();
      cycle.survey = clone(survey);
      cycle.first_ledger_entry = clone(firstLedgerEntry);
      cycle.first_net_summary = clone(firstNetSummary);
      cycle.response_survey = clone(responseSurvey);
      cycle.response_ledger_entry = clone(responseLedgerEntry);
      cycle.response_net_summary = clone(responseNetSummary);
      cycle.truth_capture = buildTruthCaptureSummary(responseSurvey || survey);

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
      step_id: makeId("accountContinuityExitSurveyStep"),
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
      survey_id: normalizeText(result.survey_id),
      entry_id: normalizeText(result.entry_id),
      status: normalizeText(result.status),
      ledger_state: normalizeText(result.ledger_state),
      net_state: normalizeText(result.net_state),
      survey_type: normalizeText(result.survey_type),
      headline: result.display_summary && result.display_summary.headline
        ? normalizeText(result.display_summary.headline)
        : result.safe_summary && result.safe_summary.headline
          ? normalizeText(result.safe_summary.headline)
          : normalizeText(result.headline),
    };
  }

  function buildTruthCaptureSummary(survey) {
    if (!survey || typeof survey !== "object") {
      return {
        state_the_problem_allowed: true,
        response_present: false,
        thank_you_present: false,
        no_pressure: true,
        no_punishment: true,
        no_identity_exposure: true,
      };
    }

    const response = survey.response || null;

    return {
      state_the_problem_allowed: true,
      perspective_prompt: "Please state your facts in your perspective.",
      response_present: Boolean(response),
      answered: response ? Boolean(response.answered) : false,
      skipped: response ? Boolean(response.skipped) : false,
      declined: response ? Boolean(response.declined) : false,
      requested_no_contact: response ? Boolean(response.requested_no_contact) : false,
      thank_you_present: response ? Boolean(response.thank_you) : false,
      thank_you_message: response && response.thank_you ? response.thank_you : "",
      safe_feedback_present: response ? Boolean(response.safe_feedback) : false,
      no_pressure: true,
      no_punishment: true,
      no_identity_exposure: true,
    };
  }

  function sanitizeSafeText(value) {
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

  function listCycles(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const status = normalizeText(cleanFilter.status);
    const surveyId = normalizeText(cleanFilter.survey_id);
    const surveyType = normalizeText(cleanFilter.survey_type);

    return cycles
      .filter((cycle) => {
        if (status && cycle.status !== status) {
          return false;
        }

        if (surveyId) {
          const cycleSurveyId =
            cycle.survey && cycle.survey.survey_id
              ? cycle.survey.survey_id
              : "";

          if (cycleSurveyId !== surveyId) {
            return false;
          }
        }

        if (surveyType) {
          const cycleSurveyType =
            cycle.survey && cycle.survey.survey_type
              ? cycle.survey.survey_type
              : "";

          if (cycleSurveyType !== surveyType) {
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
    runExitSurveyCycle,
    listCycles,
    latestCycle,
    clearCycles,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityExitSurveyController;
}
