// src/core/account-archive-recovery-review-gate.js
// CyberCrowd Core — Account Archive Recovery Review Gate
// Owns: paid archive recovery review after deliberate account deletion.
// Rule: Payment starts review. Proof opens the shell. Safe material restores.
// Dirty archive goes to TURD. Biff watches the lane.
// Does not: run payments, guarantee recovery, bypass human verification,
// undo delete finality by magic, blindly restore corrupted material,
// open unsafe archives, replace login recovery, or deal directly with the customer.

const AccountArchiveRecoveryReviewGate = (() => {
  const recoveryReviews = [];

  const REVIEW_FEE_USD = 29.99;

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

  function normalizePaymentSignal(payment = {}) {
    const cleanPayment = requireObject(payment, "PAYMENT_SIGNAL_REQUIRED");

    return {
      payment_id: requireText(cleanPayment.payment_id, "PAYMENT_ID_REQUIRED"),
      status: normalizeText(cleanPayment.status),
      amount: normalizeNumber(cleanPayment.amount, null),
      currency: normalizeText(cleanPayment.currency) || "USD",
      confirmed_at: normalizeText(cleanPayment.confirmed_at),
      processor_hint: normalizeText(cleanPayment.processor_hint),
    };
  }

  function normalizeArchiveReference(reference = {}) {
    const cleanReference = requireObject(reference, "ARCHIVE_REFERENCE_REQUIRED");

    return {
      archive_reference_id: requireText(
        cleanReference.archive_reference_id,
        "ARCHIVE_REFERENCE_ID_REQUIRED"
      ),
      uidl_hint: normalizeText(cleanReference.uidl_hint),
      delete_request_id: normalizeText(cleanReference.delete_request_id),
      delete_finalized_at: normalizeText(cleanReference.delete_finalized_at),
      archive_status: normalizeText(cleanReference.archive_status) || "unknown",
      sealed: normalizeBoolean(cleanReference.sealed),
      contains_account_shell: normalizeBoolean(cleanReference.contains_account_shell),
      contains_safe_material: normalizeBoolean(cleanReference.contains_safe_material),
      contains_legacy_material: normalizeBoolean(cleanReference.contains_legacy_material),
      contains_corrupted_material: normalizeBoolean(cleanReference.contains_corrupted_material),
      contains_unsafe_material: normalizeBoolean(cleanReference.contains_unsafe_material),
      material_count: normalizeNumber(cleanReference.material_count, 0),
      notes: normalizeText(cleanReference.notes),
    };
  }

  function normalizeHumanProof(proof = {}) {
    const cleanProof = requireObject(proof, "HUMAN_PROOF_REQUIRED");

    return {
      human_verified: normalizeBoolean(cleanProof.human_verified),
      ownership_verified: normalizeBoolean(cleanProof.ownership_verified),
      delete_history_verified: normalizeBoolean(cleanProof.delete_history_verified),
      recovery_reference_verified: normalizeBoolean(cleanProof.recovery_reference_verified),
      proof_methods: normalizeList(cleanProof.proof_methods),
      reviewer_hint: normalizeText(cleanProof.reviewer_hint),
    };
  }

  function normalizeRecoveryInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    return {
      uidl: requireText(cleanInput.uidl, "UIDL_REQUIRED"),
      requested_by: normalizeText(cleanInput.requested_by),
      recovery_reason: normalizeText(cleanInput.recovery_reason),
      payment_signal: normalizePaymentSignal(cleanInput.payment_signal),
      archive_reference: normalizeArchiveReference(cleanInput.archive_reference),
      human_proof: normalizeHumanProof(cleanInput.human_proof),
      requested_materials: normalizeList(cleanInput.requested_materials),
      biff_watch_requested: cleanInput.biff_watch_requested !== false,
      turd_package_allowed: cleanInput.turd_package_allowed !== false,
      metadata: normalizeMetadata(cleanInput.metadata),
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

  function paymentConfirmed(payment) {
    return (
      payment.status === "confirmed" &&
      payment.currency === "USD" &&
      payment.amount >= REVIEW_FEE_USD
    );
  }

  function archiveEligibleForReview(reference) {
    return reference.sealed && reference.archive_status !== "missing";
  }

  function proofEligibleForShellOpen(proof) {
    return (
      proof.human_verified &&
      proof.ownership_verified &&
      proof.delete_history_verified &&
      proof.recovery_reference_verified
    );
  }

  function getReviewFailures(input) {
    const failures = [];

    if (!paymentConfirmed(input.payment_signal)) {
      failures.push("PAYMENT_CONFIRMATION_REQUIRED");
    }

    if (!archiveEligibleForReview(input.archive_reference)) {
      failures.push("SEALED_ARCHIVE_REFERENCE_REQUIRED");
    }

    if (!input.human_proof.human_verified) {
      failures.push("HUMAN_VERIFICATION_REQUIRED");
    }

    if (!input.human_proof.ownership_verified) {
      failures.push("OWNERSHIP_PROOF_REQUIRED");
    }

    if (!input.human_proof.delete_history_verified) {
      failures.push("DELETE_HISTORY_REQUIRED");
    }

    if (!input.human_proof.recovery_reference_verified) {
      failures.push("RECOVERY_REFERENCE_REQUIRED");
    }

    return failures;
  }

  function classifyMaterial(reference) {
    const classifications = [];

    if (reference.contains_safe_material) {
      classifications.push({
        classification: "RESTORE_READY",
        meaning: "Safe eligible material may be restored into the reopened account shell.",
        handoff: "SAFE_CONTINUITY_RESTORE",
      });
    }

    if (reference.contains_legacy_material) {
      classifications.push({
        classification: "EXPORT_ONLY",
        meaning: "Legacy material should be exported or converted instead of blindly restored.",
        handoff: "TURD_PACKAGE",
      });
    }

    if (reference.contains_corrupted_material) {
      classifications.push({
        classification: "TURD_PACKAGE",
        meaning: "Corrupted material should be packaged separately and not woken inside the live account.",
        handoff: "TURD_PACKAGE",
      });
    }

    if (reference.contains_unsafe_material) {
      classifications.push({
        classification: "UNSAFE_HOLD",
        meaning: "Unsafe material must remain held until separate safety review.",
        handoff: "DO_NOT_RESTORE",
      });
    }

    if (!classifications.length) {
      classifications.push({
        classification: "NO_MATERIAL_FOUND",
        meaning: "Archive reference exists, but no eligible material was found in this review snapshot.",
        handoff: "NO_RESTORE",
      });
    }

    return classifications;
  }

  function buildRecoveryHandoff(input, failures, materialClassifications) {
    if (failures.length) {
      return null;
    }

    const handoff = {
      handoff_id: makeId("recoveryHandoff"),
      fired_at: now(),
      payment_id: input.payment_signal.payment_id,
      archive_reference_id: input.archive_reference.archive_reference_id,
      delete_request_id: input.archive_reference.delete_request_id,
      status: "recovery_handoff_triggered",
      account_shell: {
        eligible: input.archive_reference.contains_account_shell,
        action: input.archive_reference.contains_account_shell
          ? "REOPEN_ACCOUNT_SHELL_AS_WAS"
          : "NO_ACCOUNT_SHELL_FOUND",
      },
      safe_continuity: {
        eligible: input.archive_reference.contains_safe_material,
        action: input.archive_reference.contains_safe_material
          ? "RESTORE_SAFE_ACCOUNT_CONTINUITY"
          : "NO_SAFE_CONTINUITY_FOUND",
      },
      material_classifications: clone(materialClassifications),
      turd_package: buildTurdPackagePlan(input, materialClassifications),
      biff_watch: buildBiffWatch(input, materialClassifications),
    };

    return handoff;
  }

  function buildTurdPackagePlan(input, materialClassifications) {
    const needsTurd = materialClassifications.some((item) => {
      return item.handoff === "TURD_PACKAGE";
    });

    if (!needsTurd || !input.turd_package_allowed) {
      return {
        required: false,
        status: input.turd_package_allowed ? "not_required" : "not_allowed",
      };
    }

    return {
      required: true,
      package_id: makeId("turdRecoveryPackage"),
      status: "prepare_export_package",
      archive_reference_id: input.archive_reference.archive_reference_id,
      delivery_target: "verified_owner_or_payee",
      package_type: "sealed_zip_export",
      rule: "Do not contaminate the active account with dirty archive material.",
    };
  }

  function buildBiffWatch(input, materialClassifications) {
    if (!input.biff_watch_requested) {
      return {
        enabled: false,
        status: "not_requested",
      };
    }

    return {
      enabled: true,
      watch_id: makeId("biffRecoveryWatch"),
      status: "watch_recovery_lane",
      questions: [
        "Is this really theirs?",
        "Is this safe to restore?",
        "Is this export-only?",
        "Is this corrupted?",
        "What is the point of waking this material up?",
      ],
      flags: materialClassifications.map((item) => item.classification),
    };
  }

  function openRecoveryReview(input = {}) {
    const normalized = normalizeRecoveryInput(input);
    const failures = getReviewFailures(normalized);
    const materialClassifications = classifyMaterial(normalized.archive_reference);

    const review = {
      recovery_review_id: makeId("archiveRecoveryReview"),
      created_at: now(),
      uidl: normalized.uidl,
      uidl_hint: maskUidl(normalized.uidl),
      requested_by: normalized.requested_by,
      recovery_reason: normalized.recovery_reason,
      status: failures.length ? "blocked" : "review_opened",
      failures,
      review_fee: {
        amount: REVIEW_FEE_USD,
        currency: "USD",
        payment_id: normalized.payment_signal.payment_id,
        payment_confirmed: paymentConfirmed(normalized.payment_signal),
        meaning: "Payment initiates archive recovery review. It does not guarantee restoration.",
      },
      archive_reference: clone(normalized.archive_reference),
      human_proof: clone(normalized.human_proof),
      requested_materials: clone(normalized.requested_materials),
      material_classifications: clone(materialClassifications),
      recovery_handoff: buildRecoveryHandoff(normalized, failures, materialClassifications),
      safe_summary: buildSafeSummary(normalized, failures, materialClassifications),
      metadata: clone(normalized.metadata),
    };

    recoveryReviews.push(clone(review));

    return clone(review);
  }

  function buildSafeSummary(input, failures, materialClassifications) {
    if (failures.length) {
      return {
        headline: "Recovery review blocked",
        body: "Archive recovery review cannot open until payment, human proof, ownership proof, delete history, and archive reference pass.",
        safe_tags: ["blocked", "review_not_opened"],
      };
    }

    const flags = materialClassifications.map((item) => item.classification);

    return {
      headline: "Recovery review opened",
      body: "Payment triggered archive recovery review. Eligible account continuity may reopen while dirty archive material is separated.",
      safe_tags: ["review_opened", "recovery_handoff_triggered"].concat(flags),
    };
  }

  function approveShellReopen(recoveryReviewId, input = {}) {
    const review = recoveryReviews.find((item) => item.recovery_review_id === recoveryReviewId);

    if (!review) {
      throw new Error("RECOVERY_REVIEW_NOT_FOUND");
    }

    if (review.status !== "review_opened") {
      throw new Error("RECOVERY_REVIEW_NOT_OPEN");
    }

    const cleanInput = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const finalHumanAck = normalizeBoolean(cleanInput.final_human_acknowledged);
    const reviewerApproved = normalizeBoolean(cleanInput.reviewer_approved);

    if (!finalHumanAck) {
      throw new Error("FINAL_HUMAN_ACK_REQUIRED");
    }

    if (!reviewerApproved) {
      throw new Error("REVIEWER_APPROVAL_REQUIRED");
    }

    const shellEligible = Boolean(
      review.recovery_handoff &&
        review.recovery_handoff.account_shell &&
        review.recovery_handoff.account_shell.eligible
    );

    if (!shellEligible) {
      throw new Error("ACCOUNT_SHELL_NOT_ELIGIBLE");
    }

    review.status = "account_shell_reopened";
    review.updated_at = now();
    review.shell_reopen = {
      reopened_at: now(),
      status: "account_shell_reopened_as_was",
      safe_continuity_restored: Boolean(
        review.recovery_handoff &&
          review.recovery_handoff.safe_continuity &&
          review.recovery_handoff.safe_continuity.eligible
      ),
      biff_watch_enabled: Boolean(
        review.recovery_handoff &&
          review.recovery_handoff.biff_watch &&
          review.recovery_handoff.biff_watch.enabled
      ),
    };

    return clone(review.shell_reopen);
  }

  function prepareTurdPackage(recoveryReviewId) {
    const review = recoveryReviews.find((item) => item.recovery_review_id === recoveryReviewId);

    if (!review) {
      throw new Error("RECOVERY_REVIEW_NOT_FOUND");
    }

    if (!review.recovery_handoff || !review.recovery_handoff.turd_package) {
      throw new Error("TURD_PACKAGE_PLAN_NOT_FOUND");
    }

    if (!review.recovery_handoff.turd_package.required) {
      throw new Error("TURD_PACKAGE_NOT_REQUIRED");
    }

    review.turd_package_status = {
      prepared_at: now(),
      status: "sealed_export_package_ready",
      package_id: review.recovery_handoff.turd_package.package_id,
      archive_reference_id: review.archive_reference.archive_reference_id,
      delivery_target: "verified_owner_or_payee",
      package_type: "sealed_zip_export",
    };

    review.updated_at = now();

    return clone(review.turd_package_status);
  }

  function rejectRecoveryReview(recoveryReviewId, reason = "RECOVERY_REVIEW_REJECTED") {
    const review = recoveryReviews.find((item) => item.recovery_review_id === recoveryReviewId);

    if (!review) {
      throw new Error("RECOVERY_REVIEW_NOT_FOUND");
    }

    if (review.status === "account_shell_reopened") {
      throw new Error("RECOVERY_ALREADY_REOPENED");
    }

    review.status = "rejected";
    review.rejected_at = now();
    review.rejection_reason = normalizeText(reason) || "RECOVERY_REVIEW_REJECTED";

    return clone(review);
  }

  function buildDisplayState(recoveryReviewId) {
    const review = recoveryReviews.find((item) => item.recovery_review_id === recoveryReviewId);

    if (!review) {
      throw new Error("RECOVERY_REVIEW_NOT_FOUND");
    }

    if (review.status === "blocked") {
      return {
        display_state: "blocked",
        headline: "Recovery review blocked",
        body: "Payment, proof, delete history, ownership, and sealed archive reference must pass first.",
        failures: clone(review.failures),
      };
    }

    if (review.status === "review_opened") {
      return {
        display_state: "review_opened",
        headline: "Recovery review opened",
        body: "Recovery handoff triggered. Account shell and archive material are being checked.",
        material_classifications: clone(review.material_classifications),
        biff_watch_enabled: Boolean(
          review.recovery_handoff &&
            review.recovery_handoff.biff_watch &&
            review.recovery_handoff.biff_watch.enabled
        ),
      };
    }

    if (review.status === "account_shell_reopened") {
      return {
        display_state: "account_shell_reopened",
        headline: "Account shell reopened",
        body: "Safe account continuity reopened. Dirty archive material remains separated.",
        shell_reopen: clone(review.shell_reopen),
        turd_package_status: clone(review.turd_package_status || null),
      };
    }

    if (review.status === "rejected") {
      return {
        display_state: "rejected",
        headline: "Recovery review rejected",
        body: review.rejection_reason || "Recovery review was rejected.",
      };
    }

    return {
      display_state: "unknown",
      headline: "Recovery state unknown",
      body: "Recovery review exists but does not match a known display state.",
    };
  }

  function listRecoveryReviews(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const status = normalizeText(cleanFilter.status);

    return recoveryReviews
      .filter((review) => {
        if (uidl && review.uidl !== uidl) {
          return false;
        }

        if (status && review.status !== status) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestRecoveryReview() {
    if (!recoveryReviews.length) {
      return null;
    }

    return clone(recoveryReviews[recoveryReviews.length - 1]);
  }

  function clearRecoveryReviews() {
    recoveryReviews.length = 0;
    return true;
  }

  return {
    openRecoveryReview,
    approveShellReopen,
    prepareTurdPackage,
    rejectRecoveryReview,
    buildDisplayState,
    listRecoveryReviews,
    latestRecoveryReview,
    clearRecoveryReviews,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountArchiveRecoveryReviewGate;
}
