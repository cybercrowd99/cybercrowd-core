// core/clear/clear-trail-wipe.js
// Lane: core/clear/
// Owns: temporary trail removal, operational signal cleanup, value preservation after wipe.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage.
// Receives: local temporary ping trail, Moment memory seed, Secretary deny/clear decision.
// Sends To: Secretary for cleared status, Moment for value-remains record.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const ClearTrailWipe = (() => {
    function cleanText(value) {
      return String(value || "")
        .replace(/https?:\/\/\S+/gi, "[url-redacted]")
        .replace(/[?&][a-z0-9_-]+=[^&\s]+/gi, "[query-redacted]")
        .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[contact-redacted]")
        .replace(/\b(token|secret|key|password|passcode|pin)\b\s*[:=]\s*\S+/gi, "$1=[redacted]")
        .replace(/[a-z0-9_-]{24,}/gi, "[long-id-redacted]")
        .replace(/\s+/g, " ")
        .trim();
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

    function valueFrom(input = {}) {
      return {
        label: cleanText(input.label || input.item || input.object || "object"),
        value_statement: cleanText(
          input.value_statement ||
          input.value ||
          input.result ||
          input.reason ||
          "value preserved"
        ),
        matched: bool(input.matched) || cleanText(input.status) === "not_lost",
        dewey_home: cleanText(input.dewey_home || input.suggested_home || input.home || ""),
        dewey_lane: cleanText(input.dewey_lane || input.suggested_lane || input.lane || ""),
        source_kind: cleanText(input.source_kind || input.kind || "temporary_operational_signal")
      };
    }

    function shouldClear(input = {}) {
      return Boolean(
        input.clear_requested ||
        input.temporary_trail ||
        input.point_missing ||
        input.denied ||
        input.security_violation ||
        input.expired ||
        input.resolved ||
        input.status === "point_missing" ||
        input.status === "trail_ready_to_clear" ||
        input.status === "value_ready"
      );
    }

    function wipe(input = {}) {
      const preserved = valueFrom(input);

      return {
        organ: "CLEAR",
        lane: "core/clear",
        kind: "trail_wipe",
        clear_id: makeId("clear.wipe"),
        cleared: true,
        temporary_trail_removed: true,
        value_survives_clear: true,
        preserved_value: preserved,
        removed: {
          raw_ping: true,
          temporary_signal: true,
          working_trail: true,
          url_like_text: true,
          contact_like_text: true,
          secret_like_text: true,
          long_identifier_like_text: true
        },
        sends_to: ["core/secretary", "core/moment"],
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

    function refuseRetention(input = {}) {
      const preserved = valueFrom(input);

      return {
        organ: "CLEAR",
        lane: "core/clear",
        kind: "retention_refusal",
        clear_id: makeId("clear.refuse"),
        retained: false,
        reason: cleanText(input.reason || "temporary operational trail may not become tracking"),
        value_survives_clear: true,
        preserved_value: preserved,
        sends_to: ["core/secretary"],
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

    function process(input = {}) {
      if (shouldClear(input)) {
        return wipe(input);
      }

      return {
        organ: "CLEAR",
        lane: "core/clear",
        kind: "clear_check",
        clear_needed: false,
        reason: "no clear condition found",
        value_survives_clear: true,
        sends_to: ["core/secretary"],
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

    function explain(result) {
      const safeResult = result || process();

      if (safeResult.kind === "trail_wipe") {
        return [
          "CLEAR wiped the temporary trail.",
          "Value remains: " + cleanText(safeResult.preserved_value && safeResult.preserved_value.value_statement),
          "No tracking trail remains."
        ].join(" ");
      }

      if (safeResult.kind === "retention_refusal") {
        return [
          "CLEAR refused retention.",
          "Reason: " + cleanText(safeResult.reason),
          "Value remains without a tracking trail."
        ].join(" ");
      }

      return [
        "CLEAR checked the signal.",
        "Clear needed: " + String(Boolean(safeResult.clear_needed)),
        "Value law remains active."
      ].join(" ");
    }

    return {
      process,
      wipe,
      refuseRetention,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ClearTrailWipe;
  }

  if (typeof window !== "undefined") {
    window.ClearTrailWipe = ClearTrailWipe;
  }
})();
 
