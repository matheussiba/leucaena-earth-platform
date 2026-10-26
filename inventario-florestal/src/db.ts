// Persistência via API SQLite do leucaena.earth (/inventario/api/state)
import { Inventory, Group, Plot, Tree, BackupData } from './types';

const API = '/inventario/api/state';
const LOG_MAX = 8000;

export type ActivityLogEntry = {
  ts: string;
  op: 'save' | 'delete';
  entity: 'inventario' | 'grupo' | 'parcela' | 'arvore';
  id: string;
  label: string;
  data?: unknown;
};

type StoreState = {
  inventarios: Inventory[];
  grupos: Group[];
  parcelas: Plot[];
  arvores: Tree[];
  activityLog: ActivityLogEntry[];
};

let cache: StoreState | null = null;
let loadPromise: Promise<void> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

function emptyState(): StoreState {
  return { inventarios: [], grupos: [], parcelas: [], arvores: [], activityLog: [] };
}

async function ensureLoaded(): Promise<StoreState> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      const r = await fetch(API, { cache: 'no-store' });
      if (!r.ok) throw new Error('inventario load ' + r.status);
      const data = await r.json();
      cache = {
        inventarios: Array.isArray(data.inventarios) ? data.inventarios : [],
        grupos: Array.isArray(data.grupos) ? data.grupos : [],
        parcelas: Array.isArray(data.parcelas) ? data.parcelas : [],
        arvores: Array.isArray(data.arvores) ? data.arvores : [],
        activityLog: Array.isArray(data.activityLog) ? data.activityLog : [],
      };
    })();
  }
  await loadPromise;
  return cache!;
}

function persist(): Promise<void> {
  if (!cache) return Promise.resolve();
  const snapshot = {
    inventarios: cache.inventarios,
    grupos: cache.grupos,
    parcelas: cache.parcelas,
    arvores: cache.arvores,
    activityLog: cache.activityLog,
  };
  saveQueue = saveQueue.then(async () => {
    const r = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    if (!r.ok) throw new Error('inventario save ' + r.status);
  });
  return saveQueue;
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) {
    const next = list.slice();
    next[i] = item;
    return next;
  }
  return [...list, item];
}

function pushLog(entry: Omit<ActivityLogEntry, 'ts'>): void {
  if (!cache) return;
  cache.activityLog = [
    ...cache.activityLog,
    { ...entry, ts: new Date().toISOString() },
  ].slice(-LOG_MAX);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ----------------- Inventários -----------------

export async function listarInventarios(): Promise<Inventory[]> {
  const state = await ensureLoaded();
  return state.inventarios
    .slice()
    .sort(
      (a, b) =>
        new Date(b.atualizadoEm || b.criadoEm).getTime() -
        new Date(a.atualizadoEm || a.criadoEm).getTime()
    );
}

export async function obterInventario(id: string): Promise<Inventory | null> {
  const state = await ensureLoaded();
  return state.inventarios.find((i) => i.id === id) || null;
}

export async function salvarInventario(inventario: Inventory): Promise<Inventory> {
  const state = await ensureLoaded();
  inventario.atualizadoEm = new Date().toISOString();
  state.inventarios = upsertById(state.inventarios, inventario);
  pushLog({
    op: 'save',
    entity: 'inventario',
    id: inventario.id,
    label: inventario.nome || inventario.id,
    data: clone(inventario),
  });
  await persist();
  return inventario;
}

export async function excluirInventario(id: string): Promise<void> {
  const state = await ensureLoaded();
  const inv = state.inventarios.find((i) => i.id === id) || null;
  const grupos = state.grupos.filter((g) => g.inventarioId === id);
  const parcelas = state.parcelas.filter((p) => p.inventarioId === id);
  const parcelaIds = new Set(parcelas.map((p) => p.id));
  const arvores = state.arvores.filter(
    (a) => a.inventarioId === id || parcelaIds.has(a.parcelaId)
  );
  state.inventarios = state.inventarios.filter((i) => i.id !== id);
  state.grupos = state.grupos.filter((g) => g.inventarioId !== id);
  state.parcelas = state.parcelas.filter((p) => p.inventarioId !== id);
  state.arvores = state.arvores.filter(
    (a) => a.inventarioId !== id && !parcelaIds.has(a.parcelaId)
  );
  pushLog({
    op: 'delete',
    entity: 'inventario',
    id,
    label: inv?.nome || id,
    data: { inventario: inv, grupos, parcelas, arvores },
  });
  await persist();
}

// ----------------- Grupos -----------------

export async function listarGruposPorInventario(inventarioId: string): Promise<Group[]> {
  const state = await ensureLoaded();
  return state.grupos
    .filter((g) => g.inventarioId === inventarioId)
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));
}

