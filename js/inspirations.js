/* Loaded as classic global script. Must be loaded before ui.js. */

const INSPIRATION_TYPES = [
  { id: 'site',           label: 'Site'           },
  { id: 'imagem',         label: 'Imagem'         },
  { id: 'artigo',         label: 'Artigo'         },
  { id: 'ideia',          label: 'Ideia'          },
  { id: 'video',          label: 'Vídeo'          },
  { id: 'documento',      label: 'Documento'      },
  { id: 'frase',          label: 'Frase'          },
  { id: 'feedback',       label: 'Feedback'       },
  { id: 'pergunta',       label: 'Pergunta'       },
  { id: 'acessibilidade', label: 'Acessibilidade' },
];

const INSPIRATION_STATUSES = [
  { id: 'usar',       label: 'Usar'       },
  { id: 'avaliar',    label: 'Avaliar'    },
  { id: 'descartado', label: 'Descartado' },
];

let _inspAutoSaveTimer = null;

// ═══════════════════════════ ESTADO ══════════════════════════════════════════
function ensureInspirationsState() {
  if (!state.inspirations) {
    const now = new Date().toISOString();
    state.inspirations = {
      activeId: null,
      filterStatus: 'all',
      filterType: 'all',
      search: '',
      items: [
        {
          id: 'insp_default_1', title: 'Plurall', type: 'site', status: 'avaliar',
          url: 'https://www.plurall.net',
          summary: 'Plataforma educacional para alunos e professores.',
          usage: 'Inspiração para organização de painel de aluno/professor.',
          notes: 'Não copiar layout. Usar apenas como referência de estrutura.',
          tags: ['plataforma', 'dashboard', 'educação'], createdAt: now, updatedAt: now,
        },
        {
          id: 'insp_default_2', title: 'Khan Academy', type: 'site', status: 'usar',
          url: 'https://pt.khanacademy.org',
          summary: 'Plataforma de ensino adaptativo com exercícios progressivos.',
          usage: 'Referência de progressão de atividades e feedback positivo para o aluno.',
          notes: 'Interface limpa e objetiva. Verificar abordagem de gamificação.',
          tags: ['adaptativo', 'ensino', 'exercícios', 'gamificação'], createdAt: now, updatedAt: now,
        },
        {
          id: 'insp_default_3', title: 'Duolingo', type: 'site', status: 'avaliar',
          url: 'https://www.duolingo.com',
          summary: 'App de aprendizado com forte gamificação e microaulas.',
          usage: 'Referência de engajamento, sistema de pontos e sequência diária.',
          notes: 'Verificar acessibilidade para TEA — não é o foco, mas vale comparar.',
          tags: ['gamificação', 'microaula', 'engajamento', 'acessibilidade'], createdAt: now, updatedAt: now,
        },
        {
          id: 'insp_default_4', title: 'Google Classroom', type: 'site', status: 'avaliar',
          url: 'https://classroom.google.com',
          summary: 'Gestão de turmas, tarefas e feedback entre professor e aluno.',
          usage: 'Referência de organização de turmas e envio de atividades.',
          notes: 'Interface funcional mas genérica. Avaliar o que adaptar para TEA.',
          tags: ['gestão', 'turma', 'professor', 'tarefas'], createdAt: now, updatedAt: now,
        },
      ],
    };
  }
  if (!Array.isArray(state.inspirations.items))       state.inspirations.items        = [];
  if (!('filterStatus' in state.inspirations))        state.inspirations.filterStatus = 'all';
  if (!('filterType'   in state.inspirations))        state.inspirations.filterType   = 'all';
  if (!('search'       in state.inspirations))        state.inspirations.search       = '';
  if (!('activeId'     in state.inspirations))        state.inspirations.activeId     = null;
}

