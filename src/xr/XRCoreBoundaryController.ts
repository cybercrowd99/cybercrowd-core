// src/xr/XRCoreBoundaryController.ts
// CyberCrowd XR Core Boundary Controller
//
// Core lane organ.
//
// Purpose:
// - Define controlled operations for managing XR CORE boundary runtime requests.
// - Provide boundary command surface.
// - Coordinate boundary runtime commands only.
//
// Owns:
// - Boundary controller semantics.
// - Boundary command requests.
// - Controlled boundary operation handling.
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
  XRCoreBoundaryRuntime,
  createXRCoreBoundaryRuntime
} from "./XRCoreBoundaryRuntime";

export type XRCoreBoundaryCommand =
  | "START"
  | "STOP"
  | "SNAPSHOT";

export interface XRCoreBoundaryControllerRequest {
  command: XRCoreBoundaryCommand;
}

export interface XRCoreBoundaryControllerResponse {
  ok: boolean;

  command: XRCoreBoundaryCommand;

  result: unknown;

  statement: string;
}

export class XRCoreBoundaryController {
  private readonly runtime: XRCoreBoundaryRuntime;

  constructor(
    runtime: XRCoreBoundaryRuntime =
      createXRCoreBoundaryRuntime()
  ) {
    this.runtime = runtime;
  }

  execute(
    request: XRCoreBoundaryControllerRequest
  ): XRCoreBoundaryControllerResponse {
    const command =
      cleanCommand(request?.command);

    if (!command) {
      return {
        ok: false,
        command: "SNAPSHOT",
        result: null,
        statement:
          "Invalid XR CORE boundary command."
      };
    }

    switch (command) {
      case "START":
        return {
          ok: true,
          command,
          result:
            this.runtime.start(),
          statement:
            "XR CORE boundary runtime started."
        };

      case "STOP":
        return {
          ok: true,
          command,
          result:
            this.runtime.stop(),
          statement:
            "XR CORE boundary runtime stopped."
        };

      case "SNAPSHOT":
        return {
          ok: true,
          command,
          result:
            this.runtime.snapshot(),
          statement:
            "XR CORE boundary runtime snapshot returned."
        };
    }
  }

  getRuntime(): XRCoreBoundaryRuntime {
    return this.runtime;
  }
}

export function createXRCoreBoundaryController(
  runtime?: XRCoreBoundaryRuntime
): XRCoreBoundaryController {
  return new XRCoreBoundaryController(
    runtime ??
      createXRCoreBoundaryRuntime()
  );
}

function cleanCommand(
  value: unknown
): XRCoreBoundaryCommand | null {
  if (
    value === "START" ||
    value === "STOP" ||
    value === "SNAPSHOT"
  ) {
    return value;
  }

  return null;
}
