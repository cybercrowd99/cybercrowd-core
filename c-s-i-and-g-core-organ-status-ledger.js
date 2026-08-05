// c-s-i-and-g-core-organ-status-ledger.js
// CyberCrowd — CSI&G Core Organ Status Ledger
// 
// Owns:
// - recording readable CSI&G Core organ status snapshots
// - preserving pass / pending / held / rejected organ states
// - creating a paper-ladder-friendly audit view
// - summarizing organ readiness without executing authority
// - making the Core organ easy to print, review, and compare
//
// Does NOT own:
// - authority execution
// - identity creation
// - movement approval
// - final Dewey classification
// - provider execution
// - OAuth
// - credential storage
// - token storage
// - scraping
// - webhook delivery
// - payment
// - sessions
// - cookies
// - KV storage
// - UI
// - real-world execution

const CyberCrowdCoreOrganStatusLedger = (() => {
  const LEDGER_NAME = "csi_and_g_core_organ_status_ledger";

  const ACCEPTED_ORGAN_READY_STATUS = "csi_and_g_core_organ_ready_no_authority";
  const ACCEPTED_ORGAN_PENDING_STATUS = "csi_and_g_core_organ_pending_no_authority";
  const ACCEPTED_ORGAN_HELD_STATUS = "csi_and_g_core_organ_held_no_authority";
  const ACCEPTED_ORGAN_REJECTED_STATUS = "csi_and_g_core_organ_rejected_no_authority";

  const BLOCKED_MARKERS = [
    "000_future_sci_fi_unclassified",
    "null horizon authority",
    "000 authority",
    "authority_from_000",
    "private_id",
    "private id",
    "private_identity",
    "private identity",
    "protected_identity",
    "protected identity",
    "internal_identity",
    "internal identity",
    "secret",
    "password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "bearer",
    "session",
    "cookie",
    "kv",
    "client_secret",
    "client secret",
    "api_key",
    "api key",
    "oauth",
    "spotify_oauth",
    "spotify oauth",
    "spotify_token",
    "spotify token",
    "pandora_oauth",
    "pandora oauth",
    "pandora_token",
    "pandora token",
    "refresh credential",
    "login credential",
    "scrape",
    "scraping",
    "heart rate",
    "blood oxygen",
    "spo2",
    "sleep",
    "medical",
    "health",
    "biometric",
    "fingerprint",
    "face id",
    "dna",
    "gps",
    "precise location",
    "exact location",
    "latitude",
    "longitude",
    "raw_camera",
    "raw camera",
    "raw_microphone",
    "raw microphone",
    "camera stream",
    "microphone stream"
  ];

  const state = {
    configured: false,
    received: [],
    snapshots: [],
    pass: [],
    pending: [],
    held: [],
    rejected: []
  };

  let CoreOrganController = null;

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return String(value);
    }
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function safeRequire(path) {
    if (typeof require === "undefined") {
      return null;
    }

    try {
      return require(path);
    } catch (error) {
      return null;
    }
  }

  function configure(deps = {}) {
    CoreOrganController =
      deps.CoreOrganController ||
      deps.coreOrganController ||
      deps.organController ||
      CoreOrganController ||
      safeRequire("./c-s-i-and-g-core-organ-controller.js") ||
      null;

    state.configured = Boolean(CoreOrganController);

    return {
      configured: state.configured,
      has_core_organ_controller: Boolean(CoreOrganController)
    };
  }

  function toText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value.toLowerCase();
    }

    try {
      return JSON.stringify(value).toLowerCase();
    } catch (error) {
      return String(value).toLowerCase();
    }
  }

  function cleanText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function containsBlockedMaterial(input) {
    const text = toText(input);

    return BLOCKED_MARKERS.some((marker) => {
      return text.includes(marker);
    });
  }

  function hold(target, reason) {
    const record = {
      id: makeId("csiCoreOrganStatusHold"),
      held_at: now(),
      ledger: LEDGER_NAME,
      reason,
      target: clone(target),
      printable: false,
      paper_ladder_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "held_by_csi_and_g_core_organ_status_ledger"
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("csiCoreOrganStatusReject"),
      rejected_at: now(),
      ledger: LEDGER_NAME,
      reason,
      target: clone(target),
      printable: false,
      paper_ladder_ready: false,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "rejected_by_csi_and_g_core_organ_status_ledger"
    };

    state.rejected.push(record);
    return record;
  }

  function recordReceived(input = {}) {
    const record = {
      id: makeId("csiCoreOrganStatusReceive"),
      received_at: now(),
      ledger: LEDGER_NAME,
      input: clone(input),
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "received_by_csi_and_g_core_organ_status_ledger"
    };

    state.received.push(record);
    return record;
  }

  function isOrganRun(input = {}) {
    return Boolean(
      input &&
      typeof input === "object" &&
      input.organ === "csi_and_g_core_organ" &&
      [
        ACCEPTED_ORGAN_READY_STATUS,
        ACCEPTED_ORGAN_PENDING_STATUS,
        ACCEPTED_ORGAN_HELD_STATUS,
        ACCEPTED_ORGAN_REJECTED_STATUS
      ].includes(input.status) &&
      input.authority_allowed === false &&
      input.external_call_allowed === false &&
      input.executed === false
    );
  }

  function pullOrganStatus() {
    configure();

    if (
      CoreOrganController &&
      typeof CoreOrganController.organStatus === "function"
    ) {
      return CoreOrganController.organStatus();
    }

    return null;
  }

  function pullLastOrganRun() {
    configure();

    if (
      CoreOrganController &&
      typeof CoreOrganController.readLastRun === "function"
    ) {
      return CoreOrganController.readLastRun();
    }

    return null;
  }

  function readStepRows(run = {}) {
    const steps = Array.isArray(run.steps) ? run.steps : [];

    return steps.map((step, index) => {
      return {
        order: index + 1,
        step: step.name || "unknown_step",
        status: step.status || "unknown_status",
        pass_fail: step.status && String(step.status).includes("ready")
          ? "PASS"
          : step.status && String(step.status).includes("held")
            ? "HELD"
            : step.status && String(step.status).includes("rejected")
              ? "REJECTED"
              : "PENDING",
        authority_allowed: false,
        external_call_allowed: false,
        executed: false
      };
    });
  }

  function readOrganPassFail(input = {}) {
    if (!input || typeof input !== "object") {
      return "REJECTED";
    }

    if (input.status === ACCEPTED_ORGAN_READY_STATUS || input.organ_ready === true) {
      return "PASS";
    }

    if (input.status === ACCEPTED_ORGAN_HELD_STATUS) {
      return "HELD";
    }

    if (input.status === ACCEPTED_ORGAN_REJECTED_STATUS) {
      return "REJECTED";
    }

    return "PENDING";
  }

  function buildSnapshot(input = {}, options = {}) {
    const status = pullOrganStatus();
    const run = isOrganRun(input) ? input : input.run || pullLastOrganRun() || input;
    const passFail = readOrganPassFail(run);
    const stepRows = readStepRows(run);

    return {
      id: makeId("csiCoreOrganStatusSnapshot"),
      ledger: LEDGER_NAME,
      recorded_at: now(),
      label: options.label || "CSI&G Core Organ Status",
      commit: options.commit || null,
      parent_commit: options.parent_commit || options.parentCommit || null,
      page_title: options.page_title || "CYBERCROWD BUILD LADDER — CSI&G CORE ORGAN",
      page_note: options.page_note || "Do not cram. Continue on new page when needed.",
      organ: "csi_and_g_core_organ",
      organ_status: clone(status),
      organ_run: clone(run),
      pass_fail: passFail,
      step_rows: stepRows,
      printable_rows: buildPrintableRows(run, stepRows, options),
      paper_ladder_ready: true,
      printable: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "csi_and_g_core_organ_status_snapshot_recorded_no_authority"
    };
  }

  function buildPrintableRows(run = {}, stepRows = [], options = {}) {
    const commit = options.commit || "pending";
    const parentCommit = options.parent_commit || options.parentCommit || "previous";
    const file = options.file || "c-s-i-and-g-core-organ-controller.js";
    const lane = options.lane || "CORE";
    const passFail = readOrganPassFail(run);

    const headerRow = {
      commit,
      core_net: lane,
      file,
      pass_fail: passFail,
      parent: parentCommit,
      note: "CSI&G Core organ status"
    };

    const childRows = stepRows.map((row) => {
      return {
        commit: "",
        core_net: lane,
        file: row.step,
        pass_fail: row.pass_fail,
        parent: commit,
        note: row.status
      };
    });

    return [
      headerRow,
      ...childRows
    ];
  }

  function record(input = {}, options = {}) {
    configure(options.deps || {});

    const received = recordReceived(input);

    if (!input || typeof input !== "object") {
      return reject(
        {
          received,
          input
        },
        "INVALID_CSI_AND_G_CORE_ORGAN_STATUS_INPUT"
      );
    }

    if (containsBlockedMaterial(input)) {
      return hold(
        {
          received,
          input
        },
        "CSI_AND_G_CORE_ORGAN_STATUS_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    const snapshot = buildSnapshot(input, options);

    if (containsBlockedMaterial(snapshot)) {
      return hold(
        {
          received,
          input,
          snapshot
        },
        "CSI_AND_G_CORE_ORGAN_STATUS_SNAPSHOT_BLOCKED_SENSITIVE_OR_000_MATERIAL"
      );
    }

    state.snapshots.push(snapshot);

    if (snapshot.pass_fail === "PASS") {
      state.pass.push(snapshot);
    } else if (snapshot.pass_fail === "HELD") {
      state.held.push(snapshot);
    } else if (snapshot.pass_fail === "REJECTED") {
      state.rejected.push(snapshot);
    } else {
      state.pending.push(snapshot);
    }

    return snapshot;
  }

  function recordFromController(input = {}, options = {}) {
    configure(options.deps || {});

    if (isOrganRun(input)) {
      return record(input, options);
    }

    if (
      CoreOrganController &&
      typeof CoreOrganController.receive === "function"
    ) {
      const run = CoreOrganController.receive(input, options);
      return record(run, options);
    }

    return record(input, options);
  }

  function makePaperLadderPage(snapshot = {}) {
    if (!snapshot || typeof snapshot !== "object") {
      return null;
    }

    const rows = Array.isArray(snapshot.printable_rows)
      ? snapshot.printable_rows
      : [];

    return {
      id: makeId("csiCoreOrganPaperLadderPage"),
      created_at: now(),
      title: snapshot.page_title || "CYBERCROWD BUILD LADDER — CSI&G CORE ORGAN",
      note: snapshot.page_note || "Do not cram. Continue on new page when needed.",
      columns: [
        "COMMIT",
        "CORE/NET",
        "FILE",
        "PASS/FAIL",
        "PARENT",
        "NOTE"
      ],
      rows: clone(rows),
      printable: true,
      paper_ladder_ready: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "csi_and_g_core_organ_paper_ladder_page_ready_no_authority"
    };
  }

  function latestSnapshot() {
    if (!state.snapshots.length) {
      return null;
    }

    return clone(state.snapshots[state.snapshots.length - 1]);
  }

  function latestPaperLadderPage() {
    const snapshot = latestSnapshot();

    if (!snapshot) {
      return null;
    }

    return makePaperLadderPage(snapshot);
  }

  function peekSnapshots() {
    return clone(state.snapshots);
  }

  function peekPass() {
    return clone(state.pass);
  }

  function peekPending() {
    return clone(state.pending);
  }

  function pullNextSnapshot() {
    const next = state.snapshots.shift();

    if (!next) {
      return null;
    }

    return clone(next);
  }

  function ledgerStatus() {
    return {
      ledger: LEDGER_NAME,
      configured: state.configured,
      received_count: state.received.length,
      snapshot_count: state.snapshots.length,
      pass_count: state.pass.length,
      pending_count: state.pending.length,
      held_count: state.held.length,
      rejected_count: state.rejected.length,
      printable: true,
      paper_ladder_ready: true,
      authority_allowed: false,
      external_call_allowed: false,
      executed: false,
      status: "csi_and_g_core_organ_status_ledger_ready_no_authority"
    };
  }

  function canExecuteAuthority() {
    return false;
  }

  function canCallExternal() {
    return false;
  }

  function getState() {
    return clone(state);
  }

  return {
    LEDGER_NAME,
    configure,
    record,
    recordFromController,
    buildSnapshot,
    buildPrintableRows,
    makePaperLadderPage,
    latestSnapshot,
    latestPaperLadderPage,
    isOrganRun,
    readStepRows,
    readOrganPassFail,
    pullOrganStatus,
    pullLastOrganRun,
    peekSnapshots,
    peekPass,
    peekPending,
    pullNextSnapshot,
    ledgerStatus,
    containsBlockedMaterial,
    canExecuteAuthority,
    canCallExternal,
    hold,
    reject,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdCoreOrganStatusLedger;
}
