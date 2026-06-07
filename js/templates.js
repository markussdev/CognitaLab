/* Split from script.js. Loaded as classic global script. */
function generateUseCasesTemplate() {
  const blocks = [
    // Actors
    { id: uid(), type: 'user',  title: 'Aluno',             description: 'Criança com TEA, 8–11 anos', x: 60,  y: 180, color: '#9b7cff', tags: ['TEA', 'Público-alvo'] },
    { id: uid(), type: 'user',  title: 'Professor',         description: 'Docente responsável pela turma', x: 60,  y: 380, color: '#6ca8ff', tags: ['Educador'] },
    { id: uid(), type: 'user',  title: 'Responsável',       description: 'Familiar ou cuidador do aluno', x: 60,  y: 560, color: '#47d6bd', tags: ['Família'] },
    { id: uid(), type: 'ai',    title: 'IA Adaptativa',     description: 'Motor de recomendação e adaptação', x: 60,  y: 720, color: '#47d6bd', tags: ['ML', 'Algoritmo'] },

    // Use cases - Aluno
    { id: uid(), type: 'action', title: 'Realizar atividade',       description: 'Interação com exercícios acessíveis', x: 360, y: 100, color: '#9b7cff', tags: [] },
    { id: uid(), type: 'feedback', title: 'Receber feedback',       description: 'Retorno imediato e positivo após resposta', x: 360, y: 200, color: '#9b7cff', tags: ['Acessibilidade'] },
    { id: uid(), type: 'action', title: 'Acompanhar progresso',     description: 'Visualização simples da evolução', x: 360, y: 300, color: '#9b7cff', tags: [] },
    { id: uid(), type: 'access', title: 'Solicitar ajuda visual',   description: 'Pede dica com apoio pictográfico', x: 360, y: 400, color: '#ff6b5c', tags: ['Visual', 'Apoio'] },

    // Use cases - Professor
    { id: uid(), type: 'action', title: 'Criar turma',              description: 'Organiza grupos de alunos', x: 620, y: 340, color: '#6ca8ff', tags: [] },
    { id: uid(), type: 'action', title: 'Acompanhar desempenho',    description: 'Visualiza relatórios por aluno', x: 620, y: 430, color: '#6ca8ff', tags: [] },
    { id: uid(), type: 'action', title: 'Configurar trilha',        description: 'Personaliza o plano de estudo', x: 620, y: 520, color: '#6ca8ff', tags: [] },
    { id: uid(), type: 'action', title: 'Visualizar relatório',     description: 'Exporta dados de progresso', x: 620, y: 610, color: '#6ca8ff', tags: [] },

    // Use cases - Responsável
    { id: uid(), type: 'action', title: 'Acompanhar evolução',      description: 'Vê progresso do filho de forma simples', x: 360, y: 580, color: '#47d6bd', tags: [] },
    { id: uid(), type: 'action', title: 'Receber orientação',       description: 'Dicas para reforçar em casa', x: 360, y: 670, color: '#47d6bd', tags: [] },

    // Use cases - IA
    { id: uid(), type: 'ai',     title: 'Analisar respostas',       description: 'Processa padrões de erro e acerto', x: 360, y: 760, color: '#47d6bd', tags: ['Dados'] },
    { id: uid(), type: 'ai',     title: 'Adaptar dificuldade',      description: 'Ajusta nível baseado no desempenho', x: 620, y: 760, color: '#47d6bd', tags: ['Adaptativo'] },
    { id: uid(), type: 'ai',     title: 'Sugerir próximo conteúdo', description: 'Recomenda a próxima atividade ideal', x: 620, y: 850, color: '#47d6bd', tags: ['ML'] },
    { id: uid(), type: 'access', title: 'Identificar apoio',        description: 'Detecta necessidade de suporte adicional', x: 360, y: 860, color: '#ff6b5c', tags: ['TEA'] },
  ];

  const connections = [];
  // Aluno connections
  [4,5,6,7].forEach(i => connections.push({ id: uid(), from: blocks[0].id, to: blocks[i].id, label: '' }));
  // Professor connections
  [8,9,10,11].forEach(i => connections.push({ id: uid(), from: blocks[1].id, to: blocks[i].id, label: '' }));
  // Responsável connections
  [12,13].forEach(i => connections.push({ id: uid(), from: blocks[2].id, to: blocks[i].id, label: '' }));
  // IA connections
  [14,15,16,17].forEach(i => connections.push({ id: uid(), from: blocks[3].id, to: blocks[i].id, label: '' }));

  return { blocks: layoutUseCaseByActors(blocks, connections), connections };
}

