// core/cybercrowd-core-proof.js
// Lane: core/
// Owns: local Core proof that the CyberCrowd function can run one found/match flow.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage.
// Receives: local CyberCrowdCoreFunction only.
// Sends To: local proof result only.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const CyberCrowdCoreProof = (() => {
    function loadCoreFunction() {
      if (typeof window !== "undefined" && window.CyberCrowdCoreFunction) {
        return window.CyberCrowdCoreFunction;
      }

      if (typeof require === "function") {
        try {
          return require("./cybercrowd-core-function.js");
        } catch (error) {
          return null;
        }
      }

      return null;
    }

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

    function notReady(reason) {
      return {
        organ: "CORE",
        lane: "core",
        kind: "core_proof_result",
        passed: false,
        status: "not_ready",
        reason: cleanText(reason),
        security: securityWall(),
        created_at: new Date().toISOString()
      };
    }

    function proveFoundMatch() {
      const coreFunction = loadCoreFunction();

      if (!coreFunction || typeof coreFunction.found !== "function") {
        return notReady("CyberCrowdCoreFunction is not loaded");
      }

      const result = coreFunction.found({
        label: "shirt",
        mission: "Find the thing, match the thing, preserve value, clear the trail.",
        point: "Match the found item to its home.",
        expected_home: "laundry",
        expected_lane: "cleanup",
        lost_recipient: "laundry",
        parent_authority_ready: false,
        payment_ready: false,
        requires_authority: false,
        clear_after: true
      });

      const passed =
        result &&
        result.ready === true &&
        result.status === "not_lost" &&
        result.matched === true &&
        result.value_survives_clear === true &&
        result.security &&
        result.security.child_tracking === false &&
        result.security.upload === false &&
        result.security.analytics === false &&
        result.security.url_leakage === false;

      return {
        organ: "CORE",
        lane: "core",
        kind: "core_proof_result",
        proof_name: "found_match_clear_value",
        passed: passed,
        status: passed ? "passed" : "failed",
        expected: "shirt matches laundry, trail clears, value remains",
        result: result,
        security: securityWall(),
        created_at: new Date().toISOString()
      };
    }

    function proveWorkingSignal() {
      const coreFunction = loadCoreFunction();

      if (!coreFunction || typeof coreFunction.found !== "function") {
        return notReady("CyberCrowdCoreFunction is not loaded");
      }

      const result = coreFunction.found({
        label: "mystery object",
        mission: "Find the thing without forcing a match.",
        point: "Create working memory fuel until the item is matched.",
        expected_home: "",
        expected_lane: "",
        lost_recipient: "",
        parent_authority_ready: false,
        payment_ready: false,
        requires_authority: false,
        clear_after: true
      });

      const passed =
        result &&
        result.ready === true &&
        result.status === "working_signal" &&
        result.matched === false &&
        result.value_survives_clear === true &&
        result.security &&
        result.security.child_tracking === false &&
        result.security.upload === false &&
        result.security.analytics === false &&
        result.security.url_leakage === false;

      return {
        organ: "CORE",
        lane: "core",
        kind: "core_proof_result",
        proof_name: "working_signal_clear_value",
        passed: passed,
        status: passed ? "passed" : "failed",
        expected: "unmatched object becomes clearable working memory fuel",
        result: result,
        security: securityWall(),
        created_at: new Date().toISOString()
      };
    }

    function run() {
      const foundMatch = proveFoundMatch();
      const workingSignal = proveWorkingSignal();

      const passed = Boolean(foundMatch.passed && workingSignal.passed);

      return {
        organ: "CORE",
        lane: "core",
        kind: "core_proof_suite",
        passed: passed,
        status: passed ? "passed" : "failed",
        proofs: [foundMatch, workingSignal],
        security: securityWall(),
        created_at: new Date().toISOString()
      };
    }

    function explain(result) {
      const proof = result || run();

      if (proof.passed) {
        return "CyberCrowd Core proof passed. Found items can match, unmatched items become working memory fuel, CLEAR removes temporary trails, and value remains.";
      }

      return "CyberCrowd Core proof failed. Check the local Core function and organ availability.";
    }

    return {
      run,
      proveFoundMatch,
      proveWorkingSignal,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CyberCrowdCoreProof;
  }

  if (typeof window !== "undefined") {
    window.CyberCrowdCoreProof = CyberCrowdCoreProof;
  }
})();
