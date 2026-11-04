import {
  Workstation,
  Reservation,
  FairUseRules,
  LabMember,
  DeletedReservationEntry,
} from './types';
import {
  INITIAL_WORKSTATIONS,
  INITIAL_MEMBERS,
  DEFAULT_RULES,
  defaultIpForBay,
} from './data/initialData';

function withDefaultIps(list: Workstation[]): Workstation[] {
  return list.map((w) => ({
    ...w,
    ip: (w.ip && String(w.ip).trim()) || defaultIpForBay(w) || undefined,
  }));
}

export type CmqState = {
  workstations: Workstation[];
  members: LabMember[];
  reservations: Reservation[];
  deletionLog: DeletedReservationEntry[];
  rules: FairUseRules;
};

const API = '/cmq/api/state';

function normalizeReservation(r: Reservation): Reservation {
  const raw = r?.createdAt;
  const createdAt =
    typeof raw === 'string' && raw.trim() && !Number.isNaN(new Date(raw).getTime())
      ? raw
      : null;
  return { ...r, createdAt };
}

export function defaultState(): CmqState {
  return {
    workstations: withDefaultIps(INITIAL_WORKSTATIONS.map((w) => ({ ...w }))),
    members: INITIAL_MEMBERS.map((m) => ({ ...m })),
    reservations: [],
    deletionLog: [],
    rules: { ...DEFAULT_RULES },
  };
}

export async function loadState(): Promise<CmqState> {
  const r = await fetch(API, { cache: 'no-store' });
  if (!r.ok) throw new Error('cmq load ' + r.status);
  const data = await r.json();
  const base = defaultState();
  return {
    workstations: withDefaultIps(
      Array.isArray(data.workstations) && data.workstations.length
        ? data.workstations
        : base.workstations
    ),
    members: Array.isArray(data.members) && data.members.length
      ? data.members
      : base.members,
    reservations: Array.isArray(data.reservations)
      ? data.reservations.map(normalizeReservation)
      : [],
    deletionLog: Array.isArray(data.deletionLog)
      ? data.deletionLog.map((entry: DeletedReservationEntry) => ({
          ...entry,
          reservation: normalizeReservation(entry.reservation),
        }))
      : [],
    rules: (() => {
      const merged =
        data.rules && typeof data.rules === 'object'
          ? { ...DEFAULT_RULES, ...data.rules }
          : { ...base.rules };
      // Policy update: weekly quota moved from 28h → 36h
      if (merged.maxWeeklyHoursPerUser === 28) {
        merged.maxWeeklyHoursPerUser = DEFAULT_RULES.maxWeeklyHoursPerUser;
      }
      return merged;
    })(),
  };
}

export async function saveState(state: CmqState): Promise<void> {
  const r = await fetch(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!r.ok) throw new Error('cmq save ' + r.status);
}
