// src/xr/XRCoreBoundaryManager.ts
// CyberCrowd XR Core Boundary Manager
//
// Core lane organ.
//
// Purpose:
// - Coordinate active XR CORE boundary definitions.
// - Manage boundary registry lifecycle.
// - Provide controlled boundary access management.
//
// Owns:
// - Boundary management semantics.
// - Active boundary tracking.
// - Registry coordination.
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
  XRCoreBoundaryDefinition,
  XRCoreBoundaryRegistry,
  createXRCoreBoundaryRegistry
} from "./XRCoreBoundaryRegistry";

export interface XRCoreBoundaryManagerState {
  total_boundaries: number;

  active_boundaries: number;

  managed_boundaries: string[];
}

export class XRCoreBoundaryManager {
  private readonly registry: XRCoreBoundaryRegistry;

  constructor(
    registry: XRCoreBoundaryRegistry =
      createXRCoreBoundaryRegistry()
  ) {
    this.registry = registry;
  }

  registerBoundary(
    boundary: XRCoreBoundaryDefinition
  ): XRCoreBoundaryDefinition {
    return this.registry.register(boundary);
  }

  removeBoundary(
    boundaryId: string
  ): boolean {
    return this.registry.unregister(boundaryId);
  }

  getBoundary(
    boundaryId: string
  ): XRCoreBoundaryDefinition | null {
    return this.registry.get(boundaryId);
  }

  hasBoundary(
    boundaryId: string
  ): boolean {
    return this.registry.has(boundaryId);
  }

  listBoundaries(): XRCoreBoundaryDefinition[] {
    return this.registry.getAll();
  }

  getState(): XRCoreBoundaryManagerState {
    const state =
      this.registry.getState();

    return {
      total_boundaries:
        state.total,

      active_boundaries:
        state.active,

      managed_boundaries:
        state.boundaries.map(
          (boundary) =>
            boundary.boundary_id
        )
    };
  }

  clear(): void {
    this.registry.clear();
  }
}

export function createXRCoreBoundaryManager(
  registry?: XRCoreBoundaryRegistry
): XRCoreBoundaryManager {
  return new XRCoreBoundaryManager(
    registry ??
      createXRCoreBoundaryRegistry()
  );
}
