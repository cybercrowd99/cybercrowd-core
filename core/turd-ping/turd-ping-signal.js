// core/turd-ping/turd-ping-signal.js
//
// Lane: core/turd-ping/
// Owns: object/result signal, found signal, match signal, resolved signal, clearable ping shape.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage, routing.
// Receives: local object/result event, Dewey classification, Colosseum proof state, Moment value seed.
// Sends To: Dewey for classification, Secretary for lane order, Moment for memory fuel, CLEAR for trail wipe.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const TurdPingSignal = (() => {
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

    function cleanState(value) {
      const state = cleanText(value || "found").toLowerCase();

      if (state === "matched" || state === "not_lost") {
        return "matched";
      }

      if (state === "resolved" || state === "complete" || state === "clean") {
        return "resolved";
      }

      if (state === "cleared") {
        return "cleared";
      }

      return "found";
    }

    function sendsForState(state) {
      if (state === "found") {
        return ["core/dewey", "core/secretary"];
      }

      if (state === "matched" || state === "resolved") {
        return ["core/moment", "core/secretary", "core/clear"];
      }

      return ["core/clear"];
    }

    function create(input = {}) {
      const label = cleanText(
        input.label ||
        input.item ||
        input.object ||
        input.result ||
        "object"
      );

      const state = cleanState(
        input.state ||
        input.status ||
        input.result_state ||
        "found"
      );

      const objectType = cleanText(
        input.object_type ||
        input.type ||
        "object"
      );

      const source = cleanText(
        input.source ||
        input.source_kind ||
        "local"
      );

      const valueStatement = cleanText(
        input.value_statement ||
        input.value ||
        input.result_value ||
        (label + " signal")
      );

      return {
        organ: "TURD_PING",
        lane: "core/turd-ping",
        kind: "object_result_signal",
        ping_id: makeId("turd.ping"),
        source,
        label,
        object_type: objectType,
        state,
        matched: state === "matched" || state === "resolved",
        resolved: state === "resolved",
        value_statement: valueStatement,
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: sendsForState(state),
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

    function fromDewey(dewey = {}) {
      const matched = bool(dewey.matched) || cleanText(dewey.status) === "not_lost";

      return create({
        source: "dewey",
        label: dewey.label || dewey.item || "object",
        object_type: dewey.object_type || "object",
        state: matched ? "matched" : "found",
        value_statement: matched
          ? "Item matched to " + cleanText(dewey.suggested_home || dewey.home || "home")
          : "Item classified but still needs match"
      });
    }

    function resolve(input = {}) {
      return create({
        source: input.source || "colosseum",
        label: input.label || input.item || input.object || "object",
        object_type: input.object_type || "object",
        state: "resolved",
        value_statement: input.value_statement || input.result || "result resolved"
      });
    }

    function clear(input = {}) {
      const ping = input.ping_id ? input : create(input);

      return {
        organ: "TURD_PING",
        lane: "core/turd-ping",
        kind: "ping_clear_request",
        ping_id: cleanText(ping.ping_id),
        label: cleanText(ping.label),
        state: "cleared",
        temporary_trail: false,
        clearable: true,
        value_survives_clear: true,
        value_statement: cleanText(ping.value_statement),
        sends_to: ["core/clear"],
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

    function explain(ping) {
      const safePing = ping || create();

      if (safePing.kind === "ping_clear_request") {
        return [
          "Turd Ping requested CLEAR.",
          "Signal: " + cleanText(safePing.label),
          "Value remains: " + cleanText(safePing.value_statement)
        ].join(" ");
      }

      if (safePing.resolved) {
        return [
          "Turd Ping says the result is resolved.",
          "Signal: " + cleanText(safePing.label),
          "Next: Moment can preserve value, CLEAR can wipe the trail."
        ].join(" ");
      }

      if (safePing.matched) {
        return [
          "Turd Ping says the item matched.",
          "Signal: " + cleanText(safePing.label),
          "Next: Moment can turn it into memory fuel."
        ].join(" ");
      }

      return [
        "Turd Ping says something was found.",
        "Signal: " + cleanText(safePing.label),
        "Next: Dewey classifies it."
      ].join(" ");
    }

    return {
      create,
      fromDewey,
      resolve,
      clear,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TurdPingSignal;
  }

  if (typeof window !== "undefined") {
    window.TurdPingSignal = TurdPingSignal;
  }
})();
