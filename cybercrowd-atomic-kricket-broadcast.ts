/**
 * cybercrowd-atomic-kricket-broadcast.ts
 *
 * Atomic Kricket Broadcast Engine
 *
 * ONE JOB:
 * Broadcast Threshing Floor outcomes into the CORE chirp rail.
 *
 * This is NOT NET.
 * This is NOT audience discovery.
 * This is NOT external distribution.
 *
 * This is CORE → CORE broadcast:
 * - winners
 * - collisions
 * - seed survival
 * - atomic kicks
 */

export const CyberCrowdAtomicKricketBroadcast = (() => {
  const feed = [];

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix: string) {
    return prefix + "." + Date.now() + "." + Math.random().toString(36).slice(2, 10);
  }

  function broadcastWinner(floorId: string, winner: any) {
    const event = {
      id: makeId("KRICKET"),
      type: "winner",
      floor_id: floorId,
      winner,
      at: now()
    };

    feed.unshift(event);
    return event;
  }

  function broadcastCollision(floorId: string, collision: any) {
    const event = {
      id: makeId("KRICKET"),
      type: "collision",
      floor_id: floorId,
      collision,
      at: now()
    };

    feed.unshift(event);
    return event;
  }

  function broadcastAtomicKick(floorId: string, idea: any) {
    const event = {
      id: makeId("KRICKET"),
      type: "atomic_kick",
      floor_id: floorId,
      idea,
      at: now()
    };

    feed.unshift(event);
    return event;
  }

  function list() {
    return feed;
  }

  return {
    broadcastWinner,
    broadcastCollision,
    broadcastAtomicKick,
    list
  };
})();
