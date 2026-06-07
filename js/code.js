/* Split from script.js. Loaded as classic global script. */
const CODE_SAMPLE = `flowchart LR
  Aluno((Aluno))
  Professor((Professor))
  Responsavel((Responsável))
  IA((IA Adaptativa))

  Aluno --> A[Realizar atividade]
  Aluno --> B[Receber feedback]
  Aluno --> C[Acompanhar progresso]
  Aluno --> D[Solicitar ajuda visual]

  Professor --> E[Criar turma]
  Professor --> F[Acompanhar desempenho]
  Professor --> G[Configurar trilha]

  Responsavel --> H[Visualizar evolução]
  Responsavel --> I[Receber orientações]

  IA --> J[Analisar respostas]
  IA --> K[Adaptar dificuldade]
  IA --> L[Sugerir próximos conteúdos]`;

function renderCodePanel() {
  return `
    <p class="code-panel-help">
      Cole código no estilo Mermaid. O Cognita Lab transforma o texto em blocos editáveis no canvas.
    </p>
    <textarea id="codeInput" class="code-input" spellcheck="false">${CODE_SAMPLE}</textarea>
    <div id="codeParseInfo" class="code-parse-info"></div>
    <div class="code-actions">
      <button class="btn-drawer primary" id="generateFromCodeBtn" style="flex:2">Gerar diagrama</button>
      <button class="btn-drawer" id="clearCodeBtn">Limpar</button>
    </div>
    <div class="code-help-box">
      <strong>Sintaxe suportada</strong>
      <code>flowchart LR  (ou TD)</code>
      <code>A[Bloco comum]</code>
      <code>Aluno((Ator circular))</code>
      <code>D{{Decisão?}}</code>
      <code>DB[(Banco de dados)]</code>
      <code>A --> B</code>
      <code>A -->|Sim| B</code>
      <code>A -- texto --> B</code>
      <code>A --> B --> C  (encadeado)</code>
    </div>
  `;
}

function attachCodePanelEvents() {
  const input = document.getElementById('codeInput');
  const info = document.getElementById('codeParseInfo');

  input?.addEventListener('input', () => {
    if (!input.value.trim()) { info.className = 'code-parse-info'; return; }
    try {
      const p = parseMermaidLike(input.value);
      info.className = 'code-parse-info success';
      info.textContent = `✓  ${p.blocks.length} bloco(s) · ${p.connections.length} conexão(ões) detectadas`;
    } catch {
      info.className = 'code-parse-info error';
      info.textContent = '✗  Não foi possível interpretar o código';
    }
  });

  document.getElementById('generateFromCodeBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('codeInput')?.value || '';
    if (!code.trim()) { toast('Cole algum código antes de gerar', 'error'); return; }

    if (state.blocks.length > 0) {
      const ok = await openModal({
        title: 'Gerar novo diagrama',
        message: 'Isso substituirá o diagrama atual. O atual será salvo no histórico.',
        confirmText: 'Gerar',
        cancelText: 'Cancelar',
      });
      if (ok === null) return;
      saveHistoryEntry();
    }
    importFromCode(code);
  });

  document.getElementById('clearCodeBtn')?.addEventListener('click', () => {
    const el = document.getElementById('codeInput');
    if (el) { el.value = ''; el.focus(); }
    const info = document.getElementById('codeParseInfo');
    if (info) info.className = 'code-parse-info';
  });
}

function inferDiagramType(blocks, connections) {
  const total = blocks.length;
  const actors = blocks.filter(b => b.type === 'user' || b.type === 'ai').length;
  const decisions = blocks.filter(b => b.type === 'decision').length;
  const dbs = blocks.filter(b => b.type === 'database' || b.type === 'component').length;
  if (actors >= 2 && actors / total > 0.25) return 'Casos de uso';
  if (decisions >= 2) return 'Fluxo de processo';
  if (dbs >= 2) return 'Arquitetura técnica';
  if (connections.length > total * 1.2) return 'Fluxo complexo';
  return 'Diagrama geral';
}

function importFromCode(code, layoutOverride = null) {
  try {
    const parsed = parseMermaidLike(code);
    if (!parsed.blocks.length) { toast('Nenhum bloco encontrado no código', 'error'); return; }

    history.snapshot();
    const dir = layoutOverride || parsed.direction;
    state.blocks = autoLayoutBlocks(parsed.blocks, parsed.connections, dir);
    state.connections = parsed.connections;
    state.lanes = [];
    state.activeTemplate = 'code-import';
    state.zoom = 1; state.panX = 0; state.panY = 0;
    state.selectedBlockId = null;
    state.selectedBlockIds = [];
    state.selectedConnectionId = null;
    state.connectingFrom = null;
    state.codeImportMeta = {
      direction: dir,
      blockCount: parsed.blocks.length,
      connectionCount: parsed.connections.length,
      probableType: inferDiagramType(parsed.blocks, parsed.connections),
      rawCode: code,
    };

    document.getElementById('diagramName').value = 'Diagrama gerado por código';
    showCanvas();
    renderAll();
    centerDiagramAfterImport();
    renderDrawerDefault();
    updateStatusBar();
    saveToLocalStorage();
    history.snapshot();
    document.getElementById('workspacePanel').style.display = 'none';
    toast(`${parsed.blocks.length} bloco(s) · ${parsed.connections.length} conexão(ões) gerado(s)`, 'success');
  } catch (err) {
    console.error(err);
    toast('Erro ao interpretar o código', 'error');
  }
}

