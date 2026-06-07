/* Split from script.js. Loaded as classic global script. */
function addBlockOfType(type) {
  if (state.blocks.length === 0) { showCanvas(); }
  history.snapshot();

  const typeDef = BLOCK_TYPES.find(t => t.type === type) || BLOCK_TYPES[1];
  const cx = (document.getElementById('canvasArea').offsetWidth / 2 - state.panX) / state.zoom;
  const cy = (document.getElementById('canvasArea').offsetHeight / 2 - state.panY) / state.zoom;

  const block = {
    id: uid(),
    type,
    title: typeDef.label,
    description: typeDef.desc,
    x: Math.round((cx - 90) / 16) * 16,
    y: Math.round((cy - 32) / 16) * 16,
    color: typeDef.color,
    tags: [],
    lane: null,
    branches: type === 'decision' ? 'Sim → avança\nNão → recebe apoio' : '',
  };

  state.blocks.push(block);
  renderAll();
  updateStatusBar();
  saveToLocalStorage();
  history.snapshot();
  selectBlock(block.id);
  toast(`Bloco "${typeDef.label}" adicionado`, 'success');
}

// ═══════════════════════════ DUPLICAR ════════════════════════════════════════
function duplicateBlock(id) {
  const block = state.blocks.find(b => b.id === id);
  if (!block) return;
  history.snapshot();
  const copy = { ...JSON.parse(JSON.stringify(block)), id: uid(), x: block.x + 24, y: block.y + 24 };
  state.blocks.push(copy);
  renderAll(); updateStatusBar(); saveToLocalStorage(); history.snapshot();
  selectBlock(copy.id);
  toast('Bloco duplicado', 'success');
}

// ═══════════════════════════ DELETAR ════════════════════════════════════════
function deleteSelectedBlock() {
  if (!state.selectedBlockId) return;
  history.snapshot();
  const id = state.selectedBlockId;
  state.blocks = state.blocks.filter(b => b.id !== id);
  state.connections = state.connections.filter(c => c.from !== id && c.to !== id);
  state.selectedBlockId = null;
  renderAll();
  renderDrawerDefault();
  updateStatusBar();
  saveToLocalStorage();
  history.snapshot();
  toast('Bloco removido', 'info');
}

function deleteSelectedConnection() {
  if (!state.selectedConnectionId) return;
  history.snapshot();
  state.connections = state.connections.filter(c => c.id !== state.selectedConnectionId);
  state.selectedConnectionId = null;
  renderConnections();
  renderDrawerDefault();
  updateStatusBar();
  saveToLocalStorage();
  history.snapshot();
  toast('Conexão removida', 'info');
}

// ═══════════════════════════ CONTEXT MENU ════════════════════════════════════
function showContextMenu(x, y, blockId) {
  hideContextMenu();
  const menu = document.getElementById('contextMenu');
  const isMulti = state.selectedBlockIds.includes(blockId) && state.selectedBlockIds.length > 1;
  menu.innerHTML = `
    ${isMulti ? `<div class="ctx-item" id="ctx-copy-multi">
      <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Copiar selecionados <span class="ctx-shortcut">Ctrl+C</span>
    </div>
    <div class="ctx-item danger" id="ctx-delete-multi">
      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      Excluir selecionados
    </div>` : `
    <div class="ctx-item" id="ctx-dup">
      <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Duplicar <span class="ctx-shortcut">Ctrl+D</span>
    </div>
    <div class="ctx-item" id="ctx-copy">
      <svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
      Copiar <span class="ctx-shortcut">Ctrl+C</span>
    </div>
    <div class="ctx-item" id="ctx-connect">
      <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h10M15 9l3 3-3 3"/></svg>
      Conectar a...
    </div>
    <div class="ctx-separator"></div>
    <div class="ctx-item danger" id="ctx-delete">
      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      Excluir <span class="ctx-shortcut">Del</span>
    </div>`}
  `;

  menu.style.display = 'block';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  setTimeout(() => {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = (x - r.width) + 'px';
    if (r.bottom > window.innerHeight) menu.style.top = (y - r.height) + 'px';
  }, 0);

  if (isMulti) {
    document.getElementById('ctx-copy-multi')?.addEventListener('click', () => {
      state.clipboard = state.selectedBlockIds.map(id => JSON.parse(JSON.stringify(state.blocks.find(b => b.id === id)))).filter(Boolean);
      toast(`${state.clipboard.length} bloco(s) copiado(s)`, 'info');
      hideContextMenu();
    });
    document.getElementById('ctx-delete-multi')?.addEventListener('click', () => {
      history.snapshot();
      state.selectedBlockIds.forEach(id => {
        state.blocks = state.blocks.filter(b => b.id !== id);
        state.connections = state.connections.filter(c => c.from !== id && c.to !== id);
      });
      state.selectedBlockIds = [];
      renderAll(); renderDrawerDefault(); updateStatusBar(); saveToLocalStorage(); history.snapshot();
      toast('Blocos removidos', 'info');
      hideContextMenu();
    });
  } else {
    document.getElementById('ctx-dup')?.addEventListener('click', () => { duplicateBlock(blockId); hideContextMenu(); });
    document.getElementById('ctx-copy')?.addEventListener('click', () => {
      const b = state.blocks.find(b => b.id === blockId);
      state.clipboard = [JSON.parse(JSON.stringify(b))];
      toast('Bloco copiado', 'info');
      hideContextMenu();
    });
    document.getElementById('ctx-connect')?.addEventListener('click', () => {
      selectBlock(blockId);
      startConnect(blockId);
      hideContextMenu();
    });
    document.getElementById('ctx-delete')?.addEventListener('click', () => {
      selectBlock(blockId);
      deleteSelectedBlock();
      hideContextMenu();
    });
  }
}

function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (menu) menu.style.display = 'none';
}


