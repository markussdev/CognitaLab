/* Split from script.js. Loaded as classic global script. */
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('cognita_lab_state');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.blocks && data.blocks.length > 0) {
        state.blocks = data.blocks;
        state.connections = data.connections || [];
        state.lanes = data.lanes || [];
        state.activeTemplate = data.activeTemplate || null;
        state.codeImportMeta = data.codeImportMeta || null;
        state.snapToGrid = data.snapToGrid !== undefined ? data.snapToGrid : state.snapToGrid;
        state.showMinimap = data.showMinimap !== undefined ? data.showMinimap : state.showMinimap;
        state.zoom = data.zoom || 1;
        state.panX = data.panX || 0;
        state.panY = data.panY || 0;
        if (data.diagramName) document.getElementById('diagramName').value = data.diagramName;
        if (data.notes) state.notes = data.notes;
        if (data.docs) state.docs = data.docs;
        if (typeof ensureDocsState === 'function') ensureDocsState();
        if (data.inspirations) state.inspirations = data.inspirations;
        if (typeof ensureInspirationsState === 'function') ensureInspirationsState();
        showCanvas();
        renderAll();
        applyTransform();
        history.snapshot();
        return;
      }
    }
  } catch (e) {}
  if (typeof ensureDocsState === 'function') ensureDocsState();
  if (typeof ensureInspirationsState === 'function') ensureInspirationsState();
  // Show home by default
  showHome();
}


function getHistoryItems() {
  try {
    return JSON.parse(localStorage.getItem('cognita_lab_history') || '[]');
  } catch { return []; }
}

function attachHistoryPanelEvents() {
  document.querySelectorAll('.history-item[data-hi]').forEach(el => {
    el.addEventListener('click', () => restoreHistoryItem(parseInt(el.dataset.hi)));
  });
}

function restoreHistoryItem(index) {
  const items = getHistoryItems();
  const item = items[index];
  if (!item || !item.snapshot) return;
  try {
    const snap = JSON.parse(item.snapshot);
    history.snapshot();
    state.blocks = snap.blocks || [];
    state.connections = snap.connections || [];
    state.lanes = snap.lanes || [];
    state.activeTemplate = snap.activeTemplate || null;
    state.codeImportMeta = snap.codeImportMeta || null;
    state.zoom = snap.zoom || 1;
    state.panX = snap.panX || 0;
    state.panY = snap.panY || 0;
    state.notes = snap.notes || state.notes || {};
    if (snap.diagramName) document.getElementById('diagramName').value = snap.diagramName;
    showCanvas();
    renderAll();
    applyTransform();
    renderDrawerDefault();
    updateStatusBar();
    saveToLocalStorage(false);
    history.snapshot();
    toast('Versão restaurada', 'success');
  } catch (e) { toast('Erro ao restaurar', 'error'); }
}

function saveToLocalStorage(showStatus = true) {
  try {
    const data = {
      blocks: state.blocks,
      connections: state.connections,
      lanes: state.lanes,
      activeTemplate: state.activeTemplate,
      codeImportMeta: state.codeImportMeta,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      diagramName: document.getElementById('diagramName').value,
      notes: state.notes,
      docs: state.docs,
      inspirations: state.inspirations,
      snapToGrid: state.snapToGrid,
      showMinimap: state.showMinimap,
    };
    localStorage.setItem('cognita_lab_state', JSON.stringify(data));
    if (showStatus) showSaveStatus();
  } catch (e) {}
}

function saveHistoryEntry() {
  if (state.blocks.length === 0) return;
  try {
    const items = getHistoryItems().slice(0, 14);
    const entry = {
      name: document.getElementById('diagramName').value || 'Sem título',
      template: state.activeTemplate || '—',
      blocks: state.blocks.length,
      connections: state.connections.length,
      date: new Date().toLocaleString('pt-BR'),
      snapshot: JSON.stringify({
        blocks: state.blocks,
        connections: state.connections,
        lanes: state.lanes,
        activeTemplate: state.activeTemplate,
        codeImportMeta: state.codeImportMeta,
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        diagramName: document.getElementById('diagramName').value,
        notes: state.notes,
      }),
    };
    items.unshift(entry);
    localStorage.setItem('cognita_lab_history', JSON.stringify(items));
  } catch (e) {}
}

