// src/core/pixelprix-touch-target-overlay-router.js
// CyberCrowd Core — PixelPrix Touch Target Overlay Router
// Department: CyberCare
// Room: CyberCade
// Game/App: PixelPrix
// Owns: source-bound picture references, cleanup target overlays,
// close-up assist item targets, dirty-room game boards,
// spot-the-difference overlays, parent confirmations,
// kid click results, and reward-ready result movement.
// Rule: Teach the difference. Do not shame the child.
// Pictures stay source. Only results move.
// PixelPrix is two games in one same game:
// 1) Clean Up.
// 2) Spot the Difference.
// Does not: move raw pictures, expose child identity, publish kid names,
// show child faces, expose address/school/parent identity,
// store raw private room photos, create child chat, direct message,
// public child profile, shame children, punish children,
// replace parenting, sell child data, or make unsafe chores.

const PixelPrixTouchTargetOverlayRouter = (() => {
  const sessions = [];

  const GAME_PHASES = [
    "setup_started",
    "waiting_required_pictures",
    "cleanup_overlay_ready",
    "cleanup_active",
    "cleanup_completed_waiting_parent",
    "spot_difference_ready",
    "spot_difference_active",
    "spot_difference_completed_waiting_parent",
    "reward_ready_parent_approval",
    "blocked_unsafe",
  ];

  const GAME_MODES = [
    "tiny_tidy",
    "mini_pickup",
    "little_racer",
    "room_rally",
    "prix_sprint",
    "big_kid_mode",
  ];

  const OVERLAY_TYPES = [
    "cleanup_target_overlay",
    "spot_difference_overlay",
    "reward_reveal_overlay",
  ];

  const TARGET_SOURCES = [
    "parent_closeup_picture",
    "parent_touch",
    "assist_parent_confirmed",
    "manual_parent_entry",
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

  function assertNoRawPicture(value, errorCode) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (
      value.raw_picture ||
      value.raw_photo ||
      value.raw_image ||
      value.raw_picture_base64 ||
      value.raw_photo_base64 ||
      value.base64 ||
      value.data_url ||
      value.image_bytes ||
      value.file_blob ||
      value.blob ||
      value.buffer
    ) {
      throw new Error(errorCode);
    }
  }

  function normalizeGameMode(value, requiredCount = 0) {
    const clean = normalizeText(value).toLowerCase();

    if (GAME_MODES.includes(clean)) {
      return clean;
    }

    const count = normalizeNumber(requiredCount, 0);

    if (count <= 5) {
      return "tiny_tidy";
    }

    if (count <= 10) {
      return "mini_pickup";
    }

    if (count <= 15) {
      return "little_racer";
    }

    if (count <= 25) {
      return "room_rally";
    }

    if (count <= 34) {
      return "prix_sprint";
    }

    return "big_kid_mode";
  }

  function normalizeOverlayType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (OVERLAY_TYPES.includes(clean)) {
      return clean;
    }

    return "cleanup_target_overlay";
  }

  function normalizeTargetSource(value) {
    const clean = normalizeText(value).toLowerCase();

    if (TARGET_SOURCES.includes(clean)) {
      return clean;
    }

    if (clean === "closeup") {
      return "parent_closeup_picture";
    }

    if (clean === "touch") {
      return "parent_touch";
    }

    if (clean === "assist") {
      return "assist_parent_confirmed";
    }

    return "manual_parent_entry";
  }

  function normalizeSourcePictureRef(value = {}, fallbackType = "source_picture") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        picture_ref_id: "",
        picture_type: fallbackType,
        source_ref: "",
        source_only: true,
        raw_picture_moves: false,
        public_picture_allowed: false,
      };
    }

    assertNoRawPicture(value, "RAW_PICTURE_CANNOT_ENTER_OVERLAY_ROUTER");

    return {
      picture_ref_id: normalizeSafeReference(value.picture_ref_id) || makeId("pixelPrixPictureRef"),
      picture_type: sanitizeSafeText(value.picture_type) || fallbackType,
      source_ref: normalizeSafeReference(value.source_ref),
      local_slot_ref: normalizeSafeReference(value.local_slot_ref),
      safe_label: sanitizeSafeText(value.safe_label),
      parent_confirmed: normalizeBoolean(value.parent_confirmed),
      source_only: true,
      picture_stays_source: true,
      raw_picture_moves: false,
      raw_picture_stored: false,
      public_picture_allowed: false,
      competition_picture_allowed: false,
      chat_picture_allowed: false,
      child_face_required: false,
    };
  }

  function normalizeCloseupPictures(value) {
    return normalizeList(value).map((picture, index) => {
      const ref = normalizeSourcePictureRef(picture, "closeup_item_picture");

      return {
        ...ref,
        closeup_number: normalizeNumber(picture.closeup_number, index + 1),
        item_label: sanitizeSafeText(picture.item_label),
        item_icon: sanitizeSafeText(picture.item_icon),
        pickup_instruction: buildBasicPickupPrompt(picture.pickup_instruction, picture.item_label),
        target_source: "parent_closeup_picture",
        parent_confirmed: picture.parent_confirmed === true,
      };
    });
  }

  function normalizeScreenZone(zone = {}) {
    if (!zone || typeof zone !== "object" || Array.isArray(zone)) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
    }

    return {
      x: normalizeNumber(zone.x, 0),
      y: normalizeNumber(zone.y, 0),
      width: normalizeNumber(zone.width, 0),
      height: normalizeNumber(zone.height, 0),
    };
  }

  function buildBasicPickupPrompt(value, itemLabel) {
    const clean = sanitizeSafeText(value);

    if (clean) {
      return clean;
    }

    const item = sanitizeSafeText(itemLabel) || "item";

    return `Find the ${item}. Tap the ${item}. Put it away.`;
  }

  function buildSpotPrompt(value) {
    const clean = sanitizeSafeText(value);

    if (clean) {
      return clean;
    }

    return "Can you spot the difference?";
  }

  function normalizeRequiredPictureCount(value, fallback = 5) {
    const count = normalizeNumber(value, fallback);

    if (count <= 0) {
      return fallback;
    }

    return Math.round(count);
  }

  function deriveRequiredCountFromMode(mode) {
    if (mode === "tiny_tidy") {
      return 5;
    }

    if (mode === "mini_pickup") {
      return 10;
    }

    if (mode === "little_racer") {
      return 15;
    }

    if (mode === "room_rally") {
      return 20;
    }

    if (mode === "prix_sprint") {
      return 34;
    }

    return 34;
  }

  function createOverlaySession(input = {}) {
    const cleanInput = requireObject(input, "PIXELPRIX_OVERLAY_SESSION_INPUT_REQUIRED");

    const requestedRequiredCount = normalizeRequiredPictureCount(cleanInput.required_picture_count, 5);
    const mode = normalizeGameMode(cleanInput.mode, requestedRequiredCount);
    const requiredPictureCount =
      cleanInput.required_picture_count === undefined
        ? deriveRequiredCountFromMode(mode)
        : requestedRequiredCount;

    const closeupPictures = normalizeCloseupPictures(cleanInput.closeup_item_pictures);
    const dirtyRoomPicture = normalizeSourcePictureRef(cleanInput.dirty_room_picture, "dirty_room_game_board");
    const cleanRoomPicture = normalizeSourcePictureRef(cleanInput.clean_room_picture, "clean_room_result_board");
    const treatPicture = normalizeSourcePictureRef(cleanInput.treat_picture, "treat_reward_board");

    const setupState = deriveSetupState(requiredPictureCount, closeupPictures, dirtyRoomPicture);
    const cleanupTargets = buildCleanupTargets(closeupPictures);

    const session = {
      session_id: makeId("pixelPrixOverlaySession"),
      created_at: now(),
      updated_at: now(),
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      game_structure: "two_games_in_one_same_game",
      phase: setupState,
      mode,
      required_picture_count: requiredPictureCount,
      title: sanitizeSafeText(cleanInput.title) || "PixelPrix Room Reset",
      routine_type: sanitizeSafeText(cleanInput.routine_type) || "room_cleanup",
      closeup_item_pictures: closeupPictures,
      dirty_room_picture: dirtyRoomPicture,
      clean_room_picture: cleanRoomPicture,
      treat_picture: treatPicture,
      cleanup_overlay: buildCleanupOverlay(cleanupTargets, dirtyRoomPicture, mode),
      spot_difference_overlay: buildSpotDifferenceOverlay([], dirtyRoomPicture, cleanRoomPicture, treatPicture),
      reward_overlay: buildRewardOverlay(cleanRoomPicture, treatPicture),
      parent_reinforcement_question: buildSpotPrompt(cleanInput.parent_reinforcement_question),
      parent_confirmed_setup: cleanInput.parent_confirmed_setup === true,
      parent_confirmed_cleanup: false,
      parent_confirmed_spot_difference: false,
      reward_ready: false,
      share_safe_result: null,
      paper_ladder_row: null,
      boundary: buildBoundary(),
      allowed_outputs: buildAllowedOutputs(),
      blocked_outputs: buildBlockedOutputs(),
      notes: buildSessionNotes(),
    };

    session.share_safe_result = buildShareSafeResult(session);
    session.paper_ladder_row = buildPaperLadderRow(session);

    sessions.push(clone(session));

    return clone(session);
  }

  function deriveSetupState(requiredPictureCount, closeupPictures, dirtyRoomPicture) {
    if (!dirtyRoomPicture.source_ref) {
      return "waiting_required_pictures";
    }

    if (closeupPictures.length < requiredPictureCount) {
      return "waiting_required_pictures";
    }

    return "cleanup_overlay_ready";
  }

  function buildCleanupTargets(closeupPictures) {
    return closeupPictures.map((picture, index) => {
      return {
        target_id: makeId("pixelPrixCleanupTarget"),
        target_number: index + 1,
        target_type: "cleanup_item",
        target_source: "parent_closeup_picture",
        source_picture_ref: picture.source_ref,
        source_picture_ref_id: picture.picture_ref_id,
        item_label: picture.item_label || `item ${index + 1}`,
        item_icon: picture.item_icon || "item",
        pickup_instruction: picture.pickup_instruction,
        screen_zone: normalizeScreenZone({}),
        parent_confirmed: picture.parent_confirmed,
        kid_clicked: false,
        kid_completed: false,
        parent_verified_done: false,
        clicked_at: "",
        completed_at: "",
      };
    });
  }

  function buildCleanupOverlay(targets, dirtyRoomPicture, mode) {
    return {
      overlay_id: makeId("pixelPrixCleanupOverlay"),
      overlay_type: "cleanup_target_overlay",
      created_at: now(),
      game_part: "clean_up",
      title: "CLEAN UP",
      board_picture_ref: dirtyRoomPicture.source_ref,
      board_picture_ref_id: dirtyRoomPicture.picture_ref_id,
      board_picture_stays_source: true,
      mode,
      targets: clone(targets),
      target_count: targets.length,
      completed_target_count: 0,
      completion_percent: 0,
      state: targets.length ? "ready" : "waiting_targets",
      voice_prompt: "Find it. Tap it. Put it away.",
      reading_required: false,
      voice_help: true,
      icon_help: true,
    };
  }

  function buildSpotDifferenceOverlay(markers, dirtyRoomPicture, cleanRoomPicture, treatPicture) {
    return {
      overlay_id: makeId("pixelPrixSpotDifferenceOverlay"),
      overlay_type: "spot_difference_overlay",
      created_at: now(),
      game_part: "spot_the_difference",
      title: "SPOT THE DIFFERENCE",
      before_picture_ref: dirtyRoomPicture.source_ref,
      before_picture_ref_id: dirtyRoomPicture.picture_ref_id,
      after_picture_ref: cleanRoomPicture.source_ref,
      after_picture_ref_id: cleanRoomPicture.picture_ref_id,
      treat_picture_ref: treatPicture.source_ref,
      treat_picture_ref_id: treatPicture.picture_ref_id,
      pictures_stay_source: true,
      reinforcement_question: "Can you spot the difference?",
      teaching_goal: "kid learns dirty vs clean",
      markers: clone(markers),
      marker_count: markers.length,
      spotted_count: 0,
      completion_percent: 0,
      state: markers.length ? "ready" : "waiting_difference_markers",
      no_shame: true,
    };
  }

  function buildRewardOverlay(cleanRoomPicture, treatPicture) {
    return {
      overlay_id: makeId("pixelPrixRewardOverlay"),
      overlay_type: "reward_reveal_overlay",
      created_at: now(),
      game_part: "reward_reveal",
      title: "REWARD READY",
      clean_room_picture_ref: cleanRoomPicture.source_ref,
      clean_room_picture_ref_id: cleanRoomPicture.picture_ref_id,
      treat_picture_ref: treatPicture.source_ref,
      treat_picture_ref_id: treatPicture.picture_ref_id,
      pictures_stay_source: true,
      reward_ready: false,
      parent_approval_required: true,
      parent_approved: false,
    };
  }

  function findSession(sessionId) {
    const cleanId = normalizeSafeReference(sessionId);

    return sessions.find((session) => session.session_id === cleanId) || null;
  }

  function addCleanupTarget(sessionId, target = {}) {
    const session = findSession(sessionId);

    if (!session) {
      throw new Error("PIXELPRIX_OVERLAY_SESSION_NOT_FOUND");
    }

    const cleanTarget = normalizeCleanupTarget(target, session.cleanup_overlay.targets.length + 1);

    session.cleanup_overlay.targets.push(cleanTarget);
    session.cleanup_overlay.target_count = session.cleanup_overlay.targets.length;
    session.cleanup_overlay.state = "ready";
    session.phase = "cleanup_overlay_ready";
    session.updated_at = now();
    session.share_safe_result = buildShareSafeResult(session);
    session.paper_ladder_row = buildPaperLadderRow(session);

    return clone(session);
  }

  function normalizeCleanupTarget(target = {}, order = 1) {
    requireObject(target, "CLEANUP_TARGET_REQUIRED");

    assertNoRawPicture(target, "RAW_PICTURE_CANNOT_ENTER_CLEANUP_TARGET");

    return {
      target_id: normalizeSafeReference(target.target_id) || makeId("pixelPrixCleanupTarget"),
      target_number: normalizeNumber(target.target_number, order),
      target_type: "cleanup_item",
      target_source: normalizeTargetSource(target.target_source),
      source_picture_ref: normalizeSafeReference(target.source_picture_ref),
      source_picture_ref_id: normalizeSafeReference(target.source_picture_ref_id),
      item_label: sanitizeSafeText(target.item_label) || `item ${order}`,
      item_icon: sanitizeSafeText(target.item_icon) || "item",
      pickup_instruction: buildBasicPickupPrompt(target.pickup_instruction, target.item_label),
      screen_zone: normalizeScreenZone(target.screen_zone),
      parent_confirmed: target.parent_confirmed === true,
      kid_clicked: false,
      kid_completed: false,
      parent_verified_done: false,
      clicked_at: "",
      completed_at: "",
    };
  }

  function recordKidTargetClick(sessionId, input = {}) {
    const session = findSession(sessionId);

    if (!session) {
      throw new Error("PIXELPRIX_OVERLAY_SESSION_NOT_FOUND");
    }

    const cleanInput = requireObject(input, "KID_TARGET_CLICK_INPUT_REQUIRED");
    const targetId = normalizeSafeReference(cleanInput.target_id);
    const target = session.cleanup_overlay.targets.find((item) => item.target_id === targetId);

    if (!target) {
      throw new Error("CLEANUP_TARGET_NOT_FOUND");
    }

    target.kid_clicked = true;
    target.kid_completed = cleanInput.kid_completed !== false;
    target.clicked_at = now();

    if (target.kid_completed) {
      target.completed_at = now();
    }

    session.phase = "cleanup_active";
    updateCleanupProgress(session);
    session.updated_at = now();
    session.share_safe_result = buildShareSafeResult(session);
    session.paper_ladder_row = buildPaperLadderRow(session);

    return clone(session);
  }

  function updateCleanupProgress(session) {
    const total = session.cleanup_overlay.targets.length;
    const completed = session.cleanup_overlay.targets.filter((target) => target.kid_completed).length;

    session.cleanup_overlay.completed_target_count = completed;
    session.cleanup_overlay.completion_percent =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    if (total > 0 && completed >= total) {
      session.cleanup_overlay.state = "completed_waiting_parent";
      session.phase = "cleanup_completed_waiting_parent";
    }
  }

  function parentConfirmCleanup(sessionId, input = {}) {
    const session = findSession(sessionId);

    if (!session) {
      throw new Error("PIXELPRIX_OVERLAY_SESSION_NOT_FOUND");
    }

    const cleanInput = input && typeof input === "object" ? input : {};
    const verifiedTargetIds = normalizeList(cleanInput.verified_target_ids).map(normalizeSafeReference);

    session.cleanup_overlay.targets = session.cleanup_overlay.targets.map((target) => {
      if (!verifiedTargetIds.length || verifiedTargetIds.includes(target.target_id)) {
        target.parent_verified_done = true;
      }

      return target;
    });

    session.parent_confirmed_cleanup = true;
    session.phase = "spot_difference_ready";
    session.updated_at = now();
    session.share_safe_result = buildShareSafeResult(session);
    session.paper_ladder_row = buildPaperLadderRow(session);

    return clone(session);
  }

  function openSpotDifferenceRound(sessionId, input = {}) {
    const session = findSession(sessionId);

    if (!session) {
      throw new Error("PIXELPRIX_OVERLAY_SESSION_NOT_FOUND");
    }

    const cleanInput = input && typeof input === "object" ? input : {};
    const cleanRoomPicture = cleanInput.clean_room_picture
      ? normalizeSourcePictureRef(cleanInput.clean_room_picture, "clean_room_result_board")
      : session.clean_room_picture;
    const treatPicture = cleanInput.treat_picture
      ? normalizeSourcePictureRef(cleanInput.treat_picture, "treat_reward_board")
      : session.treat_picture;

    session.clean_room_picture = cleanRoomPicture;
    session.treat_picture = treatPicture;

    const markers = normalizeDifferenceMarkers(cleanInput.difference_markers, session);
    session.spot_difference_overlay = buildSpotDifferenceOverlay(
      markers,
      session.dirty_room_picture,
      cleanRoomPicture,
      treatPicture
    );

    session.spot_difference_overlay.reinforcement_question =
      buildSpotPrompt(cleanInput.reinforcement_question);

    session.phase = "spot_difference_active";
    session.updated_at = now();
    session.share_safe_result = buildShareSafeResult(session);
    session.paper_ladder_row = buildPaperLadderRow(session);

    return clone(session);
  }

  function normalizeDifferenceMarkers(markers, session) {
    const cleanMarkers = normalizeList(markers);

    if (cleanMarkers.length) {
      return cleanMarkers.map((marker, index) => normalizeDifferenceMarker(marker, index + 1));
    }

    return session.cleanup_overlay.targets
      .filter((target) => target.parent_verified_done || target.kid_completed)
      .map((target, index) => {
        return {
          marker_id: makeId("pixelPrixDifferenceMarker"),
          marker_number: index + 1,
          marker_type: "cleanup_change",
          item_label: target.item_label,
          item_icon: target.item_icon,
          before_zone: clone(target.screen_zone),
          after_zone: normalizeScreenZone({}),
          prompt: "Can you spot the difference?",
          parent_confirmed: true,
          kid_spotted: false,
          spotted_at: "",
        };
      });
  }

  function normalizeDifferenceMarker(marker = {}, order = 1) {
    requireObject(marker, "DIFFERENCE_MARKER_REQUIRED");

    assertNoRawPicture(marker, "RAW_PICTURE_CANNOT_ENTER_DIFFERENCE_MARKER");

    return {
      marker_id: normalizeSafeReference(marker.marker_id) || makeId("pixelPrixDifferenceMarker"),
      marker_number: normalizeNumber(marker.marker_number, order),
      marker_type: sanitizeSafeText(marker.marker_type) || "cleanup_change",
      item_label: sanitizeSafeText(marker.item_label) || `difference ${order}`,
      item_icon: sanitizeSafeText(marker.item_icon) || "difference",
      before_zone: normalizeScreenZone(marker.before_zone),
      after_zone: normalizeScreenZone(marker.after_zone),
      prompt: buildSpotPrompt(marker.prompt),
      parent_confirmed: marker.parent_confirmed === true,
      kid_spotted: false,
      spotted_at: "",
    };
  }

  function addDifferenceMarker(sessionId, marker = {}) {
    const session = findSession(sessionId);

    if (!session) {
      throw new Error("PIXELPRIX_OVERLAY_SESSION_NOT_FOUND");
    }

    const cleanMarker = normalizeDifferenceMarker(
      marker,
      session.spot_difference_overlay.markers.length + 1
    );

    session.spot_difference_overlay.markers.push(cleanMarker);
    session.spot_difference_overlay.marker_count = session.spot_difference_overlay.markers.length;
    session.spot_difference_overlay.state = "ready";
    session.phase = "spot_difference_ready";
    session.updated_at = now();
    session.share_safe_result = buildShareSafeResult(session);
    session.paper_ladder_row = buildPaperLadderRow(session);

    return clone(session);
  }

  function recordDifferenceClick(sessionId, input = {}) {
    const session = findSession(sessionId);

    if (!session) {
      throw new Error("PIXELPRIX_OVERLAY_SESSION_NOT_FOUND");
    }

    const cleanInput = requireObject(input, "DIFFERENCE_CLICK_INPUT_REQUIRED");
    const markerId = normalizeSafeReference(cleanInput.marker_id);
    const marker = session.spot_difference_overlay.markers.find((item) => item.marker_id === markerId);

    if (!marker) {
      throw new Error("DIFFERENCE_MARKER_NOT_FOUND");
    }

    marker.kid_spotted = true;
    marker.spotted_at = now();

    session.phase = "spot_difference_active";
    updateSpotDifferenceProgress(session);
    session.updated_at = now();
    session.share_safe_result = buildShareSafeResult(session);
    session.paper_ladder_row = buildPaperLadderRow(session);

    return clone(session);
  }

  function updateSpotDifferenceProgress(session) {
    const total = session.spot_difference_overlay.markers.length;
    const spotted = session.spot_difference_overlay.markers.filter((marker) => marker.kid_spotted).length;

    session.spot_difference_overlay.spotted_count = spotted;
    session.spot_difference_overlay.completion_percent =
      total > 0 ? Math.round((spotted / total) * 100) : 0;

    if (total > 0 && spotted >= total) {
      session.spot_difference_overlay.state = "completed_waiting_parent";
      session.phase = "spot_difference_completed_waiting_parent";
    }
  }

  function parentConfirmSpotDifference(sessionId, input = {}) {
    const session = findSession(sessionId);

    if (!session) {
      throw new Error("PIXELPRIX_OVERLAY_SESSION_NOT_FOUND");
    }

    const cleanInput = input && typeof input === "object" ? input : {};

    session.parent_confirmed_spot_difference = true;
    session.reward_ready = cleanInput.reward_ready !== false;
    session.reward_overlay.reward_ready = session.reward_ready;
    session.reward_overlay.parent_approved = cleanInput.parent_approved !== false;
    session.phase = "reward_ready_parent_approval";
    session.updated_at = now();
    session.share_safe_result = buildShareSafeResult(session);
    session.paper_ladder_row = buildPaperLadderRow(session);

    return clone(session);
  }

  function buildShareSafeResult(session) {
    return {
      share_safe_result_id: makeId("pixelPrixOverlayShareSafeResult"),
      prepared_at: now(),
      session_id: session.session_id,
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      game_structure: "two_games_in_one_same_game",
      phase: session.phase,
      mode: session.mode,
      required_picture_count: session.required_picture_count,
      closeup_item_count: session.closeup_item_pictures.length,
      cleanup_target_count: session.cleanup_overlay.target_count,
      cleanup_completed_count: session.cleanup_overlay.completed_target_count,
      cleanup_completion_percent: session.cleanup_overlay.completion_percent,
      difference_marker_count: session.spot_difference_overlay.marker_count,
      difference_spotted_count: session.spot_difference_overlay.spotted_count,
      difference_completion_percent: session.spot_difference_overlay.completion_percent,
      reinforcement_question: session.spot_difference_overlay.reinforcement_question ||
        session.parent_reinforcement_question,
      teaching_goal: "dirty vs clean",
      reward_ready: session.reward_ready,
      parent_confirmed_cleanup: session.parent_confirmed_cleanup,
      parent_confirmed_spot_difference: session.parent_confirmed_spot_difference,
      pictures: "SOURCE_ONLY",
      results: "MAY_MOVE",
      raw_pictures: "DO_NOT_MOVE",
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      no_shame: true,
    };
  }

  function buildPaperLadderRow(session) {
    return {
      row_id: makeId("pixelPrixOverlayPaperRow"),
      session_id: session.session_id,
      phase: session.phase,
      game_name: "PixelPrix",
      mode: session.mode,
      required_picture_count: session.required_picture_count,
      closeup_item_count: session.closeup_item_pictures.length,
      dirty_room_board_present: Boolean(session.dirty_room_picture.source_ref),
      clean_room_board_present: Boolean(session.clean_room_picture.source_ref),
      treat_board_present: Boolean(session.treat_picture.source_ref),
      cleanup_target_count: session.cleanup_overlay.target_count,
      cleanup_completion_percent: session.cleanup_overlay.completion_percent,
      difference_marker_count: session.spot_difference_overlay.marker_count,
      difference_completion_percent: session.spot_difference_overlay.completion_percent,
      reward_ready: session.reward_ready,
      pictures_stay_source: true,
      only_results_move: true,
      no_shame: true,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      boundary: "PIXELPRIX_OVERLAY_TEACH_DIFFERENCE_NO_SHAME_PICTURES_SOURCE_RESULTS_MOVE",
    };
  }

  function buildBoundary() {
    return {
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      teach_the_difference: true,
      do_not_shame_child: true,
      pictures_stay_source: true,
      only_results_move: true,
      two_games_in_one_same_game: true,
      cleanup_game_enabled: true,
      spot_difference_game_enabled: true,
      closeup_assist_pictures_allowed: true,
      dirty_room_game_board_allowed: true,
      clean_room_result_board_allowed: true,
      treat_reward_board_allowed: true,
      raw_pictures_move: false,
      public_pictures_allowed: false,
      competition_pictures_allowed: false,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      no_direct_pvp: true,
      no_exact_location: true,
      no_public_child_profile: true,
      no_bathroom_picture: true,
      no_body_tracking: true,
      no_shame: true,
    };
  }

  function buildAllowedOutputs() {
    return {
      target_map: true,
      cleanup_targets: true,
      difference_markers: true,
      completion_percent: true,
      score: true,
      item_count: true,
      spotted_count: true,
      reward_ready: true,
      parent_confirmed_result: true,
      share_safe_result: true,
      source_picture_refs: true,
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
    ];
  }

  function buildSessionNotes() {
    return [
      "Parent opens PixelPrix.",
      "Parent takes required close-up item pictures.",
      "Parent steps back and takes the dirty-room game board picture.",
      "PixelPrix builds the cleanup target overlay.",
      "Kid plays Clean Up.",
      "Parent checks.",
      "Parent adds clean-room or treat-ready result picture.",
      "PixelPrix opens Spot the Difference.",
      "Kid learns dirty vs clean.",
      "Parent confirms.",
      "Reward unlocks.",
      "Pictures stay source.",
      "Only results move.",
      "Teach the difference.",
      "Do not shame the child.",
    ];
  }

  function listSessions(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const phase = normalizeSafeReference(cleanFilter.phase);
    const mode = normalizeGameMode(cleanFilter.mode, cleanFilter.required_picture_count);

    return sessions
      .filter((session) => {
        if (phase && session.phase !== phase) {
          return false;
        }

        if (cleanFilter.mode && mode && session.mode !== mode) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestSession() {
    if (!sessions.length) {
      return null;
    }

    return clone(sessions[sessions.length - 1]);
  }

  function listShareSafeResults(filter = {}) {
    return listSessions(filter)
      .map((session) => session.share_safe_result)
      .filter(Boolean);
  }

  function listPaperLadderRows(filter = {}) {
    return listSessions(filter)
      .map((session) => session.paper_ladder_row)
      .filter(Boolean);
  }

  function listGamePhases() {
    return GAME_PHASES.map((phase) => {
      return {
        phase,
        pictures_stay_source: true,
        only_results_move: true,
        chat_off: true,
        child_identity_off: true,
        parent_approval_on: true,
        no_shame: true,
      };
    });
  }

  function clearSessions() {
    sessions.length = 0;
    return true;
  }

  return {
    createOverlaySession,
    addCleanupTarget,
    recordKidTargetClick,
    parentConfirmCleanup,
    openSpotDifferenceRound,
    addDifferenceMarker,
    recordDifferenceClick,
    parentConfirmSpotDifference,
    listSessions,
    latestSession,
    listShareSafeResults,
    listPaperLadderRows,
    listGamePhases,
    clearSessions,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = PixelPrixTouchTargetOverlayRouter;
}
