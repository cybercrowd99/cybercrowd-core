// src/core/account-delete-status-ledger.js
// CyberCrowd Core — Account Delete Status Ledger
// Owns: recording account delete gate states and preparing safe NET summaries.
// Rule #1: No accidents.
// Rule #2: Refer back to Rule #1.
// Does not: delete accounts, approve deletion, recover accounts, charge money,
// run payments, store passwords, store raw Turnstile tokens, expose private uIDL data,
// delete external provider accounts, or deal directly with the customer.

const AccountDeleteStatusLedger = (() => {
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

  function normalizeDeleteRequest(request = {}) {
    const cleanRequest = requireObject(request, "DELETE_REQUEST_REQUIRED");

    return {
      delete_request_id: requireText(cleanRequest.delete_request_id, "DELETE_REQUEST_ID_REQUIRED"),
      created_at: normalizeText(cleanRequest.created_at),
      updated_at: normalizeText(cleanRequest.updated_at),
      finalized_at: normalizeText(cleanRequest.finalized_at),
      cancelled_at: normalizeText(cleanRequest.cancelled_at),
      uidl: normalizeText(cleanRequest.uidl),
      uidl_hint: normalizeText(cleanRequest.uidl_hint) || maskUidl(cleanRequest.uidl),
      requested_by: normalizeText(cleanRequest.requested_by),
      delete_scope: normalizeText(cleanRequest.delete_scope) || "account",
      reason: normalizeText(cleanRequest.reason),
      status: requireText(cleanRequest.status, "STATUS_REQUIRED"),
      failures: normalizeList(cleanRequest.failures),
      rule_1: normalizeText(cleanRequest.rule_1) || "NO_ACCIDENTS",
      rule_2: normalizeText(cleanRequest.rule_2) || "REFER_BACK_TO_RULE_1",
      finality_message: normalizeText(cleanRequest.finality_message),
      cancel_reason: normalizeText(cleanRequest.cancel_reason),
      final_delete_token: normalizeText(cleanRequest.final_delete_token),
      gate_snapshot: normalizeGateSnapshot(cleanRequest.gate_snapshot),
      delete_reference: normalizeDeleteReference(cleanRequest.delete_reference),
      metadata: normalizeMetadata(cleanRequest.metadata),
    };
  }

  function normalizeGateSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return {
        confirmation_phrase_passed: false,
        turnstile_passed: false,
        human_verified: false,
        final_warning_acknowledged: false,
        understands_finality: false,
        wants_delete_reference: false,
        recovery_reference_fee_acknowledged: false,
      };
    }

    return {
      confirmation_phrase_required: normalizeText(snapshot.confirmation_phrase_required),
      confirmation_phrase_passed: normalizeBoolean(snapshot.confirmation_phrase_passed),
      turnstile_passed: normalizeBoolean(snapshot.turnstile_passed),
      human_verified: normalizeBoolean(snapshot.human_verified),
      final_warning_acknowledged: normalizeBoolean(snapshot.final_warning_acknowledged),
      understands_finality: normalizeBoolean(snapshot.understands_finality),
      wants_delete_reference: normalizeBoolean(snapshot.wants_delete_reference),
      recovery_reference_fee_acknowledged: normalizeBoolean(snapshot.recovery_reference_fee_acknowledged),
    };
  }

  function normalizeDeleteReference(reference = null) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
      return null;
    }

    return {
      reference_id: normalizeText(reference.reference_id),
      created_at: normalizeText(reference.created_at),
      uidl_hint: normalizeText(reference.uidl_hint),
      one_time_only: reference.one_time_only !== false,
      status: normalizeText(reference.status),
      box_count: Array.isArray(reference.character_boxes) ? reference.character_boxes.length : 0,
      fee_note_present: Boolean(normalizeText(reference.fee_note)),
    };
  }

  function normalizeMetadata(metadata = {}) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }

    return {
      client_hint: normalizeText(metadata.client_hint),
      device_hint: normalizeText(metadata.device_hint),
      session_hint: normalizeText(metadata.session_hint),
      route_hint: normalizeText(metadata.route_hint),
    };
  }

  function deriveLedgerState(request) {
    if (request.status === "blocked") {
      return "blocked";
    }

    if (request.status === "ready_for_final_delete") {
      return "ready_for_final_delete";
    }

    if (request.status === "finalized") {
      return "finalized";
    }

    if (request.status === "cancelled") {
      return "cancelled";
    }

    return "unknown";
  }

  function recordDeleteStatus(deleteRequest = {}) {
    const request = normalizeDeleteRequest(deleteRequest);
    const ledgerState = deriveLedgerState(request);

    const entry = {
      entry_id: makeId("accountDeleteStatus"),
      recorded_at: now(),
      source: "core.account-delete-finality-gate",
      delete_request_id: request.delete_request_id,
      uidl: request.uidl,
      uidl_hint: request.uidl_hint,
      delete_scope: request.delete_scope,
      status: request.status,
      ledger_state: ledgerState,
      failures: clone(request.failures),
      finality_message: request.finality_message,
      cancel_reason: request.cancel_reason,
      reference_created: Boolean(request.delete_reference),
      reference_summary: clone(request.delete_reference),
      gate_snapshot: clone(request.gate_snapshot),
      safe_summary: buildSafeSummary(request, ledgerState),
      paper_ladder_row: buildPaperLadderRow(request, ledgerState),
      net_summary: buildNetSummary(request, ledgerState),
    };

    entries.push(clone(entry));

    return clone(entry);
  }

  function buildSafeSummary(request, ledgerState) {
    if (ledgerState === "blocked") {
      return {
        headline: "Delete blocked",
        body: "Account delete cannot continue until every no-accident gate is passed.",
        safe_tags: ["blocked", "no_accidents"],
      };
    }

    if (ledgerState === "ready_for_final_delete") {
      return {
        headline: "Final delete ready",
        body: "Deletion is ready for the last human confirmation.",
        safe_tags: ["ready_for_final_delete", "human_confirmation_required"],
      };
    }

    if (ledgerState === "finalized") {
      return {
        headline: "Account delete finalized",
        body: "Deletion was deliberately finalized.",
        safe_tags: ["finalized", "deliberate_delete"],
      };
    }

    if (ledgerState === "cancelled") {
      return {
        headline: "Delete cancelled",
        body: request.cancel_reason || "Delete request was cancelled before finality.",
        safe_tags: ["cancelled"],
      };
    }

    return {
      headline: "Delete state unknown",
      body: "Delete request exists but does not match a known state.",
      safe_tags: ["unknown"],
    };
  }

  function buildPaperLadderRow(request, ledgerState) {
    return {
      row_id: makeId("accountDeletePaperRow"),
      delete_request_id: request.delete_request_id,
      recorded_at: now(),
      ledger_state: ledgerState,
      delete_scope: request.delete_scope,
      failure_count: request.failures.length,
      reference_created: Boolean(request.delete_reference),
      confirmation_phrase_passed: request.gate_snapshot.confirmation_phrase_passed,
      turnstile_passed: request.gate_snapshot.turnstile_passed,
      human_verified: request.gate_snapshot.human_verified,
      final_warning_acknowledged: request.gate_snapshot.final_warning_acknowledged,
      understands_finality: request.gate_snapshot.understands_finality,
      boundary: "CORE_RECORDS_NET_RECEIVES_SAFE_STATUS",
    };
  }

  function buildNetSummary(request, ledgerState) {
    return {
      delete_request_id: request.delete_request_id,
      uidl_hint: request.uidl_hint,
      delete_scope: request.delete_scope,
      status: request.status,
      ledger_state: ledgerState,
      created_at: request.created_at,
      finalized_at: request.finalized_at,
      cancelled_at: request.cancelled_at,
      failures: clone(request.failures),
      display_summary: buildSafeSummary(request, ledgerState),
      gate_summary: {
        confirmation_phrase_passed: request.gate_snapshot.confirmation_phrase_passed,
        turnstile_passed: request.gate_snapshot.turnstile_passed,
        human_verified: request.gate_snapshot.human_verified,
        final_warning_acknowledged: request.gate_snapshot.final_warning_acknowledged,
        understands_finality: request.gate_snapshot.understands_finality,
        wants_delete_reference: request.gate_snapshot.wants_delete_reference,
        reference_created: Boolean(request.delete_reference),
      },
      reference_summary: request.delete_reference
        ? {
            reference_id: request.delete_reference.reference_id,
            created_at: request.delete_reference.created_at,
            one_time_only: request.delete_reference.one_time_only,
            status: request.delete_reference.status,
            box_count: request.delete_reference.box_count,
          }
        : null,
      rule_1: request.rule_1,
      rule_2: request.rule_2,
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
    const deleteRequestId = normalizeText(cleanFilter.delete_request_id);
    const ledgerState = normalizeText(cleanFilter.ledger_state);
    const status = normalizeText(cleanFilter.status);

    return entries
      .filter((entry) => {
        if (uidl && entry.uidl !== uidl) {
          return false;
        }

        if (deleteRequestId && entry.delete_request_id !== deleteRequestId) {
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
    recordDeleteStatus,
    latestEntry,
    latestNetSummary,
    listEntries,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountDeleteStatusLedger;
}
