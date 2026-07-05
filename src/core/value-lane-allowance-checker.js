/*
  CyberCrowd Core — Value Lane Allowance Checker

  Owns:
  - checking whether a proposed value lane was already allowed
  - preventing duplicate Biff prompts
  - routing already-allowed evidence toward update/review instead of interruption
  - protecting the user from mundane repeated permission requests

  Does NOT:
  - create value lanes
  - publish anything
  - sell data
  - decide identity
  - trigger movement
  - bypass the user
  - store credentials
  - scrape providers
  - own Dewey, CSI&G, CyberJobs, Octopus, Biff, or TOFU

  Doctrine:
  Repeated evidence
      ↓
  Dewey bucket fills
      ↓
  Balancer checks
      ↓
  Allowance check
      ↓
  Already allowed?
      ├── YES → update existing lane / normal review path
      └── NO  → Biff may ask: "What's the point?"

  Rule:
  No double dipping.
  If the user already allowed the lane, do not ask again.
*/

const CyberCrowdValueLaneAllowanceChecker = (() => {
  const ALLOWANCE_STATUS = {
    ALLOWED: "allowed",
    PRIVATE: "private_allowed",
    REJECTED: "rejected",
    REVOKED: "revoked",
  };

  let allowanceRecords = new Map();

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

    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function normalizeLane(value) {
    return normalizeText(value)
      .replace(/\s*\/\s*/g, " / ")
      .replace(/\s+/g, " ");
  }

  function normalizeChoice(value) {
    return requireText(value, "CHOICE_REQUIRED").toUpperCase();
  }

  function normalizeTags(tags = []) {
    if (!Array.isArray(tags)) return [];

    return tags
      .map((tag) => normalizeText(tag))
      .filter(Boolean);
  }

  function createAllowanceKey(uidl, lane) {
    const cleanUIDL = requireText(uidl, "UIDL_REQUIRED");
    const cleanLane = requireText(lane, "LANE_REQUIRED");

    return `${normalizeText(cleanUIDL)}::${normalizeLane(cleanLane)}`;
  }

  function laneMatches(a, b) {
    const laneA = normalizeLane(a);
    const laneB = normalizeLane(b);

    if (!laneA || !laneB) return false;

    return laneA === laneB || laneA.includes(laneB) || laneB.includes(laneA);
  }

  function makeAllowanceRecord(input = {}) {
    const uidl = requireText(input.uidl, "UIDL_REQUIRED");
    const lane = requireText(input.lane, "LANE_REQUIRED");
    const choice = normalizeChoice(input.choice || "YES");

    let status;

    if (choice === "YES") {
      status = ALLOWANCE_STATUS.ALLOWED;
    } else if (choice === "PRIVATE") {
      status = ALLOWANCE_STATUS.PRIVATE;
    } else if (choice === "NO") {
      status = ALLOWANCE_STATUS.REJECTED;
    } else {
      throw new Error("INVALID_CHOICE");
    }

    return {
      allowance_id: input.allowance_id || makeId("valueLaneAllowance"),
      uidl,
      lane,
      normalized_lane: normalizeLane(lane),
      status,
      original_choice: choice,
      source: input.source || "user_choice",
      proposal_id: input.proposal_id || null,
      subject: input.subject || lane,
      tags: normalizeTags(input.tags),
      note: typeof input.note === "string" ? input.note.trim() : "",
      created_at: input.created_at || now(),
      updated_at: now(),
      revoked_at: null,
    };
  }

  function recordAllowance(input = {}) {
    const record = makeAllowanceRecord(input);
    const key = createAllowanceKey(record.uidl, record.lane);

    allowanceRecords.set(key, record);

    return clone(record);
  }

  function recordFromBiffDecision(gateDecision = {}) {
    if (!gateDecision || typeof gateDecision !== "object") {
      throw new Error("GATE_DECISION_REQUIRED");
    }

    return recordAllowance({
      uidl: gateDecision.uidl,
      lane: gateDecision.proposed_lane,
      choice:
        gateDecision.decision && gateDecision.decision.choice
          ? gateDecision.decision.choice
          : gateDecision.choice,
      proposal_id: gateDecision.proposal_id || null,
      subject: gateDecision.subject || gateDecision.proposed_lane,
      source: "biff_forward_trigger_gate",
      note:
        gateDecision.decision && gateDecision.decision.note
          ? gateDecision.decision.note
          : "",
    });
  }

  function findAllowance(uidl, lane) {
    const cleanUIDL = requireText(uidl, "UIDL_REQUIRED");
    const cleanLane = requireText(lane, "LANE_REQUIRED");

    const exactKey = createAllowanceKey(cleanUIDL, cleanLane);
    const exact = allowanceRecords.get(exactKey);

    if (exact && exact.status !== ALLOWANCE_STATUS.REVOKED) {
      return clone(exact);
    }

    const normalizedUIDL = normalizeText(cleanUIDL);

    const fuzzy = Array.from(allowanceRecords.values()).find((record) => {
      return (
        normalizeText(record.uidl) === normalizedUIDL &&
        record.status !== ALLOWANCE_STATUS.REVOKED &&
        laneMatches(record.lane, cleanLane)
      );
    });

    return fuzzy ? clone(fuzzy) : null;
  }

  function checkProposal(proposal = {}, options = {}) {
    if (!proposal || typeof proposal !== "object") {
      throw new Error("PROPOSAL_REQUIRED");
    }

    if (!proposal.proposal_created) {
      return {
        status: "no_active_proposal",
        should_open_biff: false,
        reason: "No active missing value lane proposal was provided.",
        checked_at: now(),
      };
    }

    const uidl = requireText(proposal.uidl, "UIDL_REQUIRED");
    const proposedLane = requireText(
      proposal.proposed_lane,
      "PROPOSED_LANE_REQUIRED"
    );

    const allowance = findAllowance(uidl, proposedLane);

    const changedMeaning = Boolean(options.changedMeaning);
    const conflictDetected = Boolean(options.conflictDetected);
    const sensitivityShift = Boolean(options.sensitivityShift);
    const userReviewRequired = Boolean(options.userReviewRequired);
    const forceBiff = Boolean(options.forceBiff);

    const hasReviewReason =
      changedMeaning ||
      conflictDetected ||
      sensitivityShift ||
      userReviewRequired ||
      forceBiff;

    if (!allowance) {
      return {
        status: "no_prior_allowance",
        should_open_biff: true,
        reason: "No prior allowance exists for this proposed value lane.",
        proposal: clone(proposal),
        checked_at: now(),
        route_hint: {
          route: "biff_forward_trigger_gate",
          action: "open_gate",
          meaning: "This is a new missing value lane proposal.",
        },
      };
    }

    if (hasReviewReason) {
      return {
        status: "prior_allowance_but_review_required",
        should_open_biff: true,
        reason:
          "Prior allowance exists, but changed meaning, conflict, sensitivity shift, or user-review requirement was detected.",
        allowance,
        proposal: clone(proposal),
        review_flags: {
          changed_meaning: changedMeaning,
          conflict_detected: conflictDetected,
          sensitivity_shift: sensitivityShift,
          user_review_required: userReviewRequired,
          force_biff: forceBiff,
        },
        checked_at: now(),
        route_hint: {
          route: "biff_forward_trigger_gate",
          action: "open_review_gate",
          meaning:
            "This is not duplicate permission; it requires user review because conditions changed.",
        },
      };
    }

    if (allowance.status === ALLOWANCE_STATUS.ALLOWED) {
      return {
        status: "already_allowed",
        should_open_biff: false,
        reason: "User already allowed this value lane. No double dipping.",
        allowance,
        proposal: clone(proposal),
        checked_at: now(),
        route_hint: {
          route: "value_lane_decision_router",
          action: "update_existing_lane_or_normal_review",
          meaning:
            "Matching evidence should update the existing lane or enter normal review without another prompt.",
        },
      };
    }

    if (allowance.status === ALLOWANCE_STATUS.PRIVATE) {
      return {
        status: "already_private_allowed",
        should_open_biff: false,
        reason:
          "User already allowed this value lane privately. Route to private review without another prompt.",
        allowance,
        proposal: clone(proposal),
        checked_at: now(),
        route_hint: {
          route: "value_lane_decision_router",
          action: "update_private_lane_or_private_review",
          meaning:
            "Matching evidence should stay private unless the user later changes its surface.",
        },
      };
    }

    if (allowance.status === ALLOWANCE_STATUS.REJECTED) {
      return {
        status: "previously_rejected",
        should_open_biff: false,
        reason:
          "User already rejected this value lane. Do not ask again unless meaning changes or review is required.",
        allowance,
        proposal: clone(proposal),
        checked_at: now(),
        route_hint: {
          route: "value_lane_decision_router",
          action: "hold_or_mark_not_wanted",
          meaning:
            "This lane proposal should not interrupt the user again under the same meaning.",
        },
      };
    }

    return {
      status: "unknown_allowance_state",
      should_open_biff: true,
      reason: "Allowance state was not recognized. User review is safer.",
      allowance,
      proposal: clone(proposal),
      checked_at: now(),
    };
  }

  function checkEvidence(uidl, evidence = {}, options = {}) {
    const cleanUIDL = requireText(uidl, "UIDL_REQUIRED");

    const lane =
      evidence.proposed_lane ||
      evidence.lane ||
      evidence.subject ||
      options.proposedLane;

    const cleanLane = requireText(lane, "LANE_REQUIRED");

    const pseudoProposal = {
      proposal_created: true,
      proposal_id: evidence.proposal_id || makeId("evidenceAllowanceCheck"),
      uidl: cleanUIDL,
      subject: evidence.subject || cleanLane,
      proposed_lane: cleanLane,
      evidence_count: Number.isInteger(evidence.evidence_count)
        ? evidence.evidence_count
        : 1,
      reason:
        "Matching evidence appeared and needs an allowance check before interrupting the user.",
      choices: ["YES", "NO", "PRIVATE"],
      private_default: Boolean(evidence.private_default),
      tofu_candidate: Boolean(evidence.tofu_candidate),
      evidence_refs: Array.isArray(evidence.evidence_refs)
        ? evidence.evidence_refs
        : [],
    };

    return checkProposal(pseudoProposal, options);
  }

  function revokeAllowance(uidl, lane, note = "") {
    const key = createAllowanceKey(uidl, lane);
    const record = allowanceRecords.get(key);

    if (!record) {
      return {
        status: "not_found",
        revoked: false,
        reason: "No allowance record was found for this lane.",
        checked_at: now(),
      };
    }

    record.status = ALLOWANCE_STATUS.REVOKED;
    record.note = typeof note === "string" ? note.trim() : record.note;
    record.revoked_at = now();
    record.updated_at = record.revoked_at;

    return {
      status: "revoked",
      revoked: true,
      allowance: clone(record),
    };
  }

  function listAllowances(uidl = null) {
    const cleanUIDL =
      typeof uidl === "string" && uidl.trim()
        ? normalizeText(uidl)
        : null;

    return Array.from(allowanceRecords.values())
      .filter((record) => {
        if (!cleanUIDL) return true;
        return normalizeText(record.uidl) === cleanUIDL;
      })
      .map(clone);
  }

  function reset() {
    allowanceRecords = new Map();

    return {
      status: "reset",
      reset_at: now(),
    };
  }

  return {
    recordAllowance,
    recordFromBiffDecision,
    findAllowance,
    checkProposal,
    checkEvidence,
    revokeAllowance,
    listAllowances,
    reset,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdValueLaneAllowanceChecker;
}

if (typeof window !== "undefined") {
  window.CyberCrowdValueLaneAllowanceChecker =
    CyberCrowdValueLaneAllowanceChecker;
}
