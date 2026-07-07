// core/cybercrowd-core-flow.js
// Lane: core/
// Owns: local CyberCrowd Core choreography across organs.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage.
// Receives: local found/result input, optional expected home/lane, optional authority-ready summary.
// Sends To: HALO, Biff, Dewey, Turd Ping, Secretary, Physics, Octopus, Colosseum, Moment, CLEAR.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const CyberCrowdCoreFlow = (() => {
    const moduleMap = {
      HaloRoomSignal: "./halo/halo-room-signal.js",
      BiffPointCheck: "./biff/biff-point-check.js",
      SecretaryLaneOrder: "./secretary/secretary-lane-order.js",
      DeweyFoundMatch: "./dewey/dewey-found-match.js",
      TurdPingSignal: "./turd-ping/turd-ping-signal.js",
      OctopusPingRoute: "./octopus/octopus-ping-route.js",
      ColosseumProofArena: "./colosseum/colosseum-proof-arena.js",
      ClearTrailWipe: "./clear/clear-trail-wipe.js",
      IdentityAuthorityContext: "./identity/identity-authority-context.js",
      MomentMemorySeed: "./moment/moment-memory-seed.js",
      PhysicsMovementLaw: "./physics/physics-movement-law.js"
    };

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

    function loadLocal(globalName) {
      if (typeof window !== "undefined" && window[globalName]) {
        return window[globalName];
      }

      if (typeof require === "function" && moduleMap[globalName]) {
        try {
          return require(moduleMap[globalName]);
        } catch (error) {
          return null;
        }
      }

      return null;
    }

    function organs() {
      return {
        halo: loadLocal("HaloRoomSignal"),
        biff: loadLocal("BiffPointCheck"),
        secretary: loadLocal("SecretaryLaneOrder"),
        dewey: loadLocal("DeweyFoundMatch"),
        turdPing: loadLocal("TurdPingSignal"),
        octopus: loadLocal("OctopusPingRoute"),
        colosseum: loadLocal("ColosseumProofArena"),
        clear: loadLocal("ClearTrailWipe"),
        identity: loadLocal("IdentityAuthorityContext"),
        moment: loadLocal("MomentMemorySeed"),
        physics: loadLocal("PhysicsMovementLaw")
      };
    }

    function missingOrgans(loaded) {
      return Object.keys(loaded).filter(function (key) {
        return !loaded[key];
      });
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

    function fail(reason, loaded) {
      return {
        organ: "CORE",
        lane: "core",
        kind: "core_flow_result",
        status: "blocked",
        ready: false,
        reason: cleanText(reason),
        missing: missingOrgans(loaded || organs()),
        security: securityWall(),
        created_at: new Date().toISOString()
      };
    }

    function runFoundFlow(input = {}) {
      const loaded = organs();
      const missing = missingOrgans(loaded);

      if (missing.length) {
        return fail("missing core organs", loaded);
      }

      const label = cleanText(
        input.label ||
        input.item ||
        input.object ||
        "found object"
      );

      const mission = cleanText(
        input.mission ||
        "Find the thing, match the thing, preserve value, clear the trail."
      );

      const point = cleanText(
        input.point ||
        input.purpose ||
        "Match the found item to its home, recipient, or lane."
      );

      const expectedHome = cleanText(input.expected_home || input.target_home || "");
      const expectedLane = cleanText(input.expected_lane || input.target_lane || "");
      const lostRecipient = cleanText(input.lost_recipient || input.recipient || "");

      const steps = [];

      const halo = loaded.halo.createSignal({
        room: "core",
        mission: mission,
        next_action: "Ask Biff for the point."
      });
      steps.push(halo);

      const biff = loaded.biff.check({
        room: halo.room,
        subject: label,
        point: point
      });
      steps.push(biff);

      if (!biff.allowed_to_move) {
        const cleared = loaded.clear.wipe({
          label: label,
          reason: "Biff found no point.",
          point_missing: true,
          temporary_trail: true
        });

        steps.push(cleared);

        return {
          organ: "CORE",
          lane: "core",
          kind: "core_flow_result",
          status: "stopped",
          reason: "missing point",
          value_statement: cleanText(cleared.preserved_value && cleared.preserved_value.value_statement),
          steps: steps,
          security: securityWall(),
          created_at: new Date().toISOString()
        };
      }

      const dewey = loaded.dewey.match({
        label: label,
        expected_home: expectedHome,
        expected_lane: expectedLane,
        lost_recipient: lostRecipient
      });
      steps.push(dewey);

      const turdPing = loaded.turdPing.fromDewey(dewey);
      steps.push(turdPing);

      const colosseum = dewey.matched
        ? loaded.colosseum.resolve({
            label: label,
            value_statement: label + " is not lost."
          })
        : loaded.colosseum.markFound({
            label: label,
            proof_summary: label + " found and waiting for match."
          });

      steps.push(colosseum);

      const moment = loaded.moment.createSeed({
        label: label,
        source_kind: "turd_ping",
        value_statement: dewey.matched
          ? label + " matched and became not lost."
          : label + " found as working signal.",
        suggested_home: dewey.suggested_home,
        suggested_lane: dewey.suggested_lane,
        matched: dewey.matched,
        parent_authority_ready: bool(input.parent_authority_ready),
        payment_ready: bool(input.payment_ready)
      });

      steps.push(moment);

      const identity = loaded.identity.createContext({
        parent_authority_ready: bool(input.parent_authority_ready),
        payment_ready: bool(input.payment_ready),
        memory_ready: moment.status === "value_ready",
        value_statement: moment.value_statement
      });

      steps.push(identity);

      const physics = loaded.physics.check({
        subject: label,
        movement: dewey.matched ? "preserve_value" : "classify",
        state: dewey.matched ? "matched" : "classified",
        child_tracking: false,
        hidden_sync: false,
        analytics: false,
        upload: false,
        account_binding: false,
        url_leakage: false
      });

      steps.push(physics);

      const secretary = loaded.secretary.order({
        from_lane: "core/dewey",
        to_lane: dewey.matched ? "core/moment" : "core/dewey",
        subject: label,
        point_status: biff.status,
        allowed_to_move: biff.allowed_to_move && physics.allowed,
        requires_authority: bool(input.requires_authority),
        child_tracking: false,
        hidden_sync: false,
        analytics: false,
        upload_requested: false,
        account_binding: false,
        url_leakage: false
      });

      steps.push(secretary);

      const octopus = loaded.octopus.fromSecretary(secretary, moment);
      steps.push(octopus);

      const clear = input.clear_after === false
        ? loaded.clear.process({
            label: label,
            status: "value_ready",
            temporary_trail: false
          })
        : loaded.clear.wipe({
            label: label,
            value_statement: moment.value_statement,
            matched: dewey.matched,
            dewey_home: dewey.suggested_home,
            dewey_lane: dewey.suggested_lane,
            temporary_trail: true,
            resolved: dewey.matched
          });

      steps.push(clear);

      return {
        organ: "CORE",
        lane: "core",
        kind: "core_flow_result",
        status: dewey.matched ? "not_lost" : "working_signal",
        label: label,
        matched: dewey.matched,
        value_statement: cleanText(moment.value_statement),
        ownership_state: cleanText(moment.ownership_state),
        clear_status: cleanText(clear.kind),
        value_survives_clear: true,
        steps: steps,
        security: securityWall(),
        created_at: new Date().toISOString()
      };
    }

    function explain(result) {
      const safeResult = result || runFoundFlow();

      if (safeResult.status === "not_lost") {
        return [
          "CyberCrowd Core matched the found signal.",
          "Item: " + cleanText(safeResult.label),
          "Value: " + cleanText(safeResult.value_statement),
          "CLEAR removed the temporary trail.",
          "Value remains."
        ].join(" ");
      }

      if (safeResult.status === "working_signal") {
        return [
          "CyberCrowd Core created working memory fuel.",
          "Item: " + cleanText(safeResult.label),
          "The item is found but not matched yet.",
          "Temporary trail is clearable."
        ].join(" ");
      }

      return [
        "CyberCrowd Core stopped the flow.",
        "Reason: " + cleanText(safeResult.reason),
        "No unsafe movement happened."
      ].join(" ");
    }

    return {
      runFoundFlow,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CyberCrowdCoreFlow;
  }

  if (typeof window !== "undefined") {
    window.CyberCrowdCoreFlow = CyberCrowdCoreFlow;
  }
})();
