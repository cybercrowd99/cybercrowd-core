/**
 * CyberCrowd CORE — Private Worker Entry
 *
 * Owns:
 * - private CORE service boundary
 * - internal organ dispatch entry
 *
 * Does NOT:
 * - expose public routes
 * - own NET
 * - own UI
 * - own identity
 * - own payments
 * - track behavior
 */

import CyberCrowdCoreFunction from "../core/cybercrowd-core-function.js";

export interface Env {
  // Reserved for future private service bindings.
}

const CORE_REF = "CC-CORE-SYS-0001";

export default {
  async fetch(
    request: Request,
    _env: Env,
  ): Promise<Response> {

    const url = new URL(request.url);

    if (request.method !== "POST") {
      return Response.json({
        organ: "CORE",
        lane: "core",
        ref: CORE_REF,
        status: "CORE_PRIVATE_SERVICE_READY",
        public: false,
      });
    }

    if (url.pathname !== "/") {
      return Response.json(
        {
          organ: "CORE",
          lane: "core",
          ref: CORE_REF,
          status: "CORE_PRIVATE_PATH_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result =
      CyberCrowdCoreFunction.found(body);

    return Response.json({
      organ: "CORE",
      lane: "core",
      ref: CORE_REF,
      result,
    });
  },
};
