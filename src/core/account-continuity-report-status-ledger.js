// src/core/account-continuity-report-status-ledger.js
// CyberCrowd Core — Account Continuity Report Status Ledger
// Owns: recording account continuity report states and preparing safe NET/email handoff summaries.
// Rule: Before termination, report status. After termination, send final truth. No silent endings.
// Email can identify the report. Email cannot expose the person.
// Does not: send email, run payments, delete accounts, recover accounts, expose private identity,
// include proof material, expose archive contents, store email credentials, or deal directly with customer.

const AccountContinuityReportStatusLedger = (() => {
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

  function normalizeReport(report = {}) {
    const cleanReport = requireObject(report, "REPORT_REQUIRED");

    return {
      report_id: requireText(cleanReport.report_id, "REPORT_ID_REQUIRED"),
      created_at: normalizeText(cleanReport.created_at),
      report_type: normalizeText(cleanReport.report_type) || "monthly",
      uidl: normalizeText(cleanReport.uidl),
      uidl_hint: normalizeText(cleanReport.uidl_hint),
      account_number: normalizeText(cleanReport.account_number),
      account_tag: normalizeText(cleanReport.account_tag),
      report_email: normalizeText(cleanReport.report_email),
      status: requireText(cleanReport.status, "STATUS_REQUIRED"),
      reason: normalizeText(cleanReport.reason),
      email_only: cleanReport.email_only !== false,
      identity_boundary: normalizeText(cleanReport.identity_boundary),
      safe_identifier_rule: normalizeSafeIdentifierRule(cleanReport.safe_identifier_rule),
      subject: normalizeText(cleanReport.subject),
      email_body_present: Boolean(normalizeText(cleanReport.email_body)),
      safe_summary: normalizeSafeSummary(cleanReport.safe_summary),
      paper_ladder_row: normalizePaperLadderRow(cleanReport.paper_ladder_row),
      next_actions: normalizeNextActions(cleanReport.next_actions),
      email_handoff: normalizeEmailHandoff(cleanReport.email_handoff),
    };
  }

  function normalizeSafeIdentifierRule(rule = {}) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      return {
        allowed: [],
        blocked: [],
      };
    }

    return {
      allowed: normalizeList(rule.allowed),
      blocked: normalizeList(rule.blocked),
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
        report_type: "",
        account_status: "",
        delete_state: "",
        delete_finalized: false,
        recovery_state: "",
        shell_reopened: false,
        turd_package_needed: false,
        biff_watch_enabled: false,
        next_action_count: 0,
      };
    }

    return {
      row_id: normalizeText(row.row_id),
      report_type: normalizeText(row.report_type),
      created_at: normalizeText(row.created_at),
      account_status: normalizeText(row.account_status),
      has_account_number: normalizeBoolean(row.has_account_number),
      has_account_tag: normalizeBoolean(row.has_account_tag),
      has_uidl_hint: normalizeBoolean(row.has_uidl_hint),
      delete_state: normalizeText(row.delete_state),
      delete_finalized: normalizeBoolean(row.delete_finalized),
      recovery_state: normalizeText(row.recovery_state),
      shell_reopened: normalizeBoolean(row.shell_reopened),
      turd_package_needed: normalizeBoolean(row.turd_package_needed),
      biff_watch_enabled: normalizeBoolean(row.biff_watch_enabled),
      next_action_count: normalizeNumber(row.next_action_count, 0),
      boundary: normalizeText(row.boundary),
    };
  }

  function normalizeNextActions(actions) {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions.map((action) => {
      const cleanAction = action && typeof action === "object" && !Array.isArray(action)
        ? action
        : {};

      return {
        action_type: normalizeText(cleanAction.action_type),
        label: normalizeText(cleanAction.label),
        reference_tag: normalizeText(cleanAction.reference_tag),
        requires_human_approval: cleanAction.requires_human_approval !== false,
      };
    }).filter((action) => action.action_type && action.label);
  }

  function normalizeEmailHandoff(handoff = null) {
    if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) {
      return null;
    }

    return {
      handed_off_at: normalizeText(handoff.handed_off_at),
      provider_hint: normalizeText(handoff.provider_hint),
      message_id_hint: normalizeText(handoff.message_id_hint),
      status: normalizeText(handoff.status),
    };
  }

  function deriveLedgerState(report) {
    if (report.status === "blocked") {
      return "blocked";
    }

    if (report.status === "ready_for_email_handoff") {
      return "ready_for_email_handoff";
    }

    if (report.status === "email_handoff_recorded") {
      return "email_handoff_recorded";
    }

    return "unknown";
  }

  function reportTypeIsFinal(report) {
    return report.report_type === "final_termination";
  }

  function reportTypeIsPreTermination(report) {
    return report.report_type === "pre_termination";
  }

  function reportTypeIsMonthly(report) {
    return report.report_type === "monthly";
  }

  function recordReportStatus(report = {}) {
    const normalizedReport = normalizeReport(report);
    const ledgerState = deriveLedgerState(normalizedReport);

    const entry = {
      entry_id: makeId("accountContinuityStatus"),
      recorded_at: now(),
      source: "core.account-continuity-report-router",
      report_id: normalizedReport.report_id,
      report_type: normalizedReport.report_type,
      uidl: normalizedReport.uidl,
      uidl_hint: normalizedReport.uidl_hint,
      account_number: normalizedReport.account_number,
      account_tag: normalizedReport.account_tag,
      report_email_hint: maskEmail(normalizedReport.report_email),
      status: normalizedReport.status,
      ledger_state: ledgerState,
      reason: normalizedReport.reason,
      subject: normalizedReport.subject,
      email_body_present: normalizedReport.email_body_present,
      email_only: normalizedReport.email_only,
      identity_boundary: normalizedReport.identity_boundary,
      safe_identifier_rule: clone(normalizedReport.safe_identifier_rule),
      safe_summary: buildSafeSummary(normalizedReport, ledgerState),
      continuity_summary: buildContinuitySummary(normalizedReport),
      email_handoff: clone(normalizedReport.email_handoff),
      paper_ladder_row: buildPaperLadderRow(normalizedReport, ledgerState),
      net_summary: buildNetSummary(normalizedReport, ledgerState),
    };

    entries.push(clone(entry));

    return clone(entry);
  }

  function maskEmail(email) {
    const clean = normalizeText(email);

    if (!clean || !clean.includes("@")) {
      return "";
    }

    const [local, domain] = clean.split("@");

    if (!local || !domain) {
      return "";
    }

    const localHint = local.length <= 2
      ? `${local.slice(0, 1)}***`
      : `${local.slice(0, 2)}***`;

    return `${localHint}@${domain}`;
  }

  function buildSafeSummary(report, ledgerState) {
    if (ledgerState === "blocked") {
      return {
        headline: "Continuity report blocked",
        body: report.safe_summary.body || "This continuity report is not enabled.",
        safe_tags: ["blocked", report.reason || "no_reason"].filter(Boolean),
      };
    }

    if (ledgerState === "email_handoff_recorded") {
      return {
        headline: "Continuity email handoff recorded",
        body: "Safe account continuity report handoff has been recorded.",
        safe_tags: ["email_handoff_recorded", report.report_type],
      };
    }

    if (reportTypeIsFinal(report)) {
      return {
        headline: "Final termination summary ready",
        body: "Final truth email is ready with safe report references and no personal identity evidence.",
        safe_tags: ["final_termination", "no_silent_endings", "safe_references_only"],
      };
    }

    if (reportTypeIsPreTermination(report)) {
      return {
        headline: "Pre-termination status ready",
        body: "Status report is ready before finality.",
        safe_tags: ["pre_termination", "report_before_finality"],
      };
    }

    if (reportTypeIsMonthly(report)) {
      return {
        headline: "Account continuity report ready",
        body: "Monthly account continuity status is ready.",
        safe_tags: ["monthly", "account_continuity"],
      };
    }

    return {
      headline: "Continuity report status ready",
      body: "Account continuity report status is ready.",
      safe_tags: ["continuity_report"],
    };
  }

  function buildContinuitySummary(report) {
    return {
      report_type: report.report_type,
      has_safe_account_number: Boolean(report.account_number),
      has_safe_account_tag: Boolean(report.account_tag),
      has_masked_uidl_hint: Boolean(report.uidl_hint),
      delete_state: report.paper_ladder_row.delete_state,
      delete_finalized: report.paper_ladder_row.delete_finalized,
      recovery_state: report.paper_ladder_row.recovery_state,
      shell_reopened: report.paper_ladder_row.shell_reopened,
      turd_package_needed: report.paper_ladder_row.turd_package_needed,
      biff_watch_enabled: report.paper_ladder_row.biff_watch_enabled,
      next_action_count: report.next_actions.length,
      email_body_present: report.email_body_present,
    };
  }

  function buildPaperLadderRow(report, ledgerState) {
    return {
      row_id: makeId("accountContinuityStatusPaperRow"),
      report_id: report.report_id,
      recorded_at: now(),
      report_type: report.report_type,
      ledger_state: ledgerState,
      has_safe_account_number: Boolean(report.account_number),
      has_safe_account_tag: Boolean(report.account_tag),
      has_masked_uidl_hint: Boolean(report.uidl_hint),
      email_body_present: report.email_body_present,
      delete_state: report.paper_ladder_row.delete_state,
      delete_finalized: report.paper_ladder_row.delete_finalized,
      recovery_state: report.paper_ladder_row.recovery_state,
      shell_reopened: report.paper_ladder_row.shell_reopened,
      turd_package_needed: report.paper_ladder_row.turd_package_needed,
      biff_watch_enabled: report.paper_ladder_row.biff_watch_enabled,
      next_action_count: report.next_actions.length,
      boundary: "CORE_RECORDS_NET_RECEIVES_SAFE_STATUS_EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
    };
  }

  function buildNetSummary(report, ledgerState) {
    return {
      report_id: report.report_id,
      report_type: report.report_type,
      uidl_hint: report.uidl_hint,
      account_number: report.account_number,
      account_tag: report.account_tag,
      report_email_hint: maskEmail(report.report_email),
      status: report.status,
      ledger_state: ledgerState,
      subject: report.subject,
      email_only: report.email_only,
      identity_boundary: report.identity_boundary,
      display_summary: buildSafeSummary(report, ledgerState),
      continuity_summary: buildContinuitySummary(report),
      safe_identifier_rule: clone(report.safe_identifier_rule),
      email_handoff: clone(report.email_handoff),
      next_actions: clone(report.next_actions),
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
    const reportId = normalizeText(cleanFilter.report_id);
    const reportType = normalizeText(cleanFilter.report_type);
    const ledgerState = normalizeText(cleanFilter.ledger_state);
    const status = normalizeText(cleanFilter.status);

    return entries
      .filter((entry) => {
        if (uidl && entry.uidl !== uidl) {
          return false;
        }

        if (reportId && entry.report_id !== reportId) {
          return false;
        }

        if (reportType && entry.report_type !== reportType) {
          return false;
        }

        if (ledgerState && entry.ledger_state !== ledgerState) {
          return false;
        }

        if (status && entry.status !== status) {
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
    recordReportStatus,
    latestEntry,
    latestNetSummary,
    listEntries,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityReportStatusLedger;
}