function createInspiration() {
  const id  = 'insp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const now = new Date().toISOString();
  const item = { id, title: '', type: 'ideia', status: 'avaliar', url: '', summary: '', usage: '', notes: '', tags: [], createdAt: now, updatedAt: now };
  state.inspirations.items.unshift(item);
  state.inspirations.activeId = id;
  return item;
}

function deleteInspiration(id) {
  state.inspirations.items = state.inspirations.items.filter(i => i.id !== id);
  if (state.inspirations.activeId === id) state.inspirations.activeId = null;
}

function updateInspiration(id, patch) {
  const item = state.inspirations.items.find(i => i.id === id);
  if (!item) return;
  Object.assign(item, patch);
  item.updatedAt = new Date().toISOString();
}

function getFilteredInspirations() {
  ensureInspirationsState();
  let items = state.inspirations.items;
  const { filterStatus, filterType, search } = state.inspirations;
  if (filterStatus !== 'all') items = items.filter(i => i.status === filterStatus);
  if (filterType   !== 'all') items = items.filter(i => i.type   === filterType);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(i =>
      (i.title   || '').toLowerCase().includes(q) ||
      (i.summary || '').toLowerCase().includes(q) ||
      (i.tags    || []).some(t => t.toLowerCase().includes(q))
    );
  }
  return items;
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

// ═══════════════════════════ HELPERS ══════════════════════════════════════════
function formatInspirationType(type) {
  return (INSPIRATION_TYPES.find(t => t.id === type) || { label: type }).label;
}
function formatInspirationStatus(status) {
  return (INSPIRATION_STATUSES.find(s => s.id === status) || { label: status }).label;
}
function _inspFormatDate(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}

// ═══════════════════════════ VISIBILIDADE ═════════════════════════════════════
function showInspirationsPage() {
  document.getElementById('homeScreen').style.display      = 'none';
  document.getElementById('canvasContainer').style.display = 'none';
  document.getElementById('minimap').style.display         = 'none';
  document.getElementById('connectHint').style.display     = 'none';
  document.getElementById('workspacePanel').style.display  = 'none';
  document.getElementById('docsPage').style.display        = 'none';
  document.getElementById('inspirationsPage').style.display = 'flex';
  const drawer = document.getElementById('drawer');
  if (drawer) drawer.style.display = 'none';
  document.body.classList.add('inspirations-mode');
  document.body.classList.remove('home-mode', 'docs-mode');
}

function hideInspirationsPage() {
  const page = document.getElementById('inspirationsPage');
  if (page) page.style.display = 'none';
  const drawer = document.getElementById('drawer');
  if (drawer) drawer.style.display = '';
  document.body.classList.remove('inspirations-mode');
}

// ═══════════════════════════ RENDER PRINCIPAL ═════════════════════════════════
function renderInspirationsPage() {
  ensureInspirationsState();
  renderInspirationsSidebar();
  renderInspirationsGrid();
  renderInspirationEditor();
  attachInspirationsEvents();
}

function renderInspirationsSidebar() {
  const stats    = getInspirationsStats();
  const { filterStatus, filterType } = state.inspirations;

  document.getElementById('inspStats').innerHTML = `
    <div class="insp-stat-row"><span class="insp-stat-label">Total</span><span class="insp-stat-val">${stats.total}</span></div>
    <div class="insp-stat-row"><span class="insp-stat-label insp-usar">Usar</span><span class="insp-stat-val">${stats.usar}</span></div>
    <div class="insp-stat-row"><span class="insp-stat-label insp-avaliar">Avaliar</span><span class="insp-stat-val">${stats.avaliar}</span></div>
    <div class="insp-stat-row"><span class="insp-stat-label insp-descartado">Descartado</span><span class="insp-stat-val">${stats.descartado}</span></div>
  `;

  const statusOpts = [
    { id: 'all', label: 'Todos' }, { id: 'usar', label: 'Usar' },
    { id: 'avaliar', label: 'Avaliar' }, { id: 'descartado', label: 'Descartado' },
  ];

  document.getElementById('inspFilters').innerHTML = `
    <div class="insp-filter-group">
      <div class="insp-filter-label">Status</div>
      ${statusOpts.map(s => `<button class="insp-filter-btn${filterStatus === s.id ? ' active' : ''}" data-insp-status="${s.id}">${s.label}</button>`).join('')}
    </div>
    <div class="insp-filter-group">
      <div class="insp-filter-label">Tipo</div>
      <button class="insp-filter-btn${filterType === 'all' ? ' active' : ''}" data-insp-type="all">Todos</button>
      ${INSPIRATION_TYPES.map(t => `<button class="insp-filter-btn${filterType === t.id ? ' active' : ''}" data-insp-type="${t.id}">${t.label}</button>`).join('')}
    </div>
  `;
}

