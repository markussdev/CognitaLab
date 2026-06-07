/* Split from script.js. Loaded as classic global script. */
/* ══════════════════════════════════════════════════════════════════
   COGNITA LAB — script.js
   Studio técnico da CognitaMente
   ══════════════════════════════════════════════════════════════════ */

// ═══════════════════════════ ESTADO GLOBAL ════════════════════════════════════
const state = {
  blocks: [],
  connections: [],
  lanes: [],
  selectedBlockId: null,
  selectedConnectionId: null,
  selectedBlockIds: [],
  clipboard: null,
  codeImportMeta: null,
  connectingFrom: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  activeTemplate: null,
  notes: {},
  snapToGrid: true,
  showMinimap: true,
  presentMode: false,
  presentStep: 0,
  isDragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  docs: null,
  inspirations: null,
};

// ═══════════════════════════ HISTÓRICO UNDO/REDO ══════════════════════════════
const history = {
  stack: [],
  pointer: -1,
  MAX: 30,

  snapshot() {
    const snap = JSON.stringify({
      blocks: state.blocks,
      connections: state.connections,
      lanes: state.lanes,
      activeTemplate: state.activeTemplate,
      codeImportMeta: state.codeImportMeta,
      diagramName: document.getElementById('diagramName')?.value || 'Sem título',
    });
    if (this.stack[this.pointer] === snap) return;
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(snap);
    if (this.stack.length > this.MAX) this.stack.shift();
    this.pointer = this.stack.length - 1;
    updateUndoRedoButtons();
  },

  undo() {
    if (this.pointer <= 0) return;
    this.pointer--;
    this._restore();
  },

  redo() {
    if (this.pointer >= this.stack.length - 1) return;
    this.pointer++;
    this._restore();
  },

  _restore() {
    const snap = JSON.parse(this.stack[this.pointer]);
    state.blocks = snap.blocks || [];
    state.connections = snap.connections || [];
    state.lanes = snap.lanes || [];
    state.activeTemplate = snap.activeTemplate || null;
    state.codeImportMeta = snap.codeImportMeta || null;
    if (snap.diagramName) document.getElementById('diagramName').value = snap.diagramName;
    state.selectedBlockId = null;
    state.selectedConnectionId = null;
    state.selectedBlockIds = [];
    renderAll();
    updateStatusBar();
    updateUndoRedoButtons();
    saveToLocalStorage(false);
  },
};

// ═══════════════════════════ TEMPLATES ═══════════════════════════════════════
const T_ICONS = {
  users:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-1a4 4 0 0 0-3-3.87"/></svg>`,
  branch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="4" r="2"/><circle cx="18" cy="9" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12"/><path d="M8 4c2 0 8 1 8 5"/></svg>`,
  grid:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
  cpu:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M7 9H3M7 12H3M7 15H3M21 9h-4M21 12h-4M21 15h-4M9 7V3M12 7V3M15 7V3M9 21v-4M12 21v-4M15 21v-4"/></svg>`,
  person: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/></svg>`,
  pencil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
};

const TEMPLATES = [
  {
    id: 'use-cases',
    icon: T_ICONS.users,
    iconColor: 'rgba(142,162,255,0.12)',
    iconBorder: 'rgba(142,162,255,0.20)',
    iconFg: 'var(--accent)',
    title: 'Casos de uso',
    desc: 'Mostra quem usa a plataforma e o que cada ator pode fazer.',
    color: 'var(--accent)',
    generate: () => generateUseCasesTemplate(),
  },
  {
    id: 'learning-flow',
    icon: T_ICONS.branch,
    iconColor: 'rgba(108,168,255,0.12)',
    iconBorder: 'rgba(108,168,255,0.20)',
    iconFg: 'var(--accent-blue)',
    title: 'Fluxo de aprendizagem adaptativa',
    desc: 'Mostra como o aluno estuda, recebe apoio e tem a trilha adaptada.',
    color: 'var(--accent-blue)',
    generate: () => generateLearningFlowTemplate(),
  },
  {
    id: 'class-diagram',
    icon: T_ICONS.grid,
    iconColor: 'rgba(182,156,255,0.12)',
    iconBorder: 'rgba(182,156,255,0.20)',
    iconFg: 'var(--accent-purple)',
    title: 'Diagrama de classes',
    desc: 'Mostra os principais dados e entidades do sistema.',
    color: 'var(--accent-purple)',
    generate: () => generateClassDiagramTemplate(),
  },
  {
    id: 'components',
    icon: T_ICONS.cpu,
    iconColor: 'rgba(216,168,95,0.12)',
    iconBorder: 'rgba(216,168,95,0.20)',
    iconFg: 'var(--warning)',
    title: 'Componentes técnicos',
    desc: 'Mostra as partes internas da aplicação.',
    color: 'var(--warning)',
    generate: () => generateComponentsTemplate(),
  },
  {
    id: 'student-journey',
    icon: T_ICONS.person,
    iconColor: 'rgba(125,216,181,0.12)',
    iconBorder: 'rgba(125,216,181,0.20)',
    iconFg: 'var(--success)',
    title: 'Jornada acessível do aluno',
    desc: 'Mostra a experiência completa de uma criança com TEA usando a plataforma.',
    color: 'var(--accent)',
    generate: () => generateStudentJourneyTemplate(),
  },
  {
    id: 'free',
    icon: T_ICONS.pencil,
    iconColor: 'rgba(141,150,168,0.12)',
    iconBorder: 'rgba(141,150,168,0.18)',
    iconFg: 'var(--muted)',
    title: 'Diagrama livre',
    desc: 'Começa com canvas vazio. Crie sua estrutura do zero.',
    color: 'var(--muted)',
    generate: () => ({ blocks: [], connections: [], lanes: [] }),
  },
];

// Block type definitions
const BLOCK_TYPES = [
  { type: 'start',       label: 'Início',          color: '#47d6bd', desc: 'Ponto de entrada do fluxo' },
  { type: 'action',      label: 'Ação',             color: '#6ca8ff', desc: 'Ação ou processo executado' },
  { type: 'decision',    label: 'Decisão',          color: '#ffb454', desc: 'Ponto de ramificação condicional' },
  { type: 'user',        label: 'Usuário',          color: '#9b7cff', desc: 'Ator humano do sistema' },
  { type: 'system',      label: 'Sistema',          color: '#6ca8ff', desc: 'Componente ou serviço do sistema' },
  { type: 'ai',          label: 'IA Adaptativa',   color: '#47d6bd', desc: 'Motor de inteligência adaptativa' },
  { type: 'database',    label: 'Banco de dados',  color: '#ffb454', desc: 'Armazenamento de dados' },
  { type: 'feedback',    label: 'Feedback',         color: '#9b7cff', desc: 'Retorno ao usuário' },
  { type: 'class',       label: 'Classe',           color: '#6ca8ff', desc: 'Entidade do diagrama de classes' },
  { type: 'component',   label: 'Componente',       color: '#47d6bd', desc: 'Módulo técnico da aplicação' },
  { type: 'note',        label: 'Nota',             color: '#91aaa5', desc: 'Anotação ou observação' },
  { type: 'access',      label: 'Acessibilidade',  color: '#ff6b5c', desc: 'Recurso de acessibilidade TEA' },
];


