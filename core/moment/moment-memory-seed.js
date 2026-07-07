// core/moment/moment-memory-seed.js
// Lane: core/moment/
// Owns: replay-safe memory seed, value preservation, clearable ping meaning.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage.
// Receives: local object/result ping, Dewey match, optional authority-ready context.
// Sends To: Secretary for authority/lane order, Octopus for approved ping movement, CLEAR for trail wipe.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const MomentMemorySeed = (() => {
    function cleanText(value) {
      return String(value || "")
        .replace(/https?:\/\/\S+/gi, "[url-redacted]")
        .replace(/[?&][a-z0-9_-]+=[^&\s]+/gi, "[query-redacted]")
        .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[contact-redacted]")
        .replace(/\b(token|secret|key|password|passcode|pin)\b\s*[:=]\s*\S+/gi, "$1=[redacted]")
        .replace(/\s+/g, " ")
        .trim();
    }

    function cleanLane(value, fallback) {
      const lane = cleanText(value || fallback || "core/moment");

      return lane.replace(/[^a-z0-9/_-]/gi, "").replace(/\/+/g, "/");
    }

    function makeId(prefix) {
      return [
        prefix,
        Date.now(),
        Math.random().toString(36).slice(2, 10)
      ].join(".");
    }

    function bool(value) {
      return value === true;
    }

    function createSeed(input = {}) {
      const label = cleanText(
        input.label ||
        input.item ||
        input.object ||
        input.ping_label ||
        "object"
      );

      const sourceKind = cleanText(
        input.source_kind ||
        input.kind ||
        input.ping_kind ||
        "object_result_ping"
      );

      const valueStatement = cleanText(
        input.value_statement ||
        input.value ||
        input.result ||
        ("Found signal for " + label)
      );

      const deweyHome = cleanText(
        input.suggested_home ||
        input.home ||
        input.dewey_home ||
        ""
      );

      const deweyLane = cleanLane(
        input.suggested_lane ||
        input.lane ||
        input.dewey_lane ||
        "core/dewey"
      );

      const matched = bool(input.matched) || cleanText(input.status) === "not_lost";
      const parentAuthorityReady = bool(input.parent_authority_ready);
      const paymentReady = bool(input.payment_ready);

      return {
        organ: "MOMENT",
        lane: "core/moment",
        kind: "memory_seed",
        seed_id: makeId("moment.seed"),
        source_kind: sourceKind,
        label,
        value_statement: valueStatement,
        dewey_home: deweyHome || "unmatched",
        dewey_lane: deweyLane,
        matched,
        status: matched ? "value_ready" : "working_signal",
        ownership_state: parentAuthorityReady && paymentReady
          ? "ready_for_personal_attachment"
          : "unattached_until_authority",
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: ["core/secretary", "core/octopus", "core/clear"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false
        },
        created_at: new Date().toISOString()
      };
    }

    function prepareForAuthority(seed = {}, context = {}) {
      const safeSeed = seed.seed_id ? seed : createSeed(seed);

      return {
        organ: "MOMENT",
        lane: "core/moment",
        kind: "authority_ready_memory",
        seed_id: cleanText(safeSeed.seed_id),
        label: cleanText(safeSeed.label),
        value_statement: cleanText(safeSeed.value_statement),
        matched: bool(safeSeed.matched),
        parent_authority_ready: bool(context.parent_authority_ready),
        payment_ready: bool(context.payment_ready),
        status: bool(context.parent_authority_ready) && bool(context.payment_ready)
          ? "ready_for_personal_value"
          : "waiting_for_authority",
        note: "Payment and login are not owned here. Moment only prepares the memory value shape.",
        sends_to: ["core/secretary"],
        security: safeSeed.security || {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false
        },
        created_at: new Date().toISOString()
      };
    }

    function clearTrail(seed = {}) {
      const safeSeed = seed.seed_id ? seed : createSeed(seed);

      return {
        organ: "MOMENT",
        lane: "core/moment",
        kind: "cleared_memory_value",
        seed_id: cleanText(safeSeed.seed_id),
        value_statement: cleanText(safeSeed.value_statement),
        matched: bool(safeSeed.matched),
        dewey_home: cleanText(safeSeed.dewey_home),
        trail_removed: true,
        temporary_trail: false,
        value_survives_clear: true,
        status: "trail_cleared_value_remains",
        sends_to: ["core/clear", "core/secretary"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false
        },
        cleared_at: new Date().toISOString()
      };
    }

    function explain(seed) {
      const safeSeed = seed || createSeed();

      if (safeSeed.kind === "cleared_memory_value") {
        return [
          "Moment cleared the temporary trail.",
          "Value remains: " + cleanText(safeSeed.value_statement),
          "No tracking remains."
        ].join(" ");
      }

      return [
        "Moment created memory fuel from a local ping.",
        "Label: " + cleanText(safeSeed.label),
        "Value: " + cleanText(safeSeed.value_statement),
        "State: " + cleanText(safeSeed.ownership_state || safeSeed.status),
        "CLEAR can remove the temporary trail."
      ].join(" ");
    }

    return {
      createSeed,
      prepareForAuthority,
      clearTrail,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = MomentMemorySeed;
  }

  if (typeof window !== "undefined") {
    window.MomentMemorySeed = MomentMemorySeed;
  }
})();
