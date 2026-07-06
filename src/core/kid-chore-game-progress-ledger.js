// src/core/kid-chore-game-progress-ledger.js
// CyberCrowd Core — Kid Chore Game Progress Ledger
// Department: CyberCare
// Room: CyberCade
// Game/App: PixelPrix
// Owns: recording PixelPrix chore-game progress, modes, high scores,
// completions, routines, competitions, reward readiness, parent attention,
// share-safe ping cards, and no-child-identity boundaries.
// Rule: Parent chooses the mode. PixelPrix adjusts the chore.
// Kid gets a winnable race. Parent attention closes the loop.
// Compete the chore. Never expose the child. Never fall into chat here.
// Does not: expose child identity, publish kid names, show child faces,
// expose address/school/parent identity, store raw private room photos,
// create child chat, direct message, public child profile,
// shame children, punish children, replace parenting, sell child data,
// or make unsafe chores.

const KidChoreGameProgressLedger = (() => {
  const entries = [];

  const PIXELPRIX_MODES = {
    tiny_tidy: {
      mode_id: "tiny_tidy",
      display_name: "Tiny Tidy",
      item_min: 5,
      item_max: 5,
      age_band: "under_4",
      reading_required: false,
      parent_guided: true,
      description: "5 items / under 4 / beginner / non-reader",
    },
    mini_pickup: {
      mode_id: "mini_pickup",
      display_name: "Mini Pickup",
      item_min: 10,
      item_max: 10,
      age_band: "under_6",
      reading_required: false,
      parent_guided: true,
      description: "10 items / under 6 / simple room reset",
    },
    little_racer: {
      mode_id: "little_racer",
      display_name: "Little Racer",
      item_min: 15,
      item_max: 15,
      age_band: "under_6",
      reading_required: false,
      parent_guided: true,
      description: "15 items / under 6 / parent-guided challenge",
    },
    room_rally: {
      mode_id: "room_rally",
      display_name: "Room Rally",
      item_min: 20,
      item_max: 25,
      age_band: "6_to_7",
      reading_required: false,
      parent_guided: true,
      description: "20–25 items / 6–7 / bigger cleanup",
    },
    prix_sprint: {
      mode_id: "prix_sprint",
      display_name: "Prix Sprint",
      item_min: 30,
      item_max: 34,
      age_band: "8_plus",
      reading_required: false,
      parent_guided: false,
      description: "30–34 items / 8+ / real chore race",
    },
    big_kid_mode: {
      mode_id: "big_kid_mode",
      display_name: "Big Kid Mode",
      item_min: 30,
      item_max: 50,
      age_band: "8_plus",
      reading_required: false,
      parent_guided: false,
      description: "8+ cutoff / more responsibility / less baby voice",
    },
  };

  const PROGRESS_STATES = [
    "photo_ready",
    "digital_practice",
    "digital_completed",
    "real_chore_started",
    "real_chore_progress",
    "real_chore_completed",
    "parent_check_needed",
    "parent_approved",
    "reward_ready",
    "reward_claimed",
    "routine_completed",
    "competition_ready",
    "blocked_unsafe",
    "unknown",
  ];

  const SHARE_PING_TYPES = [
    "high_score_ping",
    "completion_ping",
    "routine_ping",
    "badge_ping",
    "best_time_ping",
    "streak_ping",
    "competition_ping",
  ];

  const COMPETITION_TYPES = [
    "high_score_competition",
    "best_time_competition",
    "routine_streak_competition",
    "team_cleanup_competition",
    "household_challenge",
    "classroom_safe_challenge",
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
      .replace(/\bhome address\b/gi, "address detail")
      .replace(/\bphone number\b/gi, "phone detail")
      .replace(/\braw uIDL\b/gi, "protected uIDL")
      .replace(/\bfull uIDL\b/gi, "protected uIDL")
      .replace(/\bchild identity\b/gi, "protected child detail")
      .replace(/\bminor identity\b/gi, "protected child detail")
      .replace(/\bkid name\b/gi, "protected player detail")
      .replace(/\bchild name\b/gi, "protected player detail")
      .replace(/\bface photo\b/gi, "protected image detail")
      .replace(/\bschool\b/gi, "protected location detail")
      .replace(/\baddress\b/gi, "protected location detail")
      .replace(/\bprivate room\b/gi, "protected room detail")
      .replace(/\bchat\b/gi, "competition display");
  }

  function normalizeMode(value) {
    const clean = normalizeText(value).toLowerCase();

    if (PIXELPRIX_MODES[clean]) {
      return clean;
    }

    if (clean === "tiny tidy") {
      return "tiny_tidy";
    }

    if (clean === "mini pickup") {
      return "mini_pickup";
    }

    if (clean === "little racer") {
      return "little_racer";
    }

    if (clean === "room rally") {
      return "room_rally";
    }

    if (clean === "prix sprint") {
      return "prix_sprint";
    }

    if (clean === "big kid mode") {
      return "big_kid_mode";
    }

    return "mini_pickup";
  }

  function normalizeProgressState(value) {
    const clean = normalizeText(value).toLowerCase();

    if (PROGRESS_STATES.includes(clean)) {
      return clean;
    }

    if (clean === "done") {
      return "real_chore_completed";
    }

    if (clean === "complete") {
      return "real_chore_completed";
    }

    if (clean === "parent_approved") {
      return "parent_approved";
    }

    return "unknown";
  }

  function normalizeSharePingType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (SHARE_PING_TYPES.includes(clean)) {
      return clean;
    }

    return "completion_ping";
  }

  function normalizeCompetitionType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (COMPETITION_TYPES.includes(clean)) {
      return clean;
    }

    return "household_challenge";
  }

  function normalizePhotoProof(proof = {}) {
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      return {
        before_photo_ref: "",
        after_photo_ref: "",
        screenshot_ref: "",
        chore_area_ref: "",
        raw_photo_stored: false,
        public_photo_allowed: false,
      };
    }

    return {
      before_photo_ref: normalizeSafeReference(proof.before_photo_ref),
      after_photo_ref: normalizeSafeReference(proof.after_photo_ref),
      screenshot_ref: normalizeSafeReference(proof.screenshot_ref),
      chore_area_ref: normalizeSafeReference(proof.chore_area_ref),
      safe_caption: sanitizeSafeText(proof.safe_caption),
      raw_photo_stored: false,
      public_photo_allowed: false,
      child_face_required: false,
      parent_approved: proof.parent_approved === true,
      quality_assurance_only: true,
    };
  }

  function normalizeRoute(route = {}) {
    const cleanRoute = requireObject(route, "KID_CHORE_ROUTE_REQUIRED");

    return {
      route_id: requireText(cleanRoute.route_id, "ROUTE_ID_REQUIRED"),
      routed_at: normalizeText(cleanRoute.routed_at) || now(),
      source: normalizeText(cleanRoute.source),
      lane_family: normalizeText(cleanRoute.lane_family) || "CyberCare / CyberCade / PixelPrix",
      signal_id: requireText(cleanRoute.signal_id, "SIGNAL_ID_REQUIRED"),
      signal_type: requireText(cleanRoute.signal_type, "SIGNAL_TYPE_REQUIRED"),
      route_state: normalizeText(cleanRoute.route_state),
      game_lane: normalizeText(cleanRoute.game_lane),
      game_name: normalizeText(cleanRoute.game_name) || "PixelPrix",
      child_safe_tag: sanitizeSafeText(cleanRoute.child_safe_tag),
      parent_safe_tag: sanitizeSafeText(cleanRoute.parent_safe_tag),
      household_tag: normalizeSafeReference(cleanRoute.household_tag),
      chore_id: normalizeSafeReference(cleanRoute.chore_id) || makeId("pixelPrixChore"),
      chore_name: sanitizeSafeText(cleanRoute.chore_name),
      chore_area: sanitizeSafeText(cleanRoute.chore_area),
      room_label: sanitizeSafeText(cleanRoute.room_label),
      item_targets: normalizeList(cleanRoute.item_targets).map(sanitizeSafeText),
      difficulty: normalizeText(cleanRoute.difficulty),
      reward_type: normalizeText(cleanRoute.reward_type) || "parent_attention",
      reward_label: sanitizeSafeText(cleanRoute.reward_label),
      photo_proof: normalizePhotoProof(cleanRoute.photo_proof),
      timer: normalizeTimer(cleanRoute.timer),
      game_packet: cleanRoute.game_packet || {},
      parent_attention_packet: cleanRoute.parent_attention_packet || {},
      reward_packet: cleanRoute.reward_packet || {},
      safety_packet: cleanRoute.safety_packet || {},
      score_summary: cleanRoute.score_summary || {},
      safe_summary: cleanRoute.safe_summary || {},
      boundaries: cleanRoute.boundaries || {},
    };
  }

  function normalizeTimer(timer = {}) {
    if (!timer || typeof timer !== "object" || Array.isArray(timer)) {
      return {
        digital_seconds: 0,
        real_seconds: 0,
        best_digital_seconds: 0,
        best_real_seconds: 0,
      };
    }

    return {
      digital_seconds: normalizeNumber(timer.digital_seconds, 0),
      real_seconds: normalizeNumber(timer.real_seconds, 0),
      best_digital_seconds: normalizeNumber(timer.best_digital_seconds, 0),
      best_real_seconds: normalizeNumber(timer.best_real_seconds, 0),
    };
  }

  function normalizeOptions(options = {}) {
    const cleanOptions =
      options && typeof options === "object" && !Array.isArray(options)
        ? options
        : {};

    return {
      mode: normalizeMode(cleanOptions.mode),
      progress_state: normalizeProgressState(cleanOptions.progress_state),
      item_count: normalizeNumber(cleanOptions.item_count, 0),
      items_completed: normalizeNumber(cleanOptions.items_completed, 0),
      digital_seconds: normalizeNumber(cleanOptions.digital_seconds, 0),
      real_seconds: normalizeNumber(cleanOptions.real_seconds, 0),
      parent_checked: normalizeBoolean(cleanOptions.parent_checked),
      parent_approved: normalizeBoolean(cleanOptions.parent_approved),
      reward_ready: normalizeBoolean(cleanOptions.reward_ready),
      reward_claimed: normalizeBoolean(cleanOptions.reward_claimed),
      routine_name: sanitizeSafeText(cleanOptions.routine_name),
      routine_id: normalizeSafeReference(cleanOptions.routine_id),
      competition_enabled: normalizeBoolean(cleanOptions.competition_enabled),
      competition_type: normalizeCompetitionType(cleanOptions.competition_type),
      share_ping_type: normalizeSharePingType(cleanOptions.share_ping_type),
      anonymous_player_tag: buildAnonymousPlayerTag(cleanOptions.anonymous_player_tag),
      voice_help: cleanOptions.voice_help !== false,
      icon_help: cleanOptions.icon_help !== false,
      reading_required: normalizeBoolean(cleanOptions.reading_required),
      parent_attention_required: cleanOptions.parent_attention_required !== false,
      no_chat: cleanOptions.no_chat !== false,
      note: sanitizeSafeText(cleanOptions.note),
      photo_proof: normalizePhotoProof(cleanOptions.photo_proof),
    };
  }

  function buildAnonymousPlayerTag(value) {
    const clean = normalizeSafeReference(value);

    if (clean) {
      return clean;
    }

    return `Racer ${String(Math.floor(Math.random() * 90) + 10).padStart(2, "0")}`;
  }

  function recordProgress(route = {}, options = {}) {
    const normalizedRoute = normalizeRoute(route);
    const normalizedOptions = normalizeOptions(options);
    const mode = PIXELPRIX_MODES[normalizedOptions.mode];
    const progressState = deriveProgressState(normalizedRoute, normalizedOptions);
    const itemCount = deriveItemCount(normalizedRoute, normalizedOptions, mode);
    const itemsCompleted = deriveItemsCompleted(normalizedOptions, itemCount, progressState);
    const score = buildScore(normalizedRoute, normalizedOptions, mode, itemCount, itemsCompleted);
    const completion = buildCompletion(normalizedRoute, normalizedOptions, progressState, itemCount, itemsCompleted, score);
    const routine = buildRoutine(normalizedRoute, normalizedOptions, progressState, completion);
    const competition = buildCompetition(normalizedRoute, normalizedOptions, mode, completion, score);
    const sharePing = buildShareSafePing(normalizedRoute, normalizedOptions, mode, completion, score, competition);

    const entry = {
      entry_id: makeId("kidChoreGameProgress"),
      recorded_at: now(),
      source: "core.kid-chore-game-progress-ledger",
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      route_id: normalizedRoute.route_id,
      signal_id: normalizedRoute.signal_id,
      chore_id: normalizedRoute.chore_id,
      household_tag: normalizedRoute.household_tag,
      child_safe_tag: normalizedRoute.child_safe_tag,
      parent_safe_tag: normalizedRoute.parent_safe_tag,
      anonymous_player_tag: normalizedOptions.anonymous_player_tag,
      mode: clone(mode),
      progress_state: progressState,
      chore_name: normalizedRoute.chore_name,
      chore_area: normalizedRoute.chore_area,
      room_label: normalizedRoute.room_label,
      item_count: itemCount,
      items_completed: itemsCompleted,
      item_targets: clone(normalizedRoute.item_targets),
      digital_seconds: normalizedOptions.digital_seconds || normalizedRoute.timer.digital_seconds,
      real_seconds: normalizedOptions.real_seconds || normalizedRoute.timer.real_seconds,
      parent_checked: normalizedOptions.parent_checked,
      parent_approved: normalizedOptions.parent_approved,
      parent_attention_required: normalizedOptions.parent_attention_required,
      reward_ready: normalizedOptions.reward_ready || progressState === "reward_ready",
      reward_claimed: normalizedOptions.reward_claimed,
      reward_type: normalizedRoute.reward_type,
      reward_label: normalizedRoute.reward_label,
      voice_help: normalizedOptions.voice_help,
      icon_help: normalizedOptions.icon_help,
      reading_required: false,
      no_chat: true,
      photo_proof: choosePhotoProof(normalizedRoute, normalizedOptions),
      score,
      completion,
      routine,
      competition,
      share_safe_ping: sharePing,
      competition_card: buildCompetitionCard(mode, completion, score, competition),
      parent_attention_card: buildParentAttentionCard(normalizedRoute, normalizedOptions, completion),
      safety_summary: buildSafetySummary(normalizedRoute, normalizedOptions),
      safe_summary: buildSafeSummary(mode, progressState, completion, competition),
      paper_ladder_row: buildPaperLadderRow(mode, progressState, completion, competition),
      boundaries: buildBoundaries(),
    };

    entries.push(clone(entry));

    return clone(entry);
  }

  function deriveProgressState(route, options) {
    if (options.progress_state !== "unknown") {
      return options.progress_state;
    }

    if (route.route_state === "blocked_unsafe_chore") {
      return "blocked_unsafe";
    }

    if (route.route_state === "digital_practice_completed") {
      return "digital_completed";
    }

    if (route.route_state === "real_chore_completed_waiting_parent_attention") {
      return "parent_check_needed";
    }

    if (options.parent_approved) {
      return "parent_approved";
    }

    if (options.reward_ready) {
      return "reward_ready";
    }

    return "real_chore_progress";
  }

  function deriveItemCount(route, options, mode) {
    if (options.item_count > 0) {
      return clamp(options.item_count, mode.item_min, mode.item_max);
    }

    if (route.item_targets.length) {
      return clamp(route.item_targets.length, mode.item_min, mode.item_max);
    }

    return mode.item_min;
  }

  function deriveItemsCompleted(options, itemCount, progressState) {
    if (options.items_completed > 0) {
      return clamp(options.items_completed, 0, itemCount);
    }

    if (
      progressState === "real_chore_completed" ||
      progressState === "parent_check_needed" ||
      progressState === "parent_approved" ||
      progressState === "reward_ready" ||
      progressState === "routine_completed" ||
      progressState === "competition_ready"
    ) {
      return itemCount;
    }

    return 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function choosePhotoProof(route, options) {
    if (
      options.photo_proof.before_photo_ref ||
      options.photo_proof.after_photo_ref ||
      options.photo_proof.screenshot_ref ||
      options.photo_proof.chore_area_ref
    ) {
      return clone(options.photo_proof);
    }

    return clone(route.photo_proof);
  }

  function buildScore(route, options, mode, itemCount, itemsCompleted) {
    const digitalSeconds = options.digital_seconds || route.timer.digital_seconds;
    const realSeconds = options.real_seconds || route.timer.real_seconds;
    const completionPercent = itemCount > 0
      ? Math.round((itemsCompleted / itemCount) * 100)
      : 0;

    return {
      score_id: makeId("pixelPrixScore"),
      scored_at: now(),
      mode_id: mode.mode_id,
      mode_name: mode.display_name,
      item_count: itemCount,
      items_completed: itemsCompleted,
      completion_percent: completionPercent,
      digital_seconds: digitalSeconds,
      real_seconds: realSeconds,
      beat_digital_time:
        digitalSeconds > 0 &&
        realSeconds > 0 &&
        realSeconds <= digitalSeconds,
      best_time_seconds: deriveBestTime(digitalSeconds, realSeconds),
      score_label: buildScoreLabel(completionPercent, digitalSeconds, realSeconds),
      score_is_progress_not_child_worth: true,
    };
  }

  function deriveBestTime(digitalSeconds, realSeconds) {
    const times = [digitalSeconds, realSeconds].filter((time) => time > 0);

    if (!times.length) {
      return 0;
    }

    return Math.min(...times);
  }

  function buildScoreLabel(completionPercent, digitalSeconds, realSeconds) {
    if (completionPercent >= 100 && realSeconds > 0) {
      return "Clean Sweep";
    }

    if (completionPercent >= 100 && digitalSeconds > 0) {
      return "Pixel Practice Win";
    }

    if (completionPercent >= 50) {
      return "Halfway Hero";
    }

    return "Start Small";
  }

  function buildCompletion(route, options, progressState, itemCount, itemsCompleted, score) {
    const completed =
      itemsCompleted >= itemCount &&
      itemCount > 0 &&
      progressState !== "blocked_unsafe";

    return {
      completion_id: makeId("pixelPrixCompletion"),
      completed,
      completed_at: completed ? now() : "",
      progress_state: progressState,
      chore_id: route.chore_id,
      chore_label: sanitizeSafeText(route.chore_name || route.chore_area || "Room Reset"),
      item_count: itemCount,
      items_completed: itemsCompleted,
      completion_percent: score.completion_percent,
      parent_checked: options.parent_checked,
      parent_approved: options.parent_approved,
      parent_attention_required: options.parent_attention_required,
      reward_ready:
        completed &&
        options.parent_approved &&
        (options.reward_ready || progressState === "reward_ready" || progressState === "parent_approved"),
      no_shame: true,
    };
  }

  function buildRoutine(route, options, progressState, completion) {
    const routineId = options.routine_id || makeId("pixelPrixRoutine");

    return {
      routine_id: routineId,
      routine_name: options.routine_name || sanitizeSafeText(route.chore_name || "Room Reset"),
      routine_state: completion.completed ? "completed" : "in_progress",
      progress_state: progressState,
      completion_id: completion.completion_id,
      completion_percent: completion.completion_percent,
      routine_shareable: completion.completed,
      routine_ping_allowed: completion.completed,
      parent_approval_required: true,
      chat_allowed: false,
      child_identity_allowed: false,
    };
  }

  function buildCompetition(route, options, mode, completion, score) {
    const competitionEnabled = options.competition_enabled || completion.completed;

    return {
      competition_id: makeId("pixelPrixCompetition"),
      competition_enabled: competitionEnabled,
      competition_type: options.competition_type,
      competition_room: "CyberCade",
      game_name: "PixelPrix",
      mode_id: mode.mode_id,
      mode_name: mode.display_name,
      anonymous_player_tag: options.anonymous_player_tag,
      challenge_label: buildChallengeLabel(mode, completion),
      winning_time_seconds: score.best_time_seconds,
      item_count: completion.item_count,
      items_picked_up: completion.items_completed,
      completion_percent: completion.completion_percent,
      can_compete: competitionEnabled && completion.completed,
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      no_child_identity_touches_anything: true,
      no_chat_surface: true,
    };
  }

  function buildChallengeLabel(mode, completion) {
    if (completion.completed) {
      return "Beat the chore";
    }

    return `Try ${mode.display_name}`;
  }

  function buildShareSafePing(route, options, mode, completion, score, competition) {
    return {
      ping_id: makeId("pixelPrixShareSafePing"),
      created_at: now(),
      ping_type: options.share_ping_type,
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      mode_name: mode.display_name,
      routine_name: completion.chore_label,
      challenge: competition.challenge_label,
      winning_time_seconds: competition.winning_time_seconds,
      winning_time_display: formatSeconds(competition.winning_time_seconds),
      items_picked_up: competition.items_picked_up,
      completion_percent: competition.completion_percent,
      badge: score.score_label,
      anonymous_player_tag: competition.anonymous_player_tag,
      shareable: completion.completed && options.parent_approved,
      parent_approval_required: true,
      chat: "OFF",
      child_identity: "OFF",
      parent_identity: "OFF",
      private_photo: "OFF",
      raw_child_identity: "OFF",
      public_child_profile: "OFF",
      safe_card_copy: buildShareSafeCardCopy(mode, completion, competition, score),
    };
  }

  function buildShareSafeCardCopy(mode, completion, competition, score) {
    return {
      title: `PIXELPRIX ${completion.chore_label.toUpperCase()}`,
      mode: mode.display_name,
      difficulty: buildDifficultyLabel(mode),
      winning_time: formatSeconds(competition.winning_time_seconds),
      items_picked_up: competition.items_picked_up,
      completion: `${competition.completion_percent}%`,
      badge: score.score_label,
      challenge: competition.challenge_label,
      reading_required: "NO",
      voice_help: "ON",
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
    };
  }

  function buildDifficultyLabel(mode) {
    if (mode.item_min === mode.item_max) {
      return `${mode.item_min} Items`;
    }

    return `${mode.item_min}-${mode.item_max} Items`;
  }

  function buildCompetitionCard(mode, completion, score, competition) {
    return {
      card_id: makeId("pixelPrixCompetitionCard"),
      title: `PIXELPRIX ${completion.chore_label.toUpperCase()}`,
      mode: mode.display_name,
      difficulty: buildDifficultyLabel(mode),
      winning_time: formatSeconds(competition.winning_time_seconds),
      items_picked_up: competition.items_picked_up,
      completion: `${competition.completion_percent}%`,
      challenge: competition.challenge_label,
      badge: score.score_label,
      reading_required: "NO",
      voice_help: "ON",
      chat: "OFF",
      child_identity: "OFF",
      parent_approval: "ON",
      display_copy: [
        `PIXELPRIX ${completion.chore_label.toUpperCase()}`,
        `Mode: ${mode.display_name}`,
        `Difficulty: ${buildDifficultyLabel(mode)}`,
        `Winning Time: ${formatSeconds(competition.winning_time_seconds)}`,
        `Items Picked Up: ${competition.items_picked_up}`,
        `Completion: ${competition.completion_percent}%`,
        `Challenge: ${competition.challenge_label}`,
        "Reading Required: NO",
        "Voice Help: ON",
        "Chat: OFF",
        "Child Identity: OFF",
        "Parent Approval: ON",
      ].join("\n"),
    };
  }

  function buildParentAttentionCard(route, options, completion) {
    return {
      card_id: makeId("pixelPrixParentAttentionCard"),
      title: "PARENT CHECK",
      body: completion.completed
        ? "Look at the effort. Parent attention closes the loop."
        : "Stay close. The game creates the moment; the parent gives the attention.",
      parent_checked: options.parent_checked,
      parent_approved: options.parent_approved,
      reward_ready: completion.reward_ready,
      required_before_reward: true,
      no_shame: true,
      does_not_replace_parenting: true,
    };
  }

  function buildSafetySummary(route, options) {
    return {
      safety_id: makeId("pixelPrixSafety"),
      prepared_at: now(),
      safe_chore_only: true,
      parent_approval_required: true,
      child_identity_allowed: false,
      chat_allowed: false,
      reading_required: false,
      voice_help: options.voice_help,
      icon_help: options.icon_help,
      raw_private_photo_storage_allowed: false,
      public_photo_allowed: false,
    };
  }

  function buildSafeSummary(mode, progressState, completion, competition) {
    return {
      headline: "PixelPrix progress recorded",
      body: "Chore-game progress was recorded without exposing child identity or opening chat.",
      mode: mode.display_name,
      progress_state: progressState,
      completion_percent: completion.completion_percent,
      competition_enabled: competition.competition_enabled,
      safe_tags: [
        "pixelprix",
        "cybercade",
        "cybercare",
        "share_score_not_child",
        "chat_off",
        "parent_approval_on",
      ],
    };
  }

  function buildPaperLadderRow(mode, progressState, completion, competition) {
    return {
      row_id: makeId("kidChoreGameProgressPaperRow"),
      recorded_at: now(),
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      mode: mode.display_name,
      progress_state: progressState,
      item_count: completion.item_count,
      items_completed: completion.items_completed,
      completion_percent: completion.completion_percent,
      competition_enabled: competition.competition_enabled,
      share_safe: true,
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      boundary: "COMPETE_THE_CHORE_NEVER_EXPOSE_THE_CHILD_NEVER_FALL_INTO_CHAT_HERE",
    };
  }

  function formatSeconds(seconds) {
    const cleanSeconds = normalizeNumber(seconds, 0);

    if (cleanSeconds <= 0) {
      return "00:00";
    }

    const minutes = Math.floor(cleanSeconds / 60);
    const remainingSeconds = cleanSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function buildBoundaries() {
    return {
      department: "CyberCare",
      room: "CyberCade",
      game: "PixelPrix",
      compete_the_chore: true,
      never_expose_the_child: true,
      never_fall_into_chat_here: true,
      share_score_not_child: true,
      share_completion_not_child: true,
      share_routine_not_child: true,
      share_competition_not_child: true,
      no_kid_identity_touches_anything: true,
      no_kid_name: true,
      no_kid_face: true,
      no_address: true,
      no_school: true,
      no_parent_identity: true,
      no_public_child_profile: true,
      no_direct_messages: true,
      no_comments: true,
      no_friend_requests: true,
      no_public_feed: true,
      parent_attention_required: true,
      parent_approval_required: true,
      no_shame: true,
      no_punishment_engine: true,
      score_is_progress_not_child_worth: true,
      does_not_replace_parenting: true,
    };
  }

  function latestEntry() {
    if (!entries.length) {
      return null;
    }

    return clone(entries[entries.length - 1]);
  }

  function latestShareSafePing() {
    const latest = latestEntry();

    if (!latest) {
      return null;
    }

    return clone(latest.share_safe_ping);
  }

  function listEntries(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const mode = normalizeText(cleanFilter.mode);
    const progressState = normalizeText(cleanFilter.progress_state);
    const choreId = normalizeSafeReference(cleanFilter.chore_id);
    const routineId = normalizeSafeReference(cleanFilter.routine_id);
    const competitionEnabled = cleanFilter.competition_enabled;
    const householdTag = normalizeSafeReference(cleanFilter.household_tag);

    return entries
      .filter((entry) => {
        if (mode && entry.mode.mode_id !== normalizeMode(mode)) {
          return false;
        }

        if (progressState && entry.progress_state !== progressState) {
          return false;
        }

        if (choreId && entry.chore_id !== choreId) {
          return false;
        }

        if (routineId && entry.routine.routine_id !== routineId) {
          return false;
        }

        if (
          typeof competitionEnabled === "boolean" &&
          entry.competition.competition_enabled !== competitionEnabled
        ) {
          return false;
        }

        if (householdTag && entry.household_tag !== householdTag) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function listModes() {
    return Object.keys(PIXELPRIX_MODES).map((key) => clone(PIXELPRIX_MODES[key]));
  }

  function listShareSafePings(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.share_safe_ping));
  }

  function listCompetitionCards(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.competition_card));
  }

  function listRoutineCompletions(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.routine));
  }

  function listPaperLadderRows(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.paper_ladder_row));
  }

  function clearEntries() {
    entries.length = 0;
    return true;
  }

  return {
    recordProgress,
    latestEntry,
    latestShareSafePing,
    listEntries,
    listModes,
    listShareSafePings,
    listCompetitionCards,
    listRoutineCompletions,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = KidChoreGameProgressLedger;
}
