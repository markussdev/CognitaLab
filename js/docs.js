/* Loaded as classic global script. Must be loaded before ui.js. */

// ═══════════════════════════ SEÇÕES FIXAS ═════════════════════════════════════
const DOC_SECTIONS = [
  { id: 'resumo',                title: 'Resumo do projeto',        hint: 'Explique em poucas linhas o que é a CognitaMente e qual problema ela busca resolver.' },
  { id: 'problema',              title: 'Problema identificado',     hint: 'Descreva o problema que motivou a criação da CognitaMente.' },
  { id: 'publico',               title: 'Público-alvo',              hint: 'Quem se beneficia da plataforma? Detalhe o perfil do usuário principal.' },
  { id: 'justificativa',         title: 'Justificativa',             hint: 'Por que é importante resolver esse problema? Cite dados ou contexto.' },
  { id: 'objetivo-geral',        title: 'Objetivo geral',            hint: 'Qual é o grande objetivo do projeto? Use um parágrafo claro e direto.' },
  { id: 'objetivos-especificos', title: 'Objetivos específicos',     hint: 'Liste os objetivos menores que compõem o objetivo geral.' },
  { id: 'solucao',               title: 'Solução proposta',          hint: 'Descreva como a CognitaMente resolve o problema identificado.' },
  { id: 'tecnologias',           title: 'Tecnologias usadas',        hint: 'Liste as tecnologias, frameworks e ferramentas utilizadas no projeto.' },
  { id: 'acessibilidade',        title: 'Acessibilidade',            hint: 'Quais recursos de acessibilidade foram implementados? Como o projeto atende ao público com TEA?' },
  { id: 'impacto',               title: 'Impacto social',            hint: 'Qual é o impacto esperado da solução para a sociedade?' },
  { id: 'referencias',           title: 'Referências',               hint: 'Liste as fontes utilizadas para embasar o projeto.' },
  { id: 'conclusao',             title: 'Conclusão',                 hint: 'Sintetize o projeto, os aprendizados e as perspectivas futuras.' },
];

let _docsAutoSaveTimer = null;

// ═══════════════════════════ ESTADO ══════════════════════════════════════════
function ensureDocsState() {
  if (!state.docs) {
    state.docs = { activeSection: 'resumo', sections: {}, updatedAt: null };
  }
  if (!state.docs.sections) state.docs.sections = {};
  if (!state.docs.activeSection) state.docs.activeSection = 'resumo';

  DOC_SECTIONS.forEach(sec => {
    const existing = state.docs.sections[sec.id];
    if (!existing) {
      state.docs.sections[sec.id] = { content: '', status: 'rascunho', updatedAt: null };
    } else if (typeof existing === 'string') {
      state.docs.sections[sec.id] = { content: existing, status: 'rascunho', updatedAt: null };
    } else {
      if (!existing.status) existing.status = 'rascunho';
      if (!('content' in existing)) existing.content = '';
    }
  });
}

function getDocSectionData(sectionId) {
  ensureDocsState();
  return state.docs.sections[sectionId] || { content: '', status: 'rascunho', updatedAt: null };
}

function setDocSectionContent(sectionId, content) {
  ensureDocsState();
  if (!state.docs.sections[sectionId]) {
    state.docs.sections[sectionId] = { content: '', status: 'rascunho', updatedAt: null };
  }
  const now = new Date().toISOString();
  state.docs.sections[sectionId].content = content;
  state.docs.sections[sectionId].updatedAt = now;
  state.docs.updatedAt = now;
}

function setDocSectionStatus(sectionId, status) {
  const valid = ['rascunho', 'revisar', 'finalizado'];
  if (!valid.includes(status)) return;
  ensureDocsState();
  if (!state.docs.sections[sectionId]) {
    state.docs.sections[sectionId] = { content: '', status: 'rascunho', updatedAt: null };
  }
  const now = new Date().toISOString();
  state.docs.sections[sectionId].status = status;
  state.docs.sections[sectionId].updatedAt = now;
  state.docs.updatedAt = now;
}

