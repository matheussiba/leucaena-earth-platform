import {
  Workstation,
  Reservation,
  FairUseRules,
  LabMember,
  DeletedReservationEntry,
  ActivityLogEntry,
  StorageLatestMap,
  LabId,
  ensureLabPrefixedName,
  collectLabs,
  DEFAULT_LABS,
  DEFAULT_LAB,
  UNALLOCATED_LAB,
} from './types';
import {
  INITIAL_WORKSTATIONS,
  INITIAL_MEMBERS,
  DEFAULT_RULES,
  WORKSTATION_ID_ALIASES,
  defaultIpForBay,
  withDefaultLab,
  withLabPrefixedMember,
  isRetiredTestWorkstation,
  isRetiredTestMember,
} from './data/initialData';
import { applyFairUseFlags } from './utils/fairUseValidator';

/** API root follows the URL mount: /ws (canonical) or /cmq (legacy). */
export function labAppBase(): '/ws' | '/cmq' {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ws')) {
    return '/ws';
  }
  return '/cmq';
}

export function isLegacyCmqMount(): boolean {
  return labAppBase() === '/cmq';
}

function withDefaultIps(list: Workstation[]): Workstation[] {
  return list.map((w) =>
    withDefaultLab({
      ...w,
      ip: (w.ip && String(w.ip).trim()) || defaultIpForBay(w) || undefined,
    })
  );
}

function remapWorkstationId(id: string): string {
  return WORKSTATION_ID_ALIASES[id] || id;
}

/** Ensure seed workstations exist even when an older saved state is loaded. */
function mergeSeedWorkstations(list: Workstation[]): Workstation[] {
  const cleaned = list
    .filter((w) => !isRetiredTestWorkstation(w))
    .map((w) => {
      const id = remapWorkstationId(w.id);
      return id === w.id ? w : { ...w, id };
    });
  const byId = new Map<string, Workstation>();
  for (const w of cleaned) byId.set(w.id, w);
  for (const seed of INITIAL_WORKSTATIONS) {
    if (!byId.has(seed.id)) byId.set(seed.id, { ...seed });
  }
  return [...byId.values()];
}

function remapReservations(list: Reservation[]): Reservation[] {
  return list.map((r) => {
    const next = remapWorkstationId(r.workstationId);
    return next === r.workstationId ? r : { ...r, workstationId: next };
  });
}

function remapStorageLatest(map: StorageLatestMap): StorageLatestMap {
  const out: StorageLatestMap = {};
  for (const [k, v] of Object.entries(map || {})) {
    const nk = remapWorkstationId(k);
    out[nk] = { ...v, workstationId: nk };
  }
  return out;
}

function mergeSeedMembers(list: LabMember[]): LabMember[] {
  const cleaned = list.filter((m) => !isRetiredTestMember(m));
  const byId = new Set(cleaned.map((m) => m.id));
  const byName = new Set(cleaned.map((m) => m.name.trim().toLowerCase()));
  const missing = INITIAL_MEMBERS.filter(
    (m) => !byId.has(m.id) && !byName.has(m.name.trim().toLowerCase())
  ).map((m) => ({ ...m }));
  const prefixed = cleaned.map(withLabPrefixedMember);
  return missing.length ? [...prefixed, ...missing] : prefixed;
}

export type CmqState = {
  workstations: Workstation[];
  members: LabMember[];
  reservations: Reservation[];
  deletionLog: DeletedReservationEntry[];
  activityLog: ActivityLogEntry[];
  rules: FairUseRules;
  /** Registered labs; "Não alocado" is virtual and only shown when it has machines */
  labs: LabId[];
  /** Latest disk report per workstation id (from /ws|cmq/api/storage agents) */
  storageLatest: StorageLatestMap;
};

function stateApiUrl() {
  return `${labAppBase()}/api/state`;
}

