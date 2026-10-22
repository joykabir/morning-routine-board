import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, createTask, tasksForDay, updateKid, addTask, removeTask,
         updateTask, moveTask, newId, WEEKDAYS, CONFIG_VERSION,
         MAX_REOPENS_PER_DAY, canReopen, recordReopen, kidIdForTask } from '../src/model.js';

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
test('kidIdForTask finds the kid that owns a task', () => {
  const c = defaultConfig();
  assert.equal(kidIdForTask(c, c.kids[1].tasks[0].id), c.kids[1].id);
  assert.equal(kidIdForTask(c, 'missing'), null);
});
test('a kid may reopen a finished day at most MAX_REOPENS_PER_DAY times per board-day', () => {
  assert.equal(MAX_REOPENS_PER_DAY, 3);
  assert.equal(canReopen({}, 'k'), true);
  assert.equal(canReopen({ k: 2 }, 'k'), true);
  assert.equal(canReopen({ k: 3 }, 'k'), false);
  assert.equal(canReopen({ k: 3 }, 'other'), true);
});
test('recordReopen adds one to the kid count without mutating the input', () => {
  const before = { k: 1 };
  assert.deepEqual(recordReopen(before, 'k'), { k: 2 });
  assert.deepEqual(recordReopen(before, 'j'), { k: 1, j: 1 });
  assert.deepEqual(before, { k: 1 });
});
