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
