// Storage layer. Wraps anything with the localStorage shape (getItem /
// setItem / removeItem). Every call is defensive: a missing, corrupt or
// unknown-version value yields the defaults, and a storage that throws
// (private mode, quota) is silently ignored so the board keeps working for
// the session.

import { defaultConfig, CONFIG_VERSION } from './model.js';

export const CONFIG_KEY = 'mrb.config';
export const DONE_KEY = 'mrb.done';

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Ignore: storage unavailable or full. The in-memory state still works.
  }
}

function remove(storage, key) {
  try {
    storage.removeItem(key);
  } catch (e) {
    // Ignore.
  }
}

export function createStore(storage) {
  return {
    loadConfig: function () {
      const parsed = readJson(storage, CONFIG_KEY);
      if (!parsed || parsed.version !== CONFIG_VERSION || !Array.isArray(parsed.kids)) {
        return defaultConfig();
      }
      return parsed;
    },
    saveConfig: function (config) {
      writeJson(storage, CONFIG_KEY, config);
    },
    loadDone: function (dateStr) {
      const parsed = readJson(storage, DONE_KEY);
      if (!parsed || parsed.date !== dateStr || typeof parsed.done !== 'object' || parsed.done === null) {
        return {};
      }
      return parsed.done;
    },
    saveDone: function (dateStr, done) {
      writeJson(storage, DONE_KEY, { date: dateStr, done: done });
    },
    clearAll: function () {
      remove(storage, CONFIG_KEY);
      remove(storage, DONE_KEY);
    }
  };
}
