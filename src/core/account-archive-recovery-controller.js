// src/core/account-archive-recovery-controller.js
// CyberCrowd Core — Account Archive Recovery Controller
// Owns: coordinating paid archive recovery review, status recording, NET summary handoff,
// shell reopen approval, TURD package preparation, and Biff watch attachment.
// Rule: Controller coordinates recovery. Gate decides eligibility. Ledger records status.
// NET only receives safe status. TURD handles dirty archive. Biff watches the lane.
// Does not: run payments, guarantee recovery, approve recovery by itself,
// reopen accounts by itself, restore files by itself, open unsafe archives,
// expose private archive contents, store payment secrets, or deal directly with the customer.

const AccountArchiveRecoveryController = (() => {
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

  function normalizeList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  function normalizeControllerInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    return {
      recovery_input: requireObject(cleanInput.recovery_input, "RECOVERY_INPUT_REQUIRED"),
      shell_reopen_input: normalizeShellReopenInput(cleanInput.shell_reopen_input),
      prepare_turd_package: cleanInput.prepare_turd_package !== false,
      forward_to_net: cleanInput.forward_to_net !== false,
      notes: normalizeText(cleanInput.notes),
    };
  }

  function normalizeShellReopenInput(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {
        final_human_acknowledged: false,
        reviewer_approved: false,
      };
    }

    return {
      final_human_acknowledged: normalizeBoolean(input.final_human_acknowledged),
      reviewer_approved: normalizeBoolean(input.reviewer_approved),
    };
  }

  function normalizeDependencies(dependencies = {}) {
    const cleanDependencies = requireObject(dependencies, "DEPENDENCIES_REQUIRED");

    return {
      recovery_gate: requireObject(cleanDependencies.recovery_gate, "RECOVERY_GATE_REQUIRED"),
      status_ledger: requireObject(cleanDependencies.status_ledger, "STATUS_LEDGER_REQUIRED"),
      net_receiver: cleanDependencies.net_receiver || null,
    };
  }

  function assertRecoveryGate(gate) {
    requireFunction(gate.openRecoveryReview, "RECOVERY_GATE_OPEN_REQUIRED");
    requireFunction(gate.approveShellReopen, "RECOVERY_GATE_APPROVE_SHELL_REQUIRED");
    requireFunction(gate.prepareTurdPackage, "RECOVERY_GATE_TURD_PACKAGE_REQUIRED");
    requireFunction(gate.buildDisplayState, "RECOVERY_GATE_DISPLAY_REQUIRED");
  }

  function assertStatusLedger(ledger) {
    requireFunction(ledger.recordRecoveryStatus, "STATUS_LEDGER_RECORD_REQUIRED");
    requireFunction(ledger.latestNetSummary, "STATUS_LEDGER_NET_SUMMARY_REQUIRED");
  }

  function assertNetReceiver(receiver) {
    if (!receiver) {
      return;
    }

    requireFunction(receiver.receiveStatus, "NET_RECEIVER_RECEIVE_REQUIRED");
  }

  function runRecoveryCycle(input = {}, dependencies = {}) {
    const normalizedInput = normalizeControllerInput(input);
    const normalizedDependencies = normalizeDependencies(dependencies);

    assertRecoveryGate(normalizedDependencies.recovery_gate);
    assertStatusLedger(normalizedDependencies.status_ledger);
    assertNetReceiver(normalizedDependencies.net_receiver);

    const cycle = {
      cycle_id: makeId("archiveRecoveryCycle"),
      started_at: now(),
      status: "started",
      steps: [],
      notes: normalizedInput.notes,
    };

    try {
      const review = runStep(cycle, "OPEN_RECOVERY_REVIEW", () => {
        return normalizedDependencies.recovery_gate.openRecoveryReview(
          normalizedInput.recovery_input
        );
      });

      const firstLedgerEntry = runStep(cycle, "RECORD_REVIEW_STATUS", () => {
        return normalizedDependencies.status_ledger.recordRecoveryStatus(review);
      });

      const firstNetSummary = runStep(cycle, "PREPARE_NET_SUMMARY", () => {
        return normalizedDependencies.status_ledger.latestNetSummary();
      });

      if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && firstNetSummary) {
        runStep(cycle, "FORWARD_NET_SUMMARY", () => {
          return normalizedDependencies.net_receiver.receiveStatus(firstNetSummary);
        });
      }

      let shellReopen = null;
      let shellLedgerEntry = null;
      let shellNetSummary = null;

      if (review.status === "review_opened" && shouldAttemptShellReopen(normalizedInput)) {
        shellReopen = runStep(cycle, "APPROVE_SHELL_REOPEN", () => {
          return normalizedDependencies.recovery_gate.approveShellReopen(
            review.recovery_review_id,
            normalizedInput.shell_reopen_input
          );
        });

        const refreshedReviewAfterShell = runStep(cycle, "READ_DISPLAY_AFTER_SHELL_REOPEN", () => {
          return buildReviewSnapshotFromDisplay(
            review,
            normalizedDependencies.recovery_gate.buildDisplayState(review.recovery_review_id),
            shellReopen
          );
        });

        shellLedgerEntry = runStep(cycle, "RECORD_SHELL_REOPEN_STATUS", () => {
          return normalizedDependencies.status_ledger.recordRecoveryStatus(refreshedReviewAfterShell);
        });

        shellNetSummary = runStep(cycle, "PREPARE_SHELL_NET_SUMMARY", () => {
          return normalizedDependencies.status_ledger.latestNetSummary();
        });

        if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && shellNetSummary) {
          runStep(cycle, "FORWARD_SHELL_NET_SUMMARY", () => {
            return normalizedDependencies.net_receiver.receiveStatus(shellNetSummary);
          });
        }
      }

      let turdPackage = null;
      let turdLedgerEntry = null;
      let turdNetSummary = null;

      if (review.status === "review_opened" && normalizedInput.prepare_turd_package) {
        const turdNeeded = review.recovery_handoff
          && review.recovery_handoff.turd_package
          && review.recovery_handoff.turd_package.required;

        if (turdNeeded) {
          turdPackage = runStep(cycle, "PREPARE_TURD_PACKAGE", () => {
            return normalizedDependencies.recovery_gate.prepareTurdPackage(
              review.recovery_review_id
            );
          });

          const refreshedReviewAfterTurd = runStep(cycle, "READ_DISPLAY_AFTER_TURD_PACKAGE", () => {
            return buildReviewSnapshotFromDisplay(
              review,
              normalizedDependencies.recovery_gate.buildDisplayState(review.recovery_review_id),
              shellReopen,
              turdPackage
            );
          });

          turdLedgerEntry = runStep(cycle, "RECORD_TURD_PACKAGE_STATUS", () => {
            return normalizedDependencies.status_ledger.recordRecoveryStatus(refreshedReviewAfterTurd);
          });

          turdNetSummary = runStep(cycle, "PREPARE_TURD_NET_SUMMARY", () => {
            return normalizedDependencies.status_ledger.latestNetSummary();
          });

          if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && turdNetSummary) {
            runStep(cycle, "FORWARD_TURD_NET_SUMMARY", () => {
              return normalizedDependencies.net_receiver.receiveStatus(turdNetSummary);
            });
          }
        } else {
          cycle.steps.push({
            step_id: makeId("archiveRecoveryStep"),
            step: "SKIP_TURD_PACKAGE",
            status: "skipped",
            reason: "TURD_PACKAGE_NOT_REQUIRED",
            at: now(),
          });
        }
      }

      cycle.status = "completed";
      cycle.completed_at = now();
      cycle.review = clone(review);
      cycle.first_ledger_entry = clone(firstLedgerEntry);
      cycle.first_net_summary = clone(firstNetSummary);
      cycle.shell_reopen = clone(shellReopen);
      cycle.shell_ledger_entry = clone(shellLedgerEntry);
      cycle.shell_net_summary = clone(shellNetSummary);
      cycle.turd_package = clone(turdPackage);
      cycle.turd_ledger_entry = clone(turdLedgerEntry);
      cycle.turd_net_summary = clone(turdNetSummary);
      cycle.biff_watch = extractBiffWatch(review);

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

  function shouldAttemptShellReopen(input) {
    return (
      input.shell_reopen_input.final_human_acknowledged &&
      input.shell_reopen_input.reviewer_approved
    );
  }

  function runStep(cycle, stepName, callback) {
    const step = {
      step_id: makeId("archiveRecoveryStep"),
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
      recovery_review_id: normalizeText(result.recovery_review_id),
      entry_id: normalizeText(result.entry_id),
      status: normalizeText(result.status),
      ledger_state: normalizeText(result.ledger_state),
      display_state: normalizeText(result.display_state),
      headline: result.display_summary && result.display_summary.headline
        ? normalizeText(result.display_summary.headline)
        : normalizeText(result.headline),
      handoff_id: result.recovery_handoff
        ? normalizeText(result.recovery_handoff.handoff_id)
        : normalizeText(result.handoff_id),
      package_id: normalizeText(result.package_id),
    };
  }

  function buildReviewSnapshotFromDisplay(baseReview, displayState, shellReopen = null, turdPackage = null) {
    const snapshot = clone(baseReview);

    if (displayState && displayState.display_state === "account_shell_reopened") {
      snapshot.status = "account_shell_reopened";
      snapshot.shell_reopen = shellReopen || displayState.shell_reopen || null;
      snapshot.turd_package_status = turdPackage || displayState.turd_package_status || null;
      return snapshot;
    }

    if (shellReopen) {
      snapshot.status = "account_shell_reopened";
      snapshot.shell_reopen = shellReopen;
    }

    if (turdPackage) {
      snapshot.turd_package_status = turdPackage;
    }

    return snapshot;
  }

  function extractBiffWatch(review) {
    if (
      !review ||
      !review.recovery_handoff ||
      !review.recovery_handoff.biff_watch
    ) {
      return {
        enabled: false,
        status: "not_attached",
        flags: [],
      };
    }

    return {
      enabled: Boolean(review.recovery_handoff.biff_watch.enabled),
      watch_id: normalizeText(review.recovery_handoff.biff_watch.watch_id),
      status: normalizeText(review.recovery_handoff.biff_watch.status),
      flags: normalizeList(review.recovery_handoff.biff_watch.flags),
      questions: normalizeList(review.recovery_handoff.biff_watch.questions),
    };
  }

  function listCycles(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const status = normalizeText(cleanFilter.status);
    const recoveryReviewId = normalizeText(cleanFilter.recovery_review_id);

    return cycles
      .filter((cycle) => {
        if (status && cycle.status !== status) {
          return false;
        }

        if (recoveryReviewId) {
          const reviewId = cycle.review && cycle.review.recovery_review_id
            ? cycle.review.recovery_review_id
            : "";

          if (reviewId !== recoveryReviewId) {
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
    runRecoveryCycle,
    listCycles,
    latestCycle,
    clearCycles,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountArchiveRecoveryController;
}
