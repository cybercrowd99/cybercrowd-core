/**
 * CyberCrowd CORE Deployment Diagnostic
 *
 * Purpose:
 * - Verify CORE worker execution environment.
 * - Verify bindings visibility.
 * - Verify runtime identity.
 *
 * Does NOT:
 * - expose identity
 * - mutate state
 * - call NET
 * - call MDC
 */

export interface CoreDiagnosticResult {
  worker: string;
  lane: string;
  alive: boolean;
  timestamp: string;
  bindings: string[];
  environment: string;
}

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
  ): Promise<Response> {

    const result: CoreDiagnosticResult = {
      worker: "CYBERCROWD_CORE",
      lane: "core",
      alive: true,
      timestamp: new Date().toISOString(),
      bindings: Object.keys(env || {}),
      environment:
        request.url.includes("workers.dev")
          ? "worker-route"
          : "internal-build",
    };

    return new Response(
      JSON.stringify(result, null, 2),
      {
        headers: {
          "content-type": "application/json",
        },
      },
    );
  },
};
