// src/core/proximity-intent-router.js
// CyberCrowd Core — Proximity Intent Router
// Owns: routing allowed off-clock proximity intent into helpful venue/service paths.
// Rule: Proximity does not hunt the human. Proximity serves the human's allowed intent.
// Does not: track without consent, advertise without intent, decide identity, force presence,
// place orders without approval, publish location without approval, run POS, run payments,
// own venues, scrape providers, or bypass uIDL boundaries.

const ProximityIntentRouter = (() => {
  const routes = [];

  const DEFAULT_LIMIT = 5;

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

  function normalizeList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  function normalizeNumber(value, fallback = null) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return number;
  }

  function hasTextMatch(list, target) {
    const cleanTarget = normalizeText(target).toLowerCase();

    if (!cleanTarget) {
      return false;
    }

    return list.some((item) => normalizeText(item).toLowerCase() === cleanTarget);
  }

  function hasAnyTextMatch(listA, listB) {
    const cleanA = normalizeList(listA).map((item) => item.toLowerCase());
    const cleanB = normalizeList(listB).map((item) => item.toLowerCase());

    return cleanA.some((item) => cleanB.includes(item));
  }

  function isAllowedPresenceMode(mode) {
    return ["private", "friends", "public", "off"].includes(mode);
  }

  function normalizePresenceMode(mode) {
    const clean = normalizeText(mode).toLowerCase();

    if (isAllowedPresenceMode(clean)) {
      return clean;
    }

    return "off";
  }

  function normalizeHumanState(humanState = {}) {
    const state = requireObject(humanState, "HUMAN_STATE_REQUIRED");

    return {
      uidl: requireText(state.uidl, "UIDL_REQUIRED"),
      name: normalizeText(state.name),
      off_clock: Boolean(state.off_clock),
      proximity_enabled: Boolean(state.proximity_enabled),
      presence_mode: normalizePresenceMode(state.presence_mode),
      max_distance_miles: normalizeNumber(state.max_distance_miles, 3),
      allow_preorder: Boolean(state.allow_preorder),
      allow_presence_post: Boolean(state.allow_presence_post),
      current_location_hint: normalizeText(state.current_location_hint),
    };
  }

  function normalizeIntent(intent = {}) {
    const cleanIntent = requireObject(intent, "INTENT_REQUIRED");

    return {
      drink_preference: normalizeText(cleanIntent.drink_preference),
      food_wanted: Boolean(cleanIntent.food_wanted),
      food_preference: normalizeText(cleanIntent.food_preference),
      music_styles: normalizeList(cleanIntent.music_styles),
      favorite_game: normalizeText(cleanIntent.favorite_game),
      desired_time: normalizeText(cleanIntent.desired_time),
      mood: normalizeText(cleanIntent.mood),
      wants_quiet: Boolean(cleanIntent.wants_quiet),
      wants_social: Boolean(cleanIntent.wants_social),
      post_text: normalizeText(cleanIntent.post_text),
    };
  }

  function normalizeVenue(venue = {}) {
    const cleanVenue = requireObject(venue, "VENUE_REQUIRED");

    return {
      venue_id: requireText(cleanVenue.venue_id, "VENUE_ID_REQUIRED"),
      name: requireText(cleanVenue.name, "VENUE_NAME_REQUIRED"),
      distance_miles: normalizeNumber(cleanVenue.distance_miles, null),
      music_styles: normalizeList(cleanVenue.music_styles),
      has_food: Boolean(cleanVenue.has_food),
      has_drinks: Boolean(cleanVenue.has_drinks),
      drink_options: normalizeList(cleanVenue.drink_options),
      food_options: normalizeList(cleanVenue.food_options),
      events: Array.isArray(cleanVenue.events) ? cleanVenue.events.map(normalizeEvent) : [],
      order_channels: normalizeList(cleanVenue.order_channels),
      presence_channels: normalizeList(cleanVenue.presence_channels),
      notes: normalizeText(cleanVenue.notes),
    };
  }

  function normalizeEvent(event = {}) {
    const cleanEvent = requireObject(event, "EVENT_REQUIRED");

    return {
      event_id: normalizeText(cleanEvent.event_id) || makeId("event"),
      title: normalizeText(cleanEvent.title),
      starts_at: normalizeText(cleanEvent.starts_at),
      event_type: normalizeText(cleanEvent.event_type),
      tags: normalizeList(cleanEvent.tags),
    };
  }

  function isVenueInRange(humanState, venue) {
    if (venue.distance_miles === null) {
      return false;
    }

    return venue.distance_miles <= humanState.max_distance_miles;
  }

  function scoreVenue(humanState, intent, venue) {
    const score = {
      total: 0,
      reasons: [],
      warnings: [],
    };

    if (!isVenueInRange(humanState, venue)) {
      score.warnings.push("OUT_OF_RANGE");
      return score;
    }

    score.total += 10;
    score.reasons.push("within_proximity_range");

    if (intent.music_styles.length && hasAnyTextMatch(intent.music_styles, venue.music_styles)) {
      score.total += 20;
      score.reasons.push("matches_music_style");
    }

    if (intent.food_wanted && venue.has_food) {
      score.total += 15;
      score.reasons.push("has_food");
    }

    if (intent.drink_preference && hasTextMatch(venue.drink_options, intent.drink_preference)) {
      score.total += 15;
      score.reasons.push("has_favorite_drink");
    }

    if (intent.food_preference && hasTextMatch(venue.food_options, intent.food_preference)) {
      score.total += 10;
      score.reasons.push("has_food_preference");
    }

    if (intent.favorite_game && venue.events.some((event) => event.title.toLowerCase().includes(intent.favorite_game.toLowerCase()))) {
      score.total += 25;
      score.reasons.push("favorite_game_event");
    }

    if (intent.desired_time && venue.events.some((event) => event.starts_at === intent.desired_time)) {
      score.total += 5;
      score.reasons.push("matches_desired_time");
    }

    if (intent.wants_quiet && hasTextMatch(venue.music_styles, "quiet")) {
      score.total += 5;
      score.reasons.push("quiet_option");
    }

    if (intent.wants_social && hasTextMatch(venue.music_styles, "live")) {
      score.total += 5;
      score.reasons.push("social_live_option");
    }

    if (!venue.has_drinks && intent.drink_preference) {
      score.warnings.push("DRINK_NOT_AVAILABLE");
    }

    if (intent.food_wanted && !venue.has_food) {
      score.warnings.push("FOOD_NOT_AVAILABLE");
    }

    return score;
  }

  function buildSuggestedActions(humanState, intent, venue, score) {
    const actions = [];

    actions.push({
      action_type: "VIEW_VENUE",
      label: `View ${venue.name}`,
      requires_user_approval: true,
    });

    if (humanState.allow_preorder && venue.order_channels.length) {
      const orderItems = [];

      if (intent.food_preference && hasTextMatch(venue.food_options, intent.food_preference)) {
        orderItems.push(intent.food_preference);
      }

      if (intent.drink_preference && hasTextMatch(venue.drink_options, intent.drink_preference)) {
        orderItems.push(intent.drink_preference);
      }

      if (orderItems.length) {
        actions.push({
          action_type: "PREPARE_ORDER",
          label: `Prepare order at ${venue.name}`,
          items: orderItems,
          order_channel: venue.order_channels[0],
          requires_user_approval: true,
        });
      }
    }

    if (
      humanState.allow_presence_post &&
      humanState.presence_mode !== "off" &&
      venue.presence_channels.length &&
      intent.post_text
    ) {
      actions.push({
        action_type: "PREPARE_PRESENCE_POST",
        label: `Post presence at ${venue.name}`,
        post_text: intent.post_text,
        presence_mode: humanState.presence_mode,
        presence_channel: venue.presence_channels[0],
        requires_user_approval: true,
      });
    }

    if (score.warnings.length) {
      actions.push({
        action_type: "ASK_CLARIFYING_CHOICE",
        label: "Confirm details before movement",
        warnings: clone(score.warnings),
        requires_user_approval: true,
      });
    }

    return actions;
  }

  function createRouteCandidate(humanState, intent, venue) {
    const score = scoreVenue(humanState, intent, venue);

    return {
      route_id: makeId("proximityRoute"),
      created_at: now(),
      uidl: humanState.uidl,
      venue: clone(venue),
      score: clone(score),
      suggested_actions: buildSuggestedActions(humanState, intent, venue, score),
      status: score.total > 0 ? "candidate" : "ignored",
    };
  }

  function routeProximityIntent(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");
    const humanState = normalizeHumanState(cleanInput.human_state);
    const intent = normalizeIntent(cleanInput.intent);
    const venues = Array.isArray(cleanInput.venues) ? cleanInput.venues.map(normalizeVenue) : [];
    const limit = normalizeNumber(cleanInput.limit, DEFAULT_LIMIT);

    if (!humanState.off_clock) {
      return recordRoute({
        route_id: makeId("proximityRoute"),
        created_at: now(),
        uidl: humanState.uidl,
        status: "blocked",
        reason: "HUMAN_NOT_OFF_CLOCK",
        message: "Proximity intent waits until the human is off the clock.",
        candidates: [],
      });
    }

    if (!humanState.proximity_enabled) {
      return recordRoute({
        route_id: makeId("proximityRoute"),
        created_at: now(),
        uidl: humanState.uidl,
        status: "blocked",
        reason: "PROXIMITY_NOT_ENABLED",
        message: "Proximity cannot route without the human allowing it.",
        candidates: [],
      });
    }

    const candidates = venues
      .map((venue) => createRouteCandidate(humanState, intent, venue))
      .filter((candidate) => candidate.status === "candidate")
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, limit);

    return recordRoute({
      route_id: makeId("proximityRoute"),
      created_at: now(),
      uidl: humanState.uidl,
      status: candidates.length ? "ready_for_choice" : "no_match",
      human_state: clone(humanState),
      intent: clone(intent),
      candidates,
      message: candidates.length
        ? "Proximity found allowed venue paths for user choice."
        : "No allowed venue path matched the current proximity intent.",
    });
  }

  function approveSuggestedAction(routeId, candidateRouteId, actionType) {
    const route = routes.find((item) => item.route_id === routeId);

    if (!route) {
      throw new Error("ROUTE_NOT_FOUND");
    }

    const candidate = Array.isArray(route.candidates)
      ? route.candidates.find((item) => item.route_id === candidateRouteId)
      : null;

    if (!candidate) {
      throw new Error("CANDIDATE_NOT_FOUND");
    }

    const action = Array.isArray(candidate.suggested_actions)
      ? candidate.suggested_actions.find((item) => item.action_type === actionType)
      : null;

    if (!action) {
      throw new Error("ACTION_NOT_FOUND");
    }

    const approval = {
      approval_id: makeId("proximityApproval"),
      approved_at: now(),
      route_id: routeId,
      candidate_route_id: candidateRouteId,
      action_type: actionType,
      uidl: route.uidl,
      venue_id: candidate.venue.venue_id,
      venue_name: candidate.venue.name,
      action: clone(action),
      status: "approved_for_handoff",
    };

    route.approvals = Array.isArray(route.approvals) ? route.approvals : [];
    route.approvals.push(clone(approval));
    route.updated_at = now();

    return clone(approval);
  }

  function rejectRoute(routeId, reason = "USER_REJECTED") {
    const route = routes.find((item) => item.route_id === routeId);

    if (!route) {
      throw new Error("ROUTE_NOT_FOUND");
    }

    route.status = "rejected";
    route.rejected_at = now();
    route.rejection_reason = normalizeText(reason) || "USER_REJECTED";

    return clone(route);
  }

  function recordRoute(route) {
    routes.push(clone(route));
    return clone(route);
  }

  function listRoutes(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const status = normalizeText(cleanFilter.status);

    return routes
      .filter((route) => {
        if (uidl && route.uidl !== uidl) {
          return false;
        }

        if (status && route.status !== status) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function clearRoutes() {
    routes.length = 0;
    return true;
  }

  return {
    routeProximityIntent,
    approveSuggestedAction,
    rejectRoute,
    listRoutes,
    clearRoutes,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = ProximityIntentRouter;
}
