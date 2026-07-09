// js/pixelprix-voice.js
// PixelPrix — Voice Replay Layer
// Owns: local voice replay for treasure names, “What is this treasure?” recording card, cleanup replay.
// Does not own: camera permission, camera capture, game phase order, HTML landing page, CyberCade page, uploads, sync, accounts, analytics, provider transport, PING, NET, CORE.
// Rule: The point is not speech-to-text. The point is the kid hears their own word come back during cleanup.
// Flow: treasure snap -> robot asks “What is this treasure?” -> record answer -> save replay to treasure number -> cleanup plays it back.

(function () {
  "use strict";

  const VOICE_MODE_KEY = "pixelprixRobotVoice";
  const VOICE_KEY = "pixelprixVoiceLabels.v1";
  const MAX_RECORD_MS = 4500;

  const state = {
    mode: "female",
    labels: {},
    activeTreasureNumber: 0,
    recorder: null,
    stream: null,
    chunks: [],
    stopTimer: null,
    listening: false,
    doneCallback: null
  };

  const dom = {
    panel: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function readDom() {
    dom.panel = document.querySelector(".panel");
  }

  function readMode() {
    try {
      state.mode = localStorage.getItem(VOICE_MODE_KEY) || "female";
    } catch (error) {
      state.mode = "female";
    }

    if (state.mode !== "male" && state.mode !== "female" && state.mode !== "silent") {
      state.mode = "female";
    }

    return state.mode;
  }

  function isSilent() {
    return readMode() === "silent";
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

    removeVoiceCard();
  }

  function setStatus(text) {
    const status = byId("pixelprix-voice-status");

    if (status) {
      status.textContent = text;
    }
  }

  function speak(text) {
    if (isSilent()) {
      return;
    }

    try {
      if (!("speechSynthesis" in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = readMode() === "male" ? 0.82 : 1.14;

      window.speechSynthesis.speak(utterance);
    } catch (error) {}
  }

  function beep(frequency, duration) {
    if (isSilent()) {
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

      .pixelprix-voice-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
      }

      .pixelprix-voice-actions button {
        min-height: 46px;
        border-radius: 999px;
        padding: 8px 10px;
        color: #050505;
        background: linear-gradient(135deg, #6dff91, #dbff73);
        font: inherit;
        font-size: clamp(0.86rem, 3.4vw, 1rem);
        font-weight: 900;
        border: 0;
        box-shadow: 0 5px 0 rgba(0, 0, 0, 0.62);
      }

      .pixelprix-voice-actions button.skip {
        background: #ffd34d;
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
    state.doneCallback = null;
  }

  function finishAsk() {
    const done = state.doneCallback;

    removeVoiceCard();

    if (typeof done === "function") {
      done();
    }
  }

  function showVoiceCard(treasureNumber, done) {
    readDom();

    if (!dom.panel) {
      if (typeof done === "function") {
        done();
      }

      return;
    }

    if (isSilent()) {
      if (typeof done === "function") {
        done();
      }

      return;
    }

    removeVoiceCard();

    state.activeTreasureNumber = treasureNumber;
    state.doneCallback = done;

    const card = document.createElement("section");
    card.id = "pixelprix-voice-card";
    card.className = "pixelprix-voice-card";
    card.setAttribute("role", "group");
    card.innerHTML = `
      <h2 id="pixelprix-voice-title">What is this treasure?</h2>
      <p>Tap record. Say the word. The game will play it back during cleanup.</p>
      <div class="pixelprix-voice-status" id="pixelprix-voice-status">
        Voice replay stays on this device.
      </div>
      <div class="pixelprix-voice-actions">
        <button id="pixelprix-record-name" type="button">RECORD</button>
        <button class="skip" id="pixelprix-skip-name" type="button">SKIP</button>
      </div>
    `;

    dom.panel.appendChild(card);

    const record = byId("pixelprix-record-name");
    const skip = byId("pixelprix-skip-name");

    window.setTimeout(function () {
      beep(640, 80);
      speak("Okay. What is this treasure?");
      setStatus("Tap RECORD and say the word.");
    }, 120);

    record.addEventListener("click", function () {
      if (state.listening) {
        stopRecording();
        return;
      }

      startRecording(treasureNumber);
    });

    skip.addEventListener("click", function () {
      setStatus("Skipped voice replay.");
      window.setTimeout(finishAsk, 250);
    });
  }

  function setListeningUi(isListening) {
    const card = byId("pixelprix-voice-card");
    const title = byId("pixelprix-voice-title");
    const record = byId("pixelprix-record-name");

    if (card) {
      card.classList.toggle("listening", isListening);
    }

    if (title) {
      title.textContent = isListening ? "Listening 🎶" : "What is this treasure?";
    }

    if (record) {
      record.textContent = isListening ? "STOP" : "RECORD";
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

    if (!treasureNumber) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setStatus("Mic is not available here. Touch still works.");
      speak("Mic is not available here. Touch still works.");

      window.setTimeout(finishAsk, 900);
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

      window.setTimeout(finishAsk, 900);
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
      setStatus("No voice caught. Try again or skip.");
      speak("No voice caught. Try again or skip.");
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
            setStatus("Voice replay saved to treasure " + treasureNumber + ".");
            window.setTimeout(finishAsk, 650);
          });
        }, 180);
      } else {
        setStatus("Voice recorded, but this device storage is full.");
        speak("Voice recorded, but this device storage is full.");
        window.setTimeout(finishAsk, 900);
      }
    });

    reader.readAsDataURL(blob);
  }

  function playLabel(treasureNumber, done) {
    const src = state.labels[String(treasureNumber)];

    if (!src || isSilent()) {
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

  function cueFind(treasureNumber, done) {
    if (isSilent()) {
      if (typeof done === "function") {
        done();
      }

      return;
    }

    speak("Go find treasure " + treasureNumber + ".");

    window.setTimeout(function () {
      playLabel(treasureNumber, done);
    }, 850);
  }

  function ask(treasureNumber, done) {
    loadLabels();
    showVoiceCard(treasureNumber, done);
  }

  function boot() {
    readDom();
    injectStyle();
    readMode();
    loadLabels();
  }

  window.PixelPrixVoice = {
    ask: ask,
    replay: playLabel,
    play: playLabel,
    cueFind: cueFind,
    clear: clearLabels,
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
