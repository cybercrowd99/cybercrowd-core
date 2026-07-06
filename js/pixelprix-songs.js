// js/pixelprix-songs.js
// PixelPrix Core — Song Layer
// Owns: optional computer guide songs for PixelPrix game energy.
// Does not own: HTML layout, camera permission, camera capture, mic recording, voice labels, describe layer, lingo layer, NET, uploads, sync, accounts, analytics, or provider transport.
// Rule: Songs add fun. Songs do not block play. Touch still works.
// One-action rule: This layer adds no visible buttons. The big game button remains the only road.

(function () {
  "use strict";

  const STORAGE_KEY = "pixelprixSongs.enabled.v1";

  const SONGS = {
    funBuddy: {
      label: "Fun Buddy",
      shortLabel: "Fun Buddy",
      url: "https://pub-660d879738134ba990d1708d015ec763.r2.dev/PixelPree%20Fun%20Buddy60s._title-htlm.mp3"
    },

    pickUp: {
      label: "Ready for Bed / Pick It Up",
      shortLabel: "Pick It Up",
      url: "https://pub-660d879738134ba990d1708d015ec763.r2.dev/PixelPree%20Fun%20goodnight_60s_title-html.mp3"
    },

    goodNight: {
      label: "GoodNight",
      shortLabel: "GoodNight",
      url: "https://pub-660d879738134ba990d1708d015ec763.r2.dev/PixelPree%20GoodNight.60s._title-html.mp3"
    }
  };

  const state = {
    enabled: true,
    unlocked: false,
    currentKey: "",
    wantedKey: "funBuddy",
    playing: false,
    booted: false,
    retryTimer: null
  };

  const dom = {
    title: null,
    prompt: null,
    helper: null,
    mainButton: null
  };

  const audio = new Audio();

  audio.preload = "auto";
  audio.loop = true;
  audio.volume = 0.52;

  function byId(id) {
    return document.getElementById(id);
  }

  function readDom() {
    dom.title = byId("title");
    dom.prompt = byId("prompt");
    dom.helper = byId("helper");
    dom.mainButton = byId("main-button");
  }

  function readText(node) {
    return node && node.textContent ? node.textContent.trim() : "";
  }

  function screenText() {
    return [
      readText(dom.title),
      readText(dom.prompt),
      readText(dom.helper),
      dom.mainButton ? readText(dom.mainButton) : ""
    ].join(" ").toLowerCase();
  }

  function loadPreference() {
    try {
      state.enabled = localStorage.getItem(STORAGE_KEY) !== "off";
    } catch (error) {
      state.enabled = true;
    }
  }

  function savePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, state.enabled ? "on" : "off");
    } catch (error) {}
  }

  function stopSong() {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {}

    state.playing = false;
    state.currentKey = "";
  }

  function chooseSongForScreen() {
    const text = screenText();

    if (
      text.indexOf("adventure done") !== -1 ||
      text.indexOf("play again") !== -1 ||
      text.indexOf("great job") !== -1
    ) {
      return "goodNight";
    }

    if (
      text.indexOf("find it") !== -1 ||
      text.indexOf("find treasure") !== -1 ||
      text.indexOf("found it") !== -1 ||
      text.indexOf("clean-up hunt") !== -1 ||
      text.indexOf("clean up") !== -1 ||
      text.indexOf("move it home") !== -1 ||
      text.indexOf("play clean up") !== -1
    ) {
      return "pickUp";
    }

    return "funBuddy";
  }

  function playSong(key) {
    const song = SONGS[key];

    if (!song || !state.enabled) {
      return;
    }

    state.wantedKey = key;

    if (!state.unlocked) {
      return;
    }

    if (state.currentKey !== key) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = song.url;
      } catch (error) {}

      state.currentKey = key;
    }

    const attempt = audio.play();

    if (attempt && typeof attempt.then === "function") {
      attempt.then(function () {
        state.playing = true;
      }).catch(function () {
        state.playing = false;
        scheduleRetry();
      });
    } else {
      state.playing = true;
    }
  }

  function scheduleRetry() {
    if (state.retryTimer) {
      return;
    }

    state.retryTimer = window.setTimeout(function () {
      state.retryTimer = null;

      if (state.enabled && state.unlocked && state.wantedKey) {
        playSong(state.wantedKey);
      }
    }, 350);
  }

  function unlockAudio() {
    state.unlocked = true;

    if (!state.enabled) {
      return;
    }

    playSong(state.wantedKey || chooseSongForScreen());
  }

  function syncSongToGame() {
    if (!state.enabled) {
      stopSong();
      return;
    }

    const key = chooseSongForScreen();
    state.wantedKey = key;

    if (state.unlocked) {
      playSong(key);
    }
  }

  function hookOneActionRoad() {
    if (dom.mainButton) {
      dom.mainButton.addEventListener("click", function () {
        unlockAudio();
        window.setTimeout(syncSongToGame, 160);
      });
    }

    document.addEventListener(
      "pointerdown",
      function () {
        unlockAudio();
      },
      { once: true, passive: true }
    );

    document.addEventListener(
      "touchstart",
      function () {
        unlockAudio();
      },
      { once: true, passive: true }
    );
  }

  function hookScreenWatchers() {
    const watchTargets = [dom.title, dom.prompt, dom.helper, dom.mainButton];

    watchTargets.forEach(function (target) {
      if (!target || !window.MutationObserver) {
        return;
      }

      const observer = new MutationObserver(function () {
        window.setTimeout(syncSongToGame, 160);
      });

      observer.observe(target, {
        childList: true,
        characterData: true,
        subtree: true
      });
    });
  }

  function hookAudio() {
    audio.addEventListener("play", function () {
      state.playing = true;
    });

    audio.addEventListener("pause", function () {
      state.playing = false;
    });

    audio.addEventListener("ended", function () {
      state.playing = false;
      state.currentKey = "";
    });
  }

  function boot() {
    if (state.booted) {
      return;
    }

    readDom();

    if (!dom.mainButton || !dom.prompt) {
      return;
    }

    state.booted = true;

    loadPreference();
    hookAudio();
    hookOneActionRoad();
    hookScreenWatchers();

    state.wantedKey = chooseSongForScreen();
    syncSongToGame();
  }

  window.PixelPrixSongs = {
    play: function (key) {
      if (!SONGS[key]) {
        return false;
      }

      state.enabled = true;
      state.unlocked = true;
      savePreference();
      playSong(key);
      return true;
    },

    stop: function () {
      state.enabled = false;
      savePreference();
      stopSong();
    },

    off: function () {
      state.enabled = false;
      savePreference();
      stopSong();
    },

    on: function () {
      state.enabled = true;
      savePreference();
      unlockAudio();
    },

    current: function () {
      return {
        enabled: state.enabled,
        unlocked: state.unlocked,
        currentKey: state.currentKey,
        wantedKey: state.wantedKey,
        playing: state.playing
      };
    },

    songs: function () {
      return Object.assign({}, SONGS);
    }
  };

  window.addEventListener("pagehide", stopSong);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
