// src/core/account-continuity-repair-discovery-router.js
// CyberCrowd Core — Account Continuity Repair Discovery Router
// Owns: detecting repair-discovery value from exit, termination, survey, support,
// friction, or continuity signals and preparing an optional safe reopening offer.
// Rule: Leaving can reveal repair. Repair can create a new offer.
// Do not chase. Do not punish. Do not silently reopen. Ask once with respect.
// Does not: send email, reopen accounts, give free service automatically,
// force return, punish leaving, expose identity evidence, include private proof,
// include address/phone/first name/raw uIDL, run payments, or deal directly with customer.

const AccountContinuityRepairDiscoveryRouter = (() => {
  const discoveries = [];

  const DISCOVERY_SOURCES = [
    "exit_signal",
    "termination_report",
    "exit_survey",
    "support_signal",
    "friction_signal",
    "continuity_report",
    "archive_recovery_review",
    "email_handoff",
    "internal_repair",
  ];

  const OFFER_TYPES = [
    "new_opening",
    "reopen_trial",
    "paid_reactivation_review",
    "repair_feedback_session",
    "service_followup",
    "no_offer",
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

  function normalizeSource(value) {
    const clean = normalizeText(value);

    if (DISCOVERY_SOURCES.includes(clean)) {
      return clean;
    }

    return "internal_repair";
  }

  function normalizeOfferType(value) {
    const clean = normalizeText(value);

    if (OFFER_TYPES.includes(clean)) {
      return clean;
    }

    return "new_opening";
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

  function normalizeDiscoveryInput(input = {}) {
    const cleanInput = requireObject(input, "DISCOVERY_INPUT_REQUIRED");

    return {
      uidl: normalizeText(cleanInput.uidl),
      uidl_hint: normalizeText(cleanInput.uidl_hint) || maskUidl(cleanInput.uidl),
      account_number: normalizeSafeReference(cleanInput.account_number),
      account_tag: normalizeSafeReference(cleanInput.account_tag),
      report_id: normalizeSafeReference(cleanInput.report_id),
      exit_signal_id: normalizeSafeReference(cleanInput.exit_signal_id),
      source: normalizeSource(cleanInput.source),
      repair_found: normalizeBoolean(cleanInput.repair_found),
      signal_needed_repair: normalizeBoolean(cleanInput.signal_needed_repair),
      user_feedback_has_value: cleanInput.user_feedback_has_value !== false,
      should_offer_new_opening: cleanInput.should_offer_new_opening !== false,
      offer_type: normalizeOfferType(cleanInput.offer_type),
      offer_label: sanitizeEmailText(cleanInput.offer_label) || "View your optional CyberCrowd opening",
      offer_url: normalizeText(cleanInput.offer_url),
      internal_repair_summary: sanitizeEmailText(cleanInput.internal_repair_summary),
      feedback_value_summary: sanitizeEmailText(cleanInput.feedback_value_summary),
      biff_check: normalizeBiffCheck(cleanInput.biff_check),
      prior_outreach_count: normalizeNumber(cleanInput.prior_outreach_count, 0),
      do_not_contact: normalizeBoolean(cleanInput.do_not_contact),
      termination_finalized: normalizeBoolean(cleanInput.termination_finalized),
      account_reopen_allowed: normalizeBoolean(cleanInput.account_reopen_allowed),
      notes: normalizeSafeNotes(cleanInput.notes),
    };
  }

  function normalizeBiffCheck(check = {}) {
    if (!check || typeof check !== "object" || Array.isArray(check)) {
      return {
        passed: false,
        point: "",
        flags: [],
      };
    }

    return {
      passed: normalizeBoolean(check.passed),
      point: sanitizeEmailText(check.point),
      flags: normalizeSafeNotes(check.flags),
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
      .replace(/\braw uIDL\b/gi, "protected uIDL");
  }

  function evaluateDiscovery(input) {
    const failures = [];

    if (!input.repair_found) {
      failures.push("NO_REPAIR_FOUND");
    }

    if (!input.signal_needed_repair) {
      failures.push("NO_REPAIR_SIGNAL");
    }

    if (!input.user_feedback_has_value) {
      failures.push("NO_FEEDBACK_VALUE");
    }

    if (!input.should_offer_new_opening) {
      failures.push("NEW_OPENING_NOT_ALLOWED");
    }

    if (input.do_not_contact) {
      failures.push("DO_NOT_CONTACT");
    }

    if (input.prior_outreach_count > 0) {
      failures.push("ASK_ONCE_ALREADY_USED");
    }

    if (!input.biff_check.passed) {
      failures.push("BIFF_CHECK_NOT_PASSED");
    }

    if (!hasSafeReference(input)) {
      failures.push("NO_SAFE_REFERENCE");
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
      input.exit_signal_id
    );
  }

  function routeRepairDiscovery(input = {}) {
    const normalized = normalizeDiscoveryInput(input);
    const evaluation = evaluateDiscovery(normalized);

    const discovery = {
      discovery_id: makeId("accountContinuityRepairDiscovery"),
      created_at: now(),
      uidl: normalized.uidl,
      uidl_hint: normalized.uidl_hint,
      account_number: normalized.account_number,
      account_tag: normalized.account_tag,
      report_id: normalized.report_id,
      exit_signal_id: normalized.exit_signal_id,
      source: normalized.source,
      status: evaluation.allowed ? "offer_ready" : "blocked",
      offer_type: evaluation.allowed ? normalized.offer_type : "no_offer",
      failures: clone(evaluation.failures),
      safe_references: buildSafeReferences(normalized),
      biff_check: clone(normalized.biff_check),
      repair_summary: buildRepairSummary(normalized),
      outreach_packet: evaluation.allowed ? buildOutreachPacket(normalized) : null,
      safe_summary: buildSafeSummary(normalized, evaluation),
      paper_ladder_row: buildPaperLadderRow(normalized, evaluation),
    };

    discoveries.push(clone(discovery));

    return clone(discovery);
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

    if (input.exit_signal_id) {
      references.push({
        type: "exit_signal",
        value: input.exit_signal_id,
      });
    }

    return references;
  }

  function buildRepairSummary(input) {
    return {
      repair_found: input.repair_found,
      signal_needed_repair: input.signal_needed_repair,
      feedback_has_value: input.user_feedback_has_value,
      internal_repair_summary:
        input.internal_repair_summary ||
        "Your exit signal helped us find something worth repairing.",
      feedback_value_summary:
        input.feedback_value_summary ||
        "Real feedback has value, and CyberCrowd does not want to lose the kind of client who helps reveal what needs to be fixed.",
      ask_once: true,
      no_pressure: true,
      no_punishment: true,
      no_silent_reopen: true,
    };
  }

  function buildOutreachPacket(input) {
    return {
      packet_id: makeId("accountContinuityRepairOutreach"),
      created_at: now(),
      packet_type: "repair_discovery_outreach",
      offer_type: input.offer_type,
      offer_label: input.offer_label,
      offer_url: input.offer_url,
      safe_references: buildSafeReferences(input),
      subject: "CyberCrowd Repair Discovery Opening",
      body: buildOutreachBody(input),
      identity_boundary: "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
      optional: true,
      pressure_allowed: false,
      punishment_allowed: false,
      silent_reopen_allowed: false,
      provider_ready: true,
    };
  }

  function buildOutreachBody(input) {
    const lines = [];

    lines.push("Your exit signal helped us find something worth repairing.");
    lines.push("");
    lines.push("That matters.");
    lines.push("");
    lines.push(
      "Real feedback has value, and CyberCrowd does not want to lose the kind of client who helps reveal what needs to be fixed."
    );
    lines.push("");
    lines.push("A new opening may be offered.");
    lines.push("The return is optional.");
    lines.push("No pressure.");
    lines.push("No punishment.");

    if (input.offer_label || input.offer_url) {
      lines.push("");
      lines.push(buildOfferLine(input));
    }

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
        headline: "Repair discovery outreach blocked",
        body: "Repair discovery signal exists, but outreach is not allowed.",
        safe_tags: ["blocked", "repair_discovery", "ask_once"],
        failure_codes: clone(evaluation.failures),
      };
    }

    return {
      headline: "Repair discovery outreach ready",
      body: "A respectful optional reopening offer is ready because the exit signal revealed repair value.",
      safe_tags: ["offer_ready", "repair_discovery", "optional_return", "no_pressure"],
      failure_codes: [],
    };
  }

  function buildPaperLadderRow(input, evaluation) {
    return {
      row_id: makeId("accountContinuityRepairDiscoveryPaperRow"),
      created_at: now(),
      source: input.source,
      status: evaluation.allowed ? "offer_ready" : "blocked",
      offer_type: evaluation.allowed ? input.offer_type : "no_offer",
      has_account_number: Boolean(input.account_number),
      has_account_tag: Boolean(input.account_tag),
      has_masked_uidl_hint: Boolean(input.uidl_hint),
      has_report_id: Boolean(input.report_id),
      has_exit_signal_id: Boolean(input.exit_signal_id),
      repair_found: input.repair_found,
      signal_needed_repair: input.signal_needed_repair,
      feedback_has_value: input.user_feedback_has_value,
      biff_passed: input.biff_check.passed,
      prior_outreach_count: input.prior_outreach_count,
      do_not_contact: input.do_not_contact,
      failure_count: evaluation.failures.length,
      boundary: "OPTIONAL_REPAIR_DISCOVERY_OUTREACH_EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
    };
  }

  function markOutreachResponse(discoveryId, response = {}) {
    const discovery = discoveries.find((item) => item.discovery_id === discoveryId);

    if (!discovery) {
      throw new Error("DISCOVERY_NOT_FOUND");
    }

    const cleanResponse =
      response && typeof response === "object" && !Array.isArray(response)
        ? response
        : {};

    const responseState = normalizeText(cleanResponse.response_state) || "unknown";

    discovery.response = {
      recorded_at: now(),
      response_state: responseState,
      accepted_offer: responseState === "accepted",
      declined_offer: responseState === "declined",
      requested_no_contact: normalizeBoolean(cleanResponse.requested_no_contact),
      safe_note: sanitizeEmailText(cleanResponse.safe_note),
    };

    discovery.status = deriveStatusAfterResponse(discovery, responseState);

    return clone(discovery);
  }

  function deriveStatusAfterResponse(discovery, responseState) {
    if (responseState === "accepted") {
      return "offer_accepted";
    }

    if (responseState === "declined") {
      return "offer_declined";
    }

    if (discovery.response && discovery.response.requested_no_contact) {
      return "do_not_contact_recorded";
    }

    return discovery.status;
  }

  function listDiscoveries(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const status = normalizeText(cleanFilter.status);
    const source = normalizeText(cleanFilter.source);
    const reportId = normalizeText(cleanFilter.report_id);
    const offerType = normalizeText(cleanFilter.offer_type);

    return discoveries
      .filter((discovery) => {
        if (uidl && discovery.uidl !== uidl) {
          return false;
        }

        if (status && discovery.status !== status) {
          return false;
        }

        if (source && discovery.source !== source) {
          return false;
        }

        if (reportId && discovery.report_id !== reportId) {
          return false;
        }

        if (offerType && discovery.offer_type !== offerType) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestDiscovery() {
    if (!discoveries.length) {
      return null;
    }

    return clone(discoveries[discoveries.length - 1]);
  }

  function listPaperLadderRows(filter = {}) {
    return listDiscoveries(filter).map((discovery) => clone(discovery.paper_ladder_row));
  }

  function clearDiscoveries() {
    discoveries.length = 0;
    return true;
  }

  return {
    routeRepairDiscovery,
    markOutreachResponse,
    listDiscoveries,
    latestDiscovery,
    listPaperLadderRows,
    clearDiscoveries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityRepairDiscoveryRouter;
}
