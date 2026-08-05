// core/colosseum/colosseum-proof-arena.js
//
// Lane: core/colosseum/
// Owns: proof by play, before/after state, challenge arena, visible result, resolved state.
// Does Not Own: UI, NET, login, payment, upload, analytics, URLs, routes, tokens, tracking, storage, camera, microphone.
// Receives: local challenge state, local found signal, local before/after result summary.
// Sends To: Turd Ping for object/result signal, Moment for value seed, Secretary for lane order, CLEAR for trail wipe.
// Security: no child tracking, no hidden sync, no analytics, no upload, no account binding, no URL leakage.

(function () {
  "use strict";

  const ColosseumProofArena = (() => {
    function cleanText(value) {
      return String(value || "")
        .replace(/data:image\/[a-z]+;base64,[a-z0-9+/=]+/gi, "[media-redacted]")
        .replace(/data:audio\/[a-z]+;base64,[a-z0-9+/=]+/gi, "[media-redacted]")
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

    function number(value, fallback) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }

      return fallback;
    }

    function createArena(input = {}) {
      const mission = cleanText(input.mission || "prove the result by play");
      const subject = cleanText(input.subject || input.label || input.item || "local challenge");

      return {
        organ: "COLOSSEUM",
        lane: "core/colosseum",
        kind: "proof_arena",
        arena_id: makeId("colosseum.arena"),
        subject,
        mission,
        proof_mode: "local_summary_only",
        before_state: "not_started",
        after_state: "not_resolved",
        resolved: false,
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: ["core/turd-ping", "core/secretary", "core/clear"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false,
          raw_media_retained: false
        },
        created_at: new Date().toISOString()
      };
    }

    function markBefore(input = {}) {
      const arena = input.arena_id ? input : createArena(input);

      return {
        organ: "COLOSSEUM",
        lane: "core/colosseum",
        kind: "before_proof",
        arena_id: cleanText(arena.arena_id),
        subject: cleanText(arena.subject || input.subject || input.label || "local challenge"),
        before_state: cleanText(input.before_state || "before captured locally"),
        proof_summary: cleanText(input.proof_summary || "before state exists"),
        raw_media_retained: false,
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: ["core/turd-ping", "core/secretary"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false,
          raw_media_retained: false
        },
        created_at: new Date().toISOString()
      };
    }

    function markFound(input = {}) {
      const arenaId = cleanText(input.arena_id || makeId("colosseum.arena"));
      const label = cleanText(input.label || input.item || input.object || "object");
      const count = number(input.count || input.found_count, 1);

      return {
        organ: "COLOSSEUM",
        lane: "core/colosseum",
        kind: "found_proof",
        arena_id: arenaId,
        label,
        found_count: count,
        proof_summary: cleanText(input.proof_summary || (label + " found")),
        raw_media_retained: false,
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: ["core/turd-ping", "core/dewey", "core/secretary"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false,
          raw_media_retained: false
        },
        created_at: new Date().toISOString()
      };
    }

    function markAfter(input = {}) {
      const arenaId = cleanText(input.arena_id || makeId("colosseum.arena"));
      const subject = cleanText(input.subject || input.label || input.item || "local challenge");

      return {
        organ: "COLOSSEUM",
        lane: "core/colosseum",
        kind: "after_proof",
        arena_id: arenaId,
        subject,
        after_state: cleanText(input.after_state || "after captured locally"),
        proof_summary: cleanText(input.proof_summary || "after state exists"),
        raw_media_retained: false,
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: ["core/turd-ping", "core/moment", "core/secretary", "core/clear"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false,
          raw_media_retained: false
        },
        created_at: new Date().toISOString()
      };
    }

    function resolve(input = {}) {
      const arenaId = cleanText(input.arena_id || makeId("colosseum.arena"));
      const subject = cleanText(input.subject || input.label || input.item || "local challenge");
      const valueStatement = cleanText(
        input.value_statement ||
        input.result ||
        (subject + " resolved by play")
      );

      return {
        organ: "COLOSSEUM",
        lane: "core/colosseum",
        kind: "resolved_proof",
        arena_id: arenaId,
        subject,
        resolved: true,
        proof_summary: valueStatement,
        ownership_value_ready: true,
        raw_media_retained: false,
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: ["core/turd-ping", "core/moment", "core/secretary", "core/clear"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false,
          raw_media_retained: false
        },
        created_at: new Date().toISOString()
      };
    }

    function compare(input = {}) {
      const beforeCount = number(input.before_count, 0);
      const afterCount = number(input.after_count, 0);
      const change = beforeCount - afterCount;
      const improved = change > 0 || bool(input.improved);

      return {
        organ: "COLOSSEUM",
        lane: "core/colosseum",
        kind: "before_after_compare",
        arena_id: cleanText(input.arena_id || makeId("colosseum.arena")),
        subject: cleanText(input.subject || "local challenge"),
        before_count: beforeCount,
        after_count: afterCount,
        change,
        improved,
        status: improved ? "improved" : "no_visible_improvement",
        proof_summary: improved
          ? "before/after proof shows improvement"
          : "before/after proof needs another pass",
        raw_media_retained: false,
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: improved
          ? ["core/turd-ping", "core/moment", "core/secretary", "core/clear"]
          : ["core/biff", "core/secretary", "core/clear"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          account_binding: false,
          url_leakage: false,
          raw_media_retained: false
        },
        created_at: new Date().toISOString()
      };
    }

    function explain(proof) {
      const safeProof = proof || createArena();

      if (safeProof.kind === "resolved_proof") {
        return [
          "Colosseum proved the result by play.",
          "Subject: " + cleanText(safeProof.subject),
          "Value: " + cleanText(safeProof.proof_summary),
          "Next: Turd Ping signals, Moment preserves value, CLEAR wipes the trail."
        ].join(" ");
      }

      if (safeProof.kind === "before_after_compare") {
        return [
          "Colosseum compared before and after.",
          "Status: " + cleanText(safeProof.status),
          "Proof stays local and summary-only."
        ].join(" ");
      }

      return [
        "Colosseum opened the proof arena.",
        "Subject: " + cleanText(safeProof.subject),
        "Mode: local proof by play.",
        "Raw media is not retained."
      ].join(" ");
    }

    return {
      createArena,
      markBefore,
      markFound,
      markAfter,
      resolve,
      compare,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ColosseumProofArena;
  }

  if (typeof window !== "undefined") {
    window.ColosseumProofArena = ColosseumProofArena;
  }
})();
