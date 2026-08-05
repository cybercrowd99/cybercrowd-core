// core/secretary/secretary-lane-order.js
//
// Lane: core/secretary/
// Owns: lane order, allowed movement, denied movement, authority-needed decision.
// Does Not Own: UI, NET, login, upload, analytics, URLs, routes, tokens, tracking, classification, proof.
// Receives: HALO room signal, Biff point check, local movement request.
// Sends To: Octopus for approved ping movement, CLEAR for denied or expired movement.
// Security: no child tracking, no hidden sync, no analytics, no upload, no URL leakage.

(function () {
  "use strict";

  const SecretaryLaneOrder = (() => {
    const allowedCoreLanes = [
      "core/halo",
      "core/biff",
      "core/dewey",
      "core/octopus",
      "core/colosseum",
      "core/clear",
      "core/identity",
      "core/moment",
      "core/physics"
    ];

    function cleanText(value) {
      return String(value || "")
        .replace(/https?:\/\/\S+/gi, "[url-redacted]")
        .replace(/[?&][a-z0-9_-]+=[^&\s]+/gi, "[query-redacted]")
        .replace(/\s+/g, " ")
        .trim();
    }

    function cleanLane(value) {
      const lane = cleanText(value);

      if (!lane) {
        return "core/clear";
      }

      return lane.replace(/[^a-z0-9/_-]/gi, "").replace(/\/+/g, "/");
    }

    function isCoreLane(lane) {
      return allowedCoreLanes.indexOf(cleanLane(lane)) !== -1;
    }

    function requiresAuthority(input) {
      return Boolean(
        input.requires_authority ||
        input.account_binding ||
        input.login_required ||
        input.net_required ||
        input.upload_requested ||
        input.sync_requested
      );
    }

    function hasSecurityViolation(input) {
      return Boolean(
        input.child_tracking ||
        input.hidden_sync ||
        input.analytics ||
        input.upload_requested ||
        input.url_leakage ||
        input.route_exposure ||
        input.token_exposure ||
        input.crawler_map ||
        input.phishing_help ||
        input.bot_invitation
      );
    }

    function order(input = {}) {
      const fromLane = cleanLane(input.from_lane || "core/biff");
      const toLane = cleanLane(input.to_lane || "core/octopus");
      const subject = cleanText(input.subject || "local movement");
      const pointStatus = cleanText(input.point_status || input.status || "");
      const pointAllowed = input.allowed_to_move !== false && pointStatus !== "point_missing";
      const authorityNeeded = requiresAuthority(input);
      const securityViolation = hasSecurityViolation(input);
      const laneAllowed = isCoreLane(fromLane) && isCoreLane(toLane);

      let decision = "allow";
      let sendsTo = ["core/octopus"];
      let reason = "movement allowed";

      if (!pointAllowed) {
        decision = "deny";
        sendsTo = ["core/clear"];
        reason = "missing point";
      } else if (!laneAllowed) {
        decision = "deny";
        sendsTo = ["core/clear"];
        reason = "lane not allowed";
      } else if (securityViolation) {
        decision = "deny";
        sendsTo = ["core/clear"];
        reason = "security wall violation";
      } else if (authorityNeeded) {
        decision = "hold";
        sendsTo = ["core/identity"];
        reason = "authority needed before movement";
      }

      return {
        organ: "SECRETARY",
        lane: "core/secretary",
        kind: "lane_order",
        subject,
        from_lane: fromLane,
        to_lane: toLane,
        decision,
        allowed_to_move: decision === "allow",
        authority_needed: authorityNeeded,
        reason,
        sends_to: sendsTo,
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
      const safeResult = result || order();

      if (safeResult.decision === "allow") {
        return [
          "Secretary approved movement.",
          "From: " + cleanText(safeResult.from_lane),
          "To: " + cleanText(safeResult.to_lane),
          "Next: Octopus routes the ping."
        ].join(" ");
      }

      if (safeResult.decision === "hold") {
        return [
          "Secretary held movement.",
          "Reason: " + cleanText(safeResult.reason),
          "Next: Identity checks authority."
        ].join(" ");
      }

      return [
        "Secretary denied movement.",
        "Reason: " + cleanText(safeResult.reason),
        "Next: CLEAR removes the temporary trail."
      ].join(" ");
    }

    return {
      order,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SecretaryLaneOrder;
  }

  if (typeof window !== "undefined") {
    window.SecretaryLaneOrder = SecretaryLaneOrder;
  }
})();