function normalizeReservation(r: Reservation): Reservation {
  const raw = r?.createdAt;
  const createdAt =
    typeof raw === 'string' && raw.trim() && !Number.isNaN(new Date(raw).getTime())
      ? raw
      : null;
  return {
    ...r,
    createdAt,
    researcherName: ensureLabPrefixedName(r.researcherName || 'Usuário', DEFAULT_LAB),
  };
}

export function defaultState(): CmqState {
  return {
    workstations: withDefaultIps(INITIAL_WORKSTATIONS.map((w) => ({ ...w }))),
    members: INITIAL_MEMBERS.map((m) => ({ ...m })),
    reservations: [],
    deletionLog: [],
    activityLog: [],
    rules: { ...DEFAULT_RULES },
    labs: [...DEFAULT_LABS],
    storageLatest: {},
  };
}

function normalizeRegisteredLabs(raw: unknown, workstations: Workstation[]): LabId[] {
  const list = Array.isArray(raw)
    ? raw
        .map((l: string) => String(l || '').trim())
        .filter((n) => n && n !== UNALLOCATED_LAB)
    : [...DEFAULT_LABS];
  return collectLabs(list.length ? list : DEFAULT_LABS, workstations);
}

export async function loadState(): Promise<CmqState> {
  const r = await fetch(stateApiUrl(), { cache: 'no-store' });
  if (!r.ok) throw new Error('lab state load ' + r.status);
  const data = await r.json();
  const base = defaultState();
  const workstations = withDefaultIps(
    mergeSeedWorkstations(
      Array.isArray(data.workstations) && data.workstations.length
        ? data.workstations
        : base.workstations
    )
  );
  const rules = (() => {
    const merged =
      data.rules && typeof data.rules === 'object'
        ? { ...DEFAULT_RULES, ...data.rules }
        : { ...base.rules };
    if ([28, 32, 36].includes(merged.maxWeeklyHoursPerUser)) {
      merged.maxWeeklyHoursPerUser = DEFAULT_RULES.maxWeeklyHoursPerUser;
    }
    return merged;
  })();
  return {
    workstations,
    members: Array.isArray(data.members) && data.members.length
      ? mergeSeedMembers(data.members)
      : base.members,
    labs: normalizeRegisteredLabs(data.labs, workstations),
    rules,
    reservations: (() => {
      const list = remapReservations(
        Array.isArray(data.reservations)
          ? data.reservations.map(normalizeReservation)
          : []
      );
      return applyFairUseFlags(list, rules);
    })(),
    deletionLog: Array.isArray(data.deletionLog)
      ? data.deletionLog.map((entry: DeletedReservationEntry) => ({
          ...entry,
          reservation: normalizeReservation({
            ...entry.reservation,
            workstationId: remapWorkstationId(entry.reservation.workstationId),
          }),
        }))
      : [],
    activityLog: Array.isArray(data.activityLog)
      ? data.activityLog
          .filter(
            (e: ActivityLogEntry) =>
              e && typeof e.id === 'string' && typeof e.timestamp === 'string'
          )
          .map((e: ActivityLogEntry) => ({
            id: e.id,
            timestamp: e.timestamp,
            action: String(e.action || ''),
            details: String(e.details || ''),
          }))
      : [],
    storageLatest: remapStorageLatest(
      data.storageLatest &&
        typeof data.storageLatest === 'object' &&
        !Array.isArray(data.storageLatest)
        ? (data.storageLatest as StorageLatestMap)
        : {}
    ),
  };
}

/** Format free space for compact UI (e.g. "C: 120 GB livres"). */
export function formatStorageFreeLabel(report?: { disks?: Array<{ mount: string; freeBytes: number }> } | null): string {
  if (!report?.disks?.length) return '';
  return report.disks
    .map((d) => {
      const gb = d.freeBytes / (1024 ** 3);
      const label = gb >= 100 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`;
      return `${d.mount} ${label}`;
    })
    .join(' · ');
}

export async function saveState(state: CmqState): Promise<void> {
  const r = await fetch(stateApiUrl(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...state,
      labs: collectLabs(state.labs, state.workstations),
    }),
  });
  if (!r.ok) throw new Error('lab state save ' + r.status);
}
