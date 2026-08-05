// c-s-i-and-g-dewey-later.js
// CyberCrowd — Dewey Later Review Queue
// 
// Owns:
// - receiving 000 / Null Horizon records for later classification
// - preserving unclassified material without destroying it
// - creating review tickets for Dewey-style lane sorting
// - suggesting candidate lanes without making final authority decisions
// - keeping unknown pressure separate from authority pressure
//
// Does NOT own:
// - authority execution
// - identity creation
// - payment
// - sessions
// - cookies
// - KV storage
// - external APIs
// - scraping
// - UI
// - forced final classification

const CyberCrowdDeweyLater = (() => {
  const SOURCE_000 = "000_future_sci_fi_unclassified";

  const REVIEW_STATUS = {
    QUEUED: "queued_for_dewey_later",
    REVIEWED: "reviewed_candidate_only",
    RELEASED: "released_to_candidate_lane",
    HELD: "held_unclassified",
    REJECTED: "rejected_invalid_review_item"
  };

  const state = {
    queue: [],
    reviewed: [],
    released: [],
    held: [],
    rejected: []
  };

  const CANDIDATE_MARKERS = [
    {
      lane: "identity_lane",
      markers: ["identity", "public id", "private id", "resume", "human", "profile"]
    },
    {
      lane: "evidence_lane",
      markers: ["proof", "evidence", "receipt", "witness", "photo", "video", "record"]
    },
    {
      lane: "movement_lane",
      markers: ["move", "route", "ship", "send", "delivery", "transport", "transfer"]
    },
    {
      lane: "authority_review_lane",
      markers: ["authority", "approve", "execute", "allow", "permission", "gate"]
    },
    {
      lane: "commerce_lane",
      markers: ["shop", "sale", "buy", "sell", "checkout", "order", "invoice"]
    },
    {
      lane: "work_lane",
      markers: ["job", "work", "hire", "fire", "skill", "labor", "service"]
    },
    {
      lane: "media_lane",
      markers: ["music", "video", "stream", "camera", "photo", "art", "recording"]
    },
    {
      lane: "governance_lane",
      markers: ["rule", "court", "complaint", "review", "recourse", "policy"]
    }
  ];

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function toText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value.toLowerCase();
    }

    try {
      return JSON.stringify(value).toLowerCase();
    } catch (error) {
      return String(value).toLowerCase();
    }
  }

  function normalizeSource(input = {}) {
    return (
      input.source_lane ||
      input.lane ||
      input.record && input.record.lane ||
      input.record && input.record.lane_id ||
      SOURCE_000
    );
  }

  function hold(target, reason) {
    const record = {
      id: makeId("deweyHold"),
      held_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      status: REVIEW_STATUS.HELD
    };

    state.held.push(record);
    return record;
  }

  function reject(target, reason) {
    const record = {
      id: makeId("deweyReject"),
      rejected_at: now(),
      reason,
      target: clone(target),
      authority_allowed: false,
      status: REVIEW_STATUS.REJECTED
    };

    state.rejected.push(record);
    return record;
  }

  function queue(input = {}) {
    const sourceLane = normalizeSource(input);

    const item = {
      id: makeId("deweyLater"),
      queued_at: now(),
      source_lane: sourceLane,
      source_id: input.source_id || input.id || input.record && input.record.id || null,
      record: clone(input.record || input),
      reason: input.reason || "QUEUED_FOR_DEWEY_LATER",
      candidate_lanes: [],
      notes: [],
      authority_allowed: false,
      status: REVIEW_STATUS.QUEUED
    };

    state.queue.push(item);
    return item;
  }

  function suggestCandidateLanes(record) {
    const text = toText(record);
    const candidates = [];

    CANDIDATE_MARKERS.forEach((entry) => {
      const hits = entry.markers.filter((marker) => text.includes(marker));

      if (hits.length > 0) {
        candidates.push({
          lane: entry.lane,
          hits,
          confidence: Math.min(1, hits.length / entry.markers.length),
          final: false
        });
      }
    });

    if (candidates.length === 0) {
      candidates.push({
        lane: SOURCE_000,
        hits: [],
        confidence: 0,
        final: false
      });
    }

    return candidates;
  }

  function review(item) {
    if (!item || typeof item !== "object") {
      return reject(item, "INVALID_DEWEY_REVIEW_ITEM");
    }

    const candidates = suggestCandidateLanes(item.record || item);

    const reviewed = {
      id: makeId("deweyReview"),
      reviewed_at: now(),
      queue_id: item.id || null,
      source_lane: item.source_lane || SOURCE_000,
      source_id: item.source_id || null,
      record: clone(item.record || item),
      candidate_lanes: candidates,
      final_classification: false,
      authority_allowed: false,
      status: REVIEW_STATUS.REVIEWED
    };

    state.reviewed.push(reviewed);
    return reviewed;
  }

  function release(reviewedItem, candidateLane) {
    if (!reviewedItem || typeof reviewedItem !== "object") {
      return reject(reviewedItem, "INVALID_RELEASE_ITEM");
    }

    const candidates = Array.isArray(reviewedItem.candidate_lanes)
      ? reviewedItem.candidate_lanes
      : [];

    const chosenLane =
      candidateLane ||
      candidates.find((candidate) => candidate.lane !== SOURCE_000)?.lane ||
      SOURCE_000;

    if (chosenLane === SOURCE_000) {
      return hold(reviewedItem, "NO_DEWEY_CANDIDATE_READY_KEEP_IN_000");
    }

    const releaseRecord = {
      id: makeId("deweyRelease"),
      released_at: now(),
      source_lane: reviewedItem.source_lane || SOURCE_000,
      target_lane: chosenLane,
      source_id: reviewedItem.source_id || null,
      review_id: reviewedItem.id || null,
      record: clone(reviewedItem.record || reviewedItem),
      final_classification: false,
      authority_allowed: false,
      status: REVIEW_STATUS.RELEASED
    };

    state.released.push(releaseRecord);
    return releaseRecord;
  }

  function process(input = {}) {
    const queued = queue(input);
    const reviewed = review(queued);

    const hasOnly000 =
      Array.isArray(reviewed.candidate_lanes) &&
      reviewed.candidate_lanes.length === 1 &&
      reviewed.candidate_lanes[0].lane === SOURCE_000;

    if (hasOnly000) {
      return hold(
        {
          queued,
          reviewed
        },
        "DEWEY_LATER_COULD_NOT_FIND_CANDIDATE_LANE"
      );
    }

    const released = release(reviewed);

    return {
      id: makeId("deweyProcess"),
      processed_at: now(),
      queued,
      reviewed,
      released,
      final_classification: false,
      authority_allowed: false,
      status: "dewey_later_process_complete"
    };
  }

  function canExecuteAuthority() {
    return false;
  }

  function getState() {
    return clone(state);
  }

  return {
    SOURCE_000,
    REVIEW_STATUS,
    queue,
    review,
    release,
    process,
    suggestCandidateLanes,
    hold,
    reject,
    canExecuteAuthority,
    getState
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdDeweyLater;
}
