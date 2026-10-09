# Morning Routine Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single static web page, run on a wall-mounted iPad, that shows two kids their remaining morning tasks as big emoji tiles they tap off themselves, resetting every morning, with a hidden settings screen for the parent.

**Architecture:** Plain ES modules with no build step. Pure logic (day boundary, config model, storage, board view-model) lives in small modules under `src/` and is unit-tested with Node's built-in test runner. Two thin DOM modules (board, settings) render from those, and `src/app.js` wires them to `localStorage`, the long-press gear, and the day rollover. A service worker and manifest make it an offline Home Screen app on iPad Safari. Deployed to GitHub Pages.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), `localStorage`, service worker, Node 22 `node --test` for tests, GitHub Pages for hosting. Zero npm dependencies.

**Spec:** `docs/superpowers/specs/2026-10-09-morning-routine-board-design.md`

## Global Constraints

- No framework, no build step, no server-side code, no npm dependencies (a `package.json` exists only to run `node --test`).
- Target is an older iPad running Safari. Write JavaScript that runs on Safari 12: no optional chaining (`?.`), no nullish coalescing (`??`), no class fields, no `Array.prototype.at`, no `String.prototype.replaceAll`, no `structuredClone`, no `crypto.randomUUID`. ES modules and `const`/`let`/arrow functions are fine.
- All URLs in HTML, CSS, the manifest and the service worker are relative (`./x`), never root-relative, so the page works under the GitHub Pages subdirectory.
- Data lives only in `localStorage` under keys `mrb.config` and `mrb.done`. Nothing is ever sent to a server.
- Board-day starts at 03:00 local time. Weekday toggles default Mon–Fri on, Sat–Sun off.
- Settings opens by holding the gear for 2000 ms. A plain tap does nothing.
- Copy fixed by the spec: column shows "All done" with a big check when every task is done; "Nothing today" when there are no tasks for today.
- No streaks, scores, history, rewards, or anything about previous days, anywhere in the UI or the stored data.
- Every commit message ends with these two lines:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XdY797UqS6HAQGFRKrKU2V
  ```

## Review Focus

- **02:xx on the morning clocks change** (DST). Board date must be computed from the local calendar date and hour, never by subtracting 3 hours of milliseconds, so 02:30 always belongs to the previous board-day. Test in Task 1.
- **Stored JSON is missing, corrupt, or from an unknown version.** The board must come up with the default config, never a blank or broken screen. Test in Task 3.
- **`localStorage` throws** (Safari private mode, quota). Saving must fail quietly and the board must keep working for the session. Test in Task 3.
- **The iPad slept overnight with the page open.** When the page becomes visible again on a new board-day, every tile must show undone without a reload. Covered by Task 3's date-keyed `loadDone` and Task 5's visibility handler; manual check in Task 5.
- **A task with a blank or whitespace label, or a task removed while checked off.** Blank labels are rejected; removing a task drops its check-off. Tests in Task 2 and Task 6.

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | `"type": "module"`, `test` script only |
| `src/day.js` | Board-day boundary: date string for a given clock time, weekday index, ms until next board-day |
| `src/model.js` | Config shape, defaults, id generation, pure operations on kids and tasks |
| `src/store.js` | `localStorage` wrapper with injectable storage; load/save config and today's check-offs |
| `src/view.js` | Pure view-model: turns config + check-offs + date into per-kid columns |
| `src/emoji.js` | The fixed emoji palette |
| `src/board.js` | Renders board columns into the DOM, reports taps |
| `src/settings.js` | Renders the settings screen, reports config changes |
| `src/app.js` | Entry point: state, wiring, long-press gear, day rollover, service worker registration |
| `index.html`, `style.css` | Page shell and all styling |
| `manifest.webmanifest`, `sw.js` | Home Screen install and offline cache |
| `tests/*.test.js` | One test file per pure module |
| `README.md` | iPad setup steps and how to deploy |

Data shapes (used by every task):

```js
// Config
{ version: 1,
  kids: [ { id: string, name: string, color: string /* CSS color */, avatar: string /* emoji */,
            tasks: [ { id: string, label: string, emoji: string, days: boolean[7] /* Mon..Sun */ } ] } ] }
