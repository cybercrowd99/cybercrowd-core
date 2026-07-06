// js/pixelprix-voice.js
// PixelPrix Core — Voice Layer
// Owns: optional mic fun, family voice labels, replaying labels during cleanup.
// Does not own: camera permission, camera capture, HTML layout, CyberCade, NET, uploads, sync, accounts, or provider transport.
// Rule: Mic adds fun. Mic does not block play. Touch always works.

(function () {
  "use strict";

  const GUIDE_KEY = "pixelprixGuide";
  const VOICE_KEY = "pixelprixVoiceLabels.v1";
  const MAX_RECORD_MS = 4500;

  const state = {
    guide: "star",
    labels: {},
    lastTreasureCount: 0,
    lastPlayedCleanupNumber: 0,
    activeTreasureNumber: 0,
    recorder: null,
    stream: null,
    chunks: [],
    stopTimer: null
  };

  const dom = {
    panel: null,
    prompt: null,
    helper: null,
    thumbs: null,
    mainButton: null,
    secondButton: null
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
    dom.secondButton = byId("second-button");
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

  function loadLabels() {
    try {
      state.labels = JSON.parse(localStorage.getItem(VOICE_KEY) || "{}") || {};
    } catch (error) {
      state.labels = {};
    }
  }

  function saveLabels() {
    try {
      localStorage.setItem(VOICE_KEY, JSON.stringify(state.labels));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearLabels() {
    state.labels = {};
    saveLabels();
    state.lastTreasureCount = countTreasurePictures();
    state.lastPlayedCleanupNumber = 0;
    removeVoiceCard();
    sayStatus("Voice labels cleared on this device.");
  }

  function sayStatus(text) {
    const status = byId("pixelprix-voice-status");

    if (status) {
      status.textContent = text;
    }

    if (dom.helper && text) {
      dom.helper.textContent = text;
    }
  }

  function countTreasurePictures() {
    if (!dom.thumbs) {
      return 0;
    }

    return dom.thumbs.querySelectorAll("img").length;
  }

  function cleanupNumberFromPrompt() {
    const text = [
      dom.prompt ? dom.prompt.textContent : "",
      dom.helper ? dom.helper.textContent : ""
    ].join(" ");

    const match = text.match(/treasure\s+(\d+)/i);

    if (!match) {
      return 0;
    }

    return Number(match[1]) || 0;
  }

  function injectStyle() {
    if (byId("pixelprix-voice-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pixelprix-voice-style";
    style.textContent = `
      .pixelprix-voice-card {
        margin-top: 12px;
        padding: 14px;
        border-radius: 24px;
        background: rgba(5, 6, 10, 0.82);
        border: 2px solid rgba(255, 255, 255, 0.24);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55);
        color: #fff7df;
        text-align: center;
      }

      .pixelprix-voice-card h2 {
        margin: 0 0 8px;
        color: #ffd34d;
        font-size: clamp(1.45rem, 6vw, 2.6rem);
        line-height: 1;
        text-shadow: 0 3px 0 #000;
      }

      .pixelprix-voice-card p {
        margin: 0 0 10px;
        color: #fff7df;
        font-size: clamp(1rem, 4vw, 1.25rem);
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-talk-button {
        width: 100%;
        min-height: 78px;
        border: 0;
        border-radius: 28px;
        padding: 16px;
        color: #050505;
        background: linear-gradient(135deg, #6dff91, #dbff73);
        font: inherit;
        font-size: clamp(1.35rem, 6vw, 2.6rem);
        font-weight: 900;
        box-shadow: 0 8px 0 rgba(0, 0, 0, 0.55);
        touch-action: none;
        cursor: pointer;
      }

      .pixelprix-talk-button.recording {
        background: linear-gradient(135deg, #ff8bd1, #ffd34d);
        transform: translateY(4px);
        box-shadow: 0 4px 0 rgba(0, 0, 0, 0.55);
      }

      .pixelprix-voice-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 10px;
      }

      .pixelprix-voice-actions button {
        min-height: 54px;
        border: 0;
        border-radius: 999px;
        color: #050505;
        background: #ffd34d;
        font: inherit;
        font-weight: 900;
        cursor: pointer;
        box-shadow: 0 5px 0 rgba(0, 0, 0, 0.55);
      }

      .pixelprix-voice-actions button:active,
      .pixelprix-talk-button:active {
        transform: translateY(4px);
        box-shadow: 0 3px 0 rgba(0, 0, 0, 0.55);
      }

      .pixelprix-voice-status {
        min-height: 22px;
        margin-top: 8px;
        color: rgba(255, 247, 223, 0.9);
        font-size: 0.95rem;
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }
    `;

    document.head.appendChild(style);
  }

  function removeVoiceCard() {
    const card = byId("pixelprix-voice-card");

    if (card) {
      card.remove();
    }

    stopRecording();
    state.activeTreasureNumber = 0;
  }

  function showVoiceCard(treasureNumber) {
    if (!isVoiceGuide()) {
      return;
    }

    if (!dom.panel) {
      return;
    }

    removeVoiceCard();

    state.activeTreasureNumber = treasureNumber;

    const card = document.createElement("section");
    card.id = "pixelprix-voice-card";
    card.className = "pixelprix-voice-card";
    card.innerHTML = `
      <h2>What do you call treasure ${treasureNumber}?</h2>
      <p>Hold TALK and say the word your family uses.</p>

      <button class="pixelprix-talk-button" id="pixelprix-talk-button" type="button">
        🎤 HOLD TALK
      </button>

      <div class="pixelprix-voice-actions">
        <button id="pixelprix-play-label" type="button">PLAY WORD</button>
        <button id="pixelprix-next-label" type="button">NEXT</button>
      </div>

      <div class="pixelprix-voice-status" id="pixelprix-voice-status">
        Voice stays on this device.
      </div>
    `;

    dom.panel.appendChild(card);

    const talk = byId("pixelprix-talk-button");
    const play = byId("pixelprix-play-label");
    const next = byId("pixelprix-next-label");

    talk.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      startRecording(treasureNumber, talk);
    });

    talk.addEventListener("pointerup", function (event) {
      event.preventDefault();
      stopRecording();
    });

    talk.addEventListener("pointercancel", function () {
      stopRecording();
    });

    document.addEventListener("pointerup", stopRecording, { once: true });

    play.addEventListener("click", function () {
      playLabel(treasureNumber);
    });

    next.addEventListener("click", function () {
      removeVoiceCard();
    });

    sayStatus("Press and hold TALK. Say the treasure word.");
  }

  function chooseMimeType() {
    const options = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus"
    ];

    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) {
      return "";
    }

    for (let i = 0; i < options.length; i += 1) {
      if (MediaRecorder.isTypeSupported(options[i])) {
        return options[i];
      }
    }

    return "";
  }

  async function startRecording(treasureNumber, button) {
    if (state.recorder) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      sayStatus("Mic is not available here. Touch still works.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      const mimeType = chooseMimeType();
      const options = mimeType ? { mimeType: mimeType } : {};

      state.stream = stream;
      state.chunks = [];
      state.activeTreasureNumber = treasureNumber;
      state.recorder = new MediaRecorder(stream, options);

      state.recorder.addEventListener("dataavailable", function (event) {
        if (event.data && event.data.size > 0) {
          state.chunks.push(event.data);
        }
      });

      state.recorder.addEventListener("stop", finishRecording);

      state.recorder.start();

      button.classList.add("recording");
      button.textContent = "🎤 TALKING...";
      sayStatus("Listening. Let go when done.");

      state.stopTimer = window.setTimeout(function () {
        stopRecording();
      }, MAX_RECORD_MS);
    } catch (error) {
      sayStatus("Mic permission needed. Touch still works.");
    }
  }

  function stopRecording() {
    const talk = byId("pixelprix-talk-button");

    if (state.stopTimer) {
      window.clearTimeout(state.stopTimer);
      state.stopTimer = null;
    }

    if (talk) {
      talk.classList.remove("recording");
      talk.textContent = "🎤 HOLD TALK";
    }

    if (!state.recorder) {
      return;
    }

    try {
      if (state.recorder.state !== "inactive") {
        state.recorder.stop();
      }
    } catch (error) {
      cleanupStream();
    }
  }

  function cleanupStream() {
    if (state.stream) {
      state.stream.getTracks().forEach(function (track) {
        track.stop();
      });
    }

    state.stream = null;
    state.recorder = null;
    state.chunks = [];
  }

  function finishRecording() {
    const treasureNumber = state.activeTreasureNumber;
    const blob = new Blob(state.chunks, {
      type: state.chunks[0] ? state.chunks[0].type : "audio/webm"
    });

    cleanupStream();

    if (!blob.size) {
      sayStatus("No voice caught. Hold TALK and try again.");
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("loadend", function () {
      state.labels[String(treasureNumber)] = reader.result;

      if (saveLabels()) {
        sayStatus("Saved. This treasure has your voice.");
      } else {
        sayStatus("Voice recorded, but this device storage is full.");
      }

      playLabel(treasureNumber);
    });

    reader.readAsDataURL(blob);
  }

  function playLabel(treasureNumber) {
    const src = state.labels[String(treasureNumber)];

    if (!src) {
      sayStatus("No voice saved for this treasure yet.");
      return;
    }

    try {
      const audio = new Audio(src);

      audio.play().catch(function () {
        sayStatus("Tap PLAY WORD again to hear it.");
      });
    } catch (error) {
      sayStatus("Voice could not play here.");
    }
  }

  function watchTreasurePictures() {
    const count = countTreasurePictures();

    if (count > state.lastTreasureCount) {
      state.lastTreasureCount = count;
      showVoiceCard(count);
    }
  }

  function watchCleanupPrompt() {
    if (!isVoiceGuide()) {
      return;
    }

    const number = cleanupNumberFromPrompt();

    if (!number) {
      return;
    }

    if (number === state.lastPlayedCleanupNumber) {
      return;
    }

    if (!state.labels[String(number)]) {
      return;
    }

    state.lastPlayedCleanupNumber = number;

    window.setTimeout(function () {
      playLabel(number);
    }, 350);
  }

  function hookButtons() {
    if (dom.mainButton) {
      dom.mainButton.addEventListener("click", function () {
        window.setTimeout(function () {
          watchTreasurePictures();
          watchCleanupPrompt();
        }, 180);
      });
    }

    if (dom.secondButton) {
      dom.secondButton.addEventListener("click", function () {
        const label = dom.secondButton.textContent || "";

        if (/clear/i.test(label)) {
          clearLabels();
        }
      });
    }
  }

  function hookObservers() {
    if (dom.thumbs) {
      const thumbObserver = new MutationObserver(function () {
        watchTreasurePictures();
      });

      thumbObserver.observe(dom.thumbs, {
        childList: true,
        subtree: true
      });
    }

    if (dom.prompt) {
      const promptObserver = new MutationObserver(function () {
        watchCleanupPrompt();
      });

      promptObserver.observe(dom.prompt, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    if (dom.helper) {
      const helperObserver = new MutationObserver(function () {
        watchCleanupPrompt();
      });

      helperObserver.observe(dom.helper, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
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
  }

  window.PixelPrixVoice = {
    clear: clearLabels,
    play: playLabel,
    labels: function () {
      return Object.assign({}, state.labels);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
