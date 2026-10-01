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
    reservations: Array.isArray(data.reservations) ? data.reservations : [],
    deletionLog: Array.isArray(data.deletionLog) ? data.deletionLog : [],
    rules: data.rules && typeof data.rules === 'object'
      ? { ...DEFAULT_RULES, ...data.rules }
      : base.rules,
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
