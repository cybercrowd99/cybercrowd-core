// core/octopus/octopus-ping-route.js
//
// Lane: core/octopus/
// Owns: ping movement, lane handoff, approved object/result signal routing.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage, authority.
// Receives: Turd Ping signal, Secretary lane order, Dewey match, Moment memory seed.
// Sends To: approved core lane only, or CLEAR when movement is denied.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const OctopusPingRoute = (() => {
    const allowedCoreLanes = [
      "core/halo",
      "core/secretary",
      "core/biff",
      "core/dewey",
      "core/turd-ping",
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
        .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[contact-redacted]")
        .replace(/\b(token|secret|key|password|passcode|pin)\b\s*[:=]\s*\S+/gi, "$1=[redacted]")
        .replace(/[a-z0-9_-]{24,}/gi, "[long-id-redacted]")
        .replace(/\s+/g, " ")
        .trim();
    }

    function cleanLane(value, fallback) {
      const lane = cleanText(value || fallback || "core/clear")
        .replace(/[^a-z0-9/_-]/gi, "")
        .replace(/\/+/g, "/")
        .replace(/\/$/g, "");

      return lane || "core/clear";
    }

    function isAllowedLane(lane) {
      return allowedCoreLanes.indexOf(cleanLane(lane)) !== -1;
    }

    function makeId(prefix) {
      return [
        prefix,
        Date.now(),
        Math.random().toString(36).slice(2, 10)
      ].join(".");
    }

    function securityWall(input = {}) {
      return Boolean(
        input.child_tracking ||
        input.hidden_sync ||
        input.analytics ||
        input.upload ||
        input.upload_requested ||
        input.account_binding ||
        input.url_leakage ||
        input.route_exposure ||
        input.token_exposure ||
        input.crawler_map ||
        input.phishing_help ||
        input.bot_invitation ||
        input.net_required
      );
    }

    function route(input = {}) {
      const pingId = cleanText(input.ping_id || input.seed_id || input.signal_id || "local-ping");
      const label = cleanText(input.label || input.item || input.object || input.value_statement || "object signal");

      const fromLane = cleanLane(input.from_lane || input.lane || "core/turd-ping", "core/turd-ping");
      const requestedLane = cleanLane(input.to_lane || input.target_lane || input.next_lane || "core/secretary", "core/secretary");

      const secretaryDecision = cleanText(input.decision || input.secretary_decision || "allow");
      const denied = secretaryDecision === "deny" || input.allowed_to_move === false;
      const hold = secretaryDecision === "hold" || input.authority_needed === true;
      const violation = securityWall(input);

      let toLane = requestedLane;
      let routeState = "routed";
      let reason = "approved core movement";

      if (violation) {
        toLane = "core/clear";
        routeState = "blocked";
        reason = "security wall violation";
      } else if (denied) {
        toLane = "core/clear";
        routeState = "blocked";
        reason = "Secretary denied movement";
      } else if (hold) {
        toLane = "core/identity";
        routeState = "held";
        reason = "authority required before movement";
      } else if (!isAllowedLane(fromLane) || !isAllowedLane(toLane)) {
        toLane = "core/clear";
        routeState = "blocked";
        reason = "lane not allowed";
      }

      return {
        organ: "OCTOPUS",
        lane: "core/octopus",
        kind: "ping_route",
        route_id: makeId("octopus.route"),
        ping_id: pingId,
        label,
        from_lane: fromLane,
        to_lane: toLane,
        route_state: routeState,
        moved: routeState === "routed",
        held: routeState === "held",
        blocked: routeState === "blocked",
        reason,
        temporary_trail: true,
        clearable: true,
        sends_to: [toLane],
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

    function fromSecretary(order = {}, signal = {}) {
      return route({
        ping_id: signal.ping_id || signal.seed_id || order.ping_id,
        label: signal.label || signal.value_statement || order.subject,
        from_lane: order.from_lane || signal.lane || "core/secretary",
        to_lane: order.to_lane || "core/moment",
        decision: order.decision,
        allowed_to_move: order.allowed_to_move,
        authority_needed: order.authority_needed,
        child_tracking: order.child_tracking,
        hidden_sync: order.hidden_sync,
        analytics: order.analytics,
        upload: order.upload,
        account_binding: order.account_binding,
        url_leakage: order.url_leakage
      });
    }

    function explain(result) {
      const safeResult = result || route();

      if (safeResult.blocked) {
        return [
          "Octopus blocked the ping.",
          "Reason: " + cleanText(safeResult.reason),
          "Next: CLEAR handles the temporary trail."
        ].join(" ");
      }

      if (safeResult.held) {
        return [
          "Octopus held the ping.",
          "Reason: " + cleanText(safeResult.reason),
          "Next: Identity checks authority."
        ].join(" ");
      }

      return [
        "Octopus routed the ping.",
        "From: " + cleanText(safeResult.from_lane),
        "To: " + cleanText(safeResult.to_lane),
        "Signal: " + cleanText(safeResult.label)
      ].join(" ");
    }

    return {
      route,
      fromSecretary,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = OctopusPingRoute;
  }

  if (typeof window !== "undefined") {
    window.OctopusPingRoute = OctopusPingRoute;
  }
})();
