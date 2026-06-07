/* Split from script.js. Loaded as classic global script. */
function renderAll() {
  renderSwimlanes(state.lanes);
  renderBlocks();
  renderConnections();
  updateMinimap();
}

function renderBlocks() {
  const layer = document.getElementById('blocksLayer');
  layer.innerHTML = '';
  state.blocks.forEach(b => {
    const el = createBlockElement(b);
    layer.appendChild(el);
  });
}

function createBlockElement(block) {
  const el = document.createElement('div');
  el.className = `block type-${block.type}`;
  el.id = `block-${block.id}`;
  el.style.left = block.x + 'px';
  el.style.top = block.y + 'px';
  el.style.setProperty('--block-color', block.color || '#47d6bd');
  if (block.id === state.selectedBlockId) el.classList.add('selected');
  if (block.id === state.connectingFrom) el.classList.add('connecting-source');
  if (state.selectedBlockIds.includes(block.id)) el.classList.add('multi-selected');

  const typeDef = BLOCK_TYPES.find(t => t.type === block.type) || BLOCK_TYPES[1];

  let inner = `<div class="block-type-tag">${typeDef.label}</div>`;
  inner += `<div class="block-title">${escHtml(block.title)}</div>`;
  if (block.description) inner += `<div class="block-desc">${escHtml(block.description)}</div>`;

  if (block.type === 'decision' && block.branches) {
    inner += `<div class="block-decision-branches">${escHtml(block.branches)}</div>`;
  }

  if (block.tags && block.tags.length > 0) {
    inner += '<div class="block-tags">';
    block.tags.forEach(t => { inner += `<span class="block-tag">${escHtml(t)}</span>`; });
    inner += '</div>';
  }

  if (block.description) {
    inner += `<div class="block-tooltip">${escHtml(block.description)}</div>`;
  }

  ['top','right','bottom','left'].forEach(side => {
    inner += `<div class="block-port" data-side="${side}" data-id="${block.id}" title="Arrastar para conectar"></div>`;
  });

  el.innerHTML = inner;

  el.addEventListener('mousedown', onBlockMouseDown);
  el.addEventListener('click', onBlockClick);
  el.querySelectorAll('.block-port').forEach(port => {
    port.addEventListener('mousedown', onPortMouseDown);
  });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, block.id);
  });

  return el;
}

// ── Smart connection anchors ──────────────────────────────────

function getBlockSize(block) {
  const el = document.getElementById(`block-${block.id}`);
  return el ? { w: el.offsetWidth || 220, h: el.offsetHeight || 86 }
            : { w: 220, h: 86 };
}

function createSmartConnectionPath(from, to) {
  const fs = getBlockSize(from);
  const ts = getBlockSize(to);
  const fcx = from.x + fs.w / 2, fcy = from.y + fs.h / 2;
  const tcx = to.x  + ts.w / 2, tcy = to.y  + ts.h / 2;
  const dx = tcx - fcx, dy = tcy - fcy;

  // Keeps the arrowhead tip visible above the block card (SVG sits below the blocks-layer in z-index)
  const ARROWHEAD_OFFSET = 18;

  let fx, fy, tx, ty;
  const horizontalGap = dx >= 0 ? to.x - (from.x + fs.w) : from.x - (to.x + ts.w);
  const preferHorizontal = horizontalGap > 48 || Math.abs(dx) >= Math.abs(dy);

  if (preferHorizontal) {
    // Horizontal dominant — exit/enter left or right face
    if (dx >= 0) { fx = from.x + fs.w; tx = to.x - ARROWHEAD_OFFSET; }
    else          { fx = from.x;        tx = to.x + ts.w + ARROWHEAD_OFFSET; }
    fy = fcy; ty = tcy;
  } else {
    // Vertical dominant — exit/enter top or bottom face
    if (dy >= 0) { fy = from.y + fs.h; ty = to.y - ARROWHEAD_OFFSET; }
    else          { fy = from.y;        ty = to.y + ts.h + ARROWHEAD_OFFSET; }
    fx = fcx; tx = tcx;
  }

  const adx = Math.abs(tx - fx), ady = Math.abs(ty - fy);
  if (preferHorizontal) {
    const c = Math.max(60, adx * 0.42);
    const sx = dx >= 0 ? 1 : -1;
    return { d: `M ${fx} ${fy} C ${fx + sx * c} ${fy}, ${tx - sx * c} ${ty}, ${tx} ${ty}`, mx: (fx + tx) / 2, my: (fy + ty) / 2 };
  }
  const c = Math.max(50, ady * 0.42);
  const sy = dy >= 0 ? 1 : -1;
  return { d: `M ${fx} ${fy} C ${fx} ${fy + sy * c}, ${tx} ${ty - sy * c}, ${tx} ${ty}`, mx: (fx + tx) / 2, my: (fy + ty) / 2 };
}

