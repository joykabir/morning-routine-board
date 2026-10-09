// Entry point: owns state, wires storage, board, settings and the day rollover.

import { boardDate, msUntilNextBoardDay } from './day.js';
import { createStore, safeStorage } from './store.js';
import { boardColumns } from './view.js';
import { renderBoard } from './board.js';
import { renderSettings } from './settings.js';

const boardRoot = document.getElementById('board');
const settingsRoot = document.getElementById('settings');
const gear = document.getElementById('gear');

const store = createStore(safeStorage(function () { return window.localStorage; }));
let config = store.loadConfig();
let today = boardDate(new Date());
let done = store.loadDone(today);
let rolloverTimer = null;

function render() {
  renderBoard(boardRoot, boardColumns(config, done, today), toggle);
}

function toggle(taskId) {
  if (done[taskId]) {
    delete done[taskId];
  } else {
    done[taskId] = true;
  }
  store.saveDone(today, done);
  render();
}

function refreshDay() {
  today = boardDate(new Date());
  done = store.loadDone(today);
  render();
  if (rolloverTimer !== null) clearTimeout(rolloverTimer);
  rolloverTimer = setTimeout(refreshDay, msUntilNextBoardDay(new Date()));
}

// ---- Settings ----

function pruneDone() {
  const live = {};
  config.kids.forEach(function (kid) {
    kid.tasks.forEach(function (task) { live[task.id] = true; });
  });
  Object.keys(done).forEach(function (id) {
    if (!live[id]) delete done[id];
  });
}

const settingsHandlers = {
  onChange: function (newConfig) {
    config = newConfig;
    store.saveConfig(config);
    pruneDone();
    store.saveDone(today, done);
    renderSettings(settingsRoot, config, settingsHandlers);
  },
  onDone: function () {
    settingsRoot.hidden = true;
    boardRoot.hidden = false;
    gear.hidden = false;
    render();
  },
  onReset: function () {
    store.clearAll();
    config = store.loadConfig();
    done = store.loadDone(today);
    settingsHandlers.onDone();
  }
};

function openSettings() {
  boardRoot.hidden = true;
  gear.hidden = true;
  settingsRoot.hidden = false;
  settingsRoot.scrollTop = 0;
  renderSettings(settingsRoot, config, settingsHandlers);
}

// Calls fn only after the element has been held for `ms`. A plain tap does
// nothing. Touch and mouse are both handled so it works on the iPad and on a
// desktop browser.
export function longPress(el, ms, fn) {
  let timer = null;
  function start(e) {
    if (e.type === 'touchstart') e.preventDefault();
    cancel();
    timer = setTimeout(function () { timer = null; fn(); }, ms);
  }
  function cancel() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }
  el.addEventListener('touchstart', start, { passive: false });
  el.addEventListener('touchend', cancel);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);
}

longPress(gear, 2000, openSettings);

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') refreshDay();
});
window.addEventListener('pageshow', function () { refreshDay(); });
setInterval(function () {
  if (boardDate(new Date()) !== today) refreshDay();
}, 60 * 1000);

refreshDay();

if ('serviceWorker' in navigator) {
  // Offline caching is a nicety; the board works without it. The promise
  // rejects on a plain-HTTP preview, so swallow that too.
  navigator.serviceWorker.register('./sw.js').catch(function () {});
}
