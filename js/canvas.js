/* Split from script.js. Loaded as classic global script. */
function setupCanvasEvents() {
  const area = document.getElementById('canvasArea');

  // Pan with middle mouse or space+drag
  area.addEventListener('mousedown', onCanvasMouseDown);
  area.addEventListener('mousemove', onCanvasMouseMove);
  area.addEventListener('mouseup', onCanvasMouseUp);
  area.addEventListener('mouseleave', onCanvasMouseUp);

  // Zoom with Ctrl+scroll
  area.addEventListener('wheel', onCanvasWheel, { passive: false });

  area.addEventListener('click', (e) => {
    if (_boxSelectWasActive) { _boxSelectWasActive = false; return; }
    if (e.target === area || e.target.id === 'canvasContainer' || e.target.id === 'blocksLayer') {
      if (state.connectingFrom) { cancelConnect(); return; }
      deselectAll();
    }
  });

  document.addEventListener('click', () => hideContextMenu());
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.block')) hideContextMenu();
  });
}

let _boxSelectWasActive = false;

function startBoxSelect(e) {
  const area = document.getElementById('canvasArea');
  const rect = area.getBoundingClientRect();
  const startX = e.clientX - rect.left;
  const startY = e.clientY - rect.top;

  const selEl = document.createElement('div');
  selEl.className = 'box-select';
  selEl.style.cssText = `left:${startX}px;top:${startY}px;width:0;height:0`;
  area.appendChild(selEl);

  const onMove = (ev) => {
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    selEl.style.left   = Math.min(cx, startX) + 'px';
    selEl.style.top    = Math.min(cy, startY) + 'px';
    selEl.style.width  = Math.abs(cx - startX) + 'px';
    selEl.style.height = Math.abs(cy - startY) + 'px';
  };

  const onUp = (ev) => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    selEl.remove();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    if (Math.abs(cx - startX) < 5 && Math.abs(cy - startY) < 5) return;

    _boxSelectWasActive = true;
    const x1 = (Math.min(startX, cx) - state.panX) / state.zoom;
    const y1 = (Math.min(startY, cy) - state.panY) / state.zoom;
    const x2 = (Math.max(startX, cx) - state.panX) / state.zoom;
    const y2 = (Math.max(startY, cy) - state.panY) / state.zoom;

    const ids = state.blocks
      .filter(b => b.x < x2 && b.x + 220 > x1 && b.y < y2 && b.y + 90 > y1)
      .map(b => b.id);

    if (ids.length === 1) {
      selectBlock(ids[0]);
    } else if (ids.length > 1) {
      state.selectedBlockId = null;
      state.selectedConnectionId = null;
      state.selectedBlockIds = ids;
      renderBlocks();
      renderDrawerDefault();
      updateStatusBar();
      toast(`${ids.length} blocos selecionados`, 'info');
    }
    setTimeout(() => { _boxSelectWasActive = false; }, 50);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

let _panning = false;
let _panStart = { x: 0, y: 0, px: 0, py: 0 };

function onCanvasMouseDown(e) {
  const onEmpty = !e.target.closest('.block') && !state.connectingFrom;
  // Middle mouse, Alt+click, or plain left-click on empty area → pan
  if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && onEmpty && !e.shiftKey)) {
    _panning = true;
    _panStart = { x: e.clientX, y: e.clientY, px: state.panX, py: state.panY };
    document.getElementById('canvasArea').style.cursor = 'grabbing';
    e.preventDefault();
  } else if (e.button === 0 && onEmpty && e.shiftKey) {
    // Shift+drag → box select
    startBoxSelect(e);
  }
}

function onCanvasMouseMove(e) {
  if (_panning) {
    state.panX = _panStart.px + (e.clientX - _panStart.x);
    state.panY = _panStart.py + (e.clientY - _panStart.y);
    applyTransform();
    updateMinimap();
  }
}

