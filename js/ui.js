/* Split from script.js. Loaded as classic global script. */
function setupTopbar() {
  document.getElementById('btnUndo').addEventListener('click', () => { history.undo(); toast('Desfeito', 'info'); });
  document.getElementById('btnRedo').addEventListener('click', () => { history.redo(); toast('Refeito', 'info'); });
  document.getElementById('btnZoomIn').addEventListener('click', () => setZoom(state.zoom * 1.2));
  document.getElementById('btnZoomOut').addEventListener('click', () => setZoom(state.zoom / 1.2));
  document.getElementById('btnZoomReset').addEventListener('click', () => { state.zoom = 1; centerDiagram(); saveToLocalStorage(); });
  document.getElementById('btnPresent').addEventListener('click', startPresentation);

  document.getElementById('btnExportMenu').addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('exportDropdown');
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('exportDropdown').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-export]');
    if (!btn) return;
    document.getElementById('exportDropdown').style.display = 'none';
    handleExport(btn.dataset.export);
  });
  document.addEventListener('click', () => {
    document.getElementById('exportDropdown').style.display = 'none';
  });

  document.getElementById('diagramName').addEventListener('input', () => {
    showSaveStatus();
    saveToLocalStorage();
  });
}

function updateUndoRedoButtons() {
  document.getElementById('btnUndo').disabled = history.pointer <= 0;
  document.getElementById('btnRedo').disabled = history.pointer >= history.stack.length - 1;
}

function showSaveStatus(txt = 'Salvo localmente') {
  const el = document.getElementById('saveStatus');
  el.textContent = txt;
  document.getElementById('topbar').style.animation = 'saveFlash 0.6s ease';
  setTimeout(() => { document.getElementById('topbar').style.animation = ''; }, 700);
}

// ═══════════════════════════ DOCK / WORKSPACE PANEL ══════════════════════════
const VISIBLE_EXAMPLE_IDS = ['use-cases'];

function getVisibleExamples() {
  return TEMPLATES.filter(t => VISIBLE_EXAMPLE_IDS.includes(t.id));
}

function setupDock() {
  document.querySelectorAll('.dock-item').forEach(item => {
    item.addEventListener('click', () => {
      const panel = item.dataset.panel;
      const wp = document.getElementById('workspacePanel');
      const activeDock = document.querySelector('.dock-item.active');

      if (activeDock && activeDock !== item) activeDock.classList.remove('active');

      if (panel === 'canvas') {
        item.classList.add('active');
        wp.style.display = 'none';
        showCanvas();
        return;
      }

      if (panel === 'docs') {
        item.classList.add('active');
        wp.style.display = 'none';
        ensureDocsState();
        renderDocsPage();
        showDocsPage();
        return;
      }

      if (panel === 'inspirations') {
        item.classList.add('active');
        wp.style.display = 'none';
        ensureInspirationsState();
        renderInspirationsPage();
        showInspirationsPage();
        return;
      }

      if (wp.style.display !== 'none' && activeDock === item) {
        wp.style.display = 'none';
        return;
      }

      item.classList.add('active');
      openWorkspacePanel(panel);
    });
  });

  document.getElementById('wpClose').addEventListener('click', () => {
    document.getElementById('workspacePanel').style.display = 'none';
  });
}

function openWorkspacePanel(panel) {
  const wp = document.getElementById('workspacePanel');
  const title = document.getElementById('wpTitle');
  const body = document.getElementById('wpBody');

  wp.style.display = 'flex';

  const panels = {
    home: () => { title.textContent = 'Início'; body.innerHTML = renderHomePanelContent(); showHome(); },
    templates: () => { title.textContent = 'Exemplos'; body.innerHTML = renderExamplesPanel(); attachExamplesPanelEvents(); },
    code: () => { title.textContent = 'Gerar por código'; body.innerHTML = renderCodePanel(); attachCodePanelEvents(); },
    blocks: () => { title.textContent = 'Adicionar bloco'; body.innerHTML = renderBlocksPanel(); attachBlocksPanelEvents(); },
    layers: () => { title.textContent = 'Camadas'; body.innerHTML = renderLayersPanel(); },
    notes: () => { title.textContent = 'Notas'; body.innerHTML = renderNotesPanel(); attachNotesPanelEvents(); },
    history: () => { title.textContent = 'Histórico'; body.innerHTML = renderHistoryPanel(); attachHistoryPanelEvents(); },
    'export-panel': () => { title.textContent = 'Exportar'; body.innerHTML = renderExportPanel(); attachExportPanelEvents(); },
    settings: () => { title.textContent = 'Configurações'; body.innerHTML = renderSettingsPanel(); attachSettingsPanelEvents(); },
  };

  (panels[panel] || (() => { title.textContent = panel; body.innerHTML = ''; }))();
}

