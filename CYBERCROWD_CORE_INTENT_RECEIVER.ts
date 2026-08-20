/**
 * CYBERCROWD — CORE
 *
 * FILE:
 * CYBERCROWD_CORE_INTENT_RECEIVER.ts
 *
 * ONE JOB:
 * Receive one Core intent.
 *
 * NO ROUTING.
 * NO AUTHORIZATION.
 * NO EXECUTION.
 * NO BLEED.
 */

export function receiveCyberCrowdCoreIntent(
  intent: unknown
) {
  if (
    typeof intent !== "string" ||
    intent.trim().length === 0
  ) {
    return {
      accepted: false,
      intent: null,
      error: "CORE_INTENT_REQUIRED",
    };
  }

  return {
    accepted: true,
    intent: intent.trim(),
    error: null,
  };
}
