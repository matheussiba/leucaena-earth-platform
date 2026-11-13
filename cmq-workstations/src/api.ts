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
  withDefaultLab,
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
  const byId = new Set(list.map((w) => w.id));
  const missing = INITIAL_WORKSTATIONS.filter((w) => !byId.has(w.id)).map((w) => ({
    ...w,
  }));
  return missing.length ? [...list, ...missing] : list;
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
      mergeSeedWorkstations(
        Array.isArray(data.workstations) && data.workstations.length
          ? data.workstations
          : base.workstations
      )
    ),
    members: Array.isArray(data.members) && data.members.length
      ? data.members
      : base.members,
    rules: (() => {
      const merged =
        data.rules && typeof data.rules === 'object'
          ? { ...DEFAULT_RULES, ...data.rules }
          : { ...base.rules };
      // Policy updates: weekly quota 28/32/36 → 40h
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
      // Refresh sticky fair-use flags against current rules / remaining bookings
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
    body: JSON.stringify(state),
  });
  if (!r.ok) throw new Error('cmq save ' + r.status);
}
