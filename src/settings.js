// Settings screen for the parent. Rebuilt from scratch on every call; every
// change goes straight back through handlers.onChange(newConfig).

import { createTask, updateKid, addTask, removeTask, updateTask, moveTask,
         DAY_NAMES, WEEKDAYS } from './model.js';
import { EMOJI_PALETTE } from './emoji.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className, onClick) {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function closePickers(root) {
  const open = root.querySelectorAll('.picker');
  for (let i = 0; i < open.length; i++) open[i].parentNode.removeChild(open[i]);
}

// Shows an inline emoji picker directly after `anchor`. onPick(emoji) is
// called with the chosen emoji; the picker then closes itself.
function openPicker(root, anchor, onPick) {
  closePickers(root);
  const picker = el('div', 'picker');
  const grid = el('div', 'picker-grid');
  EMOJI_PALETTE.forEach(function (emoji) {
    grid.appendChild(button(emoji, 'picker-emoji', function () {
      closePickers(root);
      onPick(emoji);
    }));
  });
  picker.appendChild(grid);
  const custom = el('div', 'picker-custom');
  const input = el('input', 'picker-input');
  input.type = 'text';
  input.placeholder = 'Paste any emoji';
  input.setAttribute('aria-label', 'Custom emoji');
  custom.appendChild(input);
  custom.appendChild(button('Use', 'btn', function () {
    const value = input.value.trim();
    if (!value) return;
    closePickers(root);
    onPick(value);
  }));
  custom.appendChild(button('Cancel', 'btn btn-quiet', function () { closePickers(root); }));
  picker.appendChild(custom);
  anchor.parentNode.insertBefore(picker, anchor.nextSibling);
}

function dayToggles(days, onToggle) {
  const wrap = el('div', 'days');
  DAY_NAMES.forEach(function (name, i) {
    const b = button(name, 'day' + (days[i] ? ' on' : ''), function () { onToggle(i); });
    b.setAttribute('aria-pressed', days[i] ? 'true' : 'false');
    wrap.appendChild(b);
  });
  return wrap;
}

function renderTaskRow(root, config, task, handlers) {
  const row = el('div', 'task-row');
  row.setAttribute('data-task-id', task.id);

  row.appendChild(button(task.emoji, 'emoji-btn', function () {
    openPicker(root, row, function (emoji) {
      handlers.onChange(updateTask(config, task.id, { emoji: emoji }));
    });
  }));

  const label = el('input', 'text-input');
  label.type = 'text';
  label.setAttribute('value', task.label);
  label.setAttribute('aria-label', 'Task name');
  label.addEventListener('change', function () {
    const value = label.value.trim();
    if (!value) { label.value = task.label; return; }
    handlers.onChange(updateTask(config, task.id, { label: value }));
  });
  row.appendChild(label);

  row.appendChild(dayToggles(task.days, function (i) {
    const days = task.days.slice();
    days[i] = !days[i];
    handlers.onChange(updateTask(config, task.id, { days: days }));
  }));

  const actions = el('div', 'row-actions');
  actions.appendChild(button('▲', 'btn btn-quiet', function () {
    handlers.onChange(moveTask(config, task.id, -1));
  }));
  actions.appendChild(button('▼', 'btn btn-quiet', function () {
    handlers.onChange(moveTask(config, task.id, 1));
  }));
  actions.appendChild(button('Remove', 'btn btn-danger', function () {
    handlers.onChange(removeTask(config, task.id));
  }));
  row.appendChild(actions);
  return row;
}

function renderAddRow(root, config, kid, handlers) {
  const row = el('div', 'task-row add-row');
  let emoji = '⭐';
  const emojiBtn = button(emoji, 'emoji-btn', function () {
    openPicker(root, row, function (picked) {
      emoji = picked;
      emojiBtn.textContent = picked;
    });
  });
  row.appendChild(emojiBtn);
  const label = el('input', 'text-input');
  label.type = 'text';
  label.placeholder = 'New task';
  label.setAttribute('aria-label', 'New task name');
  row.appendChild(label);
  const add = function () {
    const value = label.value.trim();
    if (!value) return;
    handlers.onChange(addTask(config, kid.id, createTask(value, emoji, WEEKDAYS)));
  };
  label.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
  row.appendChild(button('Add', 'btn btn-primary', add));
  return row;
}

function renderKidCard(root, config, kid, handlers) {
  const card = el('section', 'kid-card');
  const head = el('div', 'kid-card-head');

  head.appendChild(button(kid.avatar, 'emoji-btn avatar-btn', function () {
    openPicker(root, head, function (emoji) {
      handlers.onChange(updateKid(config, kid.id, { avatar: emoji }));
    });
  }));

  const name = el('input', 'text-input name-input');
  name.type = 'text';
  name.setAttribute('value', kid.name);
  name.setAttribute('aria-label', 'Kid name');
  name.addEventListener('change', function () {
    const value = name.value.trim();
    if (!value) { name.value = kid.name; return; }
    handlers.onChange(updateKid(config, kid.id, { name: value }));
  });
  head.appendChild(name);

  const color = el('input', 'color-input');
  color.type = 'color';
  color.value = kid.color;
  color.setAttribute('aria-label', 'Kid color');
  color.addEventListener('change', function () {
    handlers.onChange(updateKid(config, kid.id, { color: color.value }));
  });
  head.appendChild(color);
  card.appendChild(head);

  kid.tasks.forEach(function (task) {
    card.appendChild(renderTaskRow(root, config, task, handlers));
  });
  card.appendChild(renderAddRow(root, config, kid, handlers));
  return card;
}

export function renderSettings(root, config, handlers) {
  while (root.firstChild) root.removeChild(root.firstChild);

  const top = el('div', 'settings-top');
  top.appendChild(el('h1', 'settings-title', 'Settings'));
  top.appendChild(button('Done', 'btn btn-primary btn-done', handlers.onDone));
  root.appendChild(top);

  config.kids.forEach(function (kid) {
    root.appendChild(renderKidCard(root, config, kid, handlers));
  });

  const danger = el('div', 'settings-danger');
  danger.appendChild(button('Reset everything', 'btn btn-danger', function () {
    if (window.confirm('Erase all kids, tasks and check-offs?')) handlers.onReset();
  }));
  root.appendChild(danger);
}
