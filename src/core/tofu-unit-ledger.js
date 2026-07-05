/*
  CyberCrowd Core — TOFU Unit Ledger

  TOFU:
  Treasured Of Future Units

  Owns:
  - recording approved or private future-value units
  - preserving value-lane evidence as held future value
  - updating existing TOFU units instead of duplicating them
  - keeping future value available for review

  Does NOT:
  - create public lanes directly
  - publish anything
  - sell data
  - decide identity
  - trigger Octopus movement
  - bypass the user
  - store credentials
  - scrape providers
  - own Dewey, CSI&G, CyberJobs, Biff, allowance checking, or decision routing

  Doctrine:
  Raw repeated evidence
      ↓
  Value lane detected
      ↓
  User chooses YES or PRIVATE
      ↓
  TOFU preserves the future unit

  Rule:
  TOFU is held value.
  It is not public output.
*/

const CyberCrowdTOFUUnitLedger = (() => {
  const VALID_USER_CHOICES = ["YES", "PRIVATE"];
  const VALID_SURFACES = ["normal_review", "private_review"];

  let tofuUnits = new Map();

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
    return requireText(value, "USER_CHOICE_REQUIRED").toUpperCase();
  }

  function createTOFUKey(uidl, lane) {
    const cleanUIDL = requireText(uidl, "UIDL_REQUIRED");
    const cleanLane = requireText(lane, "LANE_REQUIRED");

    return `${normalizeText(cleanUIDL)}::${normalizeLane(cleanLane)}`;
  }

  function requireRouteRecord(routeRecord = {}) {
    if (!routeRecord || typeof routeRecord !== "object") {
      throw new Error("ROUTE_RECORD_REQUIRED");
    }

    const routePlan =
      routeRecord.route_plan && typeof routeRecord.route_plan === "object"
        ? routeRecord.route_plan
        : {};

    const userChoice = normalizeChoice(routeRecord.user_choice);

    if (!VALID_USER_CHOICES.includes(userChoice)) {
      throw new Error("TOFU_REQUIRES_YES_OR_PRIVATE");
    }

    const surface = routePlan.surface || "normal_review";

    if (!VALID_SURFACES.includes(surface)) {
      throw new Error("INVALID_TOFU_SURFACE");
    }

    return {
      route_id: requireText(routeRecord.route_id, "ROUTE_ID_REQUIRED"),
      gate_id: routeRecord.gate_id || null,
      proposal_id: requireText(
        routeRecord.proposal_id,
        "PROPOSAL_ID_REQUIRED"
      ),
      uidl: requireText(routeRecord.uidl, "UIDL_REQUIRED"),
      subject: requireText(routeRecord.subject, "SUBJECT_REQUIRED"),
      proposed_lane: requireText(
        routeRecord.proposed_lane,
        "PROPOSED_LANE_REQUIRED"
      ),
      user_choice: userChoice,
      user_note:
        typeof routeRecord.user_note === "string"
          ? routeRecord.user_note.trim()
          : "",
      source: routeRecord.source || "value_lane_decision_router",
      route_plan: {
        route: routePlan.route || null,
        action: routePlan.action || null,
        surface,
        status: routePlan.status || "ready_for_review",
        meaning: routePlan.meaning || "User approved held future value.",
      },
      movement_allowed: Boolean(routeRecord.movement_allowed),
      publish_allowed: Boolean(routeRecord.publish_allowed),
      lane_created: Boolean(routeRecord.lane_created),
      decided_at: routeRecord.decided_at || now(),
    };
  }

  function makeUnitFromRoute(cleanRoute) {
    const privateHeld = cleanRoute.user_choice === "PRIVATE";

    return {
      tofu_id: makeId("tofuUnit"),
      uidl: cleanRoute.uidl,
      subject: cleanRoute.subject,
      lane: cleanRoute.proposed_lane,
      normalized_lane: normalizeLane(cleanRoute.proposed_lane),
      status: privateHeld
        ? "held_for_private_review"
        : "held_for_normal_review",
      surface: privateHeld ? "private_review" : "normal_review",
      user_choice: cleanRoute.user_choice,
      treasured_of_future_units: true,
      future_value_state: "preserved",
      movement_allowed: false,
      publish_allowed: false,
      lane_created: false,
      route_refs: [cleanRoute.route_id],
      proposal_refs: [cleanRoute.proposal_id],
      gate_refs: cleanRoute.gate_id ? [cleanRoute.gate_id] : [],
      notes: cleanRoute.user_note ? [cleanRoute.user_note] : [],
      created_at: now(),
      updated_at: now(),
      review_history: [
        {
          event: "tofu_unit_created",
          route_id: cleanRoute.route_id,
          proposal_id: cleanRoute.proposal_id,
          user_choice: cleanRoute.user_choice,
          surface: privateHeld ? "private_review" : "normal_review",
          created_at: now(),
        },
      ],
    };
  }

  function mergeUnique(list = [], value) {
    if (!value) return list;

    return list.includes(value) ? list : list.concat(value);
  }

  function appendReviewEvent(unit, event) {
    unit.review_history.push({
      ...event,
      created_at: now(),
    });
  }

  function updateExistingUnit(unit, cleanRoute) {
    unit.status =
      cleanRoute.user_choice === "PRIVATE"
        ? "held_for_private_review"
        : unit.status === "held_for_private_review"
          ? "held_for_private_review"
          : "held_for_normal_review";

    unit.surface =
      unit.status === "held_for_private_review"
        ? "private_review"
        : "normal_review";

    unit.user_choice =
      unit.status === "held_for_private_review"
        ? "PRIVATE"
        : cleanRoute.user_choice;

    unit.future_value_state = "preserved";
    unit.movement_allowed = false;
    unit.publish_allowed = false;
    unit.lane_created = false;

    unit.route_refs = mergeUnique(unit.route_refs, cleanRoute.route_id);
    unit.proposal_refs = mergeUnique(
      unit.proposal_refs,
      cleanRoute.proposal_id
    );

    if (cleanRoute.gate_id) {
      unit.gate_refs = mergeUnique(unit.gate_refs, cleanRoute.gate_id);
    }

    if (cleanRoute.user_note) {
      unit.notes = mergeUnique(unit.notes, cleanRoute.user_note);
    }

    unit.updated_at = now();

    appendReviewEvent(unit, {
      event: "tofu_unit_updated",
      route_id: cleanRoute.route_id,
      proposal_id: cleanRoute.proposal_id,
      user_choice: cleanRoute.user_choice,
      surface: unit.surface,
    });

    return unit;
  }

  function recordFromRoute(routeRecord = {}) {
    const cleanRoute = requireRouteRecord(routeRecord);
    const key = createTOFUKey(cleanRoute.uidl, cleanRoute.proposed_lane);
    const existing = tofuUnits.get(key);

    if (existing) {
      const updated = updateExistingUnit(existing, cleanRoute);
      tofuUnits.set(key, updated);

      return {
        status: "tofu_unit_updated",
        duplicated: false,
        reason:
          "Existing TOFU unit was updated instead of creating a duplicate.",
        tofu_unit: clone(updated),
      };
    }

    const unit = makeUnitFromRoute(cleanRoute);
    tofuUnits.set(key, unit);

    return {
      status: "tofu_unit_created",
      duplicated: false,
      reason: "Future value was preserved as a TOFU unit.",
      tofu_unit: clone(unit),
    };
  }

  function makeReviewCard(tofuId) {
    const unit = getUnitById(tofuId);

    if (!unit) {
      throw new Error("TOFU_UNIT_NOT_FOUND");
    }

    return {
      card_type: "tofu_future_value_review",
      tofu_id: unit.tofu_id,
      uidl: unit.uidl,
      subject: unit.subject,
      lane: unit.lane,
      title: "Future value available for review",
      message:
        "This value has been preserved as TOFU. It is not public and has not moved.",
      status: unit.status,
      surface: unit.surface,
      choices:
        unit.surface === "private_review"
          ? ["KEEP PRIVATE", "REVIEW", "REJECT"]
          : ["REVIEW", "KEEP PRIVATE", "REJECT"],
      movement_allowed: false,
      publish_allowed: false,
      created_at: now(),
    };
  }

  function getUnit(uidl, lane) {
    const key = createTOFUKey(uidl, lane);
    const unit = tofuUnits.get(key);

    return unit ? clone(unit) : null;
  }

  function getUnitById(tofuId) {
    const cleanId = requireText(tofuId, "TOFU_ID_REQUIRED");

    const unit = Array.from(tofuUnits.values()).find((item) => {
      return item.tofu_id === cleanId;
    });

    return unit ? clone(unit) : null;
  }

  function listUnits(uidl = null) {
    const cleanUIDL =
      typeof uidl === "string" && uidl.trim()
        ? normalizeText(uidl)
        : null;

    return Array.from(tofuUnits.values())
      .filter((unit) => {
        if (!cleanUIDL) return true;
        return normalizeText(unit.uidl) === cleanUIDL;
      })
      .map(clone);
  }

  function markReviewed(tofuId, outcome, note = "") {
    const cleanId = requireText(tofuId, "TOFU_ID_REQUIRED");
    const cleanOutcome = requireText(outcome, "OUTCOME_REQUIRED");

    const unit = Array.from(tofuUnits.values()).find((item) => {
      return item.tofu_id === cleanId;
    });

    if (!unit) {
      throw new Error("TOFU_UNIT_NOT_FOUND");
    }

    unit.status = `reviewed_${normalizeText(cleanOutcome).replace(/\s+/g, "_")}`;
    unit.updated_at = now();

    if (note && typeof note === "string") {
      unit.notes = mergeUnique(unit.notes, note.trim());
    }

    appendReviewEvent(unit, {
      event: "tofu_unit_reviewed",
      outcome: cleanOutcome,
      note: typeof note === "string" ? note.trim() : "",
    });

    return clone(unit);
  }

  function reset() {
    tofuUnits = new Map();

    return {
      status: "reset",
      reset_at: now(),
    };
  }

  return {
    recordFromRoute,
    makeReviewCard,
    getUnit,
    getUnitById,
    listUnits,
    markReviewed,
    reset,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdTOFUUnitLedger;
}

if (typeof window !== "undefined") {
  window.CyberCrowdTOFUUnitLedger = CyberCrowdTOFUUnitLedger;
}
