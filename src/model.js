// Config model: kids and their tasks. Every operation returns a new config
// and never mutates its input. There is deliberately no history, streak,
// score or reward data anywhere in this shape.

export const CONFIG_VERSION = 1;
export const WEEKDAYS = [true, true, true, true, true, false, false];
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function createTask(label, emoji, days) {
  const trimmed = String(label || '').trim();
  if (!trimmed) throw new Error('label required');
  return {
    id: newId(),
    label: trimmed,
    emoji: emoji,
    days: (days || WEEKDAYS).slice()
  };
}

function defaultTasks() {
  return [
    createTask('Get dressed', '👕'),
    createTask('Brush teeth', '🪥'),
    createTask('Eat breakfast', '🥣'),
    createTask('Pack bag', '🎒'),
    createTask('Feed the dog', '🐶')
  ];
}

export function defaultConfig() {
  return {
    version: CONFIG_VERSION,
    kids: [
      { id: newId(), name: 'Kid 1', color: '#e8743b', avatar: '🦊', tasks: defaultTasks() },
      { id: newId(), name: 'Kid 2', color: '#3b8ee8', avatar: '🐼', tasks: defaultTasks() }
    ]
  };
}

export function tasksForDay(kid, weekday) {
  return kid.tasks.filter(t => t.days[weekday]);
}

function mapKids(config, fn) {
  return Object.assign({}, config, { kids: config.kids.map(fn) });
}

export function updateKid(config, kidId, patch) {
  return mapKids(config, k => (k.id === kidId ? Object.assign({}, k, patch) : k));
}

export function addTask(config, kidId, task) {
  return mapKids(config, k =>
    k.id === kidId ? Object.assign({}, k, { tasks: k.tasks.concat([task]) }) : k
  );
}

export function removeTask(config, taskId) {
  return mapKids(config, k =>
    k.tasks.some(t => t.id === taskId)
      ? Object.assign({}, k, { tasks: k.tasks.filter(t => t.id !== taskId) })
      : k
  );
}

export function updateTask(config, taskId, patch) {
  return mapKids(config, k =>
    k.tasks.some(t => t.id === taskId)
      ? Object.assign({}, k, {
          tasks: k.tasks.map(t => (t.id === taskId ? Object.assign({}, t, patch) : t))
        })
      : k
  );
}

export function moveTask(config, taskId, delta) {
  for (let ki = 0; ki < config.kids.length; ki++) {
    const kid = config.kids[ki];
    const from = kid.tasks.findIndex(t => t.id === taskId);
    if (from === -1) continue;
    const to = from + delta;
    if (to < 0 || to >= kid.tasks.length) return config;
    const tasks = kid.tasks.slice();
    const moved = tasks.splice(from, 1)[0];
    tasks.splice(to, 0, moved);
    const kids = config.kids.slice();
    kids[ki] = Object.assign({}, kid, { tasks: tasks });
    return Object.assign({}, config, { kids: kids });
  }
  return config;
}
