// src/core/cybercade-game-room-router.js
// CyberCrowd Core — CyberCade Game Room Router
// Department: CyberCare
// Room: CyberCade
// Owns: routing safe game-room requests to CyberCade games.
// First game/app: PixelPrix.
// Rule: CyberCare owns the department. CyberCade holds the game room.
// PixelPrix is the first game inside the room.
// Teach the difference. Do not shame the child.
// Pictures stay source. Only results move.
// Does not: move raw pictures, expose child identity, publish kid names,
// show child faces, expose address/school/parent identity,
// create child chat, direct message, public child profile,
// shame children, punish children, replace parenting,
// sell child data, make unsafe chores, or run games outside parent approval.

const CyberCadeGameRoomRouter = (() => {
  const routes = [];

  const ROOM_ACTIONS = [
    "open_room",
    "start_game",
    "create_overlay_session",
    "add_cleanup_target",
    "record_cleanup_click",
    "parent_confirm_cleanup",
    "open_spot_difference",
    "add_difference_marker",
    "record_difference_click",
    "parent_confirm_spot_difference",
    "run_game_cycle",
    "status",
  ];

  const GAME_NAMES = [
    "pixelprix",
  ];

  const ROOM_STATES = [
    "room_open",
    "game_ready",
    "game_routed",
    "overlay_session_created",
    "cleanup_target_added",
    "cleanup_click_recorded",
    "cleanup_parent_confirmed",
    "spot_difference_opened",
    "difference_marker_added",
    "difference_click_recorded",
    "spot_difference_parent_confirmed",
    "game_cycle_completed",
    "status_ready",
    "blocked_unknown_game",
    "blocked_unknown_action",
    "blocked_raw_picture",
    "blocked_missing_dependency",
    "blocked_unsafe",
    "failed",
  ];

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

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

  function normalizeNumber(value, fallback = 0) {
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
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        return item;
      })
      .filter((item) => {
        if (typeof item === "string") {
          return Boolean(item);
        }

        return Boolean(item);
      });
  }

  function normalizeSafeReference(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return "";
    }

    return clean
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sanitizeSafeText(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return "";
    }

    return clean
      .replace(/\bpassword\b/gi, "credential")
      .replace(/\btoken\b/gi, "credential")
      .replace(/\bsecret\b/gi, "protected detail")
      .replace(/\bprivate proof\b/gi, "private verification")
      .replace(/\bidentity evidence\b/gi, "verification detail")
      .replace(/\bhome address\b/gi, "protected location detail")
      .replace(/\bphone number\b/gi, "protected contact detail")
      .replace(/\baddress\b/gi, "protected location detail")
      .replace(/\bschool\b/gi, "protected location detail")
      .replace(/\braw uIDL\b/gi, "protected uIDL")
      .replace(/\bfull uIDL\b/gi, "protected uIDL")
      .replace(/\bchild identity\b/gi, "protected child detail")
      .replace(/\bminor identity\b/gi, "protected child detail")
      .replace(/\bkid name\b/gi, "protected player detail")
      .replace(/\bchild name\b/gi, "protected player detail")
      .replace(/\bface photo\b/gi, "protected image detail")
      .replace(/\bprivate room\b/gi, "protected room detail")
      .replace(/\bparent identity\b/gi, "protected adult detail")
      .replace(/\bbathroom picture\b/gi, "blocked picture detail")
      .replace(/\bbody picture\b/gi, "blocked picture detail")
      .replace(/\bchat\b/gi, "game display");
  }

  function normalizeGameName(value) {
    const clean = normalizeText(value).toLowerCase();

    if (GAME_NAMES.includes(clean)) {
      return clean;
    }

    if (clean === "pixelprix" || clean === "pixel prix" || clean === "pixel_prix") {
      return "pixelprix";
    }

    return "";
  }

  function normalizeRoomAction(value) {
    const clean = normalizeText(value).toLowerCase();

    if (ROOM_ACTIONS.includes(clean)) {
      return clean;
    }

    if (clean === "open") {
      return "open_room";
    }

    if (clean === "start") {
      return "start_game";
    }

    if (clean === "overlay") {
      return "create_overlay_session";
    }

    if (clean === "cleanup_click") {
      return "record_cleanup_click";
    }

    if (clean === "spot") {
      return "open_spot_difference";
    }

    if (clean === "difference_click") {
      return "record_difference_click";
    }

    if (clean === "cycle") {
      return "run_game_cycle";
    }

    return "";
  }

  function containsRawPicture(value) {
    if (!value || typeof value !== "object") {
      return false;
    }

    if (Array.isArray(value)) {
      return value.some(containsRawPicture);
    }

    const rawKeys = [
      "raw_picture",
      "raw_photo",
      "raw_image",
      "raw_picture_base64",
      "raw_photo_base64",
      "base64",
      "data_url",
      "image_bytes",
      "file_blob",
      "blob",
      "buffer",
    ];

    return Object.keys(value).some((key) => {
      if (rawKeys.includes(key) && value[key]) {
        return true;
      }

      return containsRawPicture(value[key]);
    });
  }

  function normalizeRoomRequest(input = {}) {
    const cleanInput = requireObject(input, "CYBERCADE_ROOM_REQUEST_REQUIRED");

    return {
      request_id: normalizeSafeReference(cleanInput.request_id) || makeId("cybercadeRoomRequest"),
      requested_at: normalizeSafeReference(cleanInput.requested_at) || now(),
      department: "CyberCare",
      room: "CyberCade",
      game_name: normalizeGameName(cleanInput.game_name || "pixelprix"),
      action: normalizeRoomAction(cleanInput.action || cleanInput.room_action),
      parent_safe_tag: sanitizeSafeText(cleanInput.parent_safe_tag),
      household_tag: normalizeSafeReference(cleanInput.household_tag),
      anonymous_player_tag: sanitizeSafeText(cleanInput.anonymous_player_tag),
      age_band: normalizeSafeReference(cleanInput.age_band),
      payload: normalizePayload(cleanInput.payload),
      parent_approval: cleanInput.parent_approval !== false,
      parent_attention_required: cleanInput.parent_attention_required !== false,
      unsafe_request: normalizeBoolean(cleanInput.unsafe_request),
      notes: normalizeList(cleanInput.notes).map(sanitizeSafeText),
    };
  }

  function normalizePayload(payload = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    return clone(payload);
  }

  function normalizeDependencies(dependencies = {}) {
    const cleanDependencies =
      dependencies && typeof dependencies === "object" && !Array.isArray(dependencies)
        ? dependencies
        : {};

    return {
      pixelprix_controller: cleanDependencies.pixelprix_controller || null,
      pixelprix_overlay_router: cleanDependencies.pixelprix_overlay_router || null,
      signal_router: cleanDependencies.signal_router || null,
      progress_ledger: cleanDependencies.progress_ledger || null,
      display_receiver: cleanDependencies.display_receiver || null,
    };
  }

  function routeGameRoomRequest(input = {}, dependencies = {}) {
    const request = normalizeRoomRequest(input);
    const deps = normalizeDependencies(dependencies);

    const route = {
      route_id: makeId("cybercadeRoomRoute"),
      routed_at: now(),
      request_id: request.request_id,
      department: "CyberCare",
      room: "CyberCade",
      game_name: request.game_name || "unknown",
      action: request.action || "unknown",
      status: "started",
      room_state: "room_open",
      request: clone(request),
      result: null,
      boundary: buildBoundary(),
      allowed_outputs: buildAllowedOutputs(),
      blocked_outputs: buildBlockedOutputs(),
      paper_ladder_row: null,
      share_safe_summary: null,
      notes: buildRouteNotes(request),
    };

    try {
      if (containsRawPicture(request.payload)) {
        route.status = "blocked";
        route.room_state = "blocked_raw_picture";
        route.result = buildBlockedResult("RAW_PICTURE_CANNOT_ENTER_CYBERCADE_ROOM_ROUTER");
        finishRoute(route);
        return clone(route);
      }

      if (request.unsafe_request) {
        route.status = "blocked";
        route.room_state = "blocked_unsafe";
        route.result = buildBlockedResult("UNSAFE_GAME_ROOM_REQUEST_BLOCKED");
        finishRoute(route);
        return clone(route);
      }

      if (!request.game_name || !GAME_NAMES.includes(request.game_name)) {
        route.status = "blocked";
        route.room_state = "blocked_unknown_game";
        route.result = buildBlockedResult("UNKNOWN_CYBERCADE_GAME");
        finishRoute(route);
        return clone(route);
      }

      if (!request.action || !ROOM_ACTIONS.includes(request.action)) {
        route.status = "blocked";
        route.room_state = "blocked_unknown_action";
        route.result = buildBlockedResult("UNKNOWN_CYBERCADE_ROOM_ACTION");
        finishRoute(route);
        return clone(route);
      }

      if (request.game_name === "pixelprix") {
        applyPixelPrixRoute(route, request, deps);
        finishRoute(route);
        return clone(route);
      }

      route.status = "blocked";
      route.room_state = "blocked_unknown_game";
      route.result = buildBlockedResult("UNKNOWN_CYBERCADE_GAME");
      finishRoute(route);
      return clone(route);
    } catch (error) {
      route.status = "failed";
      route.room_state = "failed";
      route.error = {
        name: error && error.name ? error.name : "Error",
        message: error && error.message ? error.message : "UNKNOWN_ERROR",
      };
      finishRoute(route);
      return clone(route);
    }
  }

  function applyPixelPrixRoute(route, request, deps) {
    if (request.action === "open_room") {
      route.status = "completed";
      route.room_state = "room_open";
      route.result = buildRoomOpenResult(request);
      return;
    }

    if (request.action === "start_game") {
      route.status = "completed";
      route.room_state = "game_ready";
      route.result = buildGameReadyResult(request);
      return;
    }

    if (request.action === "status") {
      route.status = "completed";
      route.room_state = "status_ready";
      route.result = buildStatusResult(request);
      return;
    }

    if (request.action === "create_overlay_session") {
      requireOverlayRouter(deps.pixelprix_overlay_router);
      route.result = deps.pixelprix_overlay_router.createOverlaySession(request.payload);
      route.status = "completed";
      route.room_state = "overlay_session_created";
      return;
    }

    if (request.action === "add_cleanup_target") {
      requireOverlayRouter(deps.pixelprix_overlay_router);
      route.result = deps.pixelprix_overlay_router.addCleanupTarget(
        request.payload.session_id,
        request.payload.target
      );
      route.status = "completed";
      route.room_state = "cleanup_target_added";
      return;
    }

    if (request.action === "record_cleanup_click") {
      requireOverlayRouter(deps.pixelprix_overlay_router);
      route.result = deps.pixelprix_overlay_router.recordKidTargetClick(
        request.payload.session_id,
        request.payload.click
      );
      route.status = "completed";
      route.room_state = "cleanup_click_recorded";
      return;
    }

    if (request.action === "parent_confirm_cleanup") {
      requireOverlayRouter(deps.pixelprix_overlay_router);
      route.result = deps.pixelprix_overlay_router.parentConfirmCleanup(
        request.payload.session_id,
        request.payload.confirmation
      );
      route.status = "completed";
      route.room_state = "cleanup_parent_confirmed";
      return;
    }

    if (request.action === "open_spot_difference") {
      requireOverlayRouter(deps.pixelprix_overlay_router);
      route.result = deps.pixelprix_overlay_router.openSpotDifferenceRound(
        request.payload.session_id,
        request.payload.spot_difference
      );
      route.status = "completed";
      route.room_state = "spot_difference_opened";
      return;
    }

    if (request.action === "add_difference_marker") {
      requireOverlayRouter(deps.pixelprix_overlay_router);
      route.result = deps.pixelprix_overlay_router.addDifferenceMarker(
        request.payload.session_id,
        request.payload.marker
      );
      route.status = "completed";
      route.room_state = "difference_marker_added";
      return;
    }

    if (request.action === "record_difference_click") {
      requireOverlayRouter(deps.pixelprix_overlay_router);
      route.result = deps.pixelprix_overlay_router.recordDifferenceClick(
        request.payload.session_id,
        request.payload.click
      );
      route.status = "completed";
      route.room_state = "difference_click_recorded";
      return;
    }

    if (request.action === "parent_confirm_spot_difference") {
      requireOverlayRouter(deps.pixelprix_overlay_router);
      route.result = deps.pixelprix_overlay_router.parentConfirmSpotDifference(
        request.payload.session_id,
        request.payload.confirmation
      );
      route.status = "completed";
      route.room_state = "spot_difference_parent_confirmed";
      return;
    }

    if (request.action === "run_game_cycle") {
      requirePixelPrixController(deps);
      route.result = deps.pixelprix_controller.runPixelPrixGameCycle(
        request.payload.cycle_input || request.payload,
        {
          signal_router: deps.signal_router,
          progress_ledger: deps.progress_ledger,
          display_receiver: deps.display_receiver,
        }
      );
      route.status = "completed";
      route.room_state = "game_cycle_completed";
      return;
    }

    route.status = "blocked";
    route.room_state = "blocked_unknown_action";
    route.result = buildBlockedResult("UNKNOWN_PIXELPRIX_ACTION");
  }

  function requireOverlayRouter(overlayRouter) {
    if (!overlayRouter) {
      throw new Error("PIXELPRIX_OVERLAY_ROUTER_REQUIRED");
    }

    requireFunction(overlayRouter.createOverlaySession, "OVERLAY_CREATE_SESSION_REQUIRED");
    requireFunction(overlayRouter.addCleanupTarget, "OVERLAY_ADD_CLEANUP_TARGET_REQUIRED");
    requireFunction(overlayRouter.recordKidTargetClick, "OVERLAY_RECORD_KID_TARGET_CLICK_REQUIRED");
    requireFunction(overlayRouter.parentConfirmCleanup, "OVERLAY_PARENT_CONFIRM_CLEANUP_REQUIRED");
    requireFunction(overlayRouter.openSpotDifferenceRound, "OVERLAY_OPEN_SPOT_DIFFERENCE_REQUIRED");
    requireFunction(overlayRouter.addDifferenceMarker, "OVERLAY_ADD_DIFFERENCE_MARKER_REQUIRED");
    requireFunction(overlayRouter.recordDifferenceClick, "OVERLAY_RECORD_DIFFERENCE_CLICK_REQUIRED");
    requireFunction(
      overlayRouter.parentConfirmSpotDifference,
      "OVERLAY_PARENT_CONFIRM_SPOT_DIFFERENCE_REQUIRED"
    );
  }

  function requirePixelPrixController(deps) {
    if (!deps.pixelprix_controller) {
      throw new Error("PIXELPRIX_CONTROLLER_REQUIRED");
    }

    if (!deps.signal_router) {
      throw new Error("KID_CHORE_SIGNAL_ROUTER_REQUIRED");
    }

    if (!deps.progress_ledger) {
      throw new Error("KID_CHORE_PROGRESS_LEDGER_REQUIRED");
    }

    requireFunction(
      deps.pixelprix_controller.runPixelPrixGameCycle,
      "PIXELPRIX_CONTROLLER_RUN_GAME_CYCLE_REQUIRED"
    );
  }

  function buildRoomOpenResult(request) {
    return {
      result_id: makeId("cybercadeRoomOpenResult"),
      state: "room_open",
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      parent_approval: request.parent_approval === true,
      available_games: listGameCatalog(),
      message: "CyberCade room is open. PixelPrix is available.",
      pictures_stay_source: true,
      only_results_move: true,
      chat: "OFF",
      child_identity: "OFF",
      parent_approval_state: "ON",
    };
  }

  function buildGameReadyResult(request) {
    return {
      result_id: makeId("cybercadeGameReadyResult"),
      state: "game_ready",
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      game_structure: "two_games_in_one_same_game",
      game_parts: [
        "Clean Up",
        "Spot the Difference",
      ],
      parent_flow: [
        "take close-up item pictures",
        "step back and take dirty-room game board picture",
        "build cleanup target overlay",
        "kid plays cleanup",
        "parent checks",
        "add clean-room or treat-ready result picture",
        "ask: Can you spot the difference?",
        "reward unlocks with parent approval",
      ],
      message: "PixelPrix is ready.",
      pictures_stay_source: true,
      only_results_move: true,
      teach_the_difference: true,
      no_shame: true,
    };
  }

  function buildStatusResult(request) {
    return {
      result_id: makeId("cybercadeStatusResult"),
      state: "status_ready",
      department: "CyberCare",
      room: "CyberCade",
      game_name: request.game_name || "PixelPrix",
      action: request.action,
      room_states: clone(ROOM_STATES),
      room_actions: clone(ROOM_ACTIONS),
      game_catalog: listGameCatalog(),
      pictures_stay_source: true,
      only_results_move: true,
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
    };
  }

  function buildBlockedResult(reason) {
    return {
      result_id: makeId("cybercadeBlockedResult"),
      blocked: true,
      reason,
      pictures_stay_source: true,
      only_results_move: true,
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      no_shame: true,
    };
  }

  function finishRoute(route) {
    route.completed_at = now();
    route.share_safe_summary = buildShareSafeSummary(route);
    route.paper_ladder_row = buildPaperLadderRow(route);
    routes.push(clone(route));
  }

  function buildShareSafeSummary(route) {
    return {
      share_safe_summary_id: makeId("cybercadeRoomShareSafeSummary"),
      prepared_at: now(),
      route_id: route.route_id,
      department: "CyberCare",
      room: "CyberCade",
      game_name: route.game_name,
      action: route.action,
      status: route.status,
      room_state: route.room_state,
      result_state:
        route.result && route.result.state
          ? route.result.state
          : "",
      game_structure:
        route.result && route.result.game_structure
          ? route.result.game_structure
          : "",
      pictures: "SOURCE_ONLY",
      results: "MAY_MOVE",
      raw_pictures: "DO_NOT_MOVE",
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      no_shame: true,
      no_direct_pvp: true,
      no_exact_location: true,
    };
  }

  function buildPaperLadderRow(route) {
    return {
      row_id: makeId("cybercadeGameRoomPaperRow"),
      route_id: route.route_id,
      request_id: route.request_id,
      department: "CyberCare",
      room: "CyberCade",
      game_name: route.game_name,
      action: route.action,
      status: route.status,
      room_state: route.room_state,
      pictures_stay_source: true,
      only_results_move: true,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      no_shame: true,
      boundary: "CYBERCADE_GAME_ROOM_RESULTS_ONLY_NO_CHILD_IDENTITY_NO_CHAT",
    };
  }

  function buildBoundary() {
    return {
      department: "CyberCare",
      room: "CyberCade",
      game_room_router: true,
      cybercare_owns_department: true,
      cybercade_holds_game_room: true,
      pixelprix_first_game: true,
      pictures_stay_source: true,
      only_results_move: true,
      teach_the_difference: true,
      do_not_shame_child: true,
      parent_approval_required: true,
      parent_attention_required: true,
      chat_off: true,
      child_identity_off: true,
      no_public_child_profile: true,
      no_direct_pvp: true,
      no_exact_location: true,
      no_raw_picture_movement: true,
      no_bathroom_picture: true,
      no_body_tracking: true,
    };
  }

  function buildAllowedOutputs() {
    return {
      room_state: true,
      game_state: true,
      game_catalog: true,
      overlay_result: true,
      target_map_result: true,
      difference_marker_result: true,
      completion_percent: true,
      score: true,
      item_count: true,
      spotted_count: true,
      reward_ready: true,
      parent_confirmed_result: true,
      share_safe_summary: true,
      paper_ladder_row: true,
      raw_picture: false,
      child_identity: false,
      chat: false,
    };
  }

  function buildBlockedOutputs() {
    return [
      "raw_picture",
      "room_photo",
      "bathroom_photo",
      "body_picture",
      "child_face",
      "child_name",
      "address",
      "school",
      "parent_identity",
      "private_family_detail",
      "kid_chat",
      "direct_message",
      "comments",
      "friend_requests",
      "public_child_profile",
      "exact_location",
      "public_feed",
      "shame_score",
      "punishment_engine",
      "unsafe_chore",
    ];
  }

  function buildRouteNotes(request) {
    const notes = [
      "CyberCare owns the department.",
      "CyberCade holds the game room.",
      "PixelPrix is the first game inside the room.",
      "Teach the difference.",
      "Do not shame the child.",
      "Pictures stay source.",
      "Only results move.",
      "Chat OFF.",
      "Child identity OFF.",
      "Parent approval ON.",
    ];

    if (request.action === "open_spot_difference") {
      notes.push("Ask: Can you spot the difference?");
    }

    if (request.action === "create_overlay_session") {
      notes.push("Close-up item pictures and dirty-room game board stay source-bound.");
    }

    return notes.concat(request.notes || []);
  }

  function listGameCatalog() {
    return [
      {
        game_name: "PixelPrix",
        game_key: "pixelprix",
        department: "CyberCare",
        room: "CyberCade",
        status: "available",
        structure: "two_games_in_one_same_game",
        game_parts: [
          "Clean Up",
          "Spot the Difference",
        ],
        supports: [
          "parent close-up item pictures",
          "dirty-room game board",
          "cleanup target overlay",
          "clean-room result board",
          "treat-ready reward board",
          "spot-the-difference reinforcement",
          "ghost-score competition",
          "routine schedules",
          "potty schedule without pictures",
          "Oops Zone progress",
        ],
        boundaries: {
          pictures_stay_source: true,
          only_results_move: true,
          chat_off: true,
          child_identity_off: true,
          parent_approval_on: true,
          no_direct_pvp: true,
          no_exact_location: true,
          no_shame: true,
        },
      },
    ];
  }

  function listRoomRoutes(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const status = normalizeSafeReference(cleanFilter.status);
    const roomState = normalizeSafeReference(cleanFilter.room_state);
    const gameName = normalizeGameName(cleanFilter.game_name);
    const action = normalizeRoomAction(cleanFilter.action);

    return routes
      .filter((route) => {
        if (status && route.status !== status) {
          return false;
        }

        if (roomState && route.room_state !== roomState) {
          return false;
        }

        if (cleanFilter.game_name && gameName && route.game_name !== gameName) {
          return false;
        }

        if (cleanFilter.action && action && route.action !== action) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestRoomRoute() {
    if (!routes.length) {
      return null;
    }

    return clone(routes[routes.length - 1]);
  }

  function listShareSafeSummaries(filter = {}) {
    return listRoomRoutes(filter)
      .map((route) => route.share_safe_summary)
      .filter(Boolean);
  }

  function listPaperLadderRows(filter = {}) {
    return listRoomRoutes(filter)
      .map((route) => route.paper_ladder_row)
      .filter(Boolean);
  }

  function listRoomActions() {
    return ROOM_ACTIONS.map((action) => {
      return {
        action,
        department: "CyberCare",
        room: "CyberCade",
        pictures_stay_source: true,
        only_results_move: true,
        chat_off: true,
        child_identity_off: true,
        parent_approval_on: true,
        no_shame: true,
      };
    });
  }

  function clearRoomRoutes() {
    routes.length = 0;
    return true;
  }

  return {
    routeGameRoomRequest,
    listGameCatalog,
    listRoomActions,
    listRoomRoutes,
    latestRoomRoute,
    listShareSafeSummaries,
    listPaperLadderRows,
    clearRoomRoutes,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCadeGameRoomRouter;
      }
