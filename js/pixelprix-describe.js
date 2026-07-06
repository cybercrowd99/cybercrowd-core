// js/pixelprix-describe.js
// PixelPrix Core — Describe Layer
// Owns: "What is it?", typed treasure names, phonics / sounds-like labels, cleanup name display.
// Does not own: HTML layout, camera permission, camera capture, mic recording, song layer, NET, uploads, sync, accounts, or provider transport.
// Rule: Typing adds clarity. Phonics fixes pronunciation. Touch still works. Voice remains optional.
// One-action rule: This layer adds no extra action buttons. The big game button remains the only road.

(function () {
  "use strict";

  const GUIDE_KEY = "pixelprixGuide";
  const DESCRIBE_KEY = "pixelprixDescribeLabels.v1";

  const state = {
    guide: "star",
    labels: {},
    lastTreasureCount: 0,
    lastCleanupNumber: 0,
    activeTreasureNumber: 0,
    lastSpokenKey: ""
  };

  const dom = {
    panel: null,
    prompt: null,
    helper: null,
    thumbs: null,
    mainButton: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function readDom() {
    dom.panel = document.querySelector(".panel");
    dom.prompt = byId("prompt");
    dom.helper = byId("helper");
    dom.thumbs = byId("thumbs");
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

  function loadLabels() {
    try {
      state.labels = JSON.parse(localStorage.getItem(DESCRIBE_KEY) || "{}") || {};
    } catch (error) {
      state.labels = {};
    }
  }

  function saveLabels() {
    try {
      localStorage.setItem(DESCRIBE_KEY, JSON.stringify(state.labels));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearLabels() {
    state.labels = {};
    saveLabels();
    state.lastTreasureCount = countTreasurePictures();
    state.lastCleanupNumber = 0;
    state.activeTreasureNumber = 0;
    removeDescribeCard();
    removeCleanupCard();
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

  function safeTrim(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function labelFor(treasureNumber) {
    return state.labels[String(treasureNumber)] || {
      name: "",
      phonics: "",
      updated_at: ""
    };
  }

  function speechNameFor(treasureNumber) {
    const label = labelFor(treasureNumber);

    if (label.phonics) {
      return label.phonics;
    }

    if (label.name) {
      return label.name;
    }

    return "treasure " + treasureNumber;
  }

  function setStatus(text) {
    const status = byId("pixelprix-describe-status");

    if (status) {
      status.textContent = text;
    }
  }

  function injectStyle() {
    if (byId("pixelprix-describe-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pixelprix-describe-style";
    style.textContent = `
      .pixelprix-describe-card,
      .pixelprix-cleanup-name-card {
        margin-top: 10px;
        padding: 11px;
        border-radius: 20px;
        background: rgba(5, 6, 10, 0.84);
        border: 2px solid rgba(255, 255, 255, 0.24);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55);
        color: #fff7df;
        text-align: center;
      }

      .pixelprix-describe-card h2,
      .pixelprix-cleanup-name-card h2 {
        margin: 0 0 6px;
        color: #ffd34d;
        font-size: clamp(1.25rem, 5.4vw, 2.3rem);
        line-height: 1;
        text-shadow: 0 3px 0 #000;
      }

      .pixelprix-describe-card p,
      .pixelprix-cleanup-name-card p {
        margin: 0 0 8px;
        color: #fff7df;
        font-size: clamp(0.9rem, 3.6vw, 1.1rem);
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-describe-fields {
        display: grid;
        gap: 7px;
      }

      .pixelprix-describe-label {
        display: grid;
        gap: 4px;
        color: #fff7df;
        text-align: left;
        font-size: clamp(0.78rem, 3vw, 0.94rem);
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-describe-input {
        width: 100%;
        min-height: 46px;
        border: 2px solid rgba(255, 255, 255, 0.25);
        border-radius: 16px;
        padding: 9px 11px;
        color: #050505;
        background: #fff7df;
        font: inherit;
        font-size: clamp(0.95rem, 4vw, 1.05rem);
        font-weight: 900;
        outline: none;
      }

      .pixelprix-describe-input:focus {
        border-color: #6dff91;
        box-shadow: 0 0 0 4px rgba(109, 255, 145, 0.18);
      }

      .pixelprix-describe-status {
        min-height: 18px;
        margin-top: 7px;
        color: rgba(255, 247, 223, 0.9);
        font-size: clamp(0.72rem, 2.8vw, 0.88rem);
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-word-pill {
        display: inline-grid;
        place-items: center;
        min-height: 44px;
        margin: 4px 0;
        padding: 7px 16px;
        border-radius: 999px;
        color: #050505;
        background: #6dff91;
        font-size: clamp(1.15rem, 6vw, 2.5rem);
        font-weight: 900;
        text-shadow: none;
        box-shadow: 0 5px 0 rgba(0, 0, 0, 0.55);
      }

      .pixelprix-sounds-like {
        color: rgba(255, 247, 223, 0.92);
        font-size: clamp(0.82rem, 3.4vw, 1rem);
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }
    `;

    document.head.appendChild(style);
  }

  function removeDescribeCard() {
    const card = byId("pixelprix-describe-card");

    if (card) {
      card.remove();
    }

    state.activeTreasureNumber = 0;
  }

  function removeCleanupCard() {
    const card = byId("pixelprix-cleanup-name-card");

    if (card) {
      card.remove();
    }
  }

  function showDescribeCard(treasureNumber) {
    if (!dom.panel) {
      return;
    }

    removeDescribeCard();

    state.activeTreasureNumber = treasureNumber;

    const saved = labelFor(treasureNumber);
    const computerCopy = "Type the word. The big game button keeps moving.";
    const voiceCopy = "Voice can still work. Type a word too if you want.";

    const card = document.createElement("section");
    card.id = "pixelprix-describe-card";
    card.className = "pixelprix-describe-card";
    card.innerHTML = `
      <h2>What is it?</h2>
      <p>${isComputerGuide() ? computerCopy : voiceCopy}</p>

      <div class="pixelprix-describe-fields">
        <label class="pixelprix-describe-label" for="pixelprix-item-name">
          Treasure name
          <input
            class="pixelprix-describe-input"
            id="pixelprix-item-name"
            type="text"
            inputmode="text"
            autocomplete="off"
            placeholder="shirt"
            value=""
          />
        </label>

        <label class="pixelprix-describe-label" for="pixelprix-item-phonics">
          Sounds like
          <input
            class="pixelprix-describe-input"
            id="pixelprix-item-phonics"
            type="text"
            inputmode="text"
            autocomplete="off"
            placeholder="shurt / tee shirt / blankie"
            value=""
          />
        </label>
      </div>

      <div class="pixelprix-describe-status" id="pixelprix-describe-status">
        Saved on this device as you type.
      </div>
    `;

    dom.panel.appendChild(card);

    const nameInput = byId("pixelprix-item-name");
    const phonicsInput = byId("pixelprix-item-phonics");

    nameInput.value = saved.name || "";
    phonicsInput.value = saved.phonics || "";

    nameInput.addEventListener("input", function () {
      saveWord(treasureNumber);
    });

    phonicsInput.addEventListener("input", function () {
      saveWord(treasureNumber);
    });

    nameInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        phonicsInput.focus();
      }
    });

    phonicsInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        phonicsInput.blur();
      }
    });
  }

  function saveWord(treasureNumber) {
    const nameInput = byId("pixelprix-item-name");
    const phonicsInput = byId("pixelprix-item-phonics");

    if (!nameInput || !phonicsInput) {
      return false;
    }

    const name = safeTrim(nameInput.value);
    const phonics = safeTrim(phonicsInput.value);

    if (!name && !phonics) {
      delete state.labels[String(treasureNumber)];
      saveLabels();
      setStatus("No word yet. Touch still works.");
      return false;
    }

    state.labels[String(treasureNumber)] = {
      name: name,
      phonics: phonics,
      updated_at: new Date().toISOString()
    };

    if (saveLabels()) {
      setStatus("Saved: " + (name || phonics));
    } else {
      setStatus("Saved for this round. Device storage was full.");
    }

    return true;
  }

  function sayTreasure(treasureNumber, manual) {
    if (!isComputerGuide() && !manual) {
      return;
    }

    const phrase = speechNameFor(treasureNumber);
    const key = treasureNumber + ":" + phrase;

    if (!phrase || phrase === "treasure " + treasureNumber) {
      return;
    }

    if (!manual && state.lastSpokenKey === key) {
      return;
    }

    state.lastSpokenKey = key;

    try {
      if (!("speechSynthesis" in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const voice = new SpeechSynthesisUtterance(phrase);
      voice.rate = 0.88;
      voice.pitch = state.guide === "robot" ? 0.86 : 1.08;

      window.speechSynthesis.speak(voice);
    } catch (error) {}
  }

  function showCleanupCard(treasureNumber) {
    if (!dom.panel) {
      return;
    }

    const label = labelFor(treasureNumber);

    removeCleanupCard();

    if (!label.name && !label.phonics) {
      return;
    }

    const card = document.createElement("section");
    card.id = "pixelprix-cleanup-name-card";
    card.className = "pixelprix-cleanup-name-card";

    const name = label.name || "treasure " + treasureNumber;
    const phonics = label.phonics || "";

    card.innerHTML = `
      <h2>Find this!</h2>
      <div class="pixelprix-word-pill">${escapeHtml(name)}</div>
      ${phonics ? '<div class="pixelprix-sounds-like">Sounds like: ' + escapeHtml(phonics) + '</div>' : ""}
    `;

    dom.panel.appendChild(card);

    if (isComputerGuide()) {
      sayTreasure(treasureNumber, false);
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function watchTreasurePictures() {
    const count = countTreasurePictures();

    if (count > state.lastTreasureCount) {
      state.lastTreasureCount = count;
      showDescribeCard(count);
    }
  }

  function watchCleanup() {
    const number = cleanupNumberFromPrompt();

    if (!number) {
      removeCleanupCard();
      return;
    }

    if (number === state.lastCleanupNumber) {
      return;
    }

    state.lastCleanupNumber = number;
    showCleanupCard(number);
  }

  function syncAfterGameMove() {
    window.setTimeout(function () {
      watchTreasurePictures();
      watchCleanup();
    }, 180);
  }

  function hookButtons() {
    if (dom.mainButton) {
      dom.mainButton.addEventListener("click", syncAfterGameMove);
    }
  }

  function hookObservers() {
    if (dom.thumbs && window.MutationObserver) {
      const thumbsObserver = new MutationObserver(function () {
        watchTreasurePictures();
      });

      thumbsObserver.observe(dom.thumbs, {
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

    if (!dom.panel || !dom.prompt || !dom.thumbs) {
      return;
    }

    injectStyle();
    readGuide();
    loadLabels();

    state.lastTreasureCount = countTreasurePictures();

    hookButtons();
    hookObservers();
    watchCleanup();
  }

  window.PixelPrixDescribe = {
    clear: clearLabels,
    label: labelFor,
    labels: function () {
      return Object.assign({}, state.labels);
    },
    say: function (treasureNumber) {
      sayTreasure(Number(treasureNumber), true);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
