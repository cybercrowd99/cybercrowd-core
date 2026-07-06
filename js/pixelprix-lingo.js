// js/pixelprix-lingo.js
// PixelPrix Core — Lingo Layer
// Owns: translated words, Dewey bucket hints, local object pings, multilingual cleanup labels.
// Does not own: HTML layout, camera permission, camera capture, mic recording, songs, NET, uploads, sync, accounts, analytics, or child profiles.
// Rule: Words can travel. Kids do not. Object pings stay local unless a later NET lane is explicitly built.

(function () {
  "use strict";

  const LINGO_KEY = "pixelprixLingoLabels.v1";
  const PING_KEY = "pixelprixObjectPings.v1";
  const MAX_PINGS = 100;

  const LANGS = {
    es: {
      label: "Spanish",
      short: "ES",
      speech: "es-ES"
    },
    fr: {
      label: "French",
      short: "FR",
      speech: "fr-FR"
    }
  };

  const DICTIONARY = [
    {
      words: ["shirt", "t-shirt", "tee shirt", "shurt"],
      dewey: "clothing",
      home: "laundry",
      translated: { es: "camisa", fr: "chemise" }
    },
    {
      words: ["pants", "jeans", "shorts"],
      dewey: "clothing",
      home: "laundry",
      translated: { es: "pantalones", fr: "pantalon" }
    },
    {
      words: ["sock", "socks"],
      dewey: "clothing",
      home: "laundry",
      translated: { es: "calcetín", fr: "chaussette" }
    },
    {
      words: ["shoe", "shoes", "sneaker", "sneakers"],
      dewey: "clothing",
      home: "shoe spot",
      translated: { es: "zapato", fr: "chaussure" }
    },
    {
      words: ["toy", "toys"],
      dewey: "toy",
      home: "toy bin",
      translated: { es: "juguete", fr: "jouet" }
    },
    {
      words: ["truck", "car", "train"],
      dewey: "toy vehicle",
      home: "toy bin",
      translated: { es: "camión", fr: "camion" }
    },
    {
      words: ["doll", "bear", "teddy", "teddy bear", "stuffie", "stuffed animal"],
      dewey: "soft toy",
      home: "bed or toy bin",
      translated: { es: "peluche", fr: "peluche" }
    },
    {
      words: ["book", "books"],
      dewey: "book",
      home: "shelf",
      translated: { es: "libro", fr: "livre" }
    },
    {
      words: ["cup", "cups"],
      dewey: "dish",
      home: "kitchen",
      translated: { es: "vaso", fr: "verre" }
    },
    {
      words: ["plate", "plates"],
      dewey: "dish",
      home: "kitchen",
      translated: { es: "plato", fr: "assiette" }
    },
    {
      words: ["spoon", "fork"],
      dewey: "utensil",
      home: "kitchen",
      translated: { es: "cuchara", fr: "cuillère" }
    },
    {
      words: ["trash", "garbage", "wrapper"],
      dewey: "trash",
      home: "trash can",
      translated: { es: "basura", fr: "déchet" }
    },
    {
      words: ["blanket", "blankie"],
      dewey: "blanket",
      home: "bed",
      translated: { es: "manta", fr: "couverture" }
    },
    {
      words: ["pillow"],
      dewey: "pillow",
      home: "bed",
      translated: { es: "almohada", fr: "oreiller" }
    },
    {
      words: ["pajamas", "pj", "pjs"],
      dewey: "bedtime clothing",
      home: "dresser or laundry",
      translated: { es: "pijama", fr: "pyjama" }
    },
    {
      words: ["towel"],
      dewey: "bath item",
      home: "bathroom or laundry",
      translated: { es: "toalla", fr: "serviette" }
    }
  ];

  const state = {
    labels: {},
    pings: [],
    activeTreasureNumber: 0,
    lastCleanupNumber: 0,
    lastDescribeSignature: ""
  };

  const dom = {
    panel: null,
    thumbs: null,
    prompt: null,
    helper: null,
    secondButton: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function readDom() {
    dom.panel = document.querySelector(".panel");
    dom.thumbs = byId("thumbs");
    dom.prompt = byId("prompt");
    dom.helper = byId("helper");
    dom.secondButton = byId("second-button");
  }

  function textOf(node) {
    return node && node.textContent ? node.textContent.trim() : "";
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function countTreasurePictures() {
    if (!dom.thumbs) {
      return 0;
    }

    return dom.thumbs.querySelectorAll("img").length;
  }

  function cleanupNumberFromPrompt() {
    const text = [
      textOf(dom.prompt),
      textOf(dom.helper)
    ].join(" ");

    const match = text.match(/treasure\s+(\d+)/i);

    if (!match) {
      return 0;
    }

    return Number(match[1]) || 0;
  }

  function loadLocal() {
    try {
      state.labels = JSON.parse(localStorage.getItem(LINGO_KEY) || "{}") || {};
    } catch (error) {
      state.labels = {};
    }

    try {
      state.pings = JSON.parse(localStorage.getItem(PING_KEY) || "[]") || [];
    } catch (error) {
      state.pings = [];
    }
  }

  function saveLabels() {
    try {
      localStorage.setItem(LINGO_KEY, JSON.stringify(state.labels));
      return true;
    } catch (error) {
      return false;
    }
  }

  function savePings() {
    try {
      localStorage.setItem(PING_KEY, JSON.stringify(state.pings.slice(-MAX_PINGS)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearLingo() {
    state.labels = {};
    state.pings = [];
    saveLabels();
    savePings();

    removeLingoCard();
    removeCleanupLingo();

    if (dom.helper) {
      dom.helper.textContent = "Words and local object pings cleared on this device.";
    }
  }

  function addPing(action, treasureNumber, payload) {
    const ping = {
      ping_id: "pixelprix.object." + Date.now() + "." + Math.random().toString(36).slice(2, 8),
      action: action,
      treasure_number: treasureNumber,
      item_name: payload.item_name || "",
      phonics: payload.phonics || "",
      translated: payload.translated || {},
      dewey: payload.dewey || "object",
      home: payload.home || "home spot",
      local_only: true,
      created_at: new Date().toISOString()
    };

    state.pings.push(ping);

    if (state.pings.length > MAX_PINGS) {
      state.pings = state.pings.slice(-MAX_PINGS);
    }

    savePings();

    return ping;
  }

  function findDictionaryMatch(itemName) {
    const clean = normalize(itemName);

    if (!clean) {
      return null;
    }

    for (let i = 0; i < DICTIONARY.length; i += 1) {
      const entry = DICTIONARY[i];

      for (let j = 0; j < entry.words.length; j += 1) {
        if (clean === normalize(entry.words[j])) {
          return entry;
        }
      }
    }

    for (let i = 0; i < DICTIONARY.length; i += 1) {
      const entry = DICTIONARY[i];

      for (let j = 0; j < entry.words.length; j += 1) {
        const word = normalize(entry.words[j]);

        if (word && clean.indexOf(word) !== -1) {
          return entry;
        }
      }
    }

    return null;
  }

  function makeLingo(itemName, phonics) {
    const found = findDictionaryMatch(itemName || phonics);

    if (found) {
      return {
        item_name: itemName || found.words[0],
        phonics: phonics || "",
        dewey: found.dewey,
        home: found.home,
        translated: Object.assign({}, found.translated),
        known: true
      };
    }

    return {
      item_name: itemName || "",
      phonics: phonics || "",
      dewey: "object",
      home: "home spot",
      translated: {},
      known: false
    };
  }

  function getInputs() {
    return {
      name: byId("pixelprix-item-name"),
      phonics: byId("pixelprix-item-phonics")
    };
  }

  function activeTreasureNumber() {
    const count = countTreasurePictures();

    if (state.activeTreasureNumber) {
      return state.activeTreasureNumber;
    }

    state.activeTreasureNumber = count || 1;
    return state.activeTreasureNumber;
  }

  function labelFor(treasureNumber) {
    return state.labels[String(treasureNumber)] || null;
  }

  function injectStyle() {
    if (byId("pixelprix-lingo-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pixelprix-lingo-style";
    style.textContent = `
      .pixelprix-lingo-card,
      .pixelprix-cleanup-lingo {
        margin-top: 10px;
        padding: 12px;
        border-radius: 22px;
        background: rgba(5, 6, 10, 0.82);
        border: 2px solid rgba(255, 255, 255, 0.22);
        color: #fff7df;
        text-align: center;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
      }

      .pixelprix-lingo-card h3,
      .pixelprix-cleanup-lingo h3 {
        margin: 0 0 7px;
        color: #ffd34d;
        font-size: clamp(1.1rem, 4.8vw, 1.8rem);
        line-height: 1;
        text-shadow: 0 3px 0 #000;
      }

      .pixelprix-lingo-line {
        margin: 5px 0;
        color: #fff7df;
        font-size: clamp(0.95rem, 3.7vw, 1.1rem);
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-lingo-pill-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
        margin-top: 9px;
      }

      .pixelprix-lingo-pill,
      .pixelprix-lingo-action {
        min-height: 48px;
        border: 0;
        border-radius: 999px;
        padding: 8px 10px;
        color: #050505;
        font: inherit;
        font-size: 0.92rem;
        font-weight: 900;
        cursor: pointer;
        background: #7bd4ff;
        box-shadow: 0 5px 0 rgba(0, 0, 0, 0.55);
        touch-action: manipulation;
      }

      .pixelprix-lingo-pill.es {
        background: #6dff91;
      }

      .pixelprix-lingo-pill.fr {
        background: #c79cff;
      }

      .pixelprix-lingo-action {
        background: #ffd34d;
      }

      .pixelprix-lingo-pill:active,
      .pixelprix-lingo-action:active {
        transform: translateY(4px);
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.55);
      }

      .pixelprix-lingo-status {
        min-height: 20px;
        margin-top: 8px;
        color: rgba(255, 247, 223, 0.9);
        font-size: 0.9rem;
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-cleanup-lingo strong {
        color: #6dff91;
      }

      @media (max-width: 420px) {
        .pixelprix-lingo-pill-row {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function removeLingoCard() {
    const card = byId("pixelprix-lingo-card");

    if (card) {
      card.remove();
    }

    state.activeTreasureNumber = 0;
    state.lastDescribeSignature = "";
  }

  function removeCleanupLingo() {
    const card = byId("pixelprix-cleanup-lingo");

    if (card) {
      card.remove();
    }
  }

  function setLingoStatus(text) {
    const status = byId("pixelprix-lingo-status");

    if (status) {
      status.textContent = text;
    }
  }

  function describeCardExists() {
    return Boolean(byId("pixelprix-describe-card"));
  }

  function showLingoCard() {
    const describeCard = byId("pixelprix-describe-card");

    if (!describeCard) {
      removeLingoCard();
      return;
    }

    const inputs = getInputs();

    if (!inputs.name || !inputs.phonics) {
      return;
    }

    const treasureNumber = activeTreasureNumber();
    const itemName = inputs.name.value || "";
    const phonics = inputs.phonics.value || "";
    const lingo = makeLingo(itemName, phonics);
    const signature = treasureNumber + "|" + itemName + "|" + phonics + "|" + lingo.dewey + "|" + lingo.home;

    if (state.lastDescribeSignature === signature && byId("pixelprix-lingo-card")) {
      updateLingoCardText(lingo);
      return;
    }

    state.lastDescribeSignature = signature;

    let card = byId("pixelprix-lingo-card");

    if (!card) {
      card = document.createElement("section");
      card.id = "pixelprix-lingo-card";
      card.className = "pixelprix-lingo-card";
      describeCard.appendChild(card);
    }

    card.innerHTML = `
      <h3>Biff + Dewey</h3>

      <div class="pixelprix-lingo-line" id="pixelprix-biff-line">
        Biff asks: What is it?
      </div>

      <div class="pixelprix-lingo-line" id="pixelprix-dewey-line">
        Dewey sorts: ${escapeHtml(lingo.dewey)} → ${escapeHtml(lingo.home)}
      </div>

      <div class="pixelprix-lingo-line" id="pixelprix-translate-line">
        ${translationLine(lingo)}
      </div>

      <div class="pixelprix-lingo-pill-row">
        <button class="pixelprix-lingo-pill es" type="button" data-pixelprix-lingo-use="es">
          Use Spanish
        </button>

        <button class="pixelprix-lingo-pill fr" type="button" data-pixelprix-lingo-use="fr">
          Use French
        </button>

        <button class="pixelprix-lingo-action" type="button" id="pixelprix-save-lingo">
          SAVE LINGO
        </button>

        <button class="pixelprix-lingo-action" type="button" id="pixelprix-say-lingo">
          SAY TRANSLATION
        </button>
      </div>

      <div class="pixelprix-lingo-status" id="pixelprix-lingo-status">
        Object words stay on this device.
      </div>
    `;

    hookLingoCardButtons(treasureNumber);
  }

  function updateLingoCardText(lingo) {
    const dewey = byId("pixelprix-dewey-line");
    const translate = byId("pixelprix-translate-line");

    if (dewey) {
      dewey.textContent = "Dewey sorts: " + lingo.dewey + " → " + lingo.home;
    }

    if (translate) {
      translate.textContent = translationLine(lingo);
    }
  }

  function translationLine(lingo) {
    const es = lingo.translated.es || "add later";
    const fr = lingo.translated.fr || "add later";

    return "Translation: ES " + es + " / FR " + fr;
  }

  function hookLingoCardButtons(treasureNumber) {
    document.querySelectorAll("[data-pixelprix-lingo-use]").forEach(function (button) {
      button.addEventListener("click", function () {
        const lang = button.getAttribute("data-pixelprix-lingo-use");
        useTranslation(lang);
      });
    });

    const save = byId("pixelprix-save-lingo");

    if (save) {
      save.addEventListener("click", function () {
        saveCurrentLingo(treasureNumber, "named");
      });
    }

    const say = byId("pixelprix-say-lingo");

    if (say) {
      say.addEventListener("click", function () {
        sayCurrentTranslation();
      });
    }
  }

  function useTranslation(lang) {
    const inputs = getInputs();

    if (!inputs.name || !inputs.phonics) {
      return;
    }

    const lingo = makeLingo(inputs.name.value, inputs.phonics.value);
    const word = lingo.translated[lang] || "";

    if (!word) {
      setLingoStatus("No " + LANGS[lang].label + " word in this local list yet.");
      return;
    }

    inputs.phonics.value = word;
    setLingoStatus("Phonics set to " + LANGS[lang].label + ": " + word);

    inputs.phonics.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function sayCurrentTranslation() {
    const inputs = getInputs();

    if (!inputs.name || !inputs.phonics) {
      return;
    }

    const lingo = makeLingo(inputs.name.value, inputs.phonics.value);
    const word = lingo.translated.es || lingo.translated.fr || inputs.phonics.value || inputs.name.value;

    if (!word) {
      setLingoStatus("Type a word first.");
      return;
    }

    let lang = "en-US";

    if (word === lingo.translated.es) {
      lang = "es-ES";
    } else if (word === lingo.translated.fr) {
      lang = "fr-FR";
    }

    try {
      if (!("speechSynthesis" in window)) {
        setLingoStatus("Speech is not available here.");
        return;
      }

      window.speechSynthesis.cancel();

      const voice = new SpeechSynthesisUtterance(word);
      voice.lang = lang;
      voice.rate = 0.88;
      voice.pitch = 1.05;

      window.speechSynthesis.speak(voice);
      setLingoStatus("Saying: " + word);
    } catch (error) {
      setLingoStatus("Could not say the word here.");
    }
  }

  function saveCurrentLingo(treasureNumber, action) {
    const inputs = getInputs();

    if (!inputs.name || !inputs.phonics) {
      return false;
    }

    const itemName = inputs.name.value || "";
    const phonics = inputs.phonics.value || "";
    const lingo = makeLingo(itemName, phonics);

    if (!itemName && !phonics) {
      setLingoStatus("Type the item name first.");
      return false;
    }

    const record = {
      treasure_number: treasureNumber,
      item_name: itemName,
      phonics: phonics,
      translated: lingo.translated,
      dewey: lingo.dewey,
      home: lingo.home,
      local_only: true,
      updated_at: new Date().toISOString()
    };

    state.labels[String(treasureNumber)] = record;

    saveLabels();
    addPing(action || "named", treasureNumber, record);

    setLingoStatus("Saved local object ping: " + (itemName || phonics));

    return true;
  }

  function showCleanupLingo(treasureNumber) {
    if (!dom.panel) {
      return;
    }

    const record = labelForCleanup(treasureNumber);

    removeCleanupLingo();

    if (!record) {
      return;
    }

    const card = document.createElement("section");
    card.id = "pixelprix-cleanup-lingo";
    card.className = "pixelprix-cleanup-lingo";

    const es = record.translated && record.translated.es ? record.translated.es : "";
    const fr = record.translated && record.translated.fr ? record.translated.fr : "";

    card.innerHTML = `
      <h3>Object Ping</h3>
      <div class="pixelprix-lingo-line">
        <strong>${escapeHtml(record.item_name || record.phonics || "treasure")}</strong>
      </div>
      <div class="pixelprix-lingo-line">
        Dewey: ${escapeHtml(record.dewey || "object")} → ${escapeHtml(record.home || "home spot")}
      </div>
      <div class="pixelprix-lingo-line">
        ${es ? "ES: " + escapeHtml(es) : ""}${es && fr ? " / " : ""}${fr ? "FR: " + escapeHtml(fr) : ""}
      </div>
    `;

    dom.panel.appendChild(card);

    addPing("cleanup_seen", treasureNumber, record);
  }

  function labelForCleanup(treasureNumber) {
    const direct = state.labels[String(treasureNumber)];

    if (direct) {
      return direct;
    }

    return null;
  }

  function watchDescribeCard() {
    if (!describeCardExists()) {
      removeLingoCard();
      return;
    }

    const inputs = getInputs();

    if (!inputs.name || !inputs.phonics) {
      return;
    }

    showLingoCard();

    inputs.name.removeEventListener("input", onDescribeInput);
    inputs.phonics.removeEventListener("input", onDescribeInput);

    inputs.name.addEventListener("input", onDescribeInput);
    inputs.phonics.addEventListener("input", onDescribeInput);
  }

  function onDescribeInput() {
    window.setTimeout(showLingoCard, 60);
  }

  function watchCleanup() {
    const number = cleanupNumberFromPrompt();

    if (!number) {
      removeCleanupLingo();
      return;
    }

    if (number === state.lastCleanupNumber) {
      return;
    }

    state.lastCleanupNumber = number;
    showCleanupLingo(number);
  }

  function hookButtons() {
    if (dom.secondButton) {
      dom.secondButton.addEventListener("click", function () {
        const text = textOf(dom.secondButton).toLowerCase();

        if (text.indexOf("clear") !== -1 || text.indexOf("home") !== -1) {
          clearLingo();
        }
      });
    }
  }

  function hookObservers() {
    if (!window.MutationObserver) {
      return;
    }

    const bodyObserver = new MutationObserver(function () {
      watchDescribeCard();
      watchCleanup();
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    [dom.prompt, dom.helper].forEach(function (target) {
      if (!target) {
        return;
      }

      const observer = new MutationObserver(function () {
        watchCleanup();
      });

      observer.observe(target, {
        childList: true,
        characterData: true,
        subtree: true
      });
    });
  }

  function boot() {
    readDom();

    if (!dom.panel || !dom.thumbs) {
      return;
    }

    injectStyle();
    loadLocal();
    hookButtons();
    hookObservers();
    watchDescribeCard();
    watchCleanup();
  }

  window.PixelPrixLingo = {
    clear: clearLingo,
    labels: function () {
      return Object.assign({}, state.labels);
    },
    pings: function () {
      return state.pings.slice();
    },
    dictionary: function () {
      return DICTIONARY.slice();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
