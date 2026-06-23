// identity-life-lanes.js
// CyberCrowd Core — Identity Life Lanes
// Owns: attaching life lanes to an Identity, activating/pausing lanes,
// and recording neutral lane events.
// Does not create identities, sell data, arbitrate, punish, or render UI.

import SovereignCoreAPI from "./sovereign-core-api.js";

const IdentityLifeLanes = (() => {
  let lanes = {};

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function requireIdentity(identityId) {
    const state = SovereignCoreAPI.getState();

    if (!identityId || !state.identities[identityId]) {
      throw new Error("IDENTITY_NOT_FOUND");
    }

    return state.identities[identityId];
  }

  function requireLaneName(laneName) {
    if (!laneName || typeof laneName !== "string") {
      throw new Error("LANE_NAME_REQUIRED");
    }

    return laneName.trim();
  }

  function makeLaneId(identityId, laneName) {
    return `lane.${identityId}.${laneName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }

  function activateLane(identityId, laneName, metadata = {}) {
    requireIdentity(identityId);

    const cleanLaneName = requireLaneName(laneName);
    const laneId = makeLaneId(identityId, cleanLaneName);

    if (!lanes[laneId]) {
      lanes[laneId] = {
        lane_id: laneId,
        identity_id: identityId,
        lane_name: cleanLaneName,
        status: "active",
        metadata,
        events: [],
        created_at: now(),
        updated_at: now()
      };
    } else {
      lanes[laneId].status = "active";
      lanes[laneId].metadata = {
        ...lanes[laneId].metadata,
        ...metadata
      };
      lanes[laneId].updated_at = now();
    }

    const event = recordLaneEvent(identityId, cleanLaneName, "LANE_ACTIVATED", {
      lane_id: laneId,
      metadata
    });

    SovereignCoreAPI.emitReplayEvent(identityId, "IDENTITY_LANE_ACTIVATED", {
      lane_id: laneId,
      lane_name: cleanLaneName,
      event
    });

    return clone(lanes[laneId]);
  }

  function pauseLane(identityId, laneName, reason = "manual_pause") {
    requireIdentity(identityId);

    const cleanLaneName = requireLaneName(laneName);
    const laneId = makeLaneId(identityId, cleanLaneName);

    if (!lanes[laneId]) {
      throw new Error("LANE_NOT_FOUND");
    }

    lanes[laneId].status = "paused";
    lanes[laneId].updated_at = now();

    const event = recordLaneEvent(identityId, cleanLaneName, "LANE_PAUSED", {
      lane_id: laneId,
      reason
    });

    SovereignCoreAPI.emitReplayEvent(identityId, "IDENTITY_LANE_PAUSED", {
      lane_id: laneId,
      lane_name: cleanLaneName,
      reason,
      event
    });

    return clone(lanes[laneId]);
  }

  function recordLaneEvent(identityId, laneName, eventType, payload = {}) {
    requireIdentity(identityId);

    const cleanLaneName = requireLaneName(laneName);
    const laneId = makeLaneId(identityId, cleanLaneName);

    if (!lanes[laneId]) {
      lanes[laneId] = {
        lane_id: laneId,
        identity_id: identityId,
        lane_name: cleanLaneName,
        status: "active",
        metadata: {},
        events: [],
        created_at: now(),
        updated_at: now()
      };
    }

    const event = {
      lane_event_id: `laneEvent.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`,
      lane_id: laneId,
      identity_id: identityId,
      lane_name: cleanLaneName,
      event_type: eventType || "LANE_EVENT",
      payload,
      created_at: now()
    };

    lanes[laneId].events.push(event);
    lanes[laneId].updated_at = now();

    SovereignCoreAPI.emitReplayEvent(identityId, "IDENTITY_LANE_EVENT", event);

    return clone(event);
  }

  function getIdentityLanes(identityId) {
    requireIdentity(identityId);

    return clone(
      Object.values(lanes)
        .filter((lane) => lane.identity_id === identityId)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    );
  }

  function getLane(identityId, laneName) {
    requireIdentity(identityId);

    const cleanLaneName = requireLaneName(laneName);
    const laneId = makeLaneId(identityId, cleanLaneName);

    return clone(lanes[laneId] || null);
  }

  function getActiveLanes(identityId) {
    return clone(
      getIdentityLanes(identityId).filter((lane) => lane.status === "active")
    );
  }

  function reset(reason = "manual_reset") {
    lanes = {};

    return {
      reset: true,
      reason,
      timestamp: now()
    };
  }

  return {
    activateLane,
    pauseLane,
    recordLaneEvent,
    getIdentityLanes,
    getLane,
    getActiveLanes,
    reset
  };
})();

if (typeof window !== "undefined") {
  window.IdentityLifeLanes = IdentityLifeLanes;
}

export default IdentityLifeLanes;
