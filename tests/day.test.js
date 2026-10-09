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
