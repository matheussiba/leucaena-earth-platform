/* ==========================================================================
   Internal scratch UI (cp). Vanilla HTML/CSS/JS. No public links.
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------- Ícones (SVG) ----------------------------- */
  const P = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const SVG = {
    cap: `<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/>`,
    sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>`,
    moon: `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`,
    download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>`,
    upload: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>`,
    sparkles: `<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/>`,
    target: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>`,
    compass: `<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>`,
    trending: `<path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>`,
    calendar: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>`,
    flame: `<path d="M12 2c1 3 4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 2-4 0 2 2 2 2 0 0-2-2-3-2-5Z"/>`,
    snow: `<path d="M12 2v20M12 12 7 5M12 12l5-7M12 12 7 19M12 12l5 7M4 8h16M4 16h16M6 8l3 2M18 8l-3 2M6 16l3-2M18 16l-3-2"/>`,
    bot: `<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M8 2h8"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>`,
    refresh: `<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>`,
    lightbulb: `<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>`,
    flag: `<path d="M4 21V4M4 4h13l-2 4 2 4H4"/>`,
    plus: `<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>`,
    clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    book: `<path d="M12 7c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V5c-3 0-6 .5-8 2Z"/><path d="M12 7v14"/>`,
    layers: `<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="m2 12 10 5 10-5"/>`,
    tag: `<path d="M20 12 12 20l-8-8V4h8l8 8Z"/><circle cx="8" cy="8" r="1.6"/>`,
    pie: `<path d="M21 12A9 9 0 1 1 12 3v9h9Z"/>`,
    help: `<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.7"/><path d="M12 17h.01"/>`,
    fileCheck: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>`,
    history: `<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>`,
    trash: `<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>`,
    alert: `<path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5M12 17h.01"/>`,
    search: `<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>`,
    chevDown: `<path d="m6 9 6 6 6-6"/>`,
    chevUp: `<path d="m6 15 6-6 6 6"/>`,
    grid: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`,
    table: `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M12 3v18"/>`,
    sort: `<path d="M7 4v16M4 8l3-3 3 3M17 20V4M14 16l3 3 3-3"/>`,
    check: `<path d="M20 6 9 17l-5-5"/>`,
    rotate: `<path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8"/><path d="M3 3v5h5"/>`,
    close: `<path d="M18 6 6 18M6 6l12 12"/>`,
    plusSign: `<path d="M12 5v14M5 12h14"/>`,
    heart: `<path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8c0 4.9-7 9.2-7 9.2Z"/>`,
    pencil: `<path d="M4 20h4L18 10l-4-4L4 16v4Z"/><path d="m14 6 4 4"/>`,
    circle: `<circle cx="12" cy="12" r="9"/>`,
    checkCircle: `<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9.5"/>`,
    home: `<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10Z"/><path d="M9 22V12h6v10"/>`,
    eye: `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`,
    chevRight: `<path d="m9 6 6 6-6 6"/>`,
  };
  function ic(name, cls) {
    return `<svg viewBox="0 0 24 24" ${P} class="${cls || ''}">${SVG[name] || ''}</svg>`;
  }

  /* ------------------------------ Constantes ------------------------------ */
  const SUBJECTS_BASE = [
    'Língua Portuguesa',
    'Língua Inglesa',
    'Raciocínio Analítico',
    'Controle Externo',
    'Administração Pública',
    'Direito Constitucional',
    'Direito Administrativo (e Licitações)',
    'AFO (Administração Financeira e Orçamentária)',
    'Contabilidade (Geral e Pública)',
    'Auditoria Governamental',
    'Regulação Econômica e Agências',
    'TI e Análise de Dados (Python/R/SQL)',
    'Raciocínio Lógico / Matemática Financeira',
  ];
  const EDITAL_TOPICS = {
    'Língua Portuguesa': [
      '1 Compreensão e interpretação de textos de gêneros variados',
      '2 Reconhecimento de tipos e gêneros textuais',
      '3 Domínio da ortografia oficial',
      '4 Domínio dos mecanismos de coesão textual',
      '4.1 Emprego de elementos de referenciação, substituição e repetição, de conectores e de outros elementos de sequenciação textual',
      '4.2 Emprego de tempos e modos verbais',
      '5 Domínio da estrutura morfossintática do período',
      '5.1 Emprego das classes de palavras',
      '5.2 Relações de coordenação entre orações e entre termos da oração',
      '5.3 Relações de subordinação entre orações e entre termos da oração',
      '5.4 Emprego dos sinais de pontuação',
      '5.5 Concordância verbal e nominal',
      '5.6 Regência verbal e nominal',
      '5.7 Emprego do sinal indicativo de crase',
      '5.8 Colocação dos pronomes átonos',
      '6 Reescrita de frases e parágrafos do texto',
      '6.1 Significação das palavras',
      '6.2 Substituição de palavras ou de trechos de texto',
      '6.3 Reorganização da estrutura de orações e de períodos do texto',
      '6.4 Reescrita de textos de diferentes gêneros e níveis de formalidade',
    ],
    'Língua Inglesa': [
      '1 Compreensão de textos variados: domínio do vocabulário e da estrutura da língua, ideias principais e secundárias, explícitas e implícitas, relações intratextuais e intertextuais',
      '2 Itens gramaticais relevantes para compreensão de conteúdos semânticos',
      '3 Conhecimento e uso das formas contemporâneas da linguagem inglesa',
    ],
    'Raciocínio Analítico': [
      '1 Raciocínio analítico e a argumentação',
      '1.1 O uso do senso crítico na argumentação',
      '1.2 Tipos de Argumentos: argumentos falaciosos e apelativos',
      '1.3 Comunicação eficiente de argumentos',
    ],
    'Controle Externo': [
      '1 Conceito, tipos e formas de controle',
      '2 Controle interno e externo',
      '3 Controle parlamentar',
      '4 Controle pelos tribunais de contas',
      '5 Controle administrativo',
      '6 Lei nº 8.429/1992 (Lei de Improbidade Administrativa)',
      '7 Sistemas de controle jurisdicional da administração pública',
      '7.1 Contencioso administrativo e sistema da jurisdição una',
      '8 Controle jurisdicional da administração pública no direito brasileiro',
      '9 Controle da atividade financeira do Estado: espécies e sistemas',
      '10 Tribunal de Contas da União (TCU), Tribunais de Contas dos Estados e do Distrito Federal',
    ],
    'Administração Pública': [
      '1 Administração',
      '1.1 Abordagens clássica, burocrática e sistêmica da administração',
      '1.2 Evolução da administração pública no Brasil após 1930; reformas administrativas; a nova gestão pública',
      '2 Processo administrativo',
      '2.1 Funções da administração: planejamento, organização, direção e controle',
      '2.2 Estrutura organizacional',
      '2.3 Cultura organizacional',
      '3 Gestão de pessoas',
      '3.1 Equilíbrio organizacional',
      '3.2 Objetivos, desafios e características da gestão de pessoas',
      '3.3 Comportamento organizacional: relações indivíduo/organização, motivação, liderança, desempenho',
      '4 Noções de gestão de processos: técnicas de mapeamento, análise e melhoria de processos',
      '5 Gestão de projetos',
      '5.1 Elaboração, análise e avaliação de projetos',
      '5.2 Principais características dos modelos de gestão de projetos',
      '5.3 Projetos e suas etapas',
      '5.4 Metodologia ágil',
      '6 Administração de recursos materiais',
      '7 ESG',
    ],
    'Direito Constitucional': [
      '1 Constituição',
      '1.1 Conceito, objeto, elementos e classificações',
      '1.2 Supremacia da Constituição',
      '1.3 Aplicabilidade das normas constitucionais',
      '1.4 Interpretação das normas constitucionais',
      '1.5 Mutação constitucional',
      '2 Poder constituinte',
      '2.1 Características',
      '2.2 Poder constituinte originário',
      '2.3 Poder constituinte derivado',
      '3 Princípios fundamentais',
      '4 Direitos e garantias fundamentais',
      '4.1 Direitos e deveres individuais e coletivos',
      '4.2 Habeas corpus, mandado de segurança, mandado de injunção e habeas data',
      '4.3 Direitos sociais',
      '4.4 Direitos políticos',
      '4.5 Partidos políticos',
      '4.6 O ente estatal titular de direitos fundamentais',
      '5 Organização do Estado',
      '5.1 Organização político-administrativa',
      '5.2 Estado federal brasileiro',
      '5.3 A União',
      '5.4 Estados federados',
      '5.5 Municípios',
      '5.6 O Distrito Federal',
      '5.7 Territórios',
      '5.8 Intervenção federal',
      '5.9 Intervenção dos estados nos municípios',
      '6 Administração pública',
      '6.1 Disposições gerais',
      '6.2 Servidores públicos',
      '7 Organização dos poderes no Estado',
      '7.1 Mecanismos de freios e contrapesos',
      '7.2 Poder Legislativo',
      '7.3 Poder Executivo',
      '7.4 Poder Judiciário',
      '8 Funções essenciais à justiça',
      '8.1 Ministério Público',
      '8.2 Advocacia Pública',
      '8.3 Advocacia e Defensoria Pública',
      '9 Controle de constitucionalidade',
      '9.1 Sistemas gerais e sistema brasileiro',
      '9.2 Controle incidental ou concreto',
      '9.3 Controle abstrato de constitucionalidade',
      '9.4 Exame in abstractu da constitucionalidade de proposições legislativas',
      '9.5 Ação declaratória de constitucionalidade',
      '9.6 Ação direta de inconstitucionalidade',
      '9.7 Arguição de descumprimento de preceito fundamental',
      '9.8 Ação direta de inconstitucionalidade por omissão',
      '9.9 Ação direta de inconstitucionalidade interventiva',
      '10 Defesa do Estado e das instituições democráticas',
      '10.1 Estado de defesa e estado de sítio',
      '10.2 Forças armadas',
      '10.3 Segurança pública',
      '11 Sistema Tributário Nacional',
      '11.1 Princípios gerais',
      '11.2 Limitações do poder de tributar',
      '11.3 Impostos da União, dos estados e dos municípios',
      '11.4 Repartição das receitas tributárias',
      '12 Finanças públicas',
      '12.1 Normas gerais',
      '12.2 Orçamentos',
      '13 Ordem econômica e financeira',
      '13.1 Princípios gerais da atividade econômica',
      '13.2 Política urbana, agrícola e fundiária e reforma agrária',
      '14 Sistema Financeiro Nacional',
      '15 Ordem social',
      '16 Emenda Constitucional nº 103/2019 (Reforma da Previdência)',
      '17 Direitos e interesses das populações indígenas',
      '18 Direitos das Comunidades Remanescentes de Quilombos',
    ],
    'Direito Administrativo (e Licitações)': [
      '1 Estado, governo e administração pública',
      '1.1 Conceitos',
      '1.2 Elementos',
      '2 Direito administrativo',
      '2.1 Conceito',
      '2.2 Objeto',
      '2.3 Fontes',
      '3 Ato administrativo',
      '3.1 Conceito, requisitos, atributos, classificação e espécies',
      '3.2 Extinção do ato administrativo: cassação, anulação, revogação e convalidação',
      '3.3 Decadência administrativa',
      '4 Agentes públicos',
      '4.1 Legislação pertinente',
      '4.1.1 Lei nº 8.112/1990',
      '4.1.2 Disposições constitucionais aplicáveis',
      '4.2 Disposições doutrinárias',
      '4.2.1 Conceito',
      '4.2.2 Espécies',
      '4.2.3 Cargo, emprego e função pública',
      '4.2.4 Provimento',
      '4.2.5 Vacância',
      '4.2.6 Efetividade, estabilidade e vitaliciedade',
      '4.2.7 Remuneração',
      '4.2.8 Direitos e deveres',
      '4.2.9 Responsabilidade',
      '4.2.10 Processo administrativo disciplinar',
      '5 Poderes da administração pública',
      '5.1 Hierárquico, disciplinar, regulamentar e de polícia',
      '5.2 Uso e abuso do poder',
      '6 Regime jurídico-administrativo',
      '6.1 Conceito',
      '6.2 Princípios expressos e implícitos da administração pública',
      '7 Responsabilidade civil do Estado',
      '7.1 Evolução histórica',
      '7.2 Responsabilidade civil do Estado no direito brasileiro',
      '7.2.1 Responsabilidade por ato comissivo do Estado',
      '7.2.2 Responsabilidade por omissão do Estado',
      '7.3 Requisitos para a demonstração da responsabilidade do Estado',
      '7.4 Causas excludentes e atenuantes da responsabilidade do Estado',
      '7.5 Reparação do dano',
      '7.6 Direito de regresso',
      '8 Serviços públicos',
      '8.1 Conceito',
      '8.2 Elementos constitutivos',
      '8.3 Formas de prestação e meios de execução',
      '8.4 Delegação: concessão, permissão e autorização',
      '8.5 Classificação',
      '8.6 Princípios',
      '9 Organização administrativa',
      '9.1 Centralização, descentralização, concentração e desconcentração',
      '9.2 Administração direta e indireta',
      '9.3 Autarquias, fundações, empresas públicas e sociedades de economia mista',
      '9.4 Entidades paraestatais e terceiro setor: serviços sociais autônomos, entidades de apoio, organizações sociais, organizações da sociedade civil de interesse público',
      '10 Controle da administração pública',
      '10.1 Controle exercido pela administração pública',
      '10.2 Controle judicial',
      '10.3 Controle legislativo',
      '10.4 Improbidade administrativa: Lei nº 8.429/1992',
      '11 Processo administrativo',
      '11.1 Lei nº 9.784/1999',
      '12 Licitações e contratos administrativos',
      '12.1 Legislação pertinente',
      '12.1.1 Lei nº 14.133/2021',
      '12.1.2 Decreto nº 11.462/2023',
      '12.2 Fundamentos constitucionais',
    ],
    'Auditoria Governamental': [
      '1 Conceito, finalidade, objetivo, abrangência e atuação',
      '1.1 Auditoria interna e externa: papéis',
      '2 Instrumentos de fiscalização: auditoria, levantamento, monitoramento, acompanhamento e inspeção',
      '3 Tipos de auditoria',
      '3.1 Auditoria de conformidade',
      '3.2 Auditoria operacional',
      '3.3 Auditoria financeira',
      '4 Normas de auditoria',
      '4.1 Normas de Auditoria do TCU',
      '4.2 Normas da INTOSAI (Organização Internacional das Instituições Superiores de Controle): código de ética e princípios fundamentais de auditoria do setor público (ISSAIs 100, 200, 300 e 400)',
      '4.3 Normas Brasileiras de Auditoria do Setor Público (NBASP)',
      '5 Planejamento de auditoria',
      '5.1 Determinação de escopo',
      '5.2 Materialidade, risco e relevância',
      '5.3 Importância da amostragem estatística em auditoria',
      '5.4 Matriz de planejamento',
      '6 Execução da auditoria',
      '6.1 Programas de auditoria',
      '6.2 Papéis de trabalho',
      '6.3 Testes de auditoria',
      '6.4 Técnicas e procedimentos: exame documental, inspeção física, conferência de cálculos, observação, entrevista, circularização, conciliações, análise de contas contábeis, revisão analítica, caracterização de achados de auditoria',
      '7 Evidências',
      '7.1 Caracterização de achados de auditoria',
      '7.2 Matriz de Achados e Matriz de Responsabilização',
      '8 Comunicação dos resultados: relatórios de auditoria',
    ],
    'AFO (Administração Financeira e Orçamentária)': [
      '1 Funções do Governo',
      '1.1 Falhas de mercado e produção de bens públicos',
      '1.2 Políticas econômicas governamentais (alocativa, distributiva e estabilizadora)',
      '1.3 Federalismo Fiscal',
      '2 Orçamento público: conceitos e princípios',
      '2.1 Evolução conceitual do orçamento público',
      '2.2 Orçamento-Programa: fundamentos e técnicas',
      '3 Orçamento público no Brasil: Títulos I, IV, V e VI da Lei nº 4.320/1964',
      '3.1 Orçamento na Constituição de 1988: PPA, LDO e LOA',
      '3.2 Leis de Créditos Adicionais',
      '3.3 Emendas parlamentares ao Orçamento',
      '4 Plano Plurianual (PPA): estrutura, base legal, objetivos, conteúdo, tipos de programas',
      '5 Lei de Diretrizes Orçamentárias (LDO): objetivos, estrutura, Anexos de Metas e Riscos Fiscais, limitação de empenho',
      '6 Classificações orçamentárias',
      '6.1 Classificação da despesa pública: institucional, funcional, programática, pela natureza e MTO',
      '6.2 Classificação da receita pública: institucional, categorias econômicas, fontes e MTO',
      '7 Ciclo orçamentário: elaboração, discussão, votação e aprovação',
      '7.1 Execução orçamentária e financeira: estágios da despesa e da receita',
      '7.2 Programação de desembolso e mecanismos retificadores do orçamento',
      '7.3 Conta Única do Tesouro Nacional',
      '8 Gestão organizacional das finanças públicas (Lei nº 10.180/2001)',
      '9 Tópicos da Lei Complementar nº 101/2000 (LRF)',
      '10 Sistemas de informação: SIAFI, SIASG e SICONV',
      '11 Lei nº 12.527/2011 – Lei de Acesso à Informação',
    ],
    'Contabilidade (Geral e Pública)': [
      '1 NBC TSP Estrutura Conceitual para elaboração e divulgação de informação contábil do setor público',
      '1.1 Relatório Contábil de Propósito Geral (RCPG): objetivos, usuários, accountability, regimes de competência e de caixa',
      '1.2 Características qualitativas da informação',
      '1.3 Características da entidade que reporta a informação contábil',
      '1.4 Elementos das demonstrações: ativos, passivos, receitas, despesas, superávit ou déficit',
      '1.5 Reconhecimento, desreconhecimento e bases de mensuração',
      '2 Estrutura e apresentação das Demonstrações Contábeis do Setor Público (Lei 4.320/1964, NBC T SP 11, MCASP)',
      '3 Plano de Contas aplicado ao Setor Público',
      '3.1 Contas patrimoniais e de resultado',
      '3.2 Função e estrutura das contas',
      '3.3 Escrituração: débito, crédito, saldo e partidas dobradas',
      '4 Sistema de Contabilidade Federal (Lei 10.180/2001 e Decreto 6.976/2009)',
      '4.1 SIAFI: conceito, objetivos, usuários e segurança',
      '5 Tópicos da Lei Complementar nº 101/2000: dívida pública, restos a pagar, RREO e RGF',
      '6 Procedimentos contábeis orçamentários e patrimoniais (MCASP)',
      '6.1 Restos a pagar, empenho, liquidação e pagamento (Lei 4.320/1964 e MCASP)',
      '6.2 Informação orçamentária nas demonstrações (NBC TSP 13)',
      '6.3 IPSAS e informações de custos no setor público (NBC T 16.11 e Portaria STN 518/2018)',
      '7 Trabalho de asseguração (NBC TA Estrutura Conceitual)',
      '8 Análise das demonstrações contábeis: indicadores, análise horizontal e vertical, estrutura de capital, liquidez e notas explicativas',
    ],
    'Regulação Econômica e Agências': [
      '1 Sistema de contas nacionais e identidades macroeconômicas básicas',
      '1.1 Produto agregado, mensuração, produto nominal e real',
      '1.2 Contas do sistema monetário',
      '1.3 Balanço de pagamentos',
      '2 Modelo keynesiano básico: multiplicador e gastos do governo',
      '3 Modelo IS/LM: políticas monetária e fiscal',
      '3.1 Políticas macroeconômicas em diferentes regimes cambiais',
      '3.2 Avaliação do gasto público',
      '3.3 Financiamento do setor público no Brasil',
      '3.4 Conceitos de regulação, desregulação e re-regulação',
      '4 Teoria econômica de indústrias reguladas',
      '5 Estruturas de mercado: concorrência perfeita e monopolística, oligopólio, monopólio',
      '6 Falhas de mercado, externalidades, bens públicos e assimetria de informação',
      '7 Regulação e formação de preços em concorrência imperfeita',
      '8 Conceitos básicos sobre regimes tarifários',
      '9 Tarifação por custo de serviço',
      '10 Tarifação por preço-teto',
      '11 Regulação por incentivos',
      '12 Regulação para competição',
    ],
    'TI e Análise de Dados (Python/R/SQL)': [
      '1 Infraestrutura de TI',
      '1.1 Arquitetura, topologias, data center, hiperconvergência e arquitetura escalável',
      '1.2 Redes e comunicação de dados: protocolos, VLAN, SDN e wireless corporativo',
      '1.3 Sistemas operacionais, servidores, virtualização e serviços de diretório',
      '1.4 Armazenamento e backup: SAN, NAS, RAID, RPO/RTO',
      '1.5 Segurança de infraestrutura: hardening, firewall, IDS/IPS, VPN e segmentação',
      '1.6 Monitoramento, gestão, automação e alta disponibilidade',
      '2 Engenharia de dados',
      '2.1 Bancos relacionais e NoSQL, modelagem e SQL',
      '2.2 Data Warehouse, DataMart, Data Lake e Data Mesh',
      '2.3 Conectores, APIs, arquivos, mensageria e ETL/pipeline',
      '2.4 Governança, qualidade, linhagem e integração com nuvem',
      '3 Engenharia de software',
      '3.1 Arquitetura: monolito, microsserviços, serverless e mensageria',
      '3.2 Design, APIs, persistência, DevOps, testes e Java',
      '4 Segurança da informação',
      '4.1 Identidade e acesso, MFA, SSO, OAuth2 e OpenID Connect',
      '4.2 Malware, ataques, SIEM, frameworks (MITRE, CIS, NIST) e incidentes',
      '5 Computação em nuvem',
      '5.1 IaaS, PaaS, SaaS, AWS, Azure, GCP, IaC e FinOps',
      '6 Inteligência artificial',
      '6.1 Aprendizado de máquina, deep learning, PLN, IA generativa, MLOps e ética',
      '7 Contratações de TI',
      '7.1 ETP, TR, riscos, SLA, Lei 14.133/2021, LGPD e IN SGD',
      '8 Gestão de TI: ITIL v4, COBIT 5 e metodologias ágeis',
      '9 Análise de dados: Python, R, SQL, ETL e mineração de dados',
    ],
    'Raciocínio Lógico / Matemática Financeira': [
      '1 Regra de três simples e composta, proporcionalidades e porcentagens',
      '2 Juros simples e compostos',
      '3 Capitalização e desconto',
      '4 Taxas de juros nominal, efetiva, equivalente, real e aparente',
      '5 Rendas uniformes e variáveis',
      '6 Planos de amortização de empréstimos e financiamentos',
      '6.1 Sistema francês (tabela Price)',
      '6.2 Sistema de Amortização Constante (SAC)',
      '6.3 Sistema de Amortização Misto (SAM)',
      '7 Cálculo financeiro',
      '7.1 Custo real e efetivo das operações de financiamento, empréstimo e investimento',
      '8 Avaliação de alternativas de investimento em economia estável e em ambiente inflacionário',
      '9 Avaliação econômica de projetos',
      '10 Taxas de retorno e taxas internas de retorno',
    ],
  };
  function foldName(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  const EDITAL_ALIASES = {
    'lingua portuguesa': 'Língua Portuguesa',
    'lingua inglesa': 'Língua Inglesa',
    'ingles': 'Língua Inglesa',
    'raciocinio analitico': 'Raciocínio Analítico',
    'controle externo': 'Controle Externo',
    'administracao publica': 'Administração Pública',
    'direito constitucional': 'Direito Constitucional',
    'direito administrativo': 'Direito Administrativo (e Licitações)',
    'direito administrativo e licitacoes': 'Direito Administrativo (e Licitações)',
    'auditoria governamental': 'Auditoria Governamental',
    'auditoria governamental e controle externo': 'Auditoria Governamental',
    'afo': 'AFO (Administração Financeira e Orçamentária)',
    'administracao financeira': 'AFO (Administração Financeira e Orçamentária)',
    'administracao financeira e orcamentaria': 'AFO (Administração Financeira e Orçamentária)',
    'contabilidade': 'Contabilidade (Geral e Pública)',
    'contabilidade geral e publica': 'Contabilidade (Geral e Pública)',
    'contabilidade publica': 'Contabilidade (Geral e Pública)',
    'contabilidade aplicada ao setor publico': 'Contabilidade (Geral e Pública)',
    'regulacao': 'Regulação Econômica e Agências',
    'regulacao economica e agencias': 'Regulação Econômica e Agências',
    'economia do setor publico': 'Regulação Econômica e Agências',
    'economia do setor publico e da regulacao': 'Regulação Econômica e Agências',
    'ti': 'TI e Análise de Dados (Python/R/SQL)',
    'ti e analise de dados': 'TI e Análise de Dados (Python/R/SQL)',
    'tecnologia da informacao': 'TI e Análise de Dados (Python/R/SQL)',
    'analise de dados': 'TI e Análise de Dados (Python/R/SQL)',
    'raciocinio logico': 'Raciocínio Lógico / Matemática Financeira',
    'matematica financeira': 'Raciocínio Lógico / Matemática Financeira',
    'raciocinio logico matematica financeira': 'Raciocínio Lógico / Matemática Financeira',
  };
  function editalKey(subject) {
    const raw = String(subject || '').trim();
    if (EDITAL_TOPICS[raw]) return raw;
    const folded = foldName(raw);
    if (!folded) return '';
    const alias = EDITAL_ALIASES[folded];
    if (alias && EDITAL_TOPICS[alias]) return alias;
    const exact = SUBJECTS_BASE.filter(function (official) { return foldName(official) === folded; })[0];
    if (exact && EDITAL_TOPICS[exact]) return exact;
    const tokenHits = SUBJECTS_BASE.filter(function (official) {
      return (' ' + foldName(official) + ' ').indexOf(' ' + folded + ' ') >= 0;
    });
    if (tokenHits.length === 1 && EDITAL_TOPICS[tokenHits[0]]) return tokenHits[0];
    return '';
  }
  function canonicalSubject(name) {
    const raw = String(name || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    const key = editalKey(raw);
    if (key) return key;
    const exact = SUBJECTS_BASE.filter(function (official) { return foldName(official) === foldName(raw); })[0];
    return exact || raw;
  }
  function editalTopics(subject) {
    const key = editalKey(subject);
    return key ? EDITAL_TOPICS[key].slice() : [];
  }
  function topicCode(label) {
    const m = String(label || '').match(/^(\d+(?:\.\d+)*)\b/);
    return m ? m[1] : '';
  }
  // Um registro pode marcar vários tópicos ao mesmo tempo; guardamos como JSON
  // dentro da mesma coluna "topic" do CSV (retrocompatível com texto simples antigo).
  function parseTopicsRaw(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (!s) return [];
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p.map(function (t) { return String(t || '').trim(); }).filter(Boolean);
    } catch (_) { /* texto antigo, não é JSON */ }
    return [s];
  }
  function logTopics(l) { return parseTopicsRaw(l && l.topic); }
  function serializeTopics(arr) {
    const clean = (arr || []).map(function (t) { return String(t || '').trim(); }).filter(Boolean);
    return clean.length ? JSON.stringify(clean) : '';
  }
  // Tópicos "outros" já usados nessa matéria (fora do edital oficial), para
  // virarem checkbox também em vez de precisar redigitar tudo de novo.
  function catalogTopicsFor(subject) {
    const bank = editalTopics(subject);
    const seen = {};
    const out = [];
    curLogs().forEach(function (l) {
      if (l.subject !== subject) return;
      logTopics(l).forEach(function (t) {
        if (!t || t === 'Estudo Geral / Não especificado' || bank.indexOf(t) >= 0) return;
        if (!seen[t]) { seen[t] = true; out.push(t); }
      });
    });
    return out;
  }
  function daysSince(dateStr) {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return Infinity;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  function formTopicPool() {
    return editalTopics(form.subject).concat(catalogTopicsFor(form.subject));
  }
  function topicDescendants(label, pool) {
    const code = topicCode(label);
    if (!code) return [label];
    return (pool || []).filter(function (t) {
      const c = topicCode(t);
      return t === label || c === code || (c && c.indexOf(code + '.') === 0);
    });
  }
  function topicAncestors(label, pool) {
    const code = topicCode(label);
    if (!code || code.indexOf('.') < 0) return [];
    const parts = code.split('.');
    const out = [];
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join('.');
      (pool || []).forEach(function (t) {
        if (topicCode(t) === prefix && out.indexOf(t) < 0) out.push(t);
      });
    }
    return out;
  }
  function applyTopicToggle(label) {
    const pool = formTopicPool();
    const has = form.topics.indexOf(label) >= 0;
    const family = topicDescendants(label, pool);
    if (has) {
      const drop = family.concat(topicAncestors(label, pool));
      form.topics = form.topics.filter(function (x) { return drop.indexOf(x) < 0; });
      return;
    }
    family.forEach(function (t) { if (form.topics.indexOf(t) < 0) form.topics.push(t); });
    topicAncestors(label, pool).forEach(function (parent) {
      const kids = topicDescendants(parent, pool).filter(function (t) { return t !== parent; });
      if (kids.length && kids.every(function (t) { return form.topics.indexOf(t) >= 0; }) && form.topics.indexOf(parent) < 0) {
        form.topics.push(parent);
      }
    });
  }
  function syncTopicChecks() {
    document.querySelectorAll('#cp-topic-wrap [data-action="topic-toggle"]').forEach(function (btn) {
      const t = btn.getAttribute('data-topic');
      const on = form.topics.indexOf(t) >= 0;
      btn.classList.toggle('on', on);
      btn.innerHTML = ic(on ? 'checkCircle' : 'circle') + '<span>' + esc(t) + '</span>';
    });
  }
  function topicStatsFor(subject) {
    const map = {};
    curLogs().forEach(function (l) {
      if (l.subject !== subject) return;
      const names = logTopics(l);
      const list = names.length ? names : ['Estudo Geral / Não especificado'];
      const share = l.minutes / list.length;
      list.forEach(function (t) {
        const e = map[t] || { topicName: t, totalMinutes: 0, sessionsCount: 0, lastDate: l.date, categories: new Set() };
        e.totalMinutes += share; e.sessionsCount += 1; e.categories.add(l.category);
        if (l.date > e.lastDate) e.lastDate = l.date;
        map[t] = e;
      });
    });
    const seen = {};
    const bank = isGabi() ? [] : editalTopics(subject);
    const topics = bank.map(function (name) {
      seen[name] = true;
      return map[name] || { topicName: name, totalMinutes: 0, sessionsCount: 0, lastDate: '', categories: new Set() };
    });
    Object.keys(map).forEach(function (k) { if (!seen[k]) topics.push(map[k]); });
    return topics;
  }
  // Matérias extras (Inglês, por exemplo) ficam no navegador e, uma vez usadas,
  // sobrevivem nos próprios registros do data.csv.
  const EXTRA_KEY = 'concurso_study_tracker_subjects_v1';
  let extraSubjects = [];
  try { const s = localStorage.getItem(EXTRA_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p)) extraSubjects = p; } } catch (_) {}
  function persistExtras() { try { localStorage.setItem(EXTRA_KEY, JSON.stringify(extraSubjects)); } catch (_) {} }
  function logStatus(l) {
    const s = String((l && l.status) || '').toLowerCase();
    return s === 'deleted' || s === 'subject_deleted' ? s : '';
  }
  function isDeletedLog(l) { return logStatus(l) === 'deleted'; }
  function isCustomSubject(name) {
    return !isGabi() && !!name && SUBJECTS_BASE.indexOf(name) < 0;
  }
  function pushUnique(list, s) { if (s && list.indexOf(s) < 0) list.push(s); }
  function catalogSubjects() {
    const out = (isGabi() ? GABI_SUBJECTS : SUBJECTS_BASE).slice();
    if (!isGabi()) extraSubjects.forEach(function (s) {
      const canon = canonicalSubject(s);
      if (SUBJECTS_BASE.indexOf(canon) >= 0) return;
      pushUnique(out, s);
    });
    curLogs().forEach(function (l) {
      if (logStatus(l) === 'subject_deleted') return;
      const canon = canonicalSubject(l.subject);
      pushUnique(out, canon || l.subject);
    });
    return out;
  }
  function allSubjects() {
    const out = catalogSubjects();
    curLogs().forEach(function (l) { pushUnique(out, canonicalSubject(l.subject) || l.subject); });
    return out;
  }
  function absorbAliasSubjects() {
    let changed = false;
    extraSubjects = extraSubjects.filter(function (s) {
      const canon = canonicalSubject(s);
      if (canon && canon !== s && SUBJECTS_BASE.indexOf(canon) >= 0) { changed = true; return false; }
      return true;
    });
    logs = logs.map(function (l) {
      const canon = canonicalSubject(l.subject);
      if (!canon || canon === l.subject) return l;
      changed = true;
      return Object.assign({}, l, { subject: canon });
    });
    if (changed) {
      persistExtras();
      persist();
      saveLogsToServer(logs);
    }
    return changed;
  }
  function addSubject(nome) {
    const s = String(nome || '').replace(/\s+/g, ' ').trim();
    if (!s || s.length > 60) return null;
    const canon = canonicalSubject(s);
    if (SUBJECTS_BASE.indexOf(canon) >= 0) return canon;
    const hit = catalogSubjects().filter(function (x) { return foldName(x) === foldName(s) || foldName(x) === foldName(canon); })[0];
    if (hit) return hit;
    extraSubjects.push(s);
    persistExtras();
    const revived = logs.map(function (l) {
      if (String(l.subject || '').toLowerCase() !== s.toLowerCase() || logStatus(l) !== 'subject_deleted') return l;
      return Object.assign({}, l, { subject: s, status: '' });
    });
    if (revived.some(function (l, i) { return l !== logs[i]; })) {
      logs = revived;
      persist();
      saveLogsToServer(logs);
    }
    return s;
  }
  function renameSubject(from, to) {
    const next = String(to || '').replace(/\s+/g, ' ').trim();
    if (!from || !next || next.length > 60) return null;
    extraSubjects = extraSubjects.map(function (s) { return s === from ? next : s; })
      .filter(function (s, i, a) { return a.indexOf(s) === i; });
    extraSubjects = extraSubjects.filter(function (s) { return s !== from; });
    if (SUBJECTS_BASE.indexOf(next) < 0 && extraSubjects.indexOf(next) < 0) extraSubjects.push(next);
    persistExtras();
    if (form.subject === from) form.subject = next;
    setLogs(logs.map(function (l) {
      return l.subject === from ? Object.assign({}, l, { subject: next }) : l;
    }));
    return next;
  }
  function retireSubject(name) {
    if (!isCustomSubject(name)) return false;
    extraSubjects = extraSubjects.filter(function (s) { return s !== name; });
    persistExtras();
    if (form.subject === name) form.subject = SUBJECTS_BASE[0];
    ui.confirmSubject = null;
    setLogs(logs.map(function (l) {
      if (l.subject !== name || logStatus(l) === 'deleted') return l;
      return Object.assign({}, l, { status: 'subject_deleted' });
    }));
    return true;
  }
  // Abas compactas: concursos do Matheus, reta final da Gabi e a linha do tempo do casal.
  const TABS = [
    { id: 'matheus', label: 'Matheus', icon: 'cap' },
    { id: 'gabi', label: 'Gabi', icon: 'sparkles' },
    { id: 'gatheus', label: 'GATHEUS', icon: 'heart' },
  ];
  const TAB_OWNER = { gabi: 'gabi', gatheus: 'casal' };

  // Prazo comum às três abas.
  const HORIZON_DATE = '2029-10-06';
  const META_CATEGORIES = ['Família', 'Formação', 'Carreira', 'Financeiro', 'Saúde', 'Casa', 'Viagens', 'Relacionamento'];
  const META_STATUS = [
    { id: 'planejado', label: 'Planejado' },
    { id: 'andamento', label: 'Em andamento' },
    { id: 'concluido', label: 'Concluído' },
  ];
  const WHO = [
    { id: 'nos', label: 'Nós dois', icon: 'heart' },
    { id: 'matheus', label: 'Matheus', icon: 'cap' },
    { id: 'gabi', label: 'Gabi', icon: 'sparkles' },
  ];

  const CATEGORIES = ['Teoria', 'Revisão', 'Questões', 'Simulado'];
  const CAT_COLOR = { 'Teoria': '#3b82f6', 'Revisão': '#10b981', 'Questões': '#f59e0b', 'Simulado': '#8b5cf6' };
  const CAT_ICON = { 'Teoria': 'book', 'Revisão': 'refresh', 'Questões': 'help', 'Simulado': 'fileCheck' };
  const TOTAL_GOAL_HOURS = 3000;
  const TARGET_DATE = HORIZON_DATE;
  const START_DATE = '2026-09-21';

  /* ---------------------- Perfil de estudos da Gabi ----------------------- */
  // Reta final do doutorado (3 capítulos) e do MBA, com as horas de cada frente
  // contadas por dia. As defesas são em meados de abril de 2027.
  const GABI_CATEGORIES = ['Análise de dados', 'Leitura', 'Escrita'];
  const GABI_CAT_COLOR = { 'Análise de dados': '#8b5cf6', 'Leitura': '#3b82f6', 'Escrita': '#10b981' };
  const GABI_CAT_ICON = { 'Análise de dados': 'trending', 'Leitura': 'book', 'Escrita': 'pencil' };
  const GABI_DEFESA = '2027-04-15';
  const GABI_CAL_END = '2027-04-30'; // Study Calendar da Gabi: até o fim de abril (defesas)
  const GABI_DIARIO = 5; // horas de esforço por dia até a defesa
  const GABI_PROJETOS = [
    {
      nome: 'Fase final · Doutorado', icon: 'cap', cls: 'dout',
      partes: [
        { subject: 'Doutorado • Capítulo 1', nome: 'Capítulo 1', metas: { 'Análise de dados': 80, 'Leitura': 60, 'Escrita': 120 } },
        { subject: 'Doutorado • Capítulo 2', nome: 'Capítulo 2', metas: { 'Análise de dados': 80, 'Leitura': 60, 'Escrita': 120 } },
        { subject: 'Doutorado • Capítulo 3', nome: 'Capítulo 3', metas: { 'Análise de dados': 80, 'Leitura': 60, 'Escrita': 120 } },
      ],
    },
    {
      nome: 'Fase final · MBA', icon: 'fileCheck', cls: 'mba',
      partes: [
        { subject: 'MBA • Fase final', nome: 'Trabalho final', metas: { 'Análise de dados': 40, 'Leitura': 60, 'Escrita': 120 } },
      ],
    },
  ];
  const GABI_SUBJECTS = GABI_PROJETOS.reduce(function (a, p) {
    return a.concat(p.partes.map(function (x) { return x.subject; }));
  }, []);
  const GABI_GOAL_HOURS = GABI_PROJETOS.reduce(function (a, p) {
    return a + p.partes.reduce(function (b, x) {
      return b + GABI_CATEGORIES.reduce(function (c, k) { return c + (x.metas[k] || 0); }, 0);
    }, 0);
  }, 0);

  /* ------------------ Perfil ativo (de quem são os dados) ------------------ */
  function profileId() { return ui.tab === 'gabi' ? 'gabi' : 'matheus'; }
  function isGabi() { return profileId() === 'gabi'; }
  function logOwner(l) { return l && l.owner === 'gabi' ? 'gabi' : 'matheus'; }
  function curLogs() {
    const p = profileId();
    return logs.filter(function (l) { return logOwner(l) === p && !isDeletedLog(l); });
  }
  function cats() { return isGabi() ? GABI_CATEGORIES : CATEGORIES; }
  function catColor(c) { return (isGabi() ? GABI_CAT_COLOR : CAT_COLOR)[c] || '#64748b'; }
  function catIcon(c) { return (isGabi() ? GABI_CAT_ICON : CAT_ICON)[c] || 'layers'; }
  function goalHours() { return isGabi() ? GABI_GOAL_HOURS : TOTAL_GOAL_HOURS; }

  // Grade de um dia útil, do despertar ao descanso. "fim" em minutos desde a
  // meia-noite; o bloco de descanso vai até o despertador do dia seguinte.
  const ACORDAR = '05:50';
  const AGENDA = [
    { ini: '05:50', fim: '06:30', nome: 'Acordar', tipo: 'livre', ciclo: 'Acordar' },
    { ini: '06:30', fim: '08:30', nome: 'Estudo', tipo: 'estudo', ciclo: 'Estudo matinal' },
    { ini: '08:30', fim: '17:30', nome: 'Doutorado', tipo: 'tese', ciclo: 'Doutorado' },
    { ini: '17:30', fim: '18:30', nome: 'Reset mental · exercício físico', tipo: 'reset', ciclo: 'Recuperação' },
    { ini: '18:30', fim: '20:30', nome: 'Resolução de questões', tipo: 'estudo', ciclo: 'Questões / revisão' },
    { ini: '20:30', fim: '05:50', nome: 'Descanso', tipo: 'livre', ciclo: 'Descanso' },
  ];

  // Rotina fixa do fim de semana. Domingo é descanso: não conta como falha
  // no streak e o calendário não marca o dia como perdido.
  const ROTINA = {
    6: { nome: 'Simulados e Discursiva', meta: '3h a 4h', desc: 'Provas antigas em tempo real e treino de notas técnicas ou pareceres.' },
    0: { nome: 'Recuperação', meta: 'descanso', desc: 'Descanso absoluto do concurso (e da tese, se possível).', folga: true },
  };
  // A rotina de fim de semana é do concurso; a agenda da Gabi é livre.
  function rotina(dow) { return isGabi() ? null : ROTINA[dow]; }

  // Fases da jornada. A ideia: no 1º ano cobrir todo o edital (mesmo sem
  // profundidade) para já poder prestar provas e calibrar; no 2º ano calibrar
  // com provas reais; nos últimos 4–6 meses, profundidade máxima.
  const PHASES = [
    { from: 0, to: 1000, key: 'p1', name: 'Ano 1 · Cobertura', desc: 'Ver todo o edital ao menos uma vez' },
    { from: 1000, to: 2200, key: 'p2', name: 'Ano 2 · Calibragem', desc: 'Provas reais, simulados e ajuste fino' },
    { from: 2200, to: 3000, key: 'p3', name: 'Reta final · Nível fera', desc: 'Últimos 4–6 meses: profundidade máxima' },
  ];

  // Marcos fragmentados — jornada longa precisa de vitórias frequentes.
  const MILESTONES = [
    { h: 100, label: '100h', note: 'Rotina criada' },
    { h: 250, label: '250h', note: 'Base em formação' },
    { h: 500, label: '500h', note: 'Metade do 1º ciclo' },
    { h: 750, label: '750h', note: 'Edital quase todo visto' },
    { h: 1000, label: '1.000h', note: '1 ano · apto a prestar provas' },
    { h: 1250, label: '1.250h', note: 'Primeiras provas reais' },
    { h: 1500, label: '1.500h', note: 'Metade da meta' },
    { h: 1750, label: '1.750h', note: 'Questões em volume' },
    { h: 2000, label: '2.000h', note: '2 anos · nível competitivo' },
    { h: 2200, label: '2.200h', note: 'Início da reta final' },
    { h: 2500, label: '2.500h', note: 'Nível fera' },
    { h: 2750, label: '2.750h', note: 'Lapidação' },
    { h: 3000, label: '3.000h', note: 'Meta · posse' },
  ];

  const MOTIVATIONAL_QUOTES = [
    { minHours: 0, maxHours: 100, phase: 'Fase Inicial • Primeiro Passo', quote: 'O início exige disciplina bruta. Cada página lida hoje é o alicerce da sua vaga no Diário Oficial.', author: 'Princípio do Auditor' },
    { minHours: 100, maxHours: 350, phase: 'Fase de Construção • Edificando a Base', quote: 'Você superou os primeiros 100 blocos. A constância silenciosa vence o talento inconsistente.', author: 'Mente de Concurseiro' },
    { minHours: 350, maxHours: 750, phase: 'Fase de Consolidação • Ritmo Firme', quote: 'A jurisprudência e os demonstrativos orçamentários já não assustam mais. Você está criando casca.', author: 'Foco no TCU/CGU/Agências' },
    { minHours: 750, maxHours: 1250, phase: 'Fase Intermediária • A Barreira das Mil Horas', quote: 'Ultrapassando o primeiro milhar! A maioria desiste antes daqui; você está no pelotão de elite.', author: 'Estratégia de Controle' },
    { minHours: 1250, maxHours: 1800, phase: 'Fase Avançada • Domínio Teórico e Prático', quote: 'Resolução massiva de questões e análise fria dos erros. O padrão das bancas já é familiar.', author: 'Precisão em Prova' },
    { minHours: 1800, maxHours: 2400, phase: 'Fase de Lapidação • Reta Pré-Edital', quote: 'Mais de 2.000 horas acumuladas. Você não estuda para passar, estuda até passar nas primeiras colocações.', author: 'Mentalidade Vencedora' },
    { minHours: 2400, maxHours: 2999, phase: 'Fase Final • Iminência da Nomeação', quote: 'A linha de chegada está à vista. Mantenha o sangue frio e a serenidade; sua posse está sendo forjada.', author: 'Últimas Milhas' },
    { minHours: 3000, maxHours: 99999, phase: 'Meta Atingida • Nível Titular de Cargo', quote: 'Meta das 3.000 horas conquistada! Bagagem sólida e competitividade máxima para qualquer concurso da República.', author: 'Parabéns, Futuro Auditor/Especialista!' },
  ];

  const STORAGE_KEY = 'concurso_study_tracker_logs_v1';
  const THEME_KEY = 'concurso_study_tracker_theme_v1';
  const INSIGHT_KEY = 'life_insight_v2';
  const MILAGRE_KEY = 'life_milagre_gabi_v1';
  const MILAGRE_WEEK = 7; // últimos dias visíveis na ofensiva
  const MILAGRE_DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  /* -------------------------------- Estado -------------------------------- */
  let logs = loadLogs();
  let darkMode = loadTheme();
  // Um insight por dia, por pessoa (matheus / gabi).
  let insightByOwner = loadCachedInsights();
  let milagreDays = loadMilagreDays();
  const ui = { subjView: 'cards', subjSort: 'hours', expanded: null, subjOpen: [], search: '', confirmDel: null, mentorLoading: false, topicsOpen: false, historyOpen: false, subjectOpen: false, formOpen: false, addingSubject: false, renamingSubject: false, confirmSubject: null, topicOutroOpen: false, focusTopicOutroNext: false, newSubject: '',
    tab: initialTab(), metaForm: null, confirmMeta: null, portal: null, portalWho: null, milesOpen: false, insightOpen: false, milagreOpen: false,
    gabiProj: 'dout', gabiCap: null }; // gabiCap: null = doutorado geral; 0/1/2 = cap.

  // A visualização de cada um: o dia da chegada escrito no presente, para ler
  // antes de começar. Texto do próprio dono da aba, palavra por palavra.
  const VISION = {
    matheus: {
      titulo: 'Minha visualização',
      resumo: 'Como é o dia 06/10/2029 quando tudo isso já aconteceu',
      itens: [
        'Estou com meu Doutorado concluído, dando cursos com Matheus Ferreira, com parceiros ou sozinho (dependendo da situação) na área de Deep Learning e Machine Learning.',
        'Sou referência em Deep Learning focado em reconhecimento de espécies e também referência em leucenas no mundo, especialmente na parte de erradicação.',
        'Estou com minha estabilidade financeira garantida pois acabo de ser aprovado num concurso dos sonhos e eu e Gabi estamos decidindo quais das opções mais vale a pena seguir.',
        'Nossa filha Sofia já está com 1 aninho, e é a coisinha maisssss linda desse mundo e Gabi já está grávida do nosso segundo filho. Eu e Gabi estamos mais unidos e fortes do que nunca, que benção.',
        'Olhando pra trás dá pra ver que tudo que vivemos e passamos na vida valeu muiiiito a pena e super contribuiu para chegarmos até aqui hoje. Obrigado meu Deus!',
      ],
    },
    gabi: {
      titulo: 'Minha visualização',
      resumo: 'Como é o dia 06/10/2029 quando tudo isso já aconteceu',
      itens: [
        'Hoje estou muito feliz por ser Doutora com paper publicado em revista internacional (2027) além de ter inglês fluente que era algo que tanto queria, graças ao Doutorado sanduíche do Matheus.',
        'É bom demais estar trabalhando com negociação / mediação / pessoas / política / Meio Ambiente; ganhando bem e com salário maior que R$ 10.000,00.',
        'Estou terminando minha bolsa Marie Curie e estou realizada com essa pesquisa, com meu orientador(a) e meu grupo de pesquisa. Minha pesquisa exige que eu trabalhe com as minhas principais habilidades: conversar / lidar com pessoas / extrair informações / traduzir diferentes linguagens, além de ver propósito no meu trabalho. O campo da minha pesquisa é no Brasil então conseguimos ficar próximo da família. O que é uma benção muito grande.',
        'Já temos a Sofia, ela é linda, cheia de saúde, amamos muito ela, super esperta e inteligente. Eu e Matheus estamos mais unidos do que nunca e estamos conseguindo nos organizar entre trabalho, estudos & família e deveres da casa. E eu estou grávida do nosso segundo filho (Sérgio / Samuel / Bento).',
        'Estou fazendo muitos contatos através da Marie Curie e vejo muitas oportunidades maravilhosas de trabalho que eu posso aplicar. Além de que agora eu tenho francês muito bom e vejo perspectivas para um trabalho como diplomata ou na ONU.',
      ],
    },
  };

  // Afirmações no presente: o que cada um decide ser verdade hoje, enquanto a
  // jornada ainda está em curso. Derivadas da visualização e das metas do casal.
  const AFIRMACOES = {
    matheus: {
      titulo: 'Minhas afirmações',
      resumo: 'Verdades que eu escolho viver hoje',
      itens: [
        'Eu avanço no meu doutorado e construo, passo a passo, minha especialização em Deep Learning, reconhecimento de espécies e controle da leucena.',
        'Eu acordo cedo, estudo com disciplina e avanço todos os dias. 3.000 horas não me assustam: construo minha preparação uma hora de cada vez.',
        'Nenhuma matéria é difícil para mim. Quando algo parece difícil, eu mudo a perspectiva, encontro a lógica e viro a chave. Eu sou capaz de aprender qualquer conteúdo com clareza e confiança.',
        'Eu me preparo para dominar o edital de Controle e Regulação e chegar aos concursos com conhecimento, consistência e sem improviso.',
        'Eu construo, com paciência e disciplina, a estabilidade financeira e a família que desejo. Sou um marido presente e me preparo para ser um pai amoroso.',
        'Eu cuido do meu corpo, da minha mente e do meu tempo. Não preciso ser perfeito para avançar: quando saio do caminho, volto ao próximo passo. Sou grato e continuo.',
      ],
    },
    gabi: {
      titulo: 'Minhas afirmações',
      resumo: 'Verdades que eu escolho viver hoje',
      itens: [
        'Eu fecho meu doutorado e meu MBA com excelência, capítulo por capítulo, hora por hora.',
        'Eu publico em revista internacional e falo inglês com fluência e confiança.',
        'Eu entrego o Marie Curie com propósito, pesquisa forte e presença perto da família.',
        'Eu trabalho com negociação, mediação, pessoas, política e meio ambiente — e ganho bem fazendo o que sei fazer.',
        'Eu uso minhas forças: conversar, extrair informação, traduzir linguagens e gerar conexão.',
        'Meu francês abre portas: diplomacia, ONU e redes internacionais estão no meu caminho.',
        'Eu organizo trabalho, estudos, casa e família sem me perder de mim.',
        'Eu e Matheus somos um time: unidos, parceiros e capazes de construir a vida que escolhemos.',
        'Eu sou mãe da Sofia com amor, saúde e presença — e recebo o segundo filho com alegria.',
        'Eu mereço realização profissional sem abrir mão da família. Eu consigo as duas coisas.',
      ],
    },
  };

  // Abrir o /life cai sempre no GATHEUS; as outras abas ficam a um link (#gabi, #matheus).
  function initialTab() {
    const fromHash = String(location.hash || '').replace('#', '').toLowerCase();
    if (TABS.some(function (t) { return t.id === fromHash; })) return fromHash;
    return 'gatheus';
  }
  function setTab(id) {
    if (!TABS.some(function (t) { return t.id === id; }) || id === ui.tab) return;
    ui.tab = id;
    ui.metaForm = null; ui.confirmMeta = null; ui.formOpen = false; ui.portal = null; ui.portalWho = null; ui.insightOpen = false; ui.milagreOpen = false;
    ui.expanded = null; ui.search = ''; ui.subjOpen = [];
    ui.addingSubject = false; ui.renamingSubject = false; ui.confirmSubject = null; ui.topicOutroOpen = false;
    resetFormProfile();
    if (location.hash.replace('#', '') !== id) history.replaceState(null, '', '#' + id);
    render();
    window.scrollTo({ top: 0 });
  }
  const form = {
    date: getToday(), subject: SUBJECTS_BASE[0], category: CATEGORIES[0], minutes: '60',
    topic: '', topics: [], topicOutro: '', editId: null, minutesEdit: false,
  };
  // Cada aba tem suas próprias frentes e tipos de trabalho.
  function resetFormProfile() {
    form.editId = null;
    form.topic = '';
    form.topics = [];
    form.topicOutro = '';
    form.minutes = '60';
    form.minutesEdit = false;
    form.subject = isGabi() ? GABI_SUBJECTS[0] : SUBJECTS_BASE[0];
    form.category = cats()[0];
  }
  // Reúne o que foi marcado (checkbox) + o texto livre do "Outro" num único array.
  function collectFormTopics() {
    if (isGabi()) {
      const t = String(form.topic || '').trim();
      return t ? [t] : [];
    }
    const chosen = (form.topics || []).slice();
    String(form.topicOutro || '').split(',').forEach(function (raw) {
      const t = raw.trim();
      if (t && chosen.indexOf(t) < 0) chosen.push(t);
    });
    return chosen;
  }

  /* ------------------------------- Helpers -------------------------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function getToday() { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); }
  function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function formatDateBR(s) { if (!s) return ''; const p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
  function minToHours(m) { return Number((m / 60).toFixed(2)); }
  function formatMinHuman(m) { if (m < 60) return m + 'min'; const h = Math.floor(m / 60), r = m % 60; return r === 0 ? h + 'h' : h + 'h ' + r + 'min'; }
  function formatDurationLong(m) {
    const mins = Math.max(0, parseInt(m, 10) || 0);
    const h = Math.floor(mins / 60);
    const r = mins % 60;
    if (h === 0) return r + ' min';
    const hrs = h === 1 ? '1 hr' : h + ' hrs';
    return r === 0 ? hrs : hrs + ' e ' + r + ' min';
  }
  function clampMinutes(m) { return Math.max(1, Math.min(1440, parseInt(m, 10) || 0)); }
  function formatHoursDec(h) { return Number(h).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }); }
  function getPhaseQuote(hours) { return MOTIVATIONAL_QUOTES.find(function (q) { return hours >= q.minHours && hours < q.maxHours; }) || MOTIVATIONAL_QUOTES[MOTIVATIONAL_QUOTES.length - 1]; }

  function calcSummary(all) {
    const totalMinutes = all.reduce(function (a, c) { return a + (c.minutes || 0); }, 0);
    const totalHours = minToHours(totalMinutes);
    const meta = goalHours();
    const progressPercent = Math.min(100, Number(((totalHours / meta) * 100).toFixed(2)));
    const remainingHours = Math.max(0, Number((meta - totalHours).toFixed(2)));
    const catTot = {};
    cats().forEach(function (c) { catTot[c] = 0; });
    all.forEach(function (l) { if (catTot[l.category] !== undefined) catTot[l.category] += l.minutes; });
    const categoryDistribution = cats().map(function (cat) {
      const mins = catTot[cat]; const hrs = minToHours(mins);
      const pct = totalMinutes > 0 ? Number(((mins / totalMinutes) * 100).toFixed(1)) : 0;
      return { category: cat, minutes: mins, hours: hrs, percentage: pct };
    });
    const subjectTotals = allSubjects().map(function (subject) {
      const sl = all.filter(function (l) { return l.subject === subject; });
      const mins = sl.reduce(function (a, l) { return a + l.minutes; }, 0);
      const hrs = minToHours(mins);
      const pct = totalMinutes > 0 ? Number(((mins / totalMinutes) * 100).toFixed(1)) : 0;
      return { subject: subject, minutes: mins, hours: hrs, percentage: pct, count: sl.length };
    });
    return { totalMinutes: totalMinutes, totalHours: totalHours, progressPercent: progressPercent, remainingHours: remainingHours, categoryDistribution: categoryDistribution, subjectTotals: subjectTotals };
  }

  /* ----------------------------- Persistência ----------------------------- */
  function normalizeLog(o, i) {
    if (!o) return null;
    const st = String(o.status || '').toLowerCase();
    return {
      id: o.id || ('log_' + Date.now() + '_' + i),
      date: String(o.date || getToday()).slice(0, 10),
      subject: o.subject || SUBJECTS_BASE[0],
      category: o.category || CATEGORIES[0],
      minutes: Math.max(0, parseInt(o.minutes, 10) || 0),
      topic: (o.topic || '').trim() || undefined,
      timestamp: Number(o.timestamp) || Date.now() - i * 1000,
      owner: String(o.owner || '').toLowerCase() === 'gabi' ? 'gabi' : 'matheus',
      status: st === 'deleted' || st === 'subject_deleted' ? st : '',
    };
  }
  function loadLogs() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (Array.isArray(p)) return p.map(normalizeLog).filter(Boolean);
      }
    } catch (_) {}
    return [];
  }
  function loadTheme() {
    try { const s = localStorage.getItem(THEME_KEY); if (s !== null) return s === 'true'; } catch (_) {}
    return true;
  }
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(logs)); } catch (_) {} }
  function applyTheme() { document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light'); try { localStorage.setItem(THEME_KEY, String(darkMode)); } catch (_) {} }

  function loadCachedInsights() {
    try {
      const s = localStorage.getItem(INSIGHT_KEY);
      if (!s) return { matheus: null, gabi: null };
      const p = JSON.parse(s);
      // Formato novo: { date, by: { matheus, gabi } }
      if (p && p.date === getToday() && p.by) {
        return { matheus: p.by.matheus || null, gabi: p.by.gabi || null };
      }
      // Formato antigo (só Matheus): { date, insight }
      if (p && p.date === getToday() && p.insight) {
        return { matheus: p.insight, gabi: null };
      }
    } catch (_) {}
    return { matheus: null, gabi: null };
  }
  function saveInsightCache() {
    try {
      localStorage.setItem(INSIGHT_KEY, JSON.stringify({ date: getToday(), by: insightByOwner }));
    } catch (_) {}
  }
  function getInsight() { return insightByOwner[profileId()] || null; }
  function setInsight(insight) {
    insightByOwner[profileId()] = insight;
    saveInsightCache();
  }

  // Ofensiva do Milagre da Manhã (só Gabi): datas YYYY-MM-DD em que ela fechou a rotina.
  function loadMilagreDays() {
    try {
      const s = localStorage.getItem(MILAGRE_KEY);
      if (!s) return [];
      const p = JSON.parse(s);
      if (!Array.isArray(p)) return [];
      return p.filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); });
    } catch (_) { return []; }
  }
  function persistMilagre() {
    try { localStorage.setItem(MILAGRE_KEY, JSON.stringify(milagreDays)); } catch (_) {}
  }
  function milagreSet() {
    const s = new Set(milagreDays);
    return s;
  }
  function milagreDoneToday() { return milagreSet().has(getToday()); }
  function milagreStreak() {
    const set = milagreSet();
    const chk = new Date(); chk.setHours(0, 0, 0, 0);
    // Se hoje ainda não fechou, a sequência conta a partir de ontem.
    if (!set.has(dateKey(chk))) chk.setDate(chk.getDate() - 1);
    let n = 0;
    while (set.has(dateKey(chk))) {
      n++;
      chk.setDate(chk.getDate() - 1);
    }
    return n;
  }
  // Congelada = sem sequência ativa (zerou ou nunca começou).
  function milagreFrozen() { return milagreStreak() === 0; }
  // Últimos 7 dias (do mais antigo ao mais recente = hoje).
  function milagreLastDays(n) {
    const set = milagreSet();
    const out = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const k = dateKey(d);
      out.push({
        key: k,
        label: MILAGRE_DOW[d.getDay()],
        day: d.getDate(),
        done: set.has(k),
        isToday: i === 0,
        isFuture: false,
      });
    }
    return out;
  }
  function markMilagreToday() {
    const t = getToday();
    if (milagreDays.indexOf(t) >= 0) return false;
    milagreDays = milagreDays.concat([t]).sort();
    persistMilagre();
    return true;
  }
  function unmarkMilagreToday() {
    const t = getToday();
    const next = milagreDays.filter(function (d) { return d !== t; });
    if (next.length === milagreDays.length) return false;
    milagreDays = next;
    persistMilagre();
    return true;
  }

  async function saveLogsToServer(all) {
    try {
      await fetch('/life/api/logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: all }),
      });
    } catch (_) { /* offline / Render efêmero: localStorage continua */ }
  }

  function setLogs(next) {
    logs = next;
    persist();
    saveLogsToServer(logs);
    render();
  }

  /* --------------------------- Aspirações (metas) -------------------------- */
  const METAS_KEY = 'life_metas_v1';

  function normalizeMeta(o) {
    if (!o || !String(o.title || '').trim()) return null;
    const steps = (Array.isArray(o.steps) ? o.steps : []).map(function (s) {
      return typeof s === 'string' ? { t: s, done: false } : { t: String((s && s.t) || ''), done: !!(s && s.done) };
    }).filter(function (s) { return s.t.trim(); });
    return {
      id: o.id || 'meta_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      owner: o.owner === 'gabi' ? 'gabi' : 'casal',
      who: WHO.some(function (w) { return w.id === o.who; }) ? o.who : 'nos',
      title: String(o.title).trim(),
      category: String(o.category || '').trim() || 'Vida',
      status: META_STATUS.some(function (x) { return x.id === o.status; }) ? o.status : 'planejado',
      target: /^\d{4}-\d{2}-\d{2}$/.test(String(o.target || '')) ? o.target : HORIZON_DATE,
      steps: steps,
      notes: String(o.notes || '').trim(),
      updated: Number(o.updated) || Date.now(),
    };
  }
  function loadMetas() {
    try {
      const raw = localStorage.getItem(METAS_KEY);
      const p = raw ? JSON.parse(raw) : [];
      return Array.isArray(p) ? p.map(normalizeMeta).filter(Boolean) : [];
    } catch (_) { return []; }
  }
  // Primeira semente da aba do casal, substituída pela linha do tempo datada.
  const METAS_OBSOLETAS = ['meta_seed_doutorado', 'meta_seed_filhos', 'meta_seed_financeiro'];
  function semObsoletas(list) {
    return (list || []).filter(function (m) { return METAS_OBSOLETAS.indexOf(m.id) < 0; });
  }
  let metas = semObsoletas(loadMetas());

  function persistMetas() { try { localStorage.setItem(METAS_KEY, JSON.stringify(metas)); } catch (_) {} }
  async function saveMetasToServer(all) {
    try {
      await fetch('/life/api/metas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metas: all }),
      });
    } catch (_) { /* offline: o localStorage segue como espelho */ }
  }
  function setMetas(next) {
    metas = next;
    persistMetas();
    saveMetasToServer(metas);
    render();
  }

  // O disco do Render volta ao estado do repositório a cada deploy. Unir o que
  // veio do servidor com o espelho local evita perder registros feitos entre
  // dois deploys — e reenvia o que faltar para reconstruir o arquivo.
  function mergeById(remote, local) {
    const map = new Map();
    (remote || []).forEach(function (x) { if (x && x.id) map.set(x.id, x); });
    (local || []).forEach(function (x) {
      if (!x || !x.id) return;
      const cur = map.get(x.id);
      if (!cur) { map.set(x.id, x); return; }
      const a = Number(x.updated || x.timestamp) || 0;
      const b = Number(cur.updated || cur.timestamp) || 0;
      if (a > b) map.set(x.id, x);
    });
    return Array.from(map.values());
  }

  /* ------------------------------ Mentor IA ------------------------------- */
  async function fetchServerInsight(all, totalHours) {
    const r = await fetch('/life/api/mentor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: profileId(),
        totalHours: totalHours,
        logs: all.slice(0, 8).map(function (l) {
          return { date: l.date, subject: l.subject, category: l.category, minutes: l.minutes, topic: logTopics(l).join(', ') };
        }),
      }),
    });
    if (!r.ok) throw new Error('proxy ' + r.status);
    const data = await r.json();
    if (!data || !data.tacticalAdvice) throw new Error('sem conteúdo');
    return { tacticalAdvice: data.tacticalAdvice, weekendAdvice: data.weekendAdvice, isCustomAI: true };
  }

  function generateLocalInsight(all, totalHours) {
    const now = new Date(); const dow = now.getDay();
    if (isGabi()) {
      const catTot = {};
      GABI_CATEGORIES.forEach(function (c) { catTot[c] = 0; });
      all.forEach(function (l) { if (catTot[l.category] !== undefined) catTot[l.category] += l.minutes; });
      const sorted = GABI_CATEGORIES.slice().sort(function (a, b) { return catTot[a] - catTot[b]; });
      const weak = sorted[0];
      const hojeMin = all.reduce(function (a, l) { return a + (l.date === getToday() ? l.minutes : 0); }, 0);
      const falta = Math.max(0, GABI_DIARIO * 60 - hojeMin);
      let advice;
      if (totalHours < 1) {
        advice = 'Comece pelo Capítulo 1: 90 minutos de leitura + 60 de escrita. O ritmo de ' + GABI_DIARIO + ' h/dia até abril de 2027 se constrói hoje, não amanhã.';
      } else if (falta > 0) {
        advice = 'Ainda faltam ' + formatHoursDec(falta / 60) + ' h para fechar as ' + GABI_DIARIO + ' h do dia. Priorize "' + weak + '" — é a frente com menos horas acumuladas — e registre tudo ao terminar.';
      } else {
        advice = 'Meta do dia cumprida. Se sobrar energia, avance 45 minutos em "' + weak + '" no capítulo que estiver aberto. Qualidade acima de volume.';
      }
      return { tacticalAdvice: advice, weekendAdvice: undefined, isCustomAI: false };
    }
    const lastStudied = {}; const totMin = {}; let theory = 0, questions = 0;
    allSubjects().forEach(function (s) { lastStudied[s] = 0; totMin[s] = 0; });
    all.forEach(function (l) {
      if (l.timestamp > (lastStudied[l.subject] || 0)) lastStudied[l.subject] = l.timestamp;
      totMin[l.subject] = (totMin[l.subject] || 0) + l.minutes;
      if (l.category === 'Teoria') theory += l.minutes;
      if (l.category === 'Questões') questions += l.minutes;
    });
    const sorted = Object.keys(lastStudied).map(function (k) { return [k, lastStudied[k]]; }).sort(function (a, b) { return a[1] - b[1]; });
    const neglected = sorted[0] ? sorted[0][0] : SUBJECTS_BASE[0];
    const negMin = totMin[neglected] || 0;
    let advice;
    if (negMin === 0) advice = 'Atenção à disciplina "' + neglected + '": você ainda não registrou nenhum minuto nela. Em TCU e agências reguladoras, matérias zeradas eliminam na nota de corte. Reserve um bloco de 45 a 60 minutos hoje para abrir a aula 00.';
    else if (theory > 0 && questions < theory * 0.4) advice = 'Alerta de desequilíbrio: ' + (theory / 60).toFixed(1) + 'h de Teoria e apenas ' + (questions / 60).toFixed(1) + 'h de Questões. Para cargos de Controle, a fixação real ocorre errando e corrigindo questões (Cebraspe/FGV). Programe hoje uma bateria de 30 questões!';
    else if (now.getTime() - (lastStudied[neglected] || 0) > 86400000 * 4) advice = 'Faz mais de 4 dias que você não revisa "' + neglected + '". A curva de esquecimento de Ebbinghaus começa a cobrar o preço. Faça uma revisão ativa de 30 minutos por mapas mentais ou lei seca.';
    else advice = 'Seu ciclo está fluindo com regularidade! Para elevar a nota de corte, foque na resolução comentada de questões e no aprofundamento das matérias de maior peso (AFO, Controle Externo e TI).';
    let weekend;
    if (dow === 5) weekend = 'Sexta-feira estratégica: encerre a carga teórica pesada e deixe tudo pronto para o sábado de simulado — prova escolhida, cronômetro e folha de respostas.';
    else if (dow === 6) weekend = 'Sábado de Simulados e Discursiva (3h a 4h): resolva uma prova antiga em tempo real e treine a redação de uma nota técnica ou parecer. Corrija no mesmo dia.';
    else if (dow === 0) weekend = 'Domingo é Recuperação: descanso absoluto do concurso (e da tese, se possível). Descansar também é parte do método — não registre nada hoje.';
    else weekend = undefined;
    return { tacticalAdvice: advice, weekendAdvice: weekend, isCustomAI: false };
  }

  // Só roda quando o usuário pede. O resultado fica em cache pelo resto do dia (por aba).
  async function loadInsight() {
    const mine = curLogs();
    const s = calcSummary(mine);
    ui.mentorLoading = true; ui.insightOpen = true; render();
    let result;
    try { result = await fetchServerInsight(mine, s.totalHours); }
    catch (_) { result = generateLocalInsight(mine, s.totalHours); }
    setInsight(result);
    ui.mentorLoading = false;
    render();
  }

  /* --------------------------- Frase do dia (CSV) -------------------------- */
  // Frases compartilhadas (Matheus e Gabi): public/life/frases.csv. Uma por dia, sem IA.
  let frases = [];
  const FRASE_PADRAO = {
    frase: 'O início exige disciplina bruta. Cada página lida hoje é o alicerce da sua vaga no Diário Oficial.',
    autor: 'Princípio do Auditor',
  };
  function fraseDoDia() {
    if (!frases.length) return FRASE_PADRAO;
    const p = getToday().split('-');
    const dias = Math.floor(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])) / 86400000);
    return frases[((dias % frases.length) + frases.length) % frases.length];
  }
  async function lerFrases(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return [];
      const rows = parseCSV(await r.text());
      if (!rows.length) return [];
      const head = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
      const iF = head.indexOf('frase'), iA = head.indexOf('autor');
      if (iF < 0) return [];
      return rows.slice(1)
        .filter(function (r2) { return r2[iF] && String(r2[iF]).trim(); })
        .map(function (r2) { return { frase: String(r2[iF]).trim(), autor: String(iA >= 0 ? r2[iA] || '' : '').trim() }; });
    } catch (_) { return []; /* segue com a frase padrão */ }
  }
  async function loadFrases() {
    frases = await lerFrases('/life/frases.csv');
  }

  /* ------------------------------ CSV backup ------------------------------ */
  function csvCell(v) { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  // Um arquivo só com tudo: horas, metas, milagre, insights e configs.
  const BACKUP_COLS = ['tipo', 'id', 'owner', 'who', 'date', 'subject', 'category', 'minutes', 'topic',
    'title', 'status', 'target', 'steps', 'notes', 'timestamp', 'updated'];
  const BACKUP_MARK = 'life-global-v1';

  function insightCacheDate() {
    try {
      const s = localStorage.getItem(INSIGHT_KEY);
      if (!s) return getToday();
      const p = JSON.parse(s);
      return (p && p.date) || getToday();
    } catch (_) { return getToday(); }
  }

  function exportCSV() {
    const lines = [BACKUP_COLS.join(',')];
    const linha = function (o) { lines.push(BACKUP_COLS.map(function (c) { return csvCell(o[c]); }).join(',')); };
    linha({ tipo: 'backup', id: BACKUP_MARK, date: getToday(), notes: BACKUP_MARK, timestamp: Date.now() });
    logs.forEach(function (l) {
      linha({ tipo: 'registro', id: l.id, owner: logOwner(l), date: l.date, subject: l.subject,
        category: l.category, minutes: l.minutes, topic: l.topic || '', timestamp: l.timestamp,
        status: logStatus(l) });
    });
    metas.forEach(function (m) {
      linha({ tipo: 'meta', id: m.id, owner: m.owner, who: m.who, category: m.category, title: m.title,
        status: m.status, target: m.target, steps: JSON.stringify(m.steps || []), notes: m.notes, updated: m.updated });
    });
    milagreDays.forEach(function (d) {
      linha({ tipo: 'milagre', id: 'mm_' + d, owner: 'gabi', date: d });
    });
    const iDate = insightCacheDate();
    ['matheus', 'gabi'].forEach(function (who) {
      const i = insightByOwner[who];
      if (!i || !i.tacticalAdvice) return;
      linha({
        tipo: 'insight', id: 'insight_' + who, owner: who, date: iDate,
        notes: JSON.stringify({
          tacticalAdvice: i.tacticalAdvice,
          weekendAdvice: i.weekendAdvice || '',
          isCustomAI: !!i.isCustomAI,
        }),
      });
    });
    linha({ tipo: 'config', id: 'theme', status: String(!!darkMode) });
    linha({ tipo: 'config', id: 'subjects', notes: JSON.stringify(extraSubjects || []) });
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'life-backup-' + getToday() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Backup global: ' + logs.length + ' registros · ' + metas.length + ' metas · ' + milagreDays.length + ' milagres');
  }
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else {
        if (ch === '"') q = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (ch === '\r') { /* ignore */ }
        else cell += ch;
      }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.length && r.some(function (c) { return c !== ''; }); });
  }
  function importText(text, name) {
    let rows = [];
    try {
      if (/\.json$/i.test(name) || text.trim().charAt(0) === '[') {
        rows = JSON.parse(text);
      } else {
        const parsed = parseCSV(text.replace(/^\ufeff/, ''));
        if (!parsed.length) throw new Error('vazio');
        const header = parsed[0].map(function (h) { return h.trim().toLowerCase(); });
        rows = parsed.slice(1).map(function (r) {
          const o = {}; header.forEach(function (h, idx) { o[h] = r[idx]; });
          return o;
        });
      }
    } catch (e) { toast('Arquivo inválido: ' + e.message, true); return; }

    const tipos = {};
    (rows || []).forEach(function (o) { tipos[String(o.tipo || 'registro')] = true; });
    const isGlobal = !!(tipos.backup || tipos.milagre || tipos.insight || tipos.config);

    // Backups antigos não têm a coluna "tipo": tudo ali é registro de horas.
    const novosLogs = (rows || []).filter(function (o) { return String(o.tipo || 'registro') === 'registro'; })
      .map(function (o, i) { return normalizeLog(o, i); })
      .filter(function (o) { return o && o.minutes > 0; });
    const novasMetas = (rows || []).filter(function (o) { return o.tipo === 'meta'; })
      .map(function (o) {
        let steps = [];
        try { const p = JSON.parse(o.steps || '[]'); if (Array.isArray(p)) steps = p; } catch (_) {}
        return normalizeMeta(Object.assign({}, o, { steps: steps }));
      }).filter(Boolean);
    const novosMilagres = (rows || []).filter(function (o) { return o.tipo === 'milagre'; })
      .map(function (o) { return String(o.date || '').slice(0, 10); })
      .filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); });
    const novosInsights = { matheus: null, gabi: null };
    let insightDate = getToday();
    (rows || []).filter(function (o) { return o.tipo === 'insight'; }).forEach(function (o) {
      const who = String(o.owner || '').toLowerCase() === 'gabi' ? 'gabi' : 'matheus';
      if (o.date) insightDate = String(o.date).slice(0, 10);
      try {
        const p = JSON.parse(o.notes || '{}');
        if (p && p.tacticalAdvice) {
          novosInsights[who] = {
            tacticalAdvice: String(p.tacticalAdvice),
            weekendAdvice: p.weekendAdvice ? String(p.weekendAdvice) : undefined,
            isCustomAI: !!p.isCustomAI,
          };
        }
      } catch (_) {}
    });
    let themeVal = null;
    let subjectsVal = null;
    (rows || []).filter(function (o) { return o.tipo === 'config'; }).forEach(function (o) {
      const id = String(o.id || '').toLowerCase();
      if (id === 'theme') themeVal = String(o.status) === 'true';
      if (id === 'subjects') {
        try {
          const p = JSON.parse(o.notes || '[]');
          if (Array.isArray(p)) subjectsVal = p.map(function (s) { return String(s || '').trim(); }).filter(Boolean);
        } catch (_) {}
      }
    });

    const hasAnything = novosLogs.length || novasMetas.length || novosMilagres.length ||
      novosInsights.matheus || novosInsights.gabi || themeVal !== null || subjectsVal !== null || isGlobal;
    if (!hasAnything) { toast('Nenhum dado válido encontrado no arquivo.', true); return; }

    const msg = isGlobal
      ? 'Restauro global: ' + novosLogs.length + ' registros, ' + novasMetas.length + ' metas, ' +
        novosMilagres.length + ' milagres' + (themeVal !== null ? ', tema' : '') +
        '. Substitui TODOS os dados atuais do /life. Continuar?'
      : 'Restaurar ' + novosLogs.length + ' registros e ' + novasMetas.length + ' metas? Isso substitui os dados atuais.';
    if (!window.confirm(msg)) return;

    if (isGlobal || novosLogs.length) {
      logs = novosLogs;
      persist();
      saveLogsToServer(logs);
    }
    if (isGlobal || novasMetas.length) {
      metas = novasMetas;
      persistMetas();
      saveMetasToServer(metas);
    }
    if (isGlobal || novosMilagres.length) {
      milagreDays = novosMilagres.slice().sort();
      persistMilagre();
    }
    if (novosInsights.matheus || novosInsights.gabi) {
      insightByOwner = {
        matheus: novosInsights.matheus || null,
        gabi: novosInsights.gabi || null,
      };
      try {
        localStorage.setItem(INSIGHT_KEY, JSON.stringify({ date: insightDate, by: insightByOwner }));
      } catch (_) {}
    } else if (isGlobal) {
      insightByOwner = { matheus: null, gabi: null };
      try { localStorage.removeItem(INSIGHT_KEY); } catch (_) {}
    }
    if (subjectsVal) {
      extraSubjects = subjectsVal;
      try { localStorage.setItem(EXTRA_KEY, JSON.stringify(extraSubjects)); } catch (_) {}
      absorbAliasSubjects();
    } else if (isGlobal) {
      extraSubjects = [];
      try { localStorage.removeItem(EXTRA_KEY); } catch (_) {}
    }
    if (themeVal !== null) {
      darkMode = themeVal;
      applyTheme();
    }
    render();
    toast(isGlobal
      ? 'Restauro global concluído.'
      : 'Backup restaurado: ' + novosLogs.length + ' registros e ' + novasMetas.length + ' metas.');
  }

  function backupButtons() {
    return '' +
      '<button class="cp-btn" data-action="download-csv" title="Baixar backup global em CSV">' + ic('download') + '<span>Baixar CSV</span></button>' +
      '<button class="cp-btn" data-action="restore" title="Restaurar backup global (CSV/JSON)">' + ic('upload') + '<span>Restaurar</span></button>';
  }

  /* -------------------------------- Toast --------------------------------- */
  let toastTimer = null;
  function toast(msg, isErr) {
    const el = document.getElementById('cp-toast');
    if (!el) return;
    el.textContent = msg; el.className = 'cp-toast' + (isErr ? ' err' : ''); el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* ------------------------------- Render --------------------------------- */
  const root = document.getElementById('cp-root');

  function snapFocus() {
    const el = document.activeElement;
    if (el && el.id && (el.type === 'text' || el.type === 'search' || el.tagName === 'TEXTAREA')) {
      let s = null, e = null; try { s = el.selectionStart; e = el.selectionEnd; } catch (_) {}
      return { id: el.id, s: s, e: e };
    }
    return null;
  }
  function restoreFocus(f) {
    if (!f) return; const el = document.getElementById(f.id);
    if (el) { el.focus(); if (f.s != null) { try { el.setSelectionRange(f.s, f.e); } catch (_) {} } }
  }

  function render() {
    const f = snapFocus();
    const tab = ui.tab;
    const isStudy = tab === 'matheus' || tab === 'gabi';
    const s = isStudy ? calcSummary(curLogs()) : null;
    const fabAction = isStudy
      ? { action: 'form-open', label: 'Registrar horas', open: ui.formOpen || !!ui.metaForm || !!ui.portal || ui.insightOpen || ui.milagreOpen }
      : { action: 'meta-new', label: 'Nova meta', open: !!ui.metaForm || !!ui.portal };
    root.innerHTML =
      renderHeader() +
      '<div class="cp-wrap">' +
      renderTabs() +
      (tab === 'matheus' ? renderStudyTab(s) : tab === 'gabi' ? renderGabiTab(s) : renderCoupleTab()) +
      renderFooter() +
      '</div>' +
      (fabAction && !fabAction.open ? '<button type="button" class="cp-fab" data-action="' + fabAction.action + '" title="' + fabAction.label + '" aria-label="' + fabAction.label + '">' + ic('plusSign') + '</button>' : '') +
      (isStudy ? renderForm(s) : '') +
      renderMetaForm() +
      renderVisionModal() +
      renderInsightModal() +
      renderMilagreModal();
    hideCalTip();
    document.body.classList.toggle('cp-modal-open', ui.formOpen || !!ui.metaForm || !!ui.portal || ui.insightOpen || ui.milagreOpen);
    restoreFocus(f);
    if (isStudy && ui.formOpen && !f && (ui.addingSubject || ui.renamingSubject)) {
      const first = document.getElementById(ui.renamingSubject ? 'cp-f-renamesubject' : 'cp-f-newsubject');
      if (first) first.focus();
    }
    if (ui.focusTopicOutroNext) {
      ui.focusTopicOutroNext = false;
      const outro = document.getElementById('cp-f-topic-outro');
      if (outro) outro.focus();
    }
    if (ui.metaForm && !f) {
      const first = document.getElementById('cp-m-title');
      if (first) first.focus();
    }
  }

  function renderStudyTab(s) {
    return '' +
      renderHeaderCard() +
      renderVisionLink() +
      section('sec-calendar', '<div class="cp-card cp-calcard">' + renderLifeCalendar() + '</div>') +
      section('sec-dashboard', renderDashboard(s)) +
      section('sec-category', renderCategory(s)) +
      section('sec-subject', renderSubject(s)) +
      section('sec-topics', renderTopics()) +
      section('sec-history', renderHistory());
  }

  function renderVisionLink() {
    if (!VISION[profileId()]) return '';
    const milagre = isGabi() ? renderMilagreBadge() : '';
    return '<div class="cp-portals' + (isGabi() ? ' with-mm' : '') + '">' +
      milagre +
      '<button type="button" class="cp-portal" data-action="portal-open" data-portal="vision">' +
        '<span class="cv-ico">' + ic('eye') + '</span>' +
        '<span class="cv-txt"><b>Visualização</b><i>O dia da chegada, no presente</i></span>' +
        '<span class="cv-go">' + ic('chevRight') + '</span>' +
      '</button>' +
      '<button type="button" class="cp-portal af" data-action="portal-open" data-portal="afirmacoes">' +
        '<span class="cv-ico">' + ic('checkCircle') + '</span>' +
        '<span class="cv-txt"><b>Afirmações</b><i>Verdades que eu escolho viver hoje</i></span>' +
        '<span class="cv-go">' + ic('chevRight') + '</span>' +
      '</button>' +
    '</div>';
  }

  function renderVisionModal() {
    const kind = ui.portal;
    const who = ui.portalWho || profileId();
    const pack = kind === 'afirmacoes' ? AFIRMACOES[who] : kind === 'vision' ? VISION[who] : null;
    if (!pack) return '';
    const isAf = kind === 'afirmacoes';
    const quem = who === 'gabi' ? 'Gabi' : who === 'matheus' ? 'Matheus' : '';
    const titulo = ui.tab === 'gatheus' && quem ? (quem + ' · ' + pack.titulo.replace(/^Minha /, '').replace(/^Minhas /, '')) : pack.titulo;
    return '<div class="cp-modal-backdrop">' +
      '<div class="cp-modal cp-vision-modal" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '">' +
        '<div class="cp-modal-head"><div class="cp-hgroup"><div class="cp-ico' + (isAf ? ' emerald' : '') + '">' + ic(isAf ? 'checkCircle' : 'eye') + '</div>' +
          '<div><h3>' + esc(titulo) + '</h3><p>' + esc(pack.resumo) + '</p></div></div>' +
          '<button type="button" class="cp-btn icon" data-action="portal-close" title="Fechar (Esc)">' + ic('close') + '</button></div>' +
        '<div class="cp-modal-body">' +
          '<div class="cv-list' + (isAf ? ' af' : '') + '">' + pack.itens.map(function (t, i) {
            return isAf
              ? '<p class="cv-item af"><span class="n">' + String(i + 1).padStart(2, '0') + '</span>' + esc(t) + '</p>'
              : '<p class="cv-item">' + esc(t) + '</p>';
          }).join('') + '</div>' +
          '<div class="cp-modal-foot">' +
            '<span class="cv-foot">' + ic('flag') + (isAf ? 'Leia em voz alta. Uma de cada vez.' : 'Leia inteiro antes de começar o dia.') + '</span>' +
            '<button type="button" class="cp-btn primary" data-action="portal-close">Fechar</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderTabs() {
    return '<nav class="cp-tabs" aria-label="Áreas">' +
      TABS.map(function (t) {
        const on = t.id === ui.tab;
        return '<button type="button" class="cp-tab' + (on ? ' active' : '') + '" data-action="tab" data-tab="' + t.id + '"' +
          (on ? ' aria-current="page"' : '') + '>' +
          ic(t.icon) + '<b>' + esc(t.label) + '</b>' +
        '</button>';
      }).join('') +
    '</nav>';
  }
  function section(id, html) { return '<section id="' + id + '">' + html + '</section>'; }
  function renderHeader() { return ''; }

  function renderHeaderCard() {
    return '' +
      '<header class="cp-header">' +
        '<div class="cp-brand">' +
          '<div class="cp-logo">' + ic('cap') + '</div>' +
          '<div>' +
            '<div class="cp-title-row"><h1>Rastreador de Horas de Estudo</h1>' +
              '<span class="cp-pill">' + ic('sparkles') + 'Controle &amp; Regulação</span>' +
            '</div>' +
            '<p class="cp-subtitle">TCU • CGU • Agências Reguladoras (ANATEL, ANVISA, ANAC...) • Área Administrativa</p>' +
            renderDayStrip() +
          '</div>' +
        '</div>' +
        '<div class="cp-header-actions">' +
          '<button class="cp-btn primary" data-action="form-open" title="Registrar estudo (novo registro)">' + ic('plusSign') + '<span>Registrar</span></button>' +
          backupButtons() +
          '<button class="cp-btn" data-action="theme-toggle" title="Alternar tema">' + ic(darkMode ? 'sun' : 'moon') + '<span>' + (darkMode ? 'Claro' : 'Escuro') + '</span></button>' +
        '</div>' +
      '</header>';
  }

  /* ---- Agenda do dia ---- */
  function hhmmToMin(s) { const p = String(s).split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function blocoAtivo(b, agora) {
    const ini = hhmmToMin(b.ini), fim = hhmmToMin(b.fim);
    // O último bloco cruza a meia-noite, então o intervalo é aberto nas pontas.
    return fim > ini ? (agora >= ini && agora < fim) : (agora >= ini || agora < fim);
  }
  // Faixa fina no cabeçalho: onde estou no dia e o que deveria estar fazendo.
  function renderDayStrip() {
    const DIA = 1440;
    const now = new Date();
    const dow = now.getDay();
    const agora = now.getHours() * 60 + now.getMinutes();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const rot = ROTINA[dow];
    const util = !rot;
    // 100% da barra = 24h do dia civil (00:00 → 24:00). A marca laranja acompanha o relógio.
    const marca = '<span class="ds-now" style="left:' + (agora / DIA * 100) + '%"></span>';

    // Quebra blocos que cruzam meia-noite em pedaços dentro do dia civil.
    const pedacos = [];
    AGENDA.forEach(function (b) {
      const ini = hhmmToMin(b.ini);
      const fim = hhmmToMin(b.fim);
      if (fim > ini) {
        pedacos.push({ ini: ini, fim: fim, b: b });
      } else {
        pedacos.push({ ini: ini, fim: DIA, b: b });
        if (fim > 0) pedacos.push({ ini: 0, fim: fim, b: b });
      }
    });
    pedacos.sort(function (a, b) { return a.ini - b.ini; });

    // Preenche o dia: fora do schedule fica sem cor; no schedule mantém as cores.
    const slots = [];
    let cursor = 0;
    pedacos.forEach(function (p) {
      if (p.ini > cursor) slots.push({ ini: cursor, fim: p.ini, b: null });
      slots.push(p);
      cursor = p.fim;
    });
    if (cursor < DIA) slots.push({ ini: cursor, fim: DIA, b: null });

    const segs = slots.map(function (p) {
      const w = (p.fim - p.ini) / DIA * 100;
      if (!p.b || p.b.tipo === 'livre') {
        return '<span class="ds-seg t-off" style="width:' + w + '%" title="' +
          minToHhmm(p.ini) + '–' + minToHhmm(p.fim) + (p.b ? ' · ' + esc(p.b.nome) : ' · fora da grade') + '"></span>';
      }
      const on = util && blocoAtivo(p.b, agora);
      const short = p.b.ciclo === 'Estudo matinal' ? 'Estudo'
        : p.b.ciclo === 'Questões / revisão' ? 'Questões'
        : (p.b.ciclo === 'Doutorado' || p.b.ciclo === 'Recuperação') ? p.b.ciclo : '';
      const label = short && (p.fim - p.ini) >= 50
        ? '<span class="ds-lab' + (on ? ' on' : '') + '">' + esc(short) + '</span>' : '';
      return '<span class="ds-seg t-' + p.b.tipo + (on ? ' on' : '') + (short ? ' named' : '') + '" style="width:' + w + '%"' +
        ' title="' + p.b.ini + '–' + p.b.fim + ' · ' + esc(p.b.nome) + '">' + label + '</span>';
    }).join('');

    const legend = '<div class="ds-legend">' + AGENDA.filter(function (b) { return b.tipo !== 'livre'; }).map(function (b) {
      const on = util && blocoAtivo(b, agora);
      return '<span class="ds-leg t-' + b.tipo + (on ? ' on' : '') + '">' +
        '<i></i><b>' + esc(b.ciclo) + '</b><em>' + b.ini + '–' + b.fim + '</em></span>';
    }).join('') + '</div>';

    let status;
    if (rot) {
      status = '<p class="ds-txt"><b>' + hhmm + '</b> · ' + (dow === 6 ? 'sábado' : 'domingo') + ': <b>' + esc(rot.nome) + '</b> · ' +
        esc(rot.meta) + ' — ' + esc(rot.desc) + '</p>' +
        '<p class="ds-hint">Grade de segunda a sexta na barra (24h)</p>';
    } else {
      const i = AGENDA.map(function (b) { return blocoAtivo(b, agora); }).indexOf(true);
      const atual = i >= 0 ? AGENDA[i] : null;
      const prox = i >= 0 ? AGENDA[(i + 1) % AGENDA.length] : null;
      status = '<p class="ds-txt"><b>' + hhmm + '</b>' +
        (atual ? ' · agora: <b>' + esc(atual.ciclo) + '</b> até ' + atual.fim : ' · fora da grade') +
        (prox ? ' <i>· depois: ' + esc(prox.ciclo) + '</i>' : '') +
      '</p>';
    }

    return '<div class="cp-daystrip' + (rot && rot.folga ? ' folga' : '') + (rot && !rot.folga ? ' fds' : '') + '">' +
      '<div class="ds-bar">' + segs + marca + '</div>' +
      legend +
      status +
    '</div>';
  }
  function minToHhmm(m) {
    const h = Math.floor(m / 60) % 24, min = m % 60;
    return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
  }

  /* ---- Dashboard ---- */
  function renderDashboard(s) {
    const q = getPhaseQuote(s.totalHours);
    const fillPct = Math.max(s.progressPercent > 0 ? 1 : 0, s.progressPercent);
    return '' +
      '<div class="cp-card" id="dashboard-motivacional">' +
        '<div class="cp-card-head">' +
          '<div class="cp-hgroup"><div class="cp-ico dark">' + ic('target') + '</div>' +
            '<div><h2>Meta da Aprovação • 3.000 Horas</h2>' +
            '<p>Padrão de referência para cargos de alta complexidade em Controle e Regulação</p></div>' +
          '</div>' +
          '<span class="cp-pill neutral">' + ic('compass') + esc(q.phase) + '</span>' +
        '</div>' +
        '<div class="cp-metrics">' +
          metric('Horas Acumuladas', formatHoursDec(s.totalHours), '/ ' + TOTAL_GOAL_HOURS.toLocaleString('pt-BR') + ' h', 'blue') +
          metric('Progresso Geral', s.progressPercent.toFixed(1) + '%', 'concluído', 'emerald') +
          metric('Restante para a Meta', formatHoursDec(s.remainingHours), 'horas', 'amber') +
        '</div>' +
        renderJourney(s, fillPct) +
        renderDailyQuote() +
      '</div>';
  }

  function renderDailyQuote() {
    const f = fraseDoDia();
    const has = !!getInsight();
    return '' +
      '<div class="cp-quote">' +
        '<div class="q-ico">' + ic('sparkles') + '</div>' +
        '<div class="q-main">' +
          '<span class="q-label">Combustível de hoje</span>' +
          '<p class="txt">"' + esc(f.frase) + '"</p>' +
          '<p class="aut">— ' + esc(f.autor) + '</p>' +
          '<button type="button" class="cp-btn ghost-blue" data-action="insight-open">' +
            ic('lightbulb') +
            '<span>' + (has ? 'Ver insight de hoje' : 'Gerar insight de hoje') + '</span>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function renderMilagreBadge() {
    const done = milagreDoneToday();
    const streak = milagreStreak();
    const frozen = milagreFrozen();
    const cls = 'mm-badge' + (frozen ? ' frozen' : (done ? ' hot' : ' warm'));
    const title = frozen
      ? 'Ofensiva congelada — toque para acender o Milagre da Manhã'
      : (done
        ? 'Ofensiva em chamas · ' + streak + ' dia' + (streak === 1 ? '' : 's')
        : 'Ofensiva viva · ' + streak + 'd — ainda falta marcar hoje');
    return '<button type="button" class="' + cls + '" data-action="milagre-open" title="' + esc(title) + '" aria-label="Ofensiva Milagre da Manhã">' +
      '<span class="mm-ico">' + ic(frozen ? 'snow' : 'flame') + '</span>' +
      '<span class="mm-txt">' +
        '<b class="mm-count">' + streak + '</b>' +
        '<span class="mm-tag">' + (frozen ? 'Congelada' : 'Ofensiva') + '</span>' +
        '<i class="mm-sub">Milagre da Manhã</i>' +
      '</span>' +
      '<span class="mm-go">' + ic('chevRight') + '</span>' +
    '</button>';
  }

  function renderMilagreWeek() {
    return '<div class="mm-week" aria-label="Últimos 7 dias">' +
      milagreLastDays(MILAGRE_WEEK).map(function (d) {
        const cls = 'mm-day' +
          (d.done ? ' lit' : ' ice') +
          (d.isToday ? ' today' : '') +
          (d.isToday && !d.done ? ' pending' : '');
        return '<div class="' + cls + '" title="' + formatDateBR(d.key) + (d.done ? ' · feito' : ' · gelo') + '">' +
          '<span class="mm-day-ico">' + ic(d.done ? 'flame' : 'snow') + '</span>' +
          '<span class="mm-day-l">' + d.label + '</span>' +
          '<span class="mm-day-n">' + d.day + '</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function renderMilagreModal() {
    if (!ui.milagreOpen || !isGabi()) return '';
    const done = milagreDoneToday();
    const streak = milagreStreak();
    const frozen = milagreFrozen();
    const body = done
      ? '<div class="mm-modal-hero done">' +
          '<div class="mm-big-ico">' + ic('flame') + '</div>' +
          '<p class="mm-headline">Defesa de hoje conquistada.</p>' +
          '<p class="mm-sub">A manhã é sua. Ofensiva em chamas — <b>' + streak + '</b> dia' + (streak === 1 ? '' : 's') + ' seguidos.</p>' +
        '</div>'
      : '<div class="mm-modal-hero' + (frozen ? ' iced' : '') + '">' +
          '<div class="mm-big-ico' + (frozen ? ' ice' : ' risk') + '">' + ic(frozen ? 'snow' : 'flame') + '</div>' +
          '<p class="mm-headline">' + (frozen ? 'Ofensiva congelada.' : 'Milagre da Manhã') + '</p>' +
          '<p class="mm-sub">' + (frozen
            ? 'O gelo venceu ontem. Hoje você derrete — uma manhã. Uma defesa. Zero desculpas.'
            : 'A chama ainda está viva. Falta só marcar o milagre de hoje para não congelar.') + '</p>' +
        '</div>';
    return '<div class="cp-modal-backdrop">' +
      '<div class="cp-modal mm-modal" role="dialog" aria-modal="true" aria-label="Milagre da Manhã">' +
        '<div class="cp-modal-head"><div class="cp-hgroup"><div class="cp-ico' + (frozen ? ' ice' : ' amber') + '">' + ic(frozen ? 'snow' : 'flame') + '</div>' +
          '<div><h3>Ofensiva · Milagre da Manhã</h3><p>' + (frozen ? 'Derreta o gelo. Recomece a sequência.' : streak + ' dia' + (streak === 1 ? '' : 's') + ' seguidos — não deixa apagar.') + '</p></div></div>' +
          '<button type="button" class="cp-btn icon" data-action="milagre-close" title="Fechar (Esc)">' + ic('close') + '</button></div>' +
        '<div class="cp-modal-body">' + body +
          renderMilagreWeek() +
          '<p class="mm-nudge">Últimos 7 dias · chama = feito · gelo = não fez</p>' +
          '<div class="cp-modal-foot">' +
            (done
              ? '<button type="button" class="cp-btn" data-action="milagre-undo">Desfazer hoje</button>' +
                '<button type="button" class="cp-btn primary" data-action="milagre-close">Fechar</button>'
              : '<button type="button" class="cp-btn" data-action="milagre-close">Agora não</button>' +
                '<button type="button" class="cp-btn primary mm-confirm" data-action="milagre-confirm">' +
                  ic('flame') + '<span>Fiz o Milagre de hoje</span></button>') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderInsightModal() {
    if (!ui.insightOpen) return '';
    const i = getInsight();
    let body;
    if (ui.mentorLoading) {
      body = '<div class="cp-mentor-loading">' + ic('refresh') + ' Lendo seus registros e montando o plano de hoje…</div>';
    } else if (!i) {
      body = '<div class="cp-mentor-loading">Nenhum insight ainda. Clique em gerar.</div>';
    } else {
      body = '<div class="cp-plan modal">' +
        '<div class="cp-plan-head">' + ic('lightbulb') + '<span>O que fazer hoje</span>' +
          (i.isCustomAI ? '<span class="cp-pill emerald">' + ic('sparkles') + 'IA DeepSeek</span>' : '<span class="cp-pill neutral">Análise local</span>') +
        '</div>' +
        '<p class="advice">' + esc(i.tacticalAdvice) + '</p>' +
        (i.weekendAdvice ? '<div class="weekend">' + ic('flag') + '<span>' + esc(i.weekendAdvice) + '</span></div>' : '') +
      '</div>';
    }
    return '<div class="cp-modal-backdrop">' +
      '<div class="cp-modal cp-insight-modal" role="dialog" aria-modal="true" aria-label="Insight de hoje">' +
        '<div class="cp-modal-head"><div class="cp-hgroup"><div class="cp-ico emerald">' + ic('lightbulb') + '</div>' +
          '<div><h3>Insight de hoje</h3><p>' + (isGabi() ? 'Direcionamento para a reta final do doutorado e do MBA' : 'Direcionamento tático para o concurso') + '</p></div></div>' +
          '<button type="button" class="cp-btn icon" data-action="insight-close" title="Fechar (Esc)">' + ic('close') + '</button></div>' +
        '<div class="cp-modal-body">' + body +
          '<div class="cp-modal-foot">' +
            '<button type="button" class="cp-btn" data-action="mentor-ask"' + (ui.mentorLoading ? ' disabled' : '') + '>' +
              ic(ui.mentorLoading ? 'refresh' : 'rotate') +
              '<span>' + (i ? 'Gerar outro' : 'Gerar agora') + '</span></button>' +
            '<button type="button" class="cp-btn primary" data-action="insight-close">Fechar</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function renderJourney(s, fillPct) {
    const h = s.totalHours;
    const pct = function (v) { return (v / TOTAL_GOAL_HOURS) * 100; };
    const phase = PHASES.find(function (p) { return h >= p.from && h < p.to; }) || PHASES[PHASES.length - 1];
    const next = MILESTONES.find(function (m) { return h < m.h; });

    const bands = PHASES.map(function (p) {
      const isNow = p.key === phase.key;
      return '<div class="cp-phase ' + p.key + (isNow ? ' now' : '') + '" style="flex:' + (p.to - p.from) + '">' +
        '<b>' + esc(p.name) + '</b>' +
        '<span>' + p.from.toLocaleString('pt-BR') + '–' + p.to.toLocaleString('pt-BR') + ' h</span>' +
      '</div>';
    }).join('');

    const ticks = MILESTONES.map(function (m) {
      return '<span class="cp-tick' + (h >= m.h ? ' done' : '') + '" style="left:' + pct(m.h) + '%"></span>';
    }).join('');

    const chips = MILESTONES.map(function (m) {
      const done = h >= m.h;
      const isNext = next && next.h === m.h;
      return '<div class="cp-mile' + (done ? ' done' : '') + (isNext ? ' next' : '') + '" title="' + esc(m.note) + '">' +
        '<span class="mk">' + (done ? ic('check') : (isNext ? ic('target') : '')) + '</span>' +
        '<span class="mt"><span class="mh">' + m.label + '</span>' +
        '<span class="mn">' + esc(m.note) + '</span></span>' +
      '</div>';
    }).join('');

    const nextLine = next
      ? 'Próximo marco: <b>' + next.label + '</b> — faltam ' + formatHoursDec(Math.max(0, next.h - h)) + ' h · ' + esc(next.note)
      : 'Todos os marcos conquistados. Meta das 3.000h atingida!';

    return '' +
      '<div class="cp-journey">' +
        '<div class="cp-progress-head">' +
          '<span class="l" style="display:inline-flex;align-items:center;gap:6px">' + ic('trending') + ' Jornada até a Nomeação</span>' +
          '<span class="r">' + formatHoursDec(h) + ' h de 3.000 h (' + s.progressPercent.toFixed(2) + '%)</span>' +
        '</div>' +
        '<div class="cp-phases">' + bands + '</div>' +
        '<div class="cp-track" data-action="miles-toggle" title="Clique para ver os marcos" role="button" tabindex="0" aria-expanded="' + (ui.milesOpen ? 'true' : 'false') + '">' +
          ticks + '<div class="fill" style="width:' + fillPct + '%"></div>' +
          '<span class="cp-track-hint">' + (ui.milesOpen ? 'ocultar marcos' : 'ver marcos') + '</span>' +
        '</div>' +
        '<div class="cp-phase-now">' + ic('compass') + '<span>Fase atual: <b>' + esc(phase.name) + '</b> — ' + esc(phase.desc) + '</span></div>' +
        '<div class="cp-next">' + ic('flag') + '<span>' + nextLine + '</span></div>' +
        (ui.milesOpen ? '<div class="cp-miles">' + chips + '</div>' : '') +
      '</div>';
  }

  function metric(lbl, num, unit, color) {
    return '<div class="cp-metric"><span class="lbl">' + lbl + '</span>' +
      '<div class="val"><span class="num ' + color + '">' + num + '</span><span class="unit">' + unit + '</span></div></div>';
  }

  function renderLifeCalendar() {
    const map = dayMap();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endDate = isGabi() ? GABI_CAL_END : TARGET_DATE;
    const target = new Date(endDate + 'T00:00:00');
    const start = new Date(START_DATE + 'T00:00:00');
    const daysRemaining = Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
    const totalDays = Math.round((target.getTime() - start.getTime()) / 86400000) + 1;
    const totalDaysStudied = map.size;
    // Streak: domingo é folga programada e não quebra a sequência (só no Matheus).
    let streak = 0; const chk = new Date(today);
    while (chk >= start) {
      const k = dateKey(chk);
      if (map.has(k)) streak++;
      else if (rotina(chk.getDay()) && rotina(chk.getDay()).folga) { /* folga, segue */ }
      else if (streak === 0 && chk.getTime() === today.getTime()) { /* o dia ainda não acabou */ }
      else break;
      chk.setDate(chk.getDate() - 1);
    }
    // Grid: da largada (21/09/2026) até a meta, tudo de uma vez.
    let cells = '';
    const cur = new Date(start);
    while (cur <= target) {
      const k = dateKey(cur);
      const isToday = cur.getTime() === today.getTime();
      const isFuture = cur > today;
      const rot = rotina(cur.getDay());
      const info = map.get(k);
      let cls = 'cp-cell';
      if (info && info.minutes > 0) {
        cls += info.minutes < 60 ? ' l1' : info.minutes < 120 ? ' l2' : info.minutes < 240 ? ' l3' : ' l4';
      } else if (isFuture) {
        cls += ' future';
      } else if (rot && rot.folga) {
        cls += ' rest';
      } else {
        cls += ' missed';
      }
      if (isToday) cls += ' today';
      cells += '<div class="' + cls + '" data-date="' + k + '"></div>';
      cur.setDate(cur.getDate() + 1);
    }
    const inicio = today < start ? 'largada ' + formatDateBR(START_DATE) : formatDateBR(START_DATE);
    const soft = isGabi()
      ? '• ' + inicio + ' → ' + formatDateBR(endDate) + ' · doutorado & MBA'
      : '• ' + inicio + ' → ' + formatDateBR(endDate);
    return '' +
      '<div class="cp-lifecal" id="study-calendar">' +
        '<div class="cp-lifecal-head">' +
          '<h4>' + ic('calendar') + '<span>Study Calendar</span><span class="soft">' + soft + '</span></h4>' +
          '<div class="cp-lifecal-stats">' +
            '<span class="stat">' + ic('target') + '<b>' + daysRemaining + ' dias</b> restantes</span>' +
            '<span class="stat em">' + ic('sparkles') + 'Ativos: <b>' + totalDaysStudied + '</b></span>' +
            (streak > 0 ? '<span class="cp-streak">' + ic('flame') + streak + 'd seguidos</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="cp-cal-grid" id="cp-cal-grid" aria-label="' + totalDays + ' dias até a meta">' + cells + '</div>' +
        '<div class="cp-cal-legend">' +
          '<span class="lg"><span class="sq today-mark"></span>Hoje</span>' +
          (isGabi() ? '' : '<span class="lg"><span class="sq rest"></span>Domingo (folga)</span>') +
          '<span class="lg">Menos <span class="sq"></span><span class="sq l1"></span><span class="sq l2"></span><span class="sq l3"></span><span class="sq l4"></span> Mais horas</span>' +
        '</div>' +
      '</div>';
  }

  /* ---- Tooltip do Study Calendar ---- */
  function dayMap() {
    const map = new Map();
    curLogs().forEach(function (l) {
      const e = map.get(l.date) || { minutes: 0, count: 0, items: [] };
      e.minutes += l.minutes; e.count += 1; e.items.push(l);
      map.set(l.date, e);
    });
    return map;
  }

  let calTip = null;
  function ensureCalTip() {
    if (!calTip) {
      calTip = document.createElement('div');
      calTip.className = 'cp-caltip';
      calTip.hidden = true;
      document.body.appendChild(calTip);
    }
    return calTip;
  }
  function hideCalTip() { if (calTip) calTip.hidden = true; }
  function calTipHtml(k) {
    const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const parts = k.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const info = dayMap().get(k);
    const rot = rotina(d.getDay());
    const head = '<div class="ct-head"><b>' + formatDateBR(k) + '</b><span>' + WD[d.getDay()] + '</span></div>' +
      (rot ? '<div class="ct-rot' + (rot.folga ? ' folga' : '') + '"><b>' + esc(rot.nome) + '</b>' +
        '<span>' + esc(rot.meta) + '</span><p>' + esc(rot.desc) + '</p></div>' : '');
    if (!info) {
      const msg = rot && rot.folga
        ? 'Folga programada: nada a registrar.'
        : (d > today ? 'Dia ainda por vir — planeje uma sessão.' : 'Nenhum estudo registrado neste dia.');
      return head + '<div class="ct-empty">' + msg + '</div>';
    }
    const rows = info.items.slice().sort(function (a, b) { return b.minutes - a.minutes; }).map(function (l) {
      const color = catColor(l.category);
      return '<div class="ct-row">' +
        '<span class="ct-dot" style="background:' + color + '"></span>' +
        '<div class="ct-txt"><span class="ct-sub">' + esc(l.subject) + '</span>' +
        (logTopics(l).length ? '<span class="ct-top">' + esc(logTopics(l).join(', ')) + '</span>' : '') + '</div>' +
        '<span class="ct-min">' + l.minutes + 'm</span>' +
      '</div>';
    }).join('');
    return head +
      '<div class="ct-total"><b>' + formatHoursDec(info.minutes / 60) + 'h</b> · ' + info.minutes + ' min · ' + info.count + ' sessão(ões)</div>' +
      '<div class="ct-rows">' + rows + '</div>';
  }
  function showCalTip(cell, ev) {
    const k = cell.getAttribute('data-date');
    if (!k) return;
    const tip = ensureCalTip();
    tip.innerHTML = calTipHtml(k);
    tip.hidden = false;
    moveCalTip(ev);
  }
  function moveCalTip(ev) {
    if (!calTip || calTip.hidden) return;
    const pad = 10;
    const r = calTip.getBoundingClientRect();
    let x = ev.clientX + 14;
    let y = ev.clientY + 18;
    if (x + r.width + pad > window.innerWidth) x = ev.clientX - r.width - 14;
    if (y + r.height + pad > window.innerHeight) y = ev.clientY - r.height - 18;
    calTip.style.left = Math.max(pad, x) + 'px';
    calTip.style.top = Math.max(pad, y) + 'px';
  }

  /* ---- Form ---- */
  function applyMinutes(mins) {
    const next = clampMinutes(mins);
    form.minutes = String(next);
    const hidden = document.getElementById('cp-f-minutes');
    const face = document.getElementById('cp-minutes-face');
    const typed = document.getElementById('cp-f-minutes-edit');
    if (hidden) hidden.value = form.minutes;
    if (face) face.textContent = formatDurationLong(next);
    if (typed) typed.value = form.minutes;
    return next;
  }
  function paintDurationField() {
    const wrap = document.getElementById('cp-dur');
    if (!wrap) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = renderDurationField(clampMinutes(form.minutes));
    const next = tmp.firstChild;
    if (next) wrap.replaceWith(next);
  }
  function renderDurationField(numeric) {
    const edit = form.minutesEdit;
    return '<div class="cp-dur" id="cp-dur">' +
      '<input id="cp-f-minutes" type="hidden" value="' + esc(form.minutes) + '" required>' +
      (edit
        ? '<div class="cp-dur-edit">' +
            '<input id="cp-f-minutes-edit" class="cp-input mono" type="number" min="1" max="1440" step="1" value="' + esc(form.minutes) + '" inputmode="numeric">' +
            '<button type="button" class="cp-btn" data-action="minutes-lock">Pronto</button>' +
          '</div>'
        : '<div class="cp-dur-face" aria-live="polite">' +
            '<span id="cp-minutes-face" class="cp-dur-value">' + esc(formatDurationLong(numeric)) + '</span>' +
            '<button type="button" class="cp-btn" data-action="minutes-unlock" title="Digitar um valor específico">Editar</button>' +
          '</div>') +
      '<div class="cp-chips cp-dur-chips">' +
        '<button type="button" class="cp-chip sub" data-action="chip-delta" data-delta="-60">−1 hr</button>' +
        '<button type="button" class="cp-chip sub" data-action="chip-delta" data-delta="-30">−30 min</button>' +
        '<button type="button" class="cp-chip sub" data-action="chip-delta" data-delta="-15">−15 min</button>' +
        '<button type="button" class="cp-chip add" data-action="chip-delta" data-delta="15">+15 min</button>' +
        '<button type="button" class="cp-chip add" data-action="chip-delta" data-delta="30">+30 min</button>' +
        '<button type="button" class="cp-chip add" data-action="chip-delta" data-delta="60">+1 hr</button>' +
      '</div>' +
    '</div>';
  }
  function topicCheckRow(t, depth) {
    const checked = form.topics.indexOf(t) >= 0;
    const pad = depth ? ' style="margin-left:' + (depth * 16) + 'px"' : '';
    return '<button type="button" class="cp-topic-check' + (checked ? ' on' : '') + '"' + pad +
      ' data-action="topic-toggle" data-topic="' + esc(t) + '">' +
      ic(checked ? 'checkCircle' : 'circle') + '<span>' + esc(t) + '</span></button>';
  }
  function renderTopicField() {
    if (isGabi()) {
      return '<input id="cp-f-topic" class="cp-input" type="text" value="' + esc(form.topic) + '" placeholder="Ex: limpeza da base, revisão da literatura, seção de resultados...">';
    }
    const bank = editalTopics(form.subject);
    const catalog = catalogTopicsFor(form.subject);
    const bankHtml = bank.map(function (t) {
      const depth = (topicCode(t).match(/\./g) || []).length;
      return topicCheckRow(t, depth);
    }).join('');
    const catalogHtml = catalog.length
      ? '<div class="cp-topic-divider">Outros já usados nesta matéria</div>' + catalog.map(function (t) { return topicCheckRow(t, 0); }).join('')
      : '';
    const emptyHint = (!bank.length && !catalog.length)
      ? '<p class="cp-empty-topic">Sem tópicos ainda. Use "Outro" abaixo para começar o catálogo desta matéria.</p>'
      : '';
    const outro = '<div class="cp-topic-outro">' +
      (ui.topicOutroOpen
        ? '<input id="cp-f-topic-outro" class="cp-input" type="text" value="' + esc(form.topicOutro) + '" placeholder="Outro tópico (separe por vírgula para vários)">' +
          '<button type="button" class="cp-linkbtn" data-action="topic-outro-toggle">fechar</button>'
        : '<button type="button" class="cp-linkbtn" data-action="topic-outro-toggle">+ outro (personalizado)</button>') +
      '</div>';
    return '<div id="cp-topic-wrap">' +
      '<div class="cp-topic-tools">' +
        '<button type="button" class="cp-linkbtn" data-action="topic-all">selecionar tudo</button>' +
        '<button type="button" class="cp-linkbtn" data-action="topic-none">limpar todos</button>' +
      '</div>' +
      '<div class="cp-topic-checklist">' + bankHtml + catalogHtml + emptyHint + '</div>' + outro +
    '</div>';
  }
  function renderForm(s) {
    const numeric = clampMinutes(form.minutes);
    if (!ui.formOpen) return '';
    return '' +
      '<div class="cp-modal-backdrop">' +
      '<div class="cp-modal" id="formulario-registro-estudo" role="dialog" aria-modal="true" aria-label="Registrar estudo">' +
        '<div class="cp-modal-head"><div class="cp-hgroup"><div class="cp-ico">' + ic(form.editId ? 'pencil' : 'plus') + '</div>' +
          '<div><h3>' + (form.editId ? 'Editar Registro' : (isGabi() ? 'Registrar Horas' : 'Registrar Estudo')) + '</h3>' +
          '<p>' + (isGabi() ? 'Horas do dia em cada capítulo e tipo de atividade' : 'Sessão com tempo e os tópicos do edital estudados') + '</p></div></div>' +
          '<button type="button" class="cp-btn icon" data-action="form-close" title="Fechar (Esc)">' + ic('close') + '</button></div>' +
        '<form data-action="add-log" class="cp-modal-body">' +
          '<div class="cp-grid-4">' +
            field('Data', ic('calendar'), '<input id="cp-f-date" class="cp-input" type="date" value="' + esc(form.date) + '" required>') +
            subjectField() +
            field(isGabi() ? 'Atividade' : 'Tipo de Estudo', ic('layers'), '<select id="cp-f-category" class="cp-select">' + cats().map(function (x) { return '<option' + (x === form.category ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>') +
            field('Tempo', ic('clock'), renderDurationField(numeric)) +
          '</div>' +
          '<div class="cp-form-row2 cp-field">' +
            '<label class="cp-label"><span class="l">' + ic('tag') + (isGabi() ? 'Tópico / Assunto' : 'Tópicos do edital') + '</span>' +
            '<span style="color:var(--faint);font-weight:500">' + (isGabi() ? 'O que exatamente foi feito' : 'Marque 1+ · o tempo se divide entre eles') + '</span></label>' +
            renderTopicField() +
          '</div>' +
          rotinaHint(form.date) +
          '<div class="cp-shortcuts">' +
            '<span></span>' +
            '<button type="submit" class="cp-btn primary" style="padding:11px 22px">' + ic(form.editId ? 'check' : 'plus') + '<span>' + (form.editId ? 'Salvar alterações' : (isGabi() ? 'Registrar Horas' : 'Registrar Estudo')) + '</span></button>' +
          '</div>' +
        '</form>' +
      '</div>' +
      '</div>';
  }
  function field(label, icon, control) {
    return '<div class="cp-field"><label class="cp-label"><span class="l">' + icon + label + '</span></label>' + control + '</div>';
  }
  function rotinaHint(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const rot = rotina(d.getDay());
    if (!rot) return '';
    return '<div class="cp-rotina' + (rot.folga ? ' folga' : '') + '">' + ic(rot.folga ? 'sparkles' : 'fileCheck') +
      '<span><b>' + esc(rot.nome) + '</b> · ' + esc(rot.meta) + ' — ' + esc(rot.desc) + '</span></div>';
  }
  function fieldCalc(label, icon, extra, control) {
    return '<div class="cp-field"><label class="cp-label"><span class="l">' + icon + label + '</span>' + extra + '</label>' + control + '</div>';
  }
  function subjectField() {
    if (ui.addingSubject) {
      return '<div class="cp-field">' +
        '<label class="cp-label"><span class="l">' + ic('book') + 'Nova matéria</span></label>' +
        '<div class="cp-subject-new">' +
          '<input id="cp-f-newsubject" class="cp-input" type="text" placeholder="Ex: Inglês (acento opcional)" maxlength="60" value="' + esc(ui.newSubject) + '" lang="pt-BR" spellcheck="false">' +
          '<button type="button" class="cp-btn primary" data-action="subject-add">Adicionar</button>' +
          '<button type="button" class="cp-btn icon" data-action="subject-cancel" title="Cancelar">' + ic('close') + '</button>' +
        '</div>' +
      '</div>';
    }
    if (ui.renamingSubject) {
      return '<div class="cp-field">' +
        '<label class="cp-label"><span class="l">' + ic('book') + 'Renomear matéria</span></label>' +
        '<div class="cp-subject-new">' +
          '<input id="cp-f-renamesubject" class="cp-input" type="text" maxlength="60" value="' + esc(ui.newSubject) + '">' +
          '<button type="button" class="cp-btn primary" data-action="subject-rename-save">Salvar</button>' +
          '<button type="button" class="cp-btn icon" data-action="subject-cancel" title="Cancelar">' + ic('close') + '</button>' +
        '</div>' +
      '</div>';
    }
    const optsList = catalogSubjects().slice();
    if (form.subject) pushUnique(optsList, form.subject);
    const opts = optsList.map(function (x) {
      return '<option' + (x === form.subject ? ' selected' : '') + '>' + esc(x) + '</option>';
    }).join('');
    const custom = isCustomSubject(form.subject);
    const links = isGabi() ? '' : (
      '<span class="cp-subj-links">' +
        '<button type="button" class="cp-linkbtn" data-action="subject-new">+ nova</button>' +
        (custom ? '<button type="button" class="cp-linkbtn" data-action="subject-rename">editar</button>' +
          '<button type="button" class="cp-linkbtn danger" data-action="subject-del-ask">remover</button>' : '') +
      '</span>'
    );
    const confirm = ui.confirmSubject
      ? '<div class="cp-subj-confirm"><span>Sai da lista. O histórico permanece.</span>' +
          '<button type="button" class="cp-btn" style="padding:4px 10px;color:var(--red);border-color:var(--red)" data-action="subject-del-confirm">Remover</button>' +
          '<button type="button" class="cp-btn" style="padding:4px 10px" data-action="subject-del-cancel">Cancelar</button></div>'
      : '';
    return '<div class="cp-field">' +
      '<label class="cp-label"><span class="l">' + ic('book') + (isGabi() ? 'Frente de trabalho' : 'Matéria (Edital Base)') + '</span>' +
        links + '</label>' +
      '<select id="cp-f-subject" class="cp-select">' + opts + '</select>' +
      confirm +
    '</div>';
  }

  /* ---- Topics breakdown ---- */
  function renderTopics() {
    let groups = allSubjects().map(function (subj) {
      const topics = topicStatsFor(subj);
      if (!editalTopics(subj).length) topics.sort(function (a, b) { return b.totalMinutes - a.totalMinutes; });
      return { subject: subj, topics: topics, totalMinutes: topics.reduce(function (a, t) { return a + t.totalMinutes; }, 0), uniqueTopicsCount: topics.filter(function (t) { return t.topicName !== 'Estudo Geral / Não especificado' && t.sessionsCount > 0; }).length };
    });
    const term = ui.search.trim().toLowerCase();
    if (term) {
      groups = groups.map(function (g) {
        if (g.subject.toLowerCase().includes(term)) return g;
        const mt = g.topics.filter(function (t) { return t.topicName.toLowerCase().includes(term); });
        return mt.length ? Object.assign({}, g, { topics: mt }) : null;
      }).filter(Boolean);
    }
    const catalogued = new Set(); curLogs().forEach(function (l) { logTopics(l).forEach(function (t) { if (t) catalogued.add(t); }); });
    const acc = groups.map(function (g) {
      const open = ui.expanded === g.subject || (term !== '' && g.topics.length > 0);
      const body = g.topics.length === 0
        ? '<p class="cp-empty-topic">Nenhum tópico registrado ainda ' + (isGabi() ? 'nesta frente' : 'para esta disciplina') + '.</p>'
        : g.topics.map(function (t) {
            const empty = !t.sessionsCount;
            const code = topicCode(t.topicName);
            const child = (code.match(/\./g) || []).length > 0;
            const days = t.sessionsCount ? daysSince(t.lastDate) : null;
            const stale = days !== null && days >= 120;
            const mins = Math.round(t.totalMinutes);
            return '<div class="cp-topic' + (empty ? ' empty' : '') + (child ? ' child' : '') + (stale ? ' stale' : '') + '"><div><span class="name">' + esc(t.topicName) + '</span>' +
              '<div class="info">' +
              (t.lastDate ? '<span>' + ic('calendar') + 'Último: ' + formatDateBR(t.lastDate) + '</span>' : '<span>Ainda sem registro</span>') +
              (t.categories.size ? '<span>' + ic('layers') + esc(Array.from(t.categories).join(', ')) + '</span>' : '') +
              (stale ? '<span class="cp-stale-tag">' + ic('alert') + 'Revisar · ' + Math.floor(days / 30) + ' meses sem estudar</span>' : '') +
              '</div></div>' +
              '<div class="right"><span class="sess">' + t.sessionsCount + ' sessão(ões)</span>' +
              '<span class="dur">' + ic('clock') + mins + 'm (' + formatHoursDec(mins / 60) + 'h)</span></div></div>';
          }).join('');
      return '<div class="cp-acc-item">' +
        '<button type="button" class="cp-acc-head" data-action="acc-toggle" data-subject="' + esc(g.subject) + '">' +
          '<span class="l"><span class="dot' + (g.topics.length ? '' : ' off') + '"></span>' +
          '<span><h4>' + esc(g.subject) + '</h4><span class="sub">' + g.uniqueTopicsCount + ' tópico(s) • ' + formatHoursDec(g.totalMinutes / 60) + 'h total</span></span></span>' +
          '<span class="r"><span class="count">' + g.topics.length + ' registros</span><span class="chev">' + ic(open ? 'chevUp' : 'chevDown') + '</span></span>' +
        '</button>' +
        (open ? '<div class="cp-acc-body">' + body + '</div>' : '') +
      '</div>';
    }).join('');
    return '' +
      '<div class="cp-card" id="secao-topicos-destrinchados">' +
        '<button type="button" class="cp-card-head cp-card-toggle" data-action="topics-toggle" aria-expanded="' + (ui.topicsOpen ? 'true' : 'false') + '">' +
          '<div class="cp-hgroup"><div class="cp-ico indigo">' + ic('tag') + '</div>' +
            '<div><h3>Tópicos Destrinchados <span class="cp-pill" style="text-transform:none;letter-spacing:0">' + catalogued.size + ' catalogados</span></h3>' +
            '<p>' + (isGabi() ? 'O que exatamente foi trabalhado em cada capítulo' : 'Controle interno dos assuntos e pontos de edital estudados por matéria') + '</p></div></div>' +
          '<span class="cp-toggle-chev">' + ic(ui.topicsOpen ? 'chevUp' : 'chevDown') + '</span>' +
        '</button>' +
        (ui.topicsOpen
          ? '<div class="cp-card-body">' +
              '<div class="cp-search" style="margin-bottom:14px">' + ic('search') + '<input id="cp-search-input" type="text" placeholder="Filtrar assunto ou lei..." value="' + esc(ui.search) + '"></div>' +
              '<div class="cp-acc">' + (acc || '<p class="cp-empty-topic">Nenhum resultado para o filtro.</p>') + '</div>' +
            '</div>'
          : '') +
      '</div>';
  }

  /* ---- Category distribution ---- */
  function pieSlices(d) {
    // Conic-gradient: cada fatia em % acumulada. Sem dados → terços iguais nas cores.
    if (!d.length || d.every(function (it) { return it.minutes <= 0; })) {
      const n = Math.max(1, d.length);
      const step = 100 / n;
      return 'conic-gradient(' + d.map(function (it, i) {
        return catColor(it.category) + ' ' + (i * step) + '% ' + ((i + 1) * step) + '%';
      }).join(', ') + ')';
    }
    let acc = 0;
    const parts = d.filter(function (it) { return it.percentage > 0; }).map(function (it) {
      const a = acc;
      acc += it.percentage;
      return catColor(it.category) + ' ' + a + '% ' + acc + '%';
    });
    return 'conic-gradient(' + parts.join(', ') + ')';
  }
  function renderCategory(s) {
    const d = s.categoryDistribution;
    const gabi = isGabi();
    const items = d.map(function (it) {
      return '<div class="gp-pie-item">' +
        '<span class="dot" style="background:' + catColor(it.category) + '"></span>' +
        '<div class="txt">' +
          '<b>' + esc(it.category) + '</b>' +
          '<span>' + formatHoursDec(it.hours) + ' h · ' + formatMinHuman(it.minutes) + '</span>' +
        '</div>' +
        '<em>' + it.percentage + '%</em>' +
      '</div>';
    }).join('');
    return '' +
      '<div class="cp-card" id="distribuicao-categorias">' +
        '<div class="cp-card-head"><div class="cp-hgroup"><div class="cp-ico indigo">' + ic('pie') + '</div>' +
          '<div><h3>Distribuição por ' + (gabi ? 'Atividade' : 'Categoria') + '</h3><p>' +
          (gabi ? 'Equilíbrio entre análise de dados, leitura e escrita' : 'Equilíbrio entre teoria, questões, revisão ativa e simulados') +
          '</p></div></div>' +
          '<span class="cp-head-note">Total: ' + formatMinHuman(s.totalMinutes) + '</span></div>' +
        '<div class="gp-pie">' +
          '<div class="gp-pie-chart' + (s.totalMinutes === 0 ? ' empty' : '') + '" style="background:' + pieSlices(d) + '" aria-hidden="true"><i></i></div>' +
          '<div class="gp-pie-side">' + items + '</div>' +
        '</div>' +
      '</div>';
  }

  /* ---- Subject summary ---- */
  function renderSubject(s) {
    const totals = s.subjectTotals.slice().sort(function (a, b) {
      if (ui.subjSort === 'hours' && b.minutes !== a.minutes) return b.minutes - a.minutes;
      return a.subject.localeCompare(b.subject);
    });
    const maxMin = Math.max.apply(null, s.subjectTotals.map(function (x) { return x.minutes; }).concat([1]));
    let bodyHtml;
    if (ui.subjView === 'cards') {
      bodyHtml = '<div class="cp-subj-cards">' + totals.map(function (it) {
        const rel = s.totalMinutes > 0 ? (it.minutes / maxMin) * 100 : 0;
        const open = (ui.subjOpen || []).indexOf(it.subject) >= 0;
        const rows = topicStatsFor(it.subject);
        const studied = rows.filter(function (t) { return t.sessionsCount > 0 && t.topicName !== 'Estudo Geral / Não especificado'; });
        const emptyN = rows.filter(function (t) { return !t.sessionsCount; }).length;
        const topicLine = function (t) {
          const mins = Math.round(t.totalMinutes);
          const days = t.sessionsCount ? daysSince(t.lastDate) : null;
          const stale = days !== null && days >= 120;
          const child = (topicCode(t.topicName).match(/\./g) || []).length > 0;
          return '<div class="cp-subj-t' + (child ? ' child' : '') + (stale ? ' stale' : '') + (!t.sessionsCount ? ' empty' : '') + '">' +
            '<span>' + esc(t.topicName) + '</span>' +
            '<b>' + (t.sessionsCount ? formatHoursDec(mins / 60) + 'h' : '—') + '</b></div>';
        };
        const hoverList = studied.length
          ? studied.slice().sort(function (a, b) { return b.totalMinutes - a.totalMinutes; }).map(topicLine).join('') +
            (emptyN ? '<p class="cp-subj-more">' + emptyN + ' tópico(s) ainda sem registro</p>' : '')
          : '<p class="cp-subj-more">Nenhum tópico registrado ainda.</p>';
        const detailList = rows.length ? rows.map(topicLine).join('') : '<p class="cp-subj-more">Nenhum tópico nesta matéria.</p>';
        return '<div class="cp-subj-card' + (it.minutes > 0 ? '' : ' empty') + (open ? ' open' : '') + '" data-action="subj-card" data-subject="' + esc(it.subject) + '">' +
          '<div class="row"><h4>' + esc(it.subject) + '</h4><span class="h">' + formatHoursDec(it.hours) + 'h</span></div>' +
          '<div class="cp-mini-track"><div class="f" style="width:' + rel + '%"></div></div>' +
          '<div class="meta"><span>' + it.count + ' ' + (it.count === 1 ? 'sessão' : 'sessões') + ' • ' + formatMinHuman(it.minutes) + '</span><span class="pc">' + it.percentage + '% do total</span></div>' +
          '<div class="cp-subj-hover">' + hoverList + '</div>' +
          '<div class="cp-subj-detail">' + detailList + '</div>' +
        '</div>';
      }).join('') + '</div>';
    } else {
      bodyHtml = '<div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>' + (isGabi() ? 'Frente' : 'Disciplina') + '</th><th>Sessões</th><th>Minutos</th><th>Horas</th><th>% do Total</th><th>Carga Relativa</th></tr></thead><tbody>' +
        totals.map(function (it) {
          const rel = s.totalMinutes > 0 ? (it.minutes / maxMin) * 100 : 0;
          return '<tr><td>' + esc(it.subject) + '</td><td class="muted">' + it.count + '</td><td class="mono">' + it.minutes + 'm</td>' +
            '<td class="blue">' + formatHoursDec(it.hours) + 'h</td><td class="mono muted">' + it.percentage + '%</td>' +
            '<td style="min-width:120px"><div class="cp-mini-track"><div class="f" style="width:' + rel + '%"></div></div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    const tools = '<div style="display:flex;align-items:center;gap:8px">' +
      '<button class="cp-btn" data-action="subj-sort">' + ic('sort') + '<span>' + (ui.subjSort === 'hours' ? 'Por Horas' : 'A-Z') + '</span></button>' +
      '<div class="cp-seg">' +
        '<button data-action="subj-view" data-view="cards" class="' + (ui.subjView === 'cards' ? 'active' : '') + '" title="Cards">' + ic('grid') + '</button>' +
        '<button data-action="subj-view" data-view="table" class="' + (ui.subjView === 'table' ? 'active' : '') + '" title="Tabela">' + ic('table') + '</button>' +
      '</div>' +
    '</div>';
    // Na aba Gabi a seção começa fechada; no Matheus fica aberta.
    if (isGabi()) {
      return '' +
        '<div class="cp-card" id="resumo-disciplinas">' +
          '<button type="button" class="cp-card-head cp-card-toggle" data-action="subject-toggle" aria-expanded="' + (ui.subjectOpen ? 'true' : 'false') + '">' +
            '<div class="cp-hgroup"><div class="cp-ico">' + ic('book') + '</div>' +
              '<div><h3>Tempo por Frente</h3>' +
              '<p>Distribuição da carga horária nas ' + allSubjects().length + ' frentes acompanhadas</p></div></div>' +
            '<span class="cp-head-note" style="display:inline-flex;align-items:center;gap:10px">' +
              '<span class="cp-toggle-chev">' + ic(ui.subjectOpen ? 'chevUp' : 'chevDown') + '</span>' +
            '</span>' +
          '</button>' +
          (ui.subjectOpen
            ? '<div class="cp-card-body"><div class="cp-card-head" style="margin-bottom:14px;padding:0;border:0">' + tools + '</div>' + bodyHtml + '</div>'
            : '') +
        '</div>';
    }
    return '' +
      '<div class="cp-card" id="resumo-disciplinas">' +
        '<div class="cp-card-head"><div class="cp-hgroup"><div class="cp-ico">' + ic('book') + '</div>' +
          '<div><h3>Tempo por Disciplina (Edital Base)</h3>' +
          '<p>Distribuição da carga horária nas ' + allSubjects().length + ' disciplinas acompanhadas</p></div></div>' +
          tools +
        '</div>' + bodyHtml +
      '</div>';
  }

  /* ---- Recent history ---- */
  function renderHistory() {
    const mine = curLogs();
    const latest = mine.slice().sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 10);
    let body;
    if (latest.length === 0) {
      body = '<div class="cp-empty">' + ic('clock') + '<p class="p1">Nenhuma hora registrada ainda.</p><p class="p2">Use o botão + para lançar a primeira sessão.</p></div>';
    } else {
      body = '<div class="cp-hist">' + latest.map(function (l) {
        const color = catColor(l.category);
        const confirming = ui.confirmDel === l.id;
        const right = confirming
          ? '<div class="cp-confirm"><button class="cp-btn primary" style="background:var(--red);border-color:var(--red);padding:6px 12px" data-action="del-confirm" data-id="' + esc(l.id) + '">' + ic('alert') + 'Excluir</button>' +
            '<button class="cp-btn" style="padding:6px 12px" data-action="del-cancel">Cancelar</button></div>'
          : '<button class="cp-btn icon" data-action="log-edit" data-id="' + esc(l.id) + '" title="Editar">' + ic('pencil') + '</button>' +
            '<button class="cp-btn icon danger-hover" data-action="del-ask" data-id="' + esc(l.id) + '" title="Excluir">' + ic('trash') + '</button>';
        return '<div class="cp-hist-item"><div class="cp-hist-left">' +
          '<span class="cp-datechip">' + ic('calendar') + formatDateBR(l.date) + '</span>' +
          '<div><div class="cp-hist-subj"><span class="s">' + esc(l.subject) + '</span>' +
          '<span class="cp-cat-tag sm" style="color:' + color + ';border-color:' + color + '55;background:' + color + '18">' + esc(l.category) + '</span></div>' +
          (logTopics(l).length ? '<div class="cp-hist-topic"><span class="b"></span><span>' + esc(logTopics(l).join(' · ')) + '</span></div>' : '') +
          '</div></div>' +
          '<div class="cp-hist-right"><div class="cp-hist-dur"><span class="m">' + l.minutes + ' min</span><span class="h">(' + formatHoursDec(minToHours(l.minutes)) + 'h)</span></div>' + right + '</div></div>';
      }).join('') + '</div>';
    }
    return '' +
      '<div class="cp-card" id="historico-recente">' +
        '<button type="button" class="cp-card-head cp-card-toggle" data-action="history-toggle" aria-expanded="' + (ui.historyOpen ? 'true' : 'false') + '">' +
          '<div class="cp-hgroup"><div class="cp-ico">' + ic('history') + '</div>' +
            '<div><h3>Histórico Recente</h3><p>Últimos 10 registros — dá para editar ou excluir para corrigir</p></div></div>' +
          '<span class="cp-head-note" style="display:inline-flex;align-items:center;gap:10px">' +
            mine.length + ' ' + (mine.length === 1 ? 'registro' : 'registros') +
            '<span class="cp-toggle-chev">' + ic(ui.historyOpen ? 'chevUp' : 'chevDown') + '</span>' +
          '</span>' +
        '</button>' +
        (ui.historyOpen ? '<div class="cp-card-body">' + body + '</div>' : '') +
      '</div>';
  }

  /* ------------------------------- Aba Gabi -------------------------------- */
  function renderGabiTab(s) {
    return '' +
      renderGabiHeader() +
      renderVisionLink() +
      section('sec-calendar', '<div class="cp-card cp-calcard">' + renderLifeCalendar() + '</div>') +
      section('sec-overview', renderGabiOverview(s)) +
      section('sec-focus', renderGabiFocus()) +
      section('sec-subject', renderSubject(s)) +
      section('sec-topics', renderTopics()) +
      section('sec-history', renderHistory());
    // Aspirações (renderGabiMetas) ficam guardadas no código — fora do ar por enquanto.
  }

  function renderGabiHeader() {
    return '' +
      '<header class="cp-header">' +
        '<div class="cp-brand">' +
          '<div class="cp-logo">' + ic('sparkles') + '</div>' +
          '<div>' +
            '<div class="cp-title-row"><h1>Reta final</h1>' +
              '<span class="cp-pill">' + ic('flag') + 'defesas em abril de 2027</span>' +
            '</div>' +
            '<p class="cp-subtitle">Doutorado (capítulos 1, 2 e 3) e MBA — horas de análise de dados, leitura e escrita, dia a dia</p>' +
            '<p class="cp-effort">' + ic('clock') + 'Esforço necessário por dia: <b>' + GABI_DIARIO + ' horas</b></p>' +
          '</div>' +
        '</div>' +
        '<div class="cp-header-actions">' +
          '<button class="cp-btn primary" data-action="form-open" title="Registrar horas do dia">' + ic('plusSign') + '<span>Registrar horas</span></button>' +
          backupButtons() +
          '<button class="cp-btn" data-action="theme-toggle" title="Alternar tema">' + ic(darkMode ? 'sun' : 'moon') + '<span>' + (darkMode ? 'Claro' : 'Escuro') + '</span></button>' +
        '</div>' +
      '</header>';
  }

  function renderGabiOverview(s) {
    const dias = Math.max(0, daysUntil(GABI_DEFESA));
    const hojeMin = curLogs().reduce(function (a, l) { return a + (l.date === getToday() ? l.minutes : 0); }, 0);
    const hoje = minToHours(hojeMin);
    return '' +
      '<div class="cp-card" id="projetos-gabi">' +
        '<div class="cp-card-head">' +
          '<div class="cp-hgroup"><div class="cp-ico dark">' + ic('target') + '</div>' +
            '<div><h2>Os dois projetos grandes</h2>' +
            '<p>Plano de ' + GABI_GOAL_HOURS + ' horas até a defesa — ' + GABI_DIARIO + ' horas de esforço por dia</p></div>' +
          '</div>' +
          '<span class="cp-pill neutral">' + ic('compass') + dias + ' dias até a defesa</span>' +
        '</div>' +
        '<div class="cp-metrics">' +
          metric('Horas Acumuladas', formatHoursDec(s.totalHours), '/ ' + GABI_GOAL_HOURS + ' h', 'blue') +
          metric('Progresso Geral', s.progressPercent.toFixed(1) + '%', 'do plano', 'emerald') +
          metric('Esforço de Hoje', formatHoursDec(hoje), 'de ' + GABI_DIARIO + ' h necessárias', hoje >= GABI_DIARIO ? 'emerald' : 'amber') +
        '</div>' +
        '<div class="gp-hoje">' +
          '<div class="cp-progress sm"><div class="cp-progress-fill" style="width:' + Math.min(100, (hoje / GABI_DIARIO) * 100) + '%"></div></div>' +
          '<span>' + (hoje >= GABI_DIARIO
            ? 'Meta do dia cumprida.'
            : 'Faltam ' + formatHoursDec(GABI_DIARIO - hoje) + ' h para fechar o dia.') + '</span>' +
        '</div>' +
        renderDailyQuote() +
      '</div>';
  }

  // Foco do momento: Doutorado ou MBA — filtra o detalhe e a pizza.
  function gabiFocusParts() {
    const proj = GABI_PROJETOS.filter(function (p) { return p.cls === ui.gabiProj; })[0] || GABI_PROJETOS[0];
    if (ui.gabiProj === 'dout' && ui.gabiCap != null) {
      const one = proj.partes[ui.gabiCap];
      return one ? [one] : proj.partes;
    }
    return proj.partes;
  }
  function gabiFocusLogs() {
    const subjects = gabiFocusParts().map(function (p) { return p.subject; });
    return curLogs().filter(function (l) { return subjects.indexOf(l.subject) >= 0; });
  }
  function gabiFocusDist() {
    const list = gabiFocusLogs();
    const tot = list.reduce(function (a, l) { return a + l.minutes; }, 0);
    const catTot = {};
    GABI_CATEGORIES.forEach(function (c) { catTot[c] = 0; });
    list.forEach(function (l) { if (catTot[l.category] !== undefined) catTot[l.category] += l.minutes; });
    return GABI_CATEGORIES.map(function (cat) {
      const mins = catTot[cat];
      const pct = tot > 0 ? Number(((mins / tot) * 100).toFixed(1)) : 0;
      return { category: cat, minutes: mins, hours: minToHours(mins), percentage: pct };
    });
  }

  function renderGabiFocus() {
    const proj = GABI_PROJETOS.filter(function (p) { return p.cls === ui.gabiProj; })[0] || GABI_PROJETOS[0];
    const partes = gabiFocusParts();
    const dist = gabiFocusDist();
    const totMin = dist.reduce(function (a, it) { return a + it.minutes; }, 0);
    const feito = {};
    curLogs().forEach(function (l) {
      if (!feito[l.subject]) feito[l.subject] = {};
      feito[l.subject][l.category] = (feito[l.subject][l.category] || 0) + l.minutes;
    });

    const toggle = '<div class="gp-toggle" role="tablist" aria-label="Projeto">' +
      [{ id: 'dout', label: 'Doutorado', icon: 'cap' }, { id: 'mba', label: 'MBA', icon: 'fileCheck' }].map(function (t) {
        return '<button type="button" class="gp-tog' + (ui.gabiProj === t.id ? ' active' : '') + '" data-action="gabi-proj" data-proj="' + t.id + '"' +
          (ui.gabiProj === t.id ? ' aria-current="true"' : '') + '>' + ic(t.icon) + '<span>' + t.label + '</span></button>';
      }).join('') +
    '</div>';

    const caps = ui.gabiProj === 'dout'
      ? '<div class="gp-caps">' +
          '<button type="button" class="gp-cap' + (ui.gabiCap == null ? ' active' : '') + '" data-action="gabi-cap" data-cap="">Geral</button>' +
          proj.partes.map(function (p, i) {
            return '<button type="button" class="gp-cap' + (ui.gabiCap === i ? ' active' : '') + '" data-action="gabi-cap" data-cap="' + i + '">' +
              esc(p.nome) + '</button>';
          }).join('') +
        '</div>'
      : '';

    const blocos = partes.map(function (p) {
      const metaTot = GABI_CATEGORIES.reduce(function (a, c) { return a + (p.metas[c] || 0); }, 0);
      const feitoTot = GABI_CATEGORIES.reduce(function (a, c) { return a + minToHours((feito[p.subject] || {})[c] || 0); }, 0);
      const pct = metaTot ? Math.min(100, Math.round((feitoTot / metaTot) * 100)) : 0;
      const metricas = GABI_CATEGORIES.map(function (c) {
        const alvo = p.metas[c] || 0;
        const h = minToHours((feito[p.subject] || {})[c] || 0);
        const w = alvo ? Math.min(100, (h / alvo) * 100) : 0;
        return '<div class="gp-metric">' +
          '<span class="m-top"><span class="m-dot" style="background:' + GABI_CAT_COLOR[c] + '"></span>' + esc(c) + '</span>' +
          '<span class="m-num">' + formatHoursDec(h) + '<i>/ ' + alvo + 'h</i></span>' +
          '<div class="cp-mini-track"><div class="f" style="width:' + w + '%;background:' + GABI_CAT_COLOR[c] + '"></div></div>' +
        '</div>';
      }).join('');
      return '<div class="gp-parte' + (pct >= 100 ? ' ok' : '') + '">' +
        '<div class="gp-parte-top"><h5>' + esc(p.nome) + '</h5>' +
          '<span class="gp-pct">' + formatHoursDec(feitoTot) + 'h <i>de ' + metaTot + 'h · ' + pct + '%</i></span></div>' +
        '<div class="cp-progress sm"><div class="cp-progress-fill" style="width:' + Math.max(pct > 0 ? 2 : 0, pct) + '%"></div></div>' +
        '<div class="gp-metrics">' + metricas + '</div>' +
      '</div>';
    }).join('');

    const items = dist.map(function (it) {
      return '<div class="gp-pie-item">' +
        '<span class="dot" style="background:' + catColor(it.category) + '"></span>' +
        '<div class="txt">' +
          '<b>' + esc(it.category) + '</b>' +
          '<span>' + formatHoursDec(it.hours) + ' h · ' + formatMinHuman(it.minutes) + '</span>' +
        '</div>' +
        '<em>' + it.percentage + '%</em>' +
      '</div>';
    }).join('');

    const filtroTxt = ui.gabiProj === 'mba'
      ? 'MBA · trabalho final'
      : (ui.gabiCap == null ? 'Doutorado · geral (3 capítulos)' : 'Doutorado · ' + proj.partes[ui.gabiCap].nome);

    return '' +
      '<div class="cp-card" id="foco-gabi">' +
        '<div class="cp-card-head">' +
          '<div class="cp-hgroup"><div class="cp-ico indigo">' + ic('pie') + '</div>' +
            '<div><h3>Foco do momento</h3><p>Capítulos, horas por atividade e distribuição — filtrados pelo projeto</p></div></div>' +
          '<span class="cp-head-note">' + esc(filtroTxt) + '</span>' +
        '</div>' +
        toggle +
        caps +
        '<div class="gp-focus">' +
          '<div class="gp-partes">' + blocos + '</div>' +
          '<div class="gp-pie">' +
            '<div class="gp-pie-chart' + (totMin === 0 ? ' empty' : '') + '" style="background:' + pieSlices(dist) + '" aria-hidden="true"><i></i></div>' +
            '<div class="gp-pie-side">' +
              '<div class="gp-pie-label">Distribuição por Atividade · Total: ' + formatMinHuman(totMin) + '</div>' +
              items +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // Guardado: aspirações da Gabi (fora do ar por enquanto).
  function renderGabiMetas() {
    const list = metas.filter(function (m) { return m.owner === 'gabi'; });
    return '<div class="cp-card cp-goalstats" style="margin-bottom:18px">' +
        '<div class="cp-card-head" style="margin-bottom:0">' +
          '<div class="cp-hgroup"><div class="cp-ico indigo">' + ic('flag') + '</div>' +
            '<div><h3>Minhas aspirações</h3><p>Os marcos da reta final e o que eu quero ter concretizado até ' + formatDateBR(HORIZON_DATE) + '</p></div></div>' +
          '<button class="cp-btn" data-action="meta-new">' + ic('plusSign') + '<span>Nova</span></button>' +
        '</div>' +
      '</div>' +
      renderGoalList(list, 'gabi');
  }

  /* ---------------------------- Aba de aspirações -------------------------- */
  function metaProgress(m) {
    if (m.steps.length) {
      const done = m.steps.filter(function (s) { return s.done; }).length;
      return Math.round((done / m.steps.length) * 100);
    }
    return m.status === 'concluido' ? 100 : m.status === 'andamento' ? 50 : 0;
  }
  function statusLabel(id) {
    const s = META_STATUS.filter(function (x) { return x.id === id; })[0];
    return s ? s.label : id;
  }
  function daysUntil(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  }

  /* ------------ Aba GATHEUS: a linha do tempo dos dois, por ano ------------- */
  function whoOf(id) { return WHO.filter(function (w) { return w.id === id; })[0] || WHO[0]; }
  function mesAno(dateStr) {
    const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const p = String(dateStr).split('-');
    return M[Number(p[1]) - 1] + '/' + p[0];
  }

  function renderCoupleTab() {
    const list = metas.filter(function (m) { return m.owner === 'casal'; })
      .sort(function (a, b) { return a.target < b.target ? -1 : a.target > b.target ? 1 : 0; });
    const done = list.filter(function (m) { return metaProgress(m) >= 100; }).length;
    const overall = list.length
      ? Math.round(list.reduce(function (a, m) { return a + metaProgress(m); }, 0) / list.length)
      : 0;
    const restam = Math.max(0, daysUntil(HORIZON_DATE));
    const proxima = list.filter(function (m) { return metaProgress(m) < 100 && daysUntil(m.target) >= 0; })[0];

    return '' +
      '<header class="cp-header">' +
        '<div class="cp-brand">' +
          '<div class="cp-logo">' + ic('heart') + '</div>' +
          '<div>' +
            '<div class="cp-title-row"><h1>GATHEUS</h1>' +
              '<span class="cp-pill">' + ic('flag') + 'até ' + formatDateBR(HORIZON_DATE) + '</span>' +
            '</div>' +
            '<p class="cp-subtitle">A linha do tempo dos próximos três anos — o que cada um conquista e o que construímos juntos</p>' +
          '</div>' +
        '</div>' +
        '<div class="cp-header-actions">' +
          '<button class="cp-btn primary" data-action="meta-new">' + ic('plusSign') + '<span>Nova meta</span></button>' +
          backupButtons() +
          '<button class="cp-btn" data-action="theme-toggle" title="Alternar tema">' + ic(darkMode ? 'sun' : 'moon') + '<span>' + (darkMode ? 'Claro' : 'Escuro') + '</span></button>' +
        '</div>' +
      '</header>' +
      section('sec-visions', renderCoupleVisions()) +
      '<section>' +
        '<div class="cp-card cp-goalstats">' +
          '<div class="cp-stats3">' +
            statCard('METAS NA LINHA DO TEMPO', String(list.length), list.length === 1 ? 'registrada' : 'registradas', '') +
            statCard('JÁ CONQUISTADAS', String(done), 'de ' + list.length, 'ok') +
            statCard('DIAS ATÉ O HORIZONTE', String(restam), 'até ' + formatDateBR(HORIZON_DATE), 'warn') +
          '</div>' +
          '<div class="cp-goalbar">' +
            '<div class="gb-head"><span>Progresso geral</span><b>' + overall + '%</b></div>' +
            '<div class="cp-progress"><div class="cp-progress-fill" style="width:' + Math.max(overall > 0 ? 1 : 0, overall) + '%"></div></div>' +
            '<div class="gb-foot">' + (proxima
              ? 'Próxima da fila: <b>' + esc(proxima.title) + '</b> · ' + mesAno(proxima.target)
              : 'Nada com prazo aberto no momento') + '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section>' + renderTimeline(list) + '</section>';
  }

  function renderCoupleVisions() {
    return '<div class="cp-card" style="margin-bottom:18px">' +
      '<div class="cp-card-head">' +
        '<div class="cp-hgroup"><div class="cp-ico">' + ic('eye') + '</div>' +
          '<div><h3>Visualizações</h3><p>A mesma visão de cada um, aqui no espaço do casal</p></div></div>' +
      '</div>' +
      '<div class="cp-portals gt">' +
        '<button type="button" class="cp-portal" data-action="portal-open" data-portal="vision" data-who="matheus">' +
          '<span class="cv-ico">' + ic('cap') + '</span>' +
          '<span class="cv-txt"><b>Matheus</b><i>Doutorado, concurso, Sofia e o segundo filho</i></span>' +
          '<span class="cv-go">' + ic('chevRight') + '</span>' +
        '</button>' +
        '<button type="button" class="cp-portal af" data-action="portal-open" data-portal="vision" data-who="gabi">' +
          '<span class="cv-ico">' + ic('sparkles') + '</span>' +
          '<span class="cv-txt"><b>Gabi</b><i>Doutorado, MBA, Marie Curie, família</i></span>' +
          '<span class="cv-go">' + ic('chevRight') + '</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function renderTimeline(list) {
    if (!list.length) {
      return '<div class="cp-card cp-goalempty">' + ic('heart') +
        '<h3>A linha do tempo está vazia</h3>' +
        '<p>Escreva aqui cada coisa que vocês querem ver acontecer daqui até ' + formatDateBR(HORIZON_DATE) + ', com a data prevista. As metas se organizam sozinhas por ano.</p>' +
        '<button class="cp-btn primary" data-action="meta-new">' + ic('plusSign') + '<span>Adicionar a primeira</span></button>' +
      '</div>';
    }
    const anos = [];
    list.forEach(function (m) { const y = m.target.slice(0, 4); if (anos.indexOf(y) < 0) anos.push(y); });
    return '<div class="cp-tl">' + anos.map(function (ano) {
      const doAno = list.filter(function (m) { return m.target.slice(0, 4) === ano; });
      return '<div class="tl-ano">' +
        '<div class="tl-ano-head"><b>' + ano + '</b><span>' + doAno.length + (doAno.length === 1 ? ' meta' : ' metas') + '</span></div>' +
        '<div class="tl-itens">' + doAno.map(renderTimelineItem).join('') + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function renderTimelineItem(m) {
    const pct = metaProgress(m);
    const st = pct >= 100 ? 'concluido' : m.status;
    const w = whoOf(m.who);
    const dias = daysUntil(m.target);
    const confirming = ui.confirmMeta === m.id;
    const steps = m.steps.map(function (s, i) {
      return '<li><button type="button" class="g-step' + (s.done ? ' done' : '') + '" data-action="step-toggle" data-id="' + m.id + '" data-i="' + i + '">' +
        ic(s.done ? 'checkCircle' : 'circle') + '<span>' + esc(s.t) + '</span></button></li>';
    }).join('');
    return '<article class="tl-item w-' + w.id + (pct >= 100 ? ' complete' : '') + '">' +
      '<span class="tl-dot">' + ic(pct >= 100 ? 'check' : w.icon) + '</span>' +
      '<div class="tl-card">' +
        '<div class="tl-top">' +
          '<div class="tl-when"><b>' + mesAno(m.target) + '</b>' +
            '<span class="tl-who">' + ic(w.icon) + w.label + '</span></div>' +
          '<div class="g-acts">' +
            '<button type="button" class="cp-btn icon" data-action="meta-edit" data-id="' + m.id + '" title="Editar">' + ic('pencil') + '</button>' +
            '<button type="button" class="cp-btn icon danger-hover" data-action="meta-del-ask" data-id="' + m.id + '" title="Excluir">' + ic('trash') + '</button>' +
          '</div>' +
        '</div>' +
        '<h4>' + esc(m.title) + '</h4>' +
        '<div class="g-meta">' +
          '<span class="g-status s-' + st + '">' + statusLabel(st) + '</span>' +
          '<span class="g-date">' + ic('tag') + esc(m.category) + '</span>' +
          (pct < 100 ? '<span class="g-date">' + ic('calendar') + (dias >= 0 ? 'faltam ' + dias + ' dias' : 'prazo passou') + '</span>' : '') +
        '</div>' +
        '<div class="cp-progress sm"><div class="cp-progress-fill" style="width:' + Math.max(pct > 0 ? 2 : 0, pct) + '%"></div></div>' +
        '<div class="g-pct">' + pct + '%' + (m.steps.length ? ' <i>· ' + m.steps.filter(function (s) { return s.done; }).length + ' de ' + m.steps.length + ' passos</i>' : '') + '</div>' +
        (steps ? '<ul class="g-steps">' + steps + '</ul>' : '') +
        (m.notes ? '<p class="g-notes">' + esc(m.notes) + '</p>' : '') +
        (confirming
          ? '<div class="g-confirm"><span>Excluir esta meta?</span>' +
              '<button type="button" class="cp-btn sm" data-action="meta-del-cancel">Cancelar</button>' +
              '<button type="button" class="cp-btn sm danger" data-action="meta-del-confirm" data-id="' + m.id + '">Excluir</button>' +
            '</div>'
          : '') +
      '</div>' +
    '</article>';
  }

  function statCard(label, value, sub, tone) {
    return '<div class="cp-stat ' + (tone || '') + '">' +
      '<div class="s-label">' + esc(label) + '</div>' +
      '<div class="s-value">' + esc(value) + '</div>' +
      '<div class="s-sub">' + esc(sub) + '</div>' +
    '</div>';
  }

  function renderGoalList(list, owner) {
    if (!list.length) {
      const quem = owner === 'casal' ? 'nós dois queremos' : 'eu quero';
      return '<div class="cp-card cp-goalempty">' +
        ic('flag') +
        '<h3>Nenhuma aspiração registrada ainda</h3>' +
        '<p>Escreva aqui, em tópicos, o que ' + quem + ' ter concretizado até ' + formatDateBR(HORIZON_DATE) + '. Cada aspiração pode ter passos, e marcar os passos move a barra de progresso.</p>' +
        '<button class="cp-btn primary" data-action="meta-new">' + ic('plusSign') + '<span>Adicionar a primeira</span></button>' +
      '</div>';
    }
    // Agrupa por categoria, mantendo a ordem sugerida e jogando as novas ao fim.
    const cats = [];
    list.forEach(function (m) { if (cats.indexOf(m.category) < 0) cats.push(m.category); });
    cats.sort(function (a, b) {
      const ia = META_CATEGORIES.indexOf(a), ib = META_CATEGORIES.indexOf(b);
      if (ia < 0 && ib < 0) return a.localeCompare(b, 'pt-BR');
      if (ia < 0) return 1;
      if (ib < 0) return -1;
      return ia - ib;
    });
    return cats.map(function (cat) {
      const group = list.filter(function (m) { return m.category === cat; })
        .sort(function (a, b) { return metaProgress(a) - metaProgress(b); });
      return '<div class="cp-goalgroup">' +
        '<h3 class="cp-goalcat">' + ic('tag') + esc(cat) + '<span>' + group.length + '</span></h3>' +
        '<div class="cp-goalgrid">' + group.map(renderGoalCard).join('') + '</div>' +
      '</div>';
    }).join('');
  }

  function renderGoalCard(m) {
    const pct = metaProgress(m);
    const st = pct >= 100 ? 'concluido' : m.status;
    const steps = m.steps.map(function (s, i) {
      return '<li><button type="button" class="g-step' + (s.done ? ' done' : '') + '" data-action="step-toggle" data-id="' + m.id + '" data-i="' + i + '">' +
        ic(s.done ? 'checkCircle' : 'circle') + '<span>' + esc(s.t) + '</span></button></li>';
    }).join('');
    const confirming = ui.confirmMeta === m.id;
    return '<article class="cp-goal' + (pct >= 100 ? ' complete' : '') + '">' +
      '<div class="g-top">' +
        '<h4>' + esc(m.title) + '</h4>' +
        '<div class="g-acts">' +
          '<button type="button" class="cp-btn icon" data-action="meta-edit" data-id="' + m.id + '" title="Editar">' + ic('pencil') + '</button>' +
          '<button type="button" class="cp-btn icon danger-hover" data-action="meta-del-ask" data-id="' + m.id + '" title="Excluir">' + ic('trash') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="g-meta">' +
        '<span class="g-status s-' + st + '">' + statusLabel(st) + '</span>' +
        (m.target !== HORIZON_DATE ? '<span class="g-date">' + ic('flag') + 'até ' + formatDateBR(m.target) + '</span>' : '') +
      '</div>' +
      '<div class="cp-progress sm"><div class="cp-progress-fill" style="width:' + Math.max(pct > 0 ? 2 : 0, pct) + '%"></div></div>' +
      '<div class="g-pct">' + pct + '%' + (m.steps.length ? ' <i>· ' + m.steps.filter(function (s) { return s.done; }).length + ' de ' + m.steps.length + ' passos</i>' : '') + '</div>' +
      (steps ? '<ul class="g-steps">' + steps + '</ul>' : '') +
      (m.notes ? '<p class="g-notes">' + esc(m.notes) + '</p>' : '') +
      (confirming
        ? '<div class="g-confirm"><span>Excluir esta aspiração?</span>' +
            '<button type="button" class="cp-btn sm" data-action="meta-del-cancel">Cancelar</button>' +
            '<button type="button" class="cp-btn sm danger" data-action="meta-del-confirm" data-id="' + m.id + '">Excluir</button>' +
          '</div>'
        : '') +
    '</article>';
  }

  function renderMetaForm() {
    const f = ui.metaForm;
    if (!f) return '';
    const catOpts = META_CATEGORIES.concat(
      metas.map(function (m) { return m.category; }).filter(function (c) { return META_CATEGORIES.indexOf(c) < 0; })
    ).filter(function (c, i, a) { return a.indexOf(c) === i; });
    return '<div class="cp-modal-backdrop">' +
      '<div class="cp-modal" role="dialog" aria-modal="true">' +
        '<div class="cp-modal-head"><div class="cp-brand">' +
          '<div class="cp-logo">' + ic('flag') + '</div>' +
          '<div><h3>' + (f.id ? 'Editar meta' : 'Nova meta') + '</h3>' +
          '<p>' + (f.owner === 'casal' ? 'Linha do tempo do casal' : 'Minhas aspirações') + '</p></div></div>' +
          '<button type="button" class="cp-btn icon" data-action="meta-close" title="Fechar (Esc)">' + ic('close') + '</button></div>' +
        '<form data-action="meta-save" class="cp-modal-body">' +
          '<div class="cp-field">' +
            '<label class="cp-label"><span class="l">' + ic('flag') + (f.owner === 'casal' ? 'O que queremos concretizar' : 'O que eu quero concretizar') + '</span></label>' +
            '<input id="cp-m-title" class="cp-input" type="text" value="' + esc(f.title) + '" placeholder="Ex: Doutorado concluído" maxlength="120" required>' +
          '</div>' +
          (f.owner === 'casal'
            ? '<div class="cp-field">' +
                '<label class="cp-label"><span class="l">' + ic('heart') + 'De quem é essa meta</span></label>' +
                '<div class="cp-who">' + WHO.map(function (w) {
                  return '<button type="button" class="cp-whobtn' + (w.id === f.who ? ' active' : '') + '" data-action="meta-who" data-who="' + w.id + '">' +
                    ic(w.icon) + w.label + '</button>';
                }).join('') + '</div>' +
              '</div>'
            : '') +
          '<div class="cp-grid-3">' +
            '<div class="cp-field">' +
              '<label class="cp-label"><span class="l">' + ic('tag') + 'Categoria</span></label>' +
              '<input id="cp-m-category" class="cp-input" type="text" list="cp-m-cats" value="' + esc(f.category) + '" placeholder="Ex: Família" maxlength="40">' +
              '<datalist id="cp-m-cats">' + catOpts.map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join('') + '</datalist>' +
            '</div>' +
            '<div class="cp-field">' +
              '<label class="cp-label"><span class="l">' + ic('trending') + 'Situação</span></label>' +
              '<select id="cp-m-status" class="cp-select">' + META_STATUS.map(function (s) {
                return '<option value="' + s.id + '"' + (s.id === f.status ? ' selected' : '') + '>' + s.label + '</option>';
              }).join('') + '</select>' +
            '</div>' +
            '<div class="cp-field">' +
              '<label class="cp-label"><span class="l">' + ic('calendar') + 'Prazo</span></label>' +
              '<input id="cp-m-target" class="cp-input" type="date" value="' + esc(f.target) + '" max="2035-12-31">' +
            '</div>' +
          '</div>' +
          '<div class="cp-field">' +
            '<label class="cp-label"><span class="l">' + ic('check') + 'Passos</span><span style="color:var(--faint);font-weight:500">um por linha — marcar passos move a barra</span></label>' +
            '<textarea id="cp-m-steps" class="cp-input cp-textarea" rows="4" placeholder="Qualificação aprovada&#10;Capítulos 1 a 3 escritos&#10;Defesa marcada">' + esc(f.stepsText) + '</textarea>' +
          '</div>' +
          '<div class="cp-field">' +
            '<label class="cp-label"><span class="l">' + ic('lightbulb') + 'Observações</span></label>' +
            '<textarea id="cp-m-notes" class="cp-input cp-textarea" rows="2" placeholder="Contexto, combinados, o que destrava isso...">' + esc(f.notes) + '</textarea>' +
          '</div>' +
          '<div class="cp-shortcuts">' +
            '<span class="cp-hint">' + ic('flag') + 'Prazo padrão: ' + formatDateBR(HORIZON_DATE) + '</span>' +
            '<button type="submit" class="cp-btn primary" style="padding:11px 22px">' + ic('check') + '<span>' + (f.id ? 'Salvar' : 'Adicionar') + '</span></button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';
  }

  /* ---- Footer ---- */
  function renderFooter() {
    const arquivo = ui.tab === 'gatheus' ? 'public/life/metas.csv + data.csv' : 'public/life/data.csv + metas.csv';
    const alvo = ui.tab === 'matheus'
      ? 'Alvo: 3.000 horas líquidas'
      : ui.tab === 'gabi'
        ? 'Alvo: ' + GABI_GOAL_HOURS + ' horas até a defesa de abril de 2027'
        : 'Horizonte ' + formatDateBR(HORIZON_DATE) + ': tudo concretizado';
    return '<footer class="cp-footer">' +
      '<div class="status"><span class="dot"></span><span>Backup global no CSV · dados no navegador + espelho em <code>' + arquivo + '</code></span></div>' +
      '<div class="links">' +
        '<button class="cp-linkbtn" data-action="download-csv">Baixar CSV</button><span>•</span>' +
        '<button class="cp-linkbtn" data-action="restore">Restaurar</button><span>•</span>' +
        '<span>' + alvo + '</span>' +
      '</div>' +
      '</footer>';
  }

  /* ------------------------------- Eventos -------------------------------- */
  function actionFrom(e) { const el = e.target.closest('[data-action]'); return el ? { el: el, action: el.getAttribute('data-action') } : null; }

  root.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('cp-modal-backdrop')) {
      ui.formOpen = false; ui.addingSubject = false; ui.renamingSubject = false; ui.confirmSubject = null; ui.topicOutroOpen = false;
      form.editId = null; ui.metaForm = null; ui.portal = null; ui.portalWho = null; ui.insightOpen = false; ui.milagreOpen = false; render(); return;
    }
    // Toque/clique na célula do calendário mostra o mesmo popup do hover (sem hover no mobile).
    const cell = e.target.closest && e.target.closest('.cp-cell');
    if (cell) { showCalTip(cell, e); return; }
    hideCalTip();
    const a = actionFrom(e); if (!a) return;
    const el = a.el;
    switch (a.action) {
      case 'theme-toggle': darkMode = !darkMode; applyTheme(); render(); break;
      case 'download-csv': exportCSV(); break;
      case 'restore': document.getElementById('cp-import-file').click(); break;
      case 'insight-open':
        ui.insightOpen = true;
        render();
        if (!getInsight() && !ui.mentorLoading) loadInsight();
        break;
      case 'insight-close': ui.insightOpen = false; render(); break;
      case 'mentor-ask': loadInsight(); break;
      case 'milagre-open': ui.milagreOpen = true; render(); break;
      case 'milagre-close': ui.milagreOpen = false; render(); break;
      case 'milagre-confirm': {
        if (markMilagreToday()) {
          const s = milagreStreak();
          toast(s === 1
            ? 'Chama acesa. Ofensiva recomeçada — dia 1.'
            : 'Milagre marcado. Ofensiva em chamas — ' + s + ' dias seguidos!');
        }
        render();
        break;
      }
      case 'milagre-undo':
        if (unmarkMilagreToday()) toast('Ofensiva de hoje desfeita.');
        render();
        break;
      case 'chip-delta': {
        e.preventDefault();
        applyMinutes((parseInt(form.minutes, 10) || 0) + (parseInt(el.getAttribute('data-delta'), 10) || 0));
        break;
      }
      case 'minutes-unlock':
        e.preventDefault();
        form.minutesEdit = true;
        paintDurationField();
        {
          const inp = document.getElementById('cp-f-minutes-edit');
          if (inp) { inp.focus(); inp.select(); }
        }
        break;
      case 'minutes-lock':
        e.preventDefault();
        applyMinutes(form.minutes);
        form.minutesEdit = false;
        paintDurationField();
        break;
      case 'subj-sort': ui.subjSort = ui.subjSort === 'hours' ? 'name' : 'hours'; render(); break;
      case 'subj-view': ui.subjView = el.getAttribute('data-view'); render(); break;
      case 'portal-open':
        ui.portal = el.getAttribute('data-portal');
        ui.portalWho = el.getAttribute('data-who') || profileId();
        render();
        break;
      case 'portal-close': ui.portal = null; ui.portalWho = null; render(); break;
      case 'gabi-proj':
        ui.gabiProj = el.getAttribute('data-proj') === 'mba' ? 'mba' : 'dout';
        if (ui.gabiProj === 'mba') ui.gabiCap = null;
        render();
        break;
      case 'gabi-cap': {
        const raw = el.getAttribute('data-cap');
        ui.gabiCap = raw === '' || raw == null ? null : Number(raw);
        render();
        break;
      }
      case 'form-open':
        form.editId = null;
        form.minutes = '60';
        form.minutesEdit = false;
        form.topic = ''; form.topics = []; form.topicOutro = '';
        ui.addingSubject = false; ui.renamingSubject = false; ui.confirmSubject = null; ui.topicOutroOpen = false;
        ui.formOpen = true;
        render(); break;
      case 'form-close':
        ui.formOpen = false; ui.addingSubject = false; ui.renamingSubject = false; ui.confirmSubject = null; ui.topicOutroOpen = false; form.editId = null;
        render(); break;
      case 'log-edit': {
        const l = logs.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (!l) break;
        form.editId = l.id;
        form.date = l.date;
        form.subject = l.subject;
        form.category = l.category;
        form.minutes = String(l.minutes);
        form.minutesEdit = false;
        const existingTopics = logTopics(l);
        if (isGabi()) {
          form.topic = existingTopics[0] || '';
          form.topics = []; form.topicOutro = '';
          ui.topicOutroOpen = false;
        } else {
          const known = editalTopics(l.subject).concat(catalogTopicsFor(l.subject));
          form.topics = existingTopics.filter(function (t) { return known.indexOf(t) >= 0; });
          form.topicOutro = existingTopics.filter(function (t) { return known.indexOf(t) < 0; }).join(', ');
          form.topic = '';
          ui.topicOutroOpen = !!form.topicOutro;
        }
        ui.confirmDel = null; ui.addingSubject = false; ui.renamingSubject = false; ui.confirmSubject = null; ui.formOpen = true;
        render(); break;
      }
      case 'subject-new':
        ui.addingSubject = true; ui.renamingSubject = false; ui.confirmSubject = null; ui.newSubject = '';
        render(); break;
      case 'subject-cancel':
        ui.addingSubject = false; ui.renamingSubject = false; ui.confirmSubject = null; ui.newSubject = '';
        render(); break;
      case 'subject-add': {
        const typed = String(ui.newSubject || '').replace(/\s+/g, ' ').trim();
        const nome = addSubject(typed);
        if (!nome) { toast('Informe o nome da matéria.', true); break; }
        form.subject = nome;
        ui.addingSubject = false; ui.newSubject = '';
        render();
        toast(editalKey(typed) && foldName(typed) !== foldName(nome)
          ? 'Isso já é "' + nome + '" no edital. Tópicos oficiais liberados.'
          : 'Matéria "' + nome + '" disponível.');
        break;
      }
      case 'subject-rename':
        if (!isCustomSubject(form.subject)) break;
        ui.renamingSubject = true; ui.addingSubject = false; ui.confirmSubject = null; ui.newSubject = form.subject;
        render(); break;
      case 'subject-rename-save': {
        const from = form.subject;
        const nextName = String(ui.newSubject || '').replace(/\s+/g, ' ').trim();
        if (!nextName) { toast('Informe o nome da matéria.', true); break; }
        ui.renamingSubject = false; ui.newSubject = '';
        const nome = renameSubject(from, nextName);
        if (!nome) { toast('Informe o nome da matéria.', true); break; }
        toast('Matéria atualizada em todo o histórico.');
        break;
      }
      case 'subject-del-ask':
        if (!isCustomSubject(form.subject)) break;
        ui.confirmSubject = form.subject;
        render(); break;
      case 'subject-del-cancel': ui.confirmSubject = null; render(); break;
      case 'subject-del-confirm':
        if (!retireSubject(ui.confirmSubject || form.subject)) { toast('Essa matéria do edital não sai da lista.', true); break; }
        toast('Matéria removida da lista. O histórico ficou.');
        break;
      case 'topic-toggle': {
        applyTopicToggle(el.getAttribute('data-topic'));
        syncTopicChecks();
        break;
      }
      case 'topic-all':
        form.topics = formTopicPool().slice();
        syncTopicChecks();
        break;
      case 'topic-none':
        form.topics = [];
        syncTopicChecks();
        break;
      case 'subj-card': {
        const name = el.getAttribute('data-subject');
        const cur = ui.subjOpen || [];
        ui.subjOpen = cur.indexOf(name) >= 0 ? cur.filter(function (x) { return x !== name; }) : cur.concat([name]);
        render();
        break;
      }
      case 'topic-outro-toggle':
        ui.topicOutroOpen = !ui.topicOutroOpen;
        if (!ui.topicOutroOpen) form.topicOutro = '';
        else ui.focusTopicOutroNext = true;
        render();
        break;
      case 'miles-toggle': ui.milesOpen = !ui.milesOpen; render(); break;
      case 'topics-toggle': ui.topicsOpen = !ui.topicsOpen; render(); break;
      case 'history-toggle': ui.historyOpen = !ui.historyOpen; render(); break;
      case 'subject-toggle': ui.subjectOpen = !ui.subjectOpen; render(); break;
      case 'acc-toggle': { const sub = el.getAttribute('data-subject'); ui.expanded = ui.expanded === sub ? null : sub; render(); break; }
      case 'del-ask': ui.confirmDel = el.getAttribute('data-id'); render(); break;
      case 'del-cancel': ui.confirmDel = null; render(); break;
      case 'del-confirm': {
        const id = el.getAttribute('data-id');
        ui.confirmDel = null;
        setLogs(logs.map(function (l) {
          return l.id === id ? Object.assign({}, l, { status: 'deleted' }) : l;
        }));
        break;
      }
      case 'tab': setTab(el.getAttribute('data-tab')); break;
      case 'meta-new': {
        ui.confirmMeta = null;
        ui.metaForm = { id: null, owner: TAB_OWNER[ui.tab] || 'casal', who: ui.tab === 'gabi' ? 'gabi' : 'nos', title: '', category: '', status: 'planejado', target: HORIZON_DATE, stepsText: '', notes: '' };
        render(); break;
      }
      case 'meta-edit': {
        const m = metas.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (!m) break;
        ui.confirmMeta = null;
        ui.metaForm = {
          id: m.id, owner: m.owner, who: m.who, title: m.title, category: m.category, status: m.status, target: m.target,
          stepsText: m.steps.map(function (s) { return s.t; }).join('\n'), notes: m.notes,
        };
        render(); break;
      }
      case 'meta-who': { if (ui.metaForm) { ui.metaForm.who = el.getAttribute('data-who'); render(); } break; }
      case 'meta-close': ui.metaForm = null; render(); break;
      case 'meta-del-ask': ui.confirmMeta = el.getAttribute('data-id'); render(); break;
      case 'meta-del-cancel': ui.confirmMeta = null; render(); break;
      case 'meta-del-confirm': {
        const id = el.getAttribute('data-id');
        ui.confirmMeta = null;
        setMetas(metas.filter(function (m) { return m.id !== id; }));
        toast('Aspiração excluída.');
        break;
      }
      case 'step-toggle': {
        const id = el.getAttribute('data-id');
        const i = parseInt(el.getAttribute('data-i'), 10);
        setMetas(metas.map(function (m) {
          if (m.id !== id) return m;
          const steps = m.steps.map(function (s, idx) { return idx === i ? { t: s.t, done: !s.done } : s; });
          const done = steps.filter(function (s) { return s.done; }).length;
          // A situação acompanha os passos: tudo marcado conclui, algo marcado engata.
          const status = done === steps.length ? 'concluido' : done > 0 ? 'andamento' : 'planejado';
          return Object.assign({}, m, { steps: steps, status: status, updated: Date.now() });
        }));
        break;
      }
    }
  });

  root.addEventListener('keydown', function (e) {
    if (e.target.id === 'cp-f-newsubject' && e.key === 'Enter') {
      e.preventDefault();
      const btn = root.querySelector('[data-action="subject-add"]');
      if (btn) btn.click();
    }
    if (e.target.id === 'cp-f-renamesubject' && e.key === 'Enter') {
      e.preventDefault();
      const btn = root.querySelector('[data-action="subject-rename-save"]');
      if (btn) btn.click();
    }
    if (e.target.getAttribute && e.target.getAttribute('data-action') === 'miles-toggle' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      ui.milesOpen = !ui.milesOpen;
      render();
    }
  });

  root.addEventListener('submit', function (e) {
    const a = actionFrom(e);
    if (a && a.action === 'meta-save') {
      e.preventDefault();
      const f = ui.metaForm; if (!f) return;
      const title = String(f.title || '').trim();
      if (!title) { toast('Escreva o que vocês querem concretizar.', true); return; }
      const prev = f.id ? metas.filter(function (m) { return m.id === f.id; })[0] : null;
      const doneMap = {};
      if (prev) prev.steps.forEach(function (s) { doneMap[s.t] = s.done; });
      const steps = String(f.stepsText || '').split('\n')
        .map(function (t) { return t.trim(); })
        .filter(Boolean)
        .map(function (t) { return { t: t, done: !!doneMap[t] }; });
      const meta = normalizeMeta({
        id: f.id || undefined, owner: f.owner, who: f.who, title: title, category: f.category,
        status: f.status, target: f.target, steps: steps, notes: f.notes, updated: Date.now(),
      });
      ui.metaForm = null;
      setMetas(f.id ? metas.map(function (m) { return m.id === f.id ? meta : m; }) : [meta].concat(metas));
      toast(f.id ? 'Meta atualizada.' : 'Meta adicionada!');
      return;
    }
    if (!a || a.action !== 'add-log') return;
    e.preventDefault();
    if (ui.addingSubject) { toast('Conclua o cadastro da nova matéria antes de registrar.', true); return; }
    const rawMins = parseInt(form.minutes, 10) || 0;
    if (rawMins <= 0) { toast('Informe um tempo válido em minutos.', true); return; }
    const mins = clampMinutes(rawMins);
    const editId = form.editId;
    const topicValue = serializeTopics(collectFormTopics()) || undefined;
    if (editId) {
      // Mantém o timestamp original para o histórico não se reordenar na edição.
      const next = logs.map(function (l) {
        if (l.id !== editId) return l;
        const keep = l.subject === form.subject ? logStatus(l) : '';
        return { id: l.id, date: form.date, subject: form.subject, category: form.category, minutes: mins, topic: topicValue, timestamp: l.timestamp, owner: logOwner(l), status: keep };
      });
      form.editId = null; form.topic = ''; form.topics = []; form.topicOutro = ''; form.minutes = '60'; form.minutesEdit = false;
      ui.topicOutroOpen = false;
      ui.formOpen = false;
      setLogs(next);
      toast('Registro atualizado!');
      return;
    }
    const log = { id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), date: form.date, subject: form.subject, category: form.category, minutes: mins, topic: topicValue, timestamp: Date.now(), owner: profileId(), status: '' };
    form.topic = ''; form.topics = []; form.topicOutro = ''; form.minutes = '60'; form.minutesEdit = false;
    ui.topicOutroOpen = false;
    ui.formOpen = false;
    setLogs([log].concat(logs));
    toast('Sessão registrada!');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (ui.milagreOpen) { ui.milagreOpen = false; render(); }
    else if (ui.insightOpen) { ui.insightOpen = false; render(); }
    else if (ui.portal) { ui.portal = null; ui.portalWho = null; render(); }
    else if (ui.formOpen) {
      ui.formOpen = false; ui.addingSubject = false; ui.renamingSubject = false; ui.confirmSubject = null; ui.topicOutroOpen = false; form.editId = null;
      render();
    }
    else if (ui.metaForm) { ui.metaForm = null; render(); }
  });

  window.addEventListener('hashchange', function () {
    const h = String(location.hash || '').replace('#', '').toLowerCase();
    if (TABS.some(function (t) { return t.id === h; })) setTab(h);
  });

  root.addEventListener('mouseover', function (e) {
    const cell = e.target.closest && e.target.closest('.cp-cell');
    if (cell) showCalTip(cell, e);
  });
  root.addEventListener('mousemove', function (e) {
    if (calTip && !calTip.hidden) {
      if (e.target.closest && e.target.closest('.cp-cell')) moveCalTip(e);
      else hideCalTip();
    }
  });
  root.addEventListener('mouseout', function (e) {
    if (e.target.classList && e.target.classList.contains('cp-cell')) hideCalTip();
  });
  window.addEventListener('scroll', hideCalTip, true);

  root.addEventListener('input', function (e) {
    const t = e.target;
    if (t.id === 'cp-f-minutes-edit') {
      form.minutes = t.value;
      const hidden = document.getElementById('cp-f-minutes');
      if (hidden) hidden.value = form.minutes;
    } else if (t.id === 'cp-f-topic') { form.topic = t.value; }
    else if (t.id === 'cp-f-topic-outro') { form.topicOutro = t.value; }
    else if (t.id === 'cp-f-newsubject' || t.id === 'cp-f-renamesubject') { ui.newSubject = t.value; }
    else if (t.id === 'cp-search-input') { ui.search = t.value; render(); }
    else if (ui.metaForm && t.id === 'cp-m-title') { ui.metaForm.title = t.value; }
    else if (ui.metaForm && t.id === 'cp-m-category') { ui.metaForm.category = t.value; }
    else if (ui.metaForm && t.id === 'cp-m-steps') { ui.metaForm.stepsText = t.value; }
    else if (ui.metaForm && t.id === 'cp-m-notes') { ui.metaForm.notes = t.value; }
  });

  root.addEventListener('change', function (e) {
    const t = e.target;
    if (t.id === 'cp-f-date') form.date = t.value;
    else if (t.id === 'cp-f-category') form.category = t.value;
    else if (t.id === 'cp-f-subject') {
      form.subject = t.value;
      ui.confirmSubject = null;
      form.topic = ''; form.topics = []; form.topicOutro = '';
      ui.topicOutroOpen = false;
      render();
    }
    else if (ui.metaForm && t.id === 'cp-m-status') ui.metaForm.status = t.value;
    else if (ui.metaForm && t.id === 'cp-m-target') ui.metaForm.target = t.value;
    else if (ui.metaForm && t.id === 'cp-m-category') ui.metaForm.category = t.value;
  });

  document.getElementById('cp-import-file').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function () { importText(String(reader.result || ''), file.name); e.target.value = ''; };
    reader.onerror = function () { toast('Falha ao ler o arquivo.', true); };
    reader.readAsText(file);
  });

  /* -------------------------------- Boot ---------------------------------- */
  async function boot() {
    applyTheme();
    resetFormProfile();
    absorbAliasSubjects();
    await loadFrases();
    try {
      const r = await fetch('/life/api/logs', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        const remote = (Array.isArray(data.logs) ? data.logs : []).map(normalizeLog).filter(Boolean);
        const merged = mergeById(remote, logs).map(normalizeLog).filter(Boolean);
        logs = merged.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
        logs.forEach(function (l) {
          if (logOwner(l) !== 'matheus' || isDeletedLog(l) || logStatus(l) === 'subject_deleted') return;
          const canon = canonicalSubject(l.subject);
          if (canon && canon !== l.subject) l.subject = canon;
          if (l.subject && SUBJECTS_BASE.indexOf(l.subject) < 0) pushUnique(extraSubjects, l.subject);
        });
        absorbAliasSubjects();
        persistExtras();
        persist();
        // Deploy do Render zera o disco: devolve ao servidor o que só existe aqui.
        if (merged.length > remote.length) saveLogsToServer(logs);
      }
    } catch (_) { /* offline: segue com localStorage */ }
    try {
      const r = await fetch('/life/api/metas', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        const remote = semObsoletas((Array.isArray(data.metas) ? data.metas : []).map(normalizeMeta).filter(Boolean));
        const merged = semObsoletas(mergeById(remote, metas));
        metas = merged;
        persistMetas();
        if (merged.length !== remote.length) saveMetasToServer(metas);
      }
    } catch (_) { /* offline: segue com localStorage */ }
    render();
    // A marca do "agora" na faixa da rotina anda sozinha, sem redesenhar a tela.
    setInterval(function () {
      const el = root.querySelector('.cp-daystrip');
      if (el && ui.tab === 'matheus') el.outerHTML = renderDayStrip();
    }, 60000);
  }
  boot();
})();
