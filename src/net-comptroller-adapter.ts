// FILE: src/net-comptroller-adapter.ts
// CYBERCROWD-NET
// NET Comptroller Request Adapter
//
// One rock.
// One object.
// One movement.
// One function.
// One entrance.
// One exit.
// One actual end.
//
// PURPOSE:
//
// Prepare one declared NET -> CORE Comptroller
// request boundary.
//
// This file answers only:
//
// "What bounded request leaves NET for the
// CORE_COMPTROLLER interface?"
//
// It does NOT:
//
// - call Cloudflare
// - call the Comptroller Worker
// - execute Comptroller logic
// - execute resolver files
// - determine authority
// - determine identity
// - determine permission
// - create a session
// - revoke a session
// - perform DD
// - perform reset
// - perform recovery
// - alter the locked NET binding chain
// - alter CORE
// - alter Comptroller
//
// NET prepares.
//
// CORE receives.
//
// Comptroller observes.
//
// PREPARATION != EXECUTION
//
// HEADER != AUTHORITY
//
// REQUEST != MOVEMENT
//
// ADJACENCY != OWNERSHIP
//

export interface NetComptrollerRequestInput {
  requestId?: string | null;
}

export interface NetComptrollerRequest {
  interface: "CORE_COMPTROLLER";
  method: "GET";
  path: "/health";
  headers: {
    "X-CyberCrowd-Core-Interface": "CORE_COMPTROLLER";
    "X-CyberCrowd-Request-Id"?: string;
  };
}

export function buildNetComptrollerRequest(
  input: NetComptrollerRequestInput = {}
): NetComptrollerRequest {
  const headers: NetComptrollerRequest["headers"] = {
    "X-CyberCrowd-Core-Interface": "CORE_COMPTROLLER"
  };

  if (
    typeof input.requestId === "string" &&
    input.requestId.trim().length > 0
  ) {
    headers["X-CyberCrowd-Request-Id"] =
      input.requestId.trim();
  }

  return Object.freeze({
    interface: "CORE_COMPTROLLER",
    method: "GET",
    path: "/health",
    headers: Object.freeze(headers)
  });
}