export async function obterGrupo(id: string): Promise<Group | null> {
  const state = await ensureLoaded();
  return state.grupos.find((g) => g.id === id) || null;
}

export async function salvarGrupo(grupo: Group): Promise<Group> {
  const state = await ensureLoaded();
  grupo.atualizadoEm = new Date().toISOString();
  state.grupos = upsertById(state.grupos, grupo);
  pushLog({
    op: 'save',
    entity: 'grupo',
    id: grupo.id,
    label: grupo.nome || grupo.id,
    data: clone(grupo),
  });
  await persist();
  return grupo;
}

export async function excluirGrupo(id: string): Promise<void> {
  const state = await ensureLoaded();
  const grupo = state.grupos.find((g) => g.id === id) || null;
  const parcelas = state.parcelas.filter((p) => p.grupoId === id);
  const parcelaIds = new Set(parcelas.map((p) => p.id));
  const arvores = state.arvores.filter((a) => parcelaIds.has(a.parcelaId));
  state.grupos = state.grupos.filter((g) => g.id !== id);
  state.parcelas = state.parcelas.filter((p) => p.grupoId !== id);
  state.arvores = state.arvores.filter((a) => !parcelaIds.has(a.parcelaId));
  pushLog({
    op: 'delete',
    entity: 'grupo',
    id,
    label: grupo?.nome || id,
    data: { grupo, parcelas, arvores },
  });
  await persist();
}

// ----------------- Parcelas -----------------

export async function listarParcelasPorInventario(inventarioId: string): Promise<Plot[]> {
  const state = await ensureLoaded();
  return state.parcelas
    .filter((p) => p.inventarioId === inventarioId)
    .slice()
    .sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })
    );
}

export async function listarParcelasPorGrupo(grupoId: string): Promise<Plot[]> {
  const state = await ensureLoaded();
  return state.parcelas
    .filter((p) => p.grupoId === grupoId)
    .slice()
    .sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })
    );
}

export async function obterParcela(id: string): Promise<Plot | null> {
  const state = await ensureLoaded();
  return state.parcelas.find((p) => p.id === id) || null;
}

export async function salvarParcela(parcela: Plot): Promise<Plot> {
  const state = await ensureLoaded();
  parcela.atualizadoEm = new Date().toISOString();
  state.parcelas = upsertById(state.parcelas, parcela);
  pushLog({
    op: 'save',
    entity: 'parcela',
    id: parcela.id,
    label: parcela.codigo || parcela.id,
    data: clone(parcela),
  });
  await persist();
  return parcela;
}

export async function excluirParcela(id: string): Promise<void> {
  const state = await ensureLoaded();
  const parcela = state.parcelas.find((p) => p.id === id) || null;
  const arvores = state.arvores.filter((a) => a.parcelaId === id);
  state.parcelas = state.parcelas.filter((p) => p.id !== id);
  state.arvores = state.arvores.filter((a) => a.parcelaId !== id);
  pushLog({
    op: 'delete',
    entity: 'parcela',
    id,
    label: parcela?.codigo || id,
    data: { parcela, arvores },
  });
  await persist();
}

// ----------------- Árvores -----------------

export async function listarArvoresPorParcela(parcelaId: string): Promise<Tree[]> {
  const state = await ensureLoaded();
  return state.arvores
    .filter((a) => a.parcelaId === parcelaId)
    .slice()
    .sort((a, b) => {
      const numA = Number(a.numero);
      const numB = Number(b.numero);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.numero).localeCompare(String(b.numero), undefined, { numeric: true });
    });
}

export async function listarTodasArvoresPorInventario(inventarioId: string): Promise<Tree[]> {
  const state = await ensureLoaded();
  return state.arvores.filter((a) => a.inventarioId === inventarioId);
}

