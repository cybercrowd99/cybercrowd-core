// core/dewey/dewey-found-match.js
//
// Lane: core/dewey/
// Owns: found/lost classification, object type, home match, recipient match, lane match.
// Does Not Own: UI, NET, login, upload, analytics, URLs, routes, tokens, tracking, transport.
// Receives: local found signal, object label, optional lost recipient/home/lane hint.
// Sends To: Secretary for movement permission, Octopus only after Secretary approves.
// Security: no child tracking, no hidden sync, no analytics, no upload, no URL leakage.

(function () {
  "use strict";

  const DeweyFoundMatch = (() => {
    const homeRules = [
      {
        match: ["shirt", "t-shirt", "tee shirt", "pants", "sock", "socks", "pajamas", "towel", "clothes", "laundry"],
        object_type: "clothing",
        home: "laundry",
        lane: "cleanup"
      },
      {
        match: ["toy", "truck", "car", "train", "doll", "bear", "stuffie", "blocks"],
        object_type: "toy",
        home: "toy bin",
        lane: "cleanup"
      },
      {
        match: ["book", "books", "paper", "notebook"],
        object_type: "book",
        home: "shelf",
        lane: "cleanup"
      },
      {
        match: ["cup", "plate", "spoon", "fork", "bowl", "dish"],
        object_type: "dish",
        home: "kitchen",
        lane: "cleanup"
      },
      {
        match: ["trash", "garbage", "wrapper", "crumbs"],
        object_type: "trash",
        home: "trash can",
        lane: "cleanup"
      },
      {
        match: ["phone", "tablet"],
        object_type: "device",
        home: "approved device lane",
        lane: "device"
      },
      {
        match: ["laptop", "computer", "desktop"],
        object_type: "device",
        home: "approved device lane",
        lane: "device"
      },
      {
        match: ["key", "keys"],
        object_type: "key",
        home: "owner lane",
        lane: "lost-found"
      },
      {
        match: ["receipt", "card", "ticket"],
        object_type: "record",
        home: "record lane",
        lane: "lost-found"
      }
    ];

    function cleanText(value) {
      return String(value || "")
        .replace(/https?:\/\/\S+/gi, "[url-redacted]")
        .replace(/[?&][a-z0-9_-]+=[^&\s]+/gi, "[query-redacted]")
        .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[contact-redacted]")
        .replace(/\s+/g, " ")
        .trim();
    }

    function normalize(value) {
      return cleanText(value)
        .toLowerCase()
        .replace(/[’']/g, "")
        .replace(/[^a-z0-9\s-]/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function findRule(label) {
      const text = normalize(label);

      if (!text) {
        return null;
      }

      for (let i = 0; i < homeRules.length; i += 1) {
        const rule = homeRules[i];

        for (let j = 0; j < rule.match.length; j += 1) {
          const word = normalize(rule.match[j]);

          if (text === word || text.includes(word)) {
            return rule;
          }
        }
      }

      return null;
    }

    function cleanHint(value, fallback) {
      const cleaned = cleanText(value);

      if (cleaned) {
        return cleaned;
      }

      return fallback;
    }

    function classify(input = {}) {
      const label = cleanText(input.label || input.item || input.object || "");
      const foundState = cleanText(input.found_state || "found");
      const rule = findRule(label);

      const objectType = cleanHint(input.object_type, rule ? rule.object_type : "object");
      const home = cleanHint(input.home, rule ? rule.home : "home spot");
      const lane = cleanHint(input.lane, rule ? rule.lane : "lost-found");

      return {
        organ: "DEWEY",
        lane: "core/dewey",
        kind: "found_classification",
        found_state: foundState,
        label: label || "unknown object",
        object_type: objectType,
        suggested_home: home,
        suggested_lane: lane,
        status: label ? "classified" : "needs_label",
        matched: false,
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

    function match(input = {}) {
      const classified = classify(input);

      const lostRecipient = cleanText(
        input.lost_recipient ||
        input.recipient ||
        input.owner_hint ||
        input.home_hint ||
        ""
      );

      const expectedHome = cleanText(input.expected_home || input.target_home || "");
      const expectedLane = cleanText(input.expected_lane || input.target_lane || "");

      const homeMatch = Boolean(
        expectedHome &&
        normalize(expectedHome) === normalize(classified.suggested_home)
      );

      const laneMatch = Boolean(
        expectedLane &&
        normalize(expectedLane) === normalize(classified.suggested_lane)
      );

      const recipientMatch = Boolean(lostRecipient && (homeMatch || laneMatch));

      const matched = Boolean(homeMatch || laneMatch || recipientMatch);

      return {
        organ: "DEWEY",
        lane: "core/dewey",
        kind: "found_lost_match",
        label: classified.label,
        object_type: classified.object_type,
        suggested_home: classified.suggested_home,
        suggested_lane: classified.suggested_lane,
        lost_recipient: lostRecipient || "not provided",
        matched,
        status: matched ? "not_lost" : "still_lost",
        reason: matched
          ? "found item matched recipient, home, or lane"
          : "found item has not matched a recipient, home, or lane yet",
        sends_to: ["core/secretary"],
        security: classified.security,
        created_at: new Date().toISOString()
      };
    }

    function explain(result) {
      const safeResult = result || classify();

      if (safeResult.kind === "found_lost_match") {
        if (safeResult.matched) {
          return [
            "Dewey matched the found item.",
            "Item: " + cleanText(safeResult.label),
            "Home: " + cleanText(safeResult.suggested_home),
            "Status: not lost.",
            "Next: Secretary checks movement."
          ].join(" ");
        }

        return [
          "Dewey classified the found item.",
          "Item: " + cleanText(safeResult.label),
          "Suggested home: " + cleanText(safeResult.suggested_home),
          "Status: still lost.",
          "Next: Secretary decides what is allowed."
        ].join(" ");
      }

      return [
        "Dewey classified the signal.",
        "Item: " + cleanText(safeResult.label),
        "Type: " + cleanText(safeResult.object_type),
        "Home: " + cleanText(safeResult.suggested_home),
        "Next: Secretary checks movement."
      ].join(" ");
    }

    return {
      classify,
      match,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = DeweyFoundMatch;
  }

  if (typeof window !== "undefined") {
    window.DeweyFoundMatch = DeweyFoundMatch;
  }
})();