function getDocsProgress() {
  ensureDocsState();
  const total = DOC_SECTIONS.length;
  let filled = 0, review = 0, done = 0;
  DOC_SECTIONS.forEach(sec => {
    const data = state.docs.sections[sec.id] || {};
    if ((data.content || '').trim().length > 0) filled++;
    if (data.status === 'revisar') review++;
    if (data.status === 'finalizado') done++;
  });
  return {
    total, filled, review, done,
    percentFilled: total > 0 ? Math.round(filled / total * 100) : 0,
    percentDone:   total > 0 ? Math.round(done  / total * 100) : 0,
  };
}

// ═══════════════════════════ HELPERS VISUAIS ══════════════════════════════════
function formatDocStatus(status) {
  return { rascunho: 'Rascunho', revisar: 'Revisar', finalizado: 'Finalizado' }[status] || status;
}

function getDocsStatusClass(status, hasContent) {
  if (status === 'finalizado') return 'done';
  if (status === 'revisar')    return 'review';
  if (hasContent)              return 'draft';
  return 'empty';
}

function _docsFormatDate(isoStr) {
  if (!isoStr) return 'Ainda não editado';
  try {
    return 'Atualizado ' + new Date(isoStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (e) { return ''; }
}

// ═══════════════════════════ VISIBILIDADE ═════════════════════════════════════
function showDocsPage() {
  document.getElementById('homeScreen').style.display    = 'none';
  document.getElementById('canvasContainer').style.display = 'none';
  document.getElementById('minimap').style.display       = 'none';
  document.getElementById('connectHint').style.display   = 'none';
  document.getElementById('workspacePanel').style.display = 'none';
  document.getElementById('docsPage').style.display      = 'flex';
  const inspPage = document.getElementById('inspirationsPage');
  if (inspPage) inspPage.style.display = 'none';
  const drawer = document.getElementById('drawer');
  if (drawer) drawer.style.display = 'none';
  document.body.classList.add('docs-mode');
  document.body.classList.remove('home-mode');
}

function hideDocsPage() {
  document.getElementById('docsPage').style.display = 'none';
  const drawer = document.getElementById('drawer');
  if (drawer) drawer.style.display = '';
  document.body.classList.remove('docs-mode');
}

// ═══════════════════════════ RENDER PÁGINA ═══════════════════════════════════
function renderDocsPage() {
  ensureDocsState();
  renderDocsSidebar();
  renderDocsMain();
  attachDocsPageEvents();
}

function renderDocsSidebar() {
  const progress = getDocsProgress();
  const activeId = state.docs.activeSection || 'resumo';

  document.getElementById('docsProgressCard').innerHTML = `
    <div class="docs-progress-top">
      <span>Preenchidas: ${progress.filled}/${progress.total}</span>
      <span>Finalizadas: ${progress.done}/${progress.total}</span>
    </div>
    <div class="docs-progress-bar">
      <div class="docs-progress-fill" style="width:${progress.percentFilled}%"></div>
    </div>
    <div class="docs-progress-meta">${progress.percentDone}% finalizado</div>
  `;

  document.getElementById('docsSectionList').innerHTML = DOC_SECTIONS.map(sec => {
    const data      = getDocSectionData(sec.id);
    const hasContent = (data.content || '').trim().length > 0;
    const status    = data.status || 'rascunho';
    return `
      <button class="docs-section-item${activeId === sec.id ? ' active' : ''}" data-doc-section="${escAttr(sec.id)}">
        <div class="docs-section-item-left">
          <span class="docs-status-dot ${getDocsStatusClass(status, hasContent)}"></span>
          <span class="docs-section-name">${escHtml(sec.title)}</span>
        </div>
        <span class="docs-section-badge">${escHtml(formatDocStatus(status))}</span>
      </button>
    `;
  }).join('');
}

function renderDocsMain() {
  const activeId = state.docs.activeSection || 'resumo';
  const active   = DOC_SECTIONS.find(s => s.id === activeId) || DOC_SECTIONS[0];
  const data     = getDocSectionData(active.id);

  document.getElementById('docsMainHeader').innerHTML = `
    <div class="docs-main-title-wrap">
      <h1>${escHtml(active.title)}</h1>
      <p>${escHtml(active.hint)}</p>
    </div>
    <div class="docs-main-meta">${escHtml(_docsFormatDate(data.updatedAt))}</div>
  `;

  document.getElementById('docsMainEditor').innerHTML = `
    <div class="docs-form-row">
      <label for="docsStatusSelect">Status da seção</label>
      <select id="docsStatusSelect" class="docs-status-select">
        <option value="rascunho"${data.status === 'rascunho'  ? ' selected' : ''}>Rascunho</option>
        <option value="revisar"${data.status === 'revisar'    ? ' selected' : ''}>Revisar</option>
        <option value="finalizado"${data.status === 'finalizado' ? ' selected' : ''}>Finalizado</option>
      </select>
    </div>
    <textarea id="docsTextarea" class="docs-textarea" placeholder="Escreva aqui o conteúdo desta seção...">${escHtml(data.content || '')}</textarea>
    <div class="docs-actions">
      <button class="btn-drawer primary" id="saveDocsBtn">Salvar seção</button>
      <button class="btn-drawer" id="copyDocSectionBtn">Copiar seção</button>
      <button class="btn-drawer danger" id="clearDocSectionBtn">Limpar seção</button>
    </div>
    <div class="docs-actions">
      <button class="btn-drawer" id="copyAllDocsBtn">Copiar tudo</button>
      <button class="btn-drawer" id="exportDocsMdBtn">Exportar .md</button>
      <button class="btn-drawer" id="exportDocsTxtBtn">Exportar .txt</button>
    </div>
  `;
}

// ═══════════════════════════ SALVAR SEÇÃO ATUAL ═══════════════════════════════
function saveCurrentDocSectionFromPage() {
  const textarea    = document.getElementById('docsTextarea');
  const statusSelect = document.getElementById('docsStatusSelect');
  if (!textarea || !statusSelect) return;
  setDocSectionContent(state.docs.activeSection, textarea.value);
  setDocSectionStatus(state.docs.activeSection, statusSelect.value);
}

function copyCurrentDocSection() {
  const secId   = state.docs.activeSection;
  const sec     = DOC_SECTIONS.find(s => s.id === secId);
  const textarea = document.getElementById('docsTextarea');
  const content = textarea ? textarea.value : (getDocSectionData(secId).content || '');
  copyToClipboard((sec ? sec.title : secId) + '\n\n' + content, 'Seção copiada');
}

function clearCurrentDocSection() {
  setDocSectionContent(state.docs.activeSection, '');
  setDocSectionStatus(state.docs.activeSection, 'rascunho');
}

// ═══════════════════════════ EVENTOS ══════════════════════════════════════════
function attachDocsPageEvents() {
  _attachDocsSectionEvents();
  _attachDocsMainEvents();
}

function _attachDocsSectionEvents() {
  document.querySelectorAll('[data-doc-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const newId = btn.dataset.docSection;
      if (newId === state.docs.activeSection) return;
      saveCurrentDocSectionFromPage();
      state.docs.activeSection = newId;
      saveToLocalStorage(false);
      renderDocsSidebar();
      _attachDocsSectionEvents();
      renderDocsMain();
      _attachDocsMainEvents();
    });
  });
}

