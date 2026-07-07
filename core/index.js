// core/index.js
// Lane: core/
// Owns: single local CyberCrowd Core entry point.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage.
// Receives: local Core modules only.
// Sends To: local Core modules only.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  function loadBrowser(globalName) {
    if (typeof window !== "undefined" && window[globalName]) {
      return window[globalName];
    }

    return null;
  }

  function loadNode(path) {
    if (typeof require !== "function") {
      return null;
    }

    try {
      return require(path);
    } catch (error) {
      return null;
    }
  }

  function load(globalName, path) {
    return loadBrowser(globalName) || loadNode(path);
  }

  const CyberCrowdCoreIndex = {
    ref: "CC-CORE-SYS-0001",

    organs: {
      halo: load("HaloRoomSignal", "./halo/halo-room-signal.js"),
      biff: load("BiffPointCheck", "./biff/biff-point-check.js"),
      secretary: load("SecretaryLaneOrder", "./secretary/secretary-lane-order.js"),
      dewey: load("DeweyFoundMatch", "./dewey/dewey-found-match.js"),
      turdPing: load("TurdPingSignal", "./turd-ping/turd-ping-signal.js"),
      octopus: load("OctopusPingRoute", "./octopus/octopus-ping-route.js"),
      colosseum: load("ColosseumProofArena", "./colosseum/colosseum-proof-arena.js"),
      clear: load("ClearTrailWipe", "./clear/clear-trail-wipe.js"),
      identity: load("IdentityAuthorityContext", "./identity/identity-authority-context.js"),
      moment: load("MomentMemorySeed", "./moment/moment-memory-seed.js"),
      physics: load("PhysicsMovementLaw", "./physics/physics-movement-law.js")
    },

    registry: load("CyberCrowdCore", "./cybercrowd-core.js"),
    ready: load("CyberCrowdCoreReady", "./cybercrowd-core-ready.js"),
    flow: load("CyberCrowdCoreFlow", "./cybercrowd-core-flow.js"),
    function: load("CyberCrowdCoreFunction", "./cybercrowd-core-function.js"),
    proof: load("CyberCrowdCoreProof", "./cybercrowd-core-proof.js"),

    describe: function () {
      return {
        name: "CyberCrowd Core",
        ref: "CC-CORE-SYS-0001",
        rule: "CyberCrowd Core preserves truth. CyberCrowd delivers service.",
        entry: "core/index.js",
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false,
          crawler_map: false,
          phishing_guide: false,
          bot_invitation: false
        }
      };
    },

    status: function () {
      const organKeys = Object.keys(CyberCrowdCoreIndex.organs);

      const organs = organKeys.map(function (key) {
        return {
          key: key,
          available: Boolean(CyberCrowdCoreIndex.organs[key])
        };
      });

      const missing = organs
        .filter(function (entry) {
          return !entry.available;
        })
        .map(function (entry) {
          return entry.key;
        });

      return {
        ref: "CC-CORE-SYS-0001",
        ready: missing.length === 0 &&
          Boolean(CyberCrowdCoreIndex.registry) &&
          Boolean(CyberCrowdCoreIndex.ready) &&
          Boolean(CyberCrowdCoreIndex.flow) &&
          Boolean(CyberCrowdCoreIndex.function) &&
          Boolean(CyberCrowdCoreIndex.proof),
        missing: missing,
        organs: organs,
        registry_available: Boolean(CyberCrowdCoreIndex.registry),
        ready_check_available: Boolean(CyberCrowdCoreIndex.ready),
        flow_available: Boolean(CyberCrowdCoreIndex.flow),
        function_available: Boolean(CyberCrowdCoreIndex.function),
        proof_available: Boolean(CyberCrowdCoreIndex.proof),
        checked_at: new Date().toISOString()
      };
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CyberCrowdCoreIndex;
  }

  if (typeof window !== "undefined") {
    window.CyberCrowdCoreIndex = CyberCrowdCoreIndex;
  }
})();