// Done (today's check-offs)
{ date: 'YYYY-MM-DD', done: { [taskId]: true } }
// Column (view-model)
{ kid: Kid, state: 'tasks' | 'all-done' | 'nothing', tiles: [ { task: Task, done: boolean } ] }
```

---

### Task 1: Project scaffold and board-day logic

**Files:**
- Create: `package.json`, `.gitignore`, `src/day.js`
- Test: `tests/day.test.js`

**Interfaces:**
- Produces: `DAY_START_HOUR = 3`; `boardDate(now: Date): string` returning local `YYYY-MM-DD` of the board-day containing `now`; `weekdayIndex(dateStr: string): number` with Monday = 0 … Sunday = 6; `msUntilNextBoardDay(now: Date): number`.

- [ ] **Step 1: Create `package.json` and `.gitignore`**

`package.json`: `{ "name": "morning-routine-board", "private": true, "type": "module", "scripts": { "test": "node --test tests/" } }`. `.gitignore`: `node_modules/`, `.DS_Store`.

- [ ] **Step 2: Write the failing tests**

```js
// tests/day.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardDate, weekdayIndex, msUntilNextBoardDay, DAY_START_HOUR } from '../src/day.js';

test('DAY_START_HOUR is 3', () => assert.equal(DAY_START_HOUR, 3));
test('07:30 belongs to the same calendar day', () =>
  assert.equal(boardDate(new Date(2026, 9, 8, 7, 30)), '2026-10-08'));
test('02:59 belongs to the previous day', () =>
  assert.equal(boardDate(new Date(2026, 9, 8, 2, 59)), '2026-10-07'));
test('03:00 belongs to the same day', () =>
  assert.equal(boardDate(new Date(2026, 9, 8, 3, 0)), '2026-10-08'));
test('23:30 stays on its own day', () =>
  assert.equal(boardDate(new Date(2026, 9, 8, 23, 30)), '2026-10-08'));
test('01:00 on the 1st rolls back across a month boundary', () =>
  assert.equal(boardDate(new Date(2026, 10, 1, 1, 0)), '2026-10-31'));
test('02:30 on the US fall-back day still maps to the previous day', () =>
  assert.equal(boardDate(new Date(2026, 10, 1, 2, 30)), '2026-10-31'));
test('weekdayIndex: 2026-10-08 is a Thursday', () => assert.equal(weekdayIndex('2026-10-08'), 3));
test('weekdayIndex: 2026-10-11 is a Sunday', () => assert.equal(weekdayIndex('2026-10-11'), 6));
test('weekdayIndex: 2026-10-12 is a Monday', () => assert.equal(weekdayIndex('2026-10-12'), 0));
test('msUntilNextBoardDay from 02:00 is one hour', () =>
  assert.equal(msUntilNextBoardDay(new Date(2026, 9, 8, 2, 0)), 60 * 60 * 1000));
test('msUntilNextBoardDay from 03:00 is a full day', () =>
  assert.equal(msUntilNextBoardDay(new Date(2026, 9, 8, 3, 0)), 24 * 60 * 60 * 1000));
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/day.js`.

- [ ] **Step 4: Implement `src/day.js`**

`boardDate` copies `now`, and if `getHours() < DAY_START_HOUR` calls `setDate(getDate() - 1)`, then formats local year/month/day with zero padding. Never subtract milliseconds. `weekdayIndex` parses the string into a local `Date` via `new Date(y, m - 1, d)` and maps `getDay()` so Monday is 0. `msUntilNextBoardDay` builds the next local 03:00 (today if `now` is before it, else tomorrow) and returns the difference.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all 12 pass.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore src/day.js tests/day.test.js
git commit -m "feat: board-day boundary logic"
```

---

### Task 2: Config model

