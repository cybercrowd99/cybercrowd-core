// src/core/kid-chore-game-signal-router.js
// CyberCrowd Core — Kid Chore Game Signal Router
// Department: CyberCare
// Room: CyberCade
// Game/App: PixelPrix
// Owns: routing kid chore game signals into safe PixelPrix route states.
// Rule: Parent picture can start a chore. Parent schedule can start a routine.
// Pictures never leave source. Only results move.
// PixelPrix is ghost racing, not direct PVP.
// Compete the chore. Never expose the child. Never fall into chat here.
// Does not: expose child identity, publish kid names, show child faces,
// move raw pictures, expose address/school/parent identity,
// store raw private room photos, create child chat, direct message,
// public child profile, shame children, punish children,
// replace parenting, sell child data, or make unsafe chores.

const KidChoreGameSignalRouter = (() => {
  const routes = [];

  const SIGNAL_TYPES = [
    "chore_photo_added",
    "touch_map_created",
    "routine_schedule_started",
    "digital_practice_started",
    "digital_practice_completed",
    "real_chore_started",
    "real_chore_progress",
    "real_chore_completed",
    "parent_check_needed",
    "parent_approved_reward",
    "routine_attempt_recorded",
    "potty_schedule_attempt",
    "oops_zone_recorded",
    "blocked_unsafe_chore",
    "unknown",
  ];

  const GAME_LANES = [
    "room_reset",
    "cleanup_training",
    "toy_pickup",
    "laundry_helper",
    "dish_helper",
    "counter_wipe",
    "trash_helper",
    "pet_helper",
    "potty_time",
    "bedtime_routine",
    "morning_routine",
    "brush_teeth",
    "general_routine",
  ];

  const DIFFICULTY_MODES = [
    "tiny_tidy",
    "mini_pickup",
    "little_racer",
    "room_rally",
    "prix_sprint",
    "big_kid_mode",
  ];

  const COMPETITION_SCOPES = [
    "solo_ghost_race",
    "household_challenge",
    "parent_approved_friend_circle",
    "same_age_range_challenge",
    "area_bucket_challenge",
    "cybercade_event",
  ];

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
      .map((item) => String(item).trim())
      .filter(Boolean);
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
      .replace(/\bchat\b/gi, "game display");
  }

  function normalizeSignalType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (SIGNAL_TYPES.includes(clean)) {
      return clean;
    }

    if (clean === "photo") {
      return "chore_photo_added";
    }

    if (clean === "picture") {
      return "chore_photo_added";
    }

    if (clean === "schedule") {
      return "routine_schedule_started";
    }

    if (clean === "routine") {
      return "routine_schedule_started";
    }

    if (clean === "potty") {
      return "potty_schedule_attempt";
    }

    if (clean === "oops") {
      return "oops_zone_recorded";
    }

    if (clean === "done") {
      return "real_chore_completed";
    }

    if (clean === "reward") {
      return "parent_approved_reward";
    }

    return "unknown";
  }

  function normalizeGameLane(value) {
    const clean = normalizeText(value).toLowerCase();

    if (GAME_LANES.includes(clean)) {
      return clean;
    }

    if (clean === "cleanup") {
      return "room_reset";
    }

    if (clean === "potty") {
      return "potty_time";
    }

    if (clean === "teeth") {
      return "brush_teeth";
    }

    if (clean === "bedtime") {
      return "bedtime_routine";
    }

    if (clean === "morning") {
      return "morning_routine";
    }

    return "room_reset";
  }

  function normalizeDifficulty(value, itemCount = 0) {
    const clean = normalizeText(value).toLowerCase();

    if (DIFFICULTY_MODES.includes(clean)) {
      return clean;
    }

    return deriveDifficultyFromItemCount(itemCount);
  }

  function deriveDifficultyFromItemCount(itemCount) {
    const count = normalizeNumber(itemCount, 0);

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

  function normalizeCompetitionScope(value) {
    const clean = normalizeText(value).toLowerCase();

    if (COMPETITION_SCOPES.includes(clean)) {
      return clean;
    }

    if (clean === "ghost") {
      return "solo_ghost_race";
    }

    if (clean === "household") {
      return "household_challenge";
    }

    if (clean === "friends") {
      return "parent_approved_friend_circle";
    }

    if (clean === "age_band") {
      return "same_age_range_challenge";
    }

    if (clean === "area") {
      return "area_bucket_challenge";
    }

    if (clean === "event") {
      return "cybercade_event";
    }

    return "solo_ghost_race";
  }

  function normalizePhotoProof(value = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        before_photo_ref: "",
        after_photo_ref: "",
        chore_area_ref: "",
        screenshot_ref: "",
        raw_photo_stored: false,
        public_photo_allowed: false,
        child_face_required: false,
        picture_stays_source: true,
        only_results_move: true,
      };
    }

    if (
      value.raw_photo ||
      value.raw_picture ||
      value.raw_picture_base64 ||
      value.image_bytes ||
      value.file_blob
    ) {
      throw new Error("RAW_PICTURE_CANNOT_ENTER_ROUTER");
    }

    return {
      before_photo_ref: normalizeSafeReference(value.before_photo_ref),
      after_photo_ref: normalizeSafeReference(value.after_photo_ref),
      chore_area_ref: normalizeSafeReference(value.chore_area_ref),
      screenshot_ref: normalizeSafeReference(value.screenshot_ref),
      photo_label: sanitizeSafeText(value.photo_label),
      raw_photo_stored: false,
      public_photo_allowed: false,
      child_face_required: false,
      parent_approved: normalizeBoolean(value.parent_approved),
      quality_assurance_only: value.quality_assurance_only !== false,
      picture_stays_source: true,
      only_results_move: true,
    };
  }

  function normalizeTimer(value = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        digital_seconds: 0,
        real_seconds: 0,
        winning_seconds: 0,
        timer_started: false,
        timer_completed: false,
      };
    }

    return {
      digital_seconds: normalizeNumber(value.digital_seconds, 0),
      real_seconds: normalizeNumber(value.real_seconds, 0),
      winning_seconds: normalizeNumber(value.winning_seconds, 0),
      timer_started: normalizeBoolean(value.timer_started),
      timer_completed: normalizeBoolean(value.timer_completed),
    };
  }

  function normalizeReward(value = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        reward_type: "parent_attention",
        reward_label: "",
        treat_ready: false,
        parent_approval_required: true,
        parent_approved: false,
      };
    }

    return {
      reward_type: sanitizeSafeText(value.reward_type) || "parent_attention",
      reward_label: sanitizeSafeText(value.reward_label),
      treat_ready: normalizeBoolean(value.treat_ready),
      parent_approval_required: value.parent_approval_required !== false,
      parent_approved: normalizeBoolean(value.parent_approved),
    };
  }

  function normalizeRoutineProgress(value = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        routine_id: "",
        routine_name: "",
        schedule_ref: "",
        attempt_count_today: 0,
        success_count_today: 0,
        oops_zone_count_today: 0,
        oops_zone_count_last_week: 0,
        streak_count: 0,
        improving: false,
      };
    }

    const oopsToday = normalizeNumber(value.oops_zone_count_today, 0);
    const oopsLastWeek = normalizeNumber(value.oops_zone_count_last_week, 0);

    return {
      routine_id: normalizeSafeReference(value.routine_id),
      routine_name: sanitizeSafeText(value.routine_name),
      schedule_ref: normalizeSafeReference(value.schedule_ref),
      attempt_count_today: normalizeNumber(value.attempt_count_today, 0),
      success_count_today: normalizeNumber(value.success_count_today, 0),
      oops_zone_count_today: oopsToday,
      oops_zone_count_last_week: oopsLastWeek,
      streak_count: normalizeNumber(value.streak_count, 0),
      improving: oopsLastWeek > 0 && oopsToday < oopsLastWeek,
      no_shame: true,
    };
  }

  function normalizeCompetition(value = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        competition_scope: "solo_ghost_race",
        area_bucket: "none",
        age_band: "",
        parent_circle_approved: false,
        direct_pvp_allowed: false,
        chat_allowed: false,
        exact_location_allowed: false,
        ghost_score_only: true,
      };
    }

    return {
      competition_scope: normalizeCompetitionScope(value.competition_scope),
      area_bucket: normalizeSafeReference(value.area_bucket) || "none",
      age_band: normalizeSafeReference(value.age_band),
      parent_circle_approved: normalizeBoolean(value.parent_circle_approved),
      same_age_range_only: value.same_age_range_only !== false,
      direct_pvp_allowed: false,
      chat_allowed: false,
      exact_location_allowed: false,
      child_identity_allowed: false,
      ghost_score_only: true,
      parent_approval_required: true,
    };
  }

  function normalizeSignal(input = {}) {
    const cleanInput = requireObject(input, "KID_CHORE_GAME_SIGNAL_REQUIRED");

    const itemTargets = normalizeList(cleanInput.item_targets).map(sanitizeSafeText);
    const signalType = normalizeSignalType(cleanInput.signal_type);
    const gameLane = normalizeGameLane(cleanInput.game_lane);
    const difficulty = normalizeDifficulty(cleanInput.difficulty, itemTargets.length);

    return {
      signal_id: normalizeSafeReference(cleanInput.signal_id) || makeId("kidChoreSignal"),
      created_at: normalizeSafeReference(cleanInput.created_at) || now(),
      signal_type: signalType,
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      game_lane: gameLane,
      difficulty,
      chore_id: normalizeSafeReference(cleanInput.chore_id) || makeId("pixelPrixChore"),
      chore_name: sanitizeSafeText(cleanInput.chore_name) || deriveChoreName(gameLane),
      chore_area: sanitizeSafeText(cleanInput.chore_area),
      room_label: sanitizeSafeText(cleanInput.room_label),
      item_targets: itemTargets,
      child_safe_tag: sanitizeSafeText(cleanInput.child_safe_tag),
      parent_safe_tag: sanitizeSafeText(cleanInput.parent_safe_tag),
      household_tag: normalizeSafeReference(cleanInput.household_tag),
      anonymous_player_tag:
        sanitizeSafeText(cleanInput.anonymous_player_tag) || buildSafeRacerTag(),
      photo_proof: normalizePhotoProof(cleanInput.photo_proof),
      timer: normalizeTimer(cleanInput.timer),
      reward: normalizeReward({
        reward_type: cleanInput.reward_type,
        reward_label: cleanInput.reward_label,
        treat_ready: cleanInput.treat_ready,
        parent_approval_required: cleanInput.parent_approval_required,
        parent_approved: cleanInput.parent_approved,
      }),
      routine_progress: normalizeRoutineProgress(cleanInput.routine_progress),
      competition: normalizeCompetition(cleanInput.competition),
      parent_attention_required: cleanInput.parent_attention_required !== false,
      parent_approval_required: cleanInput.parent_approval_required !== false,
      safety_check_required: cleanInput.safety_check_required !== false,
      unsafe_chore: normalizeBoolean(cleanInput.unsafe_chore),
      allow_real_chore: cleanInput.allow_real_chore !== false,
      reading_required: false,
      voice_help: cleanInput.voice_help !== false,
      icon_help: cleanInput.icon_help !== false,
      no_chat: true,
      no_child_identity: true,
      picture_stays_source: true,
      only_results_move: true,
      message: sanitizeSafeText(cleanInput.message),
      notes: normalizeList(cleanInput.notes).map(sanitizeSafeText),
    };
  }

  function deriveChoreName(gameLane) {
    if (gameLane === "potty_time") {
      return "Potty Time";
    }

    if (gameLane === "bedtime_routine") {
      return "Bedtime Routine";
    }

    if (gameLane === "morning_routine") {
      return "Morning Routine";
    }

    if (gameLane === "brush_teeth") {
      return "Brush Teeth";
    }

    if (gameLane === "laundry_helper") {
      return "Laundry Helper";
    }

    if (gameLane === "dish_helper") {
      return "Dish Helper";
    }

    if (gameLane === "pet_helper") {
      return "Pet Helper";
    }

    return "Room Reset";
  }

  function buildSafeRacerTag() {
    return `Racer ${String(Math.floor(Math.random() * 90) + 10).padStart(2, "0")}`;
  }

  function routeKidChoreGameSignal(input = {}) {
    const signal = normalizeSignal(input);
    const routeState = deriveRouteState(signal);
    const route = buildRoute(signal, routeState);

    routes.push(clone(route));

    return clone(route);
  }

  function deriveRouteState(signal) {
    if (signal.unsafe_chore || signal.signal_type === "blocked_unsafe_chore") {
      return "blocked_unsafe_chore";
    }

    if (signal.signal_type === "chore_photo_added") {
      return "photo_ready_for_digital_chore_map";
    }

    if (signal.signal_type === "touch_map_created") {
      return "touch_map_ready_for_digital_practice";
    }

    if (signal.signal_type === "routine_schedule_started") {
      return "routine_schedule_ready";
    }

    if (signal.signal_type === "potty_schedule_attempt") {
      return "potty_time_attempt_ready";
    }

    if (signal.signal_type === "oops_zone_recorded") {
      return "oops_zone_recorded_no_shame";
    }

    if (signal.signal_type === "digital_practice_started") {
      return "digital_practice_active";
    }

    if (signal.signal_type === "digital_practice_completed") {
      return "digital_practice_completed";
    }

    if (signal.signal_type === "real_chore_started") {
      return "real_chore_active";
    }

    if (signal.signal_type === "real_chore_progress") {
      return "real_chore_progress";
    }

    if (signal.signal_type === "real_chore_completed") {
      return "real_chore_completed_waiting_parent_attention";
    }

    if (signal.signal_type === "parent_check_needed") {
      return "parent_check_needed";
    }

    if (signal.signal_type === "parent_approved_reward") {
      return "reward_ready_parent_approval";
    }

    if (signal.signal_type === "routine_attempt_recorded") {
      return "routine_progress_recorded";
    }

    return "pixelprix_signal_received";
  }

  function buildRoute(signal, routeState) {
    const scoreSummary = buildScoreSummary(signal, routeState);
    const shareSafeSummary = buildShareSafeSummary(signal, routeState, scoreSummary);

    return {
      route_id: makeId("pixelPrixRoute"),
      routed_at: now(),
      route_state: routeState,
      route_name: "PIXELPRIX_KID_CHORE_GAME_ROUTE",
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      signal_id: signal.signal_id,
      signal_type: signal.signal_type,
      game_lane: signal.game_lane,
      difficulty: signal.difficulty,
      chore_id: signal.chore_id,
      chore_name: signal.chore_name,
      chore_area: signal.chore_area,
      room_label: signal.room_label,
      item_targets: clone(signal.item_targets),
      child_safe_tag: signal.child_safe_tag,
      parent_safe_tag: signal.parent_safe_tag,
      household_tag: signal.household_tag,
      anonymous_player_tag: signal.anonymous_player_tag,
      photo_proof: clone(signal.photo_proof),
      timer: clone(signal.timer),
      reward: clone(signal.reward),
      routine_progress: clone(signal.routine_progress),
      competition: clone(signal.competition),
      score_summary: scoreSummary,
      share_safe_summary: shareSafeSummary,
      display_packet: buildDisplayPacket(signal, routeState, scoreSummary, shareSafeSummary),
      paper_ladder_row: buildPaperLadderRow(signal, routeState, scoreSummary),
      boundary: buildBoundary(signal),
      allowed_outputs: buildAllowedOutputs(signal),
      blocked_outputs: buildBlockedOutputs(),
      next_action: deriveNextAction(signal, routeState),
      notes: buildRouteNotes(signal),
    };
  }

  function buildScoreSummary(signal, routeState) {
    const itemTargetCount = signal.item_targets.length;
    const digitalSeconds = signal.timer.digital_seconds;
    const realSeconds = signal.timer.real_seconds;
    const winningSeconds = signal.timer.winning_seconds || realSeconds || digitalSeconds;
    const completed =
      routeState === "real_chore_completed_waiting_parent_attention" ||
      routeState === "reward_ready_parent_approval" ||
      routeState === "digital_practice_completed";

    const itemsCompleted =
      completed && itemTargetCount
        ? itemTargetCount
        : normalizeNumber(signal.routine_progress.success_count_today, 0);

    const completionPercent =
      itemTargetCount > 0
        ? Math.min(100, Math.round((itemsCompleted / itemTargetCount) * 100))
        : completed
          ? 100
          : 0;

    return {
      score_id: makeId("pixelPrixScoreSummary"),
      mode: signal.difficulty,
      item_target_count: itemTargetCount,
      items_completed: itemsCompleted,
      completion_percent: completionPercent,
      digital_seconds: digitalSeconds,
      real_seconds: realSeconds,
      winning_seconds: winningSeconds,
      routine_attempt_count: signal.routine_progress.attempt_count_today,
      routine_success_count: signal.routine_progress.success_count_today,
      oops_zone_count_today: signal.routine_progress.oops_zone_count_today,
      oops_zone_count_last_week: signal.routine_progress.oops_zone_count_last_week,
      improving: signal.routine_progress.improving,
      streak_count: signal.routine_progress.streak_count,
      treat_ready: signal.reward.treat_ready,
      parent_approved: signal.reward.parent_approved,
      parent_check_needed:
        routeState === "parent_check_needed" ||
        routeState === "real_chore_completed_waiting_parent_attention",
      no_shame: true,
    };
  }

  function buildShareSafeSummary(signal, routeState, scoreSummary) {
    return {
      share_safe_id: makeId("pixelPrixShareSafeRouteSummary"),
      prepared_at: now(),
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      route_state: routeState,
      mode: signal.difficulty,
      chore_name: signal.chore_name,
      item_target_count: scoreSummary.item_target_count,
      items_completed: scoreSummary.items_completed,
      completion_percent: scoreSummary.completion_percent,
      digital_seconds: scoreSummary.digital_seconds,
      real_seconds: scoreSummary.real_seconds,
      winning_seconds: scoreSummary.winning_seconds,
      routine_name: signal.routine_progress.routine_name || signal.chore_name,
      routine_success_count: scoreSummary.routine_success_count,
      oops_zone_count_today: scoreSummary.oops_zone_count_today,
      oops_zone_count_last_week: scoreSummary.oops_zone_count_last_week,
      improving: scoreSummary.improving,
      streak_count: scoreSummary.streak_count,
      competition_scope: signal.competition.competition_scope,
      area_bucket: safeAreaBucket(signal.competition.area_bucket),
      age_band: signal.competition.age_band,
      anonymous_player_tag: signal.anonymous_player_tag,
      parent_approval_required: true,
      parent_approved: signal.reward.parent_approved,
      treat_ready: signal.reward.treat_ready,
      picture_stays_source: true,
      only_results_move: true,
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      direct_pvp: "OFF",
      exact_location: "OFF",
      photos: "LOCAL_ONLY",
    };
  }

  function safeAreaBucket(value) {
    const clean = normalizeSafeReference(value);

    if (!clean || clean === "none") {
      return "none";
    }

    return clean;
  }

  function buildDisplayPacket(signal, routeState, scoreSummary, shareSafeSummary) {
    return {
      display_packet_id: makeId("pixelPrixDisplayPacket"),
      display_ready: routeState !== "blocked_unsafe_chore",
      display_surface: "CyberCade",
      display_title: "PIXELPRIX",
      display_state: routeState,
      card: {
        title: "PIXELPRIX CHORE RESULT",
        mode: signal.difficulty,
        chore: signal.chore_name,
        score: scoreSummary.completion_percent,
        item_target_count: scoreSummary.item_target_count,
        items_completed: scoreSummary.items_completed,
        winning_seconds: scoreSummary.winning_seconds,
        competition_scope: signal.competition.competition_scope,
        anonymous_player_tag: signal.anonymous_player_tag,
        parent_approval: "ON",
        child_identity: "OFF",
        chat: "OFF",
        pictures: "LOCAL_ONLY",
      },
      share_safe_summary,
    };
  }

  function buildPaperLadderRow(signal, routeState, scoreSummary) {
    return {
      row_id: makeId("pixelPrixSignalRouterPaperRow"),
      signal_id: signal.signal_id,
      route_state: routeState,
      game_lane: signal.game_lane,
      mode: signal.difficulty,
      chore_name: signal.chore_name,
      item_target_count: scoreSummary.item_target_count,
      completion_percent: scoreSummary.completion_percent,
      competition_scope: signal.competition.competition_scope,
      picture_stays_source: true,
      only_results_move: true,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      boundary: "PIXELPRIX_ROUTER_RESULTS_ONLY_NO_CHILD_IDENTITY_NO_CHAT",
    };
  }

  function buildBoundary(signal) {
    return {
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      pictures_never_leave_source: true,
      only_results_move: true,
      parent_picture_can_start_chore: Boolean(signal.photo_proof.before_photo_ref),
      parent_schedule_can_start_routine:
        signal.signal_type === "routine_schedule_started" ||
        signal.signal_type === "potty_schedule_attempt",
      no_bathroom_picture: signal.game_lane === "potty_time",
      no_body_tracking: signal.game_lane === "potty_time",
      no_shame: true,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      no_direct_pvp: true,
      ghost_score_only: true,
      no_exact_location: true,
      no_public_child_profile: true,
      reading_required: false,
      voice_help: signal.voice_help,
      icon_help: signal.icon_help,
      parent_attention_required: true,
      parent_approval_required: true,
      unsafe_chore_blocked: signal.unsafe_chore,
    };
  }

  function buildAllowedOutputs(signal) {
    return {
      mode: true,
      score: true,
      time: true,
      item_count: true,
      completion_percent: true,
      routine_streak: true,
      badge: true,
      competition_result: true,
      parent_approved_ping: true,
      anonymous_player_tag: true,
      area_bucket:
        signal.competition.competition_scope === "area_bucket_challenge" ||
        signal.competition.competition_scope === "cybercade_event",
      source_bound_photo_ref: true,
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

  function deriveNextAction(signal, routeState) {
    if (routeState === "blocked_unsafe_chore") {
      return "Parent must choose a safe chore.";
    }

    if (routeState === "photo_ready_for_digital_chore_map") {
      return "Parent confirms touch targets. Picture stays source.";
    }

    if (routeState === "touch_map_ready_for_digital_practice") {
      return "Kid practices the chore map with icons and voice help.";
    }

    if (routeState === "routine_schedule_ready") {
      return "Parent teaches the routine. PixelPrix tracks attempts.";
    }

    if (routeState === "potty_time_attempt_ready") {
      return "Parent teaches potty time. No bathroom picture. No shame.";
    }

    if (routeState === "oops_zone_recorded_no_shame") {
      return "Record improvement safely. Progress beats shame.";
    }

    if (routeState === "digital_practice_active") {
      return "Kid plays the digital practice round.";
    }

    if (routeState === "digital_practice_completed") {
      return "Start the real chore race.";
    }

    if (routeState === "real_chore_active") {
      return "Kid completes the real chore.";
    }

    if (routeState === "real_chore_completed_waiting_parent_attention") {
      return "Parent checks effort and gives attention.";
    }

    if (routeState === "reward_ready_parent_approval") {
      return "Parent-approved treat or reward can unlock.";
    }

    return "Continue PixelPrix routine with parent approval.";
  }

  function buildRouteNotes(signal) {
    const notes = [
      "Parent picture can start a chore.",
      "Parent schedule can start a routine.",
      "Pictures never leave source.",
      "Only results move.",
      "PixelPrix is ghost racing.",
      "Compete the chore.",
      "Never expose the child.",
      "Never fall into chat here.",
    ];

    if (signal.game_lane === "potty_time") {
      notes.push("Potty Time uses schedule and Oops Zone only.");
      notes.push("No bathroom picture.");
      notes.push("Progress beats shame.");
    }

    if (signal.competition.competition_scope !== "solo_ghost_race") {
      notes.push("Competition is result-only and parent-approved.");
      notes.push("No direct PVP.");
    }

    return notes.concat(signal.notes || []);
  }

  function listRoutes(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const routeState = normalizeSafeReference(cleanFilter.route_state);
    const signalType = normalizeSignalType(cleanFilter.signal_type);
    const gameLane = normalizeGameLane(cleanFilter.game_lane);
    const competitionScope = normalizeCompetitionScope(cleanFilter.competition_scope);

    return routes
      .filter((route) => {
        if (routeState && route.route_state !== routeState) {
          return false;
        }

        if (
          cleanFilter.signal_type &&
          signalType &&
          route.signal_type !== signalType
        ) {
          return false;
        }

        if (
          cleanFilter.game_lane &&
          gameLane &&
          route.game_lane !== gameLane
        ) {
          return false;
        }

        if (
          cleanFilter.competition_scope &&
          competitionScope &&
          route.competition &&
          route.competition.competition_scope !== competitionScope
        ) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestRoute() {
    if (!routes.length) {
      return null;
    }

    return clone(routes[routes.length - 1]);
  }

  function listShareSafeSummaries(filter = {}) {
    return listRoutes(filter)
      .map((route) => route.share_safe_summary)
      .filter(Boolean);
  }

  function listDisplayPackets(filter = {}) {
    return listRoutes(filter)
      .map((route) => route.display_packet)
      .filter(Boolean);
  }

  function listPaperLadderRows(filter = {}) {
    return listRoutes(filter)
      .map((route) => route.paper_ladder_row)
      .filter(Boolean);
  }

  function listCompetitionScopes() {
    return COMPETITION_SCOPES.map((scope) => {
      return {
        scope,
        direct_pvp_allowed: false,
        chat_allowed: false,
        child_identity_allowed: false,
        exact_location_allowed: false,
        parent_approval_required: true,
        ghost_score_only: true,
      };
    });
  }

  function clearRoutes() {
    routes.length = 0;
    return true;
  }

  return {
    routeKidChoreGameSignal,
    listRoutes,
    latestRoute,
    listShareSafeSummaries,
    listDisplayPackets,
    listPaperLadderRows,
    listCompetitionScopes,
    clearRoutes,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = KidChoreGameSignalRouter;
}