function generateLearningFlowTemplate() {
  const laneW = 820, laneH = 160;
  const lanes = [
    { label: 'Aluno',                x: 20, y: 20,  w: laneW, h: laneH, color: '#9b7cff' },
    { label: 'Sistema',              x: 20, y: 200, w: laneW, h: laneH, color: '#6ca8ff' },
    { label: 'IA Adaptativa',        x: 20, y: 380, w: laneW, h: laneH, color: '#47d6bd' },
    { label: 'Professor / Responsável', x: 20, y: 560, w: laneW, h: laneH, color: '#ffb454' },
  ];

  const B = (type, title, description, x, y, color, tags = [], branches = '') => ({
    id: uid(), type, title, description, x, y, color, tags, branches, lane: null
  });

  const b = [
    B('start',    'Aluno inicia sessão',           'Entrada calma e previsível, baixo estímulo',         60,  50,  '#9b7cff', ['Rotina', 'Visual']),
    B('system',   'Carrega perfil de apoio',       'Busca preferências e histórico do aluno',            240, 230, '#6ca8ff'),
    B('system',   'Exibe atividade acessível',     'Conteúdo adaptado com apoio visual e instrução clara', 440, 230, '#6ca8ff', ['Visual', 'Baixo estímulo']),
    B('action',   'Aluno responde no ritmo próprio','Sem pressão de tempo',                              60,  50+160+10,'#9b7cff', ['Tempo flexível']),
    B('system',   'Avalia resposta',               'Compara com gabarito e critérios pedagógicos',       620, 230, '#6ca8ff'),
    B('decision', 'Compreendeu?',                  'Análise de acerto e padrão de resposta',             440, 410, '#ffb454', [], 'Sim → reforço positivo\nNão → dica em etapas'),
    B('feedback', 'Reforço positivo',              'Mensagem encorajadora e discreta',                  240,  80, '#47d6bd', ['Feedback claro']),
    B('access',   'Dica em etapas',               'Apoio visual gradual para compreensão',              620, 410, '#ff6b5c', ['Apoio gradual', 'Visual']),
    B('system',   'Registra progresso',            'Salva dados de desempenho no perfil',               60,  230, '#6ca8ff'),
    B('ai',       'Analisa necessidade de adaptação','Processa padrões e identifica ajustes necessários', 240, 410, '#47d6bd', ['ML']),
    B('decision', 'Adaptar trilha?',               'Decide se a dificuldade deve ser ajustada',         440, 590, '#ffb454', [], 'Sim → muda nível\nNão → próxima atividade'),
    B('ai',       'Muda dificuldade ou apoio',     'Ajuste automático baseado em dados',                60,  410, '#47d6bd', ['Adaptativo']),
    B('action',   'Próxima atividade',             'Continua o fluxo com novo conteúdo',               620, 590, '#6ca8ff'),
    B('system',   'Gera relatório simples',        'Resumo acessível para professor e responsável',     240, 590, '#6ca8ff'),
  ];

  const pairs = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6,'Sim'],[5,7,'Não'],
    [7,8],[8,9],[9,10],[6,9],[10,11,'Sim'],[10,12,'Não'],
    [11,12],[12,13],
  ];
  const connections = pairs.map(([fi,ti,label='']) => ({ id: uid(), from: b[fi].id, to: b[ti].id, label }));

  return { blocks: b, connections, lanes };
}

function generateClassDiagramTemplate() {
  const B = (title, description, x, y, tags = []) => ({
    id: uid(), type: 'class', title, description, x, y, color: '#6ca8ff', tags, lane: null
  });

  const b = [
    B('Usuario',             'id, nome, email, senha, tipo', 340, 40),
    B('Aluno',               '(herda Usuario)\nidAluno, dataNasc, nivelAtual, perfilTEA', 140, 200),
    B('Professor',           '(herda Usuario)\nidProfessor, disciplinas', 340, 200),
    B('Responsavel',         '(herda Usuario)\nidResp, parentesco, alunoId', 540, 200),
    B('TrilhaEstudo',        'id, titulo, nivel, area, etapas', 140, 380),
    B('Atividade',           'id, enunciado, tipo, nivel, apoios', 340, 380),
    B('Resposta',            'id, alunoId, atividadeId, conteudo, correto', 140, 560),
    B('Progresso',           'id, alunoId, data, acertos, erros, tempo', 540, 380),
    B('PerfilAprendizagem',  'id, alunoId, estilo, apoiosAtivos, nivel', 340, 560),
    B('RecomendacaoIA',      'id, alunoId, tipo, conteudo, timestamp, aplicada', 540, 560),
  ];

  const rel = (fi, ti, label) => ({ id: uid(), from: b[fi].id, to: b[ti].id, label });
  const connections = [
    rel(0,1,'herda'), rel(0,2,'herda'), rel(0,3,'herda'),
    rel(2,4,'cria'), rel(4,5,'contém'),
    rel(1,6,'envia'), rel(6,7,'atualiza'),
    rel(1,8,'possui'), rel(5,9,'gera'),
    rel(8,9,'alimenta'), rel(7,9,'informa'),
  ];

  return { blocks: b, connections };
}