// ── Parser ────────────────────────────────────────────────────

function parseMermaidLike(code) {
  const nodes = new Map();
  const connections = [];
  let direction = 'LR';

  const lines = code
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('%%') && !/^(classDef|class |style |linkStyle|subgraph)\b/.test(l) && l !== 'end');

  for (const line of lines) {
    if (/^(flowchart|graph)\s+/i.test(line)) {
      const m = line.match(/^(?:flowchart|graph)\s+(LR|RL|TD|TB|BT)\b/i);
      if (m) direction = m[1].toUpperCase();
      continue;
    }

    if (line.includes('-->') || line.includes('---')) {
      const edges = parseEdgeLine(line);
      if (!edges) continue;
      for (const edge of edges) {
        if (!nodes.has(edge.from.key)) nodes.set(edge.from.key, createParsedBlock(edge.from));
        if (!nodes.has(edge.to.key)) nodes.set(edge.to.key, createParsedBlock(edge.to));
        connections.push({
          id: uid(),
          from: nodes.get(edge.from.key).id,
          to: nodes.get(edge.to.key).id,
          label: edge.label || '',
        });
      }
      continue;
    }

    const node = parseNodeToken(line);
    if (node && !nodes.has(node.key)) nodes.set(node.key, createParsedBlock(node));
  }

  return { direction, blocks: Array.from(nodes.values()), connections };
}

function parseEdgeLine(line) {
  // Handle chained: A --> B --> C by splitting on -->
  // First extract any inline labels like A -->|label| B
  const parts = line.split('-->');
  if (parts.length < 2) return null;

  const edges = [];

  for (let i = 0; i < parts.length - 1; i++) {
    let fromStr = parts[i].trim();
    let toStr = parts[i + 1].trim();
    let label = '';

    // Label on left side: "A -- texto" or "A --texto"
    const leftLabel = fromStr.match(/^(.+?)\s+--\s*(.+)$/) || fromStr.match(/^(.+?)--(.+)$/);
    if (leftLabel && !/^\s*$/.test(leftLabel[2])) {
      fromStr = leftLabel[1].trim();
      label = leftLabel[2].trim();
    }

    // Label on right side: "|texto| B"
    const rightLabel = toStr.match(/^\|([^|]*)\|\s*(.+)/);
    if (rightLabel) {
      label = rightLabel[1].trim();
      toStr = rightLabel[2].trim();
    }

    // If chained, toStr may contain the full next node definition — just take up to next -->
    // (handled by the loop splitting on --> already)

    const fromNode = parseNodeToken(fromStr);
    const toNode = parseNodeToken(toStr);
    if (fromNode && toNode && fromNode.key !== toNode.key) {
      edges.push({ from: fromNode, to: toNode, label });
    }
  }

  return edges.length ? edges : null;
}

