/* Split from script.js. Loaded as classic global script.
   Banco de inspirações — referências, ideias e decisões para a CognitaMente. */

const INSPIRATION_TYPES = [
  { id: 'site',           label: 'Site' },
  { id: 'imagem',         label: 'Imagem' },
  { id: 'artigo',         label: 'Artigo' },
  { id: 'ideia',          label: 'Ideia' },
  { id: 'video',          label: 'Vídeo' },
  { id: 'documento',      label: 'Documento' },
  { id: 'frase',          label: 'Frase' },
  { id: 'feedback',       label: 'Feedback' },
  { id: 'pergunta',       label: 'Pergunta' },
  { id: 'acessibilidade', label: 'Acessibilidade' },
];

const INSPIRATION_STATUS = [
  { id: 'usar',       label: 'Usar' },
  { id: 'avaliar',    label: 'Avaliar' },
  { id: 'descartado', label: 'Descartado' },
];

// ═══════════════════════════ STATE ═══════════════════════════════════════════

function ensureInspirationsState() {
  if (!state.inspirations || typeof state.inspirations !== 'object') {
    state.inspirations = { activeId: null, filterStatus: 'all', filterType: 'all', search: '', items: [] };
  }
  if (!Array.isArray(state.inspirations.items))    state.inspirations.items        = [];
  if (!state.inspirations.filterStatus)            state.inspirations.filterStatus = 'all';
  if (!state.inspirations.filterType)              state.inspirations.filterType   = 'all';
  if (state.inspirations.search === undefined)     state.inspirations.search       = '';
}

// ═══════════════════════════ CRUD ════════════════════════════════════════════