function renderConnections() {
  const group = document.getElementById('connectionsGroup');
  const hitGroup = document.getElementById('connectionHitGroup');
  group.innerHTML = '';
  hitGroup.innerHTML = '';

  state.connections.forEach(conn => {
    const from = state.blocks.find(b => b.id === conn.from);
    const to   = state.blocks.find(b => b.id === conn.to);
    if (!from || !to) return;

    const { d, mx, my } = createSmartConnectionPath(from, to);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', `connection-path${conn.id === state.selectedConnectionId ? ' selected' : ''}`);
    path.setAttribute('d', d);
    path.setAttribute('data-id', conn.id);
    group.appendChild(path);

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('class', 'connection-hit');
    hit.setAttribute('d', d);
    hit.setAttribute('data-id', conn.id);
    hit.addEventListener('click', onConnectionClick);
    hitGroup.appendChild(hit);

    if (conn.label) {
      const lx = mx, ly = my - 8;
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', lx - conn.label.length * 3 - 4);
      bg.setAttribute('y', ly - 10);
      bg.setAttribute('width', conn.label.length * 6 + 8);
      bg.setAttribute('height', 16);
      bg.setAttribute('rx', 3);
      bg.setAttribute('fill', 'var(--bg)');
      group.appendChild(bg);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('class', 'connection-label');
      txt.setAttribute('x', lx);
      txt.setAttribute('y', ly);
      txt.textContent = conn.label;
      group.appendChild(txt);
    }
  });
}

function renderSwimlanes(lanes) {
  const group = document.getElementById('swimlaneGroup');
  group.innerHTML = '';
  if (!lanes || lanes.length === 0) return;
  lanes.forEach(lane => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', lane.x);
    rect.setAttribute('y', lane.y);
    rect.setAttribute('width', lane.w);
    rect.setAttribute('height', lane.h);
    rect.setAttribute('rx', 10);
    rect.setAttribute('fill', 'rgba(71,214,189,0.02)');
    rect.setAttribute('stroke', 'rgba(71,214,189,0.12)');
    rect.setAttribute('stroke-width', '1');
    group.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', lane.x + 14);
    text.setAttribute('y', lane.y + 24);
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', '700');
    text.setAttribute('text-transform', 'uppercase');
    text.setAttribute('fill', 'rgba(71,214,189,0.5)');
    text.setAttribute('letter-spacing', '1');
    text.textContent = lane.label.toUpperCase();
    group.appendChild(text);
  });
}

function applyTransform() {
  const layer = document.getElementById('blocksLayer');
  const svg = document.getElementById('connectionsSvg');
  const transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  layer.style.transform = transform;
  layer.style.transformOrigin = '0 0';
  // SVG viewBox trick for connections
  svg.style.transform = transform;
  svg.style.transformOrigin = '0 0';
  document.getElementById('zoomIndicator').textContent = Math.round(state.zoom * 100) + '%';
  document.getElementById('sbZoom').textContent = 'Zoom: ' + Math.round(state.zoom * 100) + '%';
}


function showHome() {
  document.getElementById('homeScreen').style.display = 'flex';
  document.getElementById('canvasContainer').style.display = 'none';
  document.getElementById('minimap').style.display = 'none';
  document.body.classList.add('home-mode');
}