function onCanvasMouseUp() {
  if (_panning) {
    _panning = false;
    document.getElementById('canvasArea').style.cursor = 'grab';
    setTimeout(() => {
      if (!_panning) document.getElementById('canvasArea').style.cursor = '';
    }, 100);
    saveToLocalStorage();
  }
}

function onCanvasWheel(e) {
  // Não sequestra scroll de painéis, home, inputs ou modais.
  if (document.body.classList.contains('home-mode') ||
      e.target.closest('#homeScreen, .wp-body, .drawer, .modal-box, textarea, input, select')) return;
  e.preventDefault();
  if (e.ctrlKey) {
    // Ctrl+scroll → zoom centrado no cursor
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom(state.zoom * delta, e.clientX, e.clientY);
  } else if (e.shiftKey) {
    // Shift+scroll → pan horizontal
    state.panX -= e.deltaY * 0.8;
    applyTransform();
    updateMinimap();
  } else {
    // Scroll → pan vertical (trackpad também funciona com deltaX)
    state.panX -= e.deltaX * 0.8;
    state.panY -= e.deltaY * 0.8;
    applyTransform();
    updateMinimap();
  }
}

// ═══════════════════════════ BLOCOS — DRAG ════════════════════════════════════
let _dragging = null;
let _dragStart = { bx: 0, by: 0, mx: 0, my: 0 };

function onBlockMouseDown(e) {
  if (e.target.classList.contains('block-port')) return;
  if (e.button !== 0) return;
  e.stopPropagation();

  const el = e.currentTarget;
  const id = el.id.replace('block-', '');
  const block = state.blocks.find(b => b.id === id);
  if (!block) return;

  const isMultiDrag = state.selectedBlockIds.includes(id) && state.selectedBlockIds.length > 1;
  const initialPositions = {};
  if (isMultiDrag) {
    state.selectedBlockIds.forEach(bid => {
      const b = state.blocks.find(b => b.id === bid);
      if (b) initialPositions[bid] = { x: b.x, y: b.y };
    });
  }

  _dragging = { id, el };
  _dragStart = { bx: block.x, by: block.y, mx: e.clientX, my: e.clientY };

  el.style.cursor = 'grabbing';
  el.style.zIndex = 100;

  const onMove = (ev) => {
    const dx = (ev.clientX - _dragStart.mx) / state.zoom;
    const dy = (ev.clientY - _dragStart.my) / state.zoom;
    if (isMultiDrag) {
      state.selectedBlockIds.forEach(bid => {
        const b = state.blocks.find(b => b.id === bid);
        const init = initialPositions[bid];
        if (!b || !init) return;
        let nx = init.x + dx;
        let ny = init.y + dy;
        if (state.snapToGrid) { nx = Math.round(nx / 16) * 16; ny = Math.round(ny / 16) * 16; }
        b.x = nx; b.y = ny;
        const bel = document.getElementById(`block-${bid}`);
        if (bel) { bel.style.left = nx + 'px'; bel.style.top = ny + 'px'; }
      });
    } else {
      let nx = _dragStart.bx + dx;
      let ny = _dragStart.by + dy;
      if (state.snapToGrid) { nx = Math.round(nx / 16) * 16; ny = Math.round(ny / 16) * 16; }
      block.x = nx; block.y = ny;
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
    }
    renderConnections();
    updateMinimap();
  };

  const onUp = () => {
    el.style.cursor = 'grab';
    el.style.zIndex = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    _dragging = null;
    history.snapshot();
    saveToLocalStorage();
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function onBlockClick(e) {
  if (e.target.classList.contains('block-port')) return;
  e.stopPropagation();
  const id = e.currentTarget.id.replace('block-', '');

  if (state.connectingFrom) {
    if (state.connectingFrom === id) { cancelConnect(); return; }
    finishConnect(id);
    return;
  }

  if (state.connectingFrom === null) {
    selectBlock(id);
  }
}

// ── Drag-to-connect ──────────────────────────────────────────────
let _dragConnect = null;
let _livePath = null;

function getPortPosition(block, side) {
  const { w, h } = getBlockSize(block);
  switch (side) {
    case 'right':  return { x: block.x + w,       y: block.y + h / 2 };
    case 'left':   return { x: block.x,            y: block.y + h / 2 };
    case 'top':    return { x: block.x + w / 2,    y: block.y };
    case 'bottom': return { x: block.x + w / 2,    y: block.y + h };
    default:       return { x: block.x + w,        y: block.y + h / 2 };
  }
}

function screenToCanvas(clientX, clientY) {
  const rect = document.getElementById('canvasArea').getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.panX) / state.zoom,
    y: (clientY - rect.top  - state.panY) / state.zoom,
  };
}

