// src/core/proximity-intent-status-ledger.js
// CyberCrowd Core — Proximity Intent Status Ledger
// Owns: recording proximity intent route status and preparing safe NET summaries.
// Rule: Core records the path. NET receives only the safe status.
// Does not: track without consent, advertise without intent, choose for user,
// place orders, publish presence, run POS, run payments, expose private uIDL data,
// or deal directly with the customer.

const ProximityIntentStatusLedger = (() => {
  const entries = [];

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

  function normalizeRoute(route = {}) {
    const cleanRoute = requireObject(route, "ROUTE_REQUIRED");

    return {
      route_id: requireText(cleanRoute.route_id, "ROUTE_ID_REQUIRED"),
      created_at: normalizeText(cleanRoute.created_at),
      updated_at: normalizeText(cleanRoute.updated_at),
      uidl: normalizeText(cleanRoute.uidl),
      status: requireText(cleanRoute.status, "STATUS_REQUIRED"),
      reason: normalizeText(cleanRoute.reason),
      message: normalizeText(cleanRoute.message),
      rejection_reason: normalizeText(cleanRoute.rejection_reason),
      human_state: normalizeHumanState(cleanRoute.human_state),
      intent: normalizeIntent(cleanRoute.intent),
      candidates: normalizeCandidates(cleanRoute.candidates),
      approvals: normalizeApprovals(cleanRoute.approvals),
    };
  }

  function normalizeHumanState(humanState = {}) {
    if (!humanState || typeof humanState !== "object" || Array.isArray(humanState)) {
      return {
        off_clock: false,
        proximity_enabled: false,
        presence_mode: "off",
        max_distance_miles: null,
      };
    }

    return {
      off_clock: Boolean(humanState.off_clock),
      proximity_enabled: Boolean(humanState.proximity_enabled),
      presence_mode: normalizeText(humanState.presence_mode) || "off",
      max_distance_miles: normalizeNumber(humanState.max_distance_miles, null),
    };
  }

  function normalizeIntent(intent = {}) {
    if (!intent || typeof intent !== "object" || Array.isArray(intent)) {
      return {
        food_wanted: false,
        music_styles: [],
        has_drink_preference: false,
        has_food_preference: false,
        has_favorite_game: false,
        has_presence_post_text: false,
      };
    }

    return {
      food_wanted: Boolean(intent.food_wanted),
      music_styles: normalizeList(intent.music_styles),
      has_drink_preference: Boolean(normalizeText(intent.drink_preference)),
      has_food_preference: Boolean(normalizeText(intent.food_preference)),
      has_favorite_game: Boolean(normalizeText(intent.favorite_game)),
      has_presence_post_text: Boolean(normalizeText(intent.post_text)),
    };
  }

  function normalizeCandidates(candidates) {
    if (!Array.isArray(candidates)) {
      return [];
    }

    return candidates.map((candidate) => normalizeCandidate(candidate));
  }

  function normalizeCandidate(candidate = {}) {
    const cleanCandidate = requireObject(candidate, "CANDIDATE_REQUIRED");

    const venue = cleanCandidate.venue && typeof cleanCandidate.venue === "object"
      ? cleanCandidate.venue
      : {};

    const score = cleanCandidate.score && typeof cleanCandidate.score === "object"
      ? cleanCandidate.score
      : {};

    return {
      candidate_route_id: normalizeText(cleanCandidate.route_id),
      status: normalizeText(cleanCandidate.status),
      venue: {
        venue_id: normalizeText(venue.venue_id),
        name: normalizeText(venue.name),
        distance_miles: normalizeNumber(venue.distance_miles, null),
        has_food: Boolean(venue.has_food),
        has_drinks: Boolean(venue.has_drinks),
      },
      score: {
        total: normalizeNumber(score.total, 0),
        reasons: normalizeList(score.reasons),
        warnings: normalizeList(score.warnings),
      },
      suggested_actions: normalizeSuggestedActions(cleanCandidate.suggested_actions),
    };
  }

  function normalizeSuggestedActions(actions) {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions.map((action) => {
      const cleanAction = requireObject(action, "ACTION_REQUIRED");

      return {
        action_type: normalizeText(cleanAction.action_type),
        label: normalizeText(cleanAction.label),
        requires_user_approval: cleanAction.requires_user_approval !== false,
        has_items: Array.isArray(cleanAction.items) && cleanAction.items.length > 0,
        item_count: Array.isArray(cleanAction.items) ? cleanAction.items.length : 0,
        presence_mode: normalizeText(cleanAction.presence_mode),
        warnings: normalizeList(cleanAction.warnings),
      };
    });
  }

  function normalizeApprovals(approvals) {
    if (!Array.isArray(approvals)) {
      return [];
    }

    return approvals.map((approval) => {
      const cleanApproval = requireObject(approval, "APPROVAL_REQUIRED");

      return {
        approval_id: normalizeText(cleanApproval.approval_id),
        approved_at: normalizeText(cleanApproval.approved_at),
        route_id: normalizeText(cleanApproval.route_id),
        candidate_route_id: normalizeText(cleanApproval.candidate_route_id),
        action_type: normalizeText(cleanApproval.action_type),
        venue_id: normalizeText(cleanApproval.venue_id),
        venue_name: normalizeText(cleanApproval.venue_name),
        status: normalizeText(cleanApproval.status),
      };
    });
  }

  function deriveCoreState(route) {
    if (route.status === "blocked") {
      return "blocked";
    }

    if (route.status === "no_match") {
      return "no_match";
    }

    if (route.status === "rejected") {
      return "rejected";
    }

    if (route.approvals.length) {
      return "approved_handoff_ready";
    }

    if (route.candidates.length) {
      return "ready_for_choice";
    }

    return "waiting";
  }

  function recordRouteStatus(route = {}) {
    const normalizedRoute = normalizeRoute(route);
    const coreState = deriveCoreState(normalizedRoute);

    const entry = {
      entry_id: makeId("proximityStatus"),
      recorded_at: now(),
      source: "core.proximity-intent-router",
      route_id: normalizedRoute.route_id,
      uidl: normalizedRoute.uidl,
      uidl_hint: maskUidl(normalizedRoute.uidl),
      status: normalizedRoute.status,
      core_state: coreState,
      reason: normalizedRoute.reason,
      message: normalizedRoute.message,
      rejection_reason: normalizedRoute.rejection_reason,
      route_created_at: normalizedRoute.created_at,
      route_updated_at: normalizedRoute.updated_at,
      human_state: clone(normalizedRoute.human_state),
      intent_summary: clone(normalizedRoute.intent),
      candidates: clone(normalizedRoute.candidates),
      approvals: clone(normalizedRoute.approvals),
      safe_summary: buildSafeSummary(normalizedRoute, coreState),
      paper_ladder_row: buildPaperLadderRow(normalizedRoute, coreState),
      net_summary: buildNetSummary(normalizedRoute, coreState),
    };

    entries.push(clone(entry));

    return clone(entry);
  }

  function buildSafeSummary(route, coreState) {
    if (coreState === "blocked") {
      return {
        headline: "Proximity paused",
        body: route.message || "Proximity cannot route right now.",
        safe_tags: ["blocked", route.reason || "no_reason"].filter(Boolean),
      };
    }

    if (coreState === "no_match") {
      return {
        headline: "No nearby path matched",
        body: route.message || "No allowed venue path matched the current intent.",
        safe_tags: ["no_match"],
      };
    }

    if (coreState === "approved_handoff_ready") {
      return {
        headline: "Approved handoff ready",
        body: "User-approved proximity handoff is ready.",
        safe_tags: ["approved_handoff_ready"],
      };
    }

    if (coreState === "ready_for_choice") {
      return {
        headline: "Nearby paths ready",
        body: `${route.candidates.length} allowed proximity path${route.candidates.length === 1 ? "" : "s"} ready for user choice.`,
        safe_tags: ["ready_for_choice"],
      };
    }

    if (coreState === "rejected") {
      return {
        headline: "Proximity route dismissed",
        body: route.rejection_reason || "The route was rejected by the user.",
        safe_tags: ["rejected"],
      };
    }

    return {
      headline: "Proximity waiting",
      body: "Waiting for allowed proximity route status.",
      safe_tags: ["waiting"],
    };
  }

  function buildPaperLadderRow(route, coreState) {
    return {
      row_id: makeId("proximityPaperRow"),
      route_id: route.route_id,
      recorded_at: now(),
      core_state: coreState,
      candidate_count: route.candidates.length,
      approval_count: route.approvals.length,
      has_food_want: route.intent.food_wanted,
      has_drink_preference: route.intent.has_drink_preference,
      has_favorite_game: route.intent.has_favorite_game,
      boundary: "CORE_RECORDS_NET_RECEIVES_SAFE_STATUS",
    };
  }

  function buildNetSummary(route, coreState) {
    return {
      route_id: route.route_id,
      created_at: route.route_created_at || route.created_at,
      updated_at: route.route_updated_at || route.updated_at,
      uidl_hint: maskUidl(route.uidl),
      status: route.status,
      reason: route.reason,
      message: route.message,
      rejection_reason: route.rejection_reason,
      display_summary: buildSafeSummary(route, coreState),
      candidates: route.candidates.map((candidate) => ({
        route_id: candidate.candidate_route_id,
        status: candidate.status,
        venue: {
          venue_id: candidate.venue.venue_id,
          name: candidate.venue.name,
          distance_miles: candidate.venue.distance_miles,
          has_food: candidate.venue.has_food,
          has_drinks: candidate.venue.has_drinks,
        },
        score: {
          total: candidate.score.total,
          reasons: clone(candidate.score.reasons),
          warnings: clone(candidate.score.warnings),
        },
        suggested_actions: candidate.suggested_actions.map((action) => ({
          action_type: action.action_type,
          label: action.label,
          requires_user_approval: action.requires_user_approval,
          presence_mode: action.presence_mode,
          warnings: clone(action.warnings),
          items: action.has_items ? new Array(action.item_count).fill("ITEM_REDACTED") : [],
        })),
      })),
      approvals: clone(route.approvals),
    };
  }

  function latestEntry() {
    if (!entries.length) {
      return null;
    }

    return clone(entries[entries.length - 1]);
  }

  function latestNetSummary() {
    const latest = latestEntry();

    if (!latest) {
      return null;
    }

    return clone(latest.net_summary);
  }

  function listEntries(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const routeId = normalizeText(cleanFilter.route_id);
    const coreState = normalizeText(cleanFilter.core_state);
    const status = normalizeText(cleanFilter.status);

    return entries
      .filter((entry) => {
        if (uidl && entry.uidl !== uidl) {
          return false;
        }

        if (routeId && entry.route_id !== routeId) {
          return false;
        }

        if (coreState && entry.core_state !== coreState) {
          return false;
        }

        if (status && entry.status !== status) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function listPaperLadderRows(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.paper_ladder_row));
  }

  function clearEntries() {
    entries.length = 0;
    return true;
  }

  return {
    recordRouteStatus,
    latestEntry,
    latestNetSummary,
    listEntries,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = ProximityIntentStatusLedger;
}
