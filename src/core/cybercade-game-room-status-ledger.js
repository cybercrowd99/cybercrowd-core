// src/core/cybercade-game-room-status-ledger.js
// CyberCrowd Core — CyberCade Game Room Status Ledger
// Department: CyberCare
// Room: CyberCade
// Owns: recording CyberCade room/game states, PixelPrix room status,
// share-safe status summaries, display-safe game cards, and paper ladder rows.
// Rule: CyberCare owns the department. CyberCade holds the game room.
// PixelPrix is the first game inside the room.
// Teach the difference. Do not shame the child.
// Pictures stay source. Only results move.
// Does not: move raw pictures, expose child identity, publish kid names,
// show child faces, expose address/school/parent identity,
// create child chat, direct message, public child profile,
// shame children, punish children, replace parenting,
// sell child data, make unsafe chores, or run games outside parent approval.

const CyberCadeGameRoomStatusLedger = (() => {
  const entries = [];

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
    "completed",
    "failed",
    "unknown",
  ];

  const STATUS_TYPES = [
    "room_opened",
    "game_started",
    "overlay_session_created",
    "cleanup_active",
    "cleanup_waiting_parent",
    "cleanup_confirmed",
    "spot_difference_active",
    "spot_difference_waiting_parent",
    "spot_difference_confirmed",
    "reward_ready",
    "blocked",
    "completed",
    "failed",
    "status_ready",
    "unknown",
  ];

  const GAME_NAMES = [
    "PixelPrix",
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

  function normalizeRoomState(value) {
    const clean = normalizeText(value).toLowerCase();

    if (ROOM_STATES.includes(clean)) {
      return clean;
    }

    return "unknown";
  }

  function normalizeStatusType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (STATUS_TYPES.includes(clean)) {
      return clean;
    }

    return "unknown";
  }

  function normalizeGameName(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return "PixelPrix";
    }

    const lower = clean.toLowerCase();

    if (lower === "pixelprix" || lower === "pixel prix" || lower === "pixel_prix") {
      return "PixelPrix";
    }

    if (GAME_NAMES.includes(clean)) {
      return clean;
    }

    return sanitizeSafeText(clean);
  }

  function normalizeRoomRoute(route = {}) {
    if (!route || typeof route !== "object" || Array.isArray(route)) {
      return null;
    }

    return {
      route_id: normalizeSafeReference(route.route_id),
      request_id: normalizeSafeReference(route.request_id),
      routed_at: normalizeSafeReference(route.routed_at),
      completed_at: normalizeSafeReference(route.completed_at),
      status: normalizeSafeReference(route.status),
      room_state: normalizeRoomState(route.room_state),
      department: "CyberCare",
      room: "CyberCade",
      game_name: normalizeGameName(route.game_name),
      action: sanitizeSafeText(route.action),
      result_state:
        route.result && route.result.state
          ? sanitizeSafeText(route.result.state)
          : "",
      result_summary: summarizeRouteResult(route.result),
      share_safe_summary: route.share_safe_summary ? clone(route.share_safe_summary) : null,
      paper_ladder_row: route.paper_ladder_row ? clone(route.paper_ladder_row) : null,
    };
  }

  function summarizeRouteResult(result) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return {
        state: "",
        game_structure: "",
        phase: "",
        reward_ready: false,
      };
    }

    return {
      state: sanitizeSafeText(result.state),
      game_structure: sanitizeSafeText(result.game_structure),
      phase: sanitizeSafeText(result.phase),
      mode: sanitizeSafeText(result.mode),
      cleanup_target_count: normalizeNumber(result.cleanup_target_count, 0),
      cleanup_completed_count: normalizeNumber(result.cleanup_completed_count, 0),
      cleanup_completion_percent: normalizeNumber(result.cleanup_completion_percent, 0),
      difference_marker_count: normalizeNumber(result.difference_marker_count, 0),
      difference_spotted_count: normalizeNumber(result.difference_spotted_count, 0),
      difference_completion_percent: normalizeNumber(result.difference_completion_percent, 0),
      reward_ready: normalizeBoolean(result.reward_ready),
      parent_confirmed_cleanup: normalizeBoolean(result.parent_confirmed_cleanup),
      parent_confirmed_spot_difference: normalizeBoolean(result.parent_confirmed_spot_difference),
    };
  }

  function normalizeStatusInput(input = {}) {
    const cleanInput = requireObject(input, "CYBERCADE_GAME_ROOM_STATUS_INPUT_REQUIRED");
    const roomRoute = normalizeRoomRoute(cleanInput.room_route || cleanInput.route);

    if (containsRawPicture(cleanInput)) {
      return {
        raw_picture_blocked: true,
        room_route: roomRoute,
        room_state: "blocked_raw_picture",
        status_type: "blocked",
        status_message: "Raw picture blocked. Pictures stay source. Only results move.",
        source: "ledger_guard",
        payload: {},
      };
    }

    const roomState = normalizeRoomState(
      cleanInput.room_state ||
      (roomRoute && roomRoute.room_state) ||
      "unknown"
    );

    return {
      raw_picture_blocked: false,
      room_route: roomRoute,
      source: sanitizeSafeText(cleanInput.source) || "cybercade_room_router",
      room_state: roomState,
      status_type: normalizeStatusType(cleanInput.status_type) || deriveStatusType(roomState),
      status_message: sanitizeSafeText(cleanInput.status_message),
      game_name: normalizeGameName(
        cleanInput.game_name ||
        (roomRoute && roomRoute.game_name) ||
        "PixelPrix"
      ),
      action: sanitizeSafeText(cleanInput.action || (roomRoute && roomRoute.action)),
      session_id: normalizeSafeReference(cleanInput.session_id),
      route_id:
        normalizeSafeReference(cleanInput.route_id) ||
        (roomRoute && roomRoute.route_id) ||
        "",
      request_id:
        normalizeSafeReference(cleanInput.request_id) ||
        (roomRoute && roomRoute.request_id) ||
        "",
      overlay_session_id: normalizeSafeReference(cleanInput.overlay_session_id),
      parent_safe_tag: sanitizeSafeText(cleanInput.parent_safe_tag),
      household_tag: normalizeSafeReference(cleanInput.household_tag),
      anonymous_player_tag: sanitizeSafeText(cleanInput.anonymous_player_tag),
      status_payload: normalizeStatusPayload(cleanInput.status_payload || cleanInput.payload || {}),
      notes: normalizeList(cleanInput.notes).map(sanitizeSafeText),
    };
  }

  function normalizeStatusPayload(payload = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    return clone(payload);
  }

  function deriveStatusType(roomState) {
    if (roomState === "room_open") {
      return "room_opened";
    }

    if (roomState === "game_ready") {
      return "game_started";
    }

    if (roomState === "overlay_session_created") {
      return "overlay_session_created";
    }

    if (
      roomState === "cleanup_target_added" ||
      roomState === "cleanup_click_recorded"
    ) {
      return "cleanup_active";
    }

    if (roomState === "cleanup_parent_confirmed") {
      return "cleanup_confirmed";
    }

    if (
      roomState === "spot_difference_opened" ||
      roomState === "difference_marker_added" ||
      roomState === "difference_click_recorded"
    ) {
      return "spot_difference_active";
    }

    if (roomState === "spot_difference_parent_confirmed") {
      return "reward_ready";
    }

    if (roomState === "game_cycle_completed") {
      return "completed";
    }

    if (roomState === "status_ready") {
      return "status_ready";
    }

    if (roomState.startsWith("blocked_")) {
      return "blocked";
    }

    if (roomState === "failed") {
      return "failed";
    }

    return "unknown";
  }

  function recordRoomStatus(input = {}) {
    const normalized = normalizeStatusInput(input);

    const entry = {
      entry_id: makeId("cybercadeRoomStatusEntry"),
      recorded_at: now(),
      department: "CyberCare",
      room: "CyberCade",
      game_name: normalized.game_name || "PixelPrix",
      source: normalized.source,
      route_id: normalized.route_id,
      request_id: normalized.request_id,
      session_id: normalized.session_id,
      overlay_session_id: normalized.overlay_session_id,
      action: normalized.action,
      room_state: normalized.room_state,
      status_type:
        normalized.status_type === "unknown"
          ? deriveStatusType(normalized.room_state)
          : normalized.status_type,
      status_message: normalized.status_message || buildStatusMessage(normalized),
      parent_safe_tag: normalized.parent_safe_tag,
      household_tag: normalized.household_tag,
      anonymous_player_tag: normalized.anonymous_player_tag,
      room_route: normalized.room_route,
      status_payload: buildSafeStatusPayload(normalized),
      state_flags: buildStateFlags(normalized),
      share_safe_summary: null,
      game_room_status_card: null,
      paper_ladder_row: null,
      boundary: buildBoundary(),
      allowed_outputs: buildAllowedOutputs(),
      blocked_outputs: buildBlockedOutputs(),
      notes: buildEntryNotes(normalized),
    };

    entry.share_safe_summary = buildShareSafeSummary(entry);
    entry.game_room_status_card = buildGameRoomStatusCard(entry);
    entry.paper_ladder_row = buildPaperLadderRow(entry);

    entries.push(clone(entry));

    return clone(entry);
  }

  function recordFromRoomRoute(roomRoute = {}) {
    return recordRoomStatus({
      room_route: roomRoute,
      route_id: roomRoute.route_id,
      request_id: roomRoute.request_id,
      game_name: roomRoute.game_name,
      action: roomRoute.action,
      room_state: roomRoute.room_state,
      source: "cybercade_game_room_router",
    });
  }

  function buildSafeStatusPayload(normalized) {
    const payload = normalized.status_payload || {};
    const routeResult =
      normalized.room_route && normalized.room_route.result_summary
        ? normalized.room_route.result_summary
        : {};

    return {
      phase: sanitizeSafeText(payload.phase || routeResult.phase),
      mode: sanitizeSafeText(payload.mode || routeResult.mode),
      cleanup_target_count: normalizeNumber(
        payload.cleanup_target_count,
        routeResult.cleanup_target_count || 0
      ),
      cleanup_completed_count: normalizeNumber(
        payload.cleanup_completed_count,
        routeResult.cleanup_completed_count || 0
      ),
      cleanup_completion_percent: normalizeNumber(
        payload.cleanup_completion_percent,
        routeResult.cleanup_completion_percent || 0
      ),
      difference_marker_count: normalizeNumber(
        payload.difference_marker_count,
        routeResult.difference_marker_count || 0
      ),
      difference_spotted_count: normalizeNumber(
        payload.difference_spotted_count,
        routeResult.difference_spotted_count || 0
      ),
      difference_completion_percent: normalizeNumber(
        payload.difference_completion_percent,
        routeResult.difference_completion_percent || 0
      ),
      reward_ready: normalizeBoolean(payload.reward_ready || routeResult.reward_ready),
      parent_confirmed_cleanup: normalizeBoolean(
        payload.parent_confirmed_cleanup || routeResult.parent_confirmed_cleanup
      ),
      parent_confirmed_spot_difference: normalizeBoolean(
        payload.parent_confirmed_spot_difference ||
        routeResult.parent_confirmed_spot_difference
      ),
      reinforcement_question:
        sanitizeSafeText(payload.reinforcement_question) ||
        "Can you spot the difference?",
      teaching_goal: "dirty vs clean",
      pictures: "SOURCE_ONLY",
      results: "MAY_MOVE",
      raw_pictures: "DO_NOT_MOVE",
    };
  }

  function buildStateFlags(normalized) {
    const statusType =
      normalized.status_type === "unknown"
        ? deriveStatusType(normalized.room_state)
        : normalized.status_type;

    return {
      room_opened: statusType === "room_opened",
      game_started: statusType === "game_started",
      overlay_session_created: statusType === "overlay_session_created",
      cleanup_active: statusType === "cleanup_active",
      cleanup_waiting_parent: statusType === "cleanup_waiting_parent",
      cleanup_confirmed: statusType === "cleanup_confirmed",
      spot_difference_active: statusType === "spot_difference_active",
      spot_difference_waiting_parent: statusType === "spot_difference_waiting_parent",
      spot_difference_confirmed: statusType === "spot_difference_confirmed",
      reward_ready: statusType === "reward_ready",
      blocked: statusType === "blocked",
      completed: statusType === "completed",
      failed: statusType === "failed",
      status_ready: statusType === "status_ready",
      pictures_stay_source: true,
      only_results_move: true,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      no_shame: true,
    };
  }

  function buildStatusMessage(normalized) {
    const statusType =
      normalized.status_type === "unknown"
        ? deriveStatusType(normalized.room_state)
        : normalized.status_type;

    if (statusType === "room_opened") {
      return "CyberCade room opened.";
    }

    if (statusType === "game_started") {
      return "PixelPrix game ready.";
    }

    if (statusType === "overlay_session_created") {
      return "PixelPrix overlay session created.";
    }

    if (statusType === "cleanup_active") {
      return "Clean Up game active.";
    }

    if (statusType === "cleanup_confirmed") {
      return "Parent confirmed cleanup.";
    }

    if (statusType === "spot_difference_active") {
      return "Spot the Difference active.";
    }

    if (statusType === "reward_ready") {
      return "Reward ready with parent approval.";
    }

    if (statusType === "blocked") {
      return "CyberCade room request blocked safely.";
    }

    if (statusType === "completed") {
      return "CyberCade game cycle completed.";
    }

    if (statusType === "failed") {
      return "CyberCade room route failed.";
    }

    if (statusType === "status_ready") {
      return "CyberCade room status ready.";
    }

    return "CyberCade room status recorded.";
  }

  function buildShareSafeSummary(entry) {
    return {
      share_safe_summary_id: makeId("cybercadeRoomStatusShareSafeSummary"),
      prepared_at: now(),
      entry_id: entry.entry_id,
      route_id: entry.route_id,
      request_id: entry.request_id,
      department: "CyberCare",
      room: "CyberCade",
      game_name: entry.game_name,
      action: entry.action,
      room_state: entry.room_state,
      status_type: entry.status_type,
      status_message: entry.status_message,
      phase: entry.status_payload.phase,
      mode: entry.status_payload.mode,
      cleanup_target_count: entry.status_payload.cleanup_target_count,
      cleanup_completed_count: entry.status_payload.cleanup_completed_count,
      cleanup_completion_percent: entry.status_payload.cleanup_completion_percent,
      difference_marker_count: entry.status_payload.difference_marker_count,
      difference_spotted_count: entry.status_payload.difference_spotted_count,
      difference_completion_percent: entry.status_payload.difference_completion_percent,
      reward_ready: entry.status_payload.reward_ready,
      reinforcement_question: entry.status_payload.reinforcement_question,
      teaching_goal: "dirty vs clean",
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

  function buildGameRoomStatusCard(entry) {
    return {
      card_id: makeId("cybercadeRoomStatusCard"),
      created_at: now(),
      card_type: "cybercade_game_room_status",
      department: "CyberCare",
      room: "CyberCade",
      title: "CYBERCADE ROOM STATUS",
      game_name: entry.game_name,
      status: entry.status_type,
      room_state: entry.room_state,
      message: entry.status_message,
      game_structure: "two_games_in_one_same_game",
      game_parts: [
        "Clean Up",
        "Spot the Difference",
      ],
      cleanup: {
        target_count: entry.status_payload.cleanup_target_count,
        completed_count: entry.status_payload.cleanup_completed_count,
        completion_percent: entry.status_payload.cleanup_completion_percent,
      },
      spot_the_difference: {
        marker_count: entry.status_payload.difference_marker_count,
        spotted_count: entry.status_payload.difference_spotted_count,
        completion_percent: entry.status_payload.difference_completion_percent,
        reinforcement_question: entry.status_payload.reinforcement_question,
        teaching_goal: "dirty vs clean",
      },
      reward_ready: entry.status_payload.reward_ready,
      safety: {
        pictures: "SOURCE_ONLY",
        results: "MAY_MOVE",
        raw_pictures: "DO_NOT_MOVE",
        chat: "OFF",
        child_identity: "OFF",
        parent_approval: "ON",
        no_shame: true,
      },
    };
  }

  function buildPaperLadderRow(entry) {
    return {
      row_id: makeId("cybercadeRoomStatusPaperRow"),
      entry_id: entry.entry_id,
      recorded_at: entry.recorded_at,
      department: "CyberCare",
      room: "CyberCade",
      game_name: entry.game_name,
      action: entry.action,
      room_state: entry.room_state,
      status_type: entry.status_type,
      cleanup_completion_percent: entry.status_payload.cleanup_completion_percent,
      difference_completion_percent: entry.status_payload.difference_completion_percent,
      reward_ready: entry.status_payload.reward_ready,
      pictures_stay_source: true,
      only_results_move: true,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      no_shame: true,
      boundary: "CYBERCADE_GAME_ROOM_STATUS_LEDGER_RESULTS_ONLY_NO_CHILD_IDENTITY_NO_CHAT",
    };
  }

  function buildBoundary() {
    return {
      department: "CyberCare",
      room: "CyberCade",
      status_ledger: true,
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
      no_shame: true,
    };
  }

  function buildAllowedOutputs() {
    return {
      room_state: true,
      status_type: true,
      status_message: true,
      game_state: true,
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
      game_room_status_card: true,
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

  function buildEntryNotes(normalized) {
    const notes = [
      "CyberCare owns the department.",
      "CyberCade holds the game room.",
      "PixelPrix is the first game inside the room.",
      "Status ledger records room state.",
      "Teach the difference.",
      "Do not shame the child.",
      "Pictures stay source.",
      "Only results move.",
      "Chat OFF.",
      "Child identity OFF.",
      "Parent approval ON.",
    ];

    if (normalized.room_state === "spot_difference_opened") {
      notes.push("Ask: Can you spot the difference?");
    }

    if (normalized.room_state === "blocked_raw_picture") {
      notes.push("Raw picture blocked from ledger movement.");
    }

    return notes.concat(normalized.notes || []);
  }

  function updateRoomStatus(entryId, updates = {}) {
    const cleanEntryId = normalizeSafeReference(entryId);
    const entry = entries.find((item) => item.entry_id === cleanEntryId);

    if (!entry) {
      throw new Error("CYBERCADE_ROOM_STATUS_ENTRY_NOT_FOUND");
    }

    const cleanUpdates =
      updates && typeof updates === "object" && !Array.isArray(updates)
        ? updates
        : {};

    if (containsRawPicture(cleanUpdates)) {
      entry.room_state = "blocked_raw_picture";
      entry.status_type = "blocked";
      entry.status_message = "Raw picture blocked. Pictures stay source. Only results move.";
    } else {
      if (cleanUpdates.room_state) {
        entry.room_state = normalizeRoomState(cleanUpdates.room_state);
      }

      if (cleanUpdates.status_type) {
        entry.status_type = normalizeStatusType(cleanUpdates.status_type);
      }

      if (cleanUpdates.status_message) {
        entry.status_message = sanitizeSafeText(cleanUpdates.status_message);
      }

      if (cleanUpdates.status_payload) {
        entry.status_payload = {
          ...entry.status_payload,
          ...buildSafeStatusPayload({
            status_payload: cleanUpdates.status_payload,
            room_route: entry.room_route,
          }),
        };
      }
    }

    entry.updated_at = now();
    entry.state_flags = buildStateFlags({
      room_state: entry.room_state,
      status_type: entry.status_type,
    });
    entry.share_safe_summary = buildShareSafeSummary(entry);
    entry.game_room_status_card = buildGameRoomStatusCard(entry);
    entry.paper_ladder_row = buildPaperLadderRow(entry);

    return clone(entry);
  }

  function listEntries(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const roomState = normalizeRoomState(cleanFilter.room_state);
    const statusType = normalizeStatusType(cleanFilter.status_type);
    const gameName = normalizeGameName(cleanFilter.game_name);
    const routeId = normalizeSafeReference(cleanFilter.route_id);
    const requestId = normalizeSafeReference(cleanFilter.request_id);

    return entries
      .filter((entry) => {
        if (cleanFilter.room_state && roomState && entry.room_state !== roomState) {
          return false;
        }

        if (cleanFilter.status_type && statusType && entry.status_type !== statusType) {
          return false;
        }

        if (cleanFilter.game_name && gameName && entry.game_name !== gameName) {
          return false;
        }

        if (routeId && entry.route_id !== routeId) {
          return false;
        }

        if (requestId && entry.request_id !== requestId) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestEntry() {
    if (!entries.length) {
      return null;
    }

    return clone(entries[entries.length - 1]);
  }

  function listShareSafeSummaries(filter = {}) {
    return listEntries(filter)
      .map((entry) => entry.share_safe_summary)
      .filter(Boolean);
  }

  function listGameRoomStatusCards(filter = {}) {
    return listEntries(filter)
      .map((entry) => entry.game_room_status_card)
      .filter(Boolean);
  }

  function listPaperLadderRows(filter = {}) {
    return listEntries(filter)
      .map((entry) => entry.paper_ladder_row)
      .filter(Boolean);
  }

  function listStatusTypes() {
    return STATUS_TYPES.map((statusType) => {
      return {
        status_type: statusType,
        pictures_stay_source: true,
        only_results_move: true,
        chat_off: true,
        child_identity_off: true,
        parent_approval_on: true,
        no_shame: true,
      };
    });
  }

  function clearEntries() {
    entries.length = 0;
    return true;
  }

  return {
    recordRoomStatus,
    recordFromRoomRoute,
    updateRoomStatus,
    listEntries,
    latestEntry,
    listShareSafeSummaries,
    listGameRoomStatusCards,
    listPaperLadderRows,
    listStatusTypes,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCadeGameRoomStatusLedger;
    }