function renderHomePanelContent() {
  return `<p style="color:var(--muted);font-size:12px;line-height:1.6">Use a tela inicial para criar um canvas livre, importar Mermaid, abrir histórico ou preparar exportações para documento. Os exemplos ficam como pontos de partida opcionais.</p>`;
}

function openDockPanel(panel) {
  document.querySelectorAll('.dock-item').forEach(item => {
    item.classList.toggle('active', item.dataset.panel === panel);
  });
  openWorkspacePanel(panel);
}

function renderExamplesPanel() {
  return `
    <p class="panel-help">
      Modelos demonstrativos para inspiração. Use apenas como ponto de partida; para o trabalho escrito, recomendamos começar com um diagrama em branco e organizar manualmente.
    </p>
    ${getVisibleExamples().map(t => `
    <div class="template-list-item ${state.activeTemplate === t.id ? 'active' : ''}" data-tid="${t.id}">
      <div class="tli-dot"></div>
      <div style="display:flex;align-items:center;gap:9px;flex:1;min-width:0">
        <div style="width:26px;height:26px;border-radius:7px;background:${t.iconColor};border:1px solid ${t.iconBorder};color:${t.iconFg};display:flex;align-items:center;justify-content:center;flex-shrink:0">${t.icon.replace('stroke-width="1.7"','stroke-width="1.8"').replace('viewBox="0 0 24 24"','viewBox="0 0 24 24" width="14" height="14"')}</div>
        <div style="min-width:0">
          <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div>
          <div style="font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Usar como exemplo inicial</div>
        </div>
      </div>
    </div>
  `).join('')}
  `;
}

function attachExamplesPanelEvents() {
  document.querySelectorAll('.template-list-item[data-tid]').forEach(el => {
    el.addEventListener('click', () => loadTemplate(el.dataset.tid));
  });
}

