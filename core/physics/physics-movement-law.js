// core/physics/physics-movement-law.js
// Lane: core/physics/
// Owns: movement rules, constraints, behavior boundaries, function-over-product continuity.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage, authority.
// Receives: Secretary lane order, Octopus route, Turd Ping signal, Colosseum proof, Moment value seed.
// Sends To: Secretary for allowed movement, Octopus for approved route, CLEAR for unsafe movement.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const PhysicsMovementLaw = (() => {
    const allowedStates = [
      "found",
      "classified",
      "matched",
      "resolved",
      "cleared",
      "held",
      "blocked"
    ];

    const allowedMovements = [
      "guide",
      "question",
      "classify",
      "signal",
      "route",
      "prove",
      "clear",
      "attach_value",
      "preserve_value"
    ];

    function cleanText(value) {
      return String(value || "")
        .replace(/data:image\/[a-z]+;base64,[a-z0-9+/=]+/gi, "[media-redacted]")
        .replace(/data:audio\/[a-z]+;base64,[a-z0-9+/=]+/gi, "[media-redacted]")
        .replace(/https?:\/\/\S+/gi, "[url-redacted]")
        .replace(/[?&][a-z0-9_-]+=[^&\s]+/gi, "[query-redacted]")
        .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[contact-redacted]")
        .replace(/\b(token|secret|key|password|passcode|pin|session|cookie)\b\s*[:=]\s*\S+/gi, "$1=[redacted]")
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

      if (allowedStates.indexOf(state) !== -1) {
        return state;
      }

      return "blocked";
    }

    function cleanMovement(value) {
      const movement = cleanText(value || "route").toLowerCase();

      if (allowedMovements.indexOf(movement) !== -1) {
        return movement;
      }

      return "clear";
    }

    function securityViolation(input = {}) {
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
        input.unauthorized_surveillance ||
        input.net_required
      );
    }

    function movementAllowed(input = {}) {
      const movement = cleanMovement(input.movement || input.action);
      const state = cleanState(input.state || input.status);
      const violation = securityViolation(input);

      if (violation) {
        return false;
      }

      if (state === "blocked") {
        return false;
      }

      if (movement === "clear") {
        return true;
      }

      if (state === "cleared" && movement !== "preserve_value") {
        return false;
      }

      if (state === "held" && movement !== "attach_value") {
        return false;
      }

      return true;
    }

    function check(input = {}) {
      const movement = cleanMovement(input.movement || input.action);
      const state = cleanState(input.state || input.status);
      const subject = cleanText(input.subject || input.label || input.item || "object signal");
      const allowed = movementAllowed(input);

      return {
        organ: "PHYSICS",
        lane: "core/physics",
        kind: "movement_law_check",
        law_id: makeId("physics.law"),
        subject,
        movement,
        state,
        allowed,
        decision: allowed ? "allow" : "block",
        reason: allowed
          ? "movement obeys core behavior law"
          : "movement violates core behavior law or security wall",
        function_preserved: true,
        product_locked: false,
        sends_to: allowed ? ["core/secretary", "core/octopus"] : ["core/clear"],
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

    function preserveFunction(input = {}) {
      const subject = cleanText(input.subject || input.label || "core function");
      const functionName = cleanText(input.function_name || input.function || "value movement");
      const productSurface = cleanText(input.product_surface || input.surface || "not required");

      return {
        organ: "PHYSICS",
        lane: "core/physics",
        kind: "function_preservation",
        preservation_id: makeId("physics.preserve"),
        subject,
        function_name: functionName,
        product_surface: productSurface,
        rule: "function survives product change",
        preserved: true,
        product_locked: false,
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

    function constrain(input = {}) {
      const subject = cleanText(input.subject || input.label || "object signal");
      const constraint = cleanText(input.constraint || "no unsafe movement");
      const violation = securityViolation(input);

      return {
        organ: "PHYSICS",
        lane: "core/physics",
        kind: "constraint_check",
        constraint_id: makeId("physics.constraint"),
        subject,
        constraint,
        satisfied: !violation,
        decision: violation ? "block" : "allow",
        sends_to: violation ? ["core/clear"] : ["core/secretary"],
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

      if (safeResult.kind === "function_preservation") {
        return [
          "Physics preserved the function.",
          "Function: " + cleanText(safeResult.function_name),
          "Product surface is not the authority."
        ].join(" ");
      }

      if (safeResult.decision === "block") {
        return [
          "Physics blocked movement.",
          "Subject: " + cleanText(safeResult.subject),
          "Reason: " + cleanText(safeResult.reason || safeResult.constraint),
          "Next: CLEAR handles the temporary trail."
        ].join(" ");
      }

      return [
        "Physics allowed movement.",
        "Subject: " + cleanText(safeResult.subject),
        "Movement: " + cleanText(safeResult.movement || "allowed"),
        "Next: Secretary or Octopus continues the route."
      ].join(" ");
    }

    return {
      check,
      preserveFunction,
      constrain,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PhysicsMovementLaw;
  }

  if (typeof window !== "undefined") {
    window.PhysicsMovementLaw = PhysicsMovementLaw;
  }
})();
