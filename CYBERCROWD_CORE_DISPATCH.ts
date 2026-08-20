/**
 * CYBERCROWD — CORE
 *
 * FILE:
 * CYBERCROWD_CORE_DISPATCH.ts
 *
 * ONE JOB:
 * Produce one authorized Core dispatch.
 *
 * NO EXECUTION.
 * NO STORAGE.
 * NO SERVICE OWNERSHIP.
 * NO BLEED.
 */

export function dispatchCyberCrowdCoreMovement(
  movement: unknown
) {
  if (
    typeof movement !== "string" ||
    movement.trim().length === 0
  ) {
    return {
      dispatched: false,
      target: null,
      error: "CORE_MOVEMENT_REQUIRED",
    };
  }

  return {
    dispatched: true,
    target: movement.trim(),
    error: null,
  };
}