**Files:**
- Create: `src/model.js`
- Test: `tests/model.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `CONFIG_VERSION = 1`; `WEEKDAYS = [true,true,true,true,true,false,false]`; `DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']`; `newId(): string`; `defaultConfig(): Config`; `createTask(label: string, emoji: string, days?: boolean[]): Task` (throws `Error('label required')` on blank); `tasksForDay(kid: Kid, weekday: number): Task[]`; and immutable config operations `updateKid(config, kidId, patch): Config`, `addTask(config, kidId, task): Config`, `removeTask(config, taskId): Config`, `updateTask(config, taskId, patch): Config`, `moveTask(config, taskId, delta: -1 | 1): Config`. Every operation returns a new config and never mutates its input.

- [ ] **Step 1: Write the failing tests**

```js
// tests/model.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, createTask, tasksForDay, updateKid, addTask, removeTask,
         updateTask, moveTask, newId, WEEKDAYS, CONFIG_VERSION } from '../src/model.js';

test('default config has two placeholder kids with tasks', () => {
  const c = defaultConfig();
  assert.equal(c.version, CONFIG_VERSION);
  assert.equal(c.kids.length, 2);
  assert.deepEqual(c.kids.map(k => k.name), ['Kid 1', 'Kid 2']);
  for (const k of c.kids) {
    assert.ok(k.tasks.length >= 4);
    for (const t of k.tasks) assert.deepEqual(t.days, WEEKDAYS);
  }
});
test('newId is unique', () => assert.notEqual(newId(), newId()));
test('createTask trims the label and defaults days to weekdays', () => {
  const t = createTask('  Brush teeth ', '🪥');
  assert.equal(t.label, 'Brush teeth');
  assert.equal(t.emoji, '🪥');
  assert.deepEqual(t.days, WEEKDAYS);
  assert.ok(t.id);
});
test('createTask rejects a blank label', () =>
  assert.throws(() => createTask('   ', '🪥'), /label required/));
test('tasksForDay keeps config order and filters by weekday', () => {
  const thu = createTask('Swim kit', '🩱', [false,false,false,true,false,false,false]);
  const kid = { id: 'k', name: 'A', color: '#000', avatar: '🦊',
                tasks: [createTask('Dress', '👕'), thu, createTask('Dog', '🐶')] };
  assert.deepEqual(tasksForDay(kid, 3).map(t => t.label), ['Dress', 'Swim kit', 'Dog']);
  assert.deepEqual(tasksForDay(kid, 0).map(t => t.label), ['Dress', 'Dog']);
  assert.deepEqual(tasksForDay(kid, 5), []);
});
test('updateKid patches one kid without mutating the input', () => {
  const c = defaultConfig();
  const out = updateKid(c, c.kids[0].id, { name: 'Maya' });
  assert.equal(out.kids[0].name, 'Maya');
  assert.equal(c.kids[0].name, 'Kid 1');
  assert.equal(out.kids[1], c.kids[1]);
});
test('addTask appends to the right kid', () => {
  const c = defaultConfig();
  const t = createTask('Shoes', '👟');
  const out = addTask(c, c.kids[1].id, t);
  assert.equal(out.kids[1].tasks[out.kids[1].tasks.length - 1], t);
  assert.equal(out.kids[0].tasks.length, c.kids[0].tasks.length);
});
test('removeTask and updateTask find a task by id across kids', () => {
  const c = defaultConfig();
  const target = c.kids[1].tasks[0];
  assert.ok(!removeTask(c, target.id).kids[1].tasks.some(t => t.id === target.id));
  assert.equal(updateTask(c, target.id, { emoji: '🎒' }).kids[1].tasks[0].emoji, '🎒');
});
test('moveTask moves within a kid and clamps at the ends', () => {
  const c = defaultConfig();
  const [a, b] = c.kids[0].tasks;
  assert.deepEqual(moveTask(c, b.id, -1).kids[0].tasks.slice(0, 2).map(t => t.id), [b.id, a.id]);
  assert.equal(moveTask(c, a.id, -1), c);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/model.js`.