function _attachDocsMainEvents() {
  const textarea    = document.getElementById('docsTextarea');
  const statusSelect = document.getElementById('docsStatusSelect');

  if (textarea) {
    textarea.addEventListener('input', () => {
      clearTimeout(_docsAutoSaveTimer);
      _docsAutoSaveTimer = setTimeout(() => {
        setDocSectionContent(state.docs.activeSection, textarea.value);
        saveToLocalStorage(false);
        // Atualiza sidebar sem re-renderizar o editor (preserva cursor)
        renderDocsSidebar();
        _attachDocsSectionEvents();
        _docsUpdateMainMeta();
      }, 800);
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      setDocSectionStatus(state.docs.activeSection, statusSelect.value);
      saveToLocalStorage(false);
      renderDocsSidebar();
      _attachDocsSectionEvents();
    });
  }

  document.getElementById('saveDocsBtn')?.addEventListener('click', () => {
    saveCurrentDocSectionFromPage();
    saveToLocalStorage();
    renderDocsSidebar();
    _attachDocsSectionEvents();
    _docsUpdateMainMeta();
    toast('Seção salva', 'success');
  });

  document.getElementById('copyDocSectionBtn')?.addEventListener('click', () => {
    copyCurrentDocSection();
  });

  document.getElementById('copyAllDocsBtn')?.addEventListener('click', () => {
    saveCurrentDocSectionFromPage();
    copyToClipboard(buildProjectDocsMarkdown(), 'Documentação copiada');
  });

  document.getElementById('exportDocsMdBtn')?.addEventListener('click', () => {
    saveCurrentDocSectionFromPage();
    exportProjectDocs('md');
  });

  document.getElementById('exportDocsTxtBtn')?.addEventListener('click', () => {
    saveCurrentDocSectionFromPage();
    exportProjectDocs('txt');
  });

  document.getElementById('clearDocSectionBtn')?.addEventListener('click', async () => {
    const ok = await openModal({
      title: 'Limpar seção',
      message: 'Isso apagará o conteúdo desta seção. Deseja continuar?',
      confirmText: 'Limpar',
      cancelText: 'Cancelar',
    });
    if (ok === null) return;
    clearCurrentDocSection();
    saveToLocalStorage(false);
    renderDocsSidebar();
    _attachDocsSectionEvents();
    renderDocsMain();
    _attachDocsMainEvents();
    toast('Seção limpa', 'info');
  });
}

