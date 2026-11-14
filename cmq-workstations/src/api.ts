import {
  Workstation,
  Reservation,
  FairUseRules,
  LabMember,
  DeletedReservationEntry,
  LabId,
  ensureLabPrefixedName,
  collectLabs,
  DEFAULT_LABS,
  DEFAULT_LAB,
} from './types';
import {
  INITIAL_WORKSTATIONS,
  INITIAL_MEMBERS,
  DEFAULT_RULES,
  defaultIpForBay,
  withDefaultLab,
  withLabPrefixedMember,
  isRetiredTestWorkstation,
  isRetiredTestMember,
} from './data/initialData';
import { applyFairUseFlags } from './utils/fairUseValidator';

function withDefaultIps(list: Workstation[]): Workstation[] {
  return list.map((w) =>
    withDefaultLab({
      ...w,
      ip: (w.ip && String(w.ip).trim()) || defaultIpForBay(w) || undefined,
    })
  );
}

/** Ensure seed workstations exist even when an older saved state is loaded. */
function mergeSeedWorkstations(list: Workstation[]): Workstation[] {
  const cleaned = list.filter((w) => !isRetiredTestWorkstation(w));
  const byId = new Set(cleaned.map((w) => w.id));
  const missing = INITIAL_WORKSTATIONS.filter((w) => !byId.has(w.id)).map((w) => ({
    ...w,
  }));
  return missing.length ? [...cleaned, ...missing] : cleaned;
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
  rules: FairUseRules;
  /** Registered labs (CMQ always present); new labs appear in filters/accordions automatically */
  labs: LabId[];
};

const API = '/cmq/api/state';

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
    rules: { ...DEFAULT_RULES },
    labs: [...DEFAULT_LABS],
  };
}

export async function loadState(): Promise<CmqState> {
  const r = await fetch(API, { cache: 'no-store' });
  if (!r.ok) throw new Error('cmq load ' + r.status);
  const data = await r.json();
  const base = defaultState();
  const workstations = withDefaultIps(
    mergeSeedWorkstations(
      Array.isArray(data.workstations) && data.workstations.length
        ? data.workstations
        : base.workstations
    )
  );
  const registeredLabs = Array.isArray(data.labs)
    ? data.labs.map((l: string) => String(l || '').trim()).filter(Boolean)
    : base.labs;
  return {
    workstations,
    members: Array.isArray(data.members) && data.members.length
      ? mergeSeedMembers(data.members)
      : base.members,
    labs: collectLabs(registeredLabs, workstations),
    rules: (() => {
      const merged =
        data.rules && typeof data.rules === 'object'
          ? { ...DEFAULT_RULES, ...data.rules }
          : { ...base.rules };
      if ([28, 32, 36].includes(merged.maxWeeklyHoursPerUser)) {
        merged.maxWeeklyHoursPerUser = DEFAULT_RULES.maxWeeklyHoursPerUser;
      }
      return merged;
    })(),
    reservations: (() => {
      const list = Array.isArray(data.reservations)
        ? data.reservations.map(normalizeReservation)
        : [];
      const rules =
        data.rules && typeof data.rules === 'object'
          ? { ...DEFAULT_RULES, ...data.rules }
          : { ...base.rules };
      if ([28, 32, 36].includes(rules.maxWeeklyHoursPerUser)) {
        rules.maxWeeklyHoursPerUser = DEFAULT_RULES.maxWeeklyHoursPerUser;
      }
      return applyFairUseFlags(list, rules);
    })(),
    deletionLog: Array.isArray(data.deletionLog)
      ? data.deletionLog.map((entry: DeletedReservationEntry) => ({
          ...entry,
          reservation: normalizeReservation(entry.reservation),
        }))
      : [],
  };
}

export async function saveState(state: CmqState): Promise<void> {
  const r = await fetch(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...state,
      labs: collectLabs(state.labs, state.workstations),
    }),
  });
  if (!r.ok) throw new Error('cmq save ' + r.status);
}