function createInspiration() {
  ensureInspirationsState();
  const item = {
    id:        'insp_' + uid(),
    title:     '',
    type:      'ideia',
    status:    'avaliar',
    url:       '',
    summary:   '',
    usage:     '',
    notes:     '',
    tags:      [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.inspirations.items.unshift(item);
  state.inspirations.activeId = item.id;
  saveToLocalStorage(false);
  renderInspirationsPage();
  return item;
}

function deleteInspiration(id) {
  ensureInspirationsState();
  state.inspirations.items = state.inspirations.items.filter(i => i.id !== id);
  if (state.inspirations.activeId === id) {
    state.inspirations.activeId = state.inspirations.items[0]?.id || null;
  }
  saveToLocalStorage(false);
  renderInspirationsPage();
}

function updateInspiration(id, patch) {
  ensureInspirationsState();
  const item = state.inspirations.items.find(i => i.id === id);
  if (!item) return;
  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  saveToLocalStorage(false);
}

// ═══════════════════════════ FILTER / STATS ══════════════════════════════════

function getFilteredInspirations() {
  ensureInspirationsState();
  const { filterStatus, filterType, search, items } = state.inspirations;
  return items.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterType   !== 'all' && item.type   !== filterType)   return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [item.title, item.summary, item.notes, item.usage, (item.tags || []).join(' ')].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function getInspirationsStats() {
  ensureInspirationsState();
  const items = state.inspirations.items;
  return {
    total:      items.length,
    usar:       items.filter(i => i.status === 'usar').length,
    avaliar:    items.filter(i => i.status === 'avaliar').length,
    descartado: items.filter(i => i.status === 'descartado').length,
  };
}

// ═══════════════════════════ FORMAT HELPERS ══════════════════════════════════

function _inspTypeLabel(id) {
  return INSPIRATION_TYPES.find(t => t.id === id)?.label || id;
}

function _inspStatusLabel(id) {
  return INSPIRATION_STATUS.find(s => s.id === id)?.label || id;
}

// ═══════════════════════════ PAGE CONTROL ════════════════════════════════════

function showInspirationsPage() {
  document.getElementById('homeScreen').style.display       = 'none';
  document.getElementById('canvasContainer').style.display  = 'none';
  document.getElementById('minimap').style.display          = 'none';
  document.getElementById('workspacePanel').style.display   = 'none';
  document.getElementById('docsPage').style.display         = 'none';
  document.getElementById('inspirationsPage').style.display = 'block';
  const drawer = document.getElementById('drawer');
  if (drawer) drawer.style.display = 'none';
  document.body.classList.add('inspirations-mode');
  document.body.classList.remove('home-mode', 'docs-mode');
}

function hideInspirationsPage() {
  const el = document.getElementById('inspirationsPage');
  if (el) el.style.display = 'none';
  document.body.classList.remove('inspirations-mode');
}

// ═══════════════════════════ RENDER ══════════════════════════════════════════

function renderInspirationsPage() {
  ensureInspirationsState();
  renderInspirationsSidebar();
  renderInspirationsGrid();
  renderInspirationEditor();
  attachInspirationsEvents();
}

function renderInspirationsSidebar() {
  const statsEl   = document.getElementById('inspStats');
  const filtersEl = document.getElementById('inspFilters');
  if (!statsEl || !filtersEl) return;

  const stats = getInspirationsStats();
  const fs    = state.inspirations.filterStatus;
  const ft    = state.inspirations.filterType;

  statsEl.innerHTML = `
    <div class="insp-stat-row"><span class="insp-stat-label">Total</span><span class="insp-stat-val">${stats.total}</span></div>
    <div class="insp-stat-row"><span class="insp-stat-label">Usar</span><span class="insp-stat-val usar">${stats.usar}</span></div>
    <div class="insp-stat-row"><span class="insp-stat-label">Avaliar</span><span class="insp-stat-val avaliar">${stats.avaliar}</span></div>
    <div class="insp-stat-row"><span class="insp-stat-label">Descartado</span><span class="insp-stat-val descartado">${stats.descartado}</span></div>
  `;

  const statusFilters = [{ id: 'all', label: 'Todos' }, ...INSPIRATION_STATUS];

  filtersEl.innerHTML = `
    <div class="insp-filter-group">
      <div class="insp-filter-title">Status</div>
      ${statusFilters.map(s => `
        <button class="insp-filter-btn${fs === s.id ? ' active' : ''}" data-insp-fs="${escAttr(s.id)}">${escHtml(s.label)}</button>
      `).join('')}
    </div>
    <div class="insp-filter-group" style="margin-top:14px">
      <div class="insp-filter-title">Tipo</div>
      <button class="insp-filter-btn${ft === 'all' ? ' active' : ''}" data-insp-ft="all">Todos</button>
      ${INSPIRATION_TYPES.map(t => `
        <button class="insp-filter-btn${ft === t.id ? ' active' : ''}" data-insp-ft="${escAttr(t.id)}">${escHtml(t.label)}</button>
      `).join('')}
    </div>
  `;
}

function renderInspirationsGrid() {
  const grid = document.getElementById('inspGrid');
  if (!grid) return;

  const items    = getFilteredInspirations();
  const activeId = state.inspirations.activeId;

  if (!items.length) {
    const isEmpty = state.inspirations.items.length === 0;
    grid.innerHTML = `
      <div class="insp-empty">
        <div class="insp-empty-icon">✦</div>
        <h3>${isEmpty ? 'Nenhuma inspiração ainda' : 'Nenhum resultado'}</h3>
        <p>${isEmpty
          ? 'Salve referências, ideias e decisões para fortalecer o projeto.'
          : 'Tente ajustar os filtros ou a busca.'}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => `
    <button class="insp-card${item.id === activeId ? ' active' : ''}" data-insp-id="${escAttr(item.id)}">
      <div class="insp-card-top">
        <span class="insp-type-badge">${escHtml(_inspTypeLabel(item.type))}</span>
        <span class="insp-status-badge ${escAttr(item.status)}">${escHtml(_inspStatusLabel(item.status))}</span>
      </div>
      <h3 class="insp-card-title">${escHtml(item.title || 'Sem título')}</h3>
      ${item.summary ? `<p class="insp-card-summary">${escHtml(item.summary)}</p>` : ''}
      ${item.tags && item.tags.length ? `
        <div class="insp-card-tags">
          ${item.tags.slice(0, 4).map(tag => `<span>${escHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </button>
  `).join('');
}

function renderInspirationEditor() {
  const editorEl = document.getElementById('inspEditor');
  if (!editorEl) return;

  ensureInspirationsState();
  const activeId = state.inspirations.activeId;
  const item     = activeId ? state.inspirations.items.find(i => i.id === activeId) : null;

  if (!item) {
    editorEl.innerHTML = `
      <div class="insp-editor-empty">
        <div class="insp-empty-icon" style="font-size:28px;margin-bottom:10px">←</div>
        <p>Selecione uma inspiração para editar ou crie uma nova.</p>
      </div>
    `;
    return;
  }

  editorEl.innerHTML = `
    <div class="insp-editor-body">
      <div class="insp-editor-header">
        <span class="insp-editor-title">Detalhes</span>
        <button class="insp-editor-delete" id="inspDeleteBtn" title="Excluir">✕</button>
      </div>

      <div class="insp-editor-field">
        <label>Título</label>
        <input type="text" id="inspTitle" value="${escAttr(item.title || '')}" placeholder="Nome da referência ou ideia" />
      </div>

      <div class="insp-editor-row">
        <div class="insp-editor-field">
          <label>Tipo</label>
          <select id="inspType">
            ${INSPIRATION_TYPES.map(t => `<option value="${t.id}"${item.type === t.id ? ' selected' : ''}>${escHtml(t.label)}</option>`).join('')}
          </select>
        </div>
        <div class="insp-editor-field">
          <label>Status</label>
          <select id="inspStatus">
            ${INSPIRATION_STATUS.map(s => `<option value="${s.id}"${item.status === s.id ? ' selected' : ''}>${escHtml(s.label)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="insp-editor-field">
        <label>Link ou URL</label>
        <input type="text" id="inspUrl" value="${escAttr(item.url || '')}" placeholder="https://... ou caminho/descrição" />
      </div>

      <div class="insp-editor-field">
        <label>Resumo</label>
        <textarea id="inspSummary" rows="3" placeholder="O que é essa referência?">${escHtml(item.summary || '')}</textarea>
      </div>

      <div class="insp-editor-field">
        <label>Como isso ajuda a CognitaMente?</label>
        <textarea id="inspUsage" rows="3" placeholder="Onde ou como será usado no projeto...">${escHtml(item.usage || '')}</textarea>
      </div>

      <div class="insp-editor-field">
        <label>Observações</label>
        <textarea id="inspNotes" rows="2" placeholder="Limitações, adaptações, decisões...">${escHtml(item.notes || '')}</textarea>
      </div>

      <div class="insp-editor-field">
        <label>Tags (separadas por vírgula)</label>
        <input type="text" id="inspTags" value="${escAttr((item.tags || []).join(', '))}" placeholder="plataforma, dashboard, acessibilidade..." />
      </div>

      <div class="insp-editor-actions">
        <button class="btn-drawer primary" id="inspSaveBtn">Salvar</button>
        <button class="btn-drawer" id="inspCopyBtn">Copiar</button>
      </div>

      <div class="insp-editor-meta">
        Criado em ${new Date(item.createdAt).toLocaleString('pt-BR')}
        ${item.updatedAt && item.updatedAt !== item.createdAt ? ' · Atualizado ' + new Date(item.updatedAt).toLocaleString('pt-BR') : ''}
      </div>
    </div>
  `;
}

// ═══════════════════════════ EVENTS ══════════════════════════════════════════

function attachInspirationsEvents() {
  document.querySelectorAll('[data-insp-fs]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.inspirations.filterStatus = btn.dataset.inspFs;
      renderInspirationsSidebar();
      renderInspirationsGrid();
      attachInspirationsEvents();
    });
  });

  document.querySelectorAll('[data-insp-ft]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.inspirations.filterType = btn.dataset.inspFt;
      renderInspirationsSidebar();
      renderInspirationsGrid();
      attachInspirationsEvents();
    });
  });

  document.querySelectorAll('[data-insp-id]').forEach(card => {
    card.addEventListener('click', () => {
      state.inspirations.activeId = card.dataset.inspId;
      renderInspirationsGrid();
      renderInspirationEditor();
      attachInspirationsEvents();
    });
  });

  document.getElementById('newInspirationBtn')?.addEventListener('click', createInspiration);

  const searchEl = document.getElementById('inspSearch');
  if (searchEl) {
    searchEl.value = state.inspirations.search || '';
    searchEl.addEventListener('input', () => {
      state.inspirations.search = searchEl.value;
      renderInspirationsGrid();
      attachInspirationsEvents();
    });
  }

  document.getElementById('inspSaveBtn')?.addEventListener('click', () => {
    _saveActiveInspiration();
    renderInspirationsGrid();
    renderInspirationsSidebar();
    attachInspirationsEvents();
    toast('Inspiração salva', 'success');
  });

  const liveFields = ['inspTitle', 'inspUrl', 'inspSummary', 'inspUsage', 'inspNotes', 'inspTags'];
  liveFields.forEach(id => {
    document.getElementById(id)?.addEventListener('input', _saveActiveInspiration);
  });

  ['inspType', 'inspStatus'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      _saveActiveInspiration();
      renderInspirationsGrid();
      renderInspirationsSidebar();
      attachInspirationsEvents();
    });
  });

  document.getElementById('inspCopyBtn')?.addEventListener('click', () => {
    const id   = state.inspirations.activeId;
    const item = id ? state.inspirations.items.find(i => i.id === id) : null;
    if (!item) return;
    copyToClipboard(_buildInspirationMarkdown(item), 'Inspiração copiada');
  });

  document.getElementById('inspDeleteBtn')?.addEventListener('click', async () => {
    const id = state.inspirations.activeId;
    if (!id) return;
    const item  = state.inspirations.items.find(i => i.id === id);
    const title = item?.title || 'esta inspiração';
    const ok    = await openModal({
      title:       'Excluir inspiração',
      message:     `Tem certeza que deseja excluir "${escAttr(title)}"?`,
      confirmText: 'Excluir',
      cancelText:  'Cancelar',
    });
    if (ok === null) return;
    deleteInspiration(id);
    toast('Inspiração excluída', 'info');
  });

  document.getElementById('inspExportMdBtn')?.addEventListener('click',  () => exportInspirations('md'));
  document.getElementById('inspExportTxtBtn')?.addEventListener('click', () => exportInspirations('txt'));
}

