/*
  CyberCrowd Core — Biff Forward Trigger Gate

  Owns:
  - receiving allowed-to-interrupt forward-trigger proposals
  - forcing every proposal to answer "What's the point?"
  - preparing a simple YES / NO / PRIVATE choice card
  - holding the trigger until the user decides

  Does NOT:
  - check prior allowance
  - create value lanes
  - publish anything
  - sell data
  - decide identity
  - trigger movement
  - bypass the user
  - store credentials
  - scrape providers
  - own Dewey, CSI&G, CyberJobs, Octopus, TOFU, or the allowance checker

  Required upstream:
  - value-lane-detector finds the missing lane
  - value-lane-allowance-checker confirms Biff is allowed to ask

  Doctrine:
  New missing lane / review-required proposal
      ↓
  Biff asks: "What's the point?"
      ↓
  User chooses:
  YES / NO / PRIVATE
*/

const CyberCrowdBiffForwardTriggerGate = (() => {
  const VALID_CHOICES = ["YES", "NO", "PRIVATE"];

  let gateRecords = new Map();

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

  function normalizeChoice(choice) {
    return requireText(choice, "CHOICE_REQUIRED").toUpperCase();
  }

  function normalizeChoices(choices = [], privateDefault = false) {
    const cleanChoices = Array.isArray(choices)
      ? choices
          .map((choice) => String(choice).toUpperCase())
          .filter((choice) => VALID_CHOICES.includes(choice))
      : [];

    const fallback = privateDefault
      ? ["PRIVATE", "YES", "NO"]
      : ["YES", "NO", "PRIVATE"];

    return cleanChoices.length ? cleanChoices : fallback;
  }

  function requireProposal(proposal = {}) {
    if (!proposal || typeof proposal !== "object") {
      throw new Error("PROPOSAL_REQUIRED");
    }

    if (!proposal.proposal_created) {
      throw new Error("ACTIVE_PROPOSAL_REQUIRED");
    }

    return {
      proposal_id: requireText(proposal.proposal_id, "PROPOSAL_ID_REQUIRED"),
      uidl: requireText(proposal.uidl, "UIDL_REQUIRED"),
      subject: requireText(proposal.subject, "SUBJECT_REQUIRED"),
      proposed_lane: requireText(
        proposal.proposed_lane,
        "PROPOSED_LANE_REQUIRED"
      ),
      evidence_count: Number.isInteger(proposal.evidence_count)
        ? proposal.evidence_count
        : 0,
      reason:
        proposal.reason ||
        "This uIDL has repeated evidence, but no lane holds the value.",
      biff_question: proposal.biff_question || "What's the point?",
      choices: normalizeChoices(proposal.choices, proposal.private_default),
      private_default: Boolean(proposal.private_default),
      tofu_candidate: Boolean(proposal.tofu_candidate),
      evidence_refs: Array.isArray(proposal.evidence_refs)
        ? proposal.evidence_refs
        : [],
    };
  }

  function requireAllowanceCheck(allowanceCheck = {}) {
    if (!allowanceCheck || typeof allowanceCheck !== "object") {
      throw new Error("ALLOWANCE_CHECK_REQUIRED");
    }

    if (allowanceCheck.should_open_biff !== true) {
      throw new Error("BIFF_NOT_ALLOWED_BY_ALLOWANCE_CHECK");
    }

    return {
      status: allowanceCheck.status || "unknown",
      reason:
        allowanceCheck.reason ||
        "Allowance checker allowed Biff to ask the user.",
      review_flags: allowanceCheck.review_flags || null,
      checked_at: allowanceCheck.checked_at || null,
    };
  }

  function openGate(proposal = {}, allowanceCheck = {}) {
    const cleanProposal = requireProposal(proposal);
    const cleanAllowanceCheck = requireAllowanceCheck(allowanceCheck);
    const gateId = makeId("biffForwardGate");

    const record = {
      gate_id: gateId,
      proposal_id: cleanProposal.proposal_id,
      uidl: cleanProposal.uidl,
      subject: cleanProposal.subject,
      proposed_lane: cleanProposal.proposed_lane,
      evidence_count: cleanProposal.evidence_count,
      biff_question: cleanProposal.biff_question,
      point_answer: cleanProposal.reason,
      status: "awaiting_user_choice",
      choices: cleanProposal.private_default
        ? ["PRIVATE", "YES", "NO"]
        : cleanProposal.choices,
      private_default: cleanProposal.private_default,
      tofu_candidate: cleanProposal.tofu_candidate,
      evidence_refs: cleanProposal.evidence_refs,
      allowance_check: cleanAllowanceCheck,
      created_at: now(),
      decided_at: null,
      decision: null,
    };

    gateRecords.set(gateId, record);

    return clone(record);
  }

  function makeChoiceCard(gateId) {
    const record = getGate(gateId);

    if (!record) {
      throw new Error("GATE_NOT_FOUND");
    }

    return {
      card_type: "biff_forward_trigger_choice",
      gate_id: record.gate_id,
      uidl: record.uidl,
      subject: record.subject,
      title: "Possible value lane found",
      signal: "forward_trigger",
      question: record.biff_question,
      answer: record.point_answer,
      proposed_lane: record.proposed_lane,
      evidence_count: record.evidence_count,
      message:
        "Repeated evidence exists, but no lane currently holds this value.",
      choices: record.choices,
      status: record.status,
      private_default: record.private_default,
      tofu_candidate: record.tofu_candidate,
      created_at: now(),
    };
  }

  function choose(gateId, choice, note = "") {
    const cleanGateId = requireText(gateId, "GATE_ID_REQUIRED");
    const cleanChoice = normalizeChoice(choice);

    if (!VALID_CHOICES.includes(cleanChoice)) {
      throw new Error("INVALID_CHOICE");
    }

    const record = gateRecords.get(cleanGateId);

    if (!record) {
      throw new Error("GATE_NOT_FOUND");
    }

    if (record.status !== "awaiting_user_choice") {
      throw new Error("GATE_ALREADY_DECIDED");
    }

    record.status = "user_choice_recorded";
    record.decision = {
      choice: cleanChoice,
      note: typeof note === "string" ? note.trim() : "",
      decided_at: now(),
    };
    record.decided_at = record.decision.decided_at;

    return {
      gate_id: record.gate_id,
      proposal_id: record.proposal_id,
      uidl: record.uidl,
      subject: record.subject,
      proposed_lane: record.proposed_lane,
      status: record.status,
      decision: clone(record.decision),
      route_hint: routeHintForChoice(cleanChoice),
    };
  }

  function routeHintForChoice(choice) {
    if (choice === "YES") {
      return {
        route: "value_lane_decision_router",
        action: "prepare_lane_creation_or_profile_review",
        meaning:
          "User approved this value lane for normal lane creation or profile review.",
      };
    }

    if (choice === "PRIVATE") {
      return {
        route: "value_lane_decision_router",
        action: "prepare_private_lane_or_private_review",
        meaning:
          "User approved holding this value privately before any public surface.",
      };
    }

    return {
      route: "value_lane_decision_router",
      action: "record_rejection_or_no_lane_needed",
      meaning:
        "User rejected this value lane proposal under the current meaning.",
    };
  }

  function getGate(gateId) {
    const cleanGateId = requireText(gateId, "GATE_ID_REQUIRED");
    const record = gateRecords.get(cleanGateId);

    return record ? clone(record) : null;
  }

  function listGates(uidl = null) {
    const cleanUIDL =
      typeof uidl === "string" && uidl.trim()
        ? uidl.trim().toLowerCase()
        : null;

    return Array.from(gateRecords.values())
      .filter((record) => {
        if (!cleanUIDL) return true;
        return record.uidl.toLowerCase() === cleanUIDL;
      })
      .map(clone);
  }

  function reset() {
    gateRecords = new Map();

    return {
      status: "reset",
      reset_at: now(),
    };
  }

  return {
    openGate,
    makeChoiceCard,
    choose,
    getGate,
    listGates,
    reset,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdBiffForwardTriggerGate;
}

if (typeof window !== "undefined") {
  window.CyberCrowdBiffForwardTriggerGate =
    CyberCrowdBiffForwardTriggerGate;
}
