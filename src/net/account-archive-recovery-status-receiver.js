// src/net/account-archive-recovery-status-receiver.js
// CyberCrowd NET — Account Archive Recovery Status Receiver
// Owns: receiving safe Core archive recovery status summaries for NET/display transport.
// Rule: NET can show recovery status. NET does not run recovery.
// Does not: run payments, guarantee recovery, approve recovery, reopen accounts,
// restore files, open unsafe archives, expose private archive contents,
// store payment secrets, or deal directly with the customer.

const AccountArchiveRecoveryStatusReceiver = (() => {
  const receivedStatuses = [];

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

  function normalizeNumber(value, fallback = null) {
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

  function normalizeStatus(status = {}) {
    const cleanStatus = requireObject(status, "STATUS_REQUIRED");

    return {
      received_id: makeId("archiveRecoveryNetStatus"),
      received_at: now(),
      source: "core.account-archive-recovery-status-ledger",
      recovery_review_id: requireText(
        cleanStatus.recovery_review_id,
        "RECOVERY_REVIEW_ID_REQUIRED"
      ),
      uidl_hint: normalizeText(cleanStatus.uidl_hint),
      status: requireText(cleanStatus.status, "STATUS_REQUIRED"),
      ledger_state: normalizeText(cleanStatus.ledger_state),
      created_at: normalizeText(cleanStatus.created_at),
      updated_at: normalizeText(cleanStatus.updated_at),
      display_summary: normalizeDisplaySummary(cleanStatus.display_summary),
      failures: normalizeList(cleanStatus.failures),
      review_fee: normalizeReviewFee(cleanStatus.review_fee),
      archive_reference_summary: normalizeArchiveReferenceSummary(
        cleanStatus.archive_reference_summary
      ),
      proof_summary: normalizeProofSummary(cleanStatus.proof_summary),
      material_summary: normalizeMaterialSummary(cleanStatus.material_summary),
      handoff_summary: normalizeHandoffSummary(cleanStatus.handoff_summary),
      shell_reopen: normalizeShellReopen(cleanStatus.shell_reopen),
      turd_package_status: normalizeTurdPackageStatus(cleanStatus.turd_package_status),
      rejection_reason: normalizeText(cleanStatus.rejection_reason),
    };
  }

  function normalizeDisplaySummary(summary = {}) {
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

  function normalizeReviewFee(reviewFee = {}) {
    if (!reviewFee || typeof reviewFee !== "object" || Array.isArray(reviewFee)) {
      return {
        amount: 0,
        currency: "USD",
        payment_confirmed: false,
      };
    }

    return {
      amount: normalizeNumber(reviewFee.amount, 0),
      currency: normalizeText(reviewFee.currency) || "USD",
      payment_confirmed: normalizeBoolean(reviewFee.payment_confirmed),
    };
  }

  function normalizeArchiveReferenceSummary(reference = {}) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
      return {
        archive_reference_id: "",
        uidl_hint: "",
        delete_request_id: "",
        archive_status: "unknown",
        sealed: false,
        contains_account_shell: false,
        contains_safe_material: false,
        contains_legacy_material: false,
        contains_corrupted_material: false,
        contains_unsafe_material: false,
        material_count: 0,
      };
    }

    return {
      archive_reference_id: normalizeText(reference.archive_reference_id),
      uidl_hint: normalizeText(reference.uidl_hint),
      delete_request_id: normalizeText(reference.delete_request_id),
      delete_finalized_at: normalizeText(reference.delete_finalized_at),
      archive_status: normalizeText(reference.archive_status) || "unknown",
      sealed: normalizeBoolean(reference.sealed),
      contains_account_shell: normalizeBoolean(reference.contains_account_shell),
      contains_safe_material: normalizeBoolean(reference.contains_safe_material),
      contains_legacy_material: normalizeBoolean(reference.contains_legacy_material),
      contains_corrupted_material: normalizeBoolean(reference.contains_corrupted_material),
      contains_unsafe_material: normalizeBoolean(reference.contains_unsafe_material),
      material_count: normalizeNumber(reference.material_count, 0),
    };
  }

  function normalizeProofSummary(proof = {}) {
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      return {
        human_verified: false,
        ownership_verified: false,
        delete_history_verified: false,
        recovery_reference_verified: false,
        proof_method_count: 0,
      };
    }

    return {
      human_verified: normalizeBoolean(proof.human_verified),
      ownership_verified: normalizeBoolean(proof.ownership_verified),
      delete_history_verified: normalizeBoolean(proof.delete_history_verified),
      recovery_reference_verified: normalizeBoolean(proof.recovery_reference_verified),
      proof_method_count: normalizeNumber(proof.proof_method_count, 0),
      reviewer_hint: normalizeText(proof.reviewer_hint),
    };
  }

  function normalizeMaterialSummary(material = {}) {
    if (!material || typeof material !== "object" || Array.isArray(material)) {
      return {
        classifications: [],
        counts: {},
        restore_ready: false,
        turd_package_needed: false,
        unsafe_hold_present: false,
      };
    }

    return {
      classifications: normalizeMaterialClassifications(material.classifications),
      counts: normalizeCounts(material.counts),
      restore_ready: normalizeBoolean(material.restore_ready),
      turd_package_needed: normalizeBoolean(material.turd_package_needed),
      unsafe_hold_present: normalizeBoolean(material.unsafe_hold_present),
    };
  }

  function normalizeMaterialClassifications(classifications) {
    if (!Array.isArray(classifications)) {
      return [];
    }

    return classifications.map((item) => {
      const cleanItem = requireObject(item, "MATERIAL_CLASSIFICATION_REQUIRED");

      return {
        classification: normalizeText(cleanItem.classification),
        meaning: normalizeText(cleanItem.meaning),
        handoff: normalizeText(cleanItem.handoff),
      };
    });
  }

  function normalizeCounts(counts = {}) {
    if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
      return {};
    }

    return {
      RESTORE_READY: normalizeNumber(counts.RESTORE_READY, 0),
      EXPORT_ONLY: normalizeNumber(counts.EXPORT_ONLY, 0),
      TURD_PACKAGE: normalizeNumber(counts.TURD_PACKAGE, 0),
      UNSAFE_HOLD: normalizeNumber(counts.UNSAFE_HOLD, 0),
      NO_MATERIAL_FOUND: normalizeNumber(counts.NO_MATERIAL_FOUND, 0),
    };
  }

  function normalizeHandoffSummary(handoff = {}) {
    if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) {
      return {
        triggered: false,
        status: "not_triggered",
        account_shell_eligible: false,
        safe_continuity_eligible: false,
        turd_package_required: false,
        biff_watch_enabled: false,
        biff_flags: [],
      };
    }

    return {
      triggered: normalizeBoolean(handoff.triggered),
      handoff_id: normalizeText(handoff.handoff_id),
      fired_at: normalizeText(handoff.fired_at),
      status: normalizeText(handoff.status),
      account_shell_eligible: normalizeBoolean(handoff.account_shell_eligible),
      account_shell_action: normalizeText(handoff.account_shell_action),
      safe_continuity_eligible: normalizeBoolean(handoff.safe_continuity_eligible),
      safe_continuity_action: normalizeText(handoff.safe_continuity_action),
      turd_package_required: normalizeBoolean(handoff.turd_package_required),
      turd_package_status: normalizeText(handoff.turd_package_status),
      biff_watch_enabled: normalizeBoolean(handoff.biff_watch_enabled),
      biff_watch_status: normalizeText(handoff.biff_watch_status),
      biff_flags: normalizeList(handoff.biff_flags),
    };
  }

  function normalizeShellReopen(shell = null) {
    if (!shell || typeof shell !== "object" || Array.isArray(shell)) {
      return null;
    }

    return {
      reopened_at: normalizeText(shell.reopened_at),
      status: normalizeText(shell.status),
      safe_continuity_restored: normalizeBoolean(shell.safe_continuity_restored),
      biff_watch_enabled: normalizeBoolean(shell.biff_watch_enabled),
    };
  }

  function normalizeTurdPackageStatus(status = null) {
    if (!status || typeof status !== "object" || Array.isArray(status)) {
      return null;
    }

    return {
      prepared_at: normalizeText(status.prepared_at),
      status: normalizeText(status.status),
      package_id: normalizeText(status.package_id),
      archive_reference_id: normalizeText(status.archive_reference_id),
      delivery_target: normalizeText(status.delivery_target),
      package_type: normalizeText(status.package_type),
    };
  }

  function receiveStatus(status = {}) {
    const normalized = normalizeStatus(status);

    normalized.net_state = deriveNetState(normalized);
    normalized.display_cards = buildDisplayCards(normalized);
    normalized.paper_ladder_row = buildPaperLadderRow(normalized);

    receivedStatuses.push(clone(normalized));

    return clone(normalized);
  }

  function deriveNetState(status) {
    if (status.ledger_state === "blocked") {
      return "blocked";
    }

    if (status.ledger_state === "review_opened") {
      return "review_opened";
    }

    if (status.ledger_state === "account_shell_reopened") {
      return "account_shell_reopened";
    }

    if (status.ledger_state === "rejected") {
      return "rejected";
    }

    return "unknown";
  }

  function buildDisplayCards(status) {
    if (status.net_state === "blocked") {
      return [
        {
          card_type: "RECOVERY_BLOCKED",
          headline: "Recovery review blocked",
          body: status.display_summary.body || "Archive recovery review cannot open yet.",
          safe_status: "blocked",
          failure_count: status.failures.length,
        },
      ];
    }

    if (status.net_state === "review_opened") {
      const cards = [
        {
          card_type: "RECOVERY_REVIEW_OPENED",
          headline: "Recovery review opened",
          body: "Recovery handoff triggered. Account shell and archive material are being checked.",
          safe_status: "review_opened",
          payment_confirmed: status.review_fee.payment_confirmed,
        },
      ];

      if (status.handoff_summary.account_shell_eligible) {
        cards.push({
          card_type: "ACCOUNT_SHELL_ELIGIBLE",
          headline: "Account shell eligible",
          body: "Account shell can be reviewed for as-was reopen.",
          safe_status: "shell_eligible",
        });
      }

      if (status.material_summary.restore_ready) {
        cards.push({
          card_type: "SAFE_CONTINUITY_AVAILABLE",
          headline: "Safe continuity available",
          body: "Some safe account continuity is eligible for restore.",
          safe_status: "restore_ready",
        });
      }

      if (status.material_summary.turd_package_needed) {
        cards.push({
          card_type: "TURD_PACKAGE_NEEDED",
          headline: "Dirty archive separated",
          body: "Legacy or corrupted material should be packaged separately for export.",
          safe_status: "turd_package_needed",
        });
      }

      if (status.material_summary.unsafe_hold_present) {
        cards.push({
          card_type: "UNSAFE_HOLD",
          headline: "Unsafe material held",
          body: "Unsafe archive material must remain held for separate review.",
          safe_status: "unsafe_hold",
        });
      }

      if (status.handoff_summary.biff_watch_enabled) {
        cards.push({
          card_type: "BIFF_WATCH",
          headline: "Biff watch active",
          body: "Recovery lane is being watched for restore/export/unsafe decisions.",
          safe_status: "biff_watch_active",
          flags: clone(status.handoff_summary.biff_flags),
        });
      }

      return cards;
    }

    if (status.net_state === "account_shell_reopened") {
      const cards = [
        {
          card_type: "ACCOUNT_SHELL_REOPENED",
          headline: "Account shell reopened",
          body: "Safe account continuity reopened. Dirty archive material remains separated.",
          safe_status: "account_shell_reopened",
          biff_watch_enabled: Boolean(
            status.shell_reopen && status.shell_reopen.biff_watch_enabled
          ),
        },
      ];

      if (status.turd_package_status) {
        cards.push({
          card_type: "TURD_PACKAGE_READY",
          headline: "TURD package ready",
          body: "Sealed export package is ready for verified owner/payee delivery.",
          safe_status: status.turd_package_status.status || "sealed_export_package_ready",
          package_type: status.turd_package_status.package_type,
        });
      }

      return cards;
    }

    if (status.net_state === "rejected") {
      return [
        {
          card_type: "RECOVERY_REJECTED",
          headline: "Recovery review rejected",
          body: status.rejection_reason || "Recovery review was rejected.",
          safe_status: "rejected",
        },
      ];
    }

    return [
      {
        card_type: "RECOVERY_UNKNOWN",
        headline: "Recovery state unknown",
        body: "Recovery status exists but does not match a known NET state.",
        safe_status: "unknown",
      },
    ];
  }

  function buildPaperLadderRow(status) {
    return {
      row_id: makeId("archiveRecoveryNetPaperRow"),
      recovery_review_id: status.recovery_review_id,
      received_at: status.received_at,
      net_state: status.net_state,
      payment_confirmed: status.review_fee.payment_confirmed,
      archive_sealed: status.archive_reference_summary.sealed,
      human_verified: status.proof_summary.human_verified,
      ownership_verified: status.proof_summary.ownership_verified,
      delete_history_verified: status.proof_summary.delete_history_verified,
      account_shell_eligible: status.handoff_summary.account_shell_eligible,
      safe_continuity_eligible: status.handoff_summary.safe_continuity_eligible,
      turd_package_needed: status.material_summary.turd_package_needed,
      unsafe_hold_present: status.material_summary.unsafe_hold_present,
      biff_watch_enabled: status.handoff_summary.biff_watch_enabled,
      boundary: "NET_RECEIVES_ONLY",
    };
  }

  function listStatuses(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const recoveryReviewId = normalizeText(cleanFilter.recovery_review_id);
    const status = normalizeText(cleanFilter.status);
    const netState = normalizeText(cleanFilter.net_state);

    return receivedStatuses
      .filter((item) => {
        if (recoveryReviewId && item.recovery_review_id !== recoveryReviewId) {
          return false;
        }

        if (status && item.status !== status) {
          return false;
        }

        if (netState && item.net_state !== netState) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestStatus() {
    if (!receivedStatuses.length) {
      return null;
    }

    return clone(receivedStatuses[receivedStatuses.length - 1]);
  }

  function clearStatuses() {
    receivedStatuses.length = 0;
    return true;
  }

  return {
    receiveStatus,
    listStatuses,
    latestStatus,
    clearStatuses,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountArchiveRecoveryStatusReceiver;
}
