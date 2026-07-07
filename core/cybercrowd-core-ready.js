// core/cybercrowd-core-ready.js
// Lane: core/
// Owns: local Core readiness check.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage.
// Receives: local CyberCrowdCore registry and local Core organ modules.
// Sends To: local readiness result only.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const CyberCrowdCoreReady = (() => {
    const requiredOrgans = [
      {
        organ: "HALO",
        lane: "core/halo",
        globalName: "HaloRoomSignal",
        modulePath: "./halo/halo-room-signal.js"
      },
      {
        organ: "BIFF",
        lane: "core/biff",
        globalName: "BiffPointCheck",
        modulePath: "./biff/biff-point-check.js"
      },
      {
        organ: "SECRETARY",
        lane: "core/secretary",
        globalName: "SecretaryLaneOrder",
        modulePath: "./secretary/secretary-lane-order.js"
      },
      {
        organ: "DEWEY",
        lane: "core/dewey",
        globalName: "DeweyFoundMatch",
        modulePath: "./dewey/dewey-found-match.js"
      },
      {
        organ: "TURD_PING",
        lane: "core/turd-ping",
        globalName: "TurdPingSignal",
        modulePath: "./turd-ping/turd-ping-signal.js"
      },
      {
        organ: "OCTOPUS",
        lane: "core/octopus",
        globalName: "OctopusPingRoute",
        modulePath: "./octopus/octopus-ping-route.js"
      },
      {
        organ: "COLOSSEUM",
        lane: "core/colosseum",
        globalName: "ColosseumProofArena",
        modulePath: "./colosseum/colosseum-proof-arena.js"
      },
      {
        organ: "CLEAR",
        lane: "core/clear",
        globalName: "ClearTrailWipe",
        modulePath: "./clear/clear-trail-wipe.js"
      },
      {
        organ: "IDENTITY",
        lane: "core/identity",
        globalName: "IdentityAuthorityContext",
        modulePath: "./identity/identity-authority-context.js"
      },
      {
        organ: "MOMENT",
        lane: "core/moment",
        globalName: "MomentMemorySeed",
        modulePath: "./moment/moment-memory-seed.js"
      },
      {
        organ: "PHYSICS",
        lane: "core/physics",
        globalName: "PhysicsMovementLaw",
        modulePath: "./physics/physics-movement-law.js"
      }
    ];

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

    function hasBrowserGlobal(globalName) {
      return typeof window !== "undefined" && Boolean(window[globalName]);
    }

    function hasNodeModule(modulePath) {
      if (typeof require !== "function") {
        return false;
      }

      try {
        return Boolean(require(modulePath));
      } catch (error) {
        return false;
      }
    }

    function checkOrgan(definition) {
      const available =
        hasBrowserGlobal(definition.globalName) ||
        hasNodeModule(definition.modulePath);

      return {
        organ: definition.organ,
        lane: definition.lane,
        available: available
      };
    }

    function run() {
      const organs = requiredOrgans.map(checkOrgan);

      const missing = organs
        .filter(function (entry) {
          return !entry.available;
        })
        .map(function (entry) {
          return entry.organ;
        });

      return {
        organ: "CORE",
        lane: "core",
        kind: "core_ready_check",
        ref: "CC-CORE-SYS-0001",
        ready: missing.length === 0,
        missing: missing,
        organs: organs,
        security: securityWall(),
        checked_at: new Date().toISOString()
      };
    }

    function explain(result) {
      const readyResult = result || run();

      if (readyResult.ready) {
        return "CyberCrowd Core is ready. All required organs are locally available.";
      }

      return "CyberCrowd Core is not ready. Missing: " + readyResult.missing.join(", ");
    }

    return {
      run,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CyberCrowdCoreReady;
  }

  if (typeof window !== "undefined") {
    window.CyberCrowdCoreReady = CyberCrowdCoreReady;
  }
})();
