// js/pixelprix-voice.js
// PixelPrix — Robot Guide + Human Voice Replay Layer
// Owns: short robot guide prompts, recording the kid/family treasure voice, saving it to a treasure number, replaying it during cleanup.
// Does NOT own: camera, room shot, treasure loop, song, robot choice screen, PING, NET, CORE.
// Rule: Robot guides the game. Human voice names the treasure. Cleanup replays the human voice.
// No speech-to-text. No robot guessing the object. No robot replacing the kid/family treasure name.

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
    isRecording: false
  };

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
    if (state.callbacks && typeof state.callbacks.onStatus === "function") {
      state.callbacks.onStatus(message);
    }
  }

  function done() {
    const callbacks = state.callbacks;

    state.callbacks = null;
    state.activeTreasureNumber = 0;
    state.isRecording = false;

    if (callbacks && typeof callbacks.onDone === "function") {
      callbacks.onDone();
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

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = loadMode() === "male" ? 0.82 : 1.12;

      utterance.onend = function () {
        if (typeof after === "function") {
          after();
        }
      };

      utterance.onerror = function () {
        if (typeof after === "function") {
          after();
        }
      };

      window.speechSynthesis.speak(utterance);
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
    }

    if (key === "adventure") {
      text = "Let's have an adventure.";
    }

    if (key === "room") {
      text = "Take the room picture first.";
    }

    if (key === "treasure") {
      text = "Look for a treasure.";
    }

    if (key === "name") {
      text = "Name this treasure?";
    }

    if (key === "record") {
      text = "Record your voice.";
    }

    if (key === "saved") {
      text = "Voice saved.";
    }

    if (key === "find") {
      text = "Go find treasure " + String(detail || 1) + ".";
    }

    if (!text) {
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
      window.setTimeout(done, 400);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      status("Mic is not available here. Voice was skipped.");
      window.setTimeout(done, 900);
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
      state.recorder = new MediaRecorder(stream, options);
      state.isRecording = true;

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
      window.setTimeout(done, 900);
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
      done();
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
        window.setTimeout(done, 900);
        return;
      }

      status("Voice saved to treasure " + treasureNumber + ".");

      guide("saved", null, function () {
        window.setTimeout(done, 350);
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
