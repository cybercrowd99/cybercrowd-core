/*
  CyberCrowd Core — Value Lane Detector

  Owns:
  - detecting repeated evidence patterns
  - checking whether a uIDL already has a lane for the value
  - proposing a missing value lane
  - sending the proposal to Biff/user choice

  Does NOT:
  - create lanes automatically
  - publish anything
  - sell data
  - decide identity
  - trigger movement
  - bypass the user
  - store credentials
  - scrape providers
  - own Dewey, CSI&G, CyberJobs, or Octopus

  Doctrine:
  Repeated evidence
      ↓
  Dewey bucket fills
      ↓
  Balancer checks
      ↓
  Missing value lane detected
      ↓
  Biff asks: "What's the point?"
      ↓
  User chooses:
  YES / NO / PRIVATE
*/

const CyberCrowdValueLaneDetector = (() => {
  const DEFAULT_MIN_EVIDENCE_COUNT = 3;

  const VALUE_LANE_HINTS = [
    {
      lane: "Golf / Recreation / Social Time",
      tags: ["golf", "tee time", "golf club", "driving range", "putter", "driver"],
    },
    {
      lane: "Music / Guitar / Creator",
      tags: ["music", "guitar", "song", "studio", "band", "recording", "album"],
    },
    {
      lane: "Food / Likes / Mexican",
      tags: ["mexican", "taco", "burrito", "quesadilla", "enchilada", "salsa"],
    },
    {
      lane: "Food / Loves / Italian",
      tags: ["italian", "pasta", "pizza", "lasagna", "spaghetti", "ravioli"],
    },
    {
      lane: "Health-Private / Avoid",
      tags: ["heartburn", "acid reflux", "allergy", "avoid", "reaction"],
      private_default: true,
    },
  ];

  let buckets = new Map();

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeText(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
  }

  function requireText(value, errorCode) {
    if (!value || typeof value !== "string" || !value.trim()) {
      throw new Error(errorCode);
    }

    return value.trim();
  }

  function normalizeTags(tags = []) {
    if (!Array.isArray(tags)) return [];

    return tags
      .map((tag) => normalizeText(tag))
      .filter(Boolean);
  }

  function normalizeExistingLanes(existingLanes = []) {
    if (!Array.isArray(existingLanes)) return [];

    return existingLanes
      .map((lane) => normalizeText(lane))
      .filter(Boolean);
  }

  function createBucketKey(uidl, subject) {
    const cleanUIDL = requireText(uidl, "UIDL_REQUIRED");
    const cleanSubject = requireText(subject, "SUBJECT_REQUIRED");

    return `${cleanUIDL.toLowerCase()}::${cleanSubject.toLowerCase()}`;
  }

  function matchLaneHint(tags = [], text = "") {
    const cleanTags = normalizeTags(tags);
    const cleanText = normalizeText(text);

    for (const hint of VALUE_LANE_HINTS) {
      const found = hint.tags.some((tag) => {
        return cleanTags.includes(tag) || cleanText.includes(tag);
      });

      if (found) {
        return clone(hint);
      }
    }

    return null;
  }

  function laneAlreadyExists(proposedLane, existingLanes = []) {
    const cleanProposed = normalizeText(proposedLane);
    const cleanExisting = normalizeExistingLanes(existingLanes);

    if (!cleanProposed) return false;

    return cleanExisting.some((lane) => {
      return (
        lane === cleanProposed ||
        cleanProposed.includes(lane) ||
        lane.includes(cleanProposed)
      );
    });
  }

  function makeEvidenceRecord(input = {}) {
    const subject = requireText(input.subject, "SUBJECT_REQUIRED");

    return {
      evidence_id: input.evidence_id || makeId("evidence"),
      subject,
      source: input.source || "unknown",
      type: input.type || "signal",
      title: input.title || subject,
      tags: normalizeTags(input.tags),
      text: input.text || "",
      created_at: input.created_at || now(),
      private_default: Boolean(input.private_default),
      raw_reference: input.raw_reference || null,
    };
  }

  function addEvidence(uidl, input = {}) {
    const cleanUIDL = requireText(uidl, "UIDL_REQUIRED");
    const evidence = makeEvidenceRecord(input);
    const bucketKey = createBucketKey(cleanUIDL, evidence.subject);

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        bucket_id: makeId("valueBucket"),
        uidl: cleanUIDL,
        subject: evidence.subject,
        evidence: [],
        created_at: now(),
        updated_at: now(),
      });
    }

    const bucket = buckets.get(bucketKey);
    bucket.evidence.push(evidence);
    bucket.updated_at = now();

    return clone(bucket);
  }

  function inspectBucket(bucket, options = {}) {
    const minEvidenceCount =
      Number.isInteger(options.minEvidenceCount) && options.minEvidenceCount > 0
        ? options.minEvidenceCount
        : DEFAULT_MIN_EVIDENCE_COUNT;

    const existingLanes = Array.isArray(options.existingLanes)
      ? options.existingLanes
      : [];

    const allTags = bucket.evidence.flatMap((item) => item.tags || []);
    const allText = bucket.evidence
      .map((item) => `${item.subject} ${item.title || ""} ${item.text || ""}`)
      .join(" ");

    const laneHint = matchLaneHint(allTags, allText);

    const repeatedEnough = bucket.evidence.length >= minEvidenceCount;
    const meaningfulEnough = Boolean(laneHint);
    const proposedLane = laneHint ? laneHint.lane : null;
    const alreadyExists = proposedLane
      ? laneAlreadyExists(proposedLane, existingLanes)
      : false;

    const missingLaneDetected =
      repeatedEnough && meaningfulEnough && proposedLane && !alreadyExists;

    return {
      bucket_id: bucket.bucket_id,
      uidl: bucket.uidl,
      subject: bucket.subject,
      evidence_count: bucket.evidence.length,
      repeated_enough: repeatedEnough,
      meaningful_enough: meaningfulEnough,
      proposed_lane: proposedLane,
      lane_already_exists: alreadyExists,
      missing_lane_detected: missingLaneDetected,
      private_default: Boolean(laneHint && laneHint.private_default),
      inspected_at: now(),
    };
  }

  function createProposal(bucket, inspection) {
    if (!inspection.missing_lane_detected) {
      return {
        proposal_created: false,
        status: "no_missing_value_lane",
        reason: "Bucket did not pass repeated, meaningful, and missing-lane checks.",
        inspection: clone(inspection),
      };
    }

    return {
      proposal_created: true,
      proposal_id: makeId("valueLaneProposal"),
      uidl: bucket.uidl,
      subject: bucket.subject,
      proposed_lane: inspection.proposed_lane,
      evidence_count: inspection.evidence_count,
      status: "needs_user_choice",
      biff_question: "What's the point?",
      reason:
        "This uIDL has repeated evidence, but no lane holds the value.",
      choices: inspection.private_default
        ? ["PRIVATE", "YES", "NO"]
        : ["YES", "NO", "PRIVATE"],
      private_default: inspection.private_default,
      tofu_candidate: true,
      created_at: now(),
      evidence_refs: bucket.evidence.map((item) => ({
        evidence_id: item.evidence_id,
        source: item.source,
        type: item.type,
        title: item.title,
        created_at: item.created_at,
      })),
    };
  }

  function detect(uidl, evidenceInputs = [], options = {}) {
    const cleanUIDL = requireText(uidl, "UIDL_REQUIRED");

    if (!Array.isArray(evidenceInputs)) {
      throw new Error("EVIDENCE_LIST_REQUIRED");
    }

    const touchedBuckets = [];

    for (const input of evidenceInputs) {
      touchedBuckets.push(addEvidence(cleanUIDL, input));
    }

    const uniqueBucketIds = new Set();
    const results = [];

    for (const bucketSnapshot of touchedBuckets) {
      if (uniqueBucketIds.has(bucketSnapshot.bucket_id)) continue;
      uniqueBucketIds.add(bucketSnapshot.bucket_id);

      const bucketKey = createBucketKey(cleanUIDL, bucketSnapshot.subject);
      const liveBucket = buckets.get(bucketKey);

      const inspection = inspectBucket(liveBucket, options);
      const proposal = createProposal(liveBucket, inspection);

      results.push({
        bucket: {
          bucket_id: liveBucket.bucket_id,
          uidl: liveBucket.uidl,
          subject: liveBucket.subject,
          evidence_count: liveBucket.evidence.length,
          created_at: liveBucket.created_at,
          updated_at: liveBucket.updated_at,
        },
        inspection,
        proposal,
      });
    }

    return {
      detector: "CyberCrowdValueLaneDetector",
      status: "inspection_complete",
      uidl: cleanUIDL,
      checked_at: now(),
      results,
    };
  }

  function getBucket(uidl, subject) {
    const bucketKey = createBucketKey(uidl, subject);
    const bucket = buckets.get(bucketKey);

    return bucket ? clone(bucket) : null;
  }

  function listBuckets(uidl = null) {
    const cleanUIDL = uidl ? normalizeText(uidl) : null;

    return Array.from(buckets.values())
      .filter((bucket) => {
        if (!cleanUIDL) return true;
        return normalizeText(bucket.uidl) === cleanUIDL;
      })
      .map(clone);
  }

  function reset() {
    buckets = new Map();

    return {
      status: "reset",
      reset_at: now(),
    };
  }

  return {
    addEvidence,
    detect,
    inspectBucket,
    createProposal,
    getBucket,
    listBuckets,
    reset,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CyberCrowdValueLaneDetector;
}

if (typeof window !== "undefined") {
  window.CyberCrowdValueLaneDetector = CyberCrowdValueLaneDetector;
}
