// core/biff/biff-point-check.js
// Lane: core/biff/
// Owns: purpose check, junk prevention, "What's the point?" gate.
// Does Not Own: UI, NET, login, upload, analytics, URLs, routes, tokens, tracking, punishment, ranking.
// Receives: HALO room signal, local subject, local purpose statement.
// Sends To: Secretary for lane order when point exists, CLEAR when point is missing.
// Security: no child tracking, no hidden sync, no analytics, no upload, no URL leakage.

(function () {
  "use strict";

  const BiffPointCheck = (() => {
    function cleanText(value) {
      return String(value || "")
        .replace(/https?:\/\/\S+/gi, "[url-redacted]")
        .replace(/[?&][a-z0-9_-]+=[^&\s]+/gi, "[query-redacted]")
        .replace(/\s+/g, " ")
        .trim();
    }

    function hasPoint(value) {
      return cleanText(value).length >= 3;
    }

    function check(input = {}) {
      const subject = cleanText(input.subject || "unknown");
      const point = cleanText(input.point || input.purpose || "");
      const room = cleanText(input.room || input.halo_room || "core");

      const pointExists = hasPoint(point);

      return {
        organ: "BIFF",
        lane: "core/biff",
        kind: "point_check",
        question: "What's the point?",
        room,
        subject,
        point,
        status: pointExists ? "point_found" : "point_missing",
        allowed_to_move: pointExists,
        sends_to: pointExists ? ["core/secretary"] : ["core/clear"],
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
      const safeResult = result || check();

      if (safeResult.allowed_to_move) {
        return [
          "Biff found the point.",
          "Subject: " + cleanText(safeResult.subject),
          "Point: " + cleanText(safeResult.point),
          "Next: Secretary checks lane order."
        ].join(" ");
      }

      return [
        "Biff stopped the move.",
        "Subject: " + cleanText(safeResult.subject),
        "Reason: no clear point.",
        "Next: CLEAR removes the temporary trail."
      ].join(" ");
    }

    return {
      check,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BiffPointCheck;
  }

  if (typeof window !== "undefined") {
    window.BiffPointCheck = BiffPointCheck;
  }
})();
