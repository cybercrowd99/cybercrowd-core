// src/core/account-archive-recovery-status-ledger.js
// CyberCrowd Core — Account Archive Recovery Status Ledger
// Owns: recording archive recovery review states and preparing safe NET summaries.
// Rule: Payment starts review. Proof opens the shell. Safe material restores.
// Dirty archive goes to TURD. Biff watches the lane.
// Does not: run payments, guarantee recovery, approve recovery, reopen accounts,
// restore files, open unsafe archives, expose private archive contents,
// store payment secrets, or deal directly with the customer.

const AccountArchiveRecoveryStatusLedger = (() => {
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

  function normalizeRecoveryReview(review = {}) {
    const cleanReview = requireObject(review, "RECOVERY_REVIEW_REQUIRED");

    return {
      recovery_review_id: requireText(cleanReview.recovery_review_id, "RECOVERY_REVIEW_ID_REQUIRED"),
      created_at: normalizeText(cleanReview.created_at),
      updated_at: normalizeText(cleanReview.updated_at),
      rejected_at: normalizeText(cleanReview.rejected_at),
      uidl: normalizeText(cleanReview.uidl),
      uidl_hint: normalizeText(cleanReview.uidl_hint) || maskUidl(cleanReview.uidl),
      requested_by: normalizeText(cleanReview.requested_by),
      recovery_reason: normalizeText(cleanReview.recovery_reason),
      status: requireText(cleanReview.status, "STATUS_REQUIRED"),
      failures: normalizeList(cleanReview.failures),
      review_fee: normalizeReviewFee(cleanReview.review_fee),
      archive_reference: normalizeArchiveReference(cleanReview.archive_reference),
      human_proof: normalizeHumanProof(cleanReview.human_proof),
      requested_materials: normalizeList(cleanReview.requested_materials),
      material_classifications: normalizeMaterialClassifications(cleanReview.material_classifications),
      recovery_handoff: normalizeRecoveryHandoff(cleanReview.recovery_handoff),
      shell_reopen: normalizeShellReopen(cleanReview.shell_reopen),
      turd_package_status: normalizeTurdPackageStatus(cleanReview.turd_package_status),
      rejection_reason: normalizeText(cleanReview.rejection_reason),
      safe_summary: normalizeSafeSummary(cleanReview.safe_summary),
      metadata: normalizeMetadata(cleanReview.metadata),
    };
  }

  function normalizeReviewFee(reviewFee = {}) {
    if (!reviewFee || typeof reviewFee !== "object" || Array.isArray(reviewFee)) {
      return {
        amount: 0,
        currency: "USD",
        payment_id: "",
        payment_confirmed: false,
        meaning: "",
      };
    }

    return {
      amount: normalizeNumber(reviewFee.amount, 0),
      currency: normalizeText(reviewFee.currency) || "USD",
      payment_id: normalizeText(reviewFee.payment_id),
      payment_confirmed: normalizeBoolean(reviewFee.payment_confirmed),
      meaning: normalizeText(reviewFee.meaning),
    };
  }

  function normalizeArchiveReference(reference = {}) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
      return {
        archive_reference_id: "",
        uidl_hint: "",
        delete_request_id: "",
        delete_finalized_at: "",
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

  function normalizeHumanProof(proof = {}) {
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      return {
        human_verified: false,
        ownership_verified: false,
        delete_history_verified: false,
        recovery_reference_verified: false,
        proof_methods: [],
      };
    }

    return {
      human_verified: normalizeBoolean(proof.human_verified),
      ownership_verified: normalizeBoolean(proof.ownership_verified),
      delete_history_verified: normalizeBoolean(proof.delete_history_verified),
      recovery_reference_verified: normalizeBoolean(proof.recovery_reference_verified),
      proof_methods: normalizeList(proof.proof_methods),
      reviewer_hint: normalizeText(proof.reviewer_hint),
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

  function normalizeRecoveryHandoff(handoff = null) {
    if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) {
      return null;
    }

    return {
      handoff_id: normalizeText(handoff.handoff_id),
      fired_at: normalizeText(handoff.fired_at),
      payment_id: normalizeText(handoff.payment_id),
      archive_reference_id: normalizeText(handoff.archive_reference_id),
      delete_request_id: normalizeText(handoff.delete_request_id),
      status: normalizeText(handoff.status),
      account_shell: normalizeAccountShell(handoff.account_shell),
      safe_continuity: normalizeSafeContinuity(handoff.safe_continuity),
      turd_package: normalizeTurdPackagePlan(handoff.turd_package),
      biff_watch: normalizeBiffWatch(handoff.biff_watch),
    };
  }

  function normalizeAccountShell(shell = {}) {
    if (!shell || typeof shell !== "object" || Array.isArray(shell)) {
      return {
        eligible: false,
        action: "NO_ACCOUNT_SHELL_FOUND",
      };
    }

    return {
      eligible: normalizeBoolean(shell.eligible),
      action: normalizeText(shell.action),
    };
  }

  function normalizeSafeContinuity(continuity = {}) {
    if (!continuity || typeof continuity !== "object" || Array.isArray(continuity)) {
      return {
        eligible: false,
        action: "NO_SAFE_CONTINUITY_FOUND",
      };
    }

    return {
      eligible: normalizeBoolean(continuity.eligible),
      action: normalizeText(continuity.action),
    };
  }

  function normalizeTurdPackagePlan(plan = {}) {
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
      return {
        required: false,
        status: "not_required",
      };
    }

    return {
      required: normalizeBoolean(plan.required),
      package_id: normalizeText(plan.package_id),
      status: normalizeText(plan.status),
      archive_reference_id: normalizeText(plan.archive_reference_id),
      delivery_target: normalizeText(plan.delivery_target),
      package_type: normalizeText(plan.package_type),
      rule: normalizeText(plan.rule),
    };
  }

  function normalizeBiffWatch(watch = {}) {
    if (!watch || typeof watch !== "object" || Array.isArray(watch)) {
      return {
        enabled: false,
        status: "not_requested",
        flags: [],
      };
    }

    return {
      enabled: normalizeBoolean(watch.enabled),
      watch_id: normalizeText(watch.watch_id),
      status: normalizeText(watch.status),
      questions: normalizeList(watch.questions),
      flags: normalizeList(watch.flags),
    };
  }

  function normalizeShellReopen(shellReopen = null) {
    if (!shellReopen || typeof shellReopen !== "object" || Array.isArray(shellReopen)) {
      return null;
    }

    return {
      reopened_at: normalizeText(shellReopen.reopened_at),
      status: normalizeText(shellReopen.status),
      safe_continuity_restored: normalizeBoolean(shellReopen.safe_continuity_restored),
      biff_watch_enabled: normalizeBoolean(shellReopen.biff_watch_enabled),
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

  function deriveLedgerState(review) {
    if (review.status === "blocked") {
      return "blocked";
    }

    if (review.status === "review_opened") {
      return "review_opened";
    }

    if (review.status === "account_shell_reopened") {
      return "account_shell_reopened";
    }

    if (review.status === "rejected") {
      return "rejected";
    }

    return "unknown";
  }

  function recordRecoveryStatus(recoveryReview = {}) {
    const review = normalizeRecoveryReview(recoveryReview);
    const ledgerState = deriveLedgerState(review);

    const entry = {
      entry_id: makeId("archiveRecoveryStatus"),
      recorded_at: now(),
      source: "core.account-archive-recovery-review-gate",
      recovery_review_id: review.recovery_review_id,
      uidl: review.uidl,
      uidl_hint: review.uidl_hint,
      status: review.status,
      ledger_state: ledgerState,
      failures: clone(review.failures),
      review_fee: clone(review.review_fee),
      archive_reference_summary: buildArchiveReferenceSummary(review.archive_reference),
      proof_summary: buildProofSummary(review.human_proof),
      material_summary: buildMaterialSummary(review.material_classifications),
      handoff_summary: buildHandoffSummary(review.recovery_handoff),
      shell_reopen: clone(review.shell_reopen),
      turd_package_status: clone(review.turd_package_status),
      rejection_reason: review.rejection_reason,
      safe_summary: buildSafeSummary(review, ledgerState),
      paper_ladder_row: buildPaperLadderRow(review, ledgerState),
      net_summary: buildNetSummary(review, ledgerState),
    };

    entries.push(clone(entry));

    return clone(entry);
  }

  function buildArchiveReferenceSummary(reference) {
    return {
      archive_reference_id: reference.archive_reference_id,
      uidl_hint: reference.uidl_hint,
      delete_request_id: reference.delete_request_id,
      delete_finalized_at: reference.delete_finalized_at,
      archive_status: reference.archive_status,
      sealed: reference.sealed,
      contains_account_shell: reference.contains_account_shell,
      contains_safe_material: reference.contains_safe_material,
      contains_legacy_material: reference.contains_legacy_material,
      contains_corrupted_material: reference.contains_corrupted_material,
      contains_unsafe_material: reference.contains_unsafe_material,
      material_count: reference.material_count,
    };
  }

  function buildProofSummary(proof) {
    return {
      human_verified: proof.human_verified,
      ownership_verified: proof.ownership_verified,
      delete_history_verified: proof.delete_history_verified,
      recovery_reference_verified: proof.recovery_reference_verified,
      proof_method_count: proof.proof_methods.length,
      reviewer_hint: proof.reviewer_hint,
    };
  }

  function buildMaterialSummary(classifications) {
    const counts = {
      RESTORE_READY: 0,
      EXPORT_ONLY: 0,
      TURD_PACKAGE: 0,
      UNSAFE_HOLD: 0,
      NO_MATERIAL_FOUND: 0,
    };

    classifications.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(counts, item.classification)) {
        counts[item.classification] += 1;
      }
    });

    return {
      classifications: clone(classifications),
      counts,
      restore_ready: counts.RESTORE_READY > 0,
      turd_package_needed: counts.EXPORT_ONLY > 0 || counts.TURD_PACKAGE > 0,
      unsafe_hold_present: counts.UNSAFE_HOLD > 0,
    };
  }

  function buildHandoffSummary(handoff) {
    if (!handoff) {
      return {
        triggered: false,
        status: "not_triggered",
      };
    }

    return {
      triggered: true,
      handoff_id: handoff.handoff_id,
      fired_at: handoff.fired_at,
      status: handoff.status,
      account_shell_eligible: handoff.account_shell.eligible,
      account_shell_action: handoff.account_shell.action,
      safe_continuity_eligible: handoff.safe_continuity.eligible,
      safe_continuity_action: handoff.safe_continuity.action,
      turd_package_required: handoff.turd_package.required,
      turd_package_status: handoff.turd_package.status,
      biff_watch_enabled: handoff.biff_watch.enabled,
      biff_watch_status: handoff.biff_watch.status,
      biff_flags: clone(handoff.biff_watch.flags),
    };
  }

  function buildSafeSummary(review, ledgerState) {
    if (ledgerState === "blocked") {
      return {
        headline: "Recovery review blocked",
        body: "Archive recovery review cannot open until payment, proof, delete history, ownership, and sealed archive reference pass.",
        safe_tags: ["blocked", "review_not_opened"],
      };
    }

    if (ledgerState === "review_opened") {
      return {
        headline: "Recovery review opened",
        body: "Recovery handoff triggered. Account shell and archive material are being checked.",
        safe_tags: ["review_opened", "recovery_handoff_triggered"],
      };
    }

    if (ledgerState === "account_shell_reopened") {
      return {
        headline: "Account shell reopened",
        body: "Safe account continuity reopened. Dirty archive material remains separated.",
        safe_tags: ["account_shell_reopened", "safe_continuity", "dirty_archive_separated"],
      };
    }

    if (ledgerState === "rejected") {
      return {
        headline: "Recovery review rejected",
        body: review.rejection_reason || "Recovery review was rejected.",
        safe_tags: ["rejected"],
      };
    }

    return {
      headline: "Recovery state unknown",
      body: "Recovery review exists but does not match a known state.",
      safe_tags: ["unknown"],
    };
  }

  function buildPaperLadderRow(review, ledgerState) {
    const materialSummary = buildMaterialSummary(review.material_classifications);
    const handoffSummary = buildHandoffSummary(review.recovery_handoff);

    return {
      row_id: makeId("archiveRecoveryPaperRow"),
      recovery_review_id: review.recovery_review_id,
      recorded_at: now(),
      ledger_state: ledgerState,
      payment_confirmed: review.review_fee.payment_confirmed,
      archive_sealed: review.archive_reference.sealed,
      human_verified: review.human_proof.human_verified,
      ownership_verified: review.human_proof.ownership_verified,
      delete_history_verified: review.human_proof.delete_history_verified,
      recovery_reference_verified: review.human_proof.recovery_reference_verified,
      account_shell_eligible: handoffSummary.account_shell_eligible || false,
      safe_continuity_eligible: handoffSummary.safe_continuity_eligible || false,
      restore_ready: materialSummary.restore_ready,
      turd_package_needed: materialSummary.turd_package_needed,
      unsafe_hold_present: materialSummary.unsafe_hold_present,
      biff_watch_enabled: handoffSummary.biff_watch_enabled || false,
      boundary: "CORE_RECORDS_NET_RECEIVES_SAFE_STATUS",
    };
  }

  function buildNetSummary(review, ledgerState) {
    const materialSummary = buildMaterialSummary(review.material_classifications);
    const handoffSummary = buildHandoffSummary(review.recovery_handoff);

    return {
      recovery_review_id: review.recovery_review_id,
      uidl_hint: review.uidl_hint,
      status: review.status,
      ledger_state: ledgerState,
      created_at: review.created_at,
      updated_at: review.updated_at,
      display_summary: buildSafeSummary(review, ledgerState),
      failures: clone(review.failures),
      review_fee: {
        amount: review.review_fee.amount,
        currency: review.review_fee.currency,
        payment_confirmed: review.review_fee.payment_confirmed,
      },
      archive_reference_summary: buildArchiveReferenceSummary(review.archive_reference),
      proof_summary: buildProofSummary(review.human_proof),
      material_summary: materialSummary,
      handoff_summary: handoffSummary,
      shell_reopen: clone(review.shell_reopen),
      turd_package_status: clone(review.turd_package_status),
      rejection_reason: review.rejection_reason,
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
    const recoveryReviewId = normalizeText(cleanFilter.recovery_review_id);
    const ledgerState = normalizeText(cleanFilter.ledger_state);
    const status = normalizeText(cleanFilter.status);

    return entries
      .filter((entry) => {
        if (uidl && entry.uidl !== uidl) {
          return false;
        }

        if (recoveryReviewId && entry.recovery_review_id !== recoveryReviewId) {
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
    recordRecoveryStatus,
    latestEntry,
    latestNetSummary,
    listEntries,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountArchiveRecoveryStatusLedger;
}
