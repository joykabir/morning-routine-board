// Board view-model: turns config + today's check-offs + the board date into
// one column per kid. Pure; no DOM.
//
// Column: { kid, state: 'tasks' | 'all-done' | 'nothing', tiles: [{ task, done }] }
// Undone tiles come first (config order), then done tiles (config order).

import { tasksForDay } from './model.js';
import { weekdayIndex } from './day.js';

export function boardColumns(config, done, dateStr) {
  const weekday = weekdayIndex(dateStr);
  return config.kids.map(kid => {
    const tasks = tasksForDay(kid, weekday);
    const tiles = tasks.map(task => ({ task: task, done: done[task.id] === true }));
    const undone = tiles.filter(t => !t.done);
    const finished = tiles.filter(t => t.done);
    let state = 'tasks';
    if (tiles.length === 0) state = 'nothing';
    else if (undone.length === 0) state = 'all-done';
    return { kid: kid, state: state, tiles: undone.concat(finished) };
  });
}
