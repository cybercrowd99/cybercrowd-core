// js/pixelprix-voice.js
// PixelPrix — Robot Guide + Human Voice Replay Layer
// Owns: robot guide prompts, human treasure voice recording, local save, cleanup replay.
// Does NOT own: camera, room shot, treasure loop, song, robot choice screen, landing page, PING, NET, CORE.
// Contract:
//   Robot guide = PixelPrixVoice.guide()
//   Human recording = PixelPrixVoice.start()
//   Cleanup replay = PixelPrixVoice.cueFind()
// Rule: Robot guides the game. Human voice names the treasure. Cleanup replays the human voice.
// No speech-to-text. No robot guessing the treasure. No robot replacing the kid/family treasure name.

(function () {
  "use strict";

  const VOICE_MODE_KEY = "pixelprixRobotVoice";
  const VOICE_KEY = "pixelprixVoiceLabels.v1";
  const MAX_RECORD_MS = 5000;

  const state = {
    mode: "female",
    labels: {},
    recorder: null,
    stream: null,
    chunks: [],
    activeTreasureNumber: 0,
    stopTimer: null,
    callbacks: null,
    isRecording: false,
    cardDone: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function loadMode() {
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
    return loadMode() === "silent";
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

  function status(message) {
    const helper = byId("helper");
    const cardStatus = byId("pixelprix-voice-status");

    if (helper) {
      helper.textContent = message;
    }

    if (cardStatus) {
      cardStatus.textContent = message;
    }

    if (state.callbacks && typeof state.callbacks.onStatus === "function") {
      state.callbacks.onStatus(message);
    }
  }

  function finishCallbacks() {
    const callbacks = state.callbacks;
    const cardDone = state.cardDone;

    state.callbacks = null;
    state.cardDone = null;
    state.activeTreasureNumber = 0;
    state.isRecording = false;

    removeCard();

    if (callbacks && typeof callbacks.onDone === "function") {
      callbacks.onDone();
      return;
    }

    if (typeof cardDone === "function") {
      cardDone();
    }
  }

  function robotSay(text, after) {
    if (isSilent()) {
      if (typeof after === "function") {
        after();
      }
      return;
    }

    try {
      if (!("speechSynthesis" in window)) {
        if (typeof after === "function") {
          after();
        }
        return;
      }

      window.speechSynthesis.cancel();

      if (window.speechSynthesis.resume) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = loadMode() === "male" ? 0.78 : 1.16;
      utterance.volume = 1;

      let finished = false;

      function finishOnce() {
        if (finished) {
          return;
        }

        finished = true;

        if (typeof after === "function") {
          after();
        }
      }

      utterance.onend = finishOnce;
      utterance.onerror = finishOnce;

      window.speechSynthesis.speak(utterance);

      window.setTimeout(finishOnce, Math.max(1300, text.length * 80));
    } catch (error) {
      if (typeof after === "function") {
        after();
      }
    }
  }

  function guide(key, detail, after) {
    let text = "";

    if (key === "welcome") {
      text = "Welcome to PixelPrix.";
    } else if (key === "adventure") {
      text = "Let's have an adventure.";
    } else if (key === "room") {
      text = "Take the room picture first.";
    } else if (key === "treasure") {
      text = "Look for a treasure.";
    } else if (key === "name") {
      text = "Name this treasure?";
    } else if (key === "record") {
      text = "Record your voice.";
    } else if (key === "saved") {
      text = "Voice saved.";
    } else if (key === "find") {
      text = "Go find treasure " + String(detail || 1) + ".";
    } else {
      text = String(key || "");
    }

    robotSay(text, after);
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

  async function start(treasureNumber, callbacks) {
    loadLabels();

    if (state.isRecording) {
      stop();
      return;
    }

    state.callbacks = callbacks || {};
    state.activeTreasureNumber = Number(treasureNumber) || 0;

    if (!state.activeTreasureNumber) {
      status("No treasure number found.");
      window.setTimeout(finishCallbacks, 400);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      status("Mic is not available here. Voice was skipped.");
      window.setTimeout(finishCallbacks, 900);
      return;
    }

    openMic();
  }

  async function openMic() {
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
      state.recorder = new MediaRecorder(stream, options);
      state.isRecording = true;

      const card = byId("pixelprix-voice-card");
      const title = byId("pixelprix-voice-title");
      const record = byId("pixelprix-record-name");

      if (card) {
        card.classList.add("listening");
      }

      if (title) {
        title.textContent = "Recording";
      }

      if (record) {
        record.textContent = "STOP RECORDING";
      }

      state.recorder.addEventListener("dataavailable", function (event) {
        if (event.data && event.data.size > 0) {
          state.chunks.push(event.data);
        }
      });

      state.recorder.addEventListener("stop", finishRecording);
      state.recorder.start();

      status("Recording. Say the treasure name.");

      state.stopTimer = window.setTimeout(function () {
        stop();
      }, MAX_RECORD_MS);
    } catch (error) {
      cleanupStream();
      status("Mic permission needed. Voice was skipped.");
      window.setTimeout(finishCallbacks, 900);
    }
  }

  function stop() {
    if (state.stopTimer) {
      window.clearTimeout(state.stopTimer);
      state.stopTimer = null;
    }

    if (!state.recorder) {
      cleanupStream();
      return;
    }

    try {
      if (state.recorder.state !== "inactive") {
        state.recorder.stop();
      } else {
        cleanupStream();
      }
    } catch (error) {
      cleanupStream();
      finishCallbacks();
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
    state.isRecording = false;
  }

  function finishRecording() {
    const treasureNumber = state.activeTreasureNumber;
    const blob = new Blob(state.chunks, {
      type: state.chunks[0] ? state.chunks[0].type : "audio/webm"
    });

    cleanupStream();

    if (!blob.size) {
      status("No voice caught. Try again.");
      return;
    }

    status("Saving voice to treasure " + treasureNumber + ".");

    const reader = new FileReader();

    reader.addEventListener("loadend", function () {
      state.labels[String(treasureNumber)] = reader.result;

      if (!saveLabels()) {
        status("Device storage is full. Voice could not save.");
        window.setTimeout(finishCallbacks, 900);
        return;
      }

      status("Voice saved to treasure " + treasureNumber + ".");

      guide("saved", null, function () {
        window.setTimeout(finishCallbacks, 350);
      });
    });

    reader.readAsDataURL(blob);
  }

  function replay(treasureNumber, callback) {
    loadLabels();

    const src = state.labels[String(treasureNumber)];

    if (!src) {
      if (typeof callback === "function") {
        callback();
      }
      return;
    }

    try {
      const audio = new Audio(src);
      audio.volume = 1;

      audio.addEventListener("ended", function () {
        if (typeof callback === "function") {
          callback();
        }
      }, { once: true });

      audio.addEventListener("error", function () {
        if (typeof callback === "function") {
          callback();
        }
      }, { once: true });

      const attempt = audio.play();

      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(function () {
          if (typeof callback === "function") {
            callback();
          }
        });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback();
      }
    }
  }

  function cueFind(treasureNumber, callback) {
    const number = Number(treasureNumber) || 1;

    guide("find", number, function () {
      window.setTimeout(function () {
        replay(number, callback);
      }, 250);
    });
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
        touch-action: manipulation;
        user-select: none;
      }

      .pixelprix-voice-card.listening {
        background: rgba(255, 139, 209, 0.22);
        border-color: rgba(255, 211, 77, 0.72);
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

  function removeCard() {
    const card = byId("pixelprix-voice-card");

    if (card) {
      card.remove();
    }
  }

  function ask(treasureNumber, onDone) {
    injectStyle();
    removeCard();

    const panel = document.querySelector(".panel");

    if (!panel) {
      if (typeof onDone === "function") {
        onDone();
      }
      return;
    }

    state.cardDone = onDone;

    const card = document.createElement("section");
    card.id = "pixelprix-voice-card";
    card.className = "pixelprix-voice-card";
    card.innerHTML = `
      <h2 id="pixelprix-voice-title">Name this treasure</h2>
      <p>Tap RECORD YOUR VOICE. Say the treasure name.</p>
      <div class="pixelprix-voice-status" id="pixelprix-voice-status">
        Voice replay stays on this device.
      </div>
      <div class="pixelprix-voice-actions">
        <button id="pixelprix-record-name" type="button">RECORD YOUR VOICE</button>
        <button class="skip" id="pixelprix-skip-name" type="button">SKIP</button>
      </div>
    `;

    panel.appendChild(card);

    const record = byId("pixelprix-record-name");
    const skip = byId("pixelprix-skip-name");

    guide("name");

    record.addEventListener("click", function () {
      if (state.isRecording) {
        stop();
        return;
      }

      start(treasureNumber, {
        onStatus: status,
        onDone: function () {
          if (typeof onDone === "function") {
            onDone();
          }
        }
      });
    });

    skip.addEventListener("click", function () {
      status("Skipped voice replay.");
      window.setTimeout(finishCallbacks, 300);
    });
  }

  function clear() {
    state.labels = {};

    try {
      localStorage.removeItem(VOICE_KEY);
    } catch (error) {
      saveLabels();
    }
  }

  function labels() {
    loadLabels();
    return Object.assign({}, state.labels);
  }

  window.PixelPrixVoice = {
    guide: guide,
    say: robotSay,
    ask: ask,
    start: start,
    stop: stop,
    replay: replay,
    play: replay,
    cueFind: cueFind,
    clear: clear,
    labels: labels
  };

  window.addEventListener("pagehide", function () {
    stop();

    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (error) {}
  });

  loadMode();
  loadLabels();
})();