export async function salvarArvore(arvore: Tree): Promise<Tree> {
  const state = await ensureLoaded();
  arvore.atualizadoEm = new Date().toISOString();
  state.arvores = upsertById(state.arvores, arvore);
  pushLog({
    op: 'save',
    entity: 'arvore',
    id: arvore.id,
    label: `#${arvore.numero} ${arvore.especie || ''}`.trim(),
    data: clone(arvore),
  });
  await persist();
  return arvore;
}

export async function excluirArvore(id: string): Promise<void> {
  const state = await ensureLoaded();
  const arvore = state.arvores.find((a) => a.id === id) || null;
  state.arvores = state.arvores.filter((a) => a.id !== id);
  pushLog({
    op: 'delete',
    entity: 'arvore',
    id,
    label: arvore ? `#${arvore.numero}` : id,
    data: { arvore },
  });
  await persist();
}

// ----------------- Activity log -----------------

export async function listarActivityLog(): Promise<ActivityLogEntry[]> {
  const state = await ensureLoaded();
  return state.activityLog.slice();
}

export async function exportarActivityLogTxt(): Promise<string> {
  const log = await listarActivityLog();
  const lines = [
    'Inventario Florestal ESALQ/USP — registro de atividades',
    `Gerado em: ${new Date().toISOString()}`,
    `Total de eventos: ${log.length}`,
    '',
  ];
  for (const e of log) {
    lines.push(`[${e.ts}] ${e.op.toUpperCase()} ${e.entity} ${e.id} | ${e.label}`);
    if (e.data !== undefined) {
      lines.push(JSON.stringify(e.data));
    }
    lines.push('---');
  }
  return lines.join('\n');
}

// ----------------- Backup e Restauração -----------------

export async function exportarBackupCompleto(): Promise<BackupData> {
  const state = await ensureLoaded();
  return {
    versao: '2.0.0',
    geradoEm: new Date().toISOString(),
    instituicao: 'ESALQ/USP — Centro de Métodos Quantitativos (CMQ)',
    inventarios: state.inventarios.slice(),
    grupos: state.grupos.slice(),
    parcelas: state.parcelas.slice(),
    arvores: state.arvores.slice(),
  };
}

export async function importarBackupCompleto(
  backup: BackupData,
  modoSubstituicao: 'mesclar' | 'substituir' = 'mesclar'
): Promise<{ totalInventarios: number; totalGrupos: number; totalParcelas: number; totalArvores: number }> {
  const state = await ensureLoaded();

  if (!backup.inventarios || !Array.isArray(backup.inventarios)) {
    throw new Error('Arquivo de backup inválido: lista de inventários ausente ou corrompida.');
  }

  if (modoSubstituicao === 'substituir') {
    state.inventarios = [];
    state.grupos = [];
    state.parcelas = [];
    state.arvores = [];
  }

  for (const inv of backup.inventarios) state.inventarios = upsertById(state.inventarios, inv);
  if (Array.isArray(backup.grupos)) {
    for (const g of backup.grupos) state.grupos = upsertById(state.grupos, g);
  }
  if (Array.isArray(backup.parcelas)) {
    for (const p of backup.parcelas) state.parcelas = upsertById(state.parcelas, p);
  }
  if (Array.isArray(backup.arvores)) {
    for (const t of backup.arvores) state.arvores = upsertById(state.arvores, t);
  }

  pushLog({
    op: 'save',
    entity: 'inventario',
    id: 'backup-import',
    label: `Importação de backup (${modoSubstituicao})`,
    data: {
      totalInventarios: backup.inventarios.length,
      totalGrupos: backup.grupos?.length || 0,
      totalParcelas: backup.parcelas?.length || 0,
      totalArvores: backup.arvores?.length || 0,
    },
  });

  await persist();
  return {
    totalInventarios: backup.inventarios.length,
    totalGrupos: backup.grupos?.length || 0,
    totalParcelas: backup.parcelas?.length || 0,
    totalArvores: backup.arvores?.length || 0,
  };
}

export async function resetLocalCache(): Promise<void> {
  cache = emptyState();
  loadPromise = null;
  await ensureLoaded();
}
