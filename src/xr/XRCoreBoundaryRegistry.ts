// src/xr/XRCoreBoundaryRegistry.ts
// CyberCrowd XR Core Boundary Registry
//
// Core lane organ.
//
// Purpose:
// - Maintain registered XR CORE boundary definitions.
// - Provide boundary lookup and membership tracking.
// - Expose XR boundary inventory.
//
// Owns:
// - Boundary registration semantics.
// - Boundary lookup semantics.
// - Boundary membership state.
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
//
// Rule:
// Registry knows the boundaries.
// Registry does not become the authority.

export type XRCoreBoundaryType =
  | "runtime"
  | "authority"
  | "identity"
  | "permission"
  | "session"
  | "event"
  | "route"
  | "mdc";

export interface XRCoreBoundaryDefinition {
  boundary_id: string;

  boundary_type: XRCoreBoundaryType;

  module_path: string;

  description: string;

  active: boolean;
}

export interface XRCoreBoundaryRegistryState {
  total: number;

  active: number;

  boundaries: XRCoreBoundaryDefinition[];
}

export class XRCoreBoundaryRegistry {
  private readonly boundaries: Map<
    string,
    XRCoreBoundaryDefinition
  >;

  constructor() {
    this.boundaries = new Map();
  }

  register(
    boundary: XRCoreBoundaryDefinition
  ): XRCoreBoundaryDefinition {
    const normalized =
      normalizeBoundary(boundary);

    this.boundaries.set(
      normalized.boundary_id,
      normalized
    );

    return cloneBoundary(normalized);
  }

  unregister(
    boundaryId: string
  ): boolean {
    const id = cleanId(boundaryId);

    if (!id) {
      return false;
    }

    return this.boundaries.delete(id);
  }

  get(
    boundaryId: string
  ): XRCoreBoundaryDefinition | null {
    const id = cleanId(boundaryId);

    if (!id) {
      return null;
    }

    const boundary =
      this.boundaries.get(id);

    return boundary
      ? cloneBoundary(boundary)
      : null;
  }

  has(
    boundaryId: string
  ): boolean {
    const id = cleanId(boundaryId);

    if (!id) {
      return false;
    }

    return this.boundaries.has(id);
  }

  getByType(
    type: XRCoreBoundaryType
  ): XRCoreBoundaryDefinition[] {
    return Array.from(
      this.boundaries.values()
    )
      .filter(
        (boundary) =>
          boundary.boundary_type === type
      )
      .map(cloneBoundary);
  }

  getAll(): XRCoreBoundaryDefinition[] {
    return Array.from(
      this.boundaries.values()
    ).map(cloneBoundary);
  }

  getState(): XRCoreBoundaryRegistryState {
    const boundaries =
      this.getAll();

    return {
      total: boundaries.length,

      active:
        boundaries.filter(
          (boundary) =>
            boundary.active
        ).length,

      boundaries
    };
  }

  clear(): void {
    this.boundaries.clear();
  }
}

export const XR_CORE_BOUNDARY_DEFAULTS:
  XRCoreBoundaryDefinition[] = [
    {
      boundary_id:
        "XRCoreRuntimeBoundary",

      boundary_type:
        "runtime",

      module_path:
        "src/xr/XRCoreRuntimeBoundary.ts",

      description:
        "XR runtime boundary between XR systems and cybercrowd-core.",

      active: true
    },
    {
      boundary_id:
        "XRCoreAuthorityBoundary",

      boundary_type:
        "authority",

      module_path:
        "src/xr/XRCoreAuthorityBoundary.ts",

      description:
        "XR authority boundary.",

      active: true
    },
    {
      boundary_id:
        "XRCoreIdentityBoundary",

      boundary_type:
        "identity",

      module_path:
        "src/xr/XRCoreIdentityBoundary.ts",

      description:
        "XR identity boundary.",

      active: true
    },
    {
      boundary_id:
        "XRCorePermissionBoundary",

      boundary_type:
        "permission",

      module_path:
        "src/xr/XRCorePermissionBoundary.ts",

      description:
        "XR permission boundary.",

      active: true
    },
    {
      boundary_id:
        "XRCoreSessionBoundary",

      boundary_type:
        "session",

      module_path:
        "src/xr/XRCoreSessionBoundary.ts",

      description:
        "XR session boundary.",

      active: true
    },
    {
      boundary_id:
        "XRCoreEventBoundary",

      boundary_type:
        "event",

      module_path:
        "src/xr/XRCoreEventBoundary.ts",

      description:
        "XR event boundary.",

      active: true
    },
    {
      boundary_id:
        "XRCoreRouteBoundary",

      boundary_type:
        "route",

      module_path:
        "src/xr/XRCoreRouteBoundary.ts",

      description:
        "XR route boundary.",

      active: true
    },
    {
      boundary_id:
        "XRCoreMDCBoundary",

      boundary_type:
        "mdc",

      module_path:
        "src/xr/XRCoreMDCBoundary.ts",

      description:
        "XR metadata boundary.",

      active: true
    }
  ];

export function createXRCoreBoundaryRegistry(
  includeDefaults = true
): XRCoreBoundaryRegistry {
  const registry =
    new XRCoreBoundaryRegistry();

  if (includeDefaults) {
    for (
      const boundary of XR_CORE_BOUNDARY_DEFAULTS
    ) {
      registry.register(boundary);
    }
  }

  return registry;
}

function normalizeBoundary(
  boundary: XRCoreBoundaryDefinition
): XRCoreBoundaryDefinition {
  if (
    !boundary ||
    typeof boundary !== "object"
  ) {
    throw new Error(
      "XR_CORE_BOUNDARY_REQUIRED"
    );
  }

  const boundaryId =
    cleanId(boundary.boundary_id);

  const modulePath =
    cleanPath(boundary.module_path);

  if (!boundaryId || !modulePath) {
    throw new Error(
      "XR_CORE_BOUNDARY_INVALID"
    );
  }

  return {
    boundary_id: boundaryId,

    boundary_type:
      boundary.boundary_type,

    module_path: modulePath,

    description:
      typeof boundary.description === "string"
        ? boundary.description.trim()
        : "",

    active:
      Boolean(boundary.active)
  };
}

function cloneBoundary(
  boundary: XRCoreBoundaryDefinition
): XRCoreBoundaryDefinition {
  return {
    boundary_id:
      boundary.boundary_id,

    boundary_type:
      boundary.boundary_type,

    module_path:
      boundary.module_path,

    description:
      boundary.description,

    active:
      boundary.active
  };
}

function cleanPath(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  const clean =
    value.trim();

  if (
    !clean ||
    clean.length > 500
  ) {
    return "";
  }

  return clean;
}

function cleanId(
  value: unknown
): string {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return "";
  }

  const clean =
    String(value).trim();

  if (
    !clean ||
    clean.length > 180
  ) {
    return "";
  }

  if (
    !/^[a-zA-Z0-9._:@/+=$-]+$/.test(clean)
  ) {
    return "";
  }

  return clean;
}
