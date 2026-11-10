import { Reservation, FairUseRules } from '../types';

export interface ValidationResult {
  isValid: boolean;            // true if no hard conflict (can be booked)
  hardError?: string;          // direct time collision or invalid time
  isNonFairUse: boolean;       // true if exceeds fair-use policy
  fairUseViolations: string[]; // specific reasons why it exceeds fair-use
  thresholdIso?: string;       // exact ISO time when the fair-use limit is crossed
  warnings?: string[];
}

export function isOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getWeekKey(date: Date): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${target.getFullYear()}-W${weekNum < 10 ? '0' : ''}${weekNum}`;
}

/** Local Monday 00:00 → next Monday 00:00 for the week containing `date`. */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7; // Mon=0 … Sun=6
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

/** Hours of [startIso, endIso] that fall inside the week of `weekRef`. */
export function hoursOverlappingWeek(
  startIso: string,
  endIso: string,
  weekRef: Date
): number {
  const { start: weekStart, end: weekEnd } = getWeekBounds(weekRef);
  const s = Math.max(new Date(startIso).getTime(), weekStart.getTime());
  const e = Math.min(new Date(endIso).getTime(), weekEnd.getTime());
  return Math.max(0, (e - s) / (1000 * 60 * 60));
}

function sameUser(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function validateReservation(
  candidate: {
    workstationId: string;
    researcherName: string;
    startTime: string;
    endTime: string;
  },
  existingReservations: Reservation[],
  rules: FairUseRules,
  currentReservationIdToExclude?: string
): ValidationResult {
  const fairUseViolations: string[] = [];
  const warnings: string[] = [];
  const start = new Date(candidate.startTime);
  const end = new Date(candidate.endTime);
  const now = new Date();
  let thresholdDate: Date | undefined = undefined;

  // 1. Basic time boundary validations (Hard Errors)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isValid: false,
      hardError: 'Horários de início ou término inválidos.',
      isNonFairUse: false,
      fairUseViolations: [],
    };
  }

  if (end <= start) {
    return {
      isValid: false,
      hardError: 'O horário de término deve ser posterior ao horário de início.',
      isNonFairUse: false,
      fairUseViolations: [],
    };
  }

  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  if (durationHours < 0.25) {
    return {
      isValid: false,
      hardError: 'A reserva mínima deve ser de pelo menos 15 minutos.',
      isNonFairUse: false,
      fairUseViolations: [],
    };
  }

  // 2. Hard conflict only with other ACTIVE reservations (completed/cancelled free the slot)
  const conflicts = existingReservations.filter((res) => {
    if (res.id === currentReservationIdToExclude) return false;
    if (res.workstationId !== candidate.workstationId) return false;
    if (res.status !== 'active') return false;

    const resStart = new Date(res.startTime);
    const resEnd = new Date(res.endTime);
    return isOverlapping(start, end, resStart, resEnd);
  });

  if (conflicts.length > 0) {
    const firstConflict = conflicts[0];
    const cStart = new Date(firstConflict.startTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const cEnd = new Date(firstConflict.endTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      isValid: false,
      hardError: `Conflito de horário! A máquina já está reservada por ${firstConflict.researcherName} entre ${cStart} e ${cEnd}.`,
      isNonFairUse: false,
      fairUseViolations: [],
    };
  }

  // 3. Fair-use Rule: Max advance booking (e.g. 14 days ahead)
  const msInDay = 24 * 60 * 60 * 1000;
  const daysInAdvance = (start.getTime() - now.getTime()) / msInDay;

  if (daysInAdvance > rules.maxAdvanceDays) {
    fairUseViolations.push(
      `Antecedência de ${Math.round(daysInAdvance)} dias (limite: ${rules.maxAdvanceDays} dias).`
    );
    thresholdDate = start;
  }

  // 4. Fair-use Rule: Maximum continuous hours per booking
  const startsOnWeekend = isWeekend(start);
  const maxHoursAllowed = startsOnWeekend
    ? rules.maxContinuousHoursWeekend
    : rules.maxContinuousHoursWeekday;

  if (durationHours > maxHoursAllowed) {
    fairUseViolations.push(
      `Duração de ${durationHours.toFixed(1)}h excede o limite contínuo de ${maxHoursAllowed}h (${startsOnWeekend ? 'fim de semana' : 'dias úteis'}).`
    );
    const continuousCutoff = new Date(start.getTime() + maxHoursAllowed * 60 * 60 * 1000);
    if (!thresholdDate || continuousCutoff.getTime() < thresholdDate.getTime()) {
      thresholdDate = continuousCutoff;
    }
  }

  // 5. Fair-use Rule: Weekly quota per user (only hours that fall in this week)
  const { start: weekStart, end: weekEnd } = getWeekBounds(start);
  const otherHoursThisWeek = existingReservations.reduce((sum, res) => {
    if (res.id === currentReservationIdToExclude) return sum;
    if (res.status === 'cancelled') return sum;
    if (res.status !== 'active' && res.status !== 'completed') return sum;
    if (!sameUser(res.researcherName, candidate.researcherName)) return sum;
    const rStart = new Date(res.startTime);
    const rEnd = new Date(res.endTime);
    if (!(rStart < weekEnd && rEnd > weekStart)) return sum;
    return sum + hoursOverlappingWeek(res.startTime, res.endTime, start);
  }, 0);

  const candidateHoursThisWeek = hoursOverlappingWeek(
    candidate.startTime,
    candidate.endTime,
    start
  );

  if (otherHoursThisWeek + candidateHoursThisWeek > rules.maxWeeklyHoursPerUser + 1e-9) {
    fairUseViolations.push(
      `Cota semanal: Totalizará ${(otherHoursThisWeek + candidateHoursThisWeek).toFixed(1)}h na semana (limite: ${rules.maxWeeklyHoursPerUser}h).`
    );
    const remainingQuota = Math.max(0, rules.maxWeeklyHoursPerUser - otherHoursThisWeek);
    const quotaCutoff = new Date(start.getTime() + remainingQuota * 60 * 60 * 1000);
    if (!thresholdDate || quotaCutoff.getTime() < thresholdDate.getTime()) {
      thresholdDate = quotaCutoff;
    }
  }

  return {
    isValid: true,
    isNonFairUse: fairUseViolations.length > 0,
    fairUseViolations,
    thresholdIso: thresholdDate ? thresholdDate.toISOString() : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Recompute isNonFairUse / threshold / reasons for every reservation.
 * Call after create / edit / delete / release / extend so flags never stay stale
 * (e.g. after cancelling one day of a weekly series).
 */
export function applyFairUseFlags(
  reservations: Reservation[],
  rules: FairUseRules
): Reservation[] {
  return reservations.map((r) => {
    if (r.status === 'cancelled') {
      return {
        ...r,
        isNonFairUse: false,
        nonFairUseThreshold: undefined,
        nonFairUseReasons: undefined,
      };
    }

    const v = validateReservation(
      {
        workstationId: r.workstationId,
        researcherName: r.researcherName,
        startTime: r.startTime,
        endTime: r.endTime,
      },
      reservations,
      rules,
      r.id
    );

    if (!v.isValid) {
      return {
        ...r,
        isNonFairUse: false,
        nonFairUseThreshold: undefined,
        nonFairUseReasons: undefined,
      };
    }

    return {
      ...r,
      isNonFairUse: v.isNonFairUse,
      nonFairUseThreshold: v.isNonFairUse ? v.thresholdIso : undefined,
      nonFairUseReasons: v.isNonFairUse ? v.fairUseViolations : undefined,
    };
  });
}