function _docsUpdateMainMeta() {
  const meta = document.querySelector('#docsMainHeader .docs-main-meta');
  if (meta) {
    const sec = state.docs.sections[state.docs.activeSection];
    meta.textContent = _docsFormatDate(sec ? sec.updatedAt : null);
  }
}

// ═══════════════════════════ BUILD MARKDOWN ═══════════════════════════════════
function buildProjectDocsMarkdown() {
  ensureDocsState();
  const now      = new Date();
  const dateStr  = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const progress = getDocsProgress();

  let md = `# Documentação do Projeto CognitaMente\n\nGerado pelo Cognita Lab em ${dateStr}.\n\n`;
  md += `## Progresso\n\n- Seções preenchidas: ${progress.filled}/${progress.total}\n- Seções finalizadas: ${progress.done}/${progress.total}\n\n`;

  DOC_SECTIONS.forEach(sec => {
    const data = getDocSectionData(sec.id);
    md += `## ${sec.title}\n\nStatus: ${formatDocStatus(data.status)}\n\n`;
    md += (data.content || '').trim() ? data.content.trim() + '\n\n' : '_Seção ainda não preenchida._\n\n';
  });

  return md.trim();
}

// ═══════════════════════════ BUILD TXT ═══════════════════════════════════════
function buildProjectDocsText() {
  ensureDocsState();
  const now     = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const progress = getDocsProgress();
  const sep     = '------------------------------------------------------------';

  let txt = `DOCUMENTAÇÃO DO PROJETO COGNITAMENTE\n\nGerado pelo Cognita Lab em ${dateStr}.\n\n`;
  txt += `PROGRESSO\nSeções preenchidas: ${progress.filled}/${progress.total}\nSeções finalizadas: ${progress.done}/${progress.total}\n\n${sep}\n\n`;

  DOC_SECTIONS.forEach(sec => {
    const data = getDocSectionData(sec.id);
    txt += `${sec.title.toUpperCase()}\nStatus: ${formatDocStatus(data.status)}\n\n`;
    txt += (data.content || '').trim() ? data.content.trim() + '\n\n' : '(Seção ainda não preenchida)\n\n';
    txt += `${sep}\n\n`;
  });

  return txt.trim();
}

// ═══════════════════════════ EXPORTAR ════════════════════════════════════════
function exportProjectDocs(format) {
  if (format === 'md') {
    downloadFile('documentacao-cognitamente.md', buildProjectDocsMarkdown(), 'text/markdown');
  } else {
    downloadFile('documentacao-cognitamente.txt', buildProjectDocsText(), 'text/plain');
  }
  toast(`Exportado como .${format}`, 'success');
}

// ═══════════════════════════ CLIPBOARD ═══════════════════════════════════════
function copyToClipboard(text, successMessage) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      toast(successMessage || 'Copiado', 'success');
    }).catch(() => _copyFallback(text, successMessage));
  } else {
    _copyFallback(text, successMessage);
  }
}

function _copyFallback(text, successMessage) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast(successMessage || 'Copiado', 'success');
  } catch (e) {
    toast('Erro ao copiar', 'error');
  }
}
