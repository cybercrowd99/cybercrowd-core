/*
  CyberCrowd Core — Forward Trigger Organ Status Ledger

  Owns:
  - recording forward-trigger organ cycle status
  - recording Biff choice outcomes
  - recording TOFU preservation results
  - creating printable paper-ladder rows

  Does NOT:
  - run the forward-trigger organ
  - create value lanes directly
  - publish anything
  - sell data
  - decide identity
  - trigger Octopus movement
  - bypass the user
  - store credentials
  - scrape providers
  - own Dewey, Biff, TOFU, CyberJobs, CSI&G, or Octopus

  Doctrine:
  The controller runs.
  The ledger records.
  The paper ladder proves what happened.
*/

const CyberCrowdForwardTriggerOrganStatusLedger = (() => {
  let statusRecords = new Map();

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

  function normalizeText(value) {
    if (typeof value !== "string") return "";

    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  function recordCycle(cyclePacket = {}) {
    if (!cyclePacket || typeof cyclePacket !== "object") {
      throw new Error("CYCLE_PACKET_REQUIRED");
    }

    const recordId = makeId("forwardTriggerStatus");

    const steps = Array.isArray(cyclePacket.steps) ? cyclePacket.steps : [];

    const record = {
      record_id: recordId,
      record_type: "forward_trigger_cycle",
      cycle_id: requireText(cyclePacket.cycle_id, "CYCLE_ID_REQUIRED"),
      uidl: requireText(cyclePacket.uidl, "UIDL_REQUIRED"),
      status: cyclePacket.status || "cycle_recorded",
      movement_allowed: false,
      publish_allowed: false,
      started_at: cyclePacket.started_at || null,
      recorded_at: now(),
      detection_summary: cyclePacket.detection_summary || null,
      counts: {
        steps: steps.length,
        awaiting_user_choice: steps.filter((step) => {
          return step.status === "awaiting_user_choice";
        }).length,
        no_interrupt: steps.filter((step) => {
          return step.status === "no_interrupt";
        }).length,
        no_missing_value_lane: steps.filter((step) => {
          return step.status === "no_missing_value_lane";
        }).length,
      },
      steps: steps.map(makeStepSnapshot),
    };

    statusRecords.set(recordId, record);

    return clone(record);
  }

  function recordChoice(choicePacket = {}) {
    if (!choicePacket || typeof choicePacket !== "object") {
      throw new Error("CHOICE_PACKET_REQUIRED");
    }

    const decision =
      choicePacket.decision && typeof choicePacket.decision === "object"
        ? choicePacket.decision
        : {};

    const recordId = makeId("forwardTriggerChoiceStatus");

    const record = {
      record_id: recordId,
      record_type: "forward_trigger_user_choice",
      gate_id: requireText(choicePacket.gate_id, "GATE_ID_REQUIRED"),
      proposal_id: requireText(
        choicePacket.proposal_id,
        "PROPOSAL_ID_REQUIRED"
      ),
      uidl: requireText(choicePacket.uidl, "UIDL_REQUIRED"),
      subject: requireText(choicePacket.subject, "SUBJECT_REQUIRED"),
      proposed_lane: requireText(
        choicePacket.proposed_lane,
        "PROPOSED_LANE_REQUIRED"
      ),
      user_choice: requireText(decision.choice, "USER_CHOICE_REQUIRED"),
      user_note: typeof decision.note === "string" ? decision.note.trim() : "",
      decision_at: decision.decided_at || null,
      movement_allowed: false,
      publish_allowed: false,
      recorded_at: now(),
      route_record: choicePacket.route_record
        ? makeRouteSnapshot(choicePacket.route_record)
        : null,
      tofu_result: choicePacket.tofu_result
        ? makeTOFUSnapshot(choicePacket.tofu_result)
        : null,
      allowance_record: choicePacket.allowance_record
        ? makeAllowanceSnapshot(choicePacket.allowance_record)
        : null,
    };

    statusRecords.set(recordId, record);

    return clone(record);
  }

  function makeStepSnapshot(step = {}) {
    return {
      subject: step.subject || "unknown",
      proposed_lane: step.proposed_lane || null,
      status: step.status || "unknown",
      opened_biff: Boolean(step.opened_biff),
      gate_id: step.gate_id || null,
      proposal_id: step.proposal_id || null,
      reason: step.reason || null,
      allowance_status: step.allowance_status || null,
      route_hint: step.route_hint || null,
    };
  }

  function makeRouteSnapshot(route = {}) {
    return {
      route_id: route.route_id || null,
      user_choice: route.user_choice || null,
      proposed_lane: route.proposed_lane || null,
      route_plan: route.route_plan || null,
      movement_allowed: false,
      publish_allowed: false,
      lane_created: false,
      created_at: route.created_at || null,
    };
  }

  function makeTOFUSnapshot(tofuResult = {}) {
    const unit =
      tofuResult.tofu_unit && typeof tofuResult.tofu_unit === "object"
        ? tofuResult.tofu_unit
        : {};

    return {
      status: tofuResult.status || null,
      duplicated: Boolean(tofuResult.duplicated),
      reason: tofuResult.reason || null,
      tofu_id: unit.tofu_id || null,
      lane: unit.lane || null,
      surface: unit.surface || null,
      future_value_state: unit.future_value_state || null,
      movement_allowed: false,
      publish_allowed: false,
    };
  }

  function makeAllowanceSnapshot(allowance = {}) {
    return {
      allowance_id: allowance.allowance_id || null,
      uidl: allowance.uidl || null,
      lane: allowance.lane || null,
      status: allowance.status || null,
      original_choice: allowance.original_choice || null,
      source: allowance.source || null,
      proposal_id: allowance.proposal_id || null,
      updated_at: allowance.updated_at || null,
    };
  }

  function makePaperLadderRow(recordId) {
    const record = getRecord(recordId);

    if (!record) {
      throw new Error("STATUS_RECORD_NOT_FOUND");
    }

    if (record.record_type === "forward_trigger_cycle") {
      return {
        row_type: "paper_ladder_forward_trigger_cycle",
        record_id: record.record_id,
        cycle_id: record.cycle_id,
        uidl: record.uidl,
        organ: "forward_trigger",
        status: record.status,
        summary:
          `${record.counts.steps} step(s), ` +
          `${record.counts.awaiting_user_choice} awaiting choice, ` +
          `${record.counts.no_interrupt} no-interrupt`,
        movement_allowed: false,
        publish_allowed: false,
        recorded_at: record.recorded_at,
      };
    }

    if (record.record_type === "forward_trigger_user_choice") {
      return {
        row_type: "paper_ladder_forward_trigger_choice",
        record_id: record.record_id,
        gate_id: record.gate_id,
        proposal_id: record.proposal_id,
        uidl: record.uidl,
        organ: "forward_trigger",
        subject: record.subject,
        proposed_lane: record.proposed_lane,
        user_choice: record.user_choice,
        tofu_status: record.tofu_result ? record.tofu_result.status : "none",
        movement_allowed: false,
        publish_allowed: false,
        recorded_at: record.recorded_at,
      };
    }

    return {
      row_type: "paper_ladder_forward_trigger_unknown",
      record_id: record.record_id,
      organ: "forward_trigger",
      status: record.status || "unknown",
      movement_allowed: false,
      publish_allowed: false,
      recorded_at: record.recorded_at,
    };
  }

  function makePaperLadder(uidl = null) {
    return listRecords(uidl).map((record) => {
      return makePaperLadderRow(record.record_id);
    });
  }

  function getRecord(recordId) {
    const cleanRecordId = requireText(recordId, "RECORD_ID_REQUIRED");
    const record = statusRecords.get(cleanRecordId);

    return record ? clone(record) : null;
  }

  function listRecords(uidl = null) {
    const cleanUIDL =
      typeof uidl === "string" && uidl.trim()
        ? normalizeText(uidl)
        : null;

    return Array.from(statusRecords.values())
      .filter((record) => {
        if (!cleanUIDL) return true;
        return normalizeText(record.uidl) === cleanUIDL;
      })
      .map(clone);
  }

  function reset() {
    statusRecords = new Map();

    return {
      status: "reset",
      reset_at: now(),
    };
  }

  return {
    recordCycle,
    recordChoice,
    makePaperLadderRow,
    makePaperLadder,
    getRecord,
    listRecords,
    reset,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdForwardTriggerOrganStatusLedger;
}

if (typeof window !== "undefined") {
  window.CyberCrowdForwardTriggerOrganStatusLedger =
    CyberCrowdForwardTriggerOrganStatusLedger;
}
