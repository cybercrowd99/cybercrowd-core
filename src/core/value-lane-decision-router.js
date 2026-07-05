/*
  CyberCrowd Core — Value Lane Decision Router

  Owns:
  - receiving a recorded Biff YES / NO / PRIVATE decision
  - routing YES toward lane creation/profile review
  - routing PRIVATE toward private lane/review
  - routing NO toward rejection/no-lane-needed hold
  - keeping the decision as a route plan, not movement

  Does NOT:
  - create value lanes directly
  - publish anything
  - sell data
  - decide identity
  - trigger Octopus movement
  - bypass the user
  - store credentials
  - scrape providers
  - own Dewey, CSI&G, CyberJobs, Biff, allowance checking, or TOFU

  Doctrine:
  Biff asks:
  "What's the point?"
      ↓
  User chooses:
  YES / NO / PRIVATE
      ↓
  Router prepares the next safe path.
*/

const CyberCrowdValueLaneDecisionRouter = (() => {
  const VALID_CHOICES = ["YES", "NO", "PRIVATE"];

  let routeRecords = new Map();

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

  function requireBiffDecision(decisionPacket = {}) {
    if (!decisionPacket || typeof decisionPacket !== "object") {
      throw new Error("BIFF_DECISION_PACKET_REQUIRED");
    }

    const decision =
      decisionPacket.decision && typeof decisionPacket.decision === "object"
        ? decisionPacket.decision
        : {};

    const choice = normalizeChoice(decision.choice || decisionPacket.choice);

    if (!VALID_CHOICES.includes(choice)) {
      throw new Error("INVALID_CHOICE");
    }

    return {
      gate_id: requireText(decisionPacket.gate_id, "GATE_ID_REQUIRED"),
      proposal_id: requireText(
        decisionPacket.proposal_id,
        "PROPOSAL_ID_REQUIRED"
      ),
      uidl: requireText(decisionPacket.uidl, "UIDL_REQUIRED"),
      subject: requireText(decisionPacket.subject, "SUBJECT_REQUIRED"),
      proposed_lane: requireText(
        decisionPacket.proposed_lane,
        "PROPOSED_LANE_REQUIRED"
      ),
      choice,
      note: typeof decision.note === "string" ? decision.note.trim() : "",
      decided_at: decision.decided_at || now(),
      source: decisionPacket.source || "biff_forward_trigger_gate",
    };
  }

  function makeRoutePlan(cleanDecision) {
    if (cleanDecision.choice === "YES") {
      return {
        route: "lane_creation_or_profile_review",
        action: "prepare_allowed_value_lane",
        surface: "normal_review",
        status: "ready_for_allowed_lane_review",
        meaning:
          "User approved this value lane for normal lane creation or profile review.",
      };
    }

    if (cleanDecision.choice === "PRIVATE") {
      return {
        route: "private_lane_or_private_review",
        action: "prepare_private_value_lane",
        surface: "private_review",
        status: "ready_for_private_lane_review",
        meaning:
          "User approved holding this value privately before any public surface.",
      };
    }

    return {
      route: "rejection_or_no_lane_needed",
      action: "record_no_lane_needed",
      surface: "hold",
      status: "held_as_rejected_under_current_meaning",
      meaning:
        "User rejected this value lane proposal under the current meaning.",
    };
  }

  function routeDecision(decisionPacket = {}) {
    const cleanDecision = requireBiffDecision(decisionPacket);
    const routePlan = makeRoutePlan(cleanDecision);
    const routeId = makeId("valueLaneRoute");

    const record = {
      route_id: routeId,
      gate_id: cleanDecision.gate_id,
      proposal_id: cleanDecision.proposal_id,
      uidl: cleanDecision.uidl,
      subject: cleanDecision.subject,
      proposed_lane: cleanDecision.proposed_lane,
      user_choice: cleanDecision.choice,
      user_note: cleanDecision.note,
      source: cleanDecision.source,
      route_plan: routePlan,
      movement_allowed: false,
      publish_allowed: false,
      lane_created: false,
      created_at: now(),
      decided_at: cleanDecision.decided_at,
    };

    routeRecords.set(routeId, record);

    return clone(record);
  }

  function makeReviewTicket(routeId) {
    const record = getRoute(routeId);

    if (!record) {
      throw new Error("ROUTE_NOT_FOUND");
    }

    return {
      ticket_type: "value_lane_review_ticket",
      route_id: record.route_id,
      uidl: record.uidl,
      subject: record.subject,
      proposed_lane: record.proposed_lane,
      user_choice: record.user_choice,
      status: record.route_plan.status,
      route: record.route_plan.route,
      action: record.route_plan.action,
      surface: record.route_plan.surface,
      message: record.route_plan.meaning,
      movement_allowed: false,
      publish_allowed: false,
      created_at: now(),
    };
  }

  function getRoute(routeId) {
    const cleanRouteId = requireText(routeId, "ROUTE_ID_REQUIRED");
    const record = routeRecords.get(cleanRouteId);

    return record ? clone(record) : null;
  }

  function listRoutes(uidl = null) {
    const cleanUIDL =
      typeof uidl === "string" && uidl.trim()
        ? uidl.trim().toLowerCase()
        : null;

    return Array.from(routeRecords.values())
      .filter((record) => {
        if (!cleanUIDL) return true;
        return record.uidl.toLowerCase() === cleanUIDL;
      })
      .map(clone);
  }

  function reset() {
    routeRecords = new Map();

    return {
      status: "reset",
      reset_at: now(),
    };
  }

  return {
    routeDecision,
    makeReviewTicket,
    getRoute,
    listRoutes,
    reset,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdValueLaneDecisionRouter;
}

if (typeof window !== "undefined") {
  window.CyberCrowdValueLaneDecisionRouter =
    CyberCrowdValueLaneDecisionRouter;
}
