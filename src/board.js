// Board renderer: one column per kid, tiles for today's tasks.
// Replaces root's children on every call; the app owns state.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderHeader(kid) {
  const header = el('header', 'kid-header');
  const avatar = el('span', 'kid-avatar', kid.avatar);
  const name = el('span', 'kid-name', kid.name);
  name.style.color = kid.color;
  header.appendChild(avatar);
  header.appendChild(name);
  return header;
}

function renderBanner(kind, check, text) {
  const banner = el('div', 'banner ' + kind);
  if (check) banner.appendChild(el('div', 'banner-check', check));
  banner.appendChild(el('div', 'banner-text', text));
  return banner;
}

function renderTiles(tiles, onToggle) {
  const list = el('ul', 'tiles');
  tiles.forEach(function (tile) {
    const item = el('li');
    const button = el('button', 'tile' + (tile.done ? ' done' : ''));
    button.type = 'button';
    button.setAttribute('data-task-id', tile.task.id);
    button.setAttribute('aria-pressed', tile.done ? 'true' : 'false');
    button.appendChild(el('span', 'tile-emoji', tile.task.emoji));
    button.appendChild(el('span', 'tile-label', tile.task.label));
    button.addEventListener('click', function () { onToggle(tile.task.id); });
    item.appendChild(button);
    list.appendChild(item);
  });
  return list;
}

export function renderBoard(root, columns, onToggle) {
  while (root.firstChild) root.removeChild(root.firstChild);
  columns.forEach(function (column) {
    const section = el('section', 'kid');
    section.appendChild(renderHeader(column.kid));
    if (column.state === 'nothing') {
      section.appendChild(renderBanner('nothing', '🎈', 'Free day today!'));
    } else {
      if (column.state === 'all-done') {
        section.appendChild(renderBanner('all-done', '🎉', 'All done! Great job!'));
      }
      section.appendChild(renderTiles(column.tiles, onToggle));
    }
    root.appendChild(section);
  });
}
