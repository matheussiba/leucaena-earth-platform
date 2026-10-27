// Controlador de Interface de Usuário (Vanilla DOM)
// Inventário Florestal ESALQ/USP — CMQ
import {
  Inventory,
  Group,
  Plot,
  Tree,
  PlotFormat,
  PlotDimensions,
  PlotCoordinates,
  GeoPoint,
} from './types';
import {
  calcularDAP,
  calcularAreaTransversal,
  calcularAreaCircular,
  calcularAreaRetangular,
  converterM2ParaHectares,
  calcularEstatisticasParcela,
  calcularResumoEspecies,
  calcularSinteseInventario,
  validarMedicaoArvore,
  formatarNumero,
} from './calculations';
import {
  listarInventarios,
  obterInventario,
  salvarInventario,
  excluirInventario,
  listarGruposPorInventario,
  obterGrupo,
  salvarGrupo,
  excluirGrupo,
  listarParcelasPorInventario,
  listarParcelasPorGrupo,
  obterParcela,
  salvarParcela,
  excluirParcela,
  listarArvoresPorParcela,
  listarTodasArvoresPorInventario,
  salvarArvore,
  excluirArvore,
  exportarBackupCompleto,
  importarBackupCompleto,
  exportarActivityLogTxt,
} from './db';
import {
  gerarCSVArvoresIndividuais,
  gerarCSVResumoParcelas,
  gerarCSVResumoEspecies,
  gerarCSVGrupoCompleto,
  baixarArquivo,
  DelimitadorCSV,
} from './export';
import {
  capturarPontoGPS,
  formatarCoordenada,
  temCoordenadasRegistradas,
  isMobileDevice,
} from './geo';
import { executarTodosTestes } from './tests';

/** Coordenadas GPS capturadas antes de salvar uma parcela nova. */
let pendingPlotCoords: PlotCoordinates | null = null;

// Estado global da aplicação
interface AppState {
  view:
    | 'dashboard'
    | 'inventario-novo'
    | 'inventario-editar'
    | 'inventario-detalhes'
    | 'grupo-novo'
    | 'grupo-editar'
    | 'grupo-detalhes'
    | 'parcela-nova'
    | 'parcela-editar'
    | 'coleta-arvores'
    | 'parcela-resultados'
    | 'inventario-sintese'
    | 'exportacao'
    | 'ajuda'
    | 'testes';
  inventarioAtivo: Inventory | null;
  grupoAtivo: Group | null;
  parcelaAtiva: Plot | null;
  delimitadorCSV: DelimitadorCSV;
  modoContrasteCampo: boolean;
  filtroEspecie: string;
}

const state: AppState = {
  view: 'dashboard',
  inventarioAtivo: null,
  grupoAtivo: null,
  parcelaAtiva: null,
  delimitadorCSV: ';',
  modoContrasteCampo: false,
  filtroEspecie: '',
};

// ----------------- Utilitários de Feedback -----------------

