// Entry point: owns state, wires storage, board and the day rollover.

import { boardDate, msUntilNextBoardDay } from './day.js';
import { createStore } from './store.js';
import { boardColumns } from './view.js';
import { renderBoard } from './board.js';

const boardRoot = document.getElementById('board');

const store = createStore(window.localStorage);
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

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') refreshDay();
});
window.addEventListener('pageshow', function () { refreshDay(); });
setInterval(function () {
  if (boardDate(new Date()) !== today) refreshDay();
}, 60 * 1000);

refreshDay();
