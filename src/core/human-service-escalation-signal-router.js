// src/core/human-service-escalation-signal-router.js
// CyberCrowd Core — Human Service Escalation Signal Router
// Owns: routing two-button human service signals into safe service lanes.
// Rule: Issue means see me before it breaks. Get Here Now means move now.
// The phone can be the button. The mount is the adapter.
// The panel supervises assignment. Humans serve humans.
// No menu prison. No guessing. No blame.
// Does not: replace the human worker, punish the customer, punish the worker,
// expose identity evidence, include private proof, include address/phone/first name/raw uIDL,
// send email, run payments, dispatch emergency services by itself,
// run surveillance, or deal directly with customer.

const HumanServiceEscalationSignalRouter = (() => {
  const routedSignals = [];

  const SIGNAL_TYPES = [
    "issue",
    "get_here_now",
  ];

  const ADAPTER_TYPES = [
    "phone_touch",
    "mounted_phone_touch",
    "armband_phone_mount",
    "chest_harness_phone_mount",
    "wall_mount_phone",
    "table_mount_phone",
    "kiosk_panel",
    "caregiver_button",
    "pos_touch",
    "qr_touch",
    "voice_touch",
    "bee_drone_clip_on",
    "future_ican_adapter",
    "unknown_adapter",
  ];

  const SERVICE_LANES = [
    "caregiver",
    "bartender",
    "cleaning",
    "food_service",
    "customer_service",
    "front_desk",
    "maintenance",
    "delivery",
    "pickup",
    "laundry",
    "security",
    "manager",
    "worker_support",
    "general_service",
  ];

  const DISPLAY_TARGETS = [
    "worker_phone",
    "julie_status_screen",
    "bartender_screen",
    "bar_display",
    "kitchen_display",
    "caregiver_station",
    "manager_board",
    "kiosk_panel",
    "wall_panel",
    "assignment_board",
    "service_dashboard",
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

  function normalizeSignalType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (clean === "issue") {
      return "issue";
    }

    if (clean === "pre_escalation") {
      return "issue";
    }

    if (clean === "pre-escalation") {
      return "issue";
    }

    if (clean === "see_me") {
      return "issue";
    }

    if (clean === "im_good_if_you_can_see_me") {
      return "issue";
    }

    if (clean === "get_here_now") {
      return "get_here_now";
    }

    if (clean === "get-here-now") {
      return "get_here_now";
    }

    if (clean === "escalation") {
      return "get_here_now";
    }

    if (clean === "urgent") {
      return "get_here_now";
    }

    if (clean === "move_now") {
      return "get_here_now";
    }

    return "";
  }

  function normalizeAdapterType(value) {
    const clean = normalizeText(value).toLowerCase();

    if (ADAPTER_TYPES.includes(clean)) {
      return clean;
    }

    return "unknown_adapter";
  }

  function normalizeServiceLane(value) {
    const clean = normalizeText(value).toLowerCase();

    if (SERVICE_LANES.includes(clean)) {
      return clean;
    }

    return "general_service";
  }

  function normalizeDisplayTargets(value) {
    const requested = normalizeList(value).map((item) => item.toLowerCase());

    if (!requested.length) {
      return ["assignment_board", "service_dashboard"];
    }

    return requested.map((target) => {
      if (DISPLAY_TARGETS.includes(target)) {
        return target;
      }

      return "service_dashboard";
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
      .replace(/\bfirst name\b/gi, "name detail")
      .replace(/\bhome address\b/gi, "address detail")
      .replace(/\bphone number\b/gi, "phone detail")
      .replace(/\braw uIDL\b/gi, "protected uIDL")
      .replace(/\bfull uIDL\b/gi, "protected uIDL")
      .replace(/\barchive contents\b/gi, "archive detail");
  }

  function normalizeInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");
    const signalType = normalizeSignalType(cleanInput.signal_type);

    if (!signalType) {
      throw new Error("VALID_SIGNAL_TYPE_REQUIRED");
    }

    return {
      signal_id: normalizeSafeReference(cleanInput.signal_id) || makeId("humanServiceSignal"),
      created_at: normalizeText(cleanInput.created_at) || now(),
      signal_type: signalType,
      adapter_type: normalizeAdapterType(cleanInput.adapter_type),
      adapter_id: normalizeSafeReference(cleanInput.adapter_id),
      ican_adapter: normalizeBoolean(cleanInput.ican_adapter),
      service_lane: normalizeServiceLane(cleanInput.service_lane),
      surface: normalizeSafeReference(cleanInput.surface),
      location_label: sanitizeSafeText(cleanInput.location_label),
      station_label: sanitizeSafeText(cleanInput.station_label),
      assignment_label: sanitizeSafeText(cleanInput.assignment_label),
      table_label: sanitizeSafeText(cleanInput.table_label),
      room_label: sanitizeSafeText(cleanInput.room_label),
      worker_role: sanitizeSafeText(cleanInput.worker_role),
      requested_display_targets: normalizeDisplayTargets(cleanInput.requested_display_targets),
      safe_person_tag: sanitizeSafeText(cleanInput.safe_person_tag),
      account_tag: normalizeSafeReference(cleanInput.account_tag),
      uidl_hint: normalizeSafeReference(cleanInput.uidl_hint),
      session_id_hint: normalizeSafeReference(cleanInput.session_id_hint),
      message: sanitizeSafeText(cleanInput.message),
      repeated_signal_count: normalizeNumber(cleanInput.repeated_signal_count, 0),
      unresolved_seconds: normalizeNumber(cleanInput.unresolved_seconds, 0),
      allow_manager_visibility: cleanInput.allow_manager_visibility !== false,
      allow_worker_visibility: cleanInput.allow_worker_visibility !== false,
      notes: normalizeList(cleanInput.notes).map(sanitizeSafeText),
    };
  }

  function routeHumanServiceSignal(input = {}) {
    const normalized = normalizeInput(input);
    const priority = derivePriority(normalized);
    const routeState = deriveRouteState(normalized, priority);
    const assignment = buildAssignment(normalized, priority, routeState);
    const displayPacket = buildDisplayPacket(normalized, priority, routeState, assignment);
    const adapterAudit = buildAdapterAudit(normalized, priority, routeState);

    const routed = {
      route_id: makeId("humanServiceEscalationRoute"),
      routed_at: now(),
      source: "core.human-service-escalation-signal-router",
      signal_id: normalized.signal_id,
      signal_type: normalized.signal_type,
      signal_label: buildSignalLabel(normalized.signal_type),
      route_state: routeState,
      priority,
      adapter_type: normalized.adapter_type,
      adapter_id: normalized.adapter_id,
      ican_adapter: normalized.ican_adapter,
      service_lane: normalized.service_lane,
      surface: normalized.surface,
      location_label: normalized.location_label,
      station_label: normalized.station_label,
      assignment_label: normalized.assignment_label,
      table_label: normalized.table_label,
      room_label: normalized.room_label,
      worker_role: normalized.worker_role,
      safe_person_tag: normalized.safe_person_tag,
      account_tag: normalized.account_tag,
      uidl_hint: normalized.uidl_hint,
      session_id_hint: normalized.session_id_hint,
      message: normalized.message,
      repeated_signal_count: normalized.repeated_signal_count,
      unresolved_seconds: normalized.unresolved_seconds,
      assignment,
      display_packet: displayPacket,
      adapter_audit: adapterAudit,
      safe_summary: buildSafeSummary(normalized, priority, routeState),
      paper_ladder_row: buildPaperLadderRow(normalized, priority, routeState, assignment, adapterAudit),
      boundaries: buildBoundaries(),
    };

    routedSignals.push(clone(routed));

    return clone(routed);
  }

  function derivePriority(signal) {
    if (signal.signal_type === "get_here_now") {
      return "urgent";
    }

    if (signal.repeated_signal_count >= 3) {
      return "watch";
    }

    if (signal.unresolved_seconds >= 300) {
      return "watch";
    }

    return "visible";
  }

  function deriveRouteState(signal, priority) {
    if (signal.signal_type === "get_here_now") {
      return "escalation_active";
    }

    if (priority === "watch") {
      return "pre_escalation_watch";
    }

    return "issue_visible";
  }

  function buildSignalLabel(signalType) {
    if (signalType === "issue") {
      return "ISSUE — I’m good if you can see me.";
    }

    if (signalType === "get_here_now") {
      return "GET HERE NOW — stop talking and respond.";
    }

    return "UNKNOWN SERVICE SIGNAL";
  }

  function buildAssignment(signal, priority, routeState) {
    return {
      assignment_id: makeId("humanServiceAssignment"),
      created_at: now(),
      assignment_state: routeState === "escalation_active"
        ? "needs_response_now"
        : "needs_visibility",
      priority,
      service_lane: signal.service_lane,
      worker_role: signal.worker_role || deriveDefaultWorkerRole(signal.service_lane),
      location_label: signal.location_label,
      station_label: signal.station_label,
      table_label: signal.table_label,
      room_label: signal.room_label,
      assignment_label: signal.assignment_label || buildDefaultAssignmentLabel(signal),
      display_targets: signal.requested_display_targets,
      manager_visible: signal.allow_manager_visibility && priority === "urgent",
      worker_visible: signal.allow_worker_visibility,
      status: "open",
      accepted_by: "",
      completed_by: "",
      completed_at: "",
      blocked_reason: "",
    };
  }

  function deriveDefaultWorkerRole(serviceLane) {
    if (serviceLane === "caregiver") {
      return "caregiver";
    }

    if (serviceLane === "bartender") {
      return "bartender";
    }

    if (serviceLane === "cleaning") {
      return "cleaner";
    }

    if (serviceLane === "food_service") {
      return "server";
    }

    if (serviceLane === "maintenance") {
      return "maintenance_worker";
    }

    if (serviceLane === "manager") {
      return "manager";
    }

    if (serviceLane === "security") {
      return "security";
    }

    return "assigned_worker";
  }

  function buildDefaultAssignmentLabel(signal) {
    if (signal.signal_type === "get_here_now") {
      return "Immediate human response requested";
    }

    return "Visible issue needs eyes";
  }

  function buildDisplayPacket(signal, priority, routeState, assignment) {
    return {
      display_packet_id: makeId("humanServiceDisplayPacket"),
      created_at: now(),
      signal_id: signal.signal_id,
      signal_type: signal.signal_type,
      signal_label: buildSignalLabel(signal.signal_type),
      route_state: routeState,
      priority,
      service_lane: signal.service_lane,
      adapter_type: signal.adapter_type,
      surface: signal.surface,
      location_label: signal.location_label,
      station_label: signal.station_label,
      assignment_id: assignment.assignment_id,
      assignment_label: assignment.assignment_label,
      worker_role: assignment.worker_role,
      display_targets: assignment.display_targets,
      visible_status: assignment.status,
      timer_started_at: now(),
      panel_copy: buildPanelCopy(signal, priority, routeState),
      no_menu_prison: true,
      no_guessing: true,
      no_blame: true,
    };
  }

  function buildPanelCopy(signal, priority, routeState) {
    if (routeState === "escalation_active") {
      return {
        headline: "GET HERE NOW",
        body: "Immediate human response requested.",
        instruction: "Assign responder. Move now. Do not route through menu prison.",
        priority,
      };
    }

    if (routeState === "pre_escalation_watch") {
      return {
        headline: "ISSUE WATCH",
        body: "Issue repeated or unresolved. Check before it breaks.",
        instruction: "Give this signal eyes and preserve the human moment.",
        priority,
      };
    }

    return {
      headline: "ISSUE",
      body: "I’m good if you can see me.",
      instruction: "Make the issue visible and assign if needed.",
      priority,
    };
  }

  function buildAdapterAudit(signal, priority, routeState) {
    return {
      audit_id: makeId("humanServiceSignalAdapterAudit"),
      created_at: now(),
      adapter_type: signal.adapter_type,
      adapter_id: signal.adapter_id,
      ican_adapter: signal.ican_adapter,
      service_lane: signal.service_lane,
      surface: signal.surface,
      location_label: signal.location_label,
      station_label: signal.station_label,
      signal_type: signal.signal_type,
      priority,
      route_state: routeState,
      repeated_signal_count: signal.repeated_signal_count,
      unresolved_seconds: signal.unresolved_seconds,
      needs_audit:
        signal.repeated_signal_count >= 3 ||
        signal.unresolved_seconds >= 300,
      audit_reason: deriveAuditReason(signal),
      fine_tuning_candidate:
        signal.repeated_signal_count >= 3 ||
        signal.unresolved_seconds >= 300,
      no_blame: true,
      no_punishment: true,
      no_identity_exposure: true,
    };
  }

  function deriveAuditReason(signal) {
    if (signal.repeated_signal_count >= 3 && signal.unresolved_seconds >= 300) {
      return "REPEATED_AND_UNRESOLVED_SERVICE_SIGNAL";
    }

    if (signal.repeated_signal_count >= 3) {
      return "REPEATED_SERVICE_SIGNAL";
    }

    if (signal.unresolved_seconds >= 300) {
      return "UNRESOLVED_SERVICE_SIGNAL";
    }

    return "";
  }

  function buildSafeSummary(signal, priority, routeState) {
    if (signal.signal_type === "get_here_now") {
      return {
        headline: "Escalation signal routed",
        body: "GET HERE NOW signal routed for immediate human response.",
        safe_tags: ["get_here_now", "escalation", "human_response"],
        priority,
        route_state: routeState,
      };
    }

    return {
      headline: "Issue signal routed",
      body: "ISSUE signal routed as visible pre-escalation attention.",
      safe_tags: ["issue", "pre_escalation", "visible_attention"],
      priority,
      route_state: routeState,
    };
  }

  function buildPaperLadderRow(signal, priority, routeState, assignment, adapterAudit) {
    return {
      row_id: makeId("humanServiceEscalationPaperRow"),
      signal_id: signal.signal_id,
      assignment_id: assignment.assignment_id,
      routed_at: now(),
      signal_type: signal.signal_type,
      route_state: routeState,
      priority,
      adapter_type: signal.adapter_type,
      ican_adapter: signal.ican_adapter,
      service_lane: signal.service_lane,
      surface: signal.surface,
      location_label_present: Boolean(signal.location_label),
      station_label_present: Boolean(signal.station_label),
      assignment_label_present: Boolean(signal.assignment_label),
      display_target_count: assignment.display_targets.length,
      manager_visible: assignment.manager_visible,
      worker_visible: assignment.worker_visible,
      needs_audit: adapterAudit.needs_audit,
      fine_tuning_candidate: adapterAudit.fine_tuning_candidate,
      boundary: "PHONE_CAN_BE_BUTTON_MOUNT_IS_ADAPTER_PANEL_SUPERVISES_ASSIGNMENT_HUMANS_RESPOND",
    };
  }

  function buildBoundaries() {
    return {
      phone_can_be_button: true,
      mount_is_adapter: true,
      signal_is_organ: true,
      panel_supervises_assignment: true,
      humans_serve_humans: true,
      no_menu_prison: true,
      no_guessing: true,
      no_blame: true,
      no_punishment: true,
      no_identity_exposure: true,
      no_auto_emergency_dispatch: true,
      no_surveillance: true,
    };
  }

  function listRoutedSignals(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const signalType = normalizeSignalType(cleanFilter.signal_type);
    const routeState = normalizeText(cleanFilter.route_state);
    const priority = normalizeText(cleanFilter.priority);
    const serviceLane = normalizeText(cleanFilter.service_lane);
    const adapterType = normalizeText(cleanFilter.adapter_type);

    return routedSignals
      .filter((signal) => {
        if (signalType && signal.signal_type !== signalType) {
          return false;
        }

        if (routeState && signal.route_state !== routeState) {
          return false;
        }

        if (priority && signal.priority !== priority) {
          return false;
        }

        if (serviceLane && signal.service_lane !== serviceLane) {
          return false;
        }

        if (adapterType && signal.adapter_type !== adapterType) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestRoutedSignal() {
    if (!routedSignals.length) {
      return null;
    }

    return clone(routedSignals[routedSignals.length - 1]);
  }

  function listDisplayPackets(filter = {}) {
    return listRoutedSignals(filter).map((signal) => clone(signal.display_packet));
  }

  function listPaperLadderRows(filter = {}) {
    return listRoutedSignals(filter).map((signal) => clone(signal.paper_ladder_row));
  }

  function clearRoutedSignals() {
    routedSignals.length = 0;
    return true;
  }

  return {
    routeHumanServiceSignal,
    listRoutedSignals,
    latestRoutedSignal,
    listDisplayPackets,
    listPaperLadderRows,
    clearRoutedSignals,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = HumanServiceEscalationSignalRouter;
}