export function showToast(mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso' = 'sucesso') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg =
    tipo === 'sucesso'
      ? 'bg-emerald-800 text-white border-emerald-950'
      : tipo === 'erro'
      ? 'bg-rose-800 text-white border-rose-950'
      : 'bg-amber-600 text-white border-amber-900';

  toast.className = `px-4 py-3 rounded-lg shadow-lg text-sm font-medium border flex items-center gap-2 pointer-events-auto animate-fade-in ${bg}`;
  toast.innerHTML = `<span>${mensagem}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

export function showModal(title: string, bodyContent: string, footerContent: string) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-xs">
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        <div class="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 class="font-bold text-lg">${title}</h3>
          <button id="modal-close-btn" class="text-slate-300 hover:text-white p-1 text-xl leading-none">&times;</button>
        </div>
        <div class="p-5 overflow-y-auto text-slate-800 flex-1 space-y-4">
          ${bodyContent}
        </div>
        <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          ${footerContent}
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
}

export function closeModal() {
  const container = document.getElementById('modal-container');
  if (container) container.innerHTML = '';
}

type GroupColor = {
  bg: string;
  border: string;
  text: string;
  solid: string;
  soft: string;
};

const GROUP_PALETTE: GroupColor[] = [
  { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a', solid: '#2563eb', soft: '#dbeafe' },
  { bg: '#fff1f2', border: '#f43f5e', text: '#9f1239', solid: '#e11d48', soft: '#ffe4e6' },
  { bg: '#ecfdf5', border: '#10b981', text: '#065f46', solid: '#059669', soft: '#d1fae5' },
  { bg: '#fff7ed', border: '#f97316', text: '#9a3412', solid: '#ea580c', soft: '#ffedd5' },
  { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6', solid: '#7c3aed', soft: '#ede9fe' },
  { bg: '#ecfeff', border: '#06b6d4', text: '#155e75', solid: '#0891b2', soft: '#cffafe' },
  { bg: '#fefce8', border: '#eab308', text: '#854d0e', solid: '#ca8a04', soft: '#fef9c3' },
  { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d', solid: '#db2777', soft: '#fce7f3' },
];

function corDoGrupo(grupoId: string | null | undefined): GroupColor {
  if (!grupoId) return GROUP_PALETTE[0];
  let h = 0;
  for (let i = 0; i < grupoId.length; i++) h = (h * 31 + grupoId.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}

function confirmDeleteModal(
  title: string,
  bodyHtml: string,
  onConfirm: () => void | Promise<void>
) {
  showModal(
    title,
    bodyHtml,
    `
      <button id="modal-cancel-del" class="btn-secondary text-xs px-4 py-2">Cancelar</button>
      <button id="modal-confirm-del" class="btn-primary text-xs px-4 py-2 bg-rose-700 hover:bg-rose-800 border-rose-900">Remover</button>
    `
  );
  document.getElementById('modal-cancel-del')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm-del')?.addEventListener('click', async () => {
    await onConfirm();
    closeModal();
  });
}

const HOLD_MS = 5000;

function bindHoldOrClick(
  el: HTMLElement,
  handlers: {
    onClick: (el: HTMLElement) => void | Promise<void>;
    onHold: (el: HTMLElement) => void | Promise<void>;
  }
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let held = false;
  let pointerId: number | null = null;

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const start = (e: PointerEvent) => {
    if (e.button != null && e.button !== 0) return;
    held = false;
    pointerId = e.pointerId;
    clear();
    timer = setTimeout(() => {
      held = true;
      timer = null;
      void handlers.onHold(el);
    }, HOLD_MS);
  };

  const end = (e: PointerEvent) => {
    if (pointerId != null && e.pointerId !== pointerId) return;
    const wasHeld = held;
    clear();
    pointerId = null;
    if (!wasHeld) void handlers.onClick(el);
    held = false;
  };

  const cancel = (e: PointerEvent) => {
    if (pointerId != null && e.pointerId !== pointerId) return;
    clear();
    pointerId = null;
    held = false;
  };

  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('click', (e) => e.preventDefault());
}

// ----------------- Roteamento e Inicialização -----------------

export async function navigate(
  novaView: AppState['view'],
  inventarioId?: string,
  grupoId?: string,
  parcelaId?: string
) {
  state.view = novaView;

  const topLevel: AppState['view'][] = [
    'dashboard',
    'ajuda',
    'testes',
    'exportacao',
    'inventario-novo',
  ];

  if (topLevel.includes(novaView)) {
    state.inventarioAtivo = null;
    state.grupoAtivo = null;
    state.parcelaAtiva = null;
    renderApp();
    return;
  }

  if (inventarioId) {
    state.inventarioAtivo = await obterInventario(inventarioId);
  }

  if (grupoId) {
    state.grupoAtivo = await obterGrupo(grupoId);
  } else if (
    novaView === 'inventario-detalhes' ||
    novaView === 'inventario-editar' ||
    novaView === 'inventario-sintese' ||
    novaView === 'grupo-novo'
  ) {
    state.grupoAtivo = null;
    state.parcelaAtiva = null;
  }

  if (parcelaId) {
    state.parcelaAtiva = await obterParcela(parcelaId);
  } else if (
    novaView === 'grupo-detalhes' ||
    novaView === 'grupo-editar' ||
    novaView === 'parcela-nova'
  ) {
    state.parcelaAtiva = null;
  }

  renderApp();
}

export async function initApp() {
  await listarInventarios();

  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/inventario/sw.js', { scope: '/inventario/' }).catch((err) => {
      console.log('SW registration note:', err);
    });
  }

  renderApp();
}

// ----------------- Renderizador Principal -----------------

export async function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  if (state.modoContrasteCampo) {
    document.body.classList.add('sunlight-mode');
  } else {
    document.body.classList.remove('sunlight-mode');
  }

  let html = renderHeader();

  const mainPad =
    state.view === 'coleta-arvores'
      ? 'p-2 sm:p-4 space-y-3'
      : 'p-3 sm:p-6 space-y-4 sm:space-y-6';
  html += `<main class="flex-1 max-w-7xl w-full mx-auto ${mainPad}">`;

  switch (state.view) {
    case 'dashboard':
      html += await renderInventariosLista();
      break;
    case 'inventario-novo':
      html += renderInventarioForm();
      break;
    case 'inventario-editar':
      html += renderInventarioForm(state.inventarioAtivo || undefined);
      break;
    case 'inventario-detalhes':
      html += await renderInventarioDetalhes();
      break;
    case 'grupo-novo':
      html += renderGrupoForm();
      break;
    case 'grupo-editar':
      html += renderGrupoForm(state.grupoAtivo || undefined);
      break;
    case 'grupo-detalhes':
      html += await renderGrupoDetalhes();
      break;
    case 'parcela-nova':
      html += renderParcelaForm();
      break;
    case 'parcela-editar':
      html += renderParcelaForm(state.parcelaAtiva || undefined);
      break;
    case 'coleta-arvores':
      html += await renderColetaArvores();
      break;
    case 'parcela-resultados':
      html += await renderParcelaResultados();
      break;
    case 'inventario-sintese':
      html += await renderInventarioSintese();
      break;
    case 'exportacao':
      html += await renderExportacao();
      break;
    case 'ajuda':
      html += renderAjuda();
      break;
    case 'testes':
      html += renderTestes();
      break;
  }

  html += `</main>`;
  html += renderFooter();

  app.innerHTML = html;

  attachEventListeners();
}

// ----------------- Componente: Cabeçalho -----------------

function renderHeader(): string {
  const showCrumb =
    !!state.inventarioAtivo &&
    state.view !== 'dashboard' &&
    state.view !== 'ajuda' &&
    state.view !== 'testes' &&
    state.view !== 'exportacao' &&
    state.view !== 'inventario-novo';
  const corGrupo = showCrumb && state.grupoAtivo ? corDoGrupo(state.grupoAtivo.id) : null;
  return `
    <header class="bg-[#1b4332] text-white shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-2.5 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 cursor-pointer min-w-0" id="nav-brand-home">
          <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-md bg-emerald-800/80 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-200">
            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 14h6v8h6v-8h6z" />
            </svg>
          </div>
          <div class="min-w-0">
            <h1 class="text-sm sm:text-lg font-bold tracking-tight text-white leading-tight truncate">
              Inventário Florestal
            </h1>
            <p class="hidden sm:block text-[0.7rem] text-emerald-200 font-medium truncate">
              ESALQ/USP • LCF0510 • CMQ
            </p>
          </div>
        </div>

        <button id="nav-btn-ajuda" title="Ajuda" class="shrink-0 px-2 py-1 sm:px-3 sm:py-1.5 rounded bg-emerald-900/80 hover:bg-emerald-800 text-[0.7rem] sm:text-xs font-semibold flex items-center gap-1 border border-emerald-700/50">
          <span>📖</span> <span class="hidden xs:inline sm:inline">Ajuda</span>
        </button>
      </div>

      ${
        showCrumb
          ? `
        <div class="border-t px-2 sm:px-4 py-1 text-[0.65rem] sm:text-xs flex items-center gap-1 overflow-x-auto ${
          corGrupo ? '' : 'bg-[#143225] border-emerald-900 text-emerald-100'
        }" ${
          corGrupo
            ? `style="background:${corGrupo.solid};border-color:${corGrupo.border};color:#fff"`
            : ''
        }>
          <nav class="flex items-center gap-1 flex-nowrap whitespace-nowrap" aria-label="Breadcrumb">
            <button type="button" data-crumb="inventarios" class="px-1.5 py-0.5 rounded border border-white/25 bg-black/15 hover:bg-white/20 font-semibold">
              Início
            </button>
            <span class="opacity-70">›</span>
            <button type="button" data-crumb="inventario" class="px-1.5 py-0.5 rounded border border-white/25 bg-black/20 hover:bg-white/20 font-semibold max-w-[9rem] truncate">
              ${state.inventarioAtivo!.nome}
            </button>
            ${
              state.grupoAtivo
                ? `
              <span class="opacity-70">›</span>
              <button type="button" data-crumb="grupo" class="px-1.5 py-0.5 rounded border border-white/35 bg-white/20 hover:bg-white/30 font-semibold max-w-[8rem] truncate">
                ${state.grupoAtivo.nome}
              </button>`
                : ''
            }
            ${
              state.parcelaAtiva
                ? `
              <span class="opacity-70">›</span>
              <button type="button" data-crumb="parcela" class="px-1.5 py-0.5 rounded border border-white/25 bg-black/20 hover:bg-white/20 font-mono font-semibold">
                ${state.parcelaAtiva.codigo}
              </button>`
                : ''
            }
          </nav>
        </div>
      `
          : ''
      }
    </header>
  `;
}

// ----------------- Componente: Rodapé -----------------

function renderFooter(): string {
  if (state.view === 'coleta-arvores') {
    return `
      <footer class="bg-slate-900 text-slate-500 text-[0.65rem] border-t border-slate-800 py-1.5 px-3 mt-4">
        <div class="max-w-7xl mx-auto text-center">
          <span>Desenvolvedor: Matheus Siqueira Barros · </span>
          <a href="mailto:ms.barros@usp.br" class="text-emerald-400 hover:underline">ms.barros@usp.br</a>
        </div>
      </footer>
    `;
  }
  return `
    <footer class="bg-slate-900 text-slate-400 text-[0.7rem] sm:text-xs border-t border-slate-800 py-3 sm:py-4 px-3 sm:px-4 mt-6 sm:mt-10">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div>
          <p class="font-semibold text-slate-300">Inventário Florestal | ESALQ/USP — CMQ</p>
          <p class="text-slate-500 mt-0.5">
            Desenvolvedor: Matheus Siqueira Barros ·
            <a href="mailto:ms.barros@usp.br" class="text-emerald-400 hover:underline">ms.barros@usp.br</a>
          </p>
        </div>
      </div>
    </footer>
  `;
}

// ----------------- Visão 1: Tela Inicial (Lista de Inventários) -----------------

async function renderInventariosLista(): Promise<string> {
  const inventarios = await listarInventarios();

  let cardsHtml = '';
  if (inventarios.length === 0) {
    cardsHtml = `
      <div class="md:col-span-2 lg:col-span-3 bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
        <p class="text-slate-800 font-semibold">Nenhum inventário cadastrado</p>
        <p class="text-sm text-slate-500">Clique em "Novo Inventário" para começar.</p>
      </div>
    `;
  } else {
    const cards = await Promise.all(
      inventarios.map(async (inv) => {
        const grupos = await listarGruposPorInventario(inv.id);
        const parcelas = await listarParcelasPorInventario(inv.id);
        const arvores = await listarTodasArvoresPorInventario(inv.id);

        return `
          <div class="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center text-xl shrink-0">
                  🌲
                </div>
                <span class="text-[0.7rem] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  ${inv.turma || 'Turma LCF0510'}
                </span>
              </div>

              <div>
                <h4 class="font-bold text-slate-900 text-lg leading-snug hover:text-emerald-800 transition-colors cursor-pointer" data-action="abrir-inventario" data-id="${inv.id}">
                  ${inv.nome}
                </h4>
                <p class="text-xs text-slate-500 mt-1">
                  Disciplina: ${inv.disciplina || 'LCF0510 - Inventário Florestal'}
                </p>
              </div>

              <div class="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <p><strong>Professores:</strong> ${inv.professores || 'Matheus Pinheiro Ferreira e Jonathan Trautenmüller'}</p>
                <p><strong>Monitor:</strong> ${inv.monitor || 'Matheus Siqueira Barros'}</p>
                <p><strong>Data de Campo:</strong> ${inv.data || '—'}</p>
                <p><strong>Método:</strong> ${inv.metodoAmostragem || 'AAS'}</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
              <div>
                <span class="block font-bold text-emerald-900 text-base font-mono">${grupos.length}</span>
                <span class="text-[0.68rem] text-slate-500 uppercase font-semibold">Grupos</span>
              </div>
              <div>
                <span class="block font-bold text-emerald-900 text-base font-mono">${parcelas.length}</span>
                <span class="text-[0.68rem] text-slate-500 uppercase font-semibold">Parcelas</span>
              </div>
              <div>
                <span class="block font-bold text-emerald-900 text-base font-mono">${arvores.length}</span>
                <span class="text-[0.68rem] text-slate-500 uppercase font-semibold">Árvores</span>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button data-action="abrir-inventario" data-id="${inv.id}" class="btn-primary flex-1 text-xs py-2.5">
                Abrir Inventário
              </button>
              <button data-action="editar-inventario" data-id="${inv.id}" data-nome="${inv.nome}" title="Editar Inventário" class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                ✏️
              </button>
            </div>
          </div>
        `;
      })
    );
    cardsHtml = cards.join('');
  }

  return `
    <div class="space-y-4 sm:space-y-6">
      <section class="text-sm text-slate-600 space-y-1">
        <h2 class="text-base sm:text-lg font-bold text-slate-900">Inventário Florestal — ESALQ/USP</h2>
        <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
          App da disciplina LCF0510 para cadastrar inventários, grupos, parcelas e medições de árvores em campo, com cálculos dendrométricos e exportação.
        </p>
      </section>

      <!-- Barra de Controle de Inventários -->
      <section class="bg-white rounded-xl p-3 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h3 class="text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📋</span> Inventários
          </h3>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            ${inventarios.length}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-novo-inventario" class="btn-primary text-xs sm:text-sm">
            <span>+</span> Novo Inventário
          </button>
        </div>
      </section>

      <!-- Grid de Inventários -->
      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${cardsHtml}
      </section>
    </div>
  `;
}

// ----------------- Visão 2: Cadastro / Edição de Inventário -----------------

function renderInventarioForm(inventario?: Inventory): string {
  const isEditing = !!inventario;
  const hoje = new Date().toISOString().split('T')[0];

  return `
    <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
      <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            ${isEditing ? 'Editar Inventário Florestal' : 'Novo Inventário Florestal'}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">ESALQ/USP — CMQ</p>
        </div>
        <button id="btn-cancelar-inv" class="text-slate-400 hover:text-slate-600 text-sm font-semibold">
          Cancelar
        </button>
      </div>

      <form id="form-inventario" class="space-y-4">
        <input type="hidden" id="inv-id" value="${inventario?.id || ''}">

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Nome do Inventário *
          </label>
          <input type="text" id="inv-nome" required class="field-input w-full"
            placeholder="Ex: Inventário ESALQ — Fazenda Areão"
            value="${inventario?.nome || 'Inventário ESALQ — Fazenda Areão'}">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Disciplina *
            </label>
            <input type="text" id="inv-disciplina" required class="field-input w-full"
              placeholder="LCF0510 - Inventário Florestal"
              value="${inventario?.disciplina || 'LCF0510 - Inventário Florestal'}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Turma *
            </label>
            <input type="text" id="inv-turma" required class="field-input w-full"
              placeholder="Ex: Turma LCF0510 - Engenharia Florestal"
              value="${inventario?.turma || 'Turma LCF0510 - Engenharia Florestal'}">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Professores Responsáveis *
            </label>
            <input type="text" id="inv-professores" required class="field-input w-full"
              placeholder="Ex: Matheus Pinheiro Ferreira e Jonathan Trautenmüller"
              value="${inventario?.professores || 'Matheus Pinheiro Ferreira e Jonathan Trautenmüller'}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Monitor da Disciplina *
            </label>
            <input type="text" id="inv-monitor" required class="field-input w-full"
              placeholder="Ex: Matheus Siqueira Barros"
              value="${inventario?.monitor || 'Matheus Siqueira Barros'}">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Data do Trabalho de Campo *
            </label>
            <input type="date" id="inv-data" required class="field-input w-full"
              value="${inventario?.data || hoje}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Método de Amostragem (Informativo)
            </label>
            <select id="inv-metodo" class="field-input w-full">
              <option value="Amostragem Aleatória Simples (AAS)" ${inventario?.metodoAmostragem?.includes('Aleatória Simples') ? 'selected' : ''}>Amostragem Aleatória Simples (AAS)</option>
              <option value="Amostragem Sistemática" ${inventario?.metodoAmostragem?.includes('Sistemática') ? 'selected' : ''}>Amostragem Sistemática</option>
              <option value="Amostragem Estratificada" ${inventario?.metodoAmostragem?.includes('Estratificada') ? 'selected' : ''}>Amostragem Estratificada</option>
              <option value="Censo Florestal 100%" ${inventario?.metodoAmostragem?.includes('Censo') ? 'selected' : ''}>Censo Florestal 100%</option>
              <option value="Outro Método" ${inventario?.metodoAmostragem?.includes('Outro') ? 'selected' : ''}>Outro Método</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Responsável Geral / Orientação
          </label>
          <input type="text" id="inv-responsavel" class="field-input w-full"
            placeholder="Ex: Prof. Matheus Pinheiro Ferreira, Prof. Jonathan Trautenmüller | Monitor: Matheus Siqueira Barros"
            value="${inventario?.responsavel || 'Prof. Matheus Pinheiro Ferreira, Prof. Jonathan Trautenmüller | Monitor: Matheus Siqueira Barros'}">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Observações Gerais do Inventário
          </label>
          <textarea id="inv-obs" rows="3" class="field-input w-full text-sm"
            placeholder="Objetivo didático, localização do talhão, condições climáticas...">${inventario?.observacoes || ''}</textarea>
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" id="btn-cancelar-inv-2" class="btn-secondary">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            ${isEditing ? 'Atualizar Inventário' : 'Salvar Inventário'}
          </button>
        </div>
      </form>
    </div>
  `;
}

// ----------------- Visão 3: TELA DO INVENTÁRIO (Grupos Cadastrados) -----------------

async function renderInventarioDetalhes(): Promise<string> {
  const inv = state.inventarioAtivo;
  if (!inv) return `<div class="p-6">Inventário não encontrado.</div>`;

  const grupos = await listarGruposPorInventario(inv.id);
  const todasParcelas = await listarParcelasPorInventario(inv.id);
  const todasArvores = await listarTodasArvoresPorInventario(inv.id);

  let areaTotalM2 = 0;
  for (const p of todasParcelas) {
    areaTotalM2 += p.areaM2 || 0;
  }
  const areaTotalHa = converterM2ParaHectares(areaTotalM2);

  return `
    <div class="space-y-6">
      <!-- Breadcrumb e Cabeçalho do Inventário -->
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <button id="btn-voltar-dashboard" class="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold">
                ← Inventários
              </button>
              <span class="text-slate-300">/</span>
              <span class="text-xs text-emerald-800 font-bold">${inv.nome}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              ${inv.nome}
            </h2>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button id="btn-novo-grupo" class="btn-primary text-xs sm:text-sm">
              <span>+</span> Novo Grupo
            </button>
            <button id="btn-abrir-sintese" class="btn-secondary text-xs sm:text-sm">
              <span>📊</span> Síntese do Inventário
            </button>
            <button id="btn-editar-inv" class="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300">
              Configurar Inventário
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div>
            <span class="font-bold text-slate-700 block">Disciplina:</span>
            <span>${inv.disciplina || 'LCF0510 - Inventário Florestal'}</span>
          </div>
          <div>
            <span class="font-bold text-slate-700 block">Professores:</span>
            <span>${inv.professores || 'Matheus Pinheiro Ferreira e Jonathan Trautenmüller'}</span>
          </div>
          <div>
            <span class="font-bold text-slate-700 block">Monitor:</span>
            <span>${inv.monitor || 'Matheus Siqueira Barros'}</span>
          </div>
          <div>
            <span class="font-bold text-slate-700 block">Data & Turma:</span>
            <span>${inv.data || '—'} • ${inv.turma || 'Engenharia Florestal'}</span>
          </div>
        </div>
      </div>

      <!-- Resumo Rápido do Inventário -->
      <section class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="stat-card">
          <span class="label">Grupos Cadastrados</span>
          <span class="value font-mono">${grupos.length}</span>
          <span class="subtext">Equipes da disciplina</span>
        </div>
        <div class="stat-card">
          <span class="label">Total de Parcelas</span>
          <span class="value font-mono">${todasParcelas.length}</span>
          <span class="subtext">Distribuídas nos grupos</span>
        </div>
        <div class="stat-card">
          <span class="label">Árvores Registradas</span>
          <span class="value font-mono">${todasArvores.length}</span>
          <span class="subtext">No inventário completo</span>
        </div>
        <div class="stat-card">
          <span class="label">Área Total Amostrada</span>
          <span class="value font-mono text-base sm:text-lg">${formatarNumero(areaTotalHa, 3)} ha</span>
          <span class="subtext">${formatarNumero(areaTotalM2, 1)} m²</span>
        </div>
      </section>

      <!-- LISTA DE GRUPOS CADASTRADOS -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>👥</span> Grupos da Disciplina (${grupos.length})
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Selecione um grupo para visualizar suas parcelas, conferir as estatísticas atribuídas e baixar o CSV com todas as medições do grupo.
            </p>
          </div>
        </div>

        ${
          grupos.length === 0
            ? `
          <div class="bg-white rounded-xl p-10 border border-slate-200 text-center space-y-3">
            <p class="text-slate-600 font-medium">Nenhum grupo cadastrado neste inventário ainda.</p>
            <p class="text-xs text-slate-500">Cadastre o primeiro grupo para alocar as parcelas amostrais e medições de árvores.</p>
            <button id="btn-novo-grupo-empty" class="btn-primary">
              Cadastrar Primeiro Grupo
            </button>
          </div>
        `
            : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${(
              await Promise.all(
                grupos.map(async (g) => {
                  const parcelasGrupo = await listarParcelasPorGrupo(g.id);
                  let arvoresGrupoCount = 0;
                  let areaGrupoM2 = 0;
                  for (const p of parcelasGrupo) {
                    areaGrupoM2 += p.areaM2 || 0;
                    const pTrees = todasArvores.filter((t) => t.parcelaId === p.id);
                    arvoresGrupoCount += pTrees.length;
                  }
                  const areaGrupoHa = converterM2ParaHectares(areaGrupoM2);
                  const cor = corDoGrupo(g.id);

                  return `
                  <div class="rounded-xl border-2 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4" style="background:${cor.bg};border-color:${cor.border}">
                    <div class="space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <h4 class="font-bold text-lg leading-tight cursor-pointer" style="color:${cor.text}" data-action="abrir-grupo" data-id="${g.id}">
                          <span class="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style="background:${cor.solid}"></span>${g.nome}
                        </h4>
                        <span class="px-2 py-0.5 rounded text-xs font-bold border" style="background:${cor.soft};color:${cor.text};border-color:${cor.border}">
                          ${parcelasGrupo.length} parcela(s)
                        </span>
                      </div>

                      <div class="text-xs text-slate-600 space-y-1">
                        <p><strong class="text-slate-700">Integrantes:</strong> ${g.integrantes || 'Não especificados'}</p>
                        ${g.observacoes ? `<p class="text-slate-500 italic">${g.observacoes}</p>` : ''}
                      </div>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-3 text-xs flex justify-around border border-slate-100 text-center">
                      <div>
                        <span class="block font-bold text-emerald-900 text-base font-mono">${parcelasGrupo.length}</span>
                        <span class="text-slate-500">Parcelas</span>
                      </div>
                      <div>
                        <span class="block font-bold text-emerald-900 text-base font-mono">${arvoresGrupoCount}</span>
                        <span class="text-slate-500">Árvores</span>
                      </div>
                      <div>
                        <span class="block font-bold text-emerald-900 text-base font-mono">${formatarNumero(areaGrupoHa, 2)}</span>
                        <span class="text-slate-500">ha</span>
                      </div>
                    </div>

                    <div class="space-y-2 pt-1 border-t border-slate-100">
                      <div class="flex items-center gap-2">
                        <button data-action="abrir-grupo" data-id="${g.id}" class="btn-primary flex-1 text-xs py-2">
                          Abrir Grupo & Dashboard
                        </button>
                        <button data-action="editar-grupo" data-id="${g.id}" data-nome="${g.nome}" title="Editar Grupo" class="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                          ✏️
                        </button>
                      </div>
                      <!-- Botão Solicitado pelo Usuário: Baixar CSV completo deste grupo -->
                      <button data-action="baixar-csv-grupo" data-id="${g.id}" class="btn-secondary w-full text-xs py-1.5 flex items-center justify-center gap-1.5">
                        <span>📥</span> Baixar CSV Deste Grupo (Todas as Parcelas)
                      </button>
                    </div>
                  </div>
                `;
                })
              )
            ).join('')}
          </div>
        `
        }
      </section>
    </div>
  `;
}

// ----------------- Visão 4: Cadastro / Edição de Grupo -----------------

function renderGrupoForm(grupo?: Group): string {
  const isEditing = !!grupo;
  const inv = state.inventarioAtivo;

  return `
    <div class="max-w-xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
      <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            ${isEditing ? `Editar ${grupo.nome}` : 'Novo Grupo da Disciplina'}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">Inventário: ${inv?.nome || ''}</p>
        </div>
        <button id="btn-cancelar-grupo" class="text-slate-400 hover:text-slate-600 text-sm font-semibold">
          Cancelar
        </button>
      </div>

      <form id="form-grupo" class="space-y-4">
        <input type="hidden" id="grupo-id" value="${grupo?.id || ''}">

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Nome ou Identificação do Grupo *
          </label>
          <input type="text" id="grupo-nome" required class="field-input w-full"
            placeholder="Ex: Grupo 1, Grupo 2 — Talhão Norte..."
            value="${grupo?.nome || ''}">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Integrantes / Alunos do Grupo *
          </label>
          <textarea id="grupo-integrantes" required rows="3" class="field-input w-full text-sm"
            placeholder="Digite os nomes dos alunos que compõem o grupo (ex: Matheus Siqueira, João Silva, Maria Souza...)">${grupo?.integrantes || ''}</textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Observações do Grupo
          </label>
          <textarea id="grupo-obs" rows="2" class="field-input w-full text-sm"
            placeholder="Área ou talhão designado, turno de medição...">${grupo?.observacoes || ''}</textarea>
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" id="btn-cancelar-grupo-2" class="btn-secondary">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            ${isEditing ? 'Atualizar Grupo' : 'Salvar e Abrir Grupo'}
          </button>
        </div>
      </form>
    </div>
  `;
}

// ----------------- Visão 5: TELA DO GRUPO (Dashboard e Estatísticas do Grupo & Parcelas) -----------------

async function renderGrupoDetalhes(): Promise<string> {
  const inv = state.inventarioAtivo;
  const g = state.grupoAtivo;
  if (!inv || !g) return `<div class="p-6">Grupo ou inventário não selecionados.</div>`;

  const parcelas = await listarParcelasPorGrupo(g.id);
  const todasArvoresInv = await listarTodasArvoresPorInventario(inv.id);

  // Calcular métricas consolidadas DO GRUPO
  let totalArvoresGrupo = 0;
  let arvoresValidasGrupo = 0;
  let areaTotalGrupoM2 = 0;
  let somaAreasBasaisGrupo = 0;
  const especiesGrupoSet = new Set<string>();
  const dapsValidosGrupo: number[] = [];

  parcelas.forEach((p) => {
    areaTotalGrupoM2 += p.areaM2 || 0;
    const pTrees = todasArvoresInv.filter((t) => t.parcelaId === p.id);
    const stats = calcularEstatisticasParcela(p, pTrees);

    totalArvoresGrupo += stats.totalArvores;
    arvoresValidasGrupo += stats.arvoresValidas;
    somaAreasBasaisGrupo += stats.areaBasalTotal;

    pTrees.forEach((t) => {
      if (t.especie?.trim()) especiesGrupoSet.add(t.especie.trim());
      if (t.status === 'valida' && t.dap !== null) dapsValidosGrupo.push(t.dap);
    });
  });

  const areaTotalGrupoHa = converterM2ParaHectares(areaTotalGrupoM2);
  const mediaPonderadaGha = areaTotalGrupoHa > 0 ? somaAreasBasaisGrupo / areaTotalGrupoHa : null;
  const dapMedioGrupo =
    dapsValidosGrupo.length > 0
      ? dapsValidosGrupo.reduce((a, b) => a + b, 0) / dapsValidosGrupo.length
      : null;
  const cor = corDoGrupo(g.id);

  return `
    <div class="space-y-6">
      <!-- Navegação Hierárquica: Inventário > Grupo -->
      <div class="rounded-xl p-5 border-2 shadow-xs space-y-4" style="background:${cor.bg};border-color:${cor.border}">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2 text-xs">
              <button id="btn-voltar-inventario-detalhes" class="font-semibold flex items-center gap-1" style="color:${cor.text}">
                ← ${inv.nome}
              </button>
              <span style="color:${cor.border}">/</span>
              <span class="font-bold" style="color:${cor.text}">${g.nome}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold mt-1 flex items-center gap-2" style="color:${cor.text}">
              <span class="inline-block w-3.5 h-3.5 rounded-full" style="background:${cor.solid}"></span>
              ${g.nome}
            </h2>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button id="btn-nova-parcela-grupo" class="btn-primary text-xs sm:text-sm">
              <span>+</span> Nova Parcela neste Grupo
            </button>
            <button id="btn-baixar-csv-deste-grupo" class="btn-secondary text-xs sm:text-sm">
              <span>📥</span> Baixar CSV Deste Grupo
            </button>
            <button id="btn-editar-grupo-atual" class="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300">
              Editar Grupo
            </button>
          </div>
        </div>

        <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong>Integrantes / Alunos:</strong> ${g.integrantes}
          </div>
          <div class="text-slate-500">
            Disciplina: ${inv.disciplina || 'LCF0510'} • Professores: ${inv.professores || 'Matheus e Jonathan'}
          </div>
        </div>
      </div>

      <!-- DASHBOARD E ESTATÍSTICAS ATRIBUÍDAS A ESTE GRUPO (Conforme Solicitado) -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <span>📊</span> Dashboard e Estatísticas Atribuídas ao ${g.nome}
          </h3>
          <span class="text-xs text-slate-500 font-mono">Consolidado das parcelas do grupo</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div class="stat-card">
            <span class="label">Parcelas do Grupo</span>
            <span class="value font-mono">${parcelas.length}</span>
            <span class="subtext">Amostras do grupo</span>
          </div>
          <div class="stat-card">
            <span class="label">Árvores Medidas</span>
            <span class="value font-mono">${totalArvoresGrupo}</span>
            <span class="subtext text-emerald-700 font-semibold">${arvoresValidasGrupo} válidas</span>
          </div>
          <div class="stat-card">
            <span class="label">Espécies Registradas</span>
            <span class="value font-mono">${especiesGrupoSet.size}</span>
            <span class="subtext">Pelo grupo</span>
          </div>
          <div class="stat-card">
            <span class="label">Área Amostrada</span>
            <span class="value font-mono text-base sm:text-lg">${formatarNumero(areaTotalGrupoHa, 4)} ha</span>
            <span class="subtext">${formatarNumero(areaTotalGrupoM2, 1)} m²</span>
          </div>
          <div class="stat-card">
            <span class="label">Área Basal Total (G)</span>
            <span class="value font-mono text-emerald-800 text-base sm:text-lg">${formatarNumero(somaAreasBasaisGrupo, 4)} m²</span>
            <span class="subtext">Σ g_i do grupo</span>
          </div>
          <div class="stat-card bg-emerald-900 text-white border-emerald-950">
            <span class="label text-emerald-300">G/ha Médio do Grupo</span>
            <span class="value text-white font-mono text-base sm:text-lg">${formatarNumero(mediaPonderadaGha, 2)} m²/ha</span>
            <span class="subtext text-emerald-200">ΣG / ΣÁrea_ha</span>
          </div>
        </div>
      </section>

      <!-- TABELA DE PARCELAS DO GRUPO -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>📐</span> Parcelas Amostrais do ${g.nome} (${parcelas.length})
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Clique em "Coletar" para entrar com as árvores da parcela ou "Estatísticas" para ver os resultados individuais.
            </p>
          </div>
        </div>

        ${
          parcelas.length === 0
            ? `
          <div class="p-10 text-center space-y-3">
            <p class="text-slate-600 font-medium">Nenhuma parcela cadastrada para este grupo ainda.</p>
            <p class="text-xs text-slate-500">Cadastre a primeira parcela circular ou retangular para os integrantes do grupo iniciarem a coleta.</p>
            <button id="btn-nova-parcela-grupo-empty" class="btn-primary">
              Cadastrar Parcela no ${g.nome}
            </button>
          </div>
        `
            : `
          <div class="overflow-x-auto">
            <table class="inventory-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome da Parcela</th>
                  <th>Formato</th>
                  <th>Dimensões</th>
                  <th>Área (m²)</th>
                  <th>Área (ha)</th>
                  <th>Árvores (Val/Tot)</th>
                  <th>G Total (m²)</th>
                  <th>G/ha (m²/ha)</th>
                  <th>Status</th>
                  <th class="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${parcelas
                  .map((p) => {
                    const pTrees = todasArvoresInv.filter((t) => t.parcelaId === p.id);
                    const stats = calcularEstatisticasParcela(p, pTrees);

                    let dimTexto = '';
                    if (p.dimensoes.tipo === 'circular') {
                      dimTexto = `${p.dimensoes.tipoEntrada === 'raio' ? 'Raio' : 'Diâmetro'}: ${p.dimensoes.valorOriginal} m`;
                    } else {
                      dimTexto = `${p.dimensoes.comprimento} × ${p.dimensoes.largura} m`;
                    }

                    const statusBadge =
                      p.status === 'concluida'
                        ? `<span class="badge-success">Concluída</span>`
                        : p.status === 'em_andamento'
                        ? `<span class="badge-warning">Em Coleta</span>`
                        : `<span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">Não iniciada</span>`;

                    return `
                    <tr>
                      <td class="font-bold font-mono text-emerald-900">${p.codigo}</td>
                      <td class="font-semibold text-slate-900 max-w-xs">${p.nome || '<span class="text-slate-400 font-normal italic">—</span>'}</td>
                      <td class="capitalize text-xs">${p.formato}</td>
                      <td class="text-xs text-slate-600 font-mono">${dimTexto}</td>
                      <td class="font-mono">${formatarNumero(p.areaM2, 1)}</td>
                      <td class="font-mono">${formatarNumero(p.areaHa, 4)}</td>
                      <td class="font-mono">
                        <span class="font-bold text-emerald-800">${stats.arvoresValidas}</span> / ${stats.totalArvores}
                      </td>
                      <td class="font-mono text-emerald-900 font-semibold">${formatarNumero(stats.areaBasalTotal, 4)}</td>
                      <td class="font-mono text-emerald-900 font-bold">${formatarNumero(stats.areaBasalPorHectare, 2)}</td>
                      <td>${statusBadge}</td>
                      <td class="text-right space-x-1 whitespace-nowrap">
                        <button data-action="coletar-parcela" data-id="${p.id}" class="btn-primary text-xs py-1.5 px-3">
                          Coletar
                        </button>
                        <button data-action="gps-parcela" data-id="${p.id}" title="${
                          p.formato === 'circular'
                            ? 'Cadastrar GPS do centro'
                            : 'Cadastrar GPS dos 4 cantos'
                        }" class="px-2 py-1.5 rounded text-xs border ${
                          temCoordenadasRegistradas(p.coordenadas)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100'
                        }">
                          📍 GPS
                        </button>
                        <button data-action="resultados-parcela" data-id="${p.id}" title="Estatísticas da Parcela" class="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                          📊
                        </button>
                        <button data-action="editar-parcela" data-id="${p.id}" title="Editar Parcela" class="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                          ⚙️
                        </button>
                        <button data-action="excluir-parcela" data-id="${p.id}" data-codigo="${p.codigo}" title="Excluir" class="px-2 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        }
      </section>
    </div>
  `;
}

// ----------------- Visão 6: Cadastro / Edição de Parcela -----------------

function renderParcelaForm(parcela?: Plot): string {
  const isEditing = !!parcela;
  const inv = state.inventarioAtivo;
  const grupo = state.grupoAtivo;
  const hoje = new Date().toISOString().split('T')[0];

  const formatoAtual: PlotFormat = parcela?.formato || 'circular';
  const circularDims =
    parcela?.dimensoes.tipo === 'circular'
      ? parcela.dimensoes
      : { tipo: 'circular' as const, tipoEntrada: 'raio' as const, valorOriginal: 10, unidade: 'm' as const };
  const rectangularDims =
    parcela?.dimensoes.tipo === 'retangular'
      ? parcela.dimensoes
      : { tipo: 'retangular' as const, comprimento: 25, largura: 20, unidade: 'm' as const };

  return `
    <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
      <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            ${isEditing ? `Editar Parcela ${parcela.codigo}` : 'Nova Parcela Amostral'}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Grupo: <strong>${grupo?.nome || 'Geral'}</strong> • Inventário: ${inv?.nome || ''}
          </p>
        </div>
        <button id="btn-cancelar-parc" class="text-slate-400 hover:text-slate-600 text-sm font-semibold">
          Cancelar
        </button>
      </div>

      <form id="form-parcela" class="space-y-5">
        <input type="hidden" id="parc-id" value="${parcela?.id || ''}">
        <input type="hidden" id="parc-grupo-id" value="${parcela?.grupoId || grupo?.id || ''}">

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Código da Parcela *
            </label>
            <input type="text" id="parc-codigo" required class="field-input w-full font-mono font-bold"
              placeholder="Ex: P01, P02..."
              value="${parcela?.codigo || 'P01'}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nome da Parcela <span class="normal-case font-normal text-slate-400">(opcional)</span>
            </label>
            <input type="text" id="parc-nome" class="field-input w-full"
              placeholder="Ex: Talhão Experimental, Borda da Mata..."
              value="${parcela?.nome || ''}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Data da Coleta
            </label>
            <input type="date" id="parc-data" class="field-input w-full"
              value="${parcela?.data || hoje}">
          </div>
        </div>

        <div class="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
          <strong class="text-slate-800">Integrantes do grupo:</strong> ${grupo?.integrantes || 'Não informados no grupo'}
        </div>

        <!-- Seleção de Formato -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-2">
            Formato da Parcela *
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              formatoAtual === 'circular' ? 'border-emerald-700 bg-emerald-50/60 font-semibold' : 'border-slate-200'
            }">
              <input type="radio" name="parc-formato" value="circular" ${
                formatoAtual === 'circular' ? 'checked' : ''
              } class="text-emerald-700">
              <div>
                <span class="block text-sm text-slate-900">Circular</span>
                <span class="block text-xs text-slate-500">Raio ou Diâmetro (πr²)</span>
              </div>
            </label>

            <label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              formatoAtual === 'retangular' ? 'border-emerald-700 bg-emerald-50/60 font-semibold' : 'border-slate-200'
            }">
              <input type="radio" name="parc-formato" value="retangular" ${
                formatoAtual === 'retangular' ? 'checked' : ''
              } class="text-emerald-700">
              <div>
                <span class="block text-sm text-slate-900">Retangular</span>
                <span class="block text-xs text-slate-500">Comprimento × Largura</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Dimensões Circulares -->
        <div id="container-dims-circular" class="${formatoAtual === 'circular' ? '' : 'hidden'} p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <span class="block text-xs font-bold text-slate-700 uppercase">Dimensões da Parcela Circular</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-600 mb-1">Medida informada</label>
              <select id="parc-circ-tipo-entrada" class="field-input w-full">
                <option value="raio" ${circularDims.tipoEntrada === 'raio' ? 'selected' : ''}>Raio (m)</option>
                <option value="diametro" ${circularDims.tipoEntrada === 'diametro' ? 'selected' : ''}>Diâmetro (m)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-600 mb-1">Valor (metros)</label>
              <input type="number" step="0.01" min="0.1" id="parc-circ-valor" class="field-input w-full"
                value="${circularDims.valorOriginal}">
            </div>
          </div>
        </div>

        <!-- Dimensões Retangulares -->
        <div id="container-dims-retangular" class="${formatoAtual === 'retangular' ? '' : 'hidden'} p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <span class="block text-xs font-bold text-slate-700 uppercase">Dimensões da Parcela Retangular</span>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-600 mb-1">Comprimento (m)</label>
              <input type="number" step="0.01" min="0.1" id="parc-rect-comp" class="field-input w-full"
                value="${rectangularDims.comprimento}">
            </div>
            <div>
              <label class="block text-xs text-slate-600 mb-1">Largura (m)</label>
              <input type="number" step="0.01" min="0.1" id="parc-rect-larg" class="field-input w-full"
                value="${rectangularDims.largura}">
            </div>
          </div>
        </div>

        <!-- Prévia da Área Calculada -->
        <div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Área Calculada Automaticamente</span>
            <div class="flex items-baseline gap-3 mt-0.5">
              <span id="preview-area-m2" class="text-xl font-bold font-mono text-emerald-950">500.00 m²</span>
              <span id="preview-area-ha" class="text-sm font-semibold font-mono text-emerald-700">0.0500 ha</span>
            </div>
          </div>
          <span class="text-2xl">📐</span>
        </div>

        <!-- Seção de Geolocalização Opcional -->
        <div class="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span class="block text-xs font-bold text-slate-700 uppercase">GPS da parcela (centro ou 4 cantos)</span>
              <p class="text-xs text-slate-500">Disponível no celular. Circular: centro · Retangular: 4 cantos.</p>
            </div>
            <button type="button" id="btn-abrir-gps-modal" class="btn-secondary text-xs py-1 px-3">
              📍 Cadastrar pontos GPS
            </button>
          </div>
          <div id="resumo-coords-parcela" class="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200 font-mono">
            ${
              parcela?.coordenadas && parcela.coordenadas.tipo !== 'nenhum'
                ? `Tipo: ${parcela.coordenadas.tipo} | ${
                    parcela.coordenadas.centro
                      ? formatarCoordenada(parcela.coordenadas.centro.latitude, parcela.coordenadas.centro.longitude)
                      : `${parcela.coordenadas.cantos?.length || 0} cantos registrados`
                  }`
                : 'Nenhuma coordenada registrada para esta parcela.'
            }
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Observações da Parcela
          </label>
          <textarea id="parc-obs" rows="2" class="field-input w-full text-sm"
            placeholder="Relevo, tipo de solo, vegetação rasteira, marcos físicos...">${parcela?.observacoes || ''}</textarea>
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" id="btn-cancelar-parc-2" class="btn-secondary">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            ${isEditing ? 'Salvar Alterações' : 'Criar Parcela e Iniciar Coleta'}
          </button>
        </div>
      </form>
    </div>
  `;
}

// ----------------- Visão 7: Coleta de Árvores -----------------

async function renderColetaArvores(): Promise<string> {
  const inv = state.inventarioAtivo;
  const g = state.grupoAtivo;
  const p = state.parcelaAtiva;
  if (!inv || !p) {
    return `<div class="p-6">Parcela ou inventário não selecionados.</div>`;
  }

  const arvores = await listarArvoresPorParcela(p.id);
  const todasArvoresInv = await listarTodasArvoresPorInventario(inv.id);

  const especiesUsadasSet = new Set<string>();
  todasArvoresInv.forEach((t) => {
    if (t.especie?.trim()) especiesUsadasSet.add(t.especie.trim());
  });

  let proximoNumero = 1;
  if (arvores.length > 0) {
    const numerosExistentes = arvores
      .map((t) => Number(t.numero))
      .filter((n) => !isNaN(n) && n > 0);
    if (numerosExistentes.length > 0) {
      proximoNumero = Math.max(...numerosExistentes) + 1;
    } else {
      proximoNumero = arvores.length + 1;
    }
  }

  const stats = calcularEstatisticasParcela(p, arvores);

  let arvoresExibidas = arvores;
  if (state.filtroEspecie) {
    const filtro = state.filtroEspecie.toLowerCase();
    arvoresExibidas = arvores.filter((t) =>
      (t.especie || 'não identificada').toLowerCase().includes(filtro)
    );
  }

  const cor = corDoGrupo(g?.id);

  return `
    <div class="space-y-2 sm:space-y-4">
      <!-- Barra Superior de Navegação -->
      <div class="rounded-lg p-2 sm:p-3 border-2 shadow-xs flex flex-wrap items-center justify-between gap-2" style="background:${cor.bg};border-color:${cor.border}">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-xs sm:text-sm">
            <button id="btn-voltar-ao-grupo" class="font-semibold flex items-center gap-1 shrink-0" style="color:${cor.text}">
              ← ${g?.nome || 'Grupo'}
            </button>
            <span style="color:${cor.border}">/</span>
            <span class="font-bold font-mono" style="color:${cor.text}">${p.codigo}</span>
            ${p.nome ? `<span class="font-semibold truncate hidden sm:inline" style="color:${cor.text}">— ${p.nome}</span>` : ''}
          </div>
          <p class="text-[0.65rem] sm:text-xs mt-0.5 truncate" style="color:${cor.text}">
            ${formatarNumero(p.areaM2, 1)} m² · ${stats.totalArvores} árv.
          </p>
        </div>

        <div class="flex items-center gap-1.5">
          <button id="btn-finalizar-parcela" class="btn-primary text-[0.7rem] sm:text-xs py-1.5 px-2.5 sm:px-3 shadow-sm bg-emerald-700 hover:bg-emerald-800">
            ✓ Finalizar
          </button>
          <button id="btn-ver-estatisticas" class="btn-secondary text-[0.7rem] sm:text-xs py-1.5 px-2">
            📊
          </button>
        </div>
      </div>

      <!-- Resumo Compacto da Parcela -->
      <section class="hidden sm:grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">Árvores Totais</span>
          <span class="value text-lg" id="live-total-arv">${stats.totalArvores}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">Válidas (n)</span>
          <span class="value text-lg text-emerald-700" id="live-validas-arv">${stats.arvoresValidas}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">Espécies</span>
          <span class="value text-lg">${stats.totalEspecies}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">Área (m²)</span>
          <span class="value text-lg font-mono">${formatarNumero(p.areaM2, 0)}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">CAP Médio</span>
          <span class="value text-lg font-mono">${formatarNumero(stats.capMedio, 1, ' cm')}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">DAP Médio</span>
          <span class="value text-lg font-mono">${formatarNumero(stats.dapMedio, 1, ' cm')}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">G Total (m²)</span>
          <span class="value text-lg font-mono text-emerald-800">${formatarNumero(stats.areaBasalTotal, 4)}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">G/ha (m²/ha)</span>
          <span class="value text-lg font-mono text-emerald-900 font-bold">${formatarNumero(stats.areaBasalPorHectare, 2)}</span>
        </div>
      </section>

      <!-- BARRA DE ENTRADA RÁPIDA DE ÁRVORES -->
      <section class="bg-white rounded-xl border-2 border-emerald-800 shadow-md p-4 sm:p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emerald-600 animate-pulse"></span>
            <h3 class="font-bold text-slate-900 text-sm sm:text-base uppercase tracking-wider">
              Entrada Rápida de Medição
            </h3>
          </div>
          <span class="text-xs text-slate-500 hidden sm:inline">Pressione Enter para salvar e ir para a próxima</span>
        </div>

        <form id="form-coleta-arvore" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nº Árvore *
            </label>
            <input type="number" id="input-arv-numero" required class="field-input w-full font-mono font-bold text-center"
              value="${proximoNumero}" min="1">
          </div>

          <div class="sm:col-span-3 autocomplete-container">
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Espécie (Opcional)
            </label>
            <input type="text" id="input-arv-especie" class="field-input w-full"
              placeholder="Digite o nome ou selecione..."
              autocomplete="off">
            <div id="autocomplete-lista" class="autocomplete-dropdown hidden"></div>
          </div>

          <div class="sm:col-span-2">
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold text-slate-900 uppercase">
                CAP (cm) *
              </label>
              <span id="preview-dap-live" class="text-xs font-mono font-bold text-emerald-800">DAP: —</span>
            </div>
            <input type="number" step="0.1" min="0.1" inputmode="decimal" id="input-arv-cap"
              class="field-input w-full font-mono text-lg font-bold bg-emerald-50/40 border-emerald-600 text-slate-900"
              placeholder="Ex: 58.5">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              H (m) <span class="normal-case font-normal text-slate-400">(opc.)</span>
            </label>
            <input type="number" step="0.1" min="0" inputmode="decimal" id="input-arv-altura"
              class="field-input w-full font-mono"
              placeholder="Altura">
          </div>

          <div class="sm:col-span-3 flex gap-2">
            <button type="submit" id="btn-adicionar-arvore" class="btn-primary w-full py-3 text-sm font-bold shadow-sm">
              <span>+</span> Adicionar
            </button>
          </div>

          ${
            p.formato === 'circular'
              ? `
          <div class="sm:col-span-3">
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Azimute (°) <span class="normal-case font-normal text-slate-400">(opc.)</span>
            </label>
            <input type="number" step="0.1" min="0" max="360" inputmode="decimal" id="input-arv-azimute"
              class="field-input w-full font-mono" placeholder="0–360 do Norte">
          </div>
          <div class="sm:col-span-3">
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Dist. centro (m) <span class="normal-case font-normal text-slate-400">(opc.)</span>
            </label>
            <input type="number" step="0.01" min="0" inputmode="decimal" id="input-arv-dist"
              class="field-input w-full font-mono" placeholder="metros">
          </div>
          `
              : ''
          }

          <div class="sm:col-span-12 flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <div class="flex items-center gap-4">
              <span><strong>DAP calculado:</strong> <span id="live-dap-val" class="font-mono text-emerald-900 font-bold">—</span></span>
              <span><strong>Área transversal (g):</strong> <span id="live-g-val" class="font-mono text-emerald-900 font-bold">—</span></span>
            </div>
            <div class="flex items-center gap-2 mt-1 sm:mt-0">
              <input type="text" id="input-arv-obs" placeholder="Observações opcionais (fuste, bifurcação...)"
                class="field-input py-1 text-xs w-60">
            </div>
          </div>
        </form>
      </section>

      <!-- Lista / Planilha de Medições Registradas -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div class="flex items-center gap-3">
            <h3 class="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>📋</span> Planilha de Medições (${arvores.length} árvores)
            </h3>
            ${
              stats.arvoresIncompletas > 0
                ? `<span class="badge-warning text-[0.7rem]">${stats.arvoresIncompletas} incompleta(s)</span>`
                : ''
            }
          </div>

          <div class="flex items-center gap-2">
            <input type="text" id="filtro-especie-input" placeholder="Filtrar por espécie..."
              value="${state.filtroEspecie}" class="field-input py-1 px-2.5 text-xs w-48">
            ${
              state.filtroEspecie
                ? `<button id="btn-limpar-filtro" class="text-xs text-slate-500 hover:text-slate-800">Limpar</button>`
                : ''
            }
          </div>
        </div>

        ${
          arvores.length === 0
            ? `
          <div class="p-8 text-center text-slate-500 text-sm space-y-2">
            <p>Nenhuma árvore cadastrada nesta parcela ainda.</p>
            <p class="text-xs text-slate-400">Utilize a barra de entrada rápida acima para começar a registrar.</p>
          </div>
        `
            : `
          <div class="overflow-x-auto max-h-[500px]">
            <table class="inventory-table">
              <thead class="sticky top-0 z-10">
                <tr>
                  <th class="w-16">Nº</th>
                  <th>Espécie</th>
                  <th>CAP (cm)</th>
                  <th>DAP (cm)</th>
                  <th>H (m)</th>
                  ${p.formato === 'circular' ? '<th>Azimute (°)</th><th>Dist. centro (m)</th>' : ''}
                  <th>Área Transv. g (m²)</th>
                  <th>Status</th>
                  <th>Observações</th>
                  <th class="text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${arvoresExibidas
                  .map((t) => {
                    const statusClass =
                      t.status === 'valida'
                        ? 'badge-success'
                        : t.status === 'incompleta'
                        ? 'badge-warning'
                        : 'bg-rose-100 text-rose-800';

                    return `
                    <tr class="${t.status !== 'valida' ? 'bg-amber-50/40' : ''}">
                      <td class="font-bold font-mono text-emerald-950 text-center">${t.numero}</td>
                      <td class="font-medium text-slate-800">
                        ${t.especie ? t.especie : '<span class="text-slate-400 italic">Não identificada</span>'}
                      </td>
                      <td class="font-mono font-semibold">${formatarNumero(t.cap, 1)}</td>
                      <td class="font-mono font-bold text-emerald-900">${formatarNumero(t.dap, 2)}</td>
                      <td class="font-mono">${t.alturaH != null ? formatarNumero(t.alturaH, 1) : '—'}</td>
                      ${
                        p.formato === 'circular'
                          ? `<td class="font-mono">${t.azimute != null ? formatarNumero(t.azimute, 1) : '—'}</td>
                             <td class="font-mono">${t.distanciaCentro != null ? formatarNumero(t.distanciaCentro, 2) : '—'}</td>`
                          : ''
                      }
                      <td class="font-mono text-emerald-800">${formatarNumero(t.g, 6)}</td>
                      <td>
                        <span class="${statusClass} text-[0.7rem] px-2 py-0.5 rounded-full inline-block">
                          ${t.status === 'valida' ? 'Válida' : t.status === 'incompleta' ? 'Incompleta' : 'Inválida'}
                        </span>
                      </td>
                      <td class="text-xs text-slate-500 max-w-xs truncate" title="${t.observacoes || ''}">${t.observacoes || '—'}</td>
                      <td class="text-right space-x-1 whitespace-nowrap">
                        <button data-action="editar-arvore" data-id="${t.id}" title="Editar" class="p-1.5 rounded hover:bg-slate-200 text-slate-700 text-xs">
                          ✏️
                        </button>
                        <button data-action="excluir-arvore" data-id="${t.id}" data-num="${t.numero}" title="Excluir" class="p-1.5 rounded hover:bg-rose-100 text-rose-700 text-xs">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        }
      </section>
    </div>
  `;
}

// ----------------- Visão 8: Resultados da Parcela -----------------

async function renderParcelaResultados(): Promise<string> {
  const p = state.parcelaAtiva;
  const g = state.grupoAtivo;
  const inv = state.inventarioAtivo;
  if (!p || !inv) return `<div class="p-6">Parcela não selecionada.</div>`;

  const arvores = await listarArvoresPorParcela(p.id);
  const stats = calcularEstatisticasParcela(p, arvores);
  const espResumos = calcularResumoEspecies(p, arvores);

  return `
    <div class="space-y-6">
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <button id="btn-voltar-coleta" class="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1">
              ← Coleta da Parcela
            </button>
            <span class="text-slate-300">/</span>
            <span class="text-xs text-emerald-800 font-bold">Resultados Estatísticos</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900 mt-1">
            Parcela ${p.codigo}${p.nome ? ` — ${p.nome}` : ''}
          </h2>
          <p class="text-xs text-slate-600 mt-0.5">
            <strong>Grupo:</strong> ${g?.nome || 'Geral'} • <strong>Inventariante:</strong> ${p.inventariante || 'Não especificado'} • <strong>Área:</strong> ${formatarNumero(p.areaM2, 1)} m² (${formatarNumero(p.areaHa, 4)} ha)
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button id="btn-reabrir-parcela" class="btn-secondary text-xs sm:text-sm py-2 px-3">
            ✏️ Reabrir Coleta
          </button>
          <button id="btn-exportar-csv-parcela" class="btn-primary text-xs sm:text-sm py-2 px-4">
            📥 Exportar CSV da Parcela
          </button>
        </div>
      </div>

      <!-- 12 Indicadores Obrigatórios -->
      <section class="space-y-3">
        <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Estatísticas Descritivas Obrigatórias da Parcela
        </h3>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div class="stat-card">
            <span class="label">Árvores Cadastradas</span>
            <span class="value">${stats.totalArvores}</span>
            <span class="subtext">${stats.arvoresIncompletas} incompleta(s)</span>
          </div>

          <div class="stat-card">
            <span class="label">Árvores Válidas (n)</span>
            <span class="value text-emerald-700">${stats.arvoresValidas}</span>
            <span class="subtext">Com CAP válido para cálculos</span>
          </div>

          <div class="stat-card">
            <span class="label">Espécies Identificadas</span>
            <span class="value">${stats.totalEspecies}</span>
            <span class="subtext">Riqueza na parcela</span>
          </div>

          <div class="stat-card">
            <span class="label">CAP Médio</span>
            <span class="value font-mono">${formatarNumero(stats.capMedio, 2, ' cm')}</span>
            <span class="subtext">Média aritmética dos CAPs</span>
          </div>

          <div class="stat-card">
            <span class="label">DAP Médio</span>
            <span class="value font-mono text-emerald-900">${formatarNumero(stats.dapMedio, 2, ' cm')}</span>
            <span class="subtext">Média dos DAPs válidos</span>
          </div>

          <div class="stat-card">
            <span class="label">DAP Mediano</span>
            <span class="value font-mono">${formatarNumero(stats.dapMediano, 2, ' cm')}</span>
            <span class="subtext">${stats.arvoresValidas % 2 === 0 ? 'Média dos 2 centrais (par)' : 'Valor central (ímpar)'}</span>
          </div>

          <div class="stat-card">
            <span class="label">Variância Amostral DAP (s²)</span>
            <span class="value font-mono">
              ${stats.dapVariancia !== null ? formatarNumero(stats.dapVariancia, 4, ' cm²') : '<span class="text-sm text-slate-400">Indisponível (n < 2)</span>'}
            </span>
            <span class="subtext">Graus de liberdade (n − 1)</span>
          </div>

          <div class="stat-card">
            <span class="label">Desvio Padrão Amostral (s)</span>
            <span class="value font-mono">
              ${stats.dapDesvioPadrao !== null ? formatarNumero(stats.dapDesvioPadrao, 2, ' cm') : '<span class="text-sm text-slate-400">Indisponível (n < 2)</span>'}
            </span>
            <span class="subtext">s = √s²</span>
          </div>

          <div class="stat-card">
            <span class="label">DAP Mínimo e Máximo</span>
            <span class="value text-base font-mono">
              ${formatarNumero(stats.dapMinimo, 1)} a ${formatarNumero(stats.dapMaximo, 1)} cm
            </span>
            <span class="subtext">Amplitude observada</span>
          </div>

          <div class="stat-card">
            <span class="label">Área Basal Total (G_parcela)</span>
            <span class="value font-mono text-emerald-800">${formatarNumero(stats.areaBasalTotal, 4)} m²</span>
            <span class="subtext">G = Σ g_i</span>
          </div>

          <div class="stat-card col-span-2 bg-emerald-900 text-white border-emerald-950">
            <span class="label text-emerald-300">Área Basal por Hectare (G/ha)</span>
            <span class="value text-white font-mono text-2xl sm:text-3xl">${formatarNumero(stats.areaBasalPorHectare, 2)} m²/ha</span>
            <span class="subtext text-emerald-200">Gha = G_parcela / Área_ha (${formatarNumero(p.areaHa, 4)} ha)</span>
          </div>
        </div>
      </section>

      <!-- Resumo por Espécie -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>🌿</span> Estrutura e Resumo por Espécie (${espResumos.length})
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              * Nota metodológica: A área basal por hectare de cada espécie utiliza a área total da parcela como denominador.
            </p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Espécie</th>
                <th>Árvores Válidas (n)</th>
                <th>DAP Médio (cm)</th>
                <th>DAP Mediano (cm)</th>
                <th>Variância s² (cm²)</th>
                <th>Desvio Padrão s (cm)</th>
                <th>Área Basal Total (m²)</th>
                <th>Área Basal por ha (m²/ha)</th>
                <th>Proporção (%)</th>
              </tr>
            </thead>
            <tbody>
              ${espResumos
                .map((esp) => `
                <tr>
                  <td class="font-bold text-slate-900">${esp.especie}</td>
                  <td class="font-mono text-center font-semibold text-emerald-900">${esp.arvoresValidas}</td>
                  <td class="font-mono">${formatarNumero(esp.dapMedio, 2)}</td>
                  <td class="font-mono">${formatarNumero(esp.dapMediano, 2)}</td>
                  <td class="font-mono">${esp.dapVariancia !== null ? formatarNumero(esp.dapVariancia, 3) : '—'}</td>
                  <td class="font-mono">${esp.dapDesvioPadrao !== null ? formatarNumero(esp.dapDesvioPadrao, 2) : '—'}</td>
                  <td class="font-mono text-emerald-900 font-semibold">${formatarNumero(esp.areaBasalTotal, 4)}</td>
                  <td class="font-mono text-emerald-900 font-bold">${formatarNumero(esp.areaBasalPorHectare, 2)}</td>
                  <td class="font-mono text-slate-600">${formatarNumero(esp.proporcaoAreaBasal, 1)}%</td>
                </tr>
              `)
                .join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Lista de Árvores da Parcela -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-base">
            Medições Individuais das Árvores (${arvores.length})
          </h3>
        </div>
        <div class="overflow-x-auto max-h-96">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Espécie</th>
                <th>CAP (cm)</th>
                <th>DAP (cm)</th>
                <th>g (m²)</th>
                <th>Status</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${arvores
                .map((t) => `
                <tr>
                  <td class="font-mono font-bold text-center">${t.numero}</td>
                  <td>${t.especie || '<span class="italic text-slate-400">Não identificada</span>'}</td>
                  <td class="font-mono">${formatarNumero(t.cap, 1)}</td>
                  <td class="font-mono font-bold text-emerald-900">${formatarNumero(t.dap, 2)}</td>
                  <td class="font-mono">${formatarNumero(t.g, 6)}</td>
                  <td>
                    <span class="${t.status === 'valida' ? 'badge-success' : 'badge-warning'} text-[0.7rem]">
                      ${t.status === 'valida' ? 'Válida' : 'Incompleta'}
                    </span>
                  </td>
                  <td class="text-xs text-slate-500">${t.observacoes || '—'}</td>
                </tr>
              `)
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

// ----------------- Visão 9: Síntese Geral do Inventário -----------------

async function renderInventarioSintese(): Promise<string> {
  const inv = state.inventarioAtivo;
  if (!inv) return `<div class="p-6">Inventário não selecionado.</div>`;

  const parcelas = await listarParcelasPorInventario(inv.id);
  const treesByPlot: { [plotId: string]: Tree[] } = {};
  for (const p of parcelas) {
    treesByPlot[p.id] = await listarArvoresPorParcela(p.id);
  }

  const sintese = calcularSinteseInventario(parcelas, treesByPlot);

  return `
    <div class="space-y-6">
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <button id="btn-voltar-inventario-sintese" class="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1">
              ← ${inv.nome}
            </button>
            <span class="text-slate-300">/</span>
            <span class="text-xs text-emerald-800 font-bold">Síntese Geral</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900 mt-1">
            Síntese Geral: ${inv.nome}
          </h2>
          <p class="text-xs text-slate-600 mt-0.5">
            ${inv.disciplina || 'LCF0510 - Inventário Florestal'} • Professores: ${inv.professores || 'Matheus e Jonathan'} • Monitor: ${inv.monitor || 'Matheus Siqueira Barros'}
          </p>
        </div>

        <button id="btn-exportar-sintese-csv" class="btn-primary text-xs sm:text-sm py-2 px-4">
          📥 Exportar Resumo do Inventário
        </button>
      </div>

      <section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="stat-card">
          <span class="label">Total de Parcelas</span>
          <span class="value">${sintese.totalParcelas}</span>
        </div>
        <div class="stat-card">
          <span class="label">Árvores Totais</span>
          <span class="value">${sintese.totalArvores}</span>
          <span class="subtext">${sintese.totalArvoresValidas} válidas</span>
        </div>
        <div class="stat-card">
          <span class="label">Total de Espécies</span>
          <span class="value">${sintese.totalEspecies}</span>
        </div>
        <div class="stat-card">
          <span class="label">Área Amostrada</span>
          <span class="value font-mono">${formatarNumero(sintese.areaTotalAmostradaHa, 4)} ha</span>
          <span class="subtext">${formatarNumero(sintese.areaTotalAmostradaM2, 1)} m²</span>
        </div>
        <div class="stat-card">
          <span class="label">Soma Áreas Basais (G)</span>
          <span class="value font-mono text-emerald-800">${formatarNumero(sintese.somaAreasBasais, 4)} m²</span>
        </div>
        <div class="stat-card">
          <span class="label">DAP Médio Geral</span>
          <span class="value font-mono text-emerald-900">${formatarNumero(sintese.dapMedioGeral, 2, ' cm')}</span>
        </div>
      </section>

      <!-- Tabela Comparativa entre Parcelas -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <h3 class="font-bold text-slate-900 text-base">
            Comparação Detalhada entre Parcelas
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome da Parcela</th>
                <th>Inventariante</th>
                <th>Formato</th>
                <th>Área (m²)</th>
                <th>Área (ha)</th>
                <th>Árvores Válidas</th>
                <th>DAP Médio (cm)</th>
                <th>Área Basal Total (m²)</th>
                <th>Área Basal por ha (m²/ha)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sintese.parcelasResumo
                .map((pr) => `
                <tr>
                  <td class="font-bold font-mono text-emerald-900">${pr.codigo}</td>
                  <td class="font-semibold text-slate-800">${pr.nome || '—'}</td>
                  <td class="text-xs text-slate-600">${pr.inventariante || '—'}</td>
                  <td class="capitalize">${pr.formato}</td>
                  <td class="font-mono">${formatarNumero(pr.areaM2, 1)}</td>
                  <td class="font-mono">${formatarNumero(pr.areaHa, 4)}</td>
                  <td class="font-mono">${pr.arvoresValidas} / ${pr.totalArvores}</td>
                  <td class="font-mono">${formatarNumero(pr.dapMedio, 2)}</td>
                  <td class="font-mono text-emerald-900 font-semibold">${formatarNumero(pr.areaBasalTotal, 4)}</td>
                  <td class="font-mono text-emerald-900 font-bold">${formatarNumero(pr.areaBasalPorHectare, 2)}</td>
                  <td>
                    <span class="${pr.status === 'concluida' ? 'badge-success' : 'badge-warning'} text-[0.7rem]">
                      ${pr.status === 'concluida' ? 'Concluída' : 'Em andamento'}
                    </span>
                  </td>
                </tr>
              `)
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

// ----------------- Visão 10: Exportação e Backup -----------------

async function renderExportacao(): Promise<string> {
  return `
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>📥</span> Exportação de Dados e Backup
        </h2>
        <p class="text-xs text-slate-600 mt-1">
          Exporte os dados em formatos abertos e padronizados para Excel, LibreOffice, R, Python ou SIG.
        </p>

        <div class="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span class="block text-xs font-bold text-slate-700 uppercase">Delimitador do CSV:</span>
            <span class="text-xs text-slate-500">
              Ponto-e-vírgula é o padrão para Excel em português (Brasil com vírgula decimal).
            </span>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input type="radio" name="delimitador-csv" value=";" ${state.delimitadorCSV === ';' ? 'checked' : ''}>
              <span>Ponto-e-vírgula (;) — Excel Brasil</span>
            </label>
            <label class="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input type="radio" name="delimitador-csv" value="," ${state.delimitadorCSV === ',' ? 'checked' : ''}>
              <span>Vírgula (,) — R / Python / US</span>
            </label>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">🌳</span>
              <h3 class="font-bold text-slate-900 text-base">1. Dados Individuais por Árvore</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Uma linha por árvore de todos os inventários e grupos, contendo parcela, inventariante, dimensões, CAP, DAP, g, status e GPS.
            </p>
          </div>
          <button id="btn-export-arvores" class="btn-primary w-full text-xs py-2.5">
            Baixar arvores_individuais.csv
          </button>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">📐</span>
              <h3 class="font-bold text-slate-900 text-base">2. Resumo por Parcela</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Uma linha por parcela, contendo código, nome, inventariante, área, N de árvores, médias de DAP, variância amostral, G e G/ha.
            </p>
          </div>
          <button id="btn-export-parcelas" class="btn-primary w-full text-xs py-2.5">
            Baixar resumo_parcelas.csv
          </button>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">🌿</span>
              <h3 class="font-bold text-slate-900 text-base">3. Resumo por Espécie</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Uma linha por espécie e parcela, contendo N de árvores, DAP médio, mediana, variância, desvio padrão, área basal e G/ha.
            </p>
          </div>
          <button id="btn-export-especies" class="btn-primary w-full text-xs py-2.5">
            Baixar resumo_especies.csv
          </button>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">💾</span>
              <h3 class="font-bold text-slate-900 text-base">4. Backup Completo (JSON)</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Arquivo estruturado com inventários, grupos, parcelas, árvores e configurações.
            </p>
          </div>
          <button id="btn-export-json" class="btn-secondary w-full text-xs py-2.5">
            Baixar backup_completo.json
          </button>
        </div>
      </div>

      <section class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
          <span>🔄</span> Restaurar Backup JSON
        </h3>
        <p class="text-xs text-slate-600">
          Selecione um arquivo de backup previamente exportado. Os inventários, grupos, parcelas e medições serão validados e restaurados.
        </p>

        <div class="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <input type="file" id="input-arquivo-backup" accept=".json,application/json"
            class="field-input py-2 text-xs w-full sm:w-auto flex-1">
          <button id="btn-importar-backup" class="btn-primary text-xs py-2.5 px-5 w-full sm:w-auto">
            Importar Arquivo
          </button>
        </div>
      </section>
    </div>
  `;
}

// ----------------- Visão 11: Ajuda e Fórmulas -----------------

function renderAjuda(): string {
  return `
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>📖</span> Guia Didático e Fórmulas Dendrométricas
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Disciplina: LCF0510 - Inventário Florestal — ESALQ/USP | CMQ — Centro de Métodos Quantitativos
        </p>
        <p class="text-xs text-slate-600 mt-0.5">
          Professores: Matheus Pinheiro Ferreira e Jonathan Trautenmüller • Monitor: Matheus Siqueira Barros
        </p>
      </div>

      <div class="space-y-4">
        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <h3 class="font-bold text-emerald-900 text-base">1. Circunferência e Diâmetro à Altura do Peito (CAP e DAP)</h3>
          <p class="text-xs text-slate-700 leading-relaxed">
            A <strong>CAP</strong> (em cm) é obtida em campo com fita métrica a 1,30 metro do solo.
            O <strong>DAP</strong> (em cm) é o diâmetro calculado a partir da relação geométrica com a constante π:
          </p>
          <div class="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-900 border border-slate-200 font-bold">
            DAP (cm) = CAP (cm) / π
          </div>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <h3 class="font-bold text-emerald-900 text-base">2. Área Transversal Individual (g)</h3>
          <p class="text-xs text-slate-700 leading-relaxed">
            A área transversal <strong>g</strong> (em m²) representa a seção do tronco a 1,30 m do solo:
          </p>
          <div class="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-900 border border-slate-200 font-bold">
            g (m²) = (π × DAP²) / 40.000 = CAP² / (40.000 × π)
          </div>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <h3 class="font-bold text-emerald-900 text-base">3. Área Basal da Parcela (G) e por Hectare (G/ha)</h3>
          <p class="text-xs text-slate-700 leading-relaxed">
            Soma das áreas transversais e expansão para 1 hectare (10.000 m²):
          </p>
          <div class="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-900 border border-slate-200 font-bold space-y-1">
            <div>G_parcela (m²) = Σ g_i</div>
            <div>Gha (m²/ha) = G_parcela / Área_da_Parcela (ha)</div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <h3 class="font-bold text-emerald-900 text-base">4. Variância Amostral (s²) com Denominador n − 1</h3>
          <p class="text-xs text-slate-700 leading-relaxed">
            Utiliza graus de liberdade n − 1 (Correção de Bessel):
          </p>
          <div class="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-900 border border-slate-200 font-bold space-y-1">
            <div>Média DAP = Σ DAP_i / n</div>
            <div>s² (cm²) = Σ(DAP_i − Média)² / (n − 1)</div>
            <div>s (cm) = √s²</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ----------------- Visão 12: Testes -----------------

function renderTestes(): string {
  const testes = executarTodosTestes();
  const totalPassou = testes.filter((t) => t.passou).length;
  const todosPassaram = totalPassou === testes.length;

  return `
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>🧪</span> Testes do Sistema e Verificação Matemática
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Auditoria automatizada dos 20 requisitos matemáticos e funcionais obrigatórios.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="px-3 py-1.5 rounded-lg text-xs font-bold ${
            todosPassaram ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900'
          }">
            ${totalPassou} / ${testes.length} Testes Aprovados
          </span>
          <button id="btn-reexecutar-testes" class="btn-primary text-xs py-1.5 px-3">
            Reexecutar
          </button>
        </div>
      </div>

      <div class="space-y-3">
        ${testes
          .map(
            (t) => `
          <div class="bg-white rounded-xl p-4 border ${
            t.passou ? 'border-slate-200' : 'border-rose-400 bg-rose-50/20'
          } shadow-xs flex items-start gap-3">
            <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              t.passou ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 font-bold'
            }">
              ${t.passou ? '✓' : '✕'}
            </div>
            <div class="flex-1 space-y-1">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-sm text-slate-900">
                  #${t.numero}. ${t.nome}
                </h4>
                <span class="text-xs font-semibold ${t.passou ? 'text-emerald-700' : 'text-rose-700'}">
                  ${t.passou ? 'Aprovado' : 'Falhou'}
                </span>
              </div>
              <p class="text-xs text-slate-600">${t.descricao}</p>
              <div class="text-[0.75rem] font-mono bg-slate-50 p-2 rounded border border-slate-100 text-slate-700">
                <span>Resultado: ${t.detalhes}</span>
                ${t.obtido ? `<span class="block text-slate-500">Obtido: ${t.obtido}</span>` : ''}
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

// ----------------- Conexão de Event Listeners -----------------

function attachEventListeners() {
  document.getElementById('nav-brand-home')?.addEventListener('click', () => navigate('dashboard'));

  document.querySelectorAll('[data-crumb]').forEach((el) => {
    el.addEventListener('click', () => {
      const crumb = (el as HTMLElement).getAttribute('data-crumb');
      if (crumb === 'inventarios') {
        navigate('dashboard');
        return;
      }
      if (crumb === 'inventario' && state.inventarioAtivo) {
        navigate('inventario-detalhes', state.inventarioAtivo.id);
        return;
      }
      if (crumb === 'grupo' && state.inventarioAtivo && state.grupoAtivo) {
        navigate('grupo-detalhes', state.inventarioAtivo.id, state.grupoAtivo.id);
        return;
      }
      if (crumb === 'parcela' && state.inventarioAtivo && state.grupoAtivo && state.parcelaAtiva) {
        navigate('coleta-arvores', state.inventarioAtivo.id, state.grupoAtivo.id, state.parcelaAtiva.id);
      }
    });
  });
  const ajudaBtn = document.getElementById('nav-btn-ajuda');
  if (ajudaBtn) {
    bindHoldOrClick(ajudaBtn, {
      onClick: () => navigate('ajuda'),
      onHold: async () => {
        const txt = await exportarActivityLogTxt();
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        baixarArquivo(txt, `inventario-log-${stamp}.txt`, 'text/plain;charset=utf-8');
        showToast('Registro baixado.');
      },
    });
  }

  // Ações de Inventários
  document.getElementById('btn-novo-inventario')?.addEventListener('click', () => navigate('inventario-novo'));

  document.querySelectorAll('[data-action="abrir-inventario"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) navigate('inventario-detalhes', id);
    });
  });

  document.querySelectorAll('[data-action="editar-inventario"]').forEach((btn) => {
    bindHoldOrClick(btn as HTMLElement, {
      onClick: async (el) => {
        const id = el.getAttribute('data-id');
        if (id) {
          state.inventarioAtivo = await obterInventario(id);
          navigate('inventario-editar');
        }
      },
      onHold: (el) => {
        const id = el.getAttribute('data-id');
        const nome = el.getAttribute('data-nome') || 'este inventário';
        if (!id) return;
        showModal(
          'Excluir inventário?',
          `<p class="text-sm text-slate-700">Deseja apagar <strong>${nome}</strong>? Todos os grupos, parcelas e árvores serão removidos permanentemente.</p>`,
          `
            <button id="modal-cancel-del-inv" class="btn-secondary text-xs px-4 py-2">Cancelar</button>
            <button id="modal-confirm-del-inv" class="btn-primary text-xs px-4 py-2 bg-rose-700 hover:bg-rose-800 border-rose-900">Apagar</button>
          `
        );
        document.getElementById('modal-cancel-del-inv')?.addEventListener('click', closeModal);
        document.getElementById('modal-confirm-del-inv')?.addEventListener('click', async () => {
          await excluirInventario(id);
          closeModal();
          showToast('Inventário excluído com sucesso.');
          renderApp();
        });
      },
    });
  });

  // Formulário de Inventário
  document.getElementById('btn-cancelar-inv')?.addEventListener('click', () => navigate('dashboard'));
  document.getElementById('btn-cancelar-inv-2')?.addEventListener('click', () => navigate('dashboard'));
  document.getElementById('form-inventario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = (document.getElementById('inv-id') as HTMLInputElement).value || 'inv-' + Date.now();
    const nome = (document.getElementById('inv-nome') as HTMLInputElement).value.trim();
    const disciplina = (document.getElementById('inv-disciplina') as HTMLInputElement).value.trim();
    const turma = (document.getElementById('inv-turma') as HTMLInputElement).value.trim();
    const professores = (document.getElementById('inv-professores') as HTMLInputElement).value.trim();
    const monitor = (document.getElementById('inv-monitor') as HTMLInputElement).value.trim();
    const data = (document.getElementById('inv-data') as HTMLInputElement).value;
    const responsavel = (document.getElementById('inv-responsavel') as HTMLInputElement).value.trim();
    const metodoAmostragem = (document.getElementById('inv-metodo') as HTMLSelectElement).value;
    const observacoes = (document.getElementById('inv-obs') as HTMLTextAreaElement).value.trim();

    const novoInv: Inventory = {
      id,
      nome,
      disciplina,
      turma,
      professores,
      monitor,
      data,
      responsavel,
      metodoAmostragem,
      observacoes,
      isDemo: false,
      criadoEm: state.inventarioAtivo?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    await salvarInventario(novoInv);
    state.inventarioAtivo = novoInv;
    showToast('Inventário salvo com sucesso!');
    navigate('inventario-detalhes', novoInv.id);
  });

  // Tela do Inventário (Detalhes e Grupos)
  document.getElementById('btn-voltar-dashboard')?.addEventListener('click', () => navigate('dashboard'));
  document.getElementById('btn-novo-grupo')?.addEventListener('click', () => navigate('grupo-novo'));
  document.getElementById('btn-novo-grupo-empty')?.addEventListener('click', () => navigate('grupo-novo'));
  document.getElementById('btn-abrir-sintese')?.addEventListener('click', () => {
    if (state.inventarioAtivo) navigate('inventario-sintese', state.inventarioAtivo.id);
  });
  document.getElementById('btn-editar-inv')?.addEventListener('click', () => navigate('inventario-editar'));

  // Ações de Grupos
  document.querySelectorAll('[data-action="abrir-grupo"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && state.inventarioAtivo) navigate('grupo-detalhes', state.inventarioAtivo.id, id);
    });
  });

  document.querySelectorAll('[data-action="editar-grupo"]').forEach((btn) => {
    bindHoldOrClick(btn as HTMLElement, {
      onClick: async (el) => {
        const id = el.getAttribute('data-id');
        if (id && state.inventarioAtivo) {
          state.grupoAtivo = await obterGrupo(id);
          navigate('grupo-editar', state.inventarioAtivo.id, id);
        }
      },
      onHold: (el) => {
        const id = el.getAttribute('data-id');
        const nome = el.getAttribute('data-nome') || 'este grupo';
        if (!id) return;
        showModal(
          'Excluir grupo?',
          `<p class="text-sm text-slate-700">Deseja apagar <strong>${nome}</strong>? Todas as parcelas e árvores do grupo serão removidas permanentemente.</p>`,
          `
            <button id="modal-cancel-del-grp" class="btn-secondary text-xs px-4 py-2">Cancelar</button>
            <button id="modal-confirm-del-grp" class="btn-primary text-xs px-4 py-2 bg-rose-700 hover:bg-rose-800 border-rose-900">Apagar</button>
          `
        );
        document.getElementById('modal-cancel-del-grp')?.addEventListener('click', closeModal);
        document.getElementById('modal-confirm-del-grp')?.addEventListener('click', async () => {
          await excluirGrupo(id);
          closeModal();
          showToast(`Grupo "${nome}" excluído.`);
          renderApp();
        });
      },
    });
  });

  // DOWNLOAD DE CSV DO GRUPO (Funcionalidade solicitada explicitamente)
  document.querySelectorAll('[data-action="baixar-csv-grupo"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const grupoId = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!grupoId || !state.inventarioAtivo) return;

      const grupo = await obterGrupo(grupoId);
      if (!grupo) return;

      const parcelasGrupo = await listarParcelasPorGrupo(grupo.id);
      const todasArvores = await listarTodasArvoresPorInventario(state.inventarioAtivo.id);

      const csv = gerarCSVGrupoCompleto(
        state.inventarioAtivo,
        grupo,
        parcelasGrupo,
        todasArvores,
        state.delimitadorCSV
      );

      const nomeLimpo = grupo.nome.replace(/\s+/g, '_').toLowerCase();
      baixarArquivo(csv, `dados_${nomeLimpo}_completo.csv`, 'text/csv;charset=utf-8;');
      showToast(`CSV completo do ${grupo.nome} baixado com sucesso!`);
    });
  });

  // Tela do Grupo
  document.getElementById('btn-voltar-inventario-detalhes')?.addEventListener('click', () => {
    if (state.inventarioAtivo) navigate('inventario-detalhes', state.inventarioAtivo.id);
  });
  document.getElementById('btn-nova-parcela-grupo')?.addEventListener('click', () => navigate('parcela-nova'));
  document.getElementById('btn-nova-parcela-grupo-empty')?.addEventListener('click', () => navigate('parcela-nova'));

  document.getElementById('btn-baixar-csv-deste-grupo')?.addEventListener('click', async () => {
    if (!state.grupoAtivo || !state.inventarioAtivo) return;
    const parcelasGrupo = await listarParcelasPorGrupo(state.grupoAtivo.id);
    const todasArvores = await listarTodasArvoresPorInventario(state.inventarioAtivo.id);
    const csv = gerarCSVGrupoCompleto(
      state.inventarioAtivo,
      state.grupoAtivo,
      parcelasGrupo,
      todasArvores,
      state.delimitadorCSV
    );
    const nomeLimpo = state.grupoAtivo.nome.replace(/\s+/g, '_').toLowerCase();
    baixarArquivo(csv, `dados_${nomeLimpo}_completo.csv`, 'text/csv;charset=utf-8;');
    showToast(`CSV completo do ${state.grupoAtivo.nome} baixado com sucesso!`);
  });

  document.getElementById('btn-editar-grupo-atual')?.addEventListener('click', () => {
    if (state.inventarioAtivo && state.grupoAtivo) {
      navigate('grupo-editar', state.inventarioAtivo.id, state.grupoAtivo.id);
    }
  });

  // Formulário de Grupo
  document.getElementById('btn-cancelar-grupo')?.addEventListener('click', () => {
    if (state.inventarioAtivo) navigate('inventario-detalhes', state.inventarioAtivo.id);
  });
  document.getElementById('btn-cancelar-grupo-2')?.addEventListener('click', () => {
    if (state.inventarioAtivo) navigate('inventario-detalhes', state.inventarioAtivo.id);
  });
  document.getElementById('form-grupo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.inventarioAtivo) return;

    const id = (document.getElementById('grupo-id') as HTMLInputElement).value || 'grp-' + Date.now();
    const nome = (document.getElementById('grupo-nome') as HTMLInputElement).value.trim();
    const integrantes = (document.getElementById('grupo-integrantes') as HTMLTextAreaElement).value.trim();
    const observacoes = (document.getElementById('grupo-obs') as HTMLTextAreaElement).value.trim();

    const novoGrupo: Group = {
      id,
      inventarioId: state.inventarioAtivo.id,
      nome,
      integrantes,
      observacoes,
      criadoEm: state.grupoAtivo?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    await salvarGrupo(novoGrupo);
    state.grupoAtivo = novoGrupo;
    showToast(`Grupo "${nome}" salvo com sucesso!`);
    navigate('grupo-detalhes', state.inventarioAtivo.id, novoGrupo.id);
  });

  // Ações de parcelas
  document.querySelectorAll('[data-action="coletar-parcela"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && state.inventarioAtivo && state.grupoAtivo) {
        navigate('coleta-arvores', state.inventarioAtivo.id, state.grupoAtivo.id, id);
      }
    });
  });

  document.querySelectorAll('[data-action="resultados-parcela"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && state.inventarioAtivo && state.grupoAtivo) {
        navigate('parcela-resultados', state.inventarioAtivo.id, state.grupoAtivo.id, id);
      }
    });
  });

  document.querySelectorAll('[data-action="editar-parcela"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && state.inventarioAtivo && state.grupoAtivo) {
        navigate('parcela-editar', state.inventarioAtivo.id, state.grupoAtivo.id, id);
      }
    });
  });

  document.querySelectorAll('[data-action="gps-parcela"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!isMobileDevice()) {
        showToast('O cadastro de GPS (centro / 4 cantos) só é ativado no celular.', 'aviso');
        return;
      }
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      const parcela = await obterParcela(id);
      if (parcela) abrirModalGPSParcela(parcela);
    });
  });

  document.querySelectorAll('[data-action="excluir-parcela"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const codigo = (e.currentTarget as HTMLElement).getAttribute('data-codigo') || '';
      if (!id) return;
      confirmDeleteModal(
        'Remover parcela?',
        `<p class="text-sm text-slate-700">Deseja remover de fato a parcela <strong>${codigo}</strong> e todas as suas árvores? Esta ação fica registrada no log.</p>`,
        async () => {
          await excluirParcela(id);
          showToast(`Parcela ${codigo} excluída.`);
          renderApp();
        }
      );
    });
  });

  // Formulário de Parcela
  const radioFormatos = document.querySelectorAll('input[name="parc-formato"]');
  radioFormatos.forEach((rf) => {
    rf.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value;
      const cCirc = document.getElementById('container-dims-circular');
      const cRect = document.getElementById('container-dims-retangular');
      if (val === 'circular') {
        cCirc?.classList.remove('hidden');
        cRect?.classList.add('hidden');
      } else {
        cCirc?.classList.add('hidden');
        cRect?.classList.remove('hidden');
      }
      atualizarPreviaAreaParcela();
    });
  });

  document.getElementById('parc-circ-tipo-entrada')?.addEventListener('change', atualizarPreviaAreaParcela);
  document.getElementById('parc-circ-valor')?.addEventListener('input', atualizarPreviaAreaParcela);
  document.getElementById('parc-rect-comp')?.addEventListener('input', atualizarPreviaAreaParcela);
  document.getElementById('parc-rect-larg')?.addEventListener('input', atualizarPreviaAreaParcela);

  document.getElementById('btn-cancelar-parc')?.addEventListener('click', () => {
    if (state.inventarioAtivo && state.grupoAtivo) {
      navigate('grupo-detalhes', state.inventarioAtivo.id, state.grupoAtivo.id);
    } else if (state.inventarioAtivo) {
      navigate('inventario-detalhes', state.inventarioAtivo.id);
    }
  });
  document.getElementById('btn-cancelar-parc-2')?.addEventListener('click', () => {
    if (state.inventarioAtivo && state.grupoAtivo) {
      navigate('grupo-detalhes', state.inventarioAtivo.id, state.grupoAtivo.id);
    } else if (state.inventarioAtivo) {
      navigate('inventario-detalhes', state.inventarioAtivo.id);
    }
  });

  document.getElementById('btn-abrir-gps-modal')?.addEventListener('click', () => {
    if (!isMobileDevice()) {
      showToast('O cadastro de GPS (centro / 4 cantos) só é ativado no celular.', 'aviso');
      return;
    }
    if (state.parcelaAtiva && state.parcelaAtiva.id && !state.parcelaAtiva.id.startsWith('draft-')) {
      abrirModalGPSParcela(state.parcelaAtiva);
      return;
    }
    const formato =
      ((document.querySelector('input[name="parc-formato"]:checked') as HTMLInputElement | null)
        ?.value as PlotFormat) || 'circular';
    const codigo =
      (document.getElementById('parc-codigo') as HTMLInputElement | null)?.value.trim() || 'P01';
    const stub: Plot = {
      id: 'draft-gps',
      inventarioId: state.inventarioAtivo?.id || '',
      grupoId: state.grupoAtivo?.id,
      codigo,
      formato,
      dimensoes:
        formato === 'circular'
          ? { tipo: 'circular', tipoEntrada: 'raio', valorOriginal: 10, unidade: 'm' }
          : { tipo: 'retangular', comprimento: 25, largura: 20, unidade: 'm' },
      areaM2: 0,
      areaHa: 0,
      observacoes: '',
      data: '',
      status: 'nao_iniciada',
      coordenadas: pendingPlotCoords || { tipo: 'nenhum' },
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    abrirModalGPSParcela(stub);
  });

  document.getElementById('form-parcela')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.inventarioAtivo) return;

    const id = (document.getElementById('parc-id') as HTMLInputElement).value || 'parc-' + Date.now();
    const grupoId = (document.getElementById('parc-grupo-id') as HTMLInputElement).value || state.grupoAtivo?.id;
    const codigo = (document.getElementById('parc-codigo') as HTMLInputElement).value.trim();
    const nome = (document.getElementById('parc-nome') as HTMLInputElement).value.trim();
    const inventariante = state.grupoAtivo?.integrantes || state.parcelaAtiva?.inventariante || '';
    const data = (document.getElementById('parc-data') as HTMLInputElement).value;
    const observacoes = (document.getElementById('parc-obs') as HTMLTextAreaElement).value.trim();
    const formato = (document.querySelector('input[name="parc-formato"]:checked') as HTMLInputElement).value as PlotFormat;

    let dimensoes: PlotDimensions;
    let areaM2 = 0;

    if (formato === 'circular') {
      const tipoEntrada = (document.getElementById('parc-circ-tipo-entrada') as HTMLSelectElement).value as 'raio' | 'diametro';
      const valorOriginal = Number((document.getElementById('parc-circ-valor') as HTMLInputElement).value);
      areaM2 = calcularAreaCircular(tipoEntrada, valorOriginal);
      dimensoes = {
        tipo: 'circular',
        tipoEntrada,
        valorOriginal,
        unidade: 'm',
      };
    } else {
      const comp = Number((document.getElementById('parc-rect-comp') as HTMLInputElement).value);
      const larg = Number((document.getElementById('parc-rect-larg') as HTMLInputElement).value);
      areaM2 = calcularAreaRetangular(comp, larg);
      dimensoes = {
        tipo: 'retangular',
        comprimento: comp,
        largura: larg,
        unidade: 'm',
      };
    }

    const areaHa = converterM2ParaHectares(areaM2);

    const parcelaSalva: Plot = {
      id,
      inventarioId: state.inventarioAtivo.id,
      grupoId,
      codigo,
      nome,
      inventariante,
      formato,
      dimensoes,
      areaM2,
      areaHa,
      observacoes,
      data,
      status: state.parcelaAtiva?.status || 'nao_iniciada',
      coordenadas:
        state.parcelaAtiva?.coordenadas ||
        pendingPlotCoords ||
        { tipo: 'nenhum' },
      criadoEm: state.parcelaAtiva?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    await salvarParcela(parcelaSalva);
    pendingPlotCoords = null;
    state.parcelaAtiva = parcelaSalva;
    showToast(`Parcela ${codigo} salva com sucesso!`);
    if (state.grupoAtivo) {
      navigate('coleta-arvores', state.inventarioAtivo.id, state.grupoAtivo.id, parcelaSalva.id);
    }
  });

  // Tela de Coleta de Árvores
  document.getElementById('btn-voltar-ao-grupo')?.addEventListener('click', () => {
    if (state.inventarioAtivo && state.grupoAtivo) {
      navigate('grupo-detalhes', state.inventarioAtivo.id, state.grupoAtivo.id);
    }
  });

  document.getElementById('btn-finalizar-parcela')?.addEventListener('click', abrirModalFinalizacaoParcela);

  document.getElementById('btn-ver-estatisticas')?.addEventListener('click', () => {
    if (state.inventarioAtivo && state.grupoAtivo && state.parcelaAtiva) {
      navigate('parcela-resultados', state.inventarioAtivo.id, state.grupoAtivo.id, state.parcelaAtiva.id);
    }
  });

  // Live calculation do CAP
  const inputCap = document.getElementById('input-arv-cap') as HTMLInputElement | null;
  inputCap?.addEventListener('input', () => {
    const val = Number(inputCap.value);
    const liveDapHeader = document.getElementById('preview-dap-live');
    const liveDapVal = document.getElementById('live-dap-val');
    const liveGVal = document.getElementById('live-g-val');

    if (val > 0) {
      const dap = calcularDAP(val);
      const g = calcularAreaTransversal(val);
      if (liveDapHeader) liveDapHeader.textContent = `DAP: ${dap?.toFixed(2)} cm`;
      if (liveDapVal) liveDapVal.textContent = `${dap?.toFixed(2)} cm`;
      if (liveGVal) liveGVal.textContent = `${g?.toFixed(6)} m²`;
    } else {
      if (liveDapHeader) liveDapHeader.textContent = 'DAP: —';
      if (liveDapVal) liveDapVal.textContent = '—';
      if (liveGVal) liveGVal.textContent = '—';
    }
  });

  // Autocomplete de Espécies
  const inputEspecie = document.getElementById('input-arv-especie') as HTMLInputElement | null;
  const listaAuto = document.getElementById('autocomplete-lista');
  if (inputEspecie && listaAuto && state.inventarioAtivo) {
    inputEspecie.addEventListener('focus', async () => {
      await atualizarSugestoesEspecies(inputEspecie.value);
    });
    inputEspecie.addEventListener('input', async () => {
      await atualizarSugestoesEspecies(inputEspecie.value);
    });
    document.addEventListener('click', (e) => {
      if (!inputEspecie.contains(e.target as Node) && !listaAuto.contains(e.target as Node)) {
        listaAuto.classList.add('hidden');
      }
    });
  }

  // Submissão rápida de Árvore
  document.getElementById('form-coleta-arvore')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.parcelaAtiva || !state.inventarioAtivo) return;

    const numInput = document.getElementById('input-arv-numero') as HTMLInputElement;
    const espInput = document.getElementById('input-arv-especie') as HTMLInputElement;
    const capInput = document.getElementById('input-arv-cap') as HTMLInputElement;
    const altInput = document.getElementById('input-arv-altura') as HTMLInputElement | null;
    const aziInput = document.getElementById('input-arv-azimute') as HTMLInputElement | null;
    const distInput = document.getElementById('input-arv-dist') as HTMLInputElement | null;
    const obsInput = document.getElementById('input-arv-obs') as HTMLInputElement;

    const numero = numInput.value.trim();
    const especie = espInput.value.trim();
    const capStr = capInput.value.trim();
    const cap = capStr !== '' ? Number(capStr) : null;
    const altStr = altInput?.value.trim() || '';
    const alturaH = altStr !== '' ? Number(altStr) : null;
    const aziStr = aziInput?.value.trim() || '';
    const azimute = aziStr !== '' ? Number(aziStr) : null;
    const distStr = distInput?.value.trim() || '';
    const distanciaCentro = distStr !== '' ? Number(distStr) : null;
    const observacoes = obsInput.value.trim();

    const arvoresExistentes = await listarArvoresPorParcela(state.parcelaAtiva.id);
    const duplicada = arvoresExistentes.find(
      (t) => String(t.numero).toLowerCase() === String(numero).toLowerCase()
    );
    if (duplicada) {
      alert(`O identificador nº "${numero}" já está cadastrado nesta parcela. Escolha um identificador diferente.`);
      numInput.focus();
      return;
    }

    const validacao = validarMedicaoArvore({ cap });

    const novaArvore: Tree = {
      id: 'arv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      parcelaId: state.parcelaAtiva.id,
      inventarioId: state.inventarioAtivo.id,
      grupoId: state.parcelaAtiva.grupoId || state.grupoAtivo?.id,
      numero,
      especie: especie || '',
      cap: validacao.cap,
      dap: validacao.dap,
      g: validacao.g,
      alturaH: alturaH != null && !isNaN(alturaH) ? alturaH : null,
      azimute:
        state.parcelaAtiva.formato === 'circular' && azimute != null && !isNaN(azimute)
          ? azimute
          : null,
      distanciaCentro:
        state.parcelaAtiva.formato === 'circular' &&
        distanciaCentro != null &&
        !isNaN(distanciaCentro)
          ? distanciaCentro
          : null,
      observacoes,
      status: validacao.status,
      motivoInvalido: validacao.motivo,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    await salvarArvore(novaArvore);

    if (state.parcelaAtiva.status === 'nao_iniciada') {
      state.parcelaAtiva.status = 'em_andamento';
      await salvarParcela(state.parcelaAtiva);
    }

    showToast(`Árvore #${numero} registrada com sucesso!`);

    await renderApp();

    setTimeout(() => {
      const nextCap = document.getElementById('input-arv-cap') as HTMLInputElement;
      nextCap?.focus();
    }, 50);
  });

  // Filtro de espécie
  document.getElementById('filtro-especie-input')?.addEventListener('input', (e) => {
    state.filtroEspecie = (e.target as HTMLInputElement).value;
    renderApp();
  });
  document.getElementById('btn-limpar-filtro')?.addEventListener('click', () => {
    state.filtroEspecie = '';
    renderApp();
  });

  // Ações de cada árvore
  document.querySelectorAll('[data-action="editar-arvore"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && state.parcelaAtiva) {
        const arvores = await listarArvoresPorParcela(state.parcelaAtiva.id);
        const alvo = arvores.find((t) => t.id === id);
        if (alvo) abrirModalEditarArvore(alvo);
      }
    });
  });

  document.querySelectorAll('[data-action="excluir-arvore"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const num = (e.currentTarget as HTMLElement).getAttribute('data-num') || '';
      if (!id) return;
      confirmDeleteModal(
        'Remover árvore?',
        `<p class="text-sm text-slate-700">Deseja remover de fato a árvore nº <strong>${num}</strong>? Os indicadores da parcela serão recalculados e a exclusão fica registrada no log.</p>`,
        async () => {
          await excluirArvore(id);
          showToast(`Árvore #${num} removida.`);
          renderApp();
        }
      );
    });
  });

  // Resultados da Parcela
  document.getElementById('btn-voltar-coleta')?.addEventListener('click', () => {
    if (state.inventarioAtivo && state.grupoAtivo && state.parcelaAtiva) {
      navigate('coleta-arvores', state.inventarioAtivo.id, state.grupoAtivo.id, state.parcelaAtiva.id);
    }
  });

  document.getElementById('btn-reabrir-parcela')?.addEventListener('click', async () => {
    if (state.parcelaAtiva) {
      state.parcelaAtiva.status = 'em_andamento';
      await salvarParcela(state.parcelaAtiva);
      showToast('Parcela reaberta para edição.');
      if (state.inventarioAtivo && state.grupoAtivo) {
        navigate('coleta-arvores', state.inventarioAtivo.id, state.grupoAtivo.id, state.parcelaAtiva.id);
      }
    }
  });

  document.getElementById('btn-exportar-csv-parcela')?.addEventListener('click', async () => {
    if (!state.parcelaAtiva || !state.inventarioAtivo) return;
    const arvores = await listarArvoresPorParcela(state.parcelaAtiva.id);
    const csv = gerarCSVArvoresIndividuais([state.inventarioAtivo], [state.parcelaAtiva], arvores, state.delimitadorCSV);
    baixarArquivo(csv, `arvores_parcela_${state.parcelaAtiva.codigo}.csv`, 'text/csv;charset=utf-8;');
    showToast('CSV da parcela baixado com sucesso!');
  });

  // Síntese Geral
  document.getElementById('btn-voltar-inventario-sintese')?.addEventListener('click', () => {
    if (state.inventarioAtivo) navigate('inventario-detalhes', state.inventarioAtivo.id);
  });

  document.getElementById('btn-exportar-sintese-csv')?.addEventListener('click', async () => {
    if (!state.inventarioAtivo) return;
    const parcelas = await listarParcelasPorInventario(state.inventarioAtivo.id);
    const todasArvores = await listarTodasArvoresPorInventario(state.inventarioAtivo.id);
    const csv = gerarCSVResumoParcelas([state.inventarioAtivo], parcelas, todasArvores, state.delimitadorCSV);
    baixarArquivo(csv, `sintese_${state.inventarioAtivo.nome.replace(/\s+/g, '_')}.csv`, 'text/csv;charset=utf-8;');
    showToast('Síntese baixada com sucesso!');
  });

  // Delimitador CSV
  document.querySelectorAll('input[name="delimitador-csv"]').forEach((r) => {
    r.addEventListener('change', (e) => {
      state.delimitadorCSV = (e.target as HTMLInputElement).value as DelimitadorCSV;
      showToast(`Delimitador CSV alterado para "${state.delimitadorCSV}"`);
    });
  });

  // Exportação geral
  document.getElementById('btn-export-arvores')?.addEventListener('click', async () => {
    const invs = await listarInventarios();
    let todasParc: Plot[] = [];
    let todasArv: Tree[] = [];
    for (const inv of invs) {
      const pList = await listarParcelasPorInventario(inv.id);
      todasParc = todasParc.concat(pList);
      const aList = await listarTodasArvoresPorInventario(inv.id);
      todasArv = todasArv.concat(aList);
    }
    const csv = gerarCSVArvoresIndividuais(invs, todasParc, todasArv, state.delimitadorCSV);
    baixarArquivo(csv, 'arvores_individuais_completo.csv', 'text/csv;charset=utf-8;');
    showToast('Download de árvores individuais concluído!');
  });

  document.getElementById('btn-export-parcelas')?.addEventListener('click', async () => {
    const invs = await listarInventarios();
    let todasParc: Plot[] = [];
    let todasArv: Tree[] = [];
    for (const inv of invs) {
      const pList = await listarParcelasPorInventario(inv.id);
      todasParc = todasParc.concat(pList);
      const aList = await listarTodasArvoresPorInventario(inv.id);
      todasArv = todasArv.concat(aList);
    }
    const csv = gerarCSVResumoParcelas(invs, todasParc, todasArv, state.delimitadorCSV);
    baixarArquivo(csv, 'resumo_parcelas_completo.csv', 'text/csv;charset=utf-8;');
    showToast('Download do resumo de parcelas concluído!');
  });

  document.getElementById('btn-export-especies')?.addEventListener('click', async () => {
    const invs = await listarInventarios();
    let todasParc: Plot[] = [];
    let todasArv: Tree[] = [];
    for (const inv of invs) {
      const pList = await listarParcelasPorInventario(inv.id);
      todasParc = todasParc.concat(pList);
      const aList = await listarTodasArvoresPorInventario(inv.id);
      todasArv = todasArv.concat(aList);
    }
    const csv = gerarCSVResumoEspecies(todasParc, todasArv, state.delimitadorCSV);
    baixarArquivo(csv, 'resumo_especies_completo.csv', 'text/csv;charset=utf-8;');
    showToast('Download do resumo por espécie concluído!');
  });

  document.getElementById('btn-export-json')?.addEventListener('click', async () => {
    const backup = await exportarBackupCompleto();
    const str = JSON.stringify(backup, null, 2);
    baixarArquivo(str, `backup_inventario_esalq_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showToast('Backup JSON exportado com sucesso!');
  });

  document.getElementById('btn-importar-backup')?.addEventListener('click', async () => {
    const input = document.getElementById('input-arquivo-backup') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      alert('Por favor, selecione um arquivo de backup (.json).');
      return;
    }

    try {
      const text = await file.text();
      const backupObj = JSON.parse(text);
      if (!backupObj.inventarios || !Array.isArray(backupObj.inventarios)) {
        throw new Error('Formato de arquivo incompatível ou dados ausentes.');
      }

      if (confirm(`Arquivo validado: ${backupObj.inventarios.length} inventário(s), ${backupObj.grupos?.length || 0} grupo(s), ${backupObj.parcelas?.length || 0} parcela(s) e ${backupObj.arvores?.length || 0} árvore(s). Deseja mesclar com seus registros atuais?`)) {
        const res = await importarBackupCompleto(backupObj, 'mesclar');
        showToast(`Backup importado com sucesso: ${res.totalInventarios} inventários e ${res.totalGrupos} grupos restaurados!`);
        renderApp();
      }
    } catch (err) {
      alert('Erro ao importar backup: ' + (err instanceof Error ? err.message : String(err)));
    }
  });

  document.getElementById('btn-reexecutar-testes')?.addEventListener('click', () => {
    renderApp();
    showToast('Testes matemáticos e de sistema reexecutados!');
  });
}

// ----------------- Funções Auxiliares -----------------

function atualizarPreviaAreaParcela() {
  const radio = document.querySelector('input[name="parc-formato"]:checked') as HTMLInputElement | null;
  const formato = radio?.value || 'circular';

  let areaM2 = 0;
  if (formato === 'circular') {
    const tipo = (document.getElementById('parc-circ-tipo-entrada') as HTMLSelectElement)?.value as 'raio' | 'diametro';
    const val = Number((document.getElementById('parc-circ-valor') as HTMLInputElement)?.value);
    areaM2 = calcularAreaCircular(tipo, val);
  } else {
    const comp = Number((document.getElementById('parc-rect-comp') as HTMLInputElement)?.value);
    const larg = Number((document.getElementById('parc-rect-larg') as HTMLInputElement)?.value);
    areaM2 = calcularAreaRetangular(comp, larg);
  }

  const areaHa = converterM2ParaHectares(areaM2);
  const elM2 = document.getElementById('preview-area-m2');
  const elHa = document.getElementById('preview-area-ha');
  if (elM2) elM2.textContent = `${formatarNumero(areaM2, 2)} m²`;
  if (elHa) elHa.textContent = `${formatarNumero(areaHa, 4)} ha`;
}

async function atualizarSugestoesEspecies(textoDigitado: string) {
  if (!state.inventarioAtivo) return;
  const listaAuto = document.getElementById('autocomplete-lista');
  if (!listaAuto) return;

  const todasArvores = await listarTodasArvoresPorInventario(state.inventarioAtivo.id);
  const especiesMap = new Map<string, string>();
  todasArvores.forEach((t) => {
    const sp = t.especie?.trim();
    if (sp) {
      const k = sp.toLowerCase();
      if (!especiesMap.has(k)) especiesMap.set(k, sp);
    }
  });

  const query = textoDigitado.trim().toLowerCase();
  const sugestoes = Array.from(especiesMap.values()).filter((nome) =>
    nome.toLowerCase().includes(query)
  );

  if (sugestoes.length === 0) {
    listaAuto.classList.add('hidden');
    return;
  }

  listaAuto.innerHTML = sugestoes
    .slice(0, 6)
    .map((s) => `<div class="autocomplete-item" data-val="${s}">${s}</div>`)
    .join('');

  listaAuto.classList.remove('hidden');

  listaAuto.querySelectorAll('.autocomplete-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-val');
      const inputEsp = document.getElementById('input-arv-especie') as HTMLInputElement;
      if (inputEsp && val) {
        inputEsp.value = val;
        listaAuto.classList.add('hidden');
        document.getElementById('input-arv-cap')?.focus();
      }
    });
  });
}

function abrirModalEditarArvore(arvore: Tree) {
  const isCircular = state.parcelaAtiva?.formato === 'circular';
  const body = `
    <form id="form-edit-tree-modal" class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Identificador / Nº da Árvore</label>
        <input type="text" id="modal-tree-num" class="field-input w-full font-mono font-bold" value="${arvore.numero}">
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Espécie</label>
        <input type="text" id="modal-tree-esp" class="field-input w-full" value="${arvore.especie || ''}" placeholder="Nome científico ou comum">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">CAP (cm)</label>
          <input type="number" step="0.1" min="0.1" id="modal-tree-cap" class="field-input w-full font-mono text-lg font-bold" value="${arvore.cap ?? ''}">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">H (m) opcional</label>
          <input type="number" step="0.1" min="0" id="modal-tree-altura" class="field-input w-full font-mono" value="${arvore.alturaH ?? ''}">
        </div>
      </div>
      ${
        isCircular
          ? `
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Azimute (°) opcional</label>
          <input type="number" step="0.1" min="0" max="360" id="modal-tree-azimute" class="field-input w-full font-mono" value="${arvore.azimute ?? ''}">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Dist. centro (m) opcional</label>
          <input type="number" step="0.01" min="0" id="modal-tree-dist" class="field-input w-full font-mono" value="${arvore.distanciaCentro ?? ''}">
        </div>
      </div>`
          : ''
      }
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observações</label>
        <textarea id="modal-tree-obs" rows="2" class="field-input w-full text-xs">${arvore.observacoes || ''}</textarea>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn-secondary text-xs" onclick="document.getElementById('modal-close-btn').click()">Cancelar</button>
    <button type="button" id="btn-salvar-modal-tree" class="btn-primary text-xs">Salvar Alterações</button>
  `;

  showModal(`Editar Árvore #${arvore.numero}`, body, footer);

  document.getElementById('btn-salvar-modal-tree')?.addEventListener('click', async () => {
    const num = (document.getElementById('modal-tree-num') as HTMLInputElement).value.trim();
    const esp = (document.getElementById('modal-tree-esp') as HTMLInputElement).value.trim();
    const capStr = (document.getElementById('modal-tree-cap') as HTMLInputElement).value.trim();
    const cap = capStr !== '' ? Number(capStr) : null;
    const altStr = (document.getElementById('modal-tree-altura') as HTMLInputElement).value.trim();
    const alturaH = altStr !== '' ? Number(altStr) : null;
    const aziEl = document.getElementById('modal-tree-azimute') as HTMLInputElement | null;
    const distEl = document.getElementById('modal-tree-dist') as HTMLInputElement | null;
    const aziStr = aziEl?.value.trim() || '';
    const distStr = distEl?.value.trim() || '';
    const obs = (document.getElementById('modal-tree-obs') as HTMLTextAreaElement).value.trim();

    const validacao = validarMedicaoArvore({ cap });

    arvore.numero = num;
    arvore.especie = esp;
    arvore.cap = validacao.cap;
    arvore.dap = validacao.dap;
    arvore.g = validacao.g;
    arvore.alturaH = alturaH != null && !isNaN(alturaH) ? alturaH : null;
    if (isCircular) {
      const az = aziStr !== '' ? Number(aziStr) : null;
      const dist = distStr !== '' ? Number(distStr) : null;
      arvore.azimute = az != null && !isNaN(az) ? az : null;
      arvore.distanciaCentro = dist != null && !isNaN(dist) ? dist : null;
    }
    arvore.status = validacao.status;
    arvore.motivoInvalido = validacao.motivo;
    arvore.observacoes = obs;

    await salvarArvore(arvore);
    closeModal();
    showToast(`Árvore #${num} atualizada! Indicadores recalculados.`);
    renderApp();
  });
}

async function abrirModalFinalizacaoParcela() {
  if (!state.parcelaAtiva) return;
  const arvores = await listarArvoresPorParcela(state.parcelaAtiva.id);
  const stats = calcularEstatisticasParcela(state.parcelaAtiva, arvores);
  const semEspecie = arvores.filter((t) => !t.especie?.trim()).length;

  const body = `
    <div class="space-y-4 text-sm">
      <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <h4 class="font-bold text-emerald-900 text-sm">Revisão Prévia da Parcela ${state.parcelaAtiva.codigo}${state.parcelaAtiva.nome ? ` — ${state.parcelaAtiva.nome}` : ''}</h4>
        <p class="text-xs text-emerald-800 mt-0.5">Revise o resumo antes de consolidar os resultados estatísticos.</p>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 bg-slate-50 rounded border">
          <span class="text-slate-500 block">Árvores Cadastradas</span>
          <span class="text-base font-bold text-slate-800">${stats.totalArvores}</span>
        </div>
        <div class="p-2.5 bg-slate-50 rounded border">
          <span class="text-slate-500 block">Árvores Válidas (n)</span>
          <span class="text-base font-bold text-emerald-700">${stats.arvoresValidas}</span>
        </div>
        <div class="p-2.5 bg-slate-50 rounded border ${stats.arvoresIncompletas > 0 ? 'border-amber-400 bg-amber-50/50' : ''}">
          <span class="text-slate-500 block">CAP Ausente / Incompleto</span>
          <span class="text-base font-bold ${stats.arvoresIncompletas > 0 ? 'text-amber-800' : 'text-slate-800'}">${stats.arvoresIncompletas}</span>
        </div>
        <div class="p-2.5 bg-slate-50 rounded border">
          <span class="text-slate-500 block">Sem Espécie Identificada</span>
          <span class="text-base font-bold text-slate-800">${semEspecie}</span>
        </div>
      </div>

      <div class="text-xs text-slate-600 space-y-1">
        <p>• <strong>Inventariante:</strong> ${state.parcelaAtiva.inventariante || 'Não especificado'}</p>
        <p>• <strong>Área da parcela:</strong> ${formatarNumero(state.parcelaAtiva.areaM2, 1)} m² (${formatarNumero(state.parcelaAtiva.areaHa, 4)} ha)</p>
        <p>• <strong>DAP médio preliminar:</strong> ${formatarNumero(stats.dapMedio, 2, ' cm')}</p>
        <p>• <strong>Área basal G total:</strong> ${formatarNumero(stats.areaBasalTotal, 4)} m² (${formatarNumero(stats.areaBasalPorHectare, 2)} m²/ha)</p>
      </div>

      ${
        stats.arvoresIncompletas > 0
          ? `
        <div class="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-900">
          ⚠️ <strong>Atenção:</strong> Existem ${stats.arvoresIncompletas} árvore(s) sem medição válida de CAP. Elas serão preservadas nos registros para posterior conferência, mas não serão computadas nas médias e na área basal.
        </div>
      `
          : ''
      }
    </div>
  `;

  const footer = `
    <button type="button" class="btn-secondary text-xs" onclick="document.getElementById('modal-close-btn').click()">
      Voltar à Coleta
    </button>
    <button type="button" id="btn-confirmar-finalizacao" class="btn-primary text-xs">
      Confirmar e Ver Estatísticas
    </button>
  `;

  showModal('Finalizar Parcela e Gerar Estatísticas', body, footer);

  document.getElementById('btn-confirmar-finalizacao')?.addEventListener('click', async () => {
    if (state.parcelaAtiva && state.inventarioAtivo && state.grupoAtivo) {
      state.parcelaAtiva.status = 'concluida';
      await salvarParcela(state.parcelaAtiva);
      closeModal();
      showToast(`Parcela ${state.parcelaAtiva.codigo} finalizada com sucesso!`);
      navigate('parcela-resultados', state.inventarioAtivo.id, state.grupoAtivo.id, state.parcelaAtiva.id);
    }
  });
}

function formatPointLine(p: GeoPoint | null | undefined, label: string): string {
  if (!p) return `<div class="text-slate-400">${label}: ainda não capturado</div>`;
  return `<div><strong>${label}:</strong> ${formatarCoordenada(p.latitude, p.longitude)}${
    p.precisao != null ? ` (±${p.precisao.toFixed(1)} m)` : ''
  }</div>`;
}

function abrirModalGPSParcela(parcela: Plot) {
  if (!isMobileDevice()) {
    showToast('O cadastro de GPS (centro / 4 cantos) só é ativado no celular.', 'aviso');
    return;
  }
  const isCircular = parcela.formato === 'circular';
  let draftCentro: GeoPoint | null = parcela.coordenadas?.centro || null;
  let draftCantos: (GeoPoint | null)[] = [null, null, null, null];
  if (parcela.coordenadas?.cantos?.length) {
    for (let i = 0; i < 4; i++) draftCantos[i] = parcela.coordenadas.cantos[i] || null;
  }

  const renderStatus = () => {
    const el = document.getElementById('gps-status-feedback');
    if (!el) return;
    if (isCircular) {
      el.innerHTML = formatPointLine(draftCentro, 'Centro');
      return;
    }
    el.innerHTML = [0, 1, 2, 3]
      .map((i) => formatPointLine(draftCantos[i], `Canto ${i + 1}`))
      .join('');
  };

  const body = `
    <div class="space-y-4 text-xs">
      <div class="p-3 bg-emerald-50 rounded border border-emerald-200 text-emerald-950">
        <strong>Parcela ${parcela.codigo}</strong> — ${
          isCircular
            ? 'registre o ponto central da parcela circular.'
            : 'registre os 4 cantos (piquetes) da parcela retangular, na ordem do perímetro.'
        }
        <p class="text-xs text-emerald-800 mt-1">GPS nativo do dispositivo (WGS84). Funciona sem internet.</p>
      </div>

      <div id="gps-status-feedback" class="p-3 bg-slate-50 rounded border border-slate-200 text-slate-700 space-y-1 min-h-[80px]"></div>

      ${
        isCircular
          ? `
        <button type="button" id="btn-gps-capturar" class="btn-primary w-full text-xs py-2.5">
          📍 Capturar centro com GPS
        </button>
        <div class="border-t border-slate-200 pt-3 space-y-2">
          <span class="block font-bold text-slate-800 uppercase">Ou informe manualmente</span>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[0.7rem] text-slate-500">Latitude</label>
              <input type="number" step="0.000001" id="gps-manual-lat" class="field-input w-full py-1 text-xs font-mono"
                value="${draftCentro?.latitude ?? ''}">
            </div>
            <div>
              <label class="text-[0.7rem] text-slate-500">Longitude</label>
              <input type="number" step="0.000001" id="gps-manual-lng" class="field-input w-full py-1 text-xs font-mono"
                value="${draftCentro?.longitude ?? ''}">
            </div>
          </div>
        </div>
      `
          : `
        <div class="grid grid-cols-2 gap-2">
          ${[1, 2, 3, 4]
            .map(
              (n) => `
            <button type="button" data-canto="${n}" class="btn-secondary text-xs py-2.5 btn-gps-canto">
              📍 Capturar canto ${n}
            </button>`
            )
            .join('')}
        </div>
      `
      }
    </div>
  `;

  const footer = `
    <button type="button" class="btn-secondary text-xs" id="btn-cancelar-gps-modal">Cancelar</button>
    <button type="button" id="btn-salvar-gps-modal" class="btn-primary text-xs">Salvar Coordenadas</button>
  `;

  showModal(
    isCircular ? `GPS — Centro (${parcela.codigo})` : `GPS — 4 Cantos (${parcela.codigo})`,
    body,
    footer
  );
  renderStatus();

  document.getElementById('btn-cancelar-gps-modal')?.addEventListener('click', closeModal);

  document.getElementById('btn-gps-capturar')?.addEventListener('click', async () => {
    const feedback = document.getElementById('gps-status-feedback');
    if (feedback) feedback.innerHTML = '<span class="text-emerald-700 animate-pulse">Obtendo sinal GPS...</span>';
    const res = await capturarPontoGPS('Centro da Parcela');
    if (res.sucesso && res.ponto) {
      draftCentro = res.ponto;
      const latEl = document.getElementById('gps-manual-lat') as HTMLInputElement | null;
      const lngEl = document.getElementById('gps-manual-lng') as HTMLInputElement | null;
      if (latEl) latEl.value = res.ponto.latitude.toFixed(6);
      if (lngEl) lngEl.value = res.ponto.longitude.toFixed(6);
      renderStatus();
      showToast('Centro capturado.');
    } else if (feedback) {
      feedback.innerHTML = `<div class="text-rose-700"><strong>Falha:</strong> ${res.mensagemErro}</div>`;
    }
  });

  document.querySelectorAll('.btn-gps-canto').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const n = Number((e.currentTarget as HTMLElement).getAttribute('data-canto'));
      if (!n || n < 1 || n > 4) return;
      const feedback = document.getElementById('gps-status-feedback');
      if (feedback) {
        feedback.innerHTML = `<span class="text-emerald-700 animate-pulse">Capturando canto ${n}...</span>`;
      }
      const res = await capturarPontoGPS(`Canto ${n}`);
      if (res.sucesso && res.ponto) {
        draftCantos[n - 1] = { ...res.ponto, rotulo: `Canto ${n}` };
        renderStatus();
        showToast(`Canto ${n} capturado.`);
      } else if (feedback) {
        feedback.innerHTML = `<div class="text-rose-700"><strong>Falha no canto ${n}:</strong> ${res.mensagemErro}</div>`;
      }
    });
  });

  document.getElementById('btn-salvar-gps-modal')?.addEventListener('click', async () => {
    if (isCircular) {
      const latEl = document.getElementById('gps-manual-lat') as HTMLInputElement | null;
      const lngEl = document.getElementById('gps-manual-lng') as HTMLInputElement | null;
      const lat = Number(latEl?.value);
      const lng = Number(lngEl?.value);
      if (!draftCentro && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        draftCentro = {
          latitude: lat,
          longitude: lng,
          altitude: null,
          precisao: null,
          dataHora: new Date().toISOString(),
          rotulo: 'Centro da Parcela',
        };
      }
      if (!draftCentro) {
        showToast('Capture ou informe o centro antes de salvar.', 'erro');
        return;
      }
      parcela.coordenadas = { tipo: 'centro', centro: draftCentro, cantos: null };
    } else {
      const filled = draftCantos.filter((c): c is GeoPoint => !!c);
      if (filled.length < 4) {
        showToast('Capture os 4 cantos antes de salvar.', 'erro');
        return;
      }
      parcela.coordenadas = {
        tipo: 'cantos',
        centro: null,
        cantos: draftCantos.map((c, i) => ({ ...(c as GeoPoint), rotulo: `Canto ${i + 1}` })),
      };
    }

    if (parcela.id === 'draft-gps') {
      pendingPlotCoords = parcela.coordenadas;
      closeModal();
      showToast('Coordenadas capturadas. Salve a parcela para gravá-las.');
      const resumo = document.getElementById('resumo-coords-parcela');
      if (resumo) {
        const c = parcela.coordenadas;
        resumo.textContent =
          c.tipo === 'centro' && c.centro
            ? `Tipo: centro | ${formatarCoordenada(c.centro.latitude, c.centro.longitude)}`
            : `Tipo: cantos | ${c.cantos?.length || 0} pontos registrados`;
      }
      return;
    }

    await salvarParcela(parcela);
    if (state.parcelaAtiva?.id === parcela.id) state.parcelaAtiva = parcela;
    closeModal();
    showToast('Coordenadas salvas com sucesso!');
    renderApp();
  });
}
