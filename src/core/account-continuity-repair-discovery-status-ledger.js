// src/core/account-continuity-repair-discovery-status-ledger.js
// CyberCrowd Core — Account Continuity Repair Discovery Status Ledger
// Owns: recording repair-discovery offer states and preparing safe NET summaries.
// Rule: Router finds repair value. Ledger records the offer state.
// NET receives safe status. Ask once with respect. No pressure. No punishment.
// Does not: send email, reopen accounts, give free service automatically,
// force return, punish leaving, expose identity evidence, include private proof,
// include address/phone/first name/raw uIDL, run payments, or deal directly with customer.

const AccountContinuityRepairDiscoveryStatusLedger = (() => {
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
      point: normalizeText(check.point),
      flags: normalizeList(check.flags),
    };
  }

  function normalizeRepairSummary(summary = {}) {
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
      return {
        repair_found: false,
        signal_needed_repair: false,
        feedback_has_value: false,
        internal_repair_summary: "",
        feedback_value_summary: "",
        ask_once: true,
        no_pressure: true,
        no_punishment: true,
        no_silent_reopen: true,
      };
    }

    return {
      repair_found: normalizeBoolean(summary.repair_found),
      signal_needed_repair: normalizeBoolean(summary.signal_needed_repair),
      feedback_has_value: normalizeBoolean(summary.feedback_has_value),
      internal_repair_summary: normalizeText(summary.internal_repair_summary),
      feedback_value_summary: normalizeText(summary.feedback_value_summary),
      ask_once: summary.ask_once !== false,
      no_pressure: summary.no_pressure !== false,
      no_punishment: summary.no_punishment !== false,
      no_silent_reopen: summary.no_silent_reopen !== false,
    };
  }

  function normalizeOutreachPacket(packet = null) {
    if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
      return null;
    }

    return {
      packet_id: normalizeText(packet.packet_id),
      created_at: normalizeText(packet.created_at),
      packet_type: normalizeText(packet.packet_type),
      offer_type: normalizeText(packet.offer_type),
      offer_label: normalizeText(packet.offer_label),
      offer_url_present: Boolean(normalizeText(packet.offer_url)),
      subject: normalizeText(packet.subject),
      body_present: Boolean(normalizeText(packet.body)),
      identity_boundary: normalizeText(packet.identity_boundary),
      optional: packet.optional !== false,
      pressure_allowed: normalizeBoolean(packet.pressure_allowed),
      punishment_allowed: normalizeBoolean(packet.punishment_allowed),
      silent_reopen_allowed: normalizeBoolean(packet.silent_reopen_allowed),
      provider_ready: normalizeBoolean(packet.provider_ready),
      safe_references: normalizeSafeReferences(packet.safe_references),
    };
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

  function normalizePaperLadderRow(row = {}) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return {
        source: "",
        status: "",
        offer_type: "",
        has_account_number: false,
        has_account_tag: false,
        has_masked_uidl_hint: false,
        has_report_id: false,
        has_exit_signal_id: false,
        repair_found: false,
        signal_needed_repair: false,
        feedback_has_value: false,
        biff_passed: false,
        prior_outreach_count: 0,
        do_not_contact: false,
        failure_count: 0,
      };
    }

    return {
      row_id: normalizeText(row.row_id),
      created_at: normalizeText(row.created_at),
      source: normalizeText(row.source),
      status: normalizeText(row.status),
      offer_type: normalizeText(row.offer_type),
      has_account_number: normalizeBoolean(row.has_account_number),
      has_account_tag: normalizeBoolean(row.has_account_tag),
      has_masked_uidl_hint: normalizeBoolean(row.has_masked_uidl_hint),
      has_report_id: normalizeBoolean(row.has_report_id),
      has_exit_signal_id: normalizeBoolean(row.has_exit_signal_id),
      repair_found: normalizeBoolean(row.repair_found),
      signal_needed_repair: normalizeBoolean(row.signal_needed_repair),
      feedback_has_value: normalizeBoolean(row.feedback_has_value),
      biff_passed: normalizeBoolean(row.biff_passed),
      prior_outreach_count: normalizeNumber(row.prior_outreach_count, 0),
      do_not_contact: normalizeBoolean(row.do_not_contact),
      failure_count: normalizeNumber(row.failure_count, 0),
      boundary: normalizeText(row.boundary),
    };
  }

  function normalizeResponse(response = null) {
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return null;
    }

    return {
      recorded_at: normalizeText(response.recorded_at),
      response_state: normalizeText(response.response_state),
      accepted_offer: normalizeBoolean(response.accepted_offer),
      declined_offer: normalizeBoolean(response.declined_offer),
      requested_no_contact: normalizeBoolean(response.requested_no_contact),
      safe_note: normalizeText(response.safe_note),
    };
  }

  function normalizeDiscovery(discovery = {}) {
    const cleanDiscovery = requireObject(discovery, "DISCOVERY_REQUIRED");

    return {
      discovery_id: requireText(cleanDiscovery.discovery_id, "DISCOVERY_ID_REQUIRED"),
      created_at: normalizeText(cleanDiscovery.created_at),
      uidl: normalizeText(cleanDiscovery.uidl),
      uidl_hint: normalizeText(cleanDiscovery.uidl_hint),
      account_number: normalizeText(cleanDiscovery.account_number),
      account_tag: normalizeText(cleanDiscovery.account_tag),
      report_id: normalizeText(cleanDiscovery.report_id),
      exit_signal_id: normalizeText(cleanDiscovery.exit_signal_id),
      source: normalizeText(cleanDiscovery.source) || "internal_repair",
      status: requireText(cleanDiscovery.status, "STATUS_REQUIRED"),
      offer_type: normalizeText(cleanDiscovery.offer_type) || "no_offer",
      failures: normalizeList(cleanDiscovery.failures),
      safe_references: normalizeSafeReferences(cleanDiscovery.safe_references),
      biff_check: normalizeBiffCheck(cleanDiscovery.biff_check),
      repair_summary: normalizeRepairSummary(cleanDiscovery.repair_summary),
      outreach_packet: normalizeOutreachPacket(cleanDiscovery.outreach_packet),
      safe_summary: normalizeSafeSummary(cleanDiscovery.safe_summary),
      paper_ladder_row: normalizePaperLadderRow(cleanDiscovery.paper_ladder_row),
      response: normalizeResponse(cleanDiscovery.response),
    };
  }

  function deriveLedgerState(discovery) {
    if (discovery.status === "offer_ready") {
      return "offer_ready";
    }

    if (discovery.status === "blocked") {
      return "blocked";
    }

    if (discovery.status === "offer_accepted") {
      return "offer_accepted";
    }

    if (discovery.status === "offer_declined") {
      return "offer_declined";
    }

    if (discovery.status === "do_not_contact_recorded") {
      return "do_not_contact_recorded";
    }

    return "unknown";
  }

  function recordRepairDiscoveryStatus(discovery = {}) {
    const normalizedDiscovery = normalizeDiscovery(discovery);
    const ledgerState = deriveLedgerState(normalizedDiscovery);

    const entry = {
      entry_id: makeId("accountContinuityRepairDiscoveryStatus"),
      recorded_at: now(),
      source: "core.account-continuity-repair-discovery-router",
      discovery_id: normalizedDiscovery.discovery_id,
      discovery_source: normalizedDiscovery.source,
      uidl: normalizedDiscovery.uidl,
      uidl_hint: normalizedDiscovery.uidl_hint,
      account_number: normalizedDiscovery.account_number,
      account_tag: normalizedDiscovery.account_tag,
      report_id: normalizedDiscovery.report_id,
      exit_signal_id: normalizedDiscovery.exit_signal_id,
      status: normalizedDiscovery.status,
      ledger_state: ledgerState,
      offer_type: normalizedDiscovery.offer_type,
      failures: clone(normalizedDiscovery.failures),
      safe_references: clone(normalizedDiscovery.safe_references),
      biff_check: clone(normalizedDiscovery.biff_check),
      repair_summary: clone(normalizedDiscovery.repair_summary),
      outreach_packet_summary: buildOutreachPacketSummary(normalizedDiscovery.outreach_packet),
      response_summary: buildResponseSummary(normalizedDiscovery.response),
      safe_summary: buildSafeSummary(normalizedDiscovery, ledgerState),
      discovery_summary: buildDiscoverySummary(normalizedDiscovery),
      paper_ladder_row: buildPaperLadderRow(normalizedDiscovery, ledgerState),
      net_summary: buildNetSummary(normalizedDiscovery, ledgerState),
    };

    entries.push(clone(entry));

    return clone(entry);
  }

  function buildOutreachPacketSummary(packet) {
    if (!packet) {
      return {
        packet_present: false,
        provider_ready: false,
        optional: true,
        pressure_allowed: false,
        punishment_allowed: false,
        silent_reopen_allowed: false,
      };
    }

    return {
      packet_present: true,
      packet_id: packet.packet_id,
      packet_type: packet.packet_type,
      offer_type: packet.offer_type,
      offer_label: packet.offer_label,
      offer_url_present: packet.offer_url_present,
      subject: packet.subject,
      body_present: packet.body_present,
      identity_boundary: packet.identity_boundary,
      provider_ready: packet.provider_ready,
      optional: packet.optional,
      pressure_allowed: packet.pressure_allowed,
      punishment_allowed: packet.punishment_allowed,
      silent_reopen_allowed: packet.silent_reopen_allowed,
      safe_reference_count: packet.safe_references.length,
    };
  }

  function buildResponseSummary(response) {
    if (!response) {
      return {
        response_present: false,
        response_state: "",
        accepted_offer: false,
        declined_offer: false,
        requested_no_contact: false,
      };
    }

    return {
      response_present: true,
      recorded_at: response.recorded_at,
      response_state: response.response_state,
      accepted_offer: response.accepted_offer,
      declined_offer: response.declined_offer,
      requested_no_contact: response.requested_no_contact,
      safe_note_present: Boolean(response.safe_note),
    };
  }

  function buildSafeSummary(discovery, ledgerState) {
    if (ledgerState === "blocked") {
      return {
        headline: "Repair discovery outreach blocked",
        body: "Repair discovery signal exists, but outreach is not allowed.",
        safe_tags: ["blocked", "repair_discovery", "ask_once"],
        failure_codes: clone(discovery.failures),
      };
    }

    if (ledgerState === "offer_ready") {
      return {
        headline: "Repair discovery outreach ready",
        body: "A respectful optional reopening offer is ready because the exit signal revealed repair value.",
        safe_tags: ["offer_ready", "repair_discovery", "optional_return", "no_pressure"],
        failure_codes: [],
      };
    }

    if (ledgerState === "offer_accepted") {
      return {
        headline: "Repair discovery offer accepted",
        body: "The optional repair-discovery opening was accepted.",
        safe_tags: ["offer_accepted", "repair_discovery", "human_chose_yes"],
        failure_codes: [],
      };
    }

    if (ledgerState === "offer_declined") {
      return {
        headline: "Repair discovery offer declined",
        body: "The optional repair-discovery opening was declined.",
        safe_tags: ["offer_declined", "repair_discovery", "human_chose_no"],
        failure_codes: [],
      };
    }

    if (ledgerState === "do_not_contact_recorded") {
      return {
        headline: "Do-not-contact recorded",
        body: "The person requested no further repair-discovery outreach.",
        safe_tags: ["do_not_contact", "repair_discovery", "respect_boundary"],
        failure_codes: [],
      };
    }

    return {
      headline: "Repair discovery state unknown",
      body: "Repair discovery status exists but does not match a known ledger state.",
      safe_tags: ["unknown", "repair_discovery"],
      failure_codes: clone(discovery.failures),
    };
  }

  function buildDiscoverySummary(discovery) {
    return {
      discovery_source: discovery.source,
      offer_type: discovery.offer_type,
      repair_found: discovery.repair_summary.repair_found,
      signal_needed_repair: discovery.repair_summary.signal_needed_repair,
      feedback_has_value: discovery.repair_summary.feedback_has_value,
      ask_once: discovery.repair_summary.ask_once,
      no_pressure: discovery.repair_summary.no_pressure,
      no_punishment: discovery.repair_summary.no_punishment,
      no_silent_reopen: discovery.repair_summary.no_silent_reopen,
      biff_passed: discovery.biff_check.passed,
      failure_count: discovery.failures.length,
      safe_reference_count: discovery.safe_references.length,
      outreach_packet_present: Boolean(discovery.outreach_packet),
      response_present: Boolean(discovery.response),
    };
  }

  function buildPaperLadderRow(discovery, ledgerState) {
    return {
      row_id: makeId("accountContinuityRepairDiscoveryStatusPaperRow"),
      discovery_id: discovery.discovery_id,
      recorded_at: now(),
      source: discovery.source,
      ledger_state: ledgerState,
      offer_type: discovery.offer_type,
      has_account_number: Boolean(discovery.account_number),
      has_account_tag: Boolean(discovery.account_tag),
      has_masked_uidl_hint: Boolean(discovery.uidl_hint),
      has_report_id: Boolean(discovery.report_id),
      has_exit_signal_id: Boolean(discovery.exit_signal_id),
      repair_found: discovery.repair_summary.repair_found,
      signal_needed_repair: discovery.repair_summary.signal_needed_repair,
      feedback_has_value: discovery.repair_summary.feedback_has_value,
      biff_passed: discovery.biff_check.passed,
      outreach_packet_present: Boolean(discovery.outreach_packet),
      response_present: Boolean(discovery.response),
      failure_count: discovery.failures.length,
      boundary: "CORE_RECORDS_REPAIR_DISCOVERY_NET_RECEIVES_SAFE_STATUS_ASK_ONCE_WITH_RESPECT",
    };
  }

  function buildNetSummary(discovery, ledgerState) {
    return {
      discovery_id: discovery.discovery_id,
      discovery_source: discovery.source,
      uidl_hint: discovery.uidl_hint,
      account_number: discovery.account_number,
      account_tag: discovery.account_tag,
      report_id: discovery.report_id,
      exit_signal_id: discovery.exit_signal_id,
      status: discovery.status,
      ledger_state: ledgerState,
      offer_type: discovery.offer_type,
      safe_references: clone(discovery.safe_references),
      display_summary: buildSafeSummary(discovery, ledgerState),
      discovery_summary: buildDiscoverySummary(discovery),
      outreach_packet_summary: buildOutreachPacketSummary(discovery.outreach_packet),
      response_summary: buildResponseSummary(discovery.response),
      biff_check: clone(discovery.biff_check),
      failures: clone(discovery.failures),
      identity_boundary: "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
      service_boundary: "ASK_ONCE_WITH_RESPECT_NO_PRESSURE_NO_PUNISHMENT",
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
    const discoveryId = normalizeText(cleanFilter.discovery_id);
    const reportId = normalizeText(cleanFilter.report_id);
    const ledgerState = normalizeText(cleanFilter.ledger_state);
    const status = normalizeText(cleanFilter.status);
    const offerType = normalizeText(cleanFilter.offer_type);

    return entries
      .filter((entry) => {
        if (uidl && entry.uidl !== uidl) {
          return false;
        }

        if (discoveryId && entry.discovery_id !== discoveryId) {
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

        if (offerType && entry.offer_type !== offerType) {
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
    recordRepairDiscoveryStatus,
    latestEntry,
    latestNetSummary,
    listEntries,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityRepairDiscoveryStatusLedger;
        }