function onPortMouseDown(e) {
  if (e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();

  const fromId = e.currentTarget.dataset.id;
  const side   = e.currentTarget.dataset.side;
  if (!fromId) return;

  if (state.connectingFrom) cancelConnect();

  _dragConnect = { fromId, side, startX: e.clientX, startY: e.clientY, moved: false };

  const el = document.getElementById(`block-${fromId}`);
  if (el) el.classList.add('connecting-source');

  document.addEventListener('mousemove', onDragConnectMove);
  document.addEventListener('mouseup', onDragConnectUp);
}

function onDragConnectMove(e) {
  if (!_dragConnect) return;

  const mdx = e.clientX - _dragConnect.startX;
  const mdy = e.clientY - _dragConnect.startY;
  if (!_dragConnect.moved && Math.hypot(mdx, mdy) < 6) return;
  _dragConnect.moved = true;

  if (!_livePath) {
    document.getElementById('canvasArea').classList.add('connect-dragging');
    const group = document.getElementById('connectionsGroup');
    _livePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    _livePath.setAttribute('class', 'live-wire');
    _livePath.setAttribute('marker-end', 'url(#arrowhead)');
    group.appendChild(_livePath);
  }

  const block = state.blocks.find(b => b.id === _dragConnect.fromId);
  if (!block) return;

  const from = getPortPosition(block, _dragConnect.side);
  const to   = screenToCanvas(e.clientX, e.clientY);

  // Highlight block under cursor
  document.querySelectorAll('.block.connect-target-hover').forEach(el => el.classList.remove('connect-target-hover'));
  const underEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.block');
  if (underEl && underEl.id !== `block-${_dragConnect.fromId}`) {
    underEl.classList.add('connect-target-hover');
  }

  // Build bezier from the dragged side
  const dx = to.x - from.x, dy = to.y - from.y;
  const c  = Math.max(60, Math.abs(dx) * 0.5, Math.abs(dy) * 0.4);
  let d;
  switch (_dragConnect.side) {
    case 'right':  d = `M ${from.x} ${from.y} C ${from.x+c} ${from.y}, ${to.x-c} ${to.y}, ${to.x} ${to.y}`; break;
    case 'left':   d = `M ${from.x} ${from.y} C ${from.x-c} ${from.y}, ${to.x+c} ${to.y}, ${to.x} ${to.y}`; break;
    case 'bottom': d = `M ${from.x} ${from.y} C ${from.x} ${from.y+c}, ${to.x} ${to.y-c}, ${to.x} ${to.y}`; break;
    case 'top':    d = `M ${from.x} ${from.y} C ${from.x} ${from.y-c}, ${to.x} ${to.y+c}, ${to.x} ${to.y}`; break;
    default:       d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  _livePath.setAttribute('d', d);
}

function onDragConnectUp(e) {
  document.removeEventListener('mousemove', onDragConnectMove);
  document.removeEventListener('mouseup', onDragConnectUp);

  document.getElementById('canvasArea').classList.remove('connect-dragging');
  document.querySelectorAll('.block.connect-target-hover').forEach(el => el.classList.remove('connect-target-hover'));
  document.querySelectorAll('.block.connecting-source').forEach(el => el.classList.remove('connecting-source'));

  if (_livePath) { _livePath.remove(); _livePath = null; }

  const drag = _dragConnect;
  _dragConnect = null;

  if (!drag?.moved) return;

  const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.block');
  if (!targetEl) return;

  const toId = targetEl.id.replace('block-', '');
  if (!toId || toId === drag.fromId) return;

  const existing = state.connections.find(c => c.from === drag.fromId && c.to === toId);
  if (existing) return;

  history.snapshot();
  state.connections.push({ id: uid(), from: drag.fromId, to: toId, label: '' });
  renderAll();
  updateStatusBar();
  saveToLocalStorage();
  history.snapshot();
  toast('Conexão criada', 'success');
}

function startConnect(id) {
  state.connectingFrom = id;
  document.getElementById('connectHint').style.display = 'block';
  renderBlocks();
}

function cancelConnect() {
  state.connectingFrom = null;
  document.getElementById('connectHint').style.display = 'none';
  renderBlocks();
}

function finishConnect(toId) {
  const existing = state.connections.find(c => c.from === state.connectingFrom && c.to === toId);
  if (existing) { cancelConnect(); return; }

  history.snapshot();
  state.connections.push({ id: uid(), from: state.connectingFrom, to: toId, label: '' });
  cancelConnect();
  renderAll();
  updateStatusBar();
  saveToLocalStorage();
  history.snapshot();
  toast('Conexão criada', 'success');
}

function onConnectionClick(e) {
  e.stopPropagation();
  const id = e.target.dataset.id;
  selectConnection(id);
}

// ═══════════════════════════ SELEÇÃO ═════════════════════════════════════════
function selectBlock(id) {
  state.selectedBlockId = id;
  state.selectedConnectionId = null;
  state.selectedBlockIds = [];
  renderBlocks();
  renderDrawerBlock(id);
  updateStatusBar();
}

function selectConnection(id) {
  state.selectedConnectionId = id;
  state.selectedBlockId = null;
  state.selectedBlockIds = [];
  renderBlocks();
  renderConnections();
  renderDrawerConnection(id);
}

function deselectAll() {
  state.selectedBlockId = null;
  state.selectedConnectionId = null;
  state.selectedBlockIds = [];
  renderBlocks();
  renderConnections();
  renderDrawerDefault();
}

// ═══════════════════════════ ZOOM ════════════════════════════════════════════
function setZoom(z, cx, cy) {
  const prev = state.zoom;
  state.zoom = Math.min(1.8, Math.max(0.3, z));
  if (cx !== undefined) {
    const area = document.getElementById('canvasArea').getBoundingClientRect();
    const ox = cx - area.left;
    const oy = cy - area.top;
    state.panX = ox - (ox - state.panX) * (state.zoom / prev);
    state.panY = oy - (oy - state.panY) * (state.zoom / prev);
  }
  applyTransform();
  updateMinimap();
  saveToLocalStorage();
}

function resetZoom() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyTransform();
  updateMinimap();
  saveToLocalStorage();
}

function centerDiagram() {
  if (state.blocks.length === 0) return;
  const area = document.getElementById('canvasArea');
  const minX = Math.min(...state.blocks.map(b => b.x));
  const minY = Math.min(...state.blocks.map(b => b.y));
  const maxX = Math.max(...state.blocks.map(b => b.x + 240));
  const maxY = Math.max(...state.blocks.map(b => b.y + 120));
  const diagramW = maxX - minX;
  const diagramH = maxY - minY;
  state.panX = (area.offsetWidth - diagramW * state.zoom) / 2 - minX * state.zoom;
  state.panY = (area.offsetHeight - diagramH * state.zoom) / 2 - minY * state.zoom;
  applyTransform();
  updateMinimap();
}


