// js/pixelprix-songs.js
// PixelPrix Core — Song Layer
// Owns: optional computer guide songs for PixelPrix game energy.
// Does not own: HTML layout, camera permission, camera capture, mic recording, voice labels, NET, uploads, sync, or accounts.
// Rule: Songs add fun. Songs do not block play. Touch still works.

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
    trayOpen: false,
    currentKey: "",
    lastAutoKey: "",
    playing: false,
    booted: false
  };

  const dom = {
    title: null,
    prompt: null,
    helper: null,
    mainButton: null,
    secondButton: null,
    dock: null,
    toggle: null,
    tray: null,
    status: null
  };

  const audio = new Audio();

  audio.preload = "auto";
  audio.loop = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function readDom() {
    dom.title = byId("title");
    dom.prompt = byId("prompt");
    dom.helper = byId("helper");
    dom.mainButton = byId("main-button");
    dom.secondButton = byId("second-button");
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
    ].join(" ");
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

  function injectStyle() {
    if (byId("pixelprix-songs-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pixelprix-songs-style";
    style.textContent = `
      .pixelprix-song-dock {
        position: fixed;
        top: calc(62px + env(safe-area-inset-top));
        right: 12px;
        z-index: 8;
        width: min(270px, calc(100vw - 24px));
        font-family: Arial, Helvetica, sans-serif;
        pointer-events: none;
      }

      .pixelprix-song-dock * {
        box-sizing: border-box;
      }

      .pixelprix-song-toggle,
      .pixelprix-song-button,
      .pixelprix-song-stop {
        width: 100%;
        border: 0;
        border-radius: 999px;
        color: #050505;
        font: inherit;
        font-weight: 900;
        cursor: pointer;
        touch-action: manipulation;
        box-shadow: 0 5px 0 rgba(0, 0, 0, 0.62);
        pointer-events: auto;
      }

      .pixelprix-song-toggle {
        min-height: 46px;
        padding: 9px 12px;
        background: #6dff91;
        font-size: 0.95rem;
      }

      .pixelprix-song-toggle.off {
        background: #ffd34d;
      }

      .pixelprix-song-tray {
        display: none;
        margin-top: 8px;
        padding: 10px;
        border-radius: 24px;
        background: rgba(5, 6, 10, 0.84);
        border: 2px solid rgba(255, 255, 255, 0.24);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(7px);
        pointer-events: auto;
      }

      .pixelprix-song-dock.open .pixelprix-song-tray {
        display: grid;
        gap: 8px;
      }

      .pixelprix-song-button {
        min-height: 50px;
        padding: 10px;
        background: #7bd4ff;
        font-size: 0.95rem;
      }

      .pixelprix-song-button.pickup {
        background: #ffd34d;
      }

      .pixelprix-song-button.goodnight {
        background: #c79cff;
      }

      .pixelprix-song-stop {
        min-height: 46px;
        padding: 9px;
        background: #ff8bd1;
        font-size: 0.92rem;
      }

      .pixelprix-song-toggle:active,
      .pixelprix-song-button:active,
      .pixelprix-song-stop:active {
        transform: translateY(4px);
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.62);
      }

      .pixelprix-song-status {
        min-height: 20px;
        color: #fff7df;
        font-size: 0.85rem;
        font-weight: 900;
        text-align: center;
        text-shadow: 0 2px 0 #000;
      }

      @media (max-width: 420px) {
        .pixelprix-song-dock {
          top: calc(58px + env(safe-area-inset-top));
          right: 8px;
          width: min(226px, calc(100vw - 16px));
        }

        .pixelprix-song-toggle {
          font-size: 0.86rem;
        }

        .pixelprix-song-button,
        .pixelprix-song-stop {
          font-size: 0.86rem;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function buildDock() {
    if (byId("pixelprix-song-dock")) {
      dom.dock = byId("pixelprix-song-dock");
      dom.toggle = byId("pixelprix-song-toggle");
      dom.tray = byId("pixelprix-song-tray");
      dom.status = byId("pixelprix-song-status");
      return;
    }

    const dock = document.createElement("section");
    dock.id = "pixelprix-song-dock";
    dock.className = "pixelprix-song-dock";
    dock.innerHTML = `
      <button class="pixelprix-song-toggle" id="pixelprix-song-toggle" type="button">
        🎵 Songs
      </button>

      <div class="pixelprix-song-tray" id="pixelprix-song-tray">
        <button class="pixelprix-song-button" type="button" data-pixelprix-song="funBuddy">
          🎵 Fun Buddy
        </button>

        <button class="pixelprix-song-button pickup" type="button" data-pixelprix-song="pickUp">
          🛏️ Pick It Up
        </button>

        <button class="pixelprix-song-button goodnight" type="button" data-pixelprix-song="goodNight">
          🌙 GoodNight
        </button>

        <button class="pixelprix-song-stop" id="pixelprix-song-stop" type="button">
          Stop Song
        </button>

        <div class="pixelprix-song-status" id="pixelprix-song-status">
          Songs add fun. Touch still works.
        </div>
      </div>
    `;

    document.body.appendChild(dock);

    dom.dock = dock;
    dom.toggle = byId("pixelprix-song-toggle");
    dom.tray = byId("pixelprix-song-tray");
    dom.status = byId("pixelprix-song-status");
  }

  function setStatus(text) {
    if (dom.status) {
      dom.status.textContent = text;
    }
  }

  function updateDock() {
    if (!dom.dock || !dom.toggle) {
      return;
    }

    dom.dock.classList.toggle("open", state.trayOpen);
    dom.toggle.classList.toggle("off", !state.enabled || !state.playing);

    if (!state.enabled) {
      dom.toggle.textContent = "▶ Songs off";
      return;
    }

    if (state.playing && state.currentKey && SONGS[state.currentKey]) {
      dom.toggle.textContent = "🎵 " + SONGS[state.currentKey].shortLabel;
      return;
    }

    dom.toggle.textContent = "🎵 Songs";
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);
    savePreference();

    if (!state.enabled) {
      stopSong("Songs off. Touch still works.");
    }

    updateDock();
  }

  function stopSong(statusText) {
    audio.pause();
    audio.currentTime = 0;

    state.playing = false;
    state.currentKey = "";

    setStatus(statusText || "Song stopped.");
    updateDock();
  }

  function playSong(key, reason) {
    const song = SONGS[key];

    if (!song) {
      return;
    }

    state.enabled = true;
    savePreference();

    if (state.currentKey !== key) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = song.url;
      state.currentKey = key;
    }

    const attempt = audio.play();

    if (attempt && typeof attempt.then === "function") {
      attempt.then(function () {
        state.playing = true;
        setStatus((reason ? reason + ": " : "") + song.label);
        updateDock();
      }).catch(function () {
        state.playing = false;
        setStatus("Tap the song button again to play.");
        updateDock();
      });
    } else {
      state.playing = true;
      setStatus(song.label);
      updateDock();
    }
  }

  function toggleTray() {
    state.trayOpen = !state.trayOpen;
    updateDock();
  }

  function autoSongForScreen() {
    if (!state.enabled) {
      return;
    }

    const text = screenText().toLowerCase();

    if (text.indexOf("adventure done") !== -1) {
      autoPlayOnce("goodNight", "GoodNight");
      return;
    }

    if (
      text.indexOf("find treasure") !== -1 ||
      text.indexOf("found it") !== -1 ||
      text.indexOf("clean-up hunt") !== -1 ||
      text.indexOf("move it home") !== -1
    ) {
      autoPlayOnce("pickUp", "Pick it up");
      return;
    }

    if (
      text.indexOf("open camera") !== -1 ||
      text.indexOf("game board") !== -1 ||
      text.indexOf("tiny tidy") !== -1 ||
      text.indexOf("treasure") !== -1
    ) {
      autoPlayOnce("funBuddy", "Fun Buddy");
    }
  }

  function autoPlayOnce(key, reason) {
    if (!state.enabled) {
      return;
    }

    if (state.lastAutoKey === key && state.playing) {
      return;
    }

    state.lastAutoKey = key;
    playSong(key, reason);
  }

  function hookDock() {
    if (dom.toggle) {
      dom.toggle.addEventListener("click", function () {
        toggleTray();
      });
    }

    document.querySelectorAll("[data-pixelprix-song]").forEach(function (button) {
      button.addEventListener("click", function () {
        const key = button.getAttribute("data-pixelprix-song");
        playSong(key, "Manual");
      });
    });

    const stop = byId("pixelprix-song-stop");

    if (stop) {
      stop.addEventListener("click", function () {
        setEnabled(false);
      });
    }
  }

  function hookGameButtons() {
    if (dom.mainButton) {
      dom.mainButton.addEventListener("click", function () {
        if (state.enabled && !state.playing && !state.currentKey) {
          playSong("funBuddy", "Fun Buddy");
        }

        window.setTimeout(autoSongForScreen, 260);
      });
    }

    if (dom.secondButton) {
      dom.secondButton.addEventListener("click", function () {
        const text = readText(dom.secondButton).toLowerCase();

        if (text.indexOf("clear") !== -1 || text.indexOf("home") !== -1) {
          stopSong("Song stopped.");
        }
      });
    }
  }

  function hookScreenWatchers() {
    const watchTargets = [dom.title, dom.prompt, dom.helper, dom.mainButton];

    watchTargets.forEach(function (target) {
      if (!target || !window.MutationObserver) {
        return;
      }

      const observer = new MutationObserver(function () {
        window.setTimeout(autoSongForScreen, 160);
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
      updateDock();
    });

    audio.addEventListener("pause", function () {
      state.playing = false;
      updateDock();
    });

    audio.addEventListener("ended", function () {
      state.playing = false;
      state.currentKey = "";
      setStatus("Song finished.");
      updateDock();
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
    injectStyle();
    buildDock();
    hookAudio();
    hookDock();
    hookGameButtons();
    hookScreenWatchers();
    updateDock();
  }

  window.PixelPrixSongs = {
    play: playSong,
    stop: stopSong,
    off: function () {
      setEnabled(false);
    },
    on: function () {
      setEnabled(true);
      playSong("funBuddy", "Fun Buddy");
    },
    songs: function () {
      return Object.assign({}, SONGS);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
