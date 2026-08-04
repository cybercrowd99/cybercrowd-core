/**
 * CyberCrowd CORE Service Status
 *
 * Purpose:
 * - Prove CORE service is alive internally.
 * - Provide non-authoritative health state.
 *
 * Does NOT:
 * - expose identity
 * - expose MDC data
 * - expose storage
 * - expose behavior
 * - expose routes
 */

export interface CoreServiceStatus {
  readonly service: "CYBERCROWD_CORE";
  readonly status: "ALIVE";
  readonly private: true;
  readonly timestamp: string;
}

export function coreServiceStatus(): CoreServiceStatus {
  return Object.freeze({
    service: "CYBERCROWD_CORE",
    status: "ALIVE",
    private: true,
    timestamp: new Date().toISOString(),
  });
}
