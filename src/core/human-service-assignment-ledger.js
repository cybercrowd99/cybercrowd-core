// src/core/human-service-assignment-ledger.js
// CyberCrowd Core — Human Service Assignment Ledger
// Owns: recording human service assignments, coded control pings,
// assignment state changes, panel-safe summaries, display proof,
// QA timestamps, and worker/manager visibility.
// Rule: Router creates the signal. Ledger records the assignment.
// Control ping shows service state. Time proves service movement.
// Panel displays the work. Humans respond.
// No menu prison. No guessing. No blame.
// Does not: replace the human worker, punish the customer, punish the worker,
// expose identity evidence, include private proof, include address/phone/first name/raw uIDL,
// send email, run payments, dispatch emergency services by itself,
// run surveillance, or deal directly with customer.

const HumanServiceAssignmentLedger = (() => {
  const entries = [];

  const ASSIGNMENT_STATES = [
    "open",
    "accepted",
    "on_way",
    "done",
    "blocked",
    "unresolved",
    "unknown",
  ];

  const CONTROL_PINGS = [
    "blue",
    "yellow",
    "red",
    "black",
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
      .replace(/\bfirst name\b/gi, "name detail")
      .replace(/\bhome address\b/gi, "address detail")
      .replace(/\bphone number\b/gi, "phone detail")
      .replace(/\braw uIDL\b/gi, "protected uIDL")
      .replace(/\bfull uIDL\b/gi, "protected uIDL")
      .replace(/\barchive contents\b/gi, "archive detail");
  }

  function normalizeAssignmentState(value) {
    const clean = normalizeText(value).toLowerCase();

    if (clean === "on-way") {
      return "on_way";
    }

    if (clean === "on way") {
      return "on_way";
    }

    if (ASSIGNMENT_STATES.includes(clean)) {
      return clean;
    }

    return "unknown";
  }

  function normalizeControlPing(value) {
    const clean = normalizeText(value).toLowerCase();

    if (CONTROL_PINGS.includes(clean)) {
      return clean;
    }

    return "";
  }

  function normalizeDisplayPacket(packet = {}) {
    if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
      return {
        display_packet_id: "",
        signal_id: "",
        signal_type: "",
        signal_label: "",
        route_state: "",
        priority: "",
        service_lane: "",
        adapter_type: "",
        surface: "",
        location_label: "",
        station_label: "",
        assignment_id: "",
        assignment_label: "",
        worker_role: "",
        display_targets: [],
        visible_status: "",
        timer_started_at: "",
        panel_copy: {},
      };
    }

    return {
      display_packet_id: normalizeSafeReference(packet.display_packet_id),
      created_at: normalizeText(packet.created_at),
      signal_id: normalizeSafeReference(packet.signal_id),
      signal_type: normalizeText(packet.signal_type),
      signal_label: sanitizeSafeText(packet.signal_label),
      route_state: normalizeText(packet.route_state),
      priority: normalizeText(packet.priority),
      service_lane: normalizeText(packet.service_lane),
      adapter_type: normalizeText(packet.adapter_type),
      surface: normalizeSafeReference(packet.surface),
      location_label: sanitizeSafeText(packet.location_label),
      station_label: sanitizeSafeText(packet.station_label),
      assignment_id: normalizeSafeReference(packet.assignment_id),
      assignment_label: sanitizeSafeText(packet.assignment_label),
      worker_role: sanitizeSafeText(packet.worker_role),
      display_targets: normalizeList(packet.display_targets).map(sanitizeSafeText),
      visible_status: normalizeText(packet.visible_status),
      timer_started_at: normalizeText(packet.timer_started_at),
      panel_copy: normalizePanelCopy(packet.panel_copy),
      no_menu_prison: packet.no_menu_prison !== false,
      no_guessing: packet.no_guessing !== false,
      no_blame: packet.no_blame !== false,
    };
  }

  function normalizePanelCopy(copy = {}) {
    if (!copy || typeof copy !== "object" || Array.isArray(copy)) {
      return {
        headline: "",
        body: "",
        instruction: "",
        priority: "",
      };
    }

    return {
      headline: sanitizeSafeText(copy.headline),
      body: sanitizeSafeText(copy.body),
      instruction: sanitizeSafeText(copy.instruction),
      priority: normalizeText(copy.priority),
    };
  }

  function normalizeAssignment(assignment = {}) {
    if (!assignment || typeof assignment !== "object" || Array.isArray(assignment)) {
      return {
        assignment_id: "",
        assignment_state: "open",
        priority: "visible",
        service_lane: "general_service",
        worker_role: "assigned_worker",
        location_label: "",
        station_label: "",
        table_label: "",
        room_label: "",
        assignment_label: "",
        display_targets: [],
        manager_visible: false,
        worker_visible: true,
        status: "open",
        accepted_by: "",
        completed_by: "",
        completed_at: "",
        blocked_reason: "",
      };
    }

    return {
      assignment_id: normalizeSafeReference(assignment.assignment_id),
      created_at: normalizeText(assignment.created_at),
      assignment_state: normalizeAssignmentState(assignment.assignment_state || assignment.status),
      priority: normalizeText(assignment.priority),
      service_lane: normalizeText(assignment.service_lane),
      worker_role: sanitizeSafeText(assignment.worker_role),
      location_label: sanitizeSafeText(assignment.location_label),
      station_label: sanitizeSafeText(assignment.station_label),
      table_label: sanitizeSafeText(assignment.table_label),
      room_label: sanitizeSafeText(assignment.room_label),
      assignment_label: sanitizeSafeText(assignment.assignment_label),
      display_targets: normalizeList(assignment.display_targets).map(sanitizeSafeText),
      manager_visible: normalizeBoolean(assignment.manager_visible),
      worker_visible: assignment.worker_visible !== false,
      status: normalizeAssignmentState(assignment.status),
      accepted_by: sanitizeSafeText(assignment.accepted_by),
      completed_by: sanitizeSafeText(assignment.completed_by),
      completed_at: normalizeText(assignment.completed_at),
      blocked_reason: sanitizeSafeText(assignment.blocked_reason),
    };
  }

  function normalizeAdapterAudit(audit = {}) {
    if (!audit || typeof audit !== "object" || Array.isArray(audit)) {
      return {
        audit_id: "",
        adapter_type: "",
        adapter_id: "",
        ican_adapter: false,
        service_lane: "",
        surface: "",
        signal_type: "",
        priority: "",
        route_state: "",
        repeated_signal_count: 0,
        unresolved_seconds: 0,
        needs_audit: false,
        audit_reason: "",
        fine_tuning_candidate: false,
      };
    }

    return {
      audit_id: normalizeSafeReference(audit.audit_id),
      created_at: normalizeText(audit.created_at),
      adapter_type: normalizeText(audit.adapter_type),
      adapter_id: normalizeSafeReference(audit.adapter_id),
      ican_adapter: normalizeBoolean(audit.ican_adapter),
      service_lane: normalizeText(audit.service_lane),
      surface: normalizeSafeReference(audit.surface),
      location_label: sanitizeSafeText(audit.location_label),
      station_label: sanitizeSafeText(audit.station_label),
      signal_type: normalizeText(audit.signal_type),
      priority: normalizeText(audit.priority),
      route_state: normalizeText(audit.route_state),
      repeated_signal_count: normalizeNumber(audit.repeated_signal_count, 0),
      unresolved_seconds: normalizeNumber(audit.unresolved_seconds, 0),
      needs_audit: normalizeBoolean(audit.needs_audit),
      audit_reason: normalizeText(audit.audit_reason),
      fine_tuning_candidate: normalizeBoolean(audit.fine_tuning_candidate),
      no_blame: audit.no_blame !== false,
      no_punishment: audit.no_punishment !== false,
      no_identity_exposure: audit.no_identity_exposure !== false,
    };
  }

  function normalizeRoute(route = {}) {
    const cleanRoute = requireObject(route, "ROUTED_SIGNAL_REQUIRED");

    return {
      route_id: requireText(cleanRoute.route_id, "ROUTE_ID_REQUIRED"),
      routed_at: normalizeText(cleanRoute.routed_at) || now(),
      source: normalizeText(cleanRoute.source),
      signal_id: requireText(cleanRoute.signal_id, "SIGNAL_ID_REQUIRED"),
      signal_type: requireText(cleanRoute.signal_type, "SIGNAL_TYPE_REQUIRED"),
      signal_label: sanitizeSafeText(cleanRoute.signal_label),
      route_state: normalizeText(cleanRoute.route_state),
      priority: normalizeText(cleanRoute.priority),
      adapter_type: normalizeText(cleanRoute.adapter_type),
      adapter_id: normalizeSafeReference(cleanRoute.adapter_id),
      ican_adapter: normalizeBoolean(cleanRoute.ican_adapter),
      service_lane: normalizeText(cleanRoute.service_lane),
      surface: normalizeSafeReference(cleanRoute.surface),
      location_label: sanitizeSafeText(cleanRoute.location_label),
      station_label: sanitizeSafeText(cleanRoute.station_label),
      assignment_label: sanitizeSafeText(cleanRoute.assignment_label),
      table_label: sanitizeSafeText(cleanRoute.table_label),
      room_label: sanitizeSafeText(cleanRoute.room_label),
      worker_role: sanitizeSafeText(cleanRoute.worker_role),
      safe_person_tag: sanitizeSafeText(cleanRoute.safe_person_tag),
      account_tag: normalizeSafeReference(cleanRoute.account_tag),
      uidl_hint: normalizeSafeReference(cleanRoute.uidl_hint),
      session_id_hint: normalizeSafeReference(cleanRoute.session_id_hint),
      message: sanitizeSafeText(cleanRoute.message),
      repeated_signal_count: normalizeNumber(cleanRoute.repeated_signal_count, 0),
      unresolved_seconds: normalizeNumber(cleanRoute.unresolved_seconds, 0),
      assignment: normalizeAssignment(cleanRoute.assignment),
      display_packet: normalizeDisplayPacket(cleanRoute.display_packet),
      adapter_audit: normalizeAdapterAudit(cleanRoute.adapter_audit),
      safe_summary: normalizeSafeSummary(cleanRoute.safe_summary),
      paper_ladder_row: cleanRoute.paper_ladder_row || {},
      boundaries: cleanRoute.boundaries || {},
    };
  }

  function normalizeSafeSummary(summary = {}) {
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
      return {
        headline: "",
        body: "",
        safe_tags: [],
        priority: "",
        route_state: "",
      };
    }

    return {
      headline: sanitizeSafeText(summary.headline),
      body: sanitizeSafeText(summary.body),
      safe_tags: normalizeList(summary.safe_tags).map(sanitizeSafeText),
      priority: normalizeText(summary.priority),
      route_state: normalizeText(summary.route_state),
    };
  }

  function normalizeProofInput(proof = {}) {
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      return {
        proof_id: "",
        screenshot_ref: "",
        display_ref: "",
        panel_id: "",
        captured_at: "",
        proof_type: "",
        safe_caption: "",
      };
    }

    return {
      proof_id: normalizeSafeReference(proof.proof_id) || makeId("humanServiceDisplayProof"),
      screenshot_ref: normalizeSafeReference(proof.screenshot_ref),
      display_ref: normalizeSafeReference(proof.display_ref),
      panel_id: normalizeSafeReference(proof.panel_id),
      captured_at: normalizeText(proof.captured_at) || now(),
      proof_type: normalizeText(proof.proof_type) || "display_state",
      safe_caption: sanitizeSafeText(proof.safe_caption),
      private_identity_exposed: false,
      quality_assurance_only: true,
    };
  }

  function deriveInitialState(route) {
    if (route.signal_type === "get_here_now") {
      return "open";
    }

    if (route.route_state === "pre_escalation_watch") {
      return "open";
    }

    return "open";
  }

  function deriveControlPing(state, route = {}) {
    const cleanState = normalizeAssignmentState(state);

    if (cleanState === "blocked") {
      return "black";
    }

    if (cleanState === "unresolved") {
      return "red";
    }

    if (route.signal_type === "get_here_now" && cleanState !== "done") {
      return "red";
    }

    if (cleanState === "accepted" || cleanState === "on_way") {
      return "yellow";
    }

    if (cleanState === "done") {
      return "blue";
    }

    if (cleanState === "open") {
      return "blue";
    }

    return "black";
  }

  function buildControlPingMeaning(ping, state) {
    if (ping === "red") {
      return {
        color: "red",
        meaning: "urgent / unresolved / needs response now",
        assignment_state: state,
      };
    }

    if (ping === "yellow") {
      return {
        color: "yellow",
        meaning: "accepted / on-way / watch state",
        assignment_state: state,
      };
    }

    if (ping === "blue") {
      return {
        color: "blue",
        meaning: "open / visible / service movement normal",
        assignment_state: state,
      };
    }

    return {
      color: "black",
      meaning: "blocked / failed / manager audit needed",
      assignment_state: state,
    };
  }

  function recordAssignment(route = {}, options = {}) {
    const normalizedRoute = normalizeRoute(route);
    const cleanOptions =
      options && typeof options === "object" && !Array.isArray(options)
        ? options
        : {};

    const initialState = normalizeAssignmentState(cleanOptions.assignment_state) === "unknown"
      ? deriveInitialState(normalizedRoute)
      : normalizeAssignmentState(cleanOptions.assignment_state);

    const proof = normalizeProofInput(cleanOptions.display_proof || cleanOptions.panel_screenshot);

    const entry = {
      entry_id: makeId("humanServiceAssignmentLedger"),
      recorded_at: now(),
      source: "core.human-service-escalation-signal-router",
      route_id: normalizedRoute.route_id,
      signal_id: normalizedRoute.signal_id,
      assignment_id:
        normalizedRoute.assignment.assignment_id ||
        makeId("humanServiceAssignment"),
      signal_type: normalizedRoute.signal_type,
      signal_label: normalizedRoute.signal_label,
      route_state: normalizedRoute.route_state,
      priority: normalizedRoute.priority,
      adapter_type: normalizedRoute.adapter_type,
      adapter_id: normalizedRoute.adapter_id,
      ican_adapter: normalizedRoute.ican_adapter,
      service_lane: normalizedRoute.service_lane,
      surface: normalizedRoute.surface,
      location_label: normalizedRoute.location_label,
      station_label: normalizedRoute.station_label,
      assignment_label:
        normalizedRoute.assignment.assignment_label ||
        normalizedRoute.assignment_label,
      table_label: normalizedRoute.table_label,
      room_label: normalizedRoute.room_label,
      worker_role:
        normalizedRoute.assignment.worker_role ||
        normalizedRoute.worker_role,
      safe_person_tag: normalizedRoute.safe_person_tag,
      account_tag: normalizedRoute.account_tag,
      uidl_hint: normalizedRoute.uidl_hint,
      session_id_hint: normalizedRoute.session_id_hint,
      message: normalizedRoute.message,
      assignment_state: initialState,
      control_ping: deriveControlPing(initialState, normalizedRoute),
      control_ping_meaning: buildControlPingMeaning(
        deriveControlPing(initialState, normalizedRoute),
        initialState
      ),
      state_history: [
        buildStateHistoryItem({
          state: initialState,
          route: normalizedRoute,
          proof,
          actor: sanitizeSafeText(cleanOptions.actor),
          actor_role: sanitizeSafeText(cleanOptions.actor_role),
          note: sanitizeSafeText(cleanOptions.note),
        }),
      ],
      assignment: clone(normalizedRoute.assignment),
      display_packet: clone(normalizedRoute.display_packet),
      adapter_audit: clone(normalizedRoute.adapter_audit),
      display_proofs: proof.screenshot_ref || proof.display_ref || proof.panel_id
        ? [proof]
        : [],
      panel_safe_summary: buildPanelSafeSummary(
        normalizedRoute,
        initialState,
        proof
      ),
      quality_assurance: buildQualityAssuranceSummary(
        normalizedRoute,
        initialState,
        proof
      ),
      visibility: buildVisibilitySummary(normalizedRoute, initialState),
      paper_ladder_row: buildPaperLadderRow(normalizedRoute, initialState, proof),
      net_summary: null,
      boundaries: buildBoundaries(),
    };

    entry.net_summary = buildNetSummary(entry);

    entries.push(clone(entry));

    return clone(entry);
  }

  function buildStateHistoryItem(input = {}) {
    const state = normalizeAssignmentState(input.state);
    const route = input.route || {};
    const proof = input.proof || {};

    return {
      history_id: makeId("humanServiceAssignmentState"),
      timestamp: now(),
      state,
      control_ping: deriveControlPing(state, route),
      control_ping_meaning: buildControlPingMeaning(
        deriveControlPing(state, route),
        state
      ),
      actor: sanitizeSafeText(input.actor),
      actor_role: sanitizeSafeText(input.actor_role),
      note: sanitizeSafeText(input.note),
      display_proof_id: proof.proof_id || "",
      screenshot_ref: proof.screenshot_ref || "",
      quality_assurance_timestamp: now(),
    };
  }

  function updateAssignmentState(assignmentId, state, options = {}) {
    const cleanAssignmentId = requireText(assignmentId, "ASSIGNMENT_ID_REQUIRED");
    const cleanState = normalizeAssignmentState(state);

    if (cleanState === "unknown") {
      throw new Error("VALID_ASSIGNMENT_STATE_REQUIRED");
    }

    const entry = entries.find((item) => item.assignment_id === cleanAssignmentId);

    if (!entry) {
      throw new Error("ASSIGNMENT_NOT_FOUND");
    }

    const cleanOptions =
      options && typeof options === "object" && !Array.isArray(options)
        ? options
        : {};

    const proof = normalizeProofInput(cleanOptions.display_proof || cleanOptions.panel_screenshot);
    const routeLike = {
      signal_type: entry.signal_type,
      route_state: entry.route_state,
    };

    const historyItem = buildStateHistoryItem({
      state: cleanState,
      route: routeLike,
      proof,
      actor: sanitizeSafeText(cleanOptions.actor),
      actor_role: sanitizeSafeText(cleanOptions.actor_role),
      note: sanitizeSafeText(cleanOptions.note),
    });

    entry.assignment_state = cleanState;
    entry.control_ping = deriveControlPing(cleanState, routeLike);
    entry.control_ping_meaning = buildControlPingMeaning(entry.control_ping, cleanState);
    entry.updated_at = now();
    entry.state_history.push(historyItem);

    if (proof.screenshot_ref || proof.display_ref || proof.panel_id) {
      entry.display_proofs.push(proof);
    }

    entry.panel_safe_summary = buildPanelSafeSummary(entry, cleanState, proof);
    entry.quality_assurance = buildQualityAssuranceSummary(entry, cleanState, proof);
    entry.visibility = buildVisibilitySummary(entry, cleanState);
    entry.paper_ladder_row = buildPaperLadderRow(entry, cleanState, proof);
    entry.net_summary = buildNetSummary(entry);

    return clone(entry);
  }

  function acceptAssignment(assignmentId, options = {}) {
    return updateAssignmentState(assignmentId, "accepted", options);
  }

  function markOnWay(assignmentId, options = {}) {
    return updateAssignmentState(assignmentId, "on_way", options);
  }

  function markDone(assignmentId, options = {}) {
    return updateAssignmentState(assignmentId, "done", options);
  }

  function markBlocked(assignmentId, options = {}) {
    return updateAssignmentState(assignmentId, "blocked", options);
  }

  function markUnresolved(assignmentId, options = {}) {
    return updateAssignmentState(assignmentId, "unresolved", options);
  }

  function buildPanelSafeSummary(routeOrEntry, state, proof) {
    const displayPacket = routeOrEntry.display_packet || {};
    const panelCopy = displayPacket.panel_copy || {};
    const controlPing = deriveControlPing(state, routeOrEntry);

    return {
      summary_id: makeId("humanServicePanelSafeSummary"),
      prepared_at: now(),
      signal_id: routeOrEntry.signal_id || "",
      assignment_id:
        routeOrEntry.assignment_id ||
        (routeOrEntry.assignment && routeOrEntry.assignment.assignment_id) ||
        "",
      headline: panelCopy.headline || buildFallbackPanelHeadline(routeOrEntry, state),
      body: panelCopy.body || buildFallbackPanelBody(routeOrEntry, state),
      instruction:
        panelCopy.instruction ||
        "Panel displays the work. Humans respond.",
      assignment_state: state,
      control_ping: controlPing,
      control_ping_meaning: buildControlPingMeaning(controlPing, state).meaning,
      priority: routeOrEntry.priority || "",
      service_lane: routeOrEntry.service_lane || "",
      adapter_type: routeOrEntry.adapter_type || "",
      surface: routeOrEntry.surface || "",
      location_label: routeOrEntry.location_label || "",
      station_label: routeOrEntry.station_label || "",
      assignment_label: routeOrEntry.assignment_label || "",
      worker_role: routeOrEntry.worker_role || "",
      display_targets: displayPacket.display_targets || [],
      screenshot_ref: proof && proof.screenshot_ref ? proof.screenshot_ref : "",
      display_ref: proof && proof.display_ref ? proof.display_ref : "",
      display_proof_attached: Boolean(
        proof && (proof.screenshot_ref || proof.display_ref || proof.panel_id)
      ),
      quality_assurance_only: true,
      private_identity_exposed: false,
    };
  }

  function buildFallbackPanelHeadline(routeOrEntry, state) {
    if (routeOrEntry.signal_type === "get_here_now") {
      return "GET HERE NOW";
    }

    if (state === "unresolved") {
      return "UNRESOLVED SERVICE SIGNAL";
    }

    if (state === "blocked") {
      return "BLOCKED SERVICE SIGNAL";
    }

    return "ISSUE";
  }

  function buildFallbackPanelBody(routeOrEntry, state) {
    if (state === "done") {
      return "Service assignment marked done.";
    }

    if (state === "accepted") {
      return "Service assignment accepted.";
    }

    if (state === "on_way") {
      return "Responder is on the way.";
    }

    if (state === "blocked") {
      return "Service assignment is blocked and needs review.";
    }

    if (state === "unresolved") {
      return "Service assignment is unresolved and needs response.";
    }

    if (routeOrEntry.signal_type === "get_here_now") {
      return "Immediate human response requested.";
    }

    return "I’m good if you can see me.";
  }

  function buildQualityAssuranceSummary(routeOrEntry, state, proof) {
    const history = Array.isArray(routeOrEntry.state_history)
      ? routeOrEntry.state_history
      : [];

    return {
      qa_id: makeId("humanServiceQualityAssurance"),
      prepared_at: now(),
      assignment_state: state,
      control_ping: deriveControlPing(state, routeOrEntry),
      route_recorded_at: routeOrEntry.routed_at || routeOrEntry.recorded_at || "",
      assignment_recorded_at: routeOrEntry.recorded_at || now(),
      latest_state_timestamp: history.length
        ? history[history.length - 1].timestamp
        : now(),
      display_proof_attached: Boolean(
        proof && (proof.screenshot_ref || proof.display_ref || proof.panel_id)
      ),
      screenshot_ref: proof && proof.screenshot_ref ? proof.screenshot_ref : "",
      display_ref: proof && proof.display_ref ? proof.display_ref : "",
      quality_assurance_timestamp: now(),
      time_proves_service_movement: true,
      screenshot_proves_display_state: Boolean(
        proof && (proof.screenshot_ref || proof.display_ref)
      ),
      screenshot_is_punishment: false,
      no_private_identity_exposure: true,
    };
  }

  function buildVisibilitySummary(routeOrEntry, state) {
    const assignment = routeOrEntry.assignment || {};

    return {
      visibility_id: makeId("humanServiceVisibility"),
      prepared_at: now(),
      assignment_state: state,
      worker_visible:
        routeOrEntry.worker_visible !== false &&
        assignment.worker_visible !== false,
      manager_visible: shouldManagerSee(routeOrEntry, state),
      panel_visible: true,
      display_targets:
        routeOrEntry.display_packet && routeOrEntry.display_packet.display_targets
          ? clone(routeOrEntry.display_packet.display_targets)
          : assignment.display_targets
            ? clone(assignment.display_targets)
            : [],
      visibility_reason: deriveVisibilityReason(routeOrEntry, state),
      no_identity_exposure: true,
      no_blame: true,
      no_punishment: true,
    };
  }

  function shouldManagerSee(routeOrEntry, state) {
    if (state === "blocked" || state === "unresolved") {
      return true;
    }

    if (routeOrEntry.signal_type === "get_here_now") {
      return true;
    }

    if (
      routeOrEntry.adapter_audit &&
      routeOrEntry.adapter_audit.needs_audit === true
    ) {
      return true;
    }

    if (
      routeOrEntry.assignment &&
      routeOrEntry.assignment.manager_visible === true
    ) {
      return true;
    }

    return false;
  }

  function deriveVisibilityReason(routeOrEntry, state) {
    if (state === "blocked") {
      return "BLOCKED_SIGNAL_MANAGER_AUDIT";
    }

    if (state === "unresolved") {
      return "UNRESOLVED_SIGNAL_MANAGER_VISIBILITY";
    }

    if (routeOrEntry.signal_type === "get_here_now") {
      return "GET_HERE_NOW_SIGNAL";
    }

    if (
      routeOrEntry.adapter_audit &&
      routeOrEntry.adapter_audit.needs_audit === true
    ) {
      return "ADAPTER_AUDIT_NEEDED";
    }

    return "WORKER_ASSIGNMENT_VISIBILITY";
  }

  function buildPaperLadderRow(routeOrEntry, state, proof) {
    const controlPing = deriveControlPing(state, routeOrEntry);

    return {
      row_id: makeId("humanServiceAssignmentPaperRow"),
      signal_id: routeOrEntry.signal_id || "",
      assignment_id:
        routeOrEntry.assignment_id ||
        (routeOrEntry.assignment && routeOrEntry.assignment.assignment_id) ||
        "",
      timestamp: now(),
      assignment_state: state,
      control_ping: controlPing,
      control_ping_meaning: buildControlPingMeaning(controlPing, state).meaning,
      signal_type: routeOrEntry.signal_type || "",
      priority: routeOrEntry.priority || "",
      adapter_type: routeOrEntry.adapter_type || "",
      service_lane: routeOrEntry.service_lane || "",
      surface: routeOrEntry.surface || "",
      location_label_present: Boolean(routeOrEntry.location_label),
      station_label_present: Boolean(routeOrEntry.station_label),
      assignment_label_present: Boolean(routeOrEntry.assignment_label),
      screenshot_proof_attached: Boolean(
        proof && (proof.screenshot_ref || proof.display_ref)
      ),
      quality_assurance_timestamp: now(),
      worker_visible: true,
      manager_visible: shouldManagerSee(routeOrEntry, state),
      boundary: "CONTROL_PING_TIMESTAMPED_PANEL_PROOF_QA_HUMANS_RESPOND_NO_BLAME",
    };
  }

  function buildNetSummary(entry) {
    return {
      entry_id: entry.entry_id,
      route_id: entry.route_id,
      signal_id: entry.signal_id,
      assignment_id: entry.assignment_id,
      signal_type: entry.signal_type,
      signal_label: entry.signal_label,
      route_state: entry.route_state,
      priority: entry.priority,
      assignment_state: entry.assignment_state,
      control_ping: entry.control_ping,
      control_ping_meaning: entry.control_ping_meaning,
      adapter_type: entry.adapter_type,
      ican_adapter: entry.ican_adapter,
      service_lane: entry.service_lane,
      surface: entry.surface,
      location_label: entry.location_label,
      station_label: entry.station_label,
      assignment_label: entry.assignment_label,
      worker_role: entry.worker_role,
      safe_person_tag: entry.safe_person_tag,
      account_tag: entry.account_tag,
      uidl_hint: entry.uidl_hint,
      session_id_hint: entry.session_id_hint,
      panel_safe_summary: clone(entry.panel_safe_summary),
      quality_assurance: clone(entry.quality_assurance),
      visibility: clone(entry.visibility),
      adapter_audit: clone(entry.adapter_audit),
      display_packet: clone(entry.display_packet),
      display_proofs: clone(entry.display_proofs),
      state_history: clone(entry.state_history),
      identity_boundary: "SAFE_REFERENCES_ONLY_NO_IDENTITY_EXPOSURE",
      service_boundary: "PANEL_DISPLAYS_WORK_HUMANS_RESPOND_NO_MENU_PRISON_NO_BLAME",
    };
  }

  function buildBoundaries() {
    return {
      router_creates_signal: true,
      ledger_records_assignment: true,
      control_ping_shows_service_state: true,
      time_proves_service_movement: true,
      panel_displays_work: true,
      screenshot_proves_display_state: true,
      humans_respond: true,
      no_menu_prison: true,
      no_guessing: true,
      no_blame: true,
      no_punishment: true,
      no_identity_exposure: true,
      no_auto_emergency_dispatch: true,
      no_surveillance: true,
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
    const assignmentId = normalizeSafeReference(cleanFilter.assignment_id);
    const signalId = normalizeSafeReference(cleanFilter.signal_id);
    const signalType = normalizeText(cleanFilter.signal_type);
    const assignmentState = normalizeAssignmentState(cleanFilter.assignment_state);
    const controlPing = normalizeControlPing(cleanFilter.control_ping);
    const serviceLane = normalizeText(cleanFilter.service_lane);
    const adapterType = normalizeText(cleanFilter.adapter_type);

    return entries
      .filter((entry) => {
        if (assignmentId && entry.assignment_id !== assignmentId) {
          return false;
        }

        if (signalId && entry.signal_id !== signalId) {
          return false;
        }

        if (signalType && entry.signal_type !== signalType) {
          return false;
        }

        if (assignmentState !== "unknown" && entry.assignment_state !== assignmentState) {
          return false;
        }

        if (controlPing && entry.control_ping !== controlPing) {
          return false;
        }

        if (serviceLane && entry.service_lane !== serviceLane) {
          return false;
        }

        if (adapterType && entry.adapter_type !== adapterType) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function listPanelSafeSummaries(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.panel_safe_summary));
  }

  function listQualityAssuranceRows(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.quality_assurance));
  }

  function listPaperLadderRows(filter = {}) {
    return listEntries(filter).map((entry) => clone(entry.paper_ladder_row));
  }

  function clearEntries() {
    entries.length = 0;
    return true;
  }

  return {
    recordAssignment,
    updateAssignmentState,
    acceptAssignment,
    markOnWay,
    markDone,
    markBlocked,
    markUnresolved,
    latestEntry,
    latestNetSummary,
    listEntries,
    listPanelSafeSummaries,
    listQualityAssuranceRows,
    listPaperLadderRows,
    clearEntries,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = HumanServiceAssignmentLedger;
}
