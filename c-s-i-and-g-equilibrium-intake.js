// c-s-i-and-g-equilibrium-intake.js
// CyberCrowd — Equilibrium Intake Bridge
//
// Owns:
// - one safe intake point for incoming signals
// - calls the Equilibrium Core first
// - sends unknown / failed / tilted / future pressure to 000
// - preserves the core result trail
// - prevents 000 from becoming authority
//
// Does NOT own:
// - UI
// - Dewey final classification
// - identity creation
// - authority execution by itself
// - payment
// - sessions
// - cookies
// - KV storage
// - external APIs
// - scraping

const CyberCrowdEquilibriumIntake = (() => {
  const state = {
    configured: false,
    intakeLog: [],
    coreResults: [],
    nullHorizonResults: [],
    held: []
  };

  let EquilibriumCore = null;
  let NullHorizon000 = null;

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function safeRequire(path) {
    if (typeof require === "undefined") {
      return null;
    }

    try {
      return require(path);
    } catch (error) {
      return null;
    }
  }

  function configure(deps = {}) {
    EquilibriumCore =
      deps.EquilibriumCore ||
      deps.core ||
      EquilibriumCore ||
      safeRequire("./equilibrium-core.js") ||
      null;

    NullHorizon000 =
      deps.NullHorizon000 ||
      deps.nullHorizon000 ||
      deps.lane000 ||
      NullHorizon000 ||
      safeRequire("./c-s-i-and-g-000-future.js") ||
      null;

    state.configured = Boolean(EquilibriumCore && NullHorizon000);

    return {
      configured: state.configured,
      has_core: Boolean(EquilibriumCore),
      has_000: Boolean(NullHorizon000)
    };
  }

  function hold(target, reason) {
    const record = {
      id: makeId("intakeHold"),
      held_at: now(),
      reason,
      target: clone(target),
      status: "held_by_equilibrium_intake"
    };

    state.held.push(record);
    return record;
  }

  function recordIntake(signal) {
    const intake = {
      id: makeId("intake"),
      received_at: now(),
      signal: clone(signal),
      status: "received_by_equilibrium_intake"
    };

    state.intakeLog.push(intake);
    return intake;
  }

  function readReason(result) {
    if (!result || typeof result !== "object") {
      return "";
    }

    return String(result.reason || result.status || "").toUpperCase();
  }

  function shouldSendTo000(coreResult) {
    const reason = readReason(coreResult);

    if (!reason) {
      return false;
    }

    return (
      reason.includes("UNCLASSIFIED") ||
      reason.includes("FAILED_EQUILIBRIUM") ||
      reason.includes("EQUILIBRIUM_FAILED") ||
      reason.includes("LANE_PRESSURE_IMBALANCE") ||
      reason.includes("NO_LANE_PRESSURE_FOUND") ||
      reason.includes("TILT") ||
      reason.includes("UNKNOWN") ||
      reason.includes("FUTURE") ||
      reason.includes("SCI_FI") ||
      reason.includes("SCI-FI") ||
      reason.includes("000")
    );
  }

  function normalizeFor000(signal, coreResult, intakeRecord) {
    return {
      source: "equilibrium_intake_bridge",
      intake_id: intakeRecord.id,
      received_at: intakeRecord.received_at,
      signal: clone(signal),
      core_result: clone(coreResult),
      reason: readReason(coreResult) || "FORWARDED_TO_000",
      authority_allowed: false
    };
  }

  function sendTo000(signal, coreResult, intakeRecord) {
    if (!NullHorizon000 || typeof NullHorizon000.accept !== "function") {
      return hold(
        {
          signal,
          coreResult,
          intakeRecord
        },
        "000_LANE_NOT_AVAILABLE"
      );
    }

    const payload = normalizeFor000(signal, coreResult, intakeRecord);
    const result = NullHorizon000.accept(payload);

    const record = {
      id: makeId("000Bridge"),
      bridged_at: now(),
      intake_id: intakeRecord.id,
      payload,
      result: clone(result),
      authority_allowed: false,
      status: "sent_to_000"
    };

    state.nullHorizonResults.push(record);
    return record;
  }

  function runCore(signal) {
    if (!EquilibriumCore || typeof EquilibriumCore.onSignal !== "function") {
      return {
        status: "core_unavailable",
        reason: "EQUILIBRIUM_CORE_NOT_AVAILABLE",
        authority_allowed: false
      };
    }

    return EquilibriumCore.onSignal(signal);
  }

  function onSignal(signal) {
    configure();

    const intakeRecord = recordIntake(signal);

    if (!EquilibriumCore) {
      return hold(
        {
          intakeRecord,
          signal
        },
        "EQUILIBRIUM_CORE_NOT_AVAILABLE"
      );
    }

    const coreResult = runCore(signal);

    const coreRecord = {
      id: makeId("coreResult"),
      received_at: now(),
      intake_id: intakeRecord.id,
      result: clone(coreResult),
      status: "core_result_recorded"
    };

    state.coreResults.push(coreRecord);

    if (shouldSendTo000(coreResult)) {
      return sendTo000(signal, coreResult, intakeRecord);
    }

    return {
      id: makeId("intakeResult"),
      completed_at: now(),
      intake_id: intakeRecord.id,
      core_result: clone(coreResult),
      sent_to_000: false,
      authority_allowed:
        coreResult &&
        typeof coreResult === "object" &&
        coreResult.status === "authority_ready",
      status: "intake_complete"
    };
  }

  function getState() {
    return clone(state);
  }

  return {
    configure,
    onSignal,
    runCore,
    shouldSendTo000,
    sendTo000,
    hold,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdEquilibriumIntake;
}
