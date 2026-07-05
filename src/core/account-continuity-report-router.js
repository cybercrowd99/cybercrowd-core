// src/core/account-continuity-report-router.js
// CyberCrowd Core — Account Continuity Report Router
// Owns: preparing safe monthly account continuity reports and final termination truth summaries.
// Rule: Before termination, report status. After termination, send final truth. No silent endings.
// Email-only content rule: email can identify the report, but cannot expose the person.
// Good email identifiers: account number, report number, archive reference, safe tag, masked uIDL hint.
// Bad email identifiers: home address, phone number, first name, full identity, private proof,
// raw uIDL, passwords, tokens, archive contents, and unnecessary identity detail.
// Does not: send email, run payments, delete accounts, recover accounts, expose private identity,
// include proof material, include passwords/tokens, expose archive contents, or deal directly with customer.

const AccountContinuityReportRouter = (() => {
  const reports = [];

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

  function normalizeSafeReference(value) {
    return sanitizeEmailText(normalizeText(value));
  }

  function normalizeAccountState(state = {}) {
    const cleanState = requireObject(state, "ACCOUNT_STATE_REQUIRED");

    return {
      uidl: requireText(cleanState.uidl, "UIDL_REQUIRED"),
      uidl_hint: normalizeText(cleanState.uidl_hint) || maskUidl(cleanState.uidl),
      account_number: normalizeSafeReference(cleanState.account_number),
      account_tag: normalizeSafeReference(cleanState.account_tag),
      account_status: normalizeText(cleanState.account_status) || "unknown",
      report_email: requireText(cleanState.report_email, "REPORT_EMAIL_REQUIRED"),
      monthly_report_enabled: cleanState.monthly_report_enabled !== false,
      final_report_enabled: cleanState.final_report_enabled !== false,
      active_session_count: normalizeNumber(cleanState.active_session_count, 0),
      pending_action_count: normalizeNumber(cleanState.pending_action_count, 0),
      last_report_at: normalizeText(cleanState.last_report_at),
      notes: normalizeText(cleanState.notes),
    };
  }

  function normalizeDeleteStatus(deleteStatus = {}) {
    if (!deleteStatus || typeof deleteStatus !== "object" || Array.isArray(deleteStatus)) {
      return {
        status: "none",
        ledger_state: "none",
        delete_request_id: "",
        delete_reference_id: "",
        reference_created: false,
        finality_ready: false,
        finalized: false,
        safe_message: "No delete request is pending.",
      };
    }

    const referenceSummary =
      deleteStatus.reference_summary && typeof deleteStatus.reference_summary === "object"
        ? deleteStatus.reference_summary
        : {};

    return {
      status: normalizeText(deleteStatus.status) || "none",
      ledger_state: normalizeText(deleteStatus.ledger_state) || "none",
      delete_request_id: normalizeSafeReference(deleteStatus.delete_request_id),
      delete_reference_id: normalizeSafeReference(
        deleteStatus.delete_reference_id || referenceSummary.reference_id
      ),
      reference_created: normalizeBoolean(deleteStatus.reference_created),
      finality_ready:
        normalizeText(deleteStatus.ledger_state) === "ready_for_final_delete" ||
        normalizeText(deleteStatus.status) === "ready_for_final_delete",
      finalized:
        normalizeText(deleteStatus.ledger_state) === "finalized" ||
        normalizeText(deleteStatus.status) === "finalized",
      cancelled:
        normalizeText(deleteStatus.ledger_state) === "cancelled" ||
        normalizeText(deleteStatus.status) === "cancelled",
      failure_count: Array.isArray(deleteStatus.failures)
        ? deleteStatus.failures.length
        : normalizeNumber(deleteStatus.failure_count, 0),
      safe_message:
        sanitizeEmailText(deleteStatus.safe_summary && deleteStatus.safe_summary.body) ||
        sanitizeEmailText(deleteStatus.finality_message) ||
        sanitizeEmailText(deleteStatus.message),
    };
  }

  function normalizeRecoveryStatus(recoveryStatus = {}) {
    if (!recoveryStatus || typeof recoveryStatus !== "object" || Array.isArray(recoveryStatus)) {
      return {
        status: "none",
        ledger_state: "none",
        recovery_review_id: "",
        review_opened: false,
        account_shell_reopened: false,
        turd_package_needed: false,
        unsafe_hold_present: false,
        biff_watch_enabled: false,
        safe_message: "No archive recovery review is pending.",
      };
    }

    const materialSummary =
      recoveryStatus.material_summary && typeof recoveryStatus.material_summary === "object"
        ? recoveryStatus.material_summary
        : {};

    const handoffSummary =
      recoveryStatus.handoff_summary && typeof recoveryStatus.handoff_summary === "object"
        ? recoveryStatus.handoff_summary
        : {};

    return {
      status: normalizeText(recoveryStatus.status) || "none",
      ledger_state: normalizeText(recoveryStatus.ledger_state) || "none",
      recovery_review_id: normalizeSafeReference(recoveryStatus.recovery_review_id),
      review_opened:
        normalizeText(recoveryStatus.ledger_state) === "review_opened" ||
        normalizeText(recoveryStatus.status) === "review_opened",
      account_shell_reopened:
        normalizeText(recoveryStatus.ledger_state) === "account_shell_reopened" ||
        normalizeText(recoveryStatus.status) === "account_shell_reopened",
      rejected:
        normalizeText(recoveryStatus.ledger_state) === "rejected" ||
        normalizeText(recoveryStatus.status) === "rejected",
      payment_confirmed: normalizeBoolean(
        recoveryStatus.review_fee && recoveryStatus.review_fee.payment_confirmed
      ),
      turd_package_needed: normalizeBoolean(materialSummary.turd_package_needed),
      unsafe_hold_present: normalizeBoolean(materialSummary.unsafe_hold_present),
      restore_ready: normalizeBoolean(materialSummary.restore_ready),
      biff_watch_enabled: normalizeBoolean(handoffSummary.biff_watch_enabled),
      safe_message:
        sanitizeEmailText(recoveryStatus.display_summary && recoveryStatus.display_summary.body) ||
        sanitizeEmailText(recoveryStatus.safe_summary && recoveryStatus.safe_summary.body),
    };
  }

  function normalizeArchiveStatus(archiveStatus = {}) {
    if (!archiveStatus || typeof archiveStatus !== "object" || Array.isArray(archiveStatus)) {
      return {
        archive_reference_id: "",
        archive_status: "unknown",
        sealed_reference_exists: false,
        eligible_for_review: false,
        material_count: 0,
      };
    }

    return {
      archive_reference_id: normalizeSafeReference(archiveStatus.archive_reference_id),
      archive_status: normalizeText(archiveStatus.archive_status) || "unknown",
      sealed_reference_exists: normalizeBoolean(archiveStatus.sealed_reference_exists),
      eligible_for_review: normalizeBoolean(archiveStatus.eligible_for_review),
      material_count: normalizeNumber(archiveStatus.material_count, 0),
      safe_note: sanitizeEmailText(archiveStatus.safe_note),
    };
  }

  function normalizeReportInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    return {
      report_type: normalizeText(cleanInput.report_type) || "monthly",
      account_state: normalizeAccountState(cleanInput.account_state),
      delete_status: normalizeDeleteStatus(cleanInput.delete_status),
      recovery_status: normalizeRecoveryStatus(cleanInput.recovery_status),
      archive_status: normalizeArchiveStatus(cleanInput.archive_status),
      biff_notes: normalizeSafeNotes(cleanInput.biff_notes),
      turd_notes: normalizeSafeNotes(cleanInput.turd_notes),
      next_actions: normalizeNextActions(cleanInput.next_actions),
    };
  }

  function normalizeSafeNotes(notes) {
    return normalizeList(notes).map((note) => sanitizeEmailText(note)).filter(Boolean);
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
        label: sanitizeEmailText(cleanAction.label),
        reference_tag: normalizeSafeReference(cleanAction.reference_tag),
        requires_human_approval: cleanAction.requires_human_approval !== false,
      };
    }).filter((action) => action.action_type && action.label);
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
      .replace(/\bproof\b/gi, "verification")
      .replace(/\bidentity evidence\b/gi, "verification detail")
      .replace(/\bfirst name\b/gi, "name detail")
      .replace(/\bhome address\b/gi, "address detail")
      .replace(/\bphone number\b/gi, "phone detail");
  }

  function reportTypeAllowed(reportType) {
    return ["monthly", "pre_termination", "final_termination"].includes(reportType);
  }

  function buildContinuityReport(input = {}) {
    const normalized = normalizeReportInput(input);

    if (!reportTypeAllowed(normalized.report_type)) {
      throw new Error("REPORT_TYPE_NOT_ALLOWED");
    }

    if (
      normalized.report_type === "monthly" &&
      !normalized.account_state.monthly_report_enabled
    ) {
      return recordReport(buildBlockedReport(normalized, "MONTHLY_REPORT_DISABLED"));
    }

    if (
      normalized.report_type === "final_termination" &&
      !normalized.account_state.final_report_enabled
    ) {
      return recordReport(buildBlockedReport(normalized, "FINAL_REPORT_DISABLED"));
    }

    const report = {
      report_id: makeId("accountContinuityReport"),
      created_at: now(),
      report_type: normalized.report_type,
      uidl: normalized.account_state.uidl,
      uidl_hint: normalized.account_state.uidl_hint,
      account_number: normalized.account_state.account_number,
      account_tag: normalized.account_state.account_tag,
      report_email: normalized.account_state.report_email,
      status: "ready_for_email_handoff",
      email_only: true,
      identity_boundary: "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
      safe_identifier_rule: {
        allowed: [
          "account_number",
          "report_number",
          "archive_reference",
          "safe_tag",
          "masked_uidl_hint",
        ],
        blocked: [
          "home_address",
          "phone_number",
          "first_name",
          "full_identity",
          "private_proof",
          "raw_uidl",
          "passwords",
          "tokens",
          "archive_contents",
        ],
      },
      subject: buildSubject(normalized),
      email_body: buildEmailBody(normalized),
      safe_summary: buildSafeSummary(normalized),
      paper_ladder_row: buildPaperLadderRow(normalized),
      next_actions: clone(normalized.next_actions),
    };

    return recordReport(report);
  }

  function buildBlockedReport(input, reason) {
    return {
      report_id: makeId("accountContinuityReport"),
      created_at: now(),
      report_type: input.report_type,
      uidl: input.account_state.uidl,
      uidl_hint: input.account_state.uidl_hint,
      account_number: input.account_state.account_number,
      account_tag: input.account_state.account_tag,
      report_email: input.account_state.report_email,
      status: "blocked",
      reason,
      email_only: true,
      subject: "",
      email_body: "",
      safe_summary: {
        headline: "Continuity report blocked",
        body: "This continuity report is not enabled.",
        safe_tags: ["blocked", reason],
      },
      paper_ladder_row: buildPaperLadderRow(input),
      next_actions: [],
    };
  }

  function buildSubject(input) {
    if (input.report_type === "final_termination") {
      return "CyberCrowd Account Final Termination Summary";
    }

    if (input.report_type === "pre_termination") {
      return "CyberCrowd Account Termination Status";
    }

    return "CyberCrowd Account Continuity Report";
  }

  function buildEmailBody(input) {
    const lines = [];

    lines.push(buildOpeningLine(input));

    const safeReferences = buildSafeReferenceLines(input);
    if (safeReferences.length) {
      lines.push("");
      lines.push("Safe references:");
      safeReferences.forEach((line) => {
        lines.push(`- ${line}`);
      });
    }

    lines.push("");
    lines.push("Account status:");
    lines.push(`- Active state: ${safeStatus(input.account_state.account_status)}`);
    lines.push(`- Pending actions: ${input.account_state.pending_action_count}`);

    lines.push("");
    lines.push("Delete status:");
    lines.push(`- State: ${safeStatus(input.delete_status.ledger_state)}`);
    lines.push(`- Finality ready: ${yesNo(input.delete_status.finality_ready)}`);
    lines.push(`- Finalized: ${yesNo(input.delete_status.finalized)}`);
    lines.push(`- Archive reference saved: ${yesNo(input.delete_status.reference_created)}`);

    lines.push("");
    lines.push("Archive recovery status:");
    lines.push(`- Review state: ${safeStatus(input.recovery_status.ledger_state)}`);
    lines.push(`- Payment confirmed for review: ${yesNo(input.recovery_status.payment_confirmed)}`);
    lines.push(`- Account shell reopened: ${yesNo(input.recovery_status.account_shell_reopened)}`);
    lines.push(`- TURD package needed: ${yesNo(input.recovery_status.turd_package_needed)}`);
    lines.push(`- Unsafe hold present: ${yesNo(input.recovery_status.unsafe_hold_present)}`);
    lines.push(`- Biff watch active: ${yesNo(input.recovery_status.biff_watch_enabled)}`);

    lines.push("");
    lines.push("Archive reference:");
    lines.push(`- Sealed archive reference exists: ${yesNo(input.archive_status.sealed_reference_exists)}`);
    lines.push(`- Eligible for archive review: ${yesNo(input.archive_status.eligible_for_review)}`);

    if (input.biff_notes.length) {
      lines.push("");
      lines.push("Biff notes:");
      input.biff_notes.forEach((note) => {
        lines.push(`- ${note}`);
      });
    }

    if (input.turd_notes.length) {
      lines.push("");
      lines.push("TURD notes:");
      input.turd_notes.forEach((note) => {
        lines.push(`- ${note}`);
      });
    }

    if (input.next_actions.length) {
      lines.push("");
      lines.push("Next allowed actions:");
      input.next_actions.forEach((action) => {
        const reference = action.reference_tag ? ` (${action.reference_tag})` : "";
        lines.push(`- ${action.label}${reference}`);
      });
    }

    lines.push("");
    lines.push(buildClosingLine(input));

    return lines.join("\n");
  }

  function buildSafeReferenceLines(input) {
    const references = [];

    if (input.account_state.account_number) {
      references.push(`Account #: ${input.account_state.account_number}`);
    }

    if (input.account_state.account_tag) {
      references.push(`Account tag: ${input.account_state.account_tag}`);
    }

    if (input.account_state.uidl_hint) {
      references.push(`uIDL tag: ${input.account_state.uidl_hint}`);
    }

    if (input.delete_status.delete_request_id) {
      references.push(`Delete request: ${input.delete_status.delete_request_id}`);
    }

    if (input.delete_status.delete_reference_id) {
      references.push(`Delete reference: ${input.delete_status.delete_reference_id}`);
    }

    if (input.archive_status.archive_reference_id) {
      references.push(`Archive reference: ${input.archive_status.archive_reference_id}`);
    }

    if (input.recovery_status.recovery_review_id) {
      references.push(`Recovery review: ${input.recovery_status.recovery_review_id}`);
    }

    return references;
  }

  function buildOpeningLine(input) {
    if (input.report_type === "final_termination") {
      return "This is the final account termination summary.";
    }

    if (input.report_type === "pre_termination") {
      return "This is a pre-termination account status report.";
    }

    return "This is your account continuity report.";
  }

  function buildClosingLine(input) {
    if (input.report_type === "final_termination") {
      return "No silent ending: this email records the final status only. It may include safe report references, but it does not include address, phone number, first name, private verification detail, full uIDL, credentials, archive contents, or unnecessary identity detail.";
    }

    if (input.report_type === "pre_termination") {
      return "Before termination, report status. Review any pending action before finality.";
    }

    return "No action is required unless one is listed above.";
  }

  function safeStatus(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return "none";
    }

    return clean.replace(/_/g, " ");
  }

  function yesNo(value) {
    return value ? "yes" : "no";
  }

  function buildSafeSummary(input) {
    if (input.report_type === "final_termination") {
      return {
        headline: "Final termination summary ready",
        body: "Final truth email is ready with safe report references and without personal identity evidence.",
        safe_tags: ["final_termination", "no_silent_endings", "safe_references_only"],
      };
    }

    if (input.report_type === "pre_termination") {
      return {
        headline: "Pre-termination status ready",
        body: "Status report is ready before finality.",
        safe_tags: ["pre_termination", "report_before_finality"],
      };
    }

    return {
      headline: "Account continuity report ready",
      body: "Monthly account continuity status is ready.",
      safe_tags: ["monthly", "account_continuity"],
    };
  }

  function buildPaperLadderRow(input) {
    return {
      row_id: makeId("accountContinuityPaperRow"),
      report_type: input.report_type,
      created_at: now(),
      account_status: input.account_state.account_status,
      has_account_number: Boolean(input.account_state.account_number),
      has_account_tag: Boolean(input.account_state.account_tag),
      has_uidl_hint: Boolean(input.account_state.uidl_hint),
      delete_state: input.delete_status.ledger_state,
      delete_finalized: input.delete_status.finalized,
      recovery_state: input.recovery_status.ledger_state,
      shell_reopened: input.recovery_status.account_shell_reopened,
      turd_package_needed: input.recovery_status.turd_package_needed,
      biff_watch_enabled: input.recovery_status.biff_watch_enabled,
      next_action_count: input.next_actions.length,
      boundary: "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
    };
  }

  function recordReport(report) {
    reports.push(clone(report));
    return clone(report);
  }

  function markEmailHandedOff(reportId, handoff = {}) {
    const report = reports.find((item) => item.report_id === reportId);

    if (!report) {
      throw new Error("REPORT_NOT_FOUND");
    }

    const cleanHandoff = handoff && typeof handoff === "object" && !Array.isArray(hand-off)
      ? handoff
      : {};

    report.status = "email_handoff_recorded";
    report.email_handoff = {
      handed_off_at: now(),
      provider_hint: normalizeText(cleanHandoff.provider_hint),
      message_id_hint: normalizeText(cleanHandoff.message_id_hint),
      status: normalizeText(cleanHandoff.status) || "handed_off",
    };

    return clone(report);
  }

  function listReports(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const reportType = normalizeText(cleanFilter.report_type);
    const status = normalizeText(cleanFilter.status);

    return reports
      .filter((report) => {
        if (uidl && report.uidl !== uidl) {
          return false;
        }

        if (reportType && report.report_type !== reportType) {
          return false;
        }

        if (status && report.status !== status) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestReport() {
    if (!reports.length) {
      return null;
    }

    return clone(reports[reports.length - 1]);
  }

  function clearReports() {
    reports.length = 0;
    return true;
  }

  return {
    buildContinuityReport,
    markEmailHandedOff,
    listReports,
    latestReport,
    clearReports,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityReportRouter;
}