function showCanvas() {
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('canvasContainer').style.display = 'block';
  if (state.showMinimap) document.getElementById('minimap').style.display = 'block';
  document.body.classList.remove('home-mode');
}

function buildTemplateGrid() {
  const grid = document.getElementById('templateGrid');
  const visibleExamples = TEMPLATES.filter(t => ['use-cases'].includes(t.id));
  grid.innerHTML = visibleExamples.map(t => `
    <div class="template-card" data-tid="${t.id}" style="--card-accent:${t.color}">
      <div class="tc-icon" style="background:${t.iconColor};border:1px solid ${t.iconBorder};color:${t.iconFg}">${t.icon}</div>
      <div class="tc-title">${t.title}</div>
      <div class="tc-desc">${t.desc}</div>
      <button class="tc-btn" data-tid="${t.id}">Usar</button>
    </div>
  `).join('');

  grid.querySelectorAll('[data-tid]').forEach(el => {
    el.addEventListener('click', () => loadTemplate(el.dataset.tid));
  });
}

function updateStatusBar() {
  document.getElementById('sbBlocks').textContent = state.blocks.length + ' bloco' + (state.blocks.length !== 1 ? 's' : '');
  document.getElementById('sbConnections').textContent = state.connections.length + ' conexão' + (state.connections.length !== 1 ? 'ões' : '');
  if (state.activeTemplate) {
    const t = TEMPLATES.find(t => t.id === state.activeTemplate);
    const label = state.activeTemplate === 'code-import'
      ? `Gerado por código${state.codeImportMeta ? ' · ' + state.codeImportMeta.probableType : ''}`
      : t ? t.title : state.activeTemplate;
    document.getElementById('sbTemplate').textContent = label;
  }
  document.getElementById('sbLeft').textContent = state.selectedBlockId ? 'Bloco selecionado' :
    state.selectedConnectionId ? 'Conexão selecionada' : 'Pronto';
}

// ═══════════════════════════ MINIMAP ════════════════════════════════════════
function updateMinimap() {
  const mini = document.getElementById('minimap');
  const canvas = document.getElementById('minimapCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  if (!state.showMinimap || state.blocks.length === 0) {
    if (mini) mini.style.display = 'none';
    ctx.clearRect(0, 0, W, H);
    return;
  }

  if (mini && !document.body.classList.contains('home-mode')) mini.style.display = 'block';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#06100f';
  ctx.fillRect(0, 0, W, H);

  const minX = Math.min(...state.blocks.map(b => b.x));
  const minY = Math.min(...state.blocks.map(b => b.y));
  const maxX = Math.max(...state.blocks.map(b => b.x + 200));
  const maxY = Math.max(...state.blocks.map(b => b.y + 80));
  const dw = maxX - minX + 80;
  const dh = maxY - minY + 80;
  const scale = Math.min(W / dw, H / dh) * 0.85;
  const ox = (W - dw * scale) / 2 - minX * scale + 20;
  const oy = (H - dh * scale) / 2 - minY * scale + 10;

  state.blocks.forEach(b => {
    ctx.fillStyle = b.color || '#47d6bd';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.roundRect(b.x * scale + ox, b.y * scale + oy, 28, 12, 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Viewport indicator
  const areaEl = document.getElementById('canvasArea');
  const aw = areaEl.offsetWidth;
  const ah = areaEl.offsetHeight;
  const vx = (-state.panX / state.zoom) * scale + ox;
  const vy = (-state.panY / state.zoom) * scale + oy;
  const vw = (aw / state.zoom) * scale;
  const vh = (ah / state.zoom) * scale;

  const vp = document.getElementById('minimapViewport');
  vp.style.left = Math.max(0, vx) + 'px';
  vp.style.top = (20 + Math.max(0, vy)) + 'px';
  vp.style.width = Math.min(vw, W) + 'px';
  vp.style.height = Math.min(vh, H) + 'px';
}