function renderBlocksPanel() {
  return `
    <div class="block-type-list">
      ${BLOCK_TYPES.map(t => `
        <div class="block-type-item" data-btype="${t.type}">
          <div class="bti-dot" style="background:${t.color}"></div>
          <div>
            <div class="bti-name">${t.label}</div>
            <div class="bti-sub">${t.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function attachBlocksPanelEvents() {
  document.querySelectorAll('.block-type-item[data-btype]').forEach(el => {
    el.addEventListener('click', () => addBlockOfType(el.dataset.btype));
  });
}

function renderLayersPanel() {
  if (state.blocks.length === 0) return '<p style="color:var(--muted);font-size:12px">Nenhum bloco no diagrama.</p>';
  return state.blocks.map((b, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;border:1px solid var(--line);margin-bottom:4px;cursor:pointer;background:var(--surface-soft)" data-lid="${b.id}">
      <div style="width:8px;height:8px;border-radius:50%;background:${b.color || '#47d6bd'};flex-shrink:0"></div>
      <div style="font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(b.title)}</div>
      <div style="font-size:9px;color:var(--muted)">${i + 1}</div>
    </div>
  `).join('');
}

function renderNotesPanel() {
  const key = state.activeTemplate || 'default';
  const val = state.notes[key] || '';
  return `
    <p style="font-size:11px;color:var(--muted);margin-bottom:8px">Notas para este diagrama. São salvas automaticamente.</p>
    <textarea class="notes-area" id="notesTextarea">${escHtml(val)}</textarea>
    <button class="btn-drawer primary" style="margin-top:8px;width:100%" id="saveNoteBtn">Salvar nota</button>
  `;
}

function attachNotesPanelEvents() {
  const btn = document.getElementById('saveNoteBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const key = state.activeTemplate || 'default';
      state.notes[key] = document.getElementById('notesTextarea').value;
      saveToLocalStorage();
      toast('Nota salva', 'success');
    });
  }
}

function renderHistoryPanel() {
  const items = getHistoryItems();
  if (items.length === 0) return '<p style="color:var(--muted);font-size:12px">Nenhum histórico salvo.</p>';
  return items.map((item, i) => `
    <div class="history-item" data-hi="${i}">
      <div class="hi-name">${escHtml(item.name)}</div>
      <div class="hi-meta">${escHtml(formatDiagramOrigin(item.template))} · ${item.blocks} blocos · ${item.connections} conexões</div>
      <div class="hi-meta" style="margin-top:2px">${item.date}</div>
    </div>
  `).join('');
}

function formatDiagramOrigin(id) {
  if (!id || id === '—') return 'Canvas livre';
  if (id === 'free') return 'Canvas livre';
  if (id === 'code-import') return 'Gerado por código';
  const example = TEMPLATES.find(t => t.id === id);
  return example ? example.title : id;
}

function renderExportPanel() {
  return `
    ${[
      { f: 'json', icon: '{}', name: 'JSON', desc: 'Estrutura completa do diagrama' },
      { f: 'png-doc-light', icon: 'A4', name: 'PNG Documento claro', desc: 'A4 em alta resolucao para trabalho escrito' },
      { f: 'png-doc-dark', icon: 'A4', name: 'PNG Documento escuro', desc: 'A4 com identidade visual do Cognita' },
      { f: 'png-slide', icon: '16:9', name: 'PNG Slide', desc: 'Imagem widescreen para apresentacao' },
      { f: 'png-mobile', icon: '9:16', name: 'PNG Mobile', desc: 'Compartilhamento e visualizacao no celular' },
      { f: 'png', icon: '🖼', name: 'PNG 2x', desc: 'Imagem em alta resolução' },
      { f: 'svg', icon: '✦', name: 'SVG', desc: 'Vetor escalável' },
      { f: 'mermaid', icon: '〜', name: 'Mermaid', desc: 'Código para ferramentas externas' },
      { f: 'text', icon: '📄', name: 'Documentação', desc: 'Texto estruturado para apresentação' },
    ].map(e => `
      <button class="export-panel-btn" data-exp="${e.f}">
        <span class="epb-icon">${e.icon}</span>
        <div class="epb-info">
          <div class="epb-name">${e.name}</div>
          <div class="epb-desc">${e.desc}</div>
        </div>
      </button>
    `).join('')}
  `;
}

function attachExportPanelEvents() {
  document.querySelectorAll('.export-panel-btn[data-exp]').forEach(btn => {
    btn.addEventListener('click', () => handleExport(btn.dataset.exp));
  });
}

function renderSettingsPanel() {
  return `
    <div class="settings-toggle">
      <span class="toggle-label">Snap to grid</span>
      <div class="toggle-switch ${state.snapToGrid ? 'on' : ''}" id="toggleSnap"></div>
    </div>
    <div class="settings-toggle">
      <span class="toggle-label">Minimap</span>
      <div class="toggle-switch ${state.showMinimap ? 'on' : ''}" id="toggleMinimap"></div>
    </div>
    <div style="margin-top:16px">
      <button class="btn-drawer primary" style="width:100%" id="organizeDiagramBtn">Organizar automaticamente</button>
    </div>
    <div style="margin-top:8px">
      <button class="btn-drawer danger" style="width:100%" id="clearDiagramBtn">Limpar diagrama</button>
    </div>
    <div style="margin-top:8px">
      <button class="btn-drawer" style="width:100%" id="newDiagramBtn">Novo diagrama</button>
    </div>
  `;
}

function attachSettingsPanelEvents() {
  document.getElementById('toggleSnap')?.addEventListener('click', (e) => {
    state.snapToGrid = !state.snapToGrid;
    e.target.classList.toggle('on', state.snapToGrid);
    saveToLocalStorage();
    toast('Snap: ' + (state.snapToGrid ? 'ativado' : 'desativado'), 'info');
  });
  document.getElementById('toggleMinimap')?.addEventListener('click', (e) => {
    state.showMinimap = !state.showMinimap;
    e.target.classList.toggle('on', state.showMinimap);
    document.getElementById('minimap').style.display = state.showMinimap && state.blocks.length > 0 ? 'block' : 'none';
    saveToLocalStorage();
  });
  document.getElementById('organizeDiagramBtn')?.addEventListener('click', () => {
    if (!state.blocks.length) { toast('Nada para organizar', 'info'); return; }
    history.snapshot();
    state.blocks = autoLayoutBlocks(state.blocks, state.connections, 'LR');
    state.lanes = [];
    renderAll();
    centerDiagram();
    updateStatusBar();
    saveToLocalStorage();
    history.snapshot();
    toast('Diagrama organizado automaticamente', 'success');
  });
  document.getElementById('clearDiagramBtn')?.addEventListener('click', async () => {
    const ok = await openModal({ title: 'Limpar diagrama', message: 'Isso irá remover todos os blocos e conexões. Continuar?', confirmText: 'Limpar', cancelText: 'Cancelar' });
    if (ok === null) return;
    history.snapshot();
    state.blocks = [];
    state.connections = [];
    state.lanes = [];
    state.codeImportMeta = null;
    renderAll();
    updateStatusBar();
    saveToLocalStorage();
    history.snapshot();
    toast('Diagrama limpo', 'info');
  });
  document.getElementById('newDiagramBtn')?.addEventListener('click', async () => {
    const ok = await openModal({ title: 'Novo diagrama', message: 'Isso criará um novo diagrama em branco. O atual será salvo no histórico.', confirmText: 'Criar', cancelText: 'Cancelar' });
    if (ok === null) return;
    saveHistoryEntry();
    history.snapshot();
    state.blocks = [];
    state.connections = [];
    state.lanes = [];
    state.activeTemplate = 'free';
    state.codeImportMeta = null;
    state.selectedBlockId = null;
    state.selectedConnectionId = null;
    state.selectedBlockIds = [];
    state.connectingFrom = null;
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    document.getElementById('diagramName').value = 'Diagrama livre';
    showCanvas();
    renderAll();
    applyTransform();
    renderDrawerDefault();
    updateStatusBar();
    saveToLocalStorage();
    history.snapshot();
    document.getElementById('workspacePanel').style.display = 'none';
    toast('Canvas em branco criado', 'success');
  });
}

// ═══════════════════════════ DRAWER DIREITO ══════════════════════════════════
function renderDrawerDefault() {
  const dc = document.getElementById('drawerContent');
  const hasBlocks = state.blocks.length > 0;

  if (state.activeTemplate === 'code-import' && state.codeImportMeta) {
    const m = state.codeImportMeta;
    const dirLabel = { LR: 'Esquerda → Direita', RL: 'Direita → Esquerda', TD: 'Cima → Baixo', TB: 'Cima → Baixo', BT: 'Baixo → Cima' }[m.direction] || m.direction;
    dc.innerHTML = `
      <div class="proj-card">
        <div class="proj-card-top">
          <span class="proj-card-name">Gerado por código</span>
          <span class="proj-card-badge">Mermaid</span>
        </div>
        <div class="proj-card-sub">${m.probableType}</div>
      </div>
      <div class="proj-meta">
        <div class="proj-meta-item"><span class="pmi-label">Blocos</span><span class="pmi-val">${m.blockCount} detectados</span></div>
        <div class="proj-meta-item"><span class="pmi-label">Conexões</span><span class="pmi-val">${m.connectionCount} detectadas</span></div>
        <div class="proj-meta-item"><span class="pmi-label">Direção</span><span class="pmi-val">${dirLabel}</span></div>
        <div class="proj-meta-item"><span class="pmi-label">Tipo provável</span><span class="pmi-val">${m.probableType}</span></div>
      </div>
      <div class="drawer-section-title" style="margin-top:4px">Reorganizar</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
        <button class="btn-drawer primary" id="reorgActors">Por atores (LR)</button>
        <button class="btn-drawer" id="reorgLR">Hierárquico LR</button>
        <button class="btn-drawer" id="reorgTD">Vertical TD</button>
      </div>
      <div class="drawer-hint">Clique direito em um bloco para mais opções.</div>
    `;
    attachCodeImportDrawerEvents();
    return;
  }

  dc.innerHTML = `
    <div class="proj-card">
      <div class="proj-card-top">
        <span class="proj-card-name">CognitaMente</span>
        <span class="proj-card-badge">MVP</span>
      </div>
      <div class="proj-card-sub">Versão de apresentação</div>
    </div>
    <div class="proj-meta">
      <div class="proj-meta-item"><span class="pmi-label">Público</span><span class="pmi-val">TEA · 8–11 anos</span></div>
      <div class="proj-meta-item"><span class="pmi-label">Módulo</span><span class="pmi-val">Língua Portuguesa</span></div>
      <div class="proj-meta-item"><span class="pmi-label">Foco</span><span class="pmi-val">Leitura e interpretação</span></div>
    </div>
    <div class="proj-maturity">
      <div class="proj-maturity-row">
        <span class="proj-maturity-label">Maturidade</span>
        <span class="proj-maturity-count">6 / 6 ✓</span>
      </div>
      <div class="proj-maturity-bar"><div class="proj-maturity-fill" style="width:100%"></div></div>
    </div>
    <div class="drawer-hint">
      ${hasBlocks
        ? `Clique em um bloco para ver suas propriedades.<br>Clique direito para mais opções.`
        : `Comece com um canvas em branco<br>ou clique em <kbd>Blocos</kbd> para adicionar.`
      }
    </div>
  `;
}

function attachCodeImportDrawerEvents() {
  const reapply = (dir) => {
    if (!state.codeImportMeta?.rawCode) return;
    history.snapshot();
    const parsed = parseMermaidLike(state.codeImportMeta.rawCode);
    state.blocks = autoLayoutBlocks(parsed.blocks, parsed.connections, dir);
    state.connections = parsed.connections;
    state.codeImportMeta = { ...state.codeImportMeta, direction: dir };
    state.zoom = 1; state.panX = 0; state.panY = 0;
    renderAll();
    centerDiagramAfterImport();
    updateStatusBar();
    saveToLocalStorage();
    history.snapshot();
    renderDrawerDefault();
    toast('Diagrama reorganizado', 'success');
  };

  document.getElementById('reorgActors')?.addEventListener('click', () => reapply('LR'));
  document.getElementById('reorgLR')?.addEventListener('click', () => {
    // Force LR BFS layout (bypass use-case detection by passing a modified layout)
    if (!state.codeImportMeta?.rawCode) return;
    history.snapshot();
    const parsed = parseMermaidLike(state.codeImportMeta.rawCode);
    const byId = new Map(parsed.blocks.map(b => [b.id, b]));
    const out   = new Map(parsed.blocks.map(b => [b.id, []]));
    const inC   = new Map(parsed.blocks.map(b => [b.id, 0]));
    parsed.connections.forEach(c => { out.get(c.from)?.push(c.to); inC.set(c.to, (inC.get(c.to) || 0) + 1); });
    const roots = parsed.blocks.filter(b => !inC.get(b.id));
    state.blocks = layoutLeftRight(parsed.blocks, parsed.connections, roots, out, byId);
    state.connections = parsed.connections;
    state.codeImportMeta = { ...state.codeImportMeta, direction: 'LR' };
    state.zoom = 1; state.panX = 0; state.panY = 0;
    renderAll(); centerDiagramAfterImport(); updateStatusBar(); saveToLocalStorage(); history.snapshot();
    renderDrawerDefault();
    toast('Layout hierárquico LR', 'success');
  });
  document.getElementById('reorgTD')?.addEventListener('click', () => reapply('TD'));
}

function renderDrawerBlock(id) {
  const block = state.blocks.find(b => b.id === id);
  if (!block) return;
  const typeDef = BLOCK_TYPES.find(t => t.type === block.type) || BLOCK_TYPES[1];
  const dc = document.getElementById('drawerContent');

  dc.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title">Bloco selecionado</div>
      <div class="drawer-field">
        <label>Tipo</label>
        <select id="drBlockType">
          ${BLOCK_TYPES.map(t => `<option value="${t.type}" ${t.type === block.type ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="drawer-field">
        <label>Título</label>
        <input type="text" id="drBlockTitle" value="${escAttr(block.title)}" />
      </div>
      <div class="drawer-field">
        <label>Descrição</label>
        <textarea id="drBlockDesc">${escHtml(block.description || '')}</textarea>
      </div>
      ${block.type === 'decision' ? `
        <div class="drawer-field">
          <label>Ramificações (ex: Sim → avança)</label>
          <textarea id="drBlockBranches">${escHtml(block.branches || '')}</textarea>
        </div>
      ` : ''}
      <div class="drawer-field">
        <label>Cor</label>
        <div class="color-swatches">
          ${['#47d6bd','#6ca8ff','#9b7cff','#ffb454','#ff6b5c','#91aaa5'].map(c =>
            `<div class="color-swatch ${block.color === c ? 'active' : ''}" data-c="${c}" style="background:${c}"></div>`
          ).join('')}
        </div>
      </div>
      <div class="drawer-field">
        <label>Tags (separadas por vírgula)</label>
        <input type="text" id="drBlockTags" value="${(block.tags || []).join(', ')}" />
      </div>
      <div class="drawer-actions" style="margin-top:12px">
        <button class="btn-drawer primary" id="drDuplicate">Duplicar</button>
        <button class="btn-drawer danger" id="drDelete">Excluir</button>
      </div>
    </div>
  `;

  // Live updates
  const applyChanges = () => {
    const prev = JSON.stringify(block);
    block.type = document.getElementById('drBlockType').value;
    block.title = document.getElementById('drBlockTitle').value;
    block.description = document.getElementById('drBlockDesc').value;
    if (block.type === 'decision') {
      const el = document.getElementById('drBlockBranches');
      if (el) block.branches = el.value;
    }
    block.tags = document.getElementById('drBlockTags').value.split(',').map(s => s.trim()).filter(Boolean);
    if (JSON.stringify(block) !== prev) {
      renderAll();
      saveToLocalStorage();
    }
  };

  ['drBlockType','drBlockTitle','drBlockDesc','drBlockTags'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyChanges);
    document.getElementById(id)?.addEventListener('change', applyChanges);
  });
  document.getElementById('drBlockBranches')?.addEventListener('input', applyChanges);

  document.querySelectorAll('.color-swatch[data-c]').forEach(sw => {
    sw.addEventListener('click', () => {
      block.color = sw.dataset.c;
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      renderAll();
      saveToLocalStorage();
    });
  });

  document.getElementById('drDuplicate')?.addEventListener('click', () => duplicateBlock(block.id));

  document.getElementById('drDelete')?.addEventListener('click', () => deleteSelectedBlock());
}

function renderDrawerConnection(id) {
  const conn = state.connections.find(c => c.id === id);
  if (!conn) return;
  const from = state.blocks.find(b => b.id === conn.from);
  const to = state.blocks.find(b => b.id === conn.to);
  const dc = document.getElementById('drawerContent');

  dc.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title">Conexão selecionada</div>
      <div class="drawer-field">
        <label>De</label>
        <input type="text" value="${escAttr(from ? from.title : conn.from)}" readonly style="opacity:.7" />
      </div>
      <div class="drawer-field">
        <label>Para</label>
        <input type="text" value="${escAttr(to ? to.title : conn.to)}" readonly style="opacity:.7" />
      </div>
      <div class="drawer-field">
        <label>Rótulo</label>
        <input type="text" id="drConnLabel" value="${escAttr(conn.label || '')}" placeholder="Ex: Sim, Não, Avança..." />
      </div>
      <div class="drawer-actions" style="margin-top:12px">
        <button class="btn-drawer" id="drInvertConn">Inverter</button>
        <button class="btn-drawer danger" id="drDeleteConn">Excluir</button>
      </div>
    </div>
  `;

  document.getElementById('drConnLabel')?.addEventListener('input', (e) => {
    conn.label = e.target.value;
    renderConnections();
    saveToLocalStorage();
  });

  document.getElementById('drInvertConn')?.addEventListener('click', () => {
    history.snapshot();
    const tmp = conn.from;
    conn.from = conn.to;
    conn.to = tmp;
    renderConnections();
    saveToLocalStorage();
    history.snapshot();
    toast('Conexão invertida', 'info');
  });

  document.getElementById('drDeleteConn')?.addEventListener('click', () => deleteSelectedConnection());
}

// ═══════════════════════════ HOME / CANVAS SWITCH ════════════════════════════
function showHome() {
  if (typeof hideDocsPage === 'function') hideDocsPage();
  if (typeof hideInspirationsPage === 'function') hideInspirationsPage();
  document.getElementById('homeScreen').style.display = 'flex';
  document.getElementById('canvasContainer').style.display = 'none';
  document.getElementById('minimap').style.display = 'none';
  document.body.classList.add('home-mode');
}

function showCanvas() {
  if (typeof hideDocsPage === 'function') hideDocsPage();
  if (typeof hideInspirationsPage === 'function') hideInspirationsPage();
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('canvasContainer').style.display = 'block';
  if (state.showMinimap) document.getElementById('minimap').style.display = 'block';
  document.body.classList.remove('home-mode');
}

function buildTemplateGrid() {
  const grid = document.getElementById('templateGrid');
  grid.className = 'home-actions-grid';
  grid.innerHTML = `
    <button class="home-action-card primary" id="homeNewBlank">
      <div class="hac-icon">+</div>
      <div class="hac-title">Novo diagrama em branco</div>
      <div class="hac-desc">Comece do zero e construa fluxogramas, mapas mentais, jornadas ou arquiteturas.</div>
    </button>

    <button class="home-action-card" id="homeImportMermaid">
      <div class="hac-icon">{ }</div>
      <div class="hac-title">Importar código Mermaid</div>
      <div class="hac-desc">Cole um flowchart e transforme em blocos editáveis no canvas.</div>
    </button>

    <button class="home-action-card" id="homeOpenSaved">
      <div class="hac-icon">↺</div>
      <div class="hac-title">Abrir diagrama salvo</div>
      <div class="hac-desc">Restaure versões salvas no histórico local do navegador.</div>
    </button>

    <button class="home-action-card" id="homeExportDoc">
      <div class="hac-icon">A4</div>
      <div class="hac-title">Exportar para trabalho escrito</div>
      <div class="hac-desc">Gere PNG ou SVG em formato legível para documento, relatório ou apresentação.</div>
    </button>
  `;

  document.getElementById('homeNewBlank')?.addEventListener('click', startBlankDiagram);
  document.getElementById('homeImportMermaid')?.addEventListener('click', () => openDockPanel('code'));
  document.getElementById('homeOpenSaved')?.addEventListener('click', () => openDockPanel('history'));
  document.getElementById('homeExportDoc')?.addEventListener('click', () => openDockPanel('export-panel'));
}

async function startBlankDiagram() {
  if (state.blocks.length > 0) {
    const ok = await openModal({
      title: 'Novo diagrama em branco',
      message: 'Isso criará um canvas vazio. O diagrama atual será salvo no histórico.',
      confirmText: 'Criar',
      cancelText: 'Cancelar',
    });

    if (ok === null) return;
    saveHistoryEntry();
  }

  history.snapshot();
  state.blocks = [];
  state.connections = [];
  state.lanes = [];
  state.activeTemplate = 'free';
  state.codeImportMeta = null;
  state.selectedBlockId = null;
  state.selectedConnectionId = null;
  state.selectedBlockIds = [];
  state.connectingFrom = null;
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;

  document.getElementById('diagramName').value = 'Diagrama livre';
  showCanvas();
  renderAll();
  applyTransform();
  updateStatusBar();
  renderDrawerDefault();
  saveToLocalStorage();
  history.snapshot();

  document.getElementById('workspacePanel').style.display = 'none';
  toast('Canvas em branco criado', 'success');
}

async function loadTemplate(id) {
  if (state.blocks.length > 0) {
    const ok = await openModal({
      title: 'Abrir exemplo',
      message: 'Isso substituirá o diagrama atual. O diagrama atual será salvo no histórico.',
      confirmText: 'Abrir',
      cancelText: 'Cancelar',
    });
    if (ok === null) return;
    saveHistoryEntry();
  }

  history.snapshot();
  const tmpl = TEMPLATES.find(t => t.id === id);
  if (!tmpl) return;

  const data = tmpl.generate();
  state.blocks = avoidOverlaps(data.blocks || [], false);
  state.connections = data.connections || [];
  state.lanes = data.lanes || [];
  state.activeTemplate = id;
  state.codeImportMeta = null;
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;

  document.getElementById('diagramName').value = tmpl.title;
  document.getElementById('sbTemplate').textContent = tmpl.title;

  showCanvas();
  renderAll();
  applyTransform();
  centerDiagram();
  deselectAll();
  updateStatusBar();
  saveToLocalStorage();
  history.snapshot();
  toast(`Exemplo "${tmpl.title}" carregado`, 'success');

  document.getElementById('workspacePanel').style.display = 'none';
}


