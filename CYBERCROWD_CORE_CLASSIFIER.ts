/**
 * CYBERCROWD — CORE
 *
 * FILE:
 * CYBERCROWD_CORE_CLASSIFIER.ts
 *
 * ONE JOB:
 * Classify one accepted Core intent.
 *
 * NO AUTHORIZATION.
 * NO DISPATCH.
 * NO EXECUTION.
 * NO BLEED.
 */

export function classifyCyberCrowdCoreIntent(
  intent: unknown
) {
  if (
    typeof intent !== "string" ||
    intent.trim().length === 0
  ) {
    return {
      classified: false,
      className: null,
      error: "CORE_INTENT_REQUIRED",
    };
  }

  return {
    classified: true,
    className: intent.trim().toUpperCase(),
    error: null,
  };
}