- [ ] **Step 3: Implement `src/model.js`**

`defaultConfig()` returns two kids (`Kid 1` fox 🦊 in one color, `Kid 2` panda 🐼 in another) each with the same five default tasks: Get dressed 👕, Brush teeth 🪥, Eat breakfast 🥣, Pack bag 🎒, Feed the dog 🐶, all on `WEEKDAYS`. Every task and kid gets a fresh `newId()`. `newId` is `Date.now().toString(36) + Math.random().toString(36).slice(2, 8)`. `moveTask` returns the same config object when the move would go out of range.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/model.js tests/model.test.js
git commit -m "feat: config model with kids and tasks"
```

---

### Task 3: Storage layer

**Files:**
- Create: `src/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: `defaultConfig`, `CONFIG_VERSION` from `src/model.js`.
- Produces: `CONFIG_KEY = 'mrb.config'`, `DONE_KEY = 'mrb.done'`; `createStore(storage): Store` where `storage` is anything with `getItem(key)`, `setItem(key, value)`, `removeItem(key)` (i.e. `localStorage` or a test fake). `Store` has `loadConfig(): Config`, `saveConfig(config): void`, `loadDone(dateStr): { [taskId]: true }`, `saveDone(dateStr, done): void`, `clearAll(): void`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/store.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/store.js`.

- [ ] **Step 3: Implement `src/store.js`**

Every `getItem`/`setItem`/`removeItem` call and every `JSON.parse` is wrapped in try/catch; failures return the default (`defaultConfig()` or `{}`) or are silently ignored. `loadConfig` also treats a parsed object whose `version !== CONFIG_VERSION` or whose `kids` is not an array as corrupt.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/store.js tests/store.test.js
git commit -m "feat: localStorage store for config and daily check-offs"
```

---

### Task 4: Board view-model

**Files:**
- Create: `src/view.js`
- Test: `tests/view.test.js`

**Interfaces:**
- Consumes: `tasksForDay` from `src/model.js`, `weekdayIndex` from `src/day.js`.
- Produces: `boardColumns(config: Config, done: { [taskId]: true }, dateStr: string): Column[]`, one column per kid in config order. `tiles` lists undone tasks first (config order) then done tasks (config order). `state` is `'nothing'` when there are no tasks today, `'all-done'` when every task is done, else `'tasks'`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/view.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardColumns } from '../src/view.js';
import { createTask } from '../src/model.js';

const t = (label, days) => createTask(label, '⭐', days);
const kid = (tasks) => ({ id: 'k', name: 'A', color: '#000', avatar: '🦊', tasks });
const THU = '2026-10-08', SUN = '2026-10-11';

