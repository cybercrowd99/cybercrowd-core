/*
  CyberCrowd Core — Forward Trigger Organ Controller

  Owns:
  - coordinating the forward-trigger organ stack
  - running value lane detection
  - checking prior allowance before Biff
  - opening Biff only when allowed
  - routing user decisions
  - recording TOFU only after YES or PRIVATE

  Does NOT:
  - create value lanes directly
  - publish anything
  - sell data
  - decide identity
  - trigger Octopus movement
  - bypass the user
  - store credentials
  - scrape providers
  - replace Dewey, CSI&G, CyberJobs, Biff, allowance checker, router, or TOFU

  Doctrine:
  Repeated evidence
      ↓
  Value lane detector
      ↓
  Allowance checker
      ↓
  Biff only if needed
      ↓
  User chooses YES / NO / PRIVATE
      ↓
  Decision router
      ↓
  TOFU ledger for YES / PRIVATE
*/

const CyberCrowdForwardTriggerOrganController = (() => {
  let deps = {
    valueLaneDetector: null,
    allowanceChecker: null,
    biffGate: null,
    decisionRouter: null,
    tofuLedger: null,
  };

  let cycleRecords = new Map();

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function requireText(value, errorCode) {
    if (!value || typeof value !== "string" || !value.trim()) {
      throw new Error(errorCode);
    }

    return value.trim();
  }

  function configure(inputDeps = {}) {
    deps = {
      valueLaneDetector:
        inputDeps.valueLaneDetector ||
        deps.valueLaneDetector ||
        globalLookup("CyberCrowdValueLaneDetector"),
      allowanceChecker:
        inputDeps.allowanceChecker ||
        deps.allowanceChecker ||
        globalLookup("CyberCrowdValueLaneAllowanceChecker"),
      biffGate:
        inputDeps.biffGate ||
        deps.biffGate ||
        globalLookup("CyberCrowdBiffForwardTriggerGate"),
      decisionRouter:
        inputDeps.decisionRouter ||
        deps.decisionRouter ||
        globalLookup("CyberCrowdValueLaneDecisionRouter"),
      tofuLedger:
        inputDeps.tofuLedger ||
        deps.tofuLedger ||
        globalLookup("CyberCrowdTOFUUnitLedger"),
    };

    return {
      status: "configured",
      configured_at: now(),
      dependencies: dependencyStatus(),
    };
  }

  function globalLookup(name) {
    if (typeof window !== "undefined" && window[name]) {
      return window[name];
    }

    if (typeof globalThis !== "undefined" && globalThis[name]) {
      return globalThis[name];
    }

    return null;
  }

  function dependencyStatus() {
    return {
      value_lane_detector: Boolean(deps.valueLaneDetector),
      allowance_checker: Boolean(deps.allowanceChecker),
      biff_gate: Boolean(deps.biffGate),
      decision_router: Boolean(deps.decisionRouter),
      tofu_ledger: Boolean(deps.tofuLedger),
    };
  }

  function requireDependency(name, method) {
    const dependency = deps[name];

    if (!dependency || typeof dependency[method] !== "function") {
      throw new Error(`MISSING_DEPENDENCY_${name}_${method}`);
    }

    return dependency;
  }

  function startCycle(uidl, evidenceInputs = [], options = {}) {
    configure(options.dependencies || {});

    const cleanUIDL = requireText(uidl, "UIDL_REQUIRED");

    if (!Array.isArray(evidenceInputs)) {
      throw new Error("EVIDENCE_INPUTS_REQUIRED");
    }

    const detector = requireDependency("valueLaneDetector", "detect");
    const allowanceChecker = requireDependency("allowanceChecker", "checkProposal");
    const biffGate = requireDependency("biffGate", "openGate");

    const cycleId = makeId("forwardTriggerCycle");

    const detection = detector.detect(cleanUIDL, evidenceInputs, {
      minEvidenceCount: options.minEvidenceCount,
      existingLanes: options.existingLanes || [],
    });

    const steps = [];

    for (const result of detection.results || []) {
      const proposal = result.proposal;

      if (!proposal || !proposal.proposal_created) {
        steps.push({
          subject: result.bucket ? result.bucket.subject : "unknown",
          status: "no_missing_value_lane",
          reason:
            proposal && proposal.reason
              ? proposal.reason
              : "No proposal was created.",
          opened_biff: false,
        });
        continue;
      }

      const allowanceCheck = allowanceChecker.checkProposal(
        proposal,
        options.allowanceOptions || {}
      );

      if (!allowanceCheck.should_open_biff) {
        steps.push({
          subject: proposal.subject,
          proposed_lane: proposal.proposed_lane,
          status: "no_interrupt",
          opened_biff: false,
          reason: allowanceCheck.reason,
          allowance_status: allowanceCheck.status,
          route_hint: allowanceCheck.route_hint || null,
        });
        continue;
      }

      const gate = biffGate.openGate(proposal, allowanceCheck);

      const choiceCard =
        typeof biffGate.makeChoiceCard === "function"
          ? biffGate.makeChoiceCard(gate.gate_id)
          : null;

      steps.push({
        subject: proposal.subject,
        proposed_lane: proposal.proposed_lane,
        status: "awaiting_user_choice",
        opened_biff: true,
        gate_id: gate.gate_id,
        proposal_id: proposal.proposal_id,
        choice_card: choiceCard,
      });
    }

    const cycle = {
      cycle_id: cycleId,
      uidl: cleanUIDL,
      status: "cycle_started",
      movement_allowed: false,
      publish_allowed: false,
      started_at: now(),
      detection_summary: {
        status: detection.status,
        checked_at: detection.checked_at,
        result_count: Array.isArray(detection.results)
          ? detection.results.length
          : 0,
      },
      steps,
    };

    cycleRecords.set(cycleId, cycle);

    return clone(cycle);
  }

  function recordUserChoice(gateId, choice, note = "", options = {}) {
    configure(options.dependencies || {});

    const biffGate = requireDependency("biffGate", "choose");
    const allowanceChecker = requireDependency(
      "allowanceChecker",
      "recordFromBiffDecision"
    );
    const decisionRouter = requireDependency("decisionRouter", "routeDecision");

    const decision = biffGate.choose(gateId, choice, note);

    const allowanceRecord =
      typeof allowanceChecker.recordFromBiffDecision === "function"
        ? allowanceChecker.recordFromBiffDecision(decision)
        : null;

    const routeRecord = decisionRouter.routeDecision(decision);

    let tofuResult = null;

    if (decision.decision && ["YES", "PRIVATE"].includes(decision.decision.choice)) {
      const tofuLedger = requireDependency("tofuLedger", "recordFromRoute");
      tofuResult = tofuLedger.recordFromRoute(routeRecord);
    }

    return {
      status: "user_choice_processed",
      gate_id: decision.gate_id,
      proposal_id: decision.proposal_id,
      uidl: decision.uidl,
      subject: decision.subject,
      proposed_lane: decision.proposed_lane,
      decision: clone(decision.decision),
      allowance_record: allowanceRecord,
      route_record: routeRecord,
      tofu_result: tofuResult,
      movement_allowed: false,
      publish_allowed: false,
      processed_at: now(),
    };
  }

  function makeStatus(cycleId) {
    const cycle = getCycle(cycleId);

    if (!cycle) {
      throw new Error("CYCLE_NOT_FOUND");
    }

    return {
      status_type: "forward_trigger_cycle_status",
      cycle_id: cycle.cycle_id,
      uidl: cycle.uidl,
      status: cycle.status,
      step_count: cycle.steps.length,
      awaiting_user_choice: cycle.steps.filter((step) => {
        return step.status === "awaiting_user_choice";
      }).length,
      no_interrupt_count: cycle.steps.filter((step) => {
        return step.status === "no_interrupt";
      }).length,
      movement_allowed: false,
      publish_allowed: false,
      created_at: now(),
    };
  }

  function getCycle(cycleId) {
    const cleanCycleId = requireText(cycleId, "CYCLE_ID_REQUIRED");
    const cycle = cycleRecords.get(cleanCycleId);

    return cycle ? clone(cycle) : null;
  }

  function listCycles(uidl = null) {
    const cleanUIDL =
      typeof uidl === "string" && uidl.trim()
        ? uidl.trim().toLowerCase()
        : null;

    return Array.from(cycleRecords.values())
      .filter((cycle) => {
        if (!cleanUIDL) return true;
        return cycle.uidl.toLowerCase() === cleanUIDL;
      })
      .map(clone);
  }

  function reset() {
    cycleRecords = new Map();

    return {
      status: "reset",
      reset_at: now(),
    };
  }

  return {
    configure,
    startCycle,
    recordUserChoice,
    makeStatus,
    getCycle,
    listCycles,
    reset,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdForwardTriggerOrganController;
}

if (typeof window !== "undefined") {
  window.CyberCrowdForwardTriggerOrganController =
    CyberCrowdForwardTriggerOrganController;
}
