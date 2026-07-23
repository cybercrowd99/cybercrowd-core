// src/xr/XRCoreBoundaryExport.ts
// CyberCrowd XR Core Boundary Export
//
// Core lane organ.
//
// Purpose:
// - Define controlled export surface for XR CORE boundary modules.
// - Expose XR boundary package mapping.
// - Maintain public module boundary.
//
// Owns:
// - Boundary export semantics.
// - Exposed boundary modules.
// - Package surface mapping.
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

export const XRCoreBoundaryExport = {
  RuntimeBoundary:
    "./XRCoreRuntimeBoundary",

  AuthorityBoundary:
    "./XRCoreAuthorityBoundary",

  IdentityBoundary:
    "./XRCoreIdentityBoundary",

  PermissionBoundary:
    "./XRCorePermissionBoundary",

  SessionBoundary:
    "./XRCoreSessionBoundary",

  EventBoundary:
    "./XRCoreEventBoundary",

  RouteBoundary:
    "./XRCoreRouteBoundary",

  MDCBoundary:
    "./XRCoreMDCBoundary",

  BoundaryRegistry:
    "./XRCoreBoundaryRegistry",

  BoundaryManager:
    "./XRCoreBoundaryManager",

  BoundaryRuntime:
    "./XRCoreBoundaryRuntime",

  BoundaryController:
    "./XRCoreBoundaryController",

  BoundaryAPI:
    "./XRCoreBoundaryAPI"
} as const;

export type XRCoreBoundaryExportKey =
  keyof typeof XRCoreBoundaryExport;

export function getXRCoreBoundaryExportMap(): Record<
  XRCoreBoundaryExportKey,
  string
> {
  return {
    ...XRCoreBoundaryExport
  };
}

export function hasXRCoreBoundaryExport(
  key: string
): key is XRCoreBoundaryExportKey {
  return key in XRCoreBoundaryExport;
}
