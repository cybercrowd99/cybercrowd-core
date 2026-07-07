// js/pixelprix-lingo.js
// PixelPrix Core — Lingo Layer
// Owns: Biff question, Dewey bucket hints, translated cleanup words, local-only object pings.
// Does not own: HTML layout, camera permission, camera capture, mic recording, song layer, NET, uploads, sync, accounts, analytics, or provider transport.
// Rule: Words can travel. Kids do not. Object pings stay local unless a later NET lane is explicitly built.
// Lane rule: Computer guide is textual. Voice guide is speech. This file does not demand text fields in voice mode.
// One-action rule: This layer adds no action buttons. The big game button remains the only movement road.

(function () {
  "use strict";

  const GUIDE_KEY = "pixelprixGuide";
  const LINGO_KEY = "pixelprixLingoLabels.v1";
  const PING_KEY = "pixelprixObjectPings.v1";

  const state = {
    guide: "star",
    labels: {},
    pings: [],
    activeTreasureNumber: 0,
    lastDescribeSignature: "",
    lastCleanupNumber: 0,
    lastPingSignature: ""
  };

  const dom = {
    panel: null,
    thumbs: null,
    prompt: null,
    helper: null,
    mainButton: null
  };

  const dictionary = [
    {
      match: ["shirt", "t-shirt", "tee shirt", "teeshirt", "shurt", "camisa"],
      bucket: "clothing",
      home: "laundry",
      translations: {
        es: "camisa",
        fr: "chemise"
      }
    },
    {
      match: ["pants", "jeans", "shorts", "pantalones"],
      bucket: "clothing",
      home: "laundry",
      translations: {
        es: "pantalones",
        fr: "pantalon"
      }
    },
    {
      match: ["sock", "socks", "calcetin", "calcetines"],
      bucket: "clothing",
      home: "laundry",
      translations: {
        es: "calcetines",
        fr: "chaussettes"
      }
    },
    {
      match: ["shoe", "shoes", "zapatilla", "zapato", "zapatos"],
      bucket: "clothing",
      home: "shoe spot",
      translations: {
        es: "zapatos",
        fr: "chaussures"
      }
    },
    {
      match: ["toy", "toys", "juguete", "juguetes"],
      bucket: "toy",
      home: "toy bin",
      translations: {
        es: "juguete",
        fr: "jouet"
      }
    },
    {
      match: ["truck", "car", "train", "bus", "vehicle", "camion", "coche"],
      bucket: "toy",
      home: "toy bin",
      translations: {
        es: "camion",
        fr: "camion"
      }
    },
    {
      match: ["doll", "bear", "teddy", "teddy bear", "stuffie", "plush"],
      bucket: "toy",
      home: "toy bin",
      translations: {
        es: "muneco",
        fr: "peluche"
      }
    },
    {
      match: ["book", "books", "libro", "libros"],
      bucket: "book",
      home: "shelf",
      translations: {
        es: "libro",
        fr: "livre"
      }
    },
    {
      match: ["cup", "cups", "mug", "vaso", "taza"],
      bucket: "dish",
      home: "kitchen",
      translations: {
        es: "vaso",
        fr: "tasse"
      }
    },
    {
      match: ["plate", "plates", "plato", "platos"],
      bucket: "dish",
      home: "kitchen",
      translations: {
        es: "plato",
        fr: "assiette"
      }
    },
    {
      match: ["spoon", "fork", "spork", "cuchara", "tenedor"],
      bucket: "dish",
      home: "kitchen",
      translations: {
        es: "cuchara",
        fr: "cuillere"
      }
    },
    {
      match: ["trash", "garbage", "wrapper", "paper", "basura"],
      bucket: "trash",
      home: "trash can",
      translations: {
        es: "basura",
        fr: "dechet"
      }
    },
    {
      match: ["blanket", "blankie", "manta"],
      bucket: "comfort",
      home: "bed",
      translations: {
        es: "manta",
        fr: "couverture"
      }
    },
    {
      match: ["pillow", "almohada"],
      bucket: "comfort",
      home: "bed",
      translations: {
        es: "almohada",
        fr: "oreiller"
      }
    },
    {
      match: ["pajamas", "pajama", "pj", "pjs"],
      bucket: "clothing",
      home: "laundry",
      translations: {
        es: "pijama",
        fr: "pyjama"
      }
    },
    {
      match: ["towel", "toalla"],
      bucket: "cloth",
      home: "laundry",
      translations: {
        es: "toalla",
        fr: "serviette"
      }
    }
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function readDom() {
    dom.panel = document.querySelector(".panel");
    dom.thumbs = byId("thumbs");
    dom.prompt = byId("prompt");
    dom.helper = byId("helper");
    dom.mainButton = byId("main-button");
  }

  function readText(node) {
    return node && node.textContent ? node.textContent.trim() : "";
  }

  function readGuide() {
    try {
      state.guide = localStorage.getItem(GUIDE_KEY) || "star";
    } catch (error) {
      state.guide = "star";
    }

    return state.guide;
  }

  function isVoiceGuide() {
    return readGuide() === "voice";
  }

  function isComputerGuide() {
    return !isVoiceGuide();
  }

  function safeTrim(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalize(value) {
    return safeTrim(value)
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9ñáéíóúü\s-]/gi, "")
      .replace(/\s+/g, " ");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadStorage() {
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
      localStorage.setItem(PING_KEY, JSON.stringify(state.pings.slice(-200)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clear() {
    state.labels = {};
    state.pings = [];
    state.activeTreasureNumber = 0;
    state.lastDescribeSignature = "";
    state.lastCleanupNumber = 0;
    state.lastPingSignature = "";

    saveLabels();
    savePings();

    removeLingoCard();
    removeCleanupLingoCard();
  }

  function countTreasurePictures() {
    if (!dom.thumbs) {
      return 0;
    }

    return dom.thumbs.querySelectorAll("img").length;
  }

  function cleanupNumberFromPrompt() {
    const text = [
      readText(dom.prompt),
      readText(dom.helper)
    ].join(" ");

    const match = text.match(/treasure\s+(\d+)/i);

    if (!match) {
      return 0;
    }

    return Number(match[1]) || 0;
  }

  function findDictionaryEntry(name, phonics) {
    const text = normalize([name, phonics].join(" "));

    if (!text) {
      return null;
    }

    for (let i = 0; i < dictionary.length; i += 1) {
      const entry = dictionary[i];

      for (let j = 0; j < entry.match.length; j += 1) {
        const word = normalize(entry.match[j]);

        if (text === word || text.includes(word)) {
          return entry;
        }
      }
    }

    return null;
  }

  function makeMeaning(name, phonics) {
    const entry = findDictionaryEntry(name, phonics);

    if (entry) {
      return {
        bucket: entry.bucket,
        home: entry.home,
        translations: Object.assign({}, entry.translations)
      };
    }

    return {
      bucket: "object",
      home: "home spot",
      translations: {}
    };
  }

  function labelFor(treasureNumber) {
    return state.labels[String(treasureNumber)] || {
      item_name: "",
      phonics: "",
      biff_question: "What is it?",
      dewey_bucket: "",
      dewey_home: "",
      translated_words: {},
      updated_at: ""
    };
  }

  function createObjectPing(treasureNumber, action, label) {
    const signature = [
      treasureNumber,
      action,
      label.item_name,
      label.phonics,
      label.dewey_bucket,
      label.dewey_home,
      state.guide
    ].join("|");

    if (signature === state.lastPingSignature) {
      return;
    }

    state.lastPingSignature = signature;

    state.pings.push({
      ping_id: "pixelprix.ping." + Date.now() + "." + Math.random().toString(36).slice(2, 8),
      source: "pixelprix",
      action: action,
      treasure_number: treasureNumber,
      item_name: label.item_name || "",
      phonics: label.phonics || "",
      biff_question: label.biff_question || "What is it?",
      dewey_bucket: label.dewey_bucket || "object",
      dewey_home: label.dewey_home || "home spot",
      translated_words: label.translated_words || {},
      guide_lane: state.guide,
      local_only: true,
      created_at: new Date().toISOString()
    });

    if (state.pings.length > 200) {
      state.pings = state.pings.slice(-200);
    }

    savePings();
  }

  function injectStyle() {
    if (byId("pixelprix-lingo-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pixelprix-lingo-style";
    style.textContent = `
      .pixelprix-lingo-card,
      .pixelprix-cleanup-lingo-card {
        margin-top: 9px;
        padding: 10px;
        border-radius: 18px;
        background: rgba(5, 6, 10, 0.82);
        border: 2px solid rgba(255, 255, 255, 0.22);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
        color: #fff7df;
        text-align: left;
      }

      .pixelprix-lingo-title {
        margin: 0 0 7px;
        color: #ffd34d;
        font-size: clamp(1rem, 4.2vw, 1.35rem);
        line-height: 1.05;
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-lingo-line {
        margin: 4px 0;
        color: #fff7df;
        font-size: clamp(0.78rem, 3.1vw, 0.98rem);
        line-height: 1.18;
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-lingo-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .pixelprix-lingo-pill {
        display: inline-grid;
        place-items: center;
        min-height: 30px;
        padding: 5px 10px;
        border-radius: 999px;
        color: #050505;
        background: #7bd4ff;
        font-size: clamp(0.72rem, 2.9vw, 0.9rem);
        font-weight: 900;
        text-shadow: none;
      }

      .pixelprix-lingo-pill.green {
        background: #6dff91;
      }

      .pixelprix-lingo-pill.gold {
        background: #ffd34d;
      }

      .pixelprix-lingo-note {
        margin-top: 7px;
        color: rgba(255, 247, 223, 0.82);
        font-size: clamp(0.68rem, 2.65vw, 0.82rem);
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }
    `;

    document.head.appendChild(style);
  }

  function removeLingoCard() {
    const card = byId("pixelprix-lingo-card");

    if (card) {
      card.remove();
    }
  }

  function removeCleanupLingoCard() {
    const card = byId("pixelprix-cleanup-lingo-card");

    if (card) {
      card.remove();
    }
  }

  function getDescribeCard() {
    return byId("pixelprix-describe-card");
  }

  function getDescribeInputs() {
    return {
      name: byId("pixelprix-item-name"),
      phonics: byId("pixelprix-item-phonics")
    };
  }

  function renderTranslationPills(translations) {
    const parts = [];

    if (translations.es) {
      parts.push('<span class="pixelprix-lingo-pill green">ES ' + escapeHtml(translations.es) + "</span>");
    }

    if (translations.fr) {
      parts.push('<span class="pixelprix-lingo-pill gold">FR ' + escapeHtml(translations.fr) + "</span>");
    }

    if (!parts.length) {
      parts.push('<span class="pixelprix-lingo-pill">Translation waits for typed word</span>');
    }

    return parts.join("");
  }

  function renderLingoCard(treasureNumber, label) {
    if (!isComputerGuide()) {
      removeLingoCard();
      return;
    }

    const describeCard = getDescribeCard();

    if (!describeCard || !dom.panel) {
      removeLingoCard();
      return;
    }

    let card = byId("pixelprix-lingo-card");

    if (!card) {
      card = document.createElement("section");
      card.id = "pixelprix-lingo-card";
      card.className = "pixelprix-lingo-card";
      describeCard.insertAdjacentElement("afterend", card);
    }

    const itemName = label.item_name || "waiting for typed word";
    const bucket = label.dewey_bucket || "object";
    const home = label.dewey_home || "home spot";

    card.innerHTML = `
      <div class="pixelprix-lingo-title">Biff + Dewey</div>
      <div class="pixelprix-lingo-line">Biff asks: ${escapeHtml(label.biff_question || "What is it?")}</div>
      <div class="pixelprix-lingo-line">Word: ${escapeHtml(itemName)}</div>
      <div class="pixelprix-lingo-line">Dewey sorts: ${escapeHtml(bucket)} → ${escapeHtml(home)}</div>
      <div class="pixelprix-lingo-pill-row">
        ${renderTranslationPills(label.translated_words || {})}
      </div>
      <div class="pixelprix-lingo-note">Local object ping only. The object pings. The kid does not.</div>
    `;

    createObjectPing(treasureNumber, "named", label);
  }

  function saveFromDescribeInputs() {
    if (!isComputerGuide()) {
      removeLingoCard();
      return;
    }

    const describeCard = getDescribeCard();
    const inputs = getDescribeInputs();

    if (!describeCard || !inputs.name || !inputs.phonics) {
      removeLingoCard();
      return;
    }

    const treasureNumber = countTreasurePictures();

    if (!treasureNumber) {
      return;
    }

    state.activeTreasureNumber = treasureNumber;

    const name = safeTrim(inputs.name.value);
    const phonics = safeTrim(inputs.phonics.value);
    const meaning = makeMeaning(name, phonics);

    const label = {
      item_name: name,
      phonics: phonics,
      biff_question: "What is it?",
      dewey_bucket: meaning.bucket,
      dewey_home: meaning.home,
      translated_words: meaning.translations,
      updated_at: new Date().toISOString()
    };

    const signature = [
      treasureNumber,
      label.item_name,
      label.phonics,
      label.dewey_bucket,
      label.dewey_home,
      JSON.stringify(label.translated_words)
    ].join("|");

    if (signature === state.lastDescribeSignature) {
      renderLingoCard(treasureNumber, label);
      return;
    }

    state.lastDescribeSignature = signature;

    if (label.item_name || label.phonics) {
      state.labels[String(treasureNumber)] = label;
    } else {
      delete state.labels[String(treasureNumber)];
    }

    saveLabels();
    renderLingoCard(treasureNumber, label);
  }

  function renderCleanupLingoCard(treasureNumber) {
    if (!isComputerGuide()) {
      removeCleanupLingoCard();
      return;
    }

    if (!dom.panel) {
      return;
    }

    const label = labelFor(treasureNumber);

    removeCleanupLingoCard();

    if (!label.item_name && !label.phonics) {
      return;
    }

    const card = document.createElement("section");
    card.id = "pixelprix-cleanup-lingo-card";
    card.className = "pixelprix-cleanup-lingo-card";

    const itemName = label.item_name || "treasure " + treasureNumber;
    const bucket = label.dewey_bucket || "object";
    const home = label.dewey_home || "home spot";

    card.innerHTML = `
      <div class="pixelprix-lingo-title">Object Ping</div>
      <div class="pixelprix-lingo-line">${escapeHtml(itemName)} → ${escapeHtml(home)}</div>
      <div class="pixelprix-lingo-line">Dewey: ${escapeHtml(bucket)}</div>
      <div class="pixelprix-lingo-pill-row">
        ${renderTranslationPills(label.translated_words || {})}
      </div>
      <div class="pixelprix-lingo-note">Local only. No upload. No child profile.</div>
    `;

    dom.panel.appendChild(card);

    createObjectPing(treasureNumber, "cleanup_seen", label);
  }

  function watchCleanup() {
    if (!isComputerGuide()) {
      removeCleanupLingoCard();
      state.lastCleanupNumber = 0;
      return;
    }

    const number = cleanupNumberFromPrompt();

    if (!number) {
      removeCleanupLingoCard();
      state.lastCleanupNumber = 0;
      return;
    }

    if (number === state.lastCleanupNumber) {
      return;
    }

    state.lastCleanupNumber = number;
    renderCleanupLingoCard(number);
  }

  function syncAfterGameMove() {
    window.setTimeout(function () {
      saveFromDescribeInputs();
      watchCleanup();
    }, 200);
  }

  function hookDescribeInputs() {
    document.addEventListener("input", function (event) {
      if (!isComputerGuide()) {
        removeLingoCard();
        return;
      }

      if (
        event.target &&
        (
          event.target.id === "pixelprix-item-name" ||
          event.target.id === "pixelprix-item-phonics"
        )
      ) {
        saveFromDescribeInputs();
      }
    });
  }

  function hookButton() {
    if (dom.mainButton) {
      dom.mainButton.addEventListener("click", syncAfterGameMove);
    }
  }

  function hookObservers() {
    if (dom.panel && window.MutationObserver) {
      const panelObserver = new MutationObserver(function () {
        saveFromDescribeInputs();
        watchCleanup();
      });

      panelObserver.observe(dom.panel, {
        childList: true,
        subtree: true
      });
    }

    [dom.prompt, dom.helper].forEach(function (target) {
      if (!target || !window.MutationObserver) {
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

    if (!dom.panel || !dom.thumbs || !dom.prompt) {
      return;
    }

    injectStyle();
    readGuide();
    loadStorage();
    hookDescribeInputs();
    hookButton();
    hookObservers();

    saveFromDescribeInputs();
    watchCleanup();
  }

  window.PixelPrixLingo = {
    clear: clear,
    labels: function () {
      return Object.assign({}, state.labels);
    },
    pings: function () {
      return state.pings.slice();
    },
    dictionary: function () {
      return dictionary.slice();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
