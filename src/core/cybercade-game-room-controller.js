// src/core/cybercade-game-room-controller.js
// CyberCrowd Core — CyberCade Game Room Controller
// Department: CyberCare
// Room: CyberCade
// Owns: coordinating CyberCade room requests through the room router,
// room status ledger, NET status receiver, and safe room result return.
// First game/app: PixelPrix.
// Rule: CyberCare owns the department. CyberCade holds the game room.
// PixelPrix is the first game inside the room.
// Teach the difference. Playtime is learn time.
// Do not shame the child.
// Pictures stay source. Only results move.
// Chat OFF. Child identity OFF. Parent approval ON.
// Child-facing surfaces should stay legacy-simple, kid-playable,
// tap/click friendly, non-reading dependent, and learning-first.
// Does not: move raw pictures, expose child identity, publish kid names,
// show child faces, expose address/school/parent identity,
// create child chat, direct message, public child profile,
// shame children, punish children, replace parenting,
// sell child data, make unsafe chores, override parent approval,
// or turn the game room into an adult dashboard maze.

const CyberCadeGameRoomController = (() => {
  const cycles = [];

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

  const CHILD_SURFACE_MODES = [
    "legacy_simple",
    "big_button",
    "icon_voice",
    "no_reading_required",
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

  function normalizeGameName(value) {
    const clean = normalizeText(value).toLowerCase();

    if (GAME_NAMES.includes(clean)) {
      return clean;
    }

    if (clean === "pixel prix" || clean === "pixel_prix") {
      return "pixelprix";
    }

    return "pixelprix";
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

    return "status";
  }

  function normalizePayload(payload = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    return clone(payload);
  }

  function normalizeRoomRequest(request = {}) {
    const cleanRequest =
      request && typeof request === "object" && !Array.isArray(request)
        ? request
        : {};

    return {
      request_id: normalizeSafeReference(cleanRequest.request_id) || makeId("cybercadeRoomRequest"),
      requested_at: normalizeSafeReference(cleanRequest.requested_at) || now(),
      department: "CyberCare",
      room: "CyberCade",
      game_name: normalizeGameName(cleanRequest.game_name || "pixelprix"),
      action: normalizeRoomAction(cleanRequest.action || cleanRequest.room_action || "status"),
      parent_safe_tag: sanitizeSafeText(cleanRequest.parent_safe_tag),
      household_tag: normalizeSafeReference(cleanRequest.household_tag),
      anonymous_player_tag: sanitizeSafeText(cleanRequest.anonymous_player_tag),
      age_band: normalizeSafeReference(cleanRequest.age_band),
      payload: normalizePayload(cleanRequest.payload),
      parent_approval: cleanRequest.parent_approval !== false,
      parent_attention_required: cleanRequest.parent_attention_required !== false,
      unsafe_request: normalizeBoolean(cleanRequest.unsafe_request),
      child_surface_mode: normalizeChildSurfaceMode(cleanRequest.child_surface_mode),
      legacy_simple: cleanRequest.legacy_simple !== false,
      notes: normalizeList(cleanRequest.notes).map(sanitizeSafeText),
    };
  }

  function normalizeChildSurfaceMode(value) {
    const clean = normalizeText(value).toLowerCase();

    if (CHILD_SURFACE_MODES.includes(clean)) {
      return clean;
    }

    return "legacy_simple";
  }

  function normalizeControllerInput(input = {}) {
    const cleanInput = requireObject(input, "CYBERCADE_GAME_ROOM_CONTROLLER_INPUT_REQUIRED");

    return {
      controller_cycle_id: normalizeSafeReference(cleanInput.controller_cycle_id) || makeId("cybercadeControllerCycle"),
      room_request: normalizeRoomRequest(cleanInput.room_request || cleanInput.request || cleanInput),
      forward_to_net: cleanInput.forward_to_net !== false,
      record_status: cleanInput.record_status !== false,
      return_child_surface: cleanInput.return_child_surface !== false,
      notes: normalizeList(cleanInput.notes).map(sanitizeSafeText),
    };
  }

  function normalizeDependencies(dependencies = {}) {
    const cleanDependencies = requireObject(dependencies, "CYBERCADE_CONTROLLER_DEPENDENCIES_REQUIRED");

    return {
      game_room_router: cleanDependencies.game_room_router,
      status_ledger: cleanDependencies.status_ledger,
      status_receiver: cleanDependencies.status_receiver || null,

      pixelprix_controller: cleanDependencies.pixelprix_controller || null,
      pixelprix_overlay_router: cleanDependencies.pixelprix_overlay_router || null,
      signal_router: cleanDependencies.signal_router || null,
      progress_ledger: cleanDependencies.progress_ledger || null,
      display_receiver: cleanDependencies.display_receiver || null,
    };
  }

  function assertDependencies(dependencies) {
    requireObject(dependencies.game_room_router, "CYBERCADE_GAME_ROOM_ROUTER_REQUIRED");
    requireObject(dependencies.status_ledger, "CYBERCADE_STATUS_LEDGER_REQUIRED");

    requireFunction(
      dependencies.game_room_router.routeGameRoomRequest,
      "CYBERCADE_GAME_ROOM_ROUTER_ROUTE_REQUEST_REQUIRED"
    );

    if (
      typeof dependencies.status_ledger.recordFromRoomRoute !== "function" &&
      typeof dependencies.status_ledger.recordRoomStatus !== "function"
    ) {
      throw new Error("CYBERCADE_STATUS_LEDGER_RECORD_FUNCTION_REQUIRED");
    }

    if (dependencies.status_receiver) {
      requireFunction(
        dependencies.status_receiver.receiveStatus,
        "CYBERCADE_STATUS_RECEIVER_RECEIVE_STATUS_REQUIRED"
      );
    }
  }

  function runCyberCadeGameRoomCycle(input = {}, dependencies = {}) {
    const normalizedInput = normalizeControllerInput(input);
    const normalizedDependencies = normalizeDependencies(dependencies);

    assertDependencies(normalizedDependencies);

    const cycle = {
      cycle_id: normalizedInput.controller_cycle_id,
      started_at: now(),
      status: "started",
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      action: normalizedInput.room_request.action,
      notes: normalizedInput.notes,
      steps: [],
      boundary: buildBoundary(),
      child_surface_rule: buildChildSurfaceRule(),
    };

    try {
      if (containsRawPicture(normalizedInput)) {
        throw new Error("RAW_PICTURE_CANNOT_ENTER_CYBERCADE_CONTROLLER");
      }

      const roomRequest = runStep(cycle, "PREPARE_ROOM_REQUEST", () => {
        return buildSafeRoomRequest(normalizedInput.room_request);
      });

      const roomRoute = runStep(cycle, "ROUTE_CYBERCADE_ROOM_REQUEST", () => {
        return normalizedDependencies.game_room_router.routeGameRoomRequest(
          roomRequest,
          buildRouterDependencies(normalizedDependencies)
        );
      });

      let statusEntry = null;

      if (normalizedInput.record_status) {
        statusEntry = runStep(cycle, "RECORD_CYBERCADE_ROOM_STATUS", () => {
          return recordRoomRouteStatus(normalizedDependencies.status_ledger, roomRoute);
        });
      }

      let netDisplay = null;

      if (normalizedInput.forward_to_net && normalizedDependencies.status_receiver && statusEntry) {
        netDisplay = runStep(cycle, "FORWARD_CYBERCADE_STATUS_TO_NET", () => {
          return normalizedDependencies.status_receiver.receiveStatus(statusEntry);
        });
      }

      const roomResult = runStep(cycle, "BUILD_SAFE_ROOM_RESULT", () => {
        return buildSafeRoomResult(roomRequest, roomRoute, statusEntry, netDisplay, normalizedInput);
      });

      cycle.status = "completed";
      cycle.completed_at = now();
      cycle.room_request = clone(roomRequest);
      cycle.room_route = clone(roomRoute);
      cycle.status_entry = clone(statusEntry);
      cycle.net_display = clone(netDisplay);
      cycle.room_result = clone(roomResult);
      cycle.paper_ladder_row = buildPaperLadderRow(cycle);
      cycle.share_safe_summary = buildShareSafeSummary(cycle);

      cycles.push(clone(cycle));

      return clone(cycle);
    } catch (error) {
      cycle.status = "failed";
      cycle.failed_at = now();
      cycle.error = {
        name: error && error.name ? error.name : "Error",
        message: error && error.message ? error.message : "UNKNOWN_ERROR",
      };
      cycle.paper_ladder_row = buildPaperLadderRow(cycle);
      cycle.share_safe_summary = buildShareSafeSummary(cycle);

      cycles.push(clone(cycle));

      return clone(cycle);
    }
  }

  function runStep(cycle, stepName, callback) {
    const step = {
      step_id: makeId("cybercadeControllerStep"),
      step: stepName,
      started_at: now(),
      status: "started",
    };

    cycle.steps.push(step);

    try {
      const result = callback();

      step.status = "completed";
      step.completed_at = now();
      step.result_summary = summarizeStepResult(result);

      return result;
    } catch (error) {
      step.status = "failed";
      step.failed_at = now();
      step.error = {
        name: error && error.name ? error.name : "Error",
        message: error && error.message ? error.message : "UNKNOWN_ERROR",
      };

      throw error;
    }
  }

  function summarizeStepResult(result) {
    if (!result || typeof result !== "object") {
      return {
        type: typeof result,
      };
    }

    return {
      route_id: normalizeSafeReference(result.route_id),
      entry_id: normalizeSafeReference(result.entry_id),
      display_id: normalizeSafeReference(result.display_id),
      request_id: normalizeSafeReference(result.request_id),
      status: sanitizeSafeText(result.status),
      room_state: sanitizeSafeText(result.room_state),
      status_type: sanitizeSafeText(result.status_type),
      display_state: sanitizeSafeText(result.display_state),
      phase: sanitizeSafeText(result.phase),
      game_name: sanitizeSafeText(result.game_name),
      action: sanitizeSafeText(result.action),
      reward_ready: normalizeBoolean(result.reward_ready),
      pictures_stay_source:
        result.pictures_stay_source === true ||
        result.pictures === "SOURCE_ONLY",
      only_results_move:
        result.only_results_move === true ||
        result.results === "MAY_MOVE",
    };
  }

  function buildSafeRoomRequest(request) {
    return {
      request_id: request.request_id,
      requested_at: request.requested_at,
      department: "CyberCare",
      room: "CyberCade",
      game_name: request.game_name,
      action: request.action,
      parent_safe_tag: request.parent_safe_tag,
      household_tag: request.household_tag,
      anonymous_player_tag: request.anonymous_player_tag,
      age_band: request.age_band,
      payload: clone(request.payload),
      parent_approval: request.parent_approval,
      parent_attention_required: request.parent_attention_required,
      unsafe_request: request.unsafe_request,
      child_surface_mode: request.child_surface_mode,
      legacy_simple: request.legacy_simple,
      notes: buildRequestNotes(request),
    };
  }

  function buildRequestNotes(request) {
    return [
      "CyberCare owns the department.",
      "CyberCade holds the game room.",
      "PixelPrix is the first game inside the room.",
      "Teach the difference.",
      "Playtime is learn time.",
      "Do not shame the child.",
      "Pictures stay source.",
      "Only results move.",
      "Chat OFF.",
      "Child identity OFF.",
      "Parent approval ON.",
      request.legacy_simple ? "Child surface should stay legacy-simple." : "",
    ].filter(Boolean).concat(request.notes || []);
  }

  function buildRouterDependencies(dependencies) {
    return {
      pixelprix_controller: dependencies.pixelprix_controller,
      pixelprix_overlay_router: dependencies.pixelprix_overlay_router,
      signal_router: dependencies.signal_router,
      progress_ledger: dependencies.progress_ledger,
      display_receiver: dependencies.display_receiver,
    };
  }

  function recordRoomRouteStatus(statusLedger, roomRoute) {
    if (typeof statusLedger.recordFromRoomRoute === "function") {
      return statusLedger.recordFromRoomRoute(roomRoute);
    }

    return statusLedger.recordRoomStatus({
      room_route: roomRoute,
      route_id: roomRoute.route_id,
      request_id: roomRoute.request_id,
      game_name: roomRoute.game_name,
      action: roomRoute.action,
      room_state: roomRoute.room_state,
      source: "cybercade_game_room_controller",
    });
  }

  function buildSafeRoomResult(roomRequest, roomRoute, statusEntry, netDisplay, input) {
    const statusSummary =
      statusEntry && statusEntry.share_safe_summary
        ? statusEntry.share_safe_summary
        : null;

    const netSummary =
      netDisplay && netDisplay.share_safe_summary
        ? netDisplay.share_safe_summary
        : null;

    return {
      result_id: makeId("cybercadeControllerSafeRoomResult"),
      created_at: now(),
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      action: roomRequest.action,
      request_id: roomRequest.request_id,
      route_id: roomRoute && roomRoute.route_id ? roomRoute.route_id : "",
      entry_id: statusEntry && statusEntry.entry_id ? statusEntry.entry_id : "",
      display_id: netDisplay && netDisplay.display_id ? netDisplay.display_id : "",
      controller_state: deriveControllerState(roomRoute, statusEntry, netDisplay),
      room_state: roomRoute && roomRoute.room_state ? roomRoute.room_state : "unknown",
      status_type: statusEntry && statusEntry.status_type ? statusEntry.status_type : "unknown",
      display_state: netDisplay && netDisplay.display_state ? netDisplay.display_state : "",
      message: buildControllerMessage(roomRequest, roomRoute, statusEntry),
      child_surface:
        input.return_child_surface
          ? buildLegacyChildSurface(roomRequest, roomRoute, statusEntry, netDisplay)
          : null,
      parent_surface: buildParentSurface(roomRequest, roomRoute, statusEntry, netDisplay),
      share_safe_summary: netSummary || statusSummary || buildFallbackSummary(roomRequest, roomRoute),
      pictures: "SOURCE_ONLY",
      results: "MAY_MOVE",
      raw_pictures: "DO_NOT_MOVE",
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      teach_the_difference: true,
      playtime_is_learn_time: true,
      no_shame: true,
    };
  }

  function deriveControllerState(roomRoute, statusEntry, netDisplay) {
    if (roomRoute && roomRoute.status === "blocked") {
      return "blocked";
    }

    if (roomRoute && roomRoute.status === "failed") {
      return "failed";
    }

    if (statusEntry && statusEntry.status_type === "reward_ready") {
      return "reward_ready";
    }

    if (netDisplay && netDisplay.display_state) {
      return "display_ready";
    }

    if (statusEntry && statusEntry.status_type) {
      return "status_recorded";
    }

    if (roomRoute && roomRoute.room_state) {
      return "routed";
    }

    return "unknown";
  }

  function buildControllerMessage(roomRequest, roomRoute, statusEntry) {
    if (roomRoute && roomRoute.status === "blocked") {
      return "CyberCade request blocked safely.";
    }

    if (roomRoute && roomRoute.status === "failed") {
      return "CyberCade request failed safely.";
    }

    if (statusEntry && statusEntry.status_type === "reward_ready") {
      return "Reward ready with parent approval.";
    }

    if (roomRequest.action === "open_room") {
      return "CyberCade room opened.";
    }

    if (roomRequest.action === "start_game") {
      return "PixelPrix is ready.";
    }

    if (roomRequest.action === "create_overlay_session") {
      return "PixelPrix setup ready. Pictures stay source.";
    }

    if (roomRequest.action === "record_cleanup_click") {
      return "Clean Up result recorded.";
    }

    if (roomRequest.action === "open_spot_difference") {
      return "Spot the Difference opened.";
    }

    if (roomRequest.action === "record_difference_click") {
      return "Spot the Difference result recorded.";
    }

    return "CyberCade room cycle completed.";
  }

  function buildLegacyChildSurface(roomRequest, roomRoute, statusEntry, netDisplay) {
    const surfaceState =
      netDisplay && netDisplay.display_state
        ? netDisplay.display_state
        : roomRoute && roomRoute.room_state
          ? roomRoute.room_state
          : "unknown";

    return {
      surface_id: makeId("cybercadeLegacyChildSurface"),
      created_at: now(),
      surface_type: "legacy_simple_child_game_surface",
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      surface_state: surfaceState,
      design_rule: "Can a kid understand it in 3 seconds?",
      reading_required: false,
      big_buttons: true,
      big_icons: true,
      voice_help: true,
      one_action_at_a_time: true,
      no_dashboard_maze: true,
      prompt: deriveChildPrompt(roomRequest, roomRoute, statusEntry),
      primary_button: derivePrimaryButton(roomRequest, roomRoute, statusEntry),
      helper_lines: deriveHelperLines(roomRequest, roomRoute, statusEntry),
      game_parts: [
        {
          name: "Clean Up",
          kid_line: "Find it. Tap it. Put it away.",
        },
        {
          name: "Spot the Difference",
          kid_line: "Can you spot the difference?",
        },
      ],
      safety: {
        pictures: "SOURCE_ONLY",
        results: "MAY_MOVE",
        chat: "OFF",
        child_identity: "OFF",
        parent_approval: "ON",
        no_shame: true,
      },
    };
  }

  function deriveChildPrompt(roomRequest, roomRoute, statusEntry) {
    const statusType = statusEntry && statusEntry.status_type ? statusEntry.status_type : "";

    if (roomRequest.action === "open_room") {
      return "Ready to play?";
    }

    if (roomRequest.action === "start_game") {
      return "Pick a game.";
    }

    if (
      roomRequest.action === "create_overlay_session" ||
      statusType === "cleanup_active"
    ) {
      return "Find it. Tap it. Put it away.";
    }

    if (roomRequest.action === "open_spot_difference" || statusType === "spot_difference_active") {
      return "Can you spot the difference?";
    }

    if (statusType === "reward_ready") {
      return "Great job. Parent checks the reward.";
    }

    if (roomRoute && roomRoute.status === "blocked") {
      return "Ask parent for help.";
    }

    return "Playtime is learn time.";
  }

  function derivePrimaryButton(roomRequest, roomRoute, statusEntry) {
    const statusType = statusEntry && statusEntry.status_type ? statusEntry.status_type : "";

    if (roomRequest.action === "open_room") {
      return "PLAY";
    }

    if (roomRequest.action === "start_game") {
      return "START";
    }

    if (
      roomRequest.action === "create_overlay_session" ||
      statusType === "cleanup_active"
    ) {
      return "TAP ITEM";
    }

    if (roomRequest.action === "open_spot_difference" || statusType === "spot_difference_active") {
      return "SPOT IT";
    }

    if (statusType === "reward_ready") {
      return "PARENT CHECK";
    }

    if (roomRoute && roomRoute.status === "blocked") {
      return "HELP";
    }

    return "OK";
  }

  function deriveHelperLines(roomRequest, roomRoute, statusEntry) {
    const lines = [
      "Big buttons.",
      "Big icons.",
      "No reading required.",
    ];

    const statusType = statusEntry && statusEntry.status_type ? statusEntry.status_type : "";

    if (statusType === "reward_ready") {
      lines.push("Parent approval unlocks reward.");
    } else if (roomRequest.action === "open_spot_difference") {
      lines.push("Look at what changed.");
      lines.push("Clean looks different than dirty.");
    } else {
      lines.push("One thing at a time.");
    }

    if (roomRoute && roomRoute.status === "blocked") {
      lines.push("Nothing bad. Ask parent.");
    }

    return lines;
  }

  function buildParentSurface(roomRequest, roomRoute, statusEntry, netDisplay) {
    return {
      surface_id: makeId("cybercadeParentSurface"),
      created_at: now(),
      surface_type: "parent_control_surface",
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      action: roomRequest.action,
      room_state: roomRoute && roomRoute.room_state ? roomRoute.room_state : "unknown",
      status_type: statusEntry && statusEntry.status_type ? statusEntry.status_type : "unknown",
      display_state: netDisplay && netDisplay.display_state ? netDisplay.display_state : "",
      parent_controls: [
        "open room",
        "start game",
        "confirm cleanup",
        "open spot the difference",
        "confirm reward",
      ],
      parent_rules: [
        "Parent approval stays on.",
        "Parent attention closes the loop.",
        "Do not shame the child.",
        "Pictures stay source.",
        "Only results move.",
      ],
    };
  }

  function buildFallbackSummary(roomRequest, roomRoute) {
    return {
      share_safe_summary_id: makeId("cybercadeControllerFallbackSummary"),
      prepared_at: now(),
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      action: roomRequest.action,
      room_state: roomRoute && roomRoute.room_state ? roomRoute.room_state : "unknown",
      pictures: "SOURCE_ONLY",
      results: "MAY_MOVE",
      raw_pictures: "DO_NOT_MOVE",
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      teach_the_difference: true,
      playtime_is_learn_time: true,
      no_shame: true,
    };
  }

  function buildShareSafeSummary(cycle) {
    return {
      share_safe_summary_id: makeId("cybercadeControllerShareSafeSummary"),
      prepared_at: now(),
      cycle_id: cycle.cycle_id,
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      action: cycle.action,
      status: cycle.status,
      room_state:
        cycle.room_route && cycle.room_route.room_state
          ? cycle.room_route.room_state
          : "",
      status_type:
        cycle.status_entry && cycle.status_entry.status_type
          ? cycle.status_entry.status_type
          : "",
      display_state:
        cycle.net_display && cycle.net_display.display_state
          ? cycle.net_display.display_state
          : "",
      controller_state:
        cycle.room_result && cycle.room_result.controller_state
          ? cycle.room_result.controller_state
          : "",
      pictures: "SOURCE_ONLY",
      results: "MAY_MOVE",
      raw_pictures: "DO_NOT_MOVE",
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      teach_the_difference: true,
      playtime_is_learn_time: true,
      no_shame: true,
    };
  }

  function buildPaperLadderRow(cycle) {
    return {
      row_id: makeId("cybercadeControllerPaperRow"),
      cycle_id: cycle.cycle_id,
      started_at: cycle.started_at,
      completed_at: cycle.completed_at || "",
      status: cycle.status,
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      action: cycle.action,
      room_state:
        cycle.room_route && cycle.room_route.room_state
          ? cycle.room_route.room_state
          : "",
      status_type:
        cycle.status_entry && cycle.status_entry.status_type
          ? cycle.status_entry.status_type
          : "",
      display_state:
        cycle.net_display && cycle.net_display.display_state
          ? cycle.net_display.display_state
          : "",
      pictures_stay_source: true,
      only_results_move: true,
      teach_the_difference: true,
      playtime_is_learn_time: true,
      no_shame: true,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      boundary: "CYBERCADE_GAME_ROOM_CONTROLLER_RESULTS_ONLY_LEGACY_SIMPLE_CHILD_SURFACE",
    };
  }

  function buildBoundary() {
    return {
      department: "CyberCare",
      room: "CyberCade",
      controller: true,
      cybercare_owns_department: true,
      cybercade_holds_game_room: true,
      pixelprix_first_game: true,
      teach_the_difference: true,
      playtime_is_learn_time: true,
      do_not_shame_child: true,
      pictures_stay_source: true,
      only_results_move: true,
      raw_pictures_move: false,
      public_pictures_allowed: false,
      competition_pictures_allowed: false,
      parent_approval_required: true,
      parent_attention_required: true,
      chat_off: true,
      child_identity_off: true,
      no_public_child_profile: true,
      no_direct_pvp: true,
      no_exact_location: true,
      no_bathroom_picture: true,
      no_body_tracking: true,
      no_shame: true,
      legacy_simple_child_surface: true,
      no_adult_dashboard_maze_for_child: true,
    };
  }

  function buildChildSurfaceRule() {
    return {
      legacy_simple: true,
      kid_playable: true,
      learning_first: true,
      reading_required: false,
      big_buttons: true,
      big_icons: true,
      voice_help: true,
      one_action_at_a_time: true,
      can_a_kid_understand_it_in_3_seconds: true,
      can_a_parent_run_it_without_instructions: true,
      can_it_teach_without_shame: true,
    };
  }

  function buildControllerStatusCard() {
    return {
      card_id: makeId("cybercadeControllerStatusCard"),
      created_at: now(),
      department: "CyberCare",
      room: "CyberCade",
      title: "CYBERCADE CONTROLLER",
      stack: [
        "room request",
        "CyberCade router",
        "status ledger records",
        "NET receiver displays",
        "safe room result returns",
      ],
      standing_rule: [
        "Teach the difference.",
        "Playtime is learn time.",
        "Do not shame the child.",
        "Pictures stay source.",
        "Only results move.",
        "Chat OFF.",
        "Child identity OFF.",
        "Parent approval ON.",
      ],
      child_surface: buildChildSurfaceRule(),
    };
  }

  function openCyberCadeRoom(payload = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "open_room",
        game_name: "pixelprix",
        payload,
      },
    }, dependencies);
  }

  function startPixelPrix(payload = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "start_game",
        game_name: "pixelprix",
        payload,
      },
    }, dependencies);
  }

  function createPixelPrixOverlaySession(payload = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "create_overlay_session",
        game_name: "pixelprix",
        payload,
      },
    }, dependencies);
  }

  function recordCleanupClick(sessionId, click = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "record_cleanup_click",
        game_name: "pixelprix",
        payload: {
          session_id: normalizeSafeReference(sessionId),
          click,
        },
      },
    }, dependencies);
  }

  function parentConfirmCleanup(sessionId, confirmation = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "parent_confirm_cleanup",
        game_name: "pixelprix",
        payload: {
          session_id: normalizeSafeReference(sessionId),
          confirmation,
        },
      },
    }, dependencies);
  }

  function openSpotDifference(sessionId, spotDifference = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "open_spot_difference",
        game_name: "pixelprix",
        payload: {
          session_id: normalizeSafeReference(sessionId),
          spot_difference: spotDifference,
        },
      },
    }, dependencies);
  }

  function recordDifferenceClick(sessionId, click = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "record_difference_click",
        game_name: "pixelprix",
        payload: {
          session_id: normalizeSafeReference(sessionId),
          click,
        },
      },
    }, dependencies);
  }

  function parentConfirmSpotDifference(sessionId, confirmation = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "parent_confirm_spot_difference",
        game_name: "pixelprix",
        payload: {
          session_id: normalizeSafeReference(sessionId),
          confirmation,
        },
      },
    }, dependencies);
  }

  function getCyberCadeStatus(payload = {}, dependencies = {}) {
    return runCyberCadeGameRoomCycle({
      room_request: {
        action: "status",
        game_name: "pixelprix",
        payload,
      },
    }, dependencies);
  }

  function listCycles(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const status = normalizeSafeReference(cleanFilter.status);
    const action = normalizeRoomAction(cleanFilter.action);
    const roomState = normalizeSafeReference(cleanFilter.room_state);
    const displayState = normalizeSafeReference(cleanFilter.display_state);

    return cycles
      .filter((cycle) => {
        if (status && cycle.status !== status) {
          return false;
        }

        if (cleanFilter.action && action && cycle.action !== action) {
          return false;
        }

        if (
          roomState &&
          cycle.room_route &&
          cycle.room_route.room_state !== roomState
        ) {
          return false;
        }

        if (
          displayState &&
          cycle.net_display &&
          cycle.net_display.display_state !== displayState
        ) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestCycle() {
    if (!cycles.length) {
      return null;
    }

    return clone(cycles[cycles.length - 1]);
  }

  function listShareSafeSummaries(filter = {}) {
    return listCycles(filter)
      .map((cycle) => cycle.share_safe_summary)
      .filter(Boolean);
  }

  function listPaperLadderRows(filter = {}) {
    return listCycles(filter)
      .map((cycle) => cycle.paper_ladder_row)
      .filter(Boolean);
  }

  function listChildSurfaces(filter = {}) {
    return listCycles(filter)
      .map((cycle) => {
        if (
          cycle.room_result &&
          cycle.room_result.child_surface
        ) {
          return cycle.room_result.child_surface;
        }

        return null;
      })
      .filter(Boolean);
  }

  function clearCycles() {
    cycles.length = 0;
    return true;
  }

  return {
    runCyberCadeGameRoomCycle,
    openCyberCadeRoom,
    startPixelPrix,
    createPixelPrixOverlaySession,
    recordCleanupClick,
    parentConfirmCleanup,
    openSpotDifference,
    recordDifferenceClick,
    parentConfirmSpotDifference,
    getCyberCadeStatus,
    buildControllerStatusCard,
    listCycles,
    latestCycle,
    listShareSafeSummaries,
    listPaperLadderRows,
    listChildSurfaces,
    clearCycles,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCadeGameRoomController;
      }
