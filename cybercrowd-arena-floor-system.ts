/**
 * cybercrowd-arena-floor-system.ts
 *
 * CyberCrowd Arena Floor System
 *
 * ONE JOB:
 * Maintain the live state of the Colosseum floor.
 *
 * The arena floor tracks:
 * - who is inside
 * - what surfaces they carry
 * - what they are looking at
 * - what objects are active
 * - what moments are active
 * - collisions between identities, objects, and intents
 *
 * This is NOT chat.
 * This is NOT feed.
 * This is NOT notifications.
 *
 * This is the live state machine of the Colosseum.
 */

import CyberCrowdColosseum from "./cybercrowd-colosseum";

export const CyberCrowdArenaFloorSystem = (() => {
  const floor = new Map();

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix: string) {
    return prefix + "." + Date.now() + "." + Math.random().toString(36).slice(2, 10);
  }

  function enter(identityId: string, surfaces: string[]) {
    const id = makeId("FLOOR");

    const record = {
      id,
      identity_id: identityId,
      surfaces,
      active_surface: surfaces[0] || null,
      looking_at: null,
      entered_at: now(),
      active: true
    };

    floor.set(identityId, record);

    CyberCrowdColosseum.setPresence(identityId, {
      active_surface: record.active_surface,
      surfaces
    });

    return record;
  }

  function leave(identityId: string) {
    const record = floor.get(identityId);
    if (!record) return null;

    record.active = false;
    record.left_at = now();

    return record;
  }

  function updateLook(identityId: string, target: string) {
    const record = floor.get(identityId);
    if (!record) return null;

    record.looking_at = target;
    record.updated_at = now();

    CyberCrowdColosseum.setPresence(identityId, {
      active_surface: record.active_surface,
      looking_at: target,
      surfaces: record.surfaces
    });

    return record;
  }

  function listActive() {
    return Array.from(floor.values()).filter((r) => r.active);
  }

  function get(identityId: string) {
    return floor.get(identityId) || null;
  }

  return {
    enter,
    leave,
    updateLook,
    listActive,
    get
  };
})();

export default CyberCrowdArenaFloorSystem;
