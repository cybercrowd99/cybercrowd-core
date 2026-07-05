// src/core/account-continuity-report-controller.js
// CyberCrowd Core — Account Continuity Report Controller
// Owns: coordinating account continuity report creation, status ledger recording,
// NET-safe summary handoff, and email handoff recording.
// Rule: Router builds report. Ledger records status. NET receives safe status.
// Email handoff is recorded. No silent endings.
// Does not: send email, run payments, delete accounts, recover accounts,
// expose private identity, include proof material, expose archive contents,
// store email credentials, or deal directly with customer.

const AccountContinuityReportController = (() => {
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
      report_input: requireObject(cleanInput.report_input, "REPORT_INPUT_REQUIRED"),
      forward_to_net: cleanInput.forward_to_net !== false,
      record_email_handoff: normalizeBoolean(cleanInput.record_email_handoff),
      email_handoff: normalizeEmailHandoff(cleanInput.email_handoff),
      notes: normalizeText(cleanInput.notes),
    };
  }

  function normalizeEmailHandoff(handoff = {}) {
    if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) {
      return {
        provider_hint: "",
        message_id_hint: "",
        status: "",
      };
    }

    return {
      provider_hint: normalizeText(handoff.provider_hint),
      message_id_hint: normalizeText(handoff.message_id_hint),
      status: normalizeText(handoff.status),
    };
  }

  function normalizeDependencies(dependencies = {}) {
    const cleanDependencies = requireObject(dependencies, "DEPENDENCIES_REQUIRED");

    return {
      report_router: requireObject(cleanDependencies.report_router, "REPORT_ROUTER_REQUIRED"),
      status_ledger: requireObject(cleanDependencies.status_ledger, "STATUS_LEDGER_REQUIRED"),
      net_receiver: cleanDependencies.net_receiver || null,
    };
  }

  function assertReportRouter(router) {
    requireFunction(router.buildContinuityReport, "REPORT_ROUTER_BUILD_REQUIRED");
    requireFunction(router.markEmailHandedOff, "REPORT_ROUTER_EMAIL_HANDOFF_REQUIRED");
  }

  function assertStatusLedger(ledger) {
    requireFunction(ledger.recordReportStatus, "STATUS_LEDGER_RECORD_REQUIRED");
    requireFunction(ledger.latestNetSummary, "STATUS_LEDGER_NET_SUMMARY_REQUIRED");
  }

  function assertNetReceiver(receiver) {
    if (!receiver) {
      return;
    }

    requireFunction(receiver.receiveStatus, "NET_RECEIVER_RECEIVE_REQUIRED");
  }

  function runReportCycle(input = {}, dependencies = {}) {
    const normalizedInput = normalizeControllerInput(input);
    const normalizedDependencies = normalizeDependencies(dependencies);

    assertReportRouter(normalizedDependencies.report_router);
    assertStatusLedger(normalizedDependencies.status_ledger);
    assertNetReceiver(normalizedDependencies.net_receiver);

    const cycle = {
      cycle_id: makeId("accountContinuityReportCycle"),
      started_at: now(),
      status: "started",
      steps: [],
      notes: normalizedInput.notes,
    };

    try {
      const report = runStep(cycle, "BUILD_CONTINUITY_REPORT", () => {
        return normalizedDependencies.report_router.buildContinuityReport(
          normalizedInput.report_input
        );
      });

      const firstLedgerEntry = runStep(cycle, "RECORD_REPORT_STATUS", () => {
        return normalizedDependencies.status_ledger.recordReportStatus(report);
      });

      const firstNetSummary = runStep(cycle, "PREPARE_NET_SUMMARY", () => {
        return normalizedDependencies.status_ledger.latestNetSummary();
      });

      if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && firstNetSummary) {
        runStep(cycle, "FORWARD_NET_SUMMARY", () => {
          return normalizedDependencies.net_receiver.receiveStatus(firstNetSummary);
        });
      }

      let emailHandoffReport = null;
      let handoffLedgerEntry = null;
      let handoffNetSummary = null;

      if (normalizedInput.record_email_handoff) {
        emailHandoffReport = runStep(cycle, "MARK_EMAIL_HANDOFF", () => {
          return normalizedDependencies.report_router.markEmailHandedOff(
            report.report_id,
            normalizedInput.email_handoff
          );
        });

        handoffLedgerEntry = runStep(cycle, "RECORD_EMAIL_HANDOFF_STATUS", () => {
          return normalizedDependencies.status_ledger.recordReportStatus(emailHandoffReport);
        });

        handoffNetSummary = runStep(cycle, "PREPARE_EMAIL_HANDOFF_NET_SUMMARY", () => {
          return normalizedDependencies.status_ledger.latestNetSummary();
        });

        if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && handoffNetSummary) {
          runStep(cycle, "FORWARD_EMAIL_HANDOFF_NET_SUMMARY", () => {
            return normalizedDependencies.net_receiver.receiveStatus(handoffNetSummary);
          });
        }
      }

      cycle.status = "completed";
      cycle.completed_at = now();
      cycle.report = clone(report);
      cycle.first_ledger_entry = clone(firstLedgerEntry);
      cycle.first_net_summary = clone(firstNetSummary);
      cycle.email_handoff_report = clone(emailHandoffReport);
      cycle.handoff_ledger_entry = clone(handoffLedgerEntry);
      cycle.handoff_net_summary = clone(handoffNetSummary);

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
      step_id: makeId("accountContinuityReportStep"),
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
      report_id: normalizeText(result.report_id),
      entry_id: normalizeText(result.entry_id),
      report_type: normalizeText(result.report_type),
      status: normalizeText(result.status),
      ledger_state: normalizeText(result.ledger_state),
      net_state: normalizeText(result.net_state),
      subject: normalizeText(result.subject),
      headline: result.display_summary && result.display_summary.headline
        ? normalizeText(result.display_summary.headline)
        : result.safe_summary && result.safe_summary.headline
          ? normalizeText(result.safe_summary.headline)
          : normalizeText(result.headline),
    };
  }

  function listCycles(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const status = normalizeText(cleanFilter.status);
    const reportId = normalizeText(cleanFilter.report_id);
    const reportType = normalizeText(cleanFilter.report_type);

    return cycles
      .filter((cycle) => {
        if (status && cycle.status !== status) {
          return false;
        }

        if (reportId) {
          const cycleReportId = cycle.report && cycle.report.report_id
            ? cycle.report.report_id
            : "";

          if (cycleReportId !== reportId) {
            return false;
          }
        }

        if (reportType) {
          const cycleReportType = cycle.report && cycle.report.report_type
            ? cycle.report.report_type
            : "";

          if (cycleReportType !== reportType) {
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
    runReportCycle,
    listCycles,
    latestCycle,
    clearCycles,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityReportController;
}
