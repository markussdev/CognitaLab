/* Split from script.js. Loaded as classic global script. */
function isUseCaseLike(blocks, connections) {
  const outCount = new Map(blocks.map(b => [b.id, 0]));
  const inCount  = new Map(blocks.map(b => [b.id, 0]));
  connections.forEach(c => {
    outCount.set(c.from, (outCount.get(c.from) || 0) + 1);
    inCount.set(c.to,   (inCount.get(c.to)   || 0) + 1);
  });
  const actorRoots = blocks.filter(b =>
    !inCount.get(b.id) &&
    (b.type === 'user' || b.type === 'ai') &&
    (outCount.get(b.id) || 0) >= 1
  );
  return actorRoots.length >= 2;
}

// Layout: each actor anchors a horizontal row; its children stack vertically to the right
function layoutUseCaseByActors(blocks, connections) {
  const byId = new Map(blocks.map(b => [b.id, b]));
  const outgoing = new Map(blocks.map(b => [b.id, []]));
  const inCount  = new Map(blocks.map(b => [b.id, 0]));
  connections.forEach(c => {
    outgoing.get(c.from)?.push(c.to);
    inCount.set(c.to, (inCount.get(c.to) || 0) + 1);
  });

  const roots = blocks.filter(b => !inCount.get(b.id));
  const actors = roots.filter(b => b.type === 'user' || b.type === 'ai');
  const others = roots.filter(b => !actors.includes(b));
  const ordered = [...actors, ...others];

  const ACTOR_X = 80, ACTION_X = 500;
  const CHILD_GAP = 154, MIN_ACTOR_GAP = 140;
  const CARD_H = 112;
  const START_Y = 80;
  const positioned = new Set();
  let curY = START_Y;

  ordered.forEach(root => {
    const children = (outgoing.get(root.id) || [])
      .map(id => byId.get(id)).filter(Boolean);

    const groupH = children.length > 0 ? (children.length - 1) * CHILD_GAP + CARD_H : CARD_H;

    root.x = ACTOR_X;
    root.y = curY + Math.max(0, (groupH - CARD_H) / 2);
    positioned.add(root.id);

    children.forEach((child, i) => {
      if (positioned.has(child.id)) return;
      child.x = ACTION_X;
      child.y = curY + i * CHILD_GAP;
      positioned.add(child.id);
    });

    curY += groupH + MIN_ACTOR_GAP;
  });

  // Leftover nodes (shared actions referenced by multiple actors)
  let restY = START_Y;
  blocks.filter(b => !positioned.has(b.id)).forEach(b => {
    b.x = ACTION_X + 320;
    b.y = restY;
    restY += CHILD_GAP;
  });

  return blocks;
}

function autoLayoutBlocks(blocks, connections, direction = 'LR') {
  if (!blocks.length) return blocks;

  const byId = new Map(blocks.map(b => [b.id, b]));
  const outgoing = new Map(blocks.map(b => [b.id, []]));
  const inCount  = new Map(blocks.map(b => [b.id, 0]));

  connections.forEach(c => {
    if (outgoing.has(c.from)) outgoing.get(c.from).push(c.to);
    inCount.set(c.to, (inCount.get(c.to) || 0) + 1);
  });

  const roots = blocks.filter(b => !inCount.get(b.id));
  const isTopDown = /^(TD|TB|BT)$/.test(direction);

  if (!isTopDown && isUseCaseLike(blocks, connections)) {
    return layoutUseCaseByActors(blocks, connections);
  }

  return isTopDown
    ? layoutTopDown(blocks, connections, roots, outgoing, byId)
    : layoutLeftRight(blocks, connections, roots, outgoing, byId);
}

function layoutLeftRight(blocks, connections, roots, outgoing, byId) {
  // Assign level (column) via BFS
  const levels = computeLevels(blocks, roots, outgoing);
  const cols = new Map();
  levels.forEach((lv, id) => {
    if (!cols.has(lv)) cols.set(lv, []);
    cols.get(lv).push(byId.get(id));
  });

  const colGap = 340;
  const rowGap = 132;
  const startX = 80;
  const startY = 80;

  cols.forEach((group, col) => {
    const totalH = (group.length - 1) * rowGap;
    group.forEach((block, row) => {
      if (!block) return;
      block.x = startX + col * colGap;
      block.y = startY + row * rowGap - totalH / 2 + (cols.size > 1 ? 200 : 0);
      if (block.y < 40) block.y = 40;
    });
  });

  return avoidOverlaps(blocks, false);
}

function layoutTopDown(blocks, connections, roots, outgoing, byId) {
  const levels = computeLevels(blocks, roots, outgoing);
  const rows = new Map();
  levels.forEach((lv, id) => {
    if (!rows.has(lv)) rows.set(lv, []);
    rows.get(lv).push(byId.get(id));
  });

  const colGap = 300;
  const rowGap = 170;
  const startX = 80;
  const startY = 80;

  rows.forEach((group, row) => {
    group.forEach((block, col) => {
      if (!block) return;
      block.x = startX + col * colGap;
      block.y = startY + row * rowGap;
    });
  });

  return avoidOverlaps(blocks, true);
}

function computeLevels(blocks, roots, outgoing) {
  const levels = new Map();
  const queue = roots.length ? [...roots] : [blocks[0]];
  queue.forEach(b => levels.set(b.id, 0));

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const curLv = levels.get(cur.id) || 0;
    (outgoing.get(cur.id) || []).forEach(nid => {
      const next = levels.get(nid);
      if (next === undefined || curLv + 1 > next) {
        levels.set(nid, curLv + 1);
        const nb = blocks.find(b => b.id === nid);
        if (nb) queue.push(nb);
      }
    });
  }

  // Assign unvisited nodes to level 0
  blocks.forEach(b => { if (!levels.has(b.id)) levels.set(b.id, 0); });
  return levels;
}

function avoidOverlaps(blocks, vertical = false) {
  const placed = [];
  const W = 260, H = 112, PAD = 24;

  blocks.forEach(block => {
    let attempts = 0;
    while (attempts < 60) {
      const overlap = placed.some(p =>
        block.x < p.x + W + PAD &&
        block.x + W + PAD > p.x &&
        block.y < p.y + H + PAD &&
        block.y + H + PAD > p.y
      );
      if (!overlap) break;
      if (vertical) block.x += W + PAD;
      else block.y += H + PAD;
      attempts++;
    }
    placed.push({ x: block.x, y: block.y });
  });

  return blocks;
}

function centerDiagramAfterImport() {
  if (!state.blocks.length) return;
  const area = document.getElementById('canvasArea');
  const minX = Math.min(...state.blocks.map(b => b.x));
  const minY = Math.min(...state.blocks.map(b => b.y));
  const maxX = Math.max(...state.blocks.map(b => b.x + 240));
  const maxY = Math.max(...state.blocks.map(b => b.y + 100));
  state.panX = (area.offsetWidth  - (maxX - minX) * state.zoom) / 2 - minX * state.zoom;
  state.panY = (area.offsetHeight - (maxY - minY) * state.zoom) / 2 - minY * state.zoom;
  applyTransform();
  updateMinimap();
}


