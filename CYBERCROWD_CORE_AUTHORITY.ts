/**
 * CYBERCROWD — CORE
 *
 * FILE:
 * CYBERCROWD_CORE_AUTHORITY.ts
 *
 * ONE JOB:
 * Determine whether one classified movement is authorized.
 *
 * NO ROUTING.
 * NO DISPATCH.
 * NO EXECUTION.
 * NO BLEED.
 */

export function authorizeCyberCrowdCoreMovement(
  className: unknown
) {
  if (
    typeof className !== "string" ||
    className.trim().length === 0
  ) {
    return {
      authorized: false,
      movement: null,
      error: "CORE_CLASS_REQUIRED",
    };
  }

  return {
    authorized: true,
    movement: className.trim(),
    error: null,
  };
}
