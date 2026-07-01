// src/octopus/octopus-window.js
// CyberCrowd Mobile Physics Prototype
// Octopus Window
//
// Purpose:
// Open a controlled local observation window for Octopus movement logic.
// The window can read local convergence signals without becoming authority.
//
// Owns:
// - local observation window state
// - opening / closing / resetting the Octopus window
// - reading identity convergence output
// - shaping movement-readiness status
// - exposing a clean local Octopus signal
//
// Does NOT own:
// - identity authority
// - login authority
// - password validation
// - server session authority
// - EAT minting
// - cookie creation
// - KV writes
// - final movement authorization

const DEFAULTS = {
  maxHistory: 25,
  readyState: "identity-ready",
};

let octopusWindowOpen = false;
let octopusWindowHistory = [];
let lastOctopusSignal = null;

function nowISO() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function trimHistory(maxHistory) {
  if (octopusWindowHistory.length <= maxHistory) return;

  octopusWindowHistory = octopusWindowHistory.slice(
    octopusWindowHistory.length - maxHistory
  );
}

function makeSignalId(prefix = "octopusWindow") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
}

function isReadyConvergence(convergence, readyState) {
  if (!convergence || typeof convergence !== "object") return false;

  return (
    convergence.identityReady === true ||
    convergence.convergenceState === readyState
  );
}

function classifyMovementReadiness(convergence, readyState) {
  if (!convergence || typeof convergence !== "object") {
    return "no-signal";
  }

  if (isReadyConvergence(convergence, readyState)) {
    return "movement-ready-local";
  }

  if (convergence.convergenceState === "warming") {
    return "warming";
  }

  if (convergence.convergenceState === "observing") {
    return "observing";
  }

  if (convergence.convergenceState === "insufficient-signal") {
    return "insufficient-signal";
  }

  return "idle";
}

export function openOctopusWindow(options = {}) {
  const { openedBy = "local-vessel" } = options;

  octopusWindowOpen = true;

  return {
    ok: true,
    open: true,
    openedBy,
    openedAt: nowISO(),
    authorityNote: "OBSERVATION_WINDOW_ONLY_NO_SERVER_AUTHORITY_GRANTED",
  };
}

export function closeOctopusWindow(options = {}) {
  const { closedBy = "local-vessel" } = options;

  octopusWindowOpen = false;

  return {
    ok: true,
    open: false,
    closedBy,
    closedAt: nowISO(),
    authorityNote: "OBSERVATION_WINDOW_CLOSED_NO_SERVER_AUTHORITY_GRANTED",
  };
}

export function readOctopusWindow() {
  return {
    ok: true,
    open: octopusWindowOpen,
    lastSignal: lastOctopusSignal ? clone(lastOctopusSignal) : null,
    historyLength: octopusWindowHistory.length,
    readAt: nowISO(),
    authorityNote: "LOCAL_WINDOW_READ_ONLY_NO_SERVER_AUTHORITY_GRANTED",
  };
}

export function evaluateOctopusWindow(convergence, options = {}) {
  const {
    maxHistory = DEFAULTS.maxHistory,
    readyState = DEFAULTS.readyState,
  } = options;

  if (!octopusWindowOpen) {
    return {
      ok: false,
      reason: "OCTOPUS_WINDOW_CLOSED",
      authorityNote: "NO_MOVEMENT_SIGNAL_CREATED",
    };
  }

  if (!convergence || typeof convergence !== "object") {
    return {
      ok: false,
      reason: "VALID_CONVERGENCE_REQUIRED",
      authorityNote: "NO_MOVEMENT_SIGNAL_CREATED",
    };
  }

  const movementReadiness = classifyMovementReadiness(
    convergence,
    readyState
  );

  const signal = {
    ok: true,
    signalId: makeSignalId(),
    observedAt: nowISO(),

    open: octopusWindowOpen,
    movementReadiness,

    identityReadyLocal: isReadyConvergence(convergence, readyState),

    convergence: clone(convergence),

    authorityNote:
      movementReadiness === "movement-ready-local"
        ? "LOCAL_MOVEMENT_READY_SIGNAL_ONLY_SERVER_AUTHORITY_REQUIRED"
        : "LOCAL_OBSERVATION_ONLY_SERVER_AUTHORITY_REQUIRED",
  };

  octopusWindowHistory.push(signal);
  trimHistory(maxHistory);

  lastOctopusSignal = signal;

  return clone(signal);
}

export function getOctopusWindowHistory() {
  return clone(octopusWindowHistory);
}

export function getLastOctopusSignal() {
  if (!lastOctopusSignal) return null;
  return clone(lastOctopusSignal);
}

export function clearOctopusWindowHistory() {
  octopusWindowHistory = [];
  lastOctopusSignal = null;

  return {
    ok: true,
    cleared: true,
    clearedAt: nowISO(),
  };
}

export function resetOctopusWindow() {
  octopusWindowOpen = false;
  octopusWindowHistory = [];
  lastOctopusSignal = null;

  return {
    ok: true,
    reset: true,
    open: false,
    resetAt: nowISO(),
    authorityNote: "OCTOPUS_WINDOW_RESET_NO_SERVER_AUTHORITY_GRANTED",
  };
}

export const OctopusWindow = {
  openOctopusWindow,
  closeOctopusWindow,
  readOctopusWindow,
  evaluateOctopusWindow,
  getOctopusWindowHistory,
  getLastOctopusSignal,
  clearOctopusWindowHistory,
  resetOctopusWindow,
};
