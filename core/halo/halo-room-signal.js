// core/halo/halo-room-signal.js
// Lane: core/halo/
// Owns: room guide signal, mission framing, next safe action.
// Does Not Own: UI, NET, login, upload, analytics, URLs, routes, tokens, tracking.
// Receives: local room purpose and safe state.
// Sends To: Biff for point check, Secretary for lane order.
// Security: no child tracking, no hidden sync, no analytics, no upload, no URL leakage.

(function () {
  "use strict";

  const HaloRoomSignal = (() => {
    function cleanText(value) {
      return String(value || "")
        .replace(/https?:\/\/\S+/gi, "[url-redacted]")
        .replace(/[?&][a-z0-9_-]+=[^&\s]+/gi, "[query-redacted]")
        .replace(/\s+/g, " ")
        .trim();
    }

    function createSignal(input = {}) {
      const mission = cleanText(input.mission || "Guide the room.");
      const room = cleanText(input.room || "core");
      const nextAction = cleanText(input.next_action || "Ask Biff for the point.");

      return {
        organ: "HALO",
        lane: "core/halo",
        kind: "room_signal",
        room,
        mission,
        next_action: nextAction,
        sends_to: ["core/biff", "core/secretary"],
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

    function explain(signal) {
      const safeSignal = signal || createSignal();

      return [
        "HALO guides the room.",
        "Room: " + cleanText(safeSignal.room),
        "Mission: " + cleanText(safeSignal.mission),
        "Next: " + cleanText(safeSignal.next_action)
      ].join(" ");
    }

    return {
      createSignal,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = HaloRoomSignal;
  }

  if (typeof window !== "undefined") {
    window.HaloRoomSignal = HaloRoomSignal;
  }
})();
