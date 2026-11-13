export type WorkstationStatus = 'available' | 'in_use' | 'maintenance';

/** Labs that share this booking platform */
export const LAB_IDS = ['CMQ', 'Extra'] as const;
export type LabId = (typeof LAB_IDS)[number];

export function normalizeLab(lab?: string | null): LabId {
  return lab === 'Extra' ? 'Extra' : 'CMQ';
}

/** Display names like "CMQ - Matheus Barros" for clearer selection. */
export function ensureLabPrefixedName(name: string, defaultLab: LabId = 'CMQ'): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const match = trimmed.match(/^(CMQ|Extra)\s*-\s*(.+)$/i);
  if (match) {
    const lab = normalizeLab(match[1]);
    return `${lab} - ${match[2].trim()}`;
  }
  return `${defaultLab} - ${trimmed}`;
}

export interface Workstation {
  id: string;
  name: string;
  bayNumber: number | string;
  /** Lab group — CMQ or Extra (test / other) */
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
