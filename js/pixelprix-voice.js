// js/pixelprix-voice.js
// PixelPrix — Voice Layer
// Owns: optional mic fun, “What is it?” prompt, family voice labels, immediate playback, cleanup replay.
// Does not own: camera permission, camera capture, HTML layout, CyberCade page, uploads, sync, accounts, analytics, or provider transport.
// Rule: Mic adds fun. Mic does not block play. Touch always works.
// Flow: take treasure picture -> ask “What is it?” -> record answer -> play it back -> big game button moves on.

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
    stopTimer: null,
    listening: false,
    speaking: false,
    audioUnlocked: false,
    lastPromptText: ""
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

  function normalizeGuide(value) {
    const guide = String(value || "star").toLowerCase().trim();

    if (guide === "voice") {
      return "voice";
    }

    if (guide === "robot") {
      return "robot";
    }

    if (
      guide === "none" ||
      guide === "silent" ||
      guide === "no-sound" ||
      guide === "nosound" ||
      guide === "off"
    ) {
      return "off";
    }

    return "star";
  }

  function readGuide() {
    try {
      state.guide = normalizeGuide(localStorage.getItem(GUIDE_KEY) || "star");
    } catch (error) {
      state.guide = "star";
    }

    return state.guide;
  }

  function isVoiceGuide() {
    return readGuide() === "voice";
  }

  function isSoundOff() {
    return readGuide() === "off";
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

    try {
      localStorage.removeItem(VOICE_KEY);
    } catch (error) {
      saveLabels();
    }

    state.lastTreasureCount = countTreasurePictures();
    state.lastPlayedCleanupNumber = 0;
    removeVoiceCard();
  }

  function setStatus(text) {
    const status = byId("pixelprix-voice-status");

    if (status) {
      status.textContent = text;
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
      readText(dom.prompt),
      readText(dom.helper)
    ].join(" ");

    const match = text.match(/treasure\s+(\d+)/i);

    if (!match) {
      return 0;
    }

    return Number(match[1]) || 0;
  }

  function unlockAudio() {
    state.audioUnlocked = true;

    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
    } catch (error) {}
  }

  function hookAudioUnlock() {
    function unlock() {
      unlockAudio();
    }

    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
  }

  function speak(text) {
    if (!isVoiceGuide() || isSoundOff()) {
      return;
    }

    try {
      if (!("speechSynthesis" in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.05;

      state.speaking = true;

      utterance.onend = function () {
        state.speaking = false;
      };

      utterance.onerror = function () {
        state.speaking = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      state.speaking = false;
    }
  }

  function beep(frequency, duration) {
    if (isSoundOff()) {
      return;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) {
        return;
      }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      if (context.state === "suspended" && context.resume) {
        context.resume();
      }

      oscillator.type = "square";
      oscillator.frequency.value = frequency || 720;
      gain.gain.value = 0.04;

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();

      window.setTimeout(function () {
        oscillator.stop();
        context.close();
      }, duration || 90);
    } catch (error) {}
  }

  function injectStyle() {
    if (byId("pixelprix-voice-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pixelprix-voice-style";
    style.textContent = `
      .pixelprix-voice-card {
        margin-top: 9px;
        padding: 12px;
        border-radius: 20px;
        background: rgba(5, 6, 10, 0.84);
        border: 2px solid rgba(255, 255, 255, 0.24);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
        color: #fff7df;
        text-align: center;
        cursor: pointer;
        touch-action: manipulation;
        user-select: none;
      }

      .pixelprix-voice-card.listening {
        background: rgba(255, 139, 209, 0.22);
        border-color: rgba(255, 211, 77, 0.72);
        transform: translateY(3px);
      }

      .pixelprix-voice-card h2 {
        margin: 0 0 7px;
        color: #ffd34d;
        font-size: clamp(1.35rem, 6vw, 2.4rem);
        line-height: 1;
        text-shadow: 0 3px 0 #000;
      }

      .pixelprix-voice-card p {
        margin: 0 0 7px;
        color: #fff7df;
        font-size: clamp(0.9rem, 3.5vw, 1.1rem);
        line-height: 1.18;
        font-weight: 900;
        text-shadow: 0 2px 0 #000;
      }

      .pixelprix-voice-status {
        min-height: 18px;
        color: rgba(255, 247, 223, 0.9);
        font-size: clamp(0.74rem, 2.85vw, 0.9rem);
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
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.innerHTML = `
      <h2 id="pixelprix-voice-title">What is it?</h2>
      <p>Tap this card and say the word your family uses.</p>
      <div class="pixelprix-voice-status" id="pixelprix-voice-status">
        Voice stays on this device. The big button keeps the game moving.
      </div>
    `;

    dom.panel.appendChild(card);

    window.setTimeout(function () {
      beep(640, 80);
      speak("What is it?");
      setStatus("Tap the card and say the word. Tap again to stop early.");
    }, 120);

    card.addEventListener("click", function () {
      unlockAudio();

      if (state.listening) {
        stopRecording();
        return;
      }

      startRecording(treasureNumber);
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        unlockAudio();

        if (state.listening) {
          stopRecording();
          return;
        }

        startRecording(treasureNumber);
      }
    });
  }

  function setListeningUi(isListening) {
    const card = byId("pixelprix-voice-card");
    const title = byId("pixelprix-voice-title");

    if (card) {
      card.classList.toggle("listening", isListening);
    }

    if (title) {
      title.textContent = isListening ? "Listening 🎶" : "What is it?";
    }
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

  async function startRecording(treasureNumber) {
    if (state.recorder || state.listening) {
      return;
    }

    if (!isVoiceGuide()) {
      return;
    }

    if (!treasureNumber) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setStatus("Mic is not available here. Touch still works.");
      speak("Mic is not available here. Touch still works.");
      return;
    }

    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

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
      state.listening = true;

      state.recorder.addEventListener("dataavailable", function (event) {
        if (event.data && event.data.size > 0) {
          state.chunks.push(event.data);
        }
      });

      state.recorder.addEventListener("stop", finishRecording);

      state.recorder.start();

      setListeningUi(true);
      setStatus("Listening. Say the word.");
      beep(880, 90);

      state.stopTimer = window.setTimeout(function () {
        stopRecording();
      }, MAX_RECORD_MS);
    } catch (error) {
      state.listening = false;
      setListeningUi(false);
      setStatus("Mic permission needed. Touch still works.");
      speak("Mic permission needed. Touch still works.");
    }
  }

  function stopRecording() {
    if (state.stopTimer) {
      window.clearTimeout(state.stopTimer);
      state.stopTimer = null;
    }

    setListeningUi(false);

    if (!state.recorder) {
      state.listening = false;
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
    state.listening = false;
  }

  function finishRecording() {
    const treasureNumber = state.activeTreasureNumber;
    const blob = new Blob(state.chunks, {
      type: state.chunks[0] ? state.chunks[0].type : "audio/webm"
    });

    cleanupStream();

    if (!blob.size) {
      setStatus("No voice caught. Tap What is it? and try again.");
      speak("No voice caught. Try again.");
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("loadend", function () {
      state.labels[String(treasureNumber)] = reader.result;

      if (saveLabels()) {
        setStatus("Saved. Playing it back.");
        beep(520, 80);

        window.setTimeout(function () {
          playLabel(treasureNumber, function () {
            setStatus("Yes. Voice saved. Use the big button to move on.");
            speak("Yes. Move on.");
          });
        }, 180);
      } else {
        setStatus("Voice recorded, but this device storage is full.");
        speak("Voice recorded, but this device storage is full.");
      }
    });

    reader.readAsDataURL(blob);
  }

  function playLabel(treasureNumber, done) {
    const src = state.labels[String(treasureNumber)];

    if (!src || isSoundOff()) {
      if (typeof done === "function") {
        done();
      }

      return;
    }

    try {
      const audio = new Audio(src);

      audio.addEventListener("ended", function () {
        if (typeof done === "function") {
          done();
        }
      }, { once: true });

      audio.addEventListener("error", function () {
        if (typeof done === "function") {
          done();
        }
      }, { once: true });

      const attempt = audio.play();

      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(function () {
          setStatus("Tap once more to hear the saved voice.");

          if (typeof done === "function") {
            done();
          }
        });
      }
    } catch (error) {
      if (typeof done === "function") {
        done();
      }
    }
  }

  function watchTreasurePictures() {
    const count = countTreasurePictures();

    if (count < state.lastTreasureCount) {
      state.lastTreasureCount = count;
      removeVoiceCard();
      return;
    }

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

    state.lastPlayedCleanupNumber = number;

    window.setTimeout(function () {
      if (state.labels[String(number)]) {
        playLabel(number);
        return;
      }

      speak("Find treasure " + number + ".");
    }, 350);
  }

  function syncAfterGameMove() {
    window.setTimeout(function () {
      watchTreasurePictures();
      watchCleanupPrompt();
    }, 180);
  }

  function hookMainButton() {
    if (!dom.mainButton) {
      return;
    }

    dom.mainButton.addEventListener("click", syncAfterGameMove);
  }

  function hookObservers() {
    if (dom.thumbs && window.MutationObserver) {
      const thumbObserver = new MutationObserver(function () {
        watchTreasurePictures();
      });

      thumbObserver.observe(dom.thumbs, {
        childList: true,
        subtree: true
      });
    }

    [dom.prompt, dom.helper].forEach(function (target) {
      if (!target || !window.MutationObserver) {
        return;
      }

      const observer = new MutationObserver(function () {
        watchCleanupPrompt();
      });

      observer.observe(target, {
        childList: true,
        characterData: true,
        subtree: true
      });
    });
  }

  function announceMainPrompt() {
    if (!isVoiceGuide()) {
      return;
    }

    const text = readText(dom.prompt);

    if (!text || text === state.lastPromptText) {
      return;
    }

    state.lastPromptText = text;

    if (/point close|treasure picture/i.test(text)) {
      return;
    }

    window.setTimeout(function () {
      speak(text);
    }, 120);
  }

  function hookPromptVoice() {
    [dom.prompt, dom.helper].forEach(function (target) {
      if (!target || !window.MutationObserver) {
        return;
      }

      const observer = new MutationObserver(function () {
        announceMainPrompt();
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
    hookAudioUnlock();

    state.lastTreasureCount = countTreasurePictures();

    hookMainButton();
    hookObservers();
    hookPromptVoice();
    announceMainPrompt();
  }

  window.PixelPrixVoice = {
    clear: clearLabels,
    play: playLabel,
    labels: function () {
      return Object.assign({}, state.labels);
    },
    speak: speak
  };

  window.addEventListener("pagehide", function () {
    stopRecording();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
