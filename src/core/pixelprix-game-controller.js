// src/core/pixelprix-game-controller.js
// CyberCrowd Core — PixelPrix Game Controller
// Department: CyberCare
// Room: CyberCade
// Game/App: PixelPrix
// Owns: coordinating parent chore triggers, kid chore routing,
// progress ledger recording, share-safe pings, CyberCade display handoff,
// touch target maps, routine schedules, competition scopes,
// and the no-child-identity / no-chat boundary.
// Rule: Parent picture can start a chore. Parent schedule can start a routine.
// Pictures never leave source. Only results move.
// PixelPrix runs the chore race. CyberCade displays the result.
// Compete the chore. Never expose the child. Never fall into chat here.
// Does not: expose child identity, publish kid names, show child faces,
// move raw pictures, expose address/school/parent identity,
// store raw private room photos, create child chat, direct message,
// public child profile, shame children, punish children,
// replace parenting, sell child data, or make unsafe chores.

const PixelPrixGameController = (() => {
  const cycles = [];

  const TRIGGER_TYPES = [
    "parent_picture",
    "routine_schedule",
    "manual_signal",
  ];

  const ROUTINE_TYPES = [
    "room_cleanup",
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

  const ITEM_IDENTIFICATION_MODES = [
    "parent_touch_mode",
    "assist_mode",
    "none",
  ];

  const COMPETITION_SCOPES = [
    "solo_ghost_race",
    "household_challenge",
    "parent_approved_friend_circle",
    "same_age_range_challenge",
    "area_bucket_challenge",
    "cybercade_event",
  ];

  const SAFE_AREA_BUCKETS = [
    "household",
    "family_circle",
    "neighborhood_bucket",
    "city_area",
    "county_area",
    "state_bucket",
    "cybercade_room",
    "none",
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

  function normalizeTriggerType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (TRIGGER_TYPES.includes(clean)) {
      return clean;
    }

    if (clean === "picture") {
      return "parent_picture";
    }

    if (clean === "photo") {
      return "parent_picture";
    }

    if (clean === "schedule") {
      return "routine_schedule";
    }

    if (clean === "routine") {
      return "routine_schedule";
    }

    return "manual_signal";
  }

  function normalizeRoutineType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (ROUTINE_TYPES.includes(clean)) {
      return clean;
    }

    return "general_routine";
  }

  function normalizeItemIdentificationMode(value) {
    const clean = normalizeText(value).toLowerCase();

    if (ITEM_IDENTIFICATION_MODES.includes(clean)) {
      return clean;
    }

    if (clean === "parent_touch") {
      return "parent_touch_mode";
    }

    if (clean === "assist") {
      return "assist_mode";
    }

    return "parent_touch_mode";
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

  function normalizeAreaBucket(value) {
    const clean = normalizeText(value).toLowerCase();

    if (SAFE_AREA_BUCKETS.includes(clean)) {
      return clean;
    }

    return "none";
  }

  function normalizeDependencies(dependencies = {}) {
    const cleanDependencies = requireObject(dependencies, "DEPENDENCIES_REQUIRED");

    return {
      signal_router: requireObject(cleanDependencies.signal_router, "SIGNAL_ROUTER_REQUIRED"),
      progress_ledger: requireObject(cleanDependencies.progress_ledger, "PROGRESS_LEDGER_REQUIRED"),
      display_receiver: cleanDependencies.display_receiver || null,
    };
  }

  function assertSignalRouter(router) {
    requireFunction(
      router.routeKidChoreGameSignal,
      "SIGNAL_ROUTER_ROUTE_KID_CHORE_GAME_SIGNAL_REQUIRED"
    );
  }

  function assertProgressLedger(ledger) {
    requireFunction(
      ledger.recordProgress,
      "PROGRESS_LEDGER_RECORD_PROGRESS_REQUIRED"
    );

    requireFunction(
      ledger.latestShareSafePing,
      "PROGRESS_LEDGER_LATEST_SHARE_SAFE_PING_REQUIRED"
    );
  }

  function assertDisplayReceiver(receiver) {
    if (!receiver) {
      return;
    }

    requireFunction(receiver.receiveStatus, "DISPLAY_RECEIVER_RECEIVE_STATUS_REQUIRED");
  }

  function normalizeControllerInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    return {
      trigger_type: normalizeTriggerType(cleanInput.trigger_type),
      chore_trigger: normalizeChoreTrigger(cleanInput.chore_trigger),
      route_input: normalizeRouteInput(cleanInput.route_input),
      progress_options: normalizeProgressOptions(cleanInput.progress_options),
      competition_options: normalizeCompetitionOptions(cleanInput.competition_options),
      forward_to_display: cleanInput.forward_to_display !== false,
      notes: sanitizeSafeText(cleanInput.notes),
    };
  }

  function normalizeRouteInput(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {};
    }

    return clone(input);
  }

  function normalizeChoreTrigger(trigger = {}) {
    if (!trigger || typeof trigger !== "object" || Array.isArray(trigger)) {
      return {
        trigger_id: makeId("pixelPrixTrigger"),
        trigger_type: "manual_signal",
        picture_source_ref: "",
        picture_stays_source: true,
        raw_picture_present: false,
        routine_type: "general_routine",
        routine_schedule: {},
        item_identification_mode: "parent_touch_mode",
        touch_target_map: [],
        potty_time: {},
        parent_confirmed: false,
      };
    }

    const triggerType = normalizeTriggerType(trigger.trigger_type);

    return {
      trigger_id: normalizeSafeReference(trigger.trigger_id) || makeId("pixelPrixTrigger"),
      trigger_type: triggerType,
      picture_source_ref: normalizeSafeReference(trigger.picture_source_ref),
      picture_stays_source: true,
      raw_picture_present: Boolean(
        trigger.raw_picture ||
        trigger.raw_picture_base64 ||
        trigger.image_bytes ||
        trigger.file_blob
      ),
      routine_type: normalizeRoutineType(trigger.routine_type),
      routine_schedule: normalizeRoutineSchedule(trigger.routine_schedule),
      item_identification_mode: normalizeItemIdentificationMode(trigger.item_identification_mode),
      touch_target_map: normalizeTouchTargetMap(trigger.touch_target_map),
      assist_suggestions: normalizeTouchTargetMap(trigger.assist_suggestions),
      potty_time: normalizePottyTime(trigger.potty_time),
      parent_confirmed: trigger.parent_confirmed === true,
      parent_safe_tag: sanitizeSafeText(trigger.parent_safe_tag),
      household_tag: normalizeSafeReference(trigger.household_tag),
      safe_caption: sanitizeSafeText(trigger.safe_caption),
    };
  }

  function normalizeTouchTargetMap(targets) {
    if (!Array.isArray(targets)) {
      return [];
    }

    return targets.map((target, index) => {
      const cleanTarget =
        target && typeof target === "object" && !Array.isArray(target)
          ? target
          : {};

      return {
        target_id: normalizeSafeReference(cleanTarget.target_id) || makeId("pixelPrixTouchTarget"),
        order: normalizeNumber(cleanTarget.order, index + 1),
        item_label: sanitizeSafeText(cleanTarget.item_label),
        item_icon: sanitizeSafeText(cleanTarget.item_icon),
        pickup_instruction: buildBasicPrompt(cleanTarget.pickup_instruction, cleanTarget.item_label),
        screen_zone: normalizeScreenZone(cleanTarget.screen_zone),
        target_source: normalizeText(cleanTarget.target_source) || "parent_touch",
        parent_confirmed: cleanTarget.parent_confirmed === true,
        done: normalizeBoolean(cleanTarget.done),
      };
    }).filter((target) => target.item_label || target.item_icon);
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

  function buildBasicPrompt(value, itemLabel) {
    const clean = sanitizeSafeText(value);

    if (clean) {
      return clean;
    }

    const item = sanitizeSafeText(itemLabel) || "item";

    return `Find the ${item}. Tap the ${item}. Put it away.`;
  }

  function normalizeRoutineSchedule(schedule = {}) {
    if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
      return {
        schedule_id: "",
        routine_name: "",
        routine_type: "general_routine",
        reminder_times: [],
        attempt_goal_count: 0,
        treat_after_success: false,
        parent_teaching_required: true,
      };
    }

    return {
      schedule_id: normalizeSafeReference(schedule.schedule_id) || makeId("pixelPrixRoutineSchedule"),
      routine_name: sanitizeSafeText(schedule.routine_name),
      routine_type: normalizeRoutineType(schedule.routine_type),
      reminder_times: normalizeList(schedule.reminder_times).map(normalizeSafeReference),
      attempt_goal_count: normalizeNumber(schedule.attempt_goal_count, 0),
      treat_after_success: normalizeBoolean(schedule.treat_after_success),
      parent_teaching_required: schedule.parent_teaching_required !== false,
      no_photo_required: schedule.no_photo_required !== false,
    };
  }

  function normalizePottyTime(potty = {}) {
    if (!potty || typeof potty !== "object" || Array.isArray(potty)) {
      return {
        enabled: false,
        age_band: "3_to_4",
        schedule_label: "",
        oops_zone_count_today: 0,
        oops_zone_count_last_week: 0,
        success_count_today: 0,
        treat_ready: false,
        no_bathroom_picture: true,
      };
    }

    return {
      enabled: normalizeBoolean(potty.enabled),
      age_band: normalizeSafeReference(potty.age_band) || "3_to_4",
      schedule_label: sanitizeSafeText(potty.schedule_label),
      oops_zone_count_today: normalizeNumber(potty.oops_zone_count_today, 0),
      oops_zone_count_last_week: normalizeNumber(potty.oops_zone_count_last_week, 0),
      success_count_today: normalizeNumber(potty.success_count_today, 0),
      treat_ready: normalizeBoolean(potty.treat_ready),
      no_bathroom_picture: true,
      no_body_tracking: true,
      no_shame: true,
    };
  }

  function normalizeProgressOptions(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      return {};
    }

    const cleanOptions = clone(options);

    cleanOptions.no_chat = true;
    cleanOptions.reading_required = false;

    return cleanOptions;
  }

  function normalizeCompetitionOptions(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      return {
        competition_scope: "solo_ghost_race",
        area_bucket: "none",
        parent_circle_approved: false,
        same_age_range_only: true,
        exact_location_allowed: false,
        direct_pvp_allowed: false,
      };
    }

    return {
      competition_scope: normalizeCompetitionScope(options.competition_scope),
      area_bucket: normalizeAreaBucket(options.area_bucket),
      parent_circle_approved: normalizeBoolean(options.parent_circle_approved),
      same_age_range_only: options.same_age_range_only !== false,
      exact_location_allowed: false,
      direct_pvp_allowed: false,
      ghost_score_only: true,
      no_chat: true,
      no_child_identity: true,
    };
  }

  function runPixelPrixGameCycle(input = {}, dependencies = {}) {
    const normalizedInput = normalizeControllerInput(input);
    const normalizedDependencies = normalizeDependencies(dependencies);

    assertSignalRouter(normalizedDependencies.signal_router);
    assertProgressLedger(normalizedDependencies.progress_ledger);
    assertDisplayReceiver(normalizedDependencies.display_receiver);

    const cycle = {
      cycle_id: makeId("pixelPrixGameCycle"),
      started_at: now(),
      status: "started",
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      notes: normalizedInput.notes,
      steps: [],
    };

    try {
      const triggerPacket = runStep(cycle, "PREPARE_PARENT_TRIGGER", () => {
        return prepareParentTrigger(normalizedInput);
      });

      const routeInput = runStep(cycle, "PREPARE_KID_CHORE_SIGNAL", () => {
        return buildKidChoreSignalInput(normalizedInput, triggerPacket);
      });

      const route = runStep(cycle, "ROUTE_PIXELPRIX_SIGNAL", () => {
        return normalizedDependencies.signal_router.routeKidChoreGameSignal(routeInput);
      });

      const progressOptions = runStep(cycle, "PREPARE_PROGRESS_OPTIONS", () => {
        return buildProgressOptions(normalizedInput, triggerPacket, route);
      });

      const progressEntry = runStep(cycle, "RECORD_PIXELPRIX_PROGRESS", () => {
        return normalizedDependencies.progress_ledger.recordProgress(
          route,
          progressOptions
        );
      });

      const shareSafePing = runStep(cycle, "PREPARE_SHARE_SAFE_PING", () => {
        return normalizedDependencies.progress_ledger.latestShareSafePing();
      });

      let displayReceipt = null;

      if (
        normalizedInput.forward_to_display &&
        normalizedDependencies.display_receiver
      ) {
        displayReceipt = runStep(cycle, "FORWARD_CYBERCADE_DISPLAY_CARD", () => {
          return normalizedDependencies.display_receiver.receiveStatus(progressEntry);
        });
      }

      cycle.status = "completed";
      cycle.completed_at = now();
      cycle.trigger_packet = clone(triggerPacket);
      cycle.route_input = clone(routeInput);
      cycle.route = clone(route);
      cycle.progress_options = clone(progressOptions);
      cycle.progress_entry = clone(progressEntry);
      cycle.share_safe_ping = clone(shareSafePing);
      cycle.display_receipt = clone(displayReceipt);
      cycle.boundary = buildCycleBoundary(triggerPacket, progressEntry, displayReceipt);

      cycles.push(clone(cycle));

      return clone(cycle);
    } catch (error) {
      cycle.status = "failed";
      cycle.failed_at = now();
      cycle.error = {
        name: error && error.name ? error.name : "Error",
        message: error && error.message ? error.message : "UNKNOWN_ERROR",
      };

      cycles.push(clone(cycle));

      return clone(cycle);
    }
  }

  function runStep(cycle, stepName, callback) {
    const step = {
      step_id: makeId("pixelPrixGameStep"),
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
      trigger_id: normalizeText(result.trigger_id),
      route_id: normalizeText(result.route_id),
      entry_id: normalizeText(result.entry_id),
      signal_id: normalizeText(result.signal_id),
      signal_type: normalizeText(result.signal_type),
      route_state: normalizeText(result.route_state),
      progress_state: normalizeText(result.progress_state),
      mode:
        result.mode && result.mode.display_name
          ? normalizeText(result.mode.display_name)
          : normalizeText(result.mode),
      game_name: normalizeText(result.game_name),
      display_state: normalizeText(result.display_state),
      competition_scope: normalizeText(result.competition_scope),
      picture_stays_source: result.picture_stays_source === true,
      child_identity_off:
        result.child_identity === "OFF" ||
        result.child_identity_off === true ||
        result.no_child_identity === true,
      chat_off:
        result.chat === "OFF" ||
        result.chat_off === true ||
        result.no_chat === true,
    };
  }

  function prepareParentTrigger(input) {
    const trigger = input.chore_trigger;

    if (trigger.raw_picture_present) {
      throw new Error("RAW_PICTURE_CANNOT_ENTER_CONTROLLER");
    }

    if (
      trigger.trigger_type === "parent_picture" &&
      !trigger.picture_source_ref
    ) {
      throw new Error("PICTURE_SOURCE_REF_REQUIRED");
    }

    if (
      trigger.routine_type === "potty_time" ||
      trigger.potty_time.enabled
    ) {
      return buildPottyRoutineTrigger(input);
    }

    if (trigger.trigger_type === "routine_schedule") {
      return buildRoutineScheduleTrigger(input);
    }

    if (trigger.trigger_type === "parent_picture") {
      return buildParentPictureTrigger(input);
    }

    return buildManualTrigger(input);
  }

  function buildParentPictureTrigger(input) {
    const trigger = input.chore_trigger;
    const confirmedTargets = getConfirmedTouchTargets(trigger);

    return {
      trigger_id: trigger.trigger_id,
      trigger_type: "parent_picture",
      trigger_state: confirmedTargets.length
        ? "picture_touch_map_ready"
        : "picture_waiting_parent_touch_targets",
      picture_source_ref: trigger.picture_source_ref,
      picture_stays_source: true,
      raw_picture_moves: false,
      raw_picture_stored: false,
      item_identification_mode: trigger.item_identification_mode,
      touch_target_map: confirmedTargets,
      touch_target_count: confirmedTargets.length,
      parent_confirmed: trigger.parent_confirmed && confirmedTargets.length > 0,
      routine_type: "room_cleanup",
      no_child_identity: true,
      no_chat: true,
      no_public_photo: true,
    };
  }

  function buildRoutineScheduleTrigger(input) {
    const trigger = input.chore_trigger;

    return {
      trigger_id: trigger.trigger_id,
      trigger_type: "routine_schedule",
      trigger_state: "routine_schedule_ready",
      picture_source_ref: "",
      picture_stays_source: true,
      raw_picture_moves: false,
      raw_picture_stored: false,
      routine_type: trigger.routine_type,
      routine_schedule: clone(trigger.routine_schedule),
      touch_target_map: [],
      touch_target_count: 0,
      parent_confirmed: trigger.parent_confirmed,
      no_photo_required: true,
      no_child_identity: true,
      no_chat: true,
    };
  }

  function buildPottyRoutineTrigger(input) {
    const trigger = input.chore_trigger;
    const potty = trigger.potty_time;

    return {
      trigger_id: trigger.trigger_id,
      trigger_type: "routine_schedule",
      trigger_state: "potty_time_schedule_ready",
      picture_source_ref: "",
      picture_stays_source: true,
      raw_picture_moves: false,
      raw_picture_stored: false,
      routine_type: "potty_time",
      routine_schedule: clone(trigger.routine_schedule),
      potty_time: clone(potty),
      oops_zone: buildOopsZone(potty),
      touch_target_map: [],
      touch_target_count: 0,
      parent_confirmed: trigger.parent_confirmed,
      no_photo_required: true,
      no_bathroom_picture: true,
      no_body_tracking: true,
      no_child_identity: true,
      no_chat: true,
      no_shame: true,
    };
  }

  function buildManualTrigger(input) {
    const trigger = input.chore_trigger;

    return {
      trigger_id: trigger.trigger_id,
      trigger_type: "manual_signal",
      trigger_state: "manual_signal_ready",
      picture_source_ref: "",
      picture_stays_source: true,
      raw_picture_moves: false,
      raw_picture_stored: false,
      routine_type: trigger.routine_type,
      touch_target_map: getConfirmedTouchTargets(trigger),
      touch_target_count: getConfirmedTouchTargets(trigger).length,
      parent_confirmed: trigger.parent_confirmed,
      no_child_identity: true,
      no_chat: true,
    };
  }

  function getConfirmedTouchTargets(trigger) {
    if (trigger.item_identification_mode === "assist_mode") {
      return trigger.assist_suggestions
        .filter((target) => target.parent_confirmed)
        .map((target) => {
          const cleanTarget = clone(target);
          cleanTarget.target_source = "assist_parent_confirmed";
          return cleanTarget;
        });
    }

    return trigger.touch_target_map
      .filter((target) => target.parent_confirmed)
      .map((target) => {
        const cleanTarget = clone(target);
        cleanTarget.target_source = "parent_touch_confirmed";
        return cleanTarget;
      });
  }

  function buildOopsZone(potty) {
    const lastWeek = potty.oops_zone_count_last_week;
    const today = potty.oops_zone_count_today;

    return {
      oops_zone_id: makeId("pixelPrixOopsZone"),
      created_at: now(),
      oops_zone_count_today: today,
      oops_zone_count_last_week: lastWeek,
      success_count_today: potty.success_count_today,
      improvement:
        lastWeek > 0 && today >= 0
          ? lastWeek - today
          : 0,
      improving:
        lastWeek > 0 && today < lastWeek,
      treat_ready: potty.treat_ready,
      message: buildOopsZoneMessage(lastWeek, today),
      no_shame: true,
      no_body_tracking: true,
      no_bathroom_picture: true,
    };
  }

  function buildOopsZoneMessage(lastWeek, today) {
    if (lastWeek > 0 && today < lastWeek) {
      return "Oops Zone improved. Progress beats shame.";
    }

    if (today > 0) {
      return "Oops Zone recorded. Try again with parent help.";
    }

    return "No Oops Zone today. Parent can celebrate the routine.";
  }

  function buildKidChoreSignalInput(input, triggerPacket) {
    const routeInput = input.route_input;
    const trigger = input.chore_trigger;

    return {
      signal_id: routeInput.signal_id || makeId("pixelPrixKidChoreSignal"),
      created_at: routeInput.created_at || now(),
      signal_type: deriveSignalType(triggerPacket, routeInput),
      game_lane: routeInput.game_lane || deriveGameLane(triggerPacket),
      game_name: "PixelPrix",
      child_safe_tag: sanitizeSafeText(routeInput.child_safe_tag),
      parent_safe_tag:
        sanitizeSafeText(routeInput.parent_safe_tag) ||
        sanitizeSafeText(trigger.parent_safe_tag),
      household_tag:
        normalizeSafeReference(routeInput.household_tag) ||
        normalizeSafeReference(trigger.household_tag),
      chore_id:
        normalizeSafeReference(routeInput.chore_id) ||
        makeId("pixelPrixChore"),
      chore_name: sanitizeSafeText(routeInput.chore_name) || deriveChoreName(triggerPacket),
      chore_area: sanitizeSafeText(routeInput.chore_area),
      room_label: sanitizeSafeText(routeInput.room_label),
      item_targets: deriveItemTargets(triggerPacket, routeInput),
      photo_proof: buildSourceBoundPhotoProof(triggerPacket, routeInput),
      timer: routeInput.timer || {},
      difficulty: routeInput.difficulty,
      reward_type: routeInput.reward_type || "parent_attention",
      reward_label: sanitizeSafeText(routeInput.reward_label),
      parent_attention_required: true,
      parent_approval_required: true,
      allow_real_chore: routeInput.allow_real_chore !== false,
      safety_check_required: routeInput.safety_check_required !== false,
      unsafe_chore: normalizeBoolean(routeInput.unsafe_chore),
      message: buildSafeRouteMessage(triggerPacket, routeInput),
      notes: [
        "Pictures never leave source.",
        "Only results move.",
        "Chat OFF.",
        "Child identity OFF.",
      ],
    };
  }

  function deriveSignalType(triggerPacket, routeInput) {
    const clean = normalizeText(routeInput.signal_type);

    if (clean) {
      return clean;
    }

    if (triggerPacket.trigger_type === "parent_picture") {
      return "chore_photo_added";
    }

    if (triggerPacket.routine_type === "potty_time") {
      return "digital_practice_started";
    }

    if (triggerPacket.trigger_type === "routine_schedule") {
      return "digital_practice_started";
    }

    return "digital_practice_started";
  }

  function deriveGameLane(triggerPacket) {
    if (triggerPacket.routine_type === "potty_time") {
      return "cleanup_training";
    }

    if (triggerPacket.routine_type === "laundry_helper") {
      return "laundry_helper";
    }

    if (triggerPacket.routine_type === "dish_helper") {
      return "dish_helper";
    }

    if (triggerPacket.routine_type === "pet_helper") {
      return "pet_helper";
    }

    return "room_reset";
  }

  function deriveChoreName(triggerPacket) {
    if (triggerPacket.routine_type === "potty_time") {
      return "Potty Time";
    }

    if (triggerPacket.routine_type === "bedtime_routine") {
      return "Bedtime Routine";
    }

    if (triggerPacket.routine_type === "morning_routine") {
      return "Morning Routine";
    }

    return "Room Reset";
  }

  function deriveItemTargets(triggerPacket, routeInput) {
    const inputTargets = normalizeList(routeInput.item_targets).map(sanitizeSafeText);

    if (inputTargets.length) {
      return inputTargets;
    }

    if (triggerPacket.touch_target_map && triggerPacket.touch_target_map.length) {
      return triggerPacket.touch_target_map.map((target) => {
        return target.item_label || target.item_icon || "item";
      });
    }

    if (triggerPacket.routine_type === "potty_time") {
      return ["try", "wash hands", "parent check"];
    }

    return [];
  }

  function buildSourceBoundPhotoProof(triggerPacket, routeInput) {
    return {
      before_photo_ref:
        triggerPacket.trigger_type === "parent_picture"
          ? normalizeSafeReference(triggerPacket.picture_source_ref)
          : "",
      after_photo_ref: "",
      chore_area_ref:
        triggerPacket.trigger_type === "parent_picture"
          ? normalizeSafeReference(triggerPacket.picture_source_ref)
          : "",
      screenshot_ref: "",
      photo_label: sanitizeSafeText(routeInput.photo_label),
      raw_photo_stored: false,
      public_photo_allowed: false,
      parent_approved: triggerPacket.parent_confirmed === true,
      child_face_required: false,
      quality_assurance_only: true,
      picture_stays_source: true,
      only_results_move: true,
    };
  }

  function buildSafeRouteMessage(triggerPacket, routeInput) {
    if (routeInput.message) {
      return sanitizeSafeText(routeInput.message);
    }

    if (triggerPacket.routine_type === "potty_time") {
      return "Potty Time routine started. Progress beats shame.";
    }

    if (triggerPacket.trigger_type === "parent_picture") {
      return "Parent picture created a PixelPrix chore map.";
    }

    return "PixelPrix routine started.";
  }

  function buildProgressOptions(input, triggerPacket, route) {
    const options = clone(input.progress_options);
    const competition = input.competition_options;

    options.mode = options.mode || deriveModeFromTrigger(triggerPacket, route);
    options.progress_state = options.progress_state || deriveProgressStateFromRoute(route);
    options.item_count = options.item_count || deriveItemCountFromTrigger(triggerPacket, route);
    options.items_completed = options.items_completed || deriveItemsCompletedFromRoute(triggerPacket, route);
    options.routine_name = options.routine_name || deriveChoreName(triggerPacket);
    options.routine_id = options.routine_id || makeId("pixelPrixRoutine");
    options.competition_enabled = options.competition_enabled || shouldEnableCompetition(competition);
    options.competition_type = options.competition_type || deriveCompetitionType(competition);
    options.share_ping_type = options.share_ping_type || "completion_ping";
    options.anonymous_player_tag = options.anonymous_player_tag || buildSafeRacerTag();
    options.voice_help = options.voice_help !== false;
    options.icon_help = options.icon_help !== false;
    options.reading_required = false;
    options.parent_attention_required = true;
    options.no_chat = true;
    options.note = buildProgressNote(triggerPacket, competition);
    options.photo_proof = buildProgressPhotoProof(triggerPacket);

    return options;
  }

  function deriveModeFromTrigger(triggerPacket, route) {
    if (route && route.difficulty) {
      return route.difficulty;
    }

    if (triggerPacket.routine_type === "potty_time") {
      return "tiny_tidy";
    }

    if (triggerPacket.touch_target_count <= 5) {
      return "tiny_tidy";
    }

    if (triggerPacket.touch_target_count <= 10) {
      return "mini_pickup";
    }

    if (triggerPacket.touch_target_count <= 15) {
      return "little_racer";
    }

    if (triggerPacket.touch_target_count <= 25) {
      return "room_rally";
    }

    if (triggerPacket.touch_target_count <= 34) {
      return "prix_sprint";
    }

    return "big_kid_mode";
  }

  function deriveProgressStateFromRoute(route) {
    if (!route || !route.route_state) {
      return "real_chore_progress";
    }

    if (route.route_state === "photo_ready_for_digital_chore_map") {
      return "photo_ready";
    }

    if (route.route_state === "digital_practice_completed") {
      return "digital_completed";
    }

    if (route.route_state === "real_chore_completed_waiting_parent_attention") {
      return "parent_check_needed";
    }

    if (route.route_state === "reward_ready_parent_approval") {
      return "reward_ready";
    }

    if (route.route_state === "blocked_unsafe_chore") {
      return "blocked_unsafe";
    }

    return "real_chore_progress";
  }

  function deriveItemCountFromTrigger(triggerPacket, route) {
    if (triggerPacket.touch_target_count) {
      return triggerPacket.touch_target_count;
    }

    if (route && Array.isArray(route.item_targets) && route.item_targets.length) {
      return route.item_targets.length;
    }

    if (triggerPacket.routine_type === "potty_time") {
      return 3;
    }

    return 5;
  }

  function deriveItemsCompletedFromRoute(triggerPacket, route) {
    if (triggerPacket.routine_type === "potty_time") {
      const potty = triggerPacket.potty_time || {};
      return potty.success_count_today || 0;
    }

    if (
      route &&
      route.score_summary &&
      route.score_summary.item_target_count
    ) {
      return route.score_summary.item_target_count;
    }

    return 0;
  }

  function shouldEnableCompetition(competition) {
    if (competition.competition_scope === "solo_ghost_race") {
      return true;
    }

    if (competition.competition_scope === "household_challenge") {
      return true;
    }

    if (
      competition.competition_scope === "parent_approved_friend_circle" &&
      competition.parent_circle_approved
    ) {
      return true;
    }

    if (competition.competition_scope === "same_age_range_challenge") {
      return true;
    }

    if (
      competition.competition_scope === "area_bucket_challenge" &&
      competition.area_bucket !== "none"
    ) {
      return true;
    }

    if (competition.competition_scope === "cybercade_event") {
      return true;
    }

    return false;
  }

  function deriveCompetitionType(competition) {
    if (competition.competition_scope === "solo_ghost_race") {
      return "best_time_competition";
    }

    if (competition.competition_scope === "household_challenge") {
      return "household_challenge";
    }

    if (competition.competition_scope === "parent_approved_friend_circle") {
      return "team_cleanup_competition";
    }

    if (competition.competition_scope === "same_age_range_challenge") {
      return "best_time_competition";
    }

    if (competition.competition_scope === "area_bucket_challenge") {
      return "cybercade_event";
    }

    if (competition.competition_scope === "cybercade_event") {
      return "cybercade_event";
    }

    return "high_score_competition";
  }

  function buildSafeRacerTag() {
    return `Racer ${String(Math.floor(Math.random() * 90) + 10).padStart(2, "0")}`;
  }

  function buildProgressNote(triggerPacket, competition) {
    return [
      "PixelPrix is ghost racing.",
      "Compete the chore result.",
      "Never expose the child.",
      "Never fall into chat here.",
      `Competition scope: ${competition.competition_scope}.`,
      triggerPacket.picture_stays_source ? "Pictures never leave source." : "",
    ].filter(Boolean).join(" ");
  }

  function buildProgressPhotoProof(triggerPacket) {
    return {
      before_photo_ref:
        triggerPacket.trigger_type === "parent_picture"
          ? triggerPacket.picture_source_ref
          : "",
      after_photo_ref: "",
      screenshot_ref: "",
      chore_area_ref:
        triggerPacket.trigger_type === "parent_picture"
          ? triggerPacket.picture_source_ref
          : "",
      safe_caption: "Source-bound picture reference. Results only may move.",
      raw_photo_stored: false,
      public_photo_allowed: false,
      child_face_required: false,
      parent_approved: triggerPacket.parent_confirmed === true,
      quality_assurance_only: true,
      picture_stays_source: true,
      only_results_move: true,
    };
  }

  function buildCycleBoundary(triggerPacket, progressEntry, displayReceipt) {
    return {
      department: "CyberCare",
      room: "CyberCade",
      game_name: "PixelPrix",
      parent_picture_can_start_chore: triggerPacket.trigger_type === "parent_picture",
      parent_schedule_can_start_routine: triggerPacket.trigger_type === "routine_schedule",
      pictures_never_leave_source: true,
      only_results_move: true,
      touch_target_map_present:
        triggerPacket.touch_target_map &&
        triggerPacket.touch_target_map.length > 0,
      potty_time_supported: triggerPacket.routine_type === "potty_time",
      competition_scope:
        progressEntry &&
        progressEntry.competition &&
        progressEntry.competition.competition_type
          ? progressEntry.competition.competition_type
          : "",
      share_safe_ping_prepared: Boolean(progressEntry && progressEntry.share_safe_ping),
      cybercade_display_prepared: Boolean(displayReceipt),
      chat_off: true,
      child_identity_off: true,
      parent_approval_on: true,
      no_direct_pvp: true,
      ghost_score_only: true,
      no_exact_location: true,
      no_public_child_profile: true,
      no_shame: true,
    };
  }

  function listCompetitionScopes() {
    return COMPETITION_SCOPES.map((scope) => {
      return {
        scope,
        direct_pvp_allowed: false,
        chat_allowed: false,
        child_identity_allowed: false,
        parent_approval_required: true,
        ghost_score_only: true,
      };
    });
  }

  function listCycles(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const status = normalizeSafeReference(cleanFilter.status);
    const triggerType = normalizeTriggerType(cleanFilter.trigger_type);
    const routeId = normalizeSafeReference(cleanFilter.route_id);
    const entryId = normalizeSafeReference(cleanFilter.entry_id);
    const displayState = normalizeSafeReference(cleanFilter.display_state);

    return cycles
      .filter((cycle) => {
        if (status && cycle.status !== status) {
          return false;
        }

        if (
          triggerType &&
          cycle.trigger_packet &&
          cycle.trigger_packet.trigger_type !== triggerType
        ) {
          return false;
        }

        if (
          routeId &&
          cycle.route &&
          cycle.route.route_id !== routeId
        ) {
          return false;
        }

        if (
          entryId &&
          cycle.progress_entry &&
          cycle.progress_entry.entry_id !== entryId
        ) {
          return false;
        }

        if (
          displayState &&
          cycle.display_receipt &&
          cycle.display_receipt.display_state !== displayState
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

  function listPaperLadderRows(filter = {}) {
    return listCycles(filter).map((cycle) => {
      return {
        row_id: makeId("pixelPrixGameControllerPaperRow"),
        cycle_id: cycle.cycle_id,
        status: cycle.status,
        department: "CyberCare",
        room: "CyberCade",
        game_name: "PixelPrix",
        trigger_type:
          cycle.trigger_packet && cycle.trigger_packet.trigger_type
            ? cycle.trigger_packet.trigger_type
            : "",
        picture_stays_source: true,
        only_results_move: true,
        touch_target_count:
          cycle.trigger_packet && cycle.trigger_packet.touch_target_count
            ? cycle.trigger_packet.touch_target_count
            : 0,
        potty_time_supported:
          cycle.trigger_packet && cycle.trigger_packet.routine_type === "potty_time",
        share_safe_ping_prepared: Boolean(cycle.share_safe_ping),
        cybercade_display_prepared: Boolean(cycle.display_receipt),
        chat_off: true,
        child_identity_off: true,
        parent_approval_on: true,
        boundary: "PIXELPRIX_CONTROLLER_PARENT_TRIGGER_RESULTS_ONLY_NO_CHILD_IDENTITY_NO_CHAT",
      };
    });
  }

  function clearCycles() {
    cycles.length = 0;
    return true;
  }

  return {
    runPixelPrixGameCycle,
    listCompetitionScopes,
    listCycles,
    latestCycle,
    listPaperLadderRows,
    clearCycles,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = PixelPrixGameController;
        }
