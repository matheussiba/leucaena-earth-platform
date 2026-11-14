export type WorkstationStatus = 'available' | 'in_use' | 'maintenance';

/** Free-form lab id (e.g. CMQ, CePE-Geo). Always at least CMQ exists. */
export type LabId = string;

export const DEFAULT_LAB = 'CMQ';
/** Fallback when a lab is deleted or a machine has no lab; only shown if it has machines. */
export const UNALLOCATED_LAB = 'Não alocado';
export const DEFAULT_LABS: LabId[] = [DEFAULT_LAB];

export function normalizeLab(lab?: string | null): LabId {
  const t = (lab || '').trim();
  return t || UNALLOCATED_LAB;
}

/** Palette for lab tags — cycles for any new lab name. */
const LAB_TAG_STYLES = [
  'bg-sky-100 text-sky-950 border-sky-300 ring-1 ring-sky-200/80',
  'bg-violet-100 text-violet-900 border-violet-300 ring-1 ring-violet-200/80',
  'bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-200/80',
  'bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-200/80',
  'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-200/80',
  'bg-indigo-100 text-indigo-900 border-indigo-300 ring-1 ring-indigo-200/80',
  'bg-teal-100 text-teal-900 border-teal-300 ring-1 ring-teal-200/80',
  'bg-orange-100 text-orange-950 border-orange-300 ring-1 ring-orange-200/80',
];

export function labTagClass(lab?: string | null): string {
  const id = normalizeLab(lab);
  if (id === UNALLOCATED_LAB) {
    return 'bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-200/80';
  }
  if (id === DEFAULT_LAB) return LAB_TAG_STYLES[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % LAB_TAG_STYLES.length;
  // Avoid colliding with CMQ's sky style when possible
  return LAB_TAG_STYLES[idx === 0 ? 1 : idx];
}

/** Display names like "CMQ - Matheus Barros" for clearer selection. */
export function ensureLabPrefixedName(name: string, defaultLab: LabId = DEFAULT_LAB): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const match = trimmed.match(/^(.+?)\s*-\s*(.+)$/);
  if (match) {
    const lab = normalizeLab(match[1]);
    return `${lab} - ${match[2].trim()}`;
  }
  return `${normalizeLab(defaultLab)} - ${trimmed}`;
}

/**
 * Registered labs + labs still on machines.
 * "Não alocado" appears only when at least one machine is there.
 * CMQ stays first among real labs.
 */
export function collectLabs(
  registered: LabId[] | undefined,
  workstations: { lab?: string | null }[]
): LabId[] {
  const set = new Set<string>();
  for (const l of registered || []) {
    const n = (l || '').trim();
    if (n && n !== UNALLOCATED_LAB) set.add(n);
  }
  let hasUnallocated = false;
  for (const w of workstations || []) {
    const n = normalizeLab(w.lab);
    if (n === UNALLOCATED_LAB) hasUnallocated = true;
    else set.add(n);
  }
  if (set.size === 0 && !hasUnallocated) set.add(DEFAULT_LAB);
  const ordered = [...set].sort((a, b) => {
    if (a === DEFAULT_LAB) return -1;
    if (b === DEFAULT_LAB) return 1;
    return a.localeCompare(b, 'pt-BR');
  });
  if (hasUnallocated) ordered.push(UNALLOCATED_LAB);
  return ordered;
}

/** Audit trail for labs, machines and member registry changes. */
export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

export interface Workstation {
  id: string;
  name: string;
  /** Bay number or machine code (e.g. 04, GIGC). Optional when not in a bay. */
  bayNumber: number | string;
  /** Lab group — e.g. CMQ; new labs can be registered in the app */
  lab: LabId;
  location: string;
  imageUrl?: string;
  ip?: string;                  // IP de rede da máquina
  gpu: string;
  cpu: string;
  ram: string;
  internalStorage: string;      // HD Interno
  additionalStorage?: string;   // HD Adicional (se existir)
  os?: string;
  status: WorkstationStatus;
  notes?: string;
  isCustom?: boolean;
}

export type ResearcherRole =
  | 'TT'
  | 'Iniciação Científica'
  | 'Mestrado'
  | 'Doutorado'
  | 'Pós-Doc'
  | 'Professor'
  | 'Técnico do Lab';

export interface LabMember {
  id: string;
  name: string;
  role: ResearcherRole;
}

export type ReservationType = 'instant_checkin' | 'scheduled';
export type ReservationStatus = 'active' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  workstationId: string;
  researcherName: string;
  researcherRole: ResearcherRole;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  type: ReservationType;
  status: ReservationStatus;
  checkedInAt?: string;
  notes?: string;
  isNonFairUse?: boolean;
  nonFairUseThreshold?: string; // Horário exato a partir do qual ultrapassa o Fair-Use
  nonFairUseReasons?: string[];
  /** When the booking was created. Null for legacy rows without that timestamp. */
  createdAt: string | null;
  /** Optional series id when created via recurrence */
  seriesId?: string;
  /**
   * Uso compartilhado: from `sharedFrom` (or start if omitted) until end,
   * the block is half-height so another person can use the machine.
   */
  isSharedUse?: boolean;
  /** ISO instant when the shared (50% height) portion begins. */
  sharedFrom?: string;
}

/** Snapshot kept after hard-delete so the occupancy log still has history. */
export interface DeletedReservationEntry {
  deletedAt: string; // ISO
  reservation: Reservation;
}

export interface FairUseRules {
  maxContinuousHoursWeekday: number; // e.g. 12h
  maxContinuousHoursWeekend: number; // e.g. 36h
  maxAdvanceDays: number;            // e.g. 14 days
  maxWeeklyHoursPerUser: number;     // e.g. 40h/semana
  maxActiveBookingsPerUser: number;  // e.g. 4 reservas ativas
  toleranceCheckInMinutes: number;   // e.g. 20 min
}

export type CalendarViewMode = 'day' | 'week' | 'month';
