// src/xr/XRCoreBoundaryRuntime.ts
// CyberCrowd XR Core Boundary Runtime
//
// Core lane organ.
//
// Purpose:
// - Coordinate active XR CORE boundary components during runtime operation.
// - Provide runtime boundary snapshot and context reference.
// - Maintain boundary runtime state only.
//
// Owns:
// - Boundary runtime semantics.
// - Active runtime context.
// - Boundary runtime snapshot.
//
// Does NOT own:
// - Boundary decisions.
// - Authority evaluation.
// - Identity evaluation.
// - Permission evaluation.
// - Session evaluation.
// - Event evaluation.
// - Route execution.
// - Metadata storage.
// - MDC ledger execution.
// - Room execution.
// - Rendering.
// - NET.
// - UI.
// - Business logic.

import {
  XRCoreBoundaryManager,
  createXRCoreBoundaryManager
} from "./XRCoreBoundaryManager";

import {
  XRCoreBoundaryDefinition
} from "./XRCoreBoundaryRegistry";

export interface XRCoreBoundaryRuntimeContext {
  runtime_id: string;

  active: boolean;

  started_at: number;
}

export interface XRCoreBoundaryRuntimeSnapshot {
  context: XRCoreBoundaryRuntimeContext;

  boundaries: XRCoreBoundaryDefinition[];

  total_boundaries: number;

  active_boundaries: number;
}

export class XRCoreBoundaryRuntime {
  private readonly manager: XRCoreBoundaryManager;

  private context: XRCoreBoundaryRuntimeContext;

  constructor(
    manager: XRCoreBoundaryManager =
      createXRCoreBoundaryManager()
  ) {
    this.manager = manager;

    this.context = {
      runtime_id:
        createRuntimeId(),

      active: false,

      started_at: 0
    };
  }

  start(): XRCoreBoundaryRuntimeContext {
    this.context = {
      runtime_id:
        this.context.runtime_id,

      active: true,

      started_at:
        Date.now()
    };

    return {
      ...this.context
    };
  }

  stop(): XRCoreBoundaryRuntimeContext {
    this.context = {
      ...this.context,

      active: false
    };

    return {
      ...this.context
    };
  }

  isActive(): boolean {
    return this.context.active;
  }

  getContext(): XRCoreBoundaryRuntimeContext {
    return {
      ...this.context
    };
  }

  snapshot(): XRCoreBoundaryRuntimeSnapshot {
    const state =
      this.manager.getState();

    return {
      context:
        this.getContext(),

      boundaries:
        this.manager.listBoundaries(),

      total_boundaries:
        state.total_boundaries,

      active_boundaries:
        state.active_boundaries
    };
  }

  getManager(): XRCoreBoundaryManager {
    return this.manager;
  }
}

export function createXRCoreBoundaryRuntime(
  manager?: XRCoreBoundaryManager
): XRCoreBoundaryRuntime {
  return new XRCoreBoundaryRuntime(
    manager ??
      createXRCoreBoundaryManager()
  );
}

function createRuntimeId(): string {
  return (
    "xr-boundary-runtime-" +
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}
