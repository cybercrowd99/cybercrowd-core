// core/cybercrowd-core-function.js
// Lane: core/
// Owns: safe local CyberCrowd Core function entry.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage.
// Receives: local function request for found/result/object signal.
// Sends To: CyberCrowdCoreReady and CyberCrowdCoreFlow only.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const CyberCrowdCoreFunction = (() => {
    const CORE_REF = "CC-CORE-SYS-0001";

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

    function bool(value) {
      return value === true;
    }

    function loadLocal(globalName, modulePath) {
      if (typeof window !== "undefined" && window[globalName]) {
        return window[globalName];
      }

      if (typeof require === "function") {
        try {
          return require(modulePath);
        } catch (error) {
          return null;
        }
      }

      return null;
    }

    function readyModule() {
      return loadLocal("CyberCrowdCoreReady", "./cybercrowd-core-ready.js");
    }

    function flowModule() {
      return loadLocal("CyberCrowdCoreFlow", "./cybercrowd-core-flow.js");
    }

    function securityWall() {
      return {
        child_tracking: false,
        hidden_sync: false,
        analytics: false,
        upload: false,
        account_binding: false,
        url_leakage: false,
        crawler_map: false,
        phishing_guide: false,
        bot_invitation: false
      };
    }

    function normalizeRequest(input = {}) {
      return {
        label: cleanText(input.label || input.item || input.object || input.result || "found object"),
        mission: cleanText(
          input.mission ||
          "Find the thing, match the thing, preserve value, clear the trail."
        ),
        point: cleanText(
          input.point ||
          input.purpose ||
          "Match the found item to its home, recipient, or lane."
        ),
        expected_home: cleanText(input.expected_home || input.target_home || ""),
        expected_lane: cleanText(input.expected_lane || input.target_lane || ""),
        lost_recipient: cleanText(input.lost_recipient || input.recipient || ""),
        parent_authority_ready: bool(input.parent_authority_ready),
        payment_ready: bool(input.payment_ready),
        requires_authority: bool(input.requires_authority),
        clear_after: input.clear_after !== false,
        child_tracking: false,
        hidden_sync: false,
        analytics: false,
        upload: false,
        account_binding: false,
        url_leakage: false
      };
    }

    function notReady(reason, extra = {}) {
      return {
        organ: "CORE",
        lane: "core",
        kind: "core_function_result",
        ref: CORE_REF,
        status: "not_ready",
        ready: false,
        reason: cleanText(reason),
        missing: Array.isArray(extra.missing) ? extra.missing : [],
        security: securityWall(),
        created_at: new Date().toISOString()
      };
    }

    function ready() {
      const readyCheck = readyModule();

      if (!readyCheck || typeof readyCheck.run !== "function") {
        return notReady("CyberCrowdCoreReady is not loaded");
      }

      return readyCheck.run();
    }

    function found(input = {}) {
      const readyResult = ready();

      if (!readyResult.ready) {
        return notReady("Core organs are not ready", {
          missing: readyResult.missing || []
        });
      }

      const flow = flowModule();

      if (!flow || typeof flow.runFoundFlow !== "function") {
        return notReady("CyberCrowdCoreFlow is not loaded");
      }

      const request = normalizeRequest(input);
      const result = flow.runFoundFlow(request);

      return {
        organ: "CORE",
        lane: "core",
        kind: "core_function_result",
        ref: CORE_REF,
        function_name: "found",
        status: cleanText(result.status),
        ready: true,
        label: cleanText(result.label),
        matched: bool(result.matched),
        value_statement: cleanText(result.value_statement),
        ownership_state: cleanText(result.ownership_state),
        clear_status: cleanText(result.clear_status),
        value_survives_clear: true,
        result,
        security: securityWall(),
        created_at: new Date().toISOString()
      };
    }

    function explain(result) {
      const flow = flowModule();

      if (flow && typeof flow.explain === "function" && result && result.result) {
        return flow.explain(result.result);
      }

      if (result && result.status === "not_ready") {
        return "CyberCrowd Core function is not ready. Missing: " + (result.missing || []).join(", ");
      }

      if (result && result.status === "not_lost") {
        return "CyberCrowd Core matched the found item. CLEAR removes the temporary trail and value remains.";
      }

      if (result && result.status === "working_signal") {
        return "CyberCrowd Core created working memory fuel. The trail is clearable and value remains.";
      }

      return "CyberCrowd Core function is local, clearable, and security-bound.";
    }

    return {
      ref: CORE_REF,
      ready,
      found,
      explain,
      security: securityWall
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CyberCrowdCoreFunction;
  }

  if (typeof window !== "undefined") {
    window.CyberCrowdCoreFunction = CyberCrowdCoreFunction;
  }
})();
