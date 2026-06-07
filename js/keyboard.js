/* Split from script.js. Loaded as classic global script. */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName.toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (state.presentMode) {
      if (e.key === 'Escape') stopPresentation();
      if (e.key === 'ArrowRight' && state.presentStep < state.blocks.length - 1) { state.presentStep++; updatePresentCard(); highlightPresentBlock(); }
      if (e.key === 'ArrowLeft' && state.presentStep > 0) { state.presentStep--; updatePresentCard(); highlightPresentBlock(); }
      return;
    }

    if (e.ctrlKey && e.key === 'z' && !typing) { e.preventDefault(); history.undo(); toast('Desfeito', 'info'); return; }
    if (e.ctrlKey && (e.key === 'y' || e.key === 'Y') && !typing) { e.preventDefault(); history.redo(); toast('Refeito', 'info'); return; }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveToLocalStorage(); showSaveStatus(); toast('Salvo', 'success'); return; }
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); handleExport('json'); return; }
    if (e.ctrlKey && e.key === '0') { e.preventDefault(); resetZoom(); return; }

    if (e.ctrlKey && e.key === 'c' && !typing) {
      e.preventDefault();
      const ids = state.selectedBlockIds.length > 0
        ? state.selectedBlockIds
        : state.selectedBlockId ? [state.selectedBlockId] : [];
      if (ids.length === 0) return;
      state.clipboard = ids.map(id => JSON.parse(JSON.stringify(state.blocks.find(b => b.id === id)))).filter(Boolean);
      toast(`${state.clipboard.length} bloco(s) copiado(s)`, 'info');
      return;
    }

    if (e.ctrlKey && e.key === 'v' && !typing) {
      e.preventDefault();
      if (!state.clipboard || state.clipboard.length === 0) return;
      history.snapshot();
      const pasted = state.clipboard.map(b => ({ ...b, id: uid(), x: b.x + 24, y: b.y + 24 }));
      state.blocks.push(...pasted);
      state.selectedBlockIds = pasted.map(b => b.id);
      state.selectedBlockId = pasted.length === 1 ? pasted[0].id : null;
      if (pasted.length === 1) renderDrawerBlock(pasted[0].id);
      renderAll(); updateStatusBar(); saveToLocalStorage(); history.snapshot();
      toast(`${pasted.length} bloco(s) colado(s)`, 'success');
      return;
    }

    if (e.ctrlKey && e.key === 'd' && !typing) {
      e.preventDefault();
      if (state.selectedBlockId) duplicateBlock(state.selectedBlockId);
      return;
    }

    if (e.key === 'Escape') { cancelConnect(); deselectAll(); hideContextMenu(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
      e.preventDefault();
      if (state.selectedBlockIds.length > 1) {
        history.snapshot();
        state.selectedBlockIds.forEach(id => {
          state.blocks = state.blocks.filter(b => b.id !== id);
          state.connections = state.connections.filter(c => c.from !== id && c.to !== id);
        });
        state.selectedBlockIds = [];
        renderAll(); renderDrawerDefault(); updateStatusBar(); saveToLocalStorage(); history.snapshot();
        toast('Blocos removidos', 'info');
      } else if (state.selectedBlockId) {
        deleteSelectedBlock();
      } else if (state.selectedConnectionId) {
        deleteSelectedConnection();
      }
      return;
    }
  });
}