test('undone tiles come first, done tiles sink, config order kept within each group', () => {
  const [a, b, c] = [t('a'), t('b'), t('c')];
  const [col] = boardColumns({ version: 1, kids: [kid([a, b, c])] }, { [a.id]: true }, THU);
  assert.equal(col.state, 'tasks');
  assert.deepEqual(col.tiles.map(x => [x.task.label, x.done]), [['b', false], ['c', false], ['a', true]]);
});
test('all-done when every task today is done', () => {
  const a = t('a');
  const [col] = boardColumns({ version: 1, kids: [kid([a])] }, { [a.id]: true }, THU);
  assert.equal(col.state, 'all-done');
  assert.equal(col.tiles.length, 1);
});
test('nothing on a day with no tasks', () => {
  const [col] = boardColumns({ version: 1, kids: [kid([t('a')])] }, {}, SUN);
  assert.equal(col.state, 'nothing');
  assert.deepEqual(col.tiles, []);
});
test('check-offs for tasks not shown today are ignored', () => {
  const a = t('a'), swim = t('swim', [false,false,false,true,false,false,false]);
  const [col] = boardColumns({ version: 1, kids: [kid([a, swim])] }, { [swim.id]: true }, '2026-10-09');
  assert.equal(col.state, 'tasks');
  assert.deepEqual(col.tiles.map(x => x.task.label), ['a']);
});
test('one column per kid, kid object passed through', () => {
  const cfg = { version: 1, kids: [kid([]), { ...kid([]), id: 'k2', name: 'B' }] };
  assert.deepEqual(boardColumns(cfg, {}, THU).map(c => c.kid.name), ['A', 'B']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/view.js`.

- [ ] **Step 3: Implement `src/view.js`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/view.js tests/view.test.js
git commit -m "feat: board view-model"
```

---

### Task 5: Board screen and app wiring

**Files:**
- Create: `index.html`, `style.css`, `src/board.js`, `src/app.js`

**Interfaces:**
- Consumes: `boardDate`, `msUntilNextBoardDay` (Task 1); `createStore` (Task 3); `boardColumns` (Task 4).
- Produces: `renderBoard(root: HTMLElement, columns: Column[], onToggle: (taskId: string) => void): void` in `src/board.js`, which replaces `root`'s children. `src/app.js` is the entry point and exports nothing; Task 6 will add the gear and settings wiring to it.

- [ ] **Step 1: Create `index.html`**

Landscape full-screen shell: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, a `<main id="board">`, a `<section id="settings" hidden>`, a `<button id="gear" aria-label="Settings">⚙️</button>`, and `<script type="module" src="./src/app.js"></script>`. Link `./style.css`.

- [ ] **Step 2: Create `style.css`**

Decisions the spec pins; the rest is the builder's taste (warm and quiet, not a scoreboard):
- `html, body { height: 100%; margin: 0; overflow: hidden; }` and `body { touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }` so there is no double-tap zoom and no long-press text callout on iPad.
- `#board` is a two-column grid filling the viewport. Each column header shows avatar and name in the kid's color.
- Tiles are at least 120px tall with the emoji at roughly 64px and the label at 24px or more. Done tiles are at reduced opacity and visually muted. "All done" and "Nothing today" are centered, large, with the check at least 96px.
- `#gear` is small, low-contrast, fixed in the bottom-right corner.

- [ ] **Step 3: Implement `src/board.js`**

`renderBoard` builds one `<section class="kid">` per column with a header and, by `state`: a `<ul class="tiles">` of `<li><button class="tile" data-task-id>` (with class `done` when done) for `'tasks'`; the same list plus an "All done ✅" banner for `'all-done'`; or a "Nothing today" message for `'nothing'`. Clicking a tile calls `onToggle(taskId)`. Use `click` events; `touch-action: manipulation` makes them fire without delay on iOS.

- [ ] **Step 4: Implement `src/app.js`**

State: `config`, `done`, `today` (date string), `store = createStore(window.localStorage)`. `render()` computes `boardColumns(config, done, today)` and calls `renderBoard`. `toggle(taskId)` flips `done[taskId]`, saves via `store.saveDone(today, done)`, re-renders. `refreshDay()` sets `today = boardDate(new Date())`, loads `done = store.loadDone(today)`, re-renders, and arms `setTimeout(refreshDay, msUntilNextBoardDay(new Date()))`. Also call `refreshDay` on `visibilitychange` (when visible) and `pageshow`, and from a 60 s `setInterval` guard that calls it only when `boardDate(new Date()) !== today`.

- [ ] **Step 5: Verify in a browser**

Run: `python3 -m http.server 8080` from the repo root, open `http://localhost:8080/` in a browser (use the claude-in-chrome tools if available, otherwise do it by hand).
Expected: two columns with placeholder names and five emoji tiles each; tapping a tile fades it and moves it to the bottom; tapping it again restores it; checking all five shows "All done" with a big check; reloading the page keeps the check-offs. In DevTools, set `localStorage.setItem('mrb.done', JSON.stringify({date:'2000-01-01', done:{}}))` and reload: all tiles show undone.

- [ ] **Step 6: Run the unit tests**

Run: `npm test`
Expected: all pass (nothing in this task should have broken them).

- [ ] **Step 7: Commit**

```bash
git add index.html style.css src/board.js src/app.js
git commit -m "feat: board screen with daily reset"
```

---

### Task 6: Hidden settings screen

**Files:**
- Create: `src/emoji.js`, `src/settings.js`
- Modify: `src/app.js`, `style.css`, `index.html` (if the settings container needs structure)

**Interfaces:**
- Consumes: all `src/model.js` operations; `DAY_NAMES`, `WEEKDAYS`.
- Produces: `EMOJI_PALETTE: string[]` in `src/emoji.js` (a few dozen morning-routine emoji: 👕🪥🥣🎒🐶🧦👟🧥🚿🛏️🪮💊🍎💧📚🧴🩱🎒🥪🚲 and more, builder's choice). `renderSettings(root: HTMLElement, config: Config, handlers: { onChange(config: Config): void, onDone(): void, onReset(): void }): void` in `src/settings.js`. `longPress(el: HTMLElement, ms: number, fn: () => void): void` in `src/app.js`.

- [ ] **Step 1: Add a regression test for a removed task that was checked off**

Add to `tests/view.test.js`:

```js
test('a removed task no longer appears even if its check-off remains', () => {
  const a = t('a'), b = t('b');
  const [col] = boardColumns({ version: 1, kids: [kid([b])] }, { [a.id]: true }, THU);
  assert.deepEqual(col.tiles.map(x => x.task.label), ['b']);
  assert.equal(col.state, 'tasks');
});
```

Run: `npm test`. Expected: PASS already (view ignores unknown ids); keep it as the regression guard. In `app.js` the remove handler must also `delete done[taskId]` and save, per the spec.

- [ ] **Step 2: Create `src/emoji.js`**

- [ ] **Step 3: Implement `src/settings.js`**

Full-screen settings view, built fresh on every `renderSettings` call (the app re-renders after each change). Layout, top to bottom: a "Done" button; one card per kid with name input, color input (`<input type="color">`), avatar emoji button that opens the picker; the kid's task list where each row has: emoji button (opens picker), label input, seven day toggle buttons labelled with `DAY_NAMES`, move up / move down, remove; an "Add task" row with an emoji button, a label input and an Add button; and at the bottom a "Reset everything" button that asks `confirm('Erase all kids, tasks and check-offs?')` before calling `onReset`. The emoji picker is an inline grid of `EMOJI_PALETTE` plus a text field for pasting any other emoji. Every change calls `handlers.onChange(newConfig)` immediately using the `model.js` operations; name and label edits fire on `change` (not every keystroke). Add ignores a blank label.

- [ ] **Step 4: Wire settings into `src/app.js`**

Implement `longPress(el, ms, fn)` using `touchstart`/`touchend`/`touchcancel` and `mousedown`/`mouseup`/`mouseleave`: start a timer on press, cancel on release or leave, call `fn` when the timer fires; call `preventDefault` on `touchstart` so iOS does not show a callout or select text. Apply `longPress(gear, 2000, openSettings)`. `openSettings` hides `#board` and `#gear`, shows `#settings`, and calls `renderSettings` with handlers: `onChange` saves config via `store.saveConfig`, prunes `done` of any task id that no longer exists in the config, saves `done`, and re-renders settings; `onDone` hides settings, shows board and gear, re-renders board; `onReset` calls `store.clearAll()`, reloads config and done from the store, and returns to the board.

- [ ] **Step 5: Style settings in `style.css`**

Readable at arm's length on the tablet: inputs at least 44px tall, day toggles clearly on/off, selected emoji obvious. No need for it to be pretty; it is the parent's screen.

- [ ] **Step 6: Verify in a browser**

Run: `python3 -m http.server 8080`, open the page.
Expected: a plain tap on the gear does nothing; holding it two seconds opens settings. Rename a kid, change their color and avatar, add "Swim kit" with Thursday only, move it up, remove "Feed the dog", press Done: the board reflects every change and the removed task's tile is gone. Check off a task, open settings, remove that task, press Done, then re-add a task with the same label: it shows undone. Reset everything (confirm) returns to the placeholder kids.

- [ ] **Step 7: Run the unit tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/emoji.js src/settings.js src/app.js style.css index.html tests/view.test.js
git commit -m "feat: hidden settings screen behind long-press gear"
```

---

### Task 7: Offline Home Screen app

**Files:**
- Create: `manifest.webmanifest`, `sw.js`
- Modify: `index.html`, `src/app.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a service worker that caches every file the page needs, and the iOS metadata for standalone mode.

- [ ] **Step 1: Create `manifest.webmanifest`**

`name` and `short_name` "Morning Board", `start_url: "./"`, `display: "standalone"`, `orientation: "landscape"`, `background_color` and `theme_color` matching the page background, `icons: []` (iOS ignores the manifest icons; a screenshot is used if no `apple-touch-icon` is given, which is acceptable).

- [ ] **Step 2: Add iOS standalone metadata to `index.html`**

`<link rel="manifest" href="./manifest.webmanifest">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, `<meta name="apple-mobile-web-app-title" content="Morning Board">`, `<meta name="theme-color" content="...">`.

- [ ] **Step 3: Create `sw.js`**

`const CACHE = 'mrb-v1'` and an explicit `ASSETS` list of every relative URL (`./`, `./index.html`, `./style.css`, `./manifest.webmanifest`, every `./src/*.js`). On `install`: `skipWaiting()` and add all assets to the cache. On `activate`: delete every cache whose name is not `CACHE`, then `clients.claim()`. On `fetch`: cache-first, falling back to network. Document at the top of the file: "Bump CACHE whenever any file changes; the new version is picked up on the next launch after that."

- [ ] **Step 4: Register the service worker in `src/app.js`**

`if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js')` after the first render, inside try/catch.

- [ ] **Step 5: Verify offline behaviour**

Run: `python3 -m http.server 8080`, open the page, confirm in DevTools › Application that the service worker is active and the cache lists every asset. Tick "Offline" in DevTools, reload: the board still loads and works.
Expected: the page loads fully with the network off. Then `npm test` still passes.

- [ ] **Step 6: Commit**

```bash
git add manifest.webmanifest sw.js index.html src/app.js
git commit -m "feat: offline service worker and Home Screen metadata"
```

---

### Task 8: Deploy to GitHub Pages and write the setup guide

**Files:**
- Create: `README.md`, `.nojekyll`

**Interfaces:**
- Consumes: the finished page.
- Produces: a public URL the iPad can open.

- [ ] **Step 1: Write `README.md`**

Sections: what it is (two sentences, link the spec); iPad setup (open the Pages URL in Safari, Share › Add to Home Screen, open from the Home Screen icon, turn off Auto-Lock in Settings › Display & Brightness, rotate to landscape); parent settings (hold the gear two seconds); privacy (everything stays in the iPad's browser storage; clearing Safari website data erases it); updating (bump `CACHE` in `sw.js`, push, relaunch the app twice); running tests (`npm test`); local preview (`python3 -m http.server 8080`).

- [ ] **Step 2: Create an empty `.nojekyll`** so Pages serves files as-is.

- [ ] **Step 3: Commit**

```bash
git add README.md .nojekyll
git commit -m "docs: README with iPad setup and deploy notes"
```

- [ ] **Step 4: Create the public GitHub repo and push**

Confirm the repo name with the parent if it has not been given; default `morning-routine-board`.
Run: `gh repo create morning-routine-board --public --source=. --remote=origin --push`
Expected: `main` is pushed.

- [ ] **Step 5: Enable Pages from the `main` branch root**

Run: `gh api -X POST repos/{owner}/morning-routine-board/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'`
Expected: JSON with `html_url`. Wait a minute, then `curl -sI <html_url>` returns `200`.

- [ ] **Step 6: Verify the deployed page**

Open the Pages URL in a browser: the board renders, the service worker registers (DevTools › Application), and all asset URLs resolve under the repo subpath with no 404s in the console.

- [ ] **Step 7: Report the URL** to the parent along with the iPad setup steps from the README.
