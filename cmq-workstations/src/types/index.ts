export type WorkstationStatus = 'available' | 'in_use' | 'maintenance';

export interface Workstation {
  id: string;
  name: string;
  bayNumber: number | string;
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
  createdAt: string;
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
  maxWeeklyHoursPerUser: number;     // e.g. 28h/semana
  maxActiveBookingsPerUser: number;  // e.g. 4 reservas ativas
  toleranceCheckInMinutes: number;   // e.g. 20 min
}

export type CalendarViewMode = 'day' | 'week' | 'month';
