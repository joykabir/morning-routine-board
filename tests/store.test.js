import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, CONFIG_KEY, DONE_KEY } from '../src/store.js';
import { defaultConfig, CONFIG_VERSION } from '../src/model.js';

const fake = () => { const m = new Map(); return {
  getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
  removeItem: k => m.delete(k), map: m }; };

test('loadConfig returns the default config when nothing is stored', () =>
  assert.deepEqual(createStore(fake()).loadConfig().kids.map(k => k.name), ['Kid 1', 'Kid 2']));
test('saveConfig round-trips', () => {
  const s = createStore(fake()); const c = defaultConfig(); c.kids[0].name = 'Maya';
  s.saveConfig(c); assert.deepEqual(s.loadConfig(), c);
});
test('corrupt JSON falls back to defaults', () => {
  const f = fake(); f.setItem(CONFIG_KEY, '{not json');
  assert.equal(createStore(f).loadConfig().version, CONFIG_VERSION);
});
test('unknown version falls back to defaults', () => {
  const f = fake(); f.setItem(CONFIG_KEY, JSON.stringify({ version: 99, kids: [] }));
  assert.equal(createStore(f).loadConfig().kids.length, 2);
});
test('loadDone returns check-offs only for the stored date', () => {
  const s = createStore(fake());
  s.saveDone('2026-10-08', { a: true });
  assert.deepEqual(s.loadDone('2026-10-08'), { a: true });
  assert.deepEqual(s.loadDone('2026-10-09'), {});
});
test('saveDone for a new date discards the old day', () => {
  const f = fake(); const s = createStore(f);
  s.saveDone('2026-10-08', { a: true }); s.saveDone('2026-10-09', { b: true });
  assert.deepEqual(JSON.parse(f.getItem(DONE_KEY)), { date: '2026-10-09', done: { b: true } });
});
test('clearAll removes both keys', () => {
  const f = fake(); const s = createStore(f);
  s.saveConfig(defaultConfig()); s.saveDone('2026-10-08', {}); s.clearAll();
  assert.equal(f.getItem(CONFIG_KEY), null); assert.equal(f.getItem(DONE_KEY), null);
});
test('a storage that throws on setItem does not break load or save', () => {
  const f = fake(); f.setItem = () => { throw new Error('quota'); };
  const s = createStore(f);
  assert.doesNotThrow(() => s.saveConfig(defaultConfig()));
  assert.doesNotThrow(() => s.saveDone('2026-10-08', {}));
  assert.equal(s.loadConfig().kids.length, 2);
});
test('loadConfig persists the defaults so ids are stable across loads', () => {
  const f = fake(); const s = createStore(f);
  const first = s.loadConfig();
  assert.deepEqual(createStore(f).loadConfig(), first);
  assert.ok(f.getItem(CONFIG_KEY));
});
