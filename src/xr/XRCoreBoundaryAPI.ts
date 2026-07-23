// src/xr/XRCoreBoundaryAPI.ts
// CyberCrowd XR Core Boundary API
//
// Core lane organ.
//
// Purpose:
// - Define public API boundary for XR CORE boundary runtime interaction.
// - Provide controlled boundary operation interface.
// - Expose boundary access contracts only.
//
// Owns:
// - Boundary API semantics.
// - API request shape.
// - API response shape.
// - Controlled boundary access interface.
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
  XRCoreBoundaryController,
  createXRCoreBoundaryController
} from "./XRCoreBoundaryController";

import {
  XRCoreBoundaryControllerRequest,
  XRCoreBoundaryControllerResponse
} from "./XRCoreBoundaryController";

export interface XRCoreBoundaryAPIRequest {
  operation: string;
}

export interface XRCoreBoundaryAPIResponse {
  ok: boolean;

  operation: string;

  response:
    | XRCoreBoundaryControllerResponse
    | null;

  statement: string;
}

export class XRCoreBoundaryAPI {
  private readonly controller: XRCoreBoundaryController;

  constructor(
    controller: XRCoreBoundaryController =
      createXRCoreBoundaryController()
  ) {
    this.controller = controller;
  }

  execute(
    request: XRCoreBoundaryAPIRequest
  ): XRCoreBoundaryAPIResponse {
    const operation =
      cleanOperation(request?.operation);

    if (!operation) {
      return {
        ok: false,

        operation: "",

        response: null,

        statement:
          "Invalid XR CORE boundary API operation."
      };
    }

    const controllerRequest:
      XRCoreBoundaryControllerRequest = {
        command:
          operation as XRCoreBoundaryControllerRequest["command"]
      };

    return {
      ok: true,

      operation,

      response:
        this.controller.execute(
          controllerRequest
        ),

      statement:
        "XR CORE boundary API operation completed."
    };
  }

  getController(): XRCoreBoundaryController {
    return this.controller;
  }
}

export function createXRCoreBoundaryAPI(
  controller?: XRCoreBoundaryController
): XRCoreBoundaryAPI {
  return new XRCoreBoundaryAPI(
    controller ??
      createXRCoreBoundaryController()
  );
}

function cleanOperation(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  const clean =
    value.trim()
      .toUpperCase();

  if (
    clean === "START" ||
    clean === "STOP" ||
    clean === "SNAPSHOT"
  ) {
    return clean;
  }

  return "";
}
