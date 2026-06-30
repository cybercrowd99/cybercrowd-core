/**
 * cybercrowd-threshing-floor-mode.ts
 *
 * CyberCrowd Threshing Floor Mode
 *
 * ONE JOB:
 * Activate adversarial arena physics inside the Colosseum.
 *
 * Threshing Floor is:
 * - collision-heavy
 * - debate-forward
 * - moment-intense
 * - creator vs creator
 * - idea vs idea
 *
 * This is NOT chat.
 * This is NOT feed.
 * This is NOT moderation.
 *
 * This is the adversarial mode of the Colosseum.
 */

import CyberCrowdColosseum from "./cybercrowd-colosseum";
import CyberCrowdArenaFloorSystem from "./cybercrowd-arena-floor-system";

export const CyberCrowdThreshingFloorMode = (() => {
  const active = new Map();

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix: string) {
    return prefix + "." + Date.now() + "." + Math.random().toString(36).slice(2, 10);
  }

  function activate(identityId: string) {
    const id = makeId("THRESH");

    const record = {
      id,
      identity_id: identityId,
      activated_at: now(),
      active: true,
      collisions: [],
      moments: []
    };

    active.set(identityId, record);

    return record;
  }

  function deactivate(identityId: string) {
    const record = active.get(identityId);
    if (!record) return null;

    record.active = false;
    record.deactivated_at = now();

    return record;
  }

  function isActive(identityId: string) {
    const record = active.get(identityId);
    return !!(record && record.active);
  }

  function collide(identityA: string, identityB: string, reason: string) {
    const a = active.get(identityA);
    const b = active.get(identityB);

    if (!a || !b || !a.active || !b.active) return null;

    const collision = {
      id: makeId("COLLISION"),
      a: identityA,
      b: identityB,
      reason,
      at: now()
    };

    a.collisions.push(collision);
    b.collisions.push(collision);

    return collision;
  }

  function triggerMoment(identityId: string, payload: any) {
    if (!isActive(identityId)) return null;

    const moment = {
      id: makeId("THRESH_MOMENT"),
      identity_id: identityId,
      payload,
      at: now()
    };

    const record = active.get(identityId);
    record.moments.push(moment);

    CyberCrowdColosseum.setPresence(identityId, {
      active_surface: payload.surface || null,
      looking_at: payload.target || null,
      surfaces: payload.surfaces || []
    });

    return moment;
  }

  function list(identityId: string) {
    return active.get(identityId) || null;
  }

  return {
    activate,
    deactivate,
    isActive,
    collide,
    triggerMoment,
    list
  };
})();

export default CyberCrowdThreshingFloorMode;