function renderInspirationsGrid() {
  const grid     = document.getElementById('inspGrid');
  const items    = getFilteredInspirations();
  const activeId = state.inspirations.activeId;

  if (!items.length) {
    grid.innerHTML = `
      <div class="insp-empty">
        <div class="insp-empty-icon">✦</div>
        <h3>Nenhuma inspiração encontrada</h3>
        <p>Adicione referências, ideias ou perguntas para começar.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => `
    <button class="insp-card${activeId === item.id ? ' active' : ''}" data-insp-id="${escAttr(item.id)}">
      <div class="insp-card-top">
        <span class="insp-type-badge">${escHtml(formatInspirationType(item.type))}</span>
        <span class="insp-status-badge ${escAttr(item.status)}">${escHtml(formatInspirationStatus(item.status))}</span>
      </div>
      <h3 class="insp-card-title">${escHtml(item.title || 'Sem título')}</h3>
      ${item.summary ? `<p class="insp-card-summary">${escHtml(item.summary)}</p>` : ''}
      ${(item.tags || []).length ? `<div class="insp-tags">${item.tags.slice(0, 4).map(t => `<span class="insp-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      ${item.url ? `<div class="insp-card-link">↗ ${escHtml(item.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</div>` : ''}
    </button>
  `).join('');
}

function renderInspirationEditor() {
  const container = document.getElementById('inspEditor');
  const activeId  = state.inspirations.activeId;
  const item      = activeId ? state.inspirations.items.find(i => i.id === activeId) : null;

  if (!item) {
    container.innerHTML = `
      <div class="insp-editor-empty">
        <div class="insp-editor-empty-icon">✦</div>
        <p>Selecione uma inspiração para editar<br>ou crie uma nova.</p>
        <button class="btn-drawer primary" id="newInspBtnEditor">+ Nova inspiração</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="insp-editor-inner">
      <div class="insp-editor-header">
        <span class="insp-editor-date">Atualizado ${escHtml(_inspFormatDate(item.updatedAt))}</span>
        <button class="btn-drawer danger" id="deleteInspBtn">Excluir</button>
      </div>

      <div class="insp-field">
        <label>Título</label>
        <input type="text" id="inspTitle" class="insp-input" value="${escAttr(item.title || '')}" placeholder="Ex: Plurall" />
      </div>

      <div class="insp-field-row">
        <div class="insp-field">
          <label>Tipo</label>
          <select id="inspType" class="insp-select">
            ${INSPIRATION_TYPES.map(t => `<option value="${t.id}"${item.type === t.id ? ' selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="insp-field">
          <label>Status</label>
          <select id="inspStatus" class="insp-select">
            ${INSPIRATION_STATUSES.map(s => `<option value="${s.id}"${item.status === s.id ? ' selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="insp-field">
        <label>Link / URL</label>
        <div class="insp-url-row">
          <input type="text" id="inspUrl" class="insp-input" value="${escAttr(item.url || '')}" placeholder="https://..." />
          ${item.url ? `<a class="insp-open-link" href="${escAttr(item.url)}" target="_blank" rel="noopener noreferrer">↗</a>` : ''}
        </div>
      </div>

      <div class="insp-field">
        <label>Resumo</label>
        <textarea id="inspSummary" class="insp-textarea insp-textarea-sm" placeholder="Descreva brevemente esta referência...">${escHtml(item.summary || '')}</textarea>
      </div>

      <div class="insp-field">
        <label>Como será usado no projeto?</label>
        <textarea id="inspUsage" class="insp-textarea insp-textarea-sm" placeholder="Como isso vai influenciar o CognitaMente...">${escHtml(item.usage || '')}</textarea>
      </div>

      <div class="insp-field">
        <label>Observações</label>
        <textarea id="inspNotes" class="insp-textarea insp-textarea-sm" placeholder="O que não copiar? Qual parte adaptar?">${escHtml(item.notes || '')}</textarea>
      </div>

      <div class="insp-field">
        <label>Tags (separadas por vírgula)</label>
        <input type="text" id="inspTags" class="insp-input" value="${escAttr((item.tags || []).join(', '))}" placeholder="Ex: design, acessibilidade, TEA" />
      </div>

      <div class="insp-editor-actions">
        <button class="btn-drawer primary" id="saveInspBtn">Salvar</button>
        <button class="btn-drawer" id="copyInspBtn">Copiar</button>
        <button class="btn-drawer" id="dupInspBtn">Duplicar</button>
      </div>
    </div>
  `;
}

// ═══════════════════════════ SALVAR ══════════════════════════════════════════
function _readEditorFields() {
  const tagsRaw = document.getElementById('inspTags')?.value || '';
  return {
    title:   document.getElementById('inspTitle')?.value   || '',
    type:    document.getElementById('inspType')?.value    || 'ideia',
    status:  document.getElementById('inspStatus')?.value  || 'avaliar',
    url:     document.getElementById('inspUrl')?.value     || '',
    summary: document.getElementById('inspSummary')?.value || '',
    usage:   document.getElementById('inspUsage')?.value   || '',
    notes:   document.getElementById('inspNotes')?.value   || '',
    tags:    tagsRaw.split(',').map(s => s.trim()).filter(Boolean),
  };
}

function _saveCurrentInspiration(silent = false) {
  const id = state.inspirations.activeId;
  if (!id) return;
  updateInspiration(id, _readEditorFields());
  saveToLocalStorage(false);
  renderInspirationsSidebar();
  _attachInspFilterEvents();
  renderInspirationsGrid();
  _attachInspGridEvents();
  if (!silent) toast('Inspiração salva', 'success');
}

// ═══════════════════════════ EVENTOS ══════════════════════════════════════════
function attachInspirationsEvents() {
  _attachInspHeaderEvents();
  _attachInspFilterEvents();
  _attachInspGridEvents();
  _attachInspEditorEvents();
}

function _attachInspHeaderEvents() {
  document.getElementById('newInspirationBtn')?.addEventListener('click', () => {
    if (state.inspirations.activeId) updateInspiration(state.inspirations.activeId, _readEditorFields());
    createInspiration();
    saveToLocalStorage(false);
    _inspRefreshAll();
    document.getElementById('inspTitle')?.focus();
  });

  const searchEl = document.getElementById('inspSearch');
  if (searchEl) {
    searchEl.value = state.inspirations.search || '';
    searchEl.addEventListener('input', () => {
      state.inspirations.search = searchEl.value;
      renderInspirationsGrid();
      _attachInspGridEvents();
    });
  }

  document.getElementById('exportInspMdBtn')?.addEventListener('click', () => exportInspirations('md'));
  document.getElementById('exportInspTxtBtn')?.addEventListener('click', () => exportInspirations('txt'));
}

function _attachInspFilterEvents() {
  document.querySelectorAll('[data-insp-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.inspirations.filterStatus = btn.dataset.inspStatus;
      renderInspirationsSidebar();
      _attachInspFilterEvents();
      renderInspirationsGrid();
      _attachInspGridEvents();
    });
  });
  document.querySelectorAll('[data-insp-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.inspirations.filterType = btn.dataset.inspType;
      renderInspirationsSidebar();
      _attachInspFilterEvents();
      renderInspirationsGrid();
      _attachInspGridEvents();
    });
  });
}

function _attachInspGridEvents() {
  document.querySelectorAll('[data-insp-id]').forEach(card => {
    card.addEventListener('click', () => {
      const newId = card.dataset.inspId;
      if (state.inspirations.activeId === newId) return;
      if (state.inspirations.activeId) updateInspiration(state.inspirations.activeId, _readEditorFields());
      state.inspirations.activeId = newId;
      renderInspirationsGrid();
      _attachInspGridEvents();
      renderInspirationEditor();
      _attachInspEditorEvents();
    });
  });
}

function _attachInspEditorEvents() {
  document.getElementById('newInspBtnEditor')?.addEventListener('click', () => {
    createInspiration();
    saveToLocalStorage(false);
    _inspRefreshAll();
    document.getElementById('inspTitle')?.focus();
  });

  const textFields = ['inspTitle', 'inspSummary', 'inspUsage', 'inspNotes', 'inspUrl', 'inspTags'];
  textFields.forEach(fid => {
    document.getElementById(fid)?.addEventListener('input', () => {
      clearTimeout(_inspAutoSaveTimer);
      _inspAutoSaveTimer = setTimeout(() => {
        const id = state.inspirations.activeId;
        if (!id) return;
        updateInspiration(id, _readEditorFields());
        saveToLocalStorage(false);
        renderInspirationsSidebar();
        _attachInspFilterEvents();
        renderInspirationsGrid();
        _attachInspGridEvents();
      }, 700);
    });
  });

  ['inspType', 'inspStatus'].forEach(fid => {
    document.getElementById(fid)?.addEventListener('change', () => {
      const id = state.inspirations.activeId;
      if (!id) return;
      updateInspiration(id, _readEditorFields());
      saveToLocalStorage(false);
      renderInspirationsSidebar();
      _attachInspFilterEvents();
      renderInspirationsGrid();
      _attachInspGridEvents();
    });
  });

  document.getElementById('saveInspBtn')?.addEventListener('click', () => _saveCurrentInspiration());

  document.getElementById('copyInspBtn')?.addEventListener('click', () => {
    const id = state.inspirations.activeId;
    if (!id) return;
    const item = state.inspirations.items.find(i => i.id === id);
    if (!item) return;
    copyToClipboard(_buildInspirationText(item), 'Copiado');
  });

  document.getElementById('dupInspBtn')?.addEventListener('click', () => {
    const id = state.inspirations.activeId;
    if (!id) return;
    if (state.inspirations.activeId) updateInspiration(id, _readEditorFields());
    const source = state.inspirations.items.find(i => i.id === id);
    if (!source) return;
    const now     = new Date().toISOString();
    const newItem = {
      ...JSON.parse(JSON.stringify(source)),
      id: 'insp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: (source.title || '') + ' (cópia)',
      createdAt: now,
      updatedAt: now,
    };
    state.inspirations.items.unshift(newItem);
    state.inspirations.activeId = newItem.id;
    saveToLocalStorage(false);
    _inspRefreshAll();
    toast('Duplicado', 'success');
  });

  document.getElementById('deleteInspBtn')?.addEventListener('click', async () => {
    const id   = state.inspirations.activeId;
    if (!id) return;
    const item = state.inspirations.items.find(i => i.id === id);
    const ok   = await openModal({
      title: 'Excluir inspiração',
      message: `Deseja excluir "${escHtml(item?.title || 'esta inspiração')}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText:  'Cancelar',
    });
    if (ok === null) return;
    deleteInspiration(id);
    saveToLocalStorage(false);
    _inspRefreshAll();
    toast('Excluído', 'info');
  });
}

function _inspRefreshAll() {
  renderInspirationsSidebar();
  _attachInspFilterEvents();
  renderInspirationsGrid();
  _attachInspGridEvents();
  renderInspirationEditor();
  _attachInspEditorEvents();
}

// ═══════════════════════════ TEXTO DE UM ITEM ════════════════════════════════
function _buildInspirationText(item) {
  let txt = `${item.title || 'Sem título'}\n`;
  txt += `Tipo: ${formatInspirationType(item.type)} | Status: ${formatInspirationStatus(item.status)}\n`;
  if (item.url)                 txt += `Link: ${item.url}\n`;
  if (item.summary)             txt += `\nResumo:\n${item.summary}\n`;
  if (item.usage)               txt += `\nComo será usado:\n${item.usage}\n`;
  if (item.notes)               txt += `\nObservações:\n${item.notes}\n`;
  if ((item.tags || []).length) txt += `\nTags: ${item.tags.join(', ')}\n`;
  return txt.trim();
}

// ═══════════════════════════ EXPORT ══════════════════════════════════════════
function buildInspirationsMarkdown() {
  ensureInspirationsState();
  const now     = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const stats   = getInspirationsStats();
  let md = `# Banco de Ideias e Inspirações — CognitaMente\n\nGerado pelo Cognita Lab em ${dateStr}.\n\n`;
  md += `## Resumo\n\n- Total: ${stats.total}\n- Usar: ${stats.usar}\n- Avaliar: ${stats.avaliar}\n- Descartado: ${stats.descartado}\n\n`;
  state.inspirations.items.forEach(item => {
    md += `## ${item.title || 'Sem título'}\n\n`;
    md += `**Tipo:** ${formatInspirationType(item.type)}  \n**Status:** ${formatInspirationStatus(item.status)}  \n`;
    if (item.url) md += `**Link:** ${item.url}  \n`;
    md += '\n';
    if (item.summary)             md += `**Resumo:**\n${item.summary}\n\n`;
    if (item.usage)               md += `**Como será usado:**\n${item.usage}\n\n`;
    if (item.notes)               md += `**Observações:**\n${item.notes}\n\n`;
    if ((item.tags || []).length) md += `**Tags:** ${item.tags.join(', ')}\n\n`;
    md += '---\n\n';
  });
  return md.trim();
}

function buildInspirationsText() {
  ensureInspirationsState();
  const now     = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sep     = '------------------------------------------------------------';
  const stats   = getInspirationsStats();
  let txt = `BANCO DE IDEIAS E INSPIRAÇÕES — COGNITAMENTE\n\nGerado pelo Cognita Lab em ${dateStr}.\n\n`;
  txt += `RESUMO\nTotal: ${stats.total} | Usar: ${stats.usar} | Avaliar: ${stats.avaliar} | Descartado: ${stats.descartado}\n\n${sep}\n\n`;
  state.inspirations.items.forEach(item => {
    txt += `${(item.title || 'SEM TÍTULO').toUpperCase()}\n`;
    txt += `Tipo: ${formatInspirationType(item.type)} | Status: ${formatInspirationStatus(item.status)}\n`;
    if (item.url)                 txt += `Link: ${item.url}\n`;
    if (item.summary)             txt += `\nResumo:\n${item.summary}\n`;
    if (item.usage)               txt += `\nComo será usado:\n${item.usage}\n`;
    if (item.notes)               txt += `\nObservações:\n${item.notes}\n`;
    if ((item.tags || []).length) txt += `\nTags: ${item.tags.join(', ')}\n`;
    txt += `\n${sep}\n\n`;
  });
  return txt.trim();
}

function exportInspirations(format) {
  if (format === 'md') {
    downloadFile('inspiracoes-cognitamente.md', buildInspirationsMarkdown(), 'text/markdown');
  } else {
    downloadFile('inspiracoes-cognitamente.txt', buildInspirationsText(), 'text/plain');
  }
  toast(`Exportado como .${format}`, 'success');
}
