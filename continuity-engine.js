/**
 * Continuity Engine
 *
 * ONE JOB:
 * Preserve state across an engine/mode transition.
 *
 * Responsibilities:
 * - State Hold
 * - Wake Transfer
 * - Non-Collapse Switch
 *
 * This engine does not interpret the state.
 * It holds and transfers it.
 */

export class ContinuityEngine {
  constructor() {
    this.state = null;
    this.activeEngine = null;
  }

  hold(engineId, state) {
    if (!engineId) {
      throw new Error("engine_id_required");
    }

    if (state === undefined || state === null) {
      throw new Error("state_required");
    }

    this.state = structuredClone(state);
    this.activeEngine = engineId;

    return this.snapshot();
  }

  wakeTransfer(nextEngineId) {
    if (!nextEngineId) {
      throw new Error("next_engine_id_required");
    }

    if (this.state === null) {
      throw new Error("continuity_state_missing");
    }

    const transferredState = structuredClone(this.state);

    this.activeEngine = nextEngineId;

    return {
      from: this.activeEngine,
      to: nextEngineId,
      state: transferredState,
      continuity: "TRANSFERRED"
    };
  }

  switch(nextEngineId) {
    if (!nextEngineId) {
      throw new Error("next_engine_id_required");
    }

    if (this.state === null) {
      throw new Error("continuity_collapse");
    }

    const previousEngine = this.activeEngine;
    const state = structuredClone(this.state);

    this.activeEngine = nextEngineId;

    return {
      from: previousEngine,
      to: nextEngineId,
      state,
      continuity: "CONTINUED"
    };
  }

  snapshot() {
    return {
      activeEngine: this.activeEngine,
      state: this.state === null
        ? null
        : structuredClone(this.state)
    };
  }

  clear() {
    this.state = null;
    this.activeEngine = null;
  }
}