function _saveActiveInspiration() {
  ensureInspirationsState();
  const id = state.inspirations.activeId;
  if (!id) return;
  updateInspiration(id, {
    title:   document.getElementById('inspTitle')?.value   || '',
    type:    document.getElementById('inspType')?.value    || 'ideia',
    status:  document.getElementById('inspStatus')?.value  || 'avaliar',
    url:     document.getElementById('inspUrl')?.value     || '',
    summary: document.getElementById('inspSummary')?.value || '',
    usage:   document.getElementById('inspUsage')?.value   || '',
    notes:   document.getElementById('inspNotes')?.value   || '',
    tags:    (document.getElementById('inspTags')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
  });
}

// ═══════════════════════════ EXPORT / COPY ═══════════════════════════════════

function _buildInspirationMarkdown(item) {
  let md = `## ${item.title || 'Sem título'}\n\n`;
  md += `**Tipo:** ${_inspTypeLabel(item.type)}  \n`;
  md += `**Status:** ${_inspStatusLabel(item.status)}  \n`;
  if (item.url)     md += `**Link:** ${item.url}  \n`;
  md += '\n';
  if (item.summary) md += `**Resumo:**  \n${item.summary}\n\n`;
  if (item.usage)   md += `**Uso no projeto:**  \n${item.usage}\n\n`;
  if (item.notes)   md += `**Observações:**  \n${item.notes}\n\n`;
  if (item.tags && item.tags.length) md += `**Tags:** ${item.tags.join(', ')}\n\n`;
  return md;
}

function buildInspirationsMarkdown() {
  ensureInspirationsState();
  const date  = new Date().toLocaleString('pt-BR');
  const stats = getInspirationsStats();
  let md = `# Banco de Ideias e Inspirações — CognitaMente\n\nGerado pelo Cognita Lab em ${date}.\n\n`;
  md += `**Total:** ${stats.total} | **Usar:** ${stats.usar} | **Avaliar:** ${stats.avaliar} | **Descartado:** ${stats.descartado}\n\n---\n\n`;
  state.inspirations.items.forEach(item => { md += _buildInspirationMarkdown(item); md += '---\n\n'; });
  return md;
}

function buildInspirationsText() {
  ensureInspirationsState();
  const date  = new Date().toLocaleString('pt-BR');
  const stats = getInspirationsStats();
  const hr    = '='.repeat(40);
  const div   = '-'.repeat(30);
  let txt = `BANCO DE IDEIAS E INSPIRAÇÕES — COGNITAMENTE\n${hr}\nGerado pelo Cognita Lab em ${date}.\n\nTotal: ${stats.total} | Usar: ${stats.usar} | Avaliar: ${stats.avaliar} | Descartado: ${stats.descartado}\n\n`;
  state.inspirations.items.forEach(item => {
    txt += `${(item.title || 'Sem título').toUpperCase()}\n${div}\n`;
    txt += `Tipo: ${_inspTypeLabel(item.type)}\nStatus: ${_inspStatusLabel(item.status)}\n`;
    if (item.url)     txt += `Link: ${item.url}\n`;
    if (item.summary) txt += `\nResumo:\n${item.summary}\n`;
    if (item.usage)   txt += `\nUso no projeto:\n${item.usage}\n`;
    if (item.notes)   txt += `\nObservações:\n${item.notes}\n`;
    if (item.tags && item.tags.length) txt += `\nTags: ${item.tags.join(', ')}\n`;
    txt += '\n';
  });
  return txt;
}

function exportInspirations(format) {
  ensureInspirationsState();
  const name = 'inspiracoes-cognitamente';
  if (format === 'txt') {
    downloadFile(`${name}.txt`, buildInspirationsText(), 'text/plain;charset=utf-8');
    toast('Inspirações exportadas como .txt', 'success');
  } else {
    downloadFile(`${name}.md`, buildInspirationsMarkdown(), 'text/markdown;charset=utf-8');
    toast('Inspirações exportadas como .md', 'success');
  }
}