function parseNodeToken(token) {
  token = String(token).trim();

  // Order matters — more specific patterns first
  const patterns = [
    { re: /^([A-Za-z0-9_À-ÿ]+)\(\((.+?)\)\)$/,  type: 'user' },      // ((Actor))
    { re: /^([A-Za-z0-9_À-ÿ]+)\[\((.+?)\)\]$/,  type: 'database' },  // [(DB)]
    { re: /^([A-Za-z0-9_À-ÿ]+)\[\[(.+?)\]\]$/,  type: 'component' }, // [[Component]]
    { re: /^([A-Za-z0-9_À-ÿ]+)\{\{(.+?)\}\}$/,  type: 'decision' },  // {{Decision}}
    { re: /^([A-Za-z0-9_À-ÿ]+)\{(.+?)\}$/,      type: 'decision' },  // {Decision}
    { re: /^([A-Za-z0-9_À-ÿ]+)\((.+?)\)$/,      type: 'start' },     // (Node)
    { re: /^([A-Za-z0-9_À-ÿ]+)\[(.+?)\]$/,      type: 'action' },    // [Node]
    { re: /^([A-Za-z0-9_À-ÿ]+)>(.+?)\]$/,       type: 'action' },    // >asymmetric]
  ];

  for (const p of patterns) {
    const m = token.match(p.re);
    if (m) {
      const title = m[2].replace(/^["']|["']$/g, '').trim();
      return { key: m[1], title, type: inferBlockType(m[1], title, p.type) };
    }
  }

  // Plain identifier (no shape) — used in edge references
  if (/^[A-Za-z0-9_À-ÿ]+$/.test(token)) {
    return { key: token, title: token, type: inferBlockType(token, token, 'action') };
  }

  return null;
}

function inferBlockType(key, title, fallback) {
  const text = `${key} ${title}`.toLowerCase();
  if (/\?/.test(title))                                                  return 'decision';
  if (/\b(ia|adaptativ|recomend|motor|intelig|ml|learning)\b/.test(text)) return 'ai';
  if (/\b(banco|database|db|dado|armazen|reposit|storage)\b/.test(text)) return 'database';
  if (/\b(aluno|estudante|criança|professor|docente|responsável|responsavel|familiar|user|usuário|ator|actor)\b/.test(text)) return 'user';
  if (/\b(feedback|retorno|reforço|avaliação)\b/.test(text))             return 'feedback';
  if (/\b(componente|módulo|module|api|serviço|service|frontend|backend|camada)\b/.test(text)) return 'component';
  if (/\b(início|start|begin|entrada|login|acesso)\b/.test(text))        return 'start';
  return fallback;
}

function createParsedBlock(node) {
  const typeDef = BLOCK_TYPES.find(t => t.type === node.type) || BLOCK_TYPES[1];
  return {
    id: uid(),
    type: node.type,
    title: node.title,
    description: inferDescription(node),
    x: 0, y: 0,
    color: typeDef.color,
    tags: inferTags(node),
    lane: null,
    branches: node.type === 'decision' ? 'Sim → avança\nNão → recebe apoio' : '',
    mermaidKey: node.key,
  };
}

function inferDescription(node) {
  const t = `${node.key} ${node.title}`.toLowerCase();

  if (node.type === 'user') {
    if (/aluno|estudante|criança/.test(t)) return 'Estudante que utiliza a plataforma de aprendizagem.';
    if (/professor|docente/.test(t))        return 'Educador responsável por acompanhar turmas e progresso.';
    if (/responsável|responsavel|familiar/.test(t)) return 'Familiar que acompanha a evolução do aluno.';
    return 'Ator que interage com a plataforma.';
  }
  if (node.type === 'ai') {
    if (/adaptar|dificuldade/.test(t)) return 'Ajusta automaticamente o nível com base no desempenho.';
    if (/analisar|resposta/.test(t))   return 'Analisa padrões de erro e progresso do aluno.';
    if (/sugerir|recomen/.test(t))     return 'Recomenda o próximo conteúdo ideal para o aluno.';
    return 'Processo inteligente de análise ou adaptação.';
  }
  if (/atividade|exercício/.test(t)) return 'Etapa em que o aluno interage com uma tarefa da plataforma.';
  if (/feedback|retorno/.test(t))    return 'Retorno claro e imediato após uma ação do usuário.';
  if (/turma|grupo/.test(t))         return 'Organização de alunos para acompanhamento pedagógico.';
  if (/desempenho|progresso/.test(t))return 'Visualização de dados de evolução e dificuldades.';
  if (/trilha|percurso/.test(t))     return 'Configuração ou ajuste do caminho de aprendizagem.';
  if (/relatório|report/.test(t))    return 'Resumo acessível de progresso para professores.';
  if (/login|acesso|entrada/.test(t))return 'Ponto de entrada no sistema.';
  if (/apoio|ajuda|dica/.test(t))    return 'Suporte visual ou instrucional ao aluno.';

  const map = {
    action: 'Ação ou etapa do fluxo.',
    decision: 'Ponto de decisão que divide o caminho.',
    database: 'Estrutura de armazenamento de dados.',
    component: 'Componente técnico da aplicação.',
    feedback: 'Retorno ao usuário após uma ação.',
    start: 'Ponto de entrada do fluxo.',
    access: 'Recurso de acessibilidade.',
    note: 'Anotação do diagrama.',
  };
  return map[node.type] || 'Bloco gerado por código.';
}

function inferTags(node) {
  const text = `${node.key} ${node.title}`.toLowerCase();
  const tags = [];
  if (/adaptativ|ia|ml/.test(text)) tags.push('Adaptativo');
  if (/visual|pictogr/.test(text)) tags.push('Visual');
  if (/feedback|retorno/.test(text)) tags.push('Feedback');
  if (/aluno|criança/.test(text)) tags.push('Aluno');
  if (/professor|docente/.test(text)) tags.push('Professor');
  if (/responsável|responsavel|familiar/.test(text)) tags.push('Família');
  if (/tea|autis|acessib/.test(text)) tags.push('TEA');
  return tags;
}

// ── Auto layout ───────────────────────────────────────────────