function generateComponentsTemplate() {
  const B = (type, title, description, x, y, color, tags = []) => ({
    id: uid(), type, title, description, x, y, color, tags, lane: null
  });

  const b = [
    B('component', 'Frontend Web',          'React (PWA), acessível, responsivo, baixo estímulo',    100, 100, '#47d6bd', ['PWA', 'Acessível']),
    B('component', 'Autenticação',          'JWT, OAuth2, controle por papel (aluno/prof/resp)',     340, 40, '#6ca8ff', ['Segurança']),
    B('component', 'Módulo de Atividades',  'Conteúdo adaptado, apoio visual, múltiplos formatos',  340, 200, '#6ca8ff', ['Pedagógico']),
    B('component', 'Motor de Adaptação',    'Ajusta dificuldade e apoios em tempo real',            580, 100, '#9b7cff', ['Adaptativo']),
    B('ai',        'IA / Recomendação',     'ML para personalizar trilha e detectar padrões',       580, 260, '#47d6bd', ['ML', 'Dados']),
    B('component', 'Análise de Progresso',  'Coleta métricas, calcula indicadores pedagógicos',     340, 360, '#ffb454', ['Analytics']),
    B('component', 'Painel do Professor',   'Dashboard com relatórios simples e configurações',     100, 380, '#6ca8ff', ['UX']),
    B('database',  'Banco de Dados',        'PostgreSQL: usuários, atividades, respostas, logs',    580, 400, '#ffb454', ['PostgreSQL']),
    B('component', 'Exportação de Relatórios','PDF e CSV simples para professores e responsáveis',  100, 540, '#6ca8ff', ['Acessível']),
  ];

  const links = [
    [0,1,'autentica'],[0,2,'carrega'],[0,3,'recebe adaptações'],
    [1,7,'persiste'],[2,3,'envia resposta'],[3,4,'solicita recomendação'],
    [4,5,'envia dados'],[5,6,'alimenta dashboard'],[5,7,'persiste'],
    [6,8,'gera relatório'],[7,4,'treina modelo'],
  ];
  const connections = links.map(([fi,ti,label]) => ({ id: uid(), from: b[fi].id, to: b[ti].id, label }));

  return { blocks: b, connections };
}

function generateStudentJourneyTemplate() {
  const B = (type, title, description, x, y, color, tags = [], branches = '') => ({
    id: uid(), type, title, description, x, y, color, tags, branches, lane: null
  });

  const b = [
    B('start',    'Entrada calma',              'Interface limpa, sem excessos visuais ou sonoros',        60, 60,  '#47d6bd', ['Baixo estímulo', 'Rotina']),
    B('action',   'Escolha visual da atividade','Ícones claros, sem texto excessivo',                     60, 180, '#9b7cff', ['Visual', 'Autonomia']),
    B('action',   'Explicação curta',           'Instrução em 1–2 frases com apoio pictográfico',         60, 300, '#6ca8ff', ['Visual', 'Instrução clara']),
    B('action',   'Exemplo guiado',             'Resolução passo a passo antes da atividade real',        60, 420, '#6ca8ff', ['Modelagem', 'Apoio gradual']),
    B('action',   'Atividade principal',        'Exercício acessível no ritmo do aluno',                 60, 540, '#9b7cff', ['Tempo flexível']),
    B('action',   'Pausa opcional',             'Botão visível de pausa sem penalidade',                 280, 540, '#47d6bd', ['Bem-estar', 'Tempo flexível']),
    B('decision', 'Respondeu corretamente?',    'Avaliação imediata e sensível ao contexto',             280, 420, '#ffb454', [], 'Sim → feedback positivo\nNão → dica visual'),
    B('access',   'Dica visual',                'Apoio pictográfico ou desmembramento da tarefa',         500, 420, '#ff6b5c', ['Visual', 'Apoio gradual']),
    B('feedback', 'Feedback positivo',          'Mensagem curta e encorajadora, sem exagero',            500, 300, '#47d6bd', ['Feedback claro', 'Motivação']),
    B('feedback', 'Recompensa discreta',        'Símbolo sutil de progresso, sem sobrecarga sensorial',  500, 180, '#9b7cff', ['Baixo estímulo', 'Motivação']),
    B('action',   'Próximo passo previsível',   'Transição anunciada e rotineira',                       500, 60,  '#47d6bd', ['Rotina', 'Previsibilidade']),
  ];

  const pairs = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[4,6],[5,6],
    [6,7,'Não'],[6,8,'Sim'],[7,8,'após dica'],[8,9],[9,10],
  ];
  const connections = pairs.map(([fi,ti,label='']) => ({ id: uid(), from: b[fi].id, to: b[ti].id, label }));

  return { blocks: b, connections };
}

// ═══════════════════════════ GERAR DIAGRAMA POR CÓDIGO ═══════════════════════

