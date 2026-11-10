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
  const { start } = getWeekBounds(date);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // Monday of that week (local)
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

function countsTowardWeekly(res: Reservation): boolean {
  return res.status === 'active' || res.status === 'completed';
}

/** Chronological order: earlier start first; tie-break by end, then id. */
function compareChronological(
  aStart: number,
  aEnd: number,
  aId: string,
  bStart: number,
  bEnd: number,
  bId: string
): number {
  if (aStart !== bStart) return aStart - bStart;
  if (aEnd !== bEnd) return aEnd - bEnd;
  return aId.localeCompare(bId);
}

function earliestThreshold(
  current: Date | undefined,
  next: Date | undefined
): Date | undefined {
  if (!current) return next;
  if (!next) return current;
  return next.getTime() < current.getTime() ? next : current;
}

/** Non-weekly fair-use checks (advance booking + continuous duration). */
function evaluateNonWeeklyRules(
  start: Date,
  end: Date,
  rules: FairUseRules,
  now: Date = new Date()
): { violations: string[]; threshold?: Date } {
  const violations: string[] = [];
  let threshold: Date | undefined;
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  const msInDay = 24 * 60 * 60 * 1000;
  const daysInAdvance = (start.getTime() - now.getTime()) / msInDay;
  if (daysInAdvance > rules.maxAdvanceDays) {
    violations.push(
      `Antecedência de ${Math.round(daysInAdvance)} dias (limite: ${rules.maxAdvanceDays} dias).`
    );
    threshold = start;
  }

  const startsOnWeekend = isWeekend(start);
  const maxHoursAllowed = startsOnWeekend
    ? rules.maxContinuousHoursWeekend
    : rules.maxContinuousHoursWeekday;

  if (durationHours > maxHoursAllowed) {
    violations.push(
      `Duração de ${durationHours.toFixed(1)}h excede o limite contínuo de ${maxHoursAllowed}h (${startsOnWeekend ? 'fim de semana' : 'dias úteis'}).`
    );
    const continuousCutoff = new Date(start.getTime() + maxHoursAllowed * 60 * 60 * 1000);
    threshold = earliestThreshold(threshold, continuousCutoff);
  }

  return { violations, threshold };
}

/**
 * Hours already consuming weekly quota before this candidate in the same Mon–Sun week.
 * Earlier bookings (by start time) take fair-use first so cancelling Monday frees quota for later days.
 */
function weeklyHoursBeforeCandidate(
  candidate: { researcherName: string; startTime: string; endTime: string; id?: string },
  existingReservations: Reservation[],
  weekRef: Date,
  excludeId?: string
): number {
  const candStart = new Date(candidate.startTime).getTime();
  const candEnd = new Date(candidate.endTime).getTime();
  const candId = candidate.id ?? '\uffff'; // new booking sorts after same-start peers

  return existingReservations.reduce((sum, res) => {
    if (res.id === excludeId) return sum;
    if (!countsTowardWeekly(res)) return sum;
    if (!sameUser(res.researcherName, candidate.researcherName)) return sum;

    const hours = hoursOverlappingWeek(res.startTime, res.endTime, weekRef);
    if (hours <= 0) return sum;

    const rStart = new Date(res.startTime).getTime();
    const rEnd = new Date(res.endTime).getTime();
    if (compareChronological(rStart, rEnd, res.id, candStart, candEnd, candId) >= 0) {
      return sum;
    }
    return sum + hours;
  }, 0);
}

function weeklyQuotaThreshold(
  startIso: string,
  endIso: string,
  hoursBefore: number,
  candidateHours: number,
  maxWeekly: number,
  weekRef: Date
): { exceeds: boolean; threshold?: Date; total: number } {
  const total = hoursBefore + candidateHours;
  if (total <= maxWeekly + 1e-9) {
    return { exceeds: false, total };
  }

  const { start: weekStart } = getWeekBounds(weekRef);
  const resStart = new Date(startIso).getTime();
  const overlapStart = Math.max(resStart, weekStart.getTime());
  const remaining = Math.max(0, maxWeekly - hoursBefore);
  const threshold = new Date(overlapStart + remaining * 60 * 60 * 1000);
  return { exceeds: true, threshold, total };
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

  // Hard conflict only with other ACTIVE reservations (completed/cancelled free the slot)
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

  const nonWeekly = evaluateNonWeeklyRules(start, end, rules, now);
  fairUseViolations.push(...nonWeekly.violations);
  thresholdDate = nonWeekly.threshold;

  // Weekly quota Mon–Sun: earlier bookings consume fair-use first
  const candidateHoursThisWeek = hoursOverlappingWeek(
    candidate.startTime,
    candidate.endTime,
    start
  );
  const hoursBefore = weeklyHoursBeforeCandidate(
    {
      ...candidate,
      id: currentReservationIdToExclude,
    },
    existingReservations,
    start,
    currentReservationIdToExclude
  );

  const weekly = weeklyQuotaThreshold(
    candidate.startTime,
    candidate.endTime,
    hoursBefore,
    candidateHoursThisWeek,
    rules.maxWeeklyHoursPerUser,
    start
  );

  if (weekly.exceeds) {
    fairUseViolations.push(
      `Cota semanal: Totalizará ${weekly.total.toFixed(1)}h na semana (seg–dom, limite: ${rules.maxWeeklyHoursPerUser}h).`
    );
    thresholdDate = earliestThreshold(thresholdDate, weekly.threshold);
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
 * Weekly quota is allocated chronologically within each Mon–Sun week so that
 * cancelling an early day redistributes fair-use to later days automatically.
 */
export function applyFairUseFlags(
  reservations: Reservation[],
  rules: FairUseRules
): Reservation[] {
  const now = new Date();

  type Acc = {
    violations: string[];
    threshold?: Date;
  };

  const acc: Acc[] = reservations.map((r) => {
    if (r.status === 'cancelled') return { violations: [] };
    const start = new Date(r.startTime);
    const end = new Date(r.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { violations: [] };
    }
    const nonWeekly = evaluateNonWeeklyRules(start, end, rules, now);
    return {
      violations: [...nonWeekly.violations],
      threshold: nonWeekly.threshold,
    };
  });

  // Collect (user, weekMonday) → reservation indices overlapping that week
  const groups = new Map<string, number[]>();

  reservations.forEach((r, index) => {
    if (!countsTowardWeekly(r)) return;
    const start = new Date(r.startTime);
    const end = new Date(r.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return;

    // Walk each Mon–Sun week the reservation touches
    let cursor = getWeekBounds(start).start;
    while (cursor < end) {
      const hours = hoursOverlappingWeek(r.startTime, r.endTime, cursor);
      if (hours > 0) {
        const key = `${r.researcherName.trim().toLowerCase()}|${getWeekKey(cursor)}`;
        const list = groups.get(key) || [];
        if (!list.includes(index)) list.push(index);
        groups.set(key, list);
      }
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }
  });

  for (const [key, indices] of groups) {
    const weekKey = key.split('|')[1];
    const [y, m, d] = weekKey.split('-').map(Number);
    const weekRef = new Date(y, m - 1, d, 12, 0, 0, 0);

    indices.sort((ia, ib) => {
      const a = reservations[ia];
      const b = reservations[ib];
      return compareChronological(
        new Date(a.startTime).getTime(),
        new Date(a.endTime).getTime(),
        a.id,
        new Date(b.startTime).getTime(),
        new Date(b.endTime).getTime(),
        b.id
      );
    });

    let used = 0;
    for (const index of indices) {
      const r = reservations[index];
      const hours = hoursOverlappingWeek(r.startTime, r.endTime, weekRef);
      if (hours <= 0) continue;

      const weekly = weeklyQuotaThreshold(
        r.startTime,
        r.endTime,
        used,
        hours,
        rules.maxWeeklyHoursPerUser,
        weekRef
      );

      if (weekly.exceeds) {
        acc[index].violations.push(
          `Cota semanal: Totalizará ${weekly.total.toFixed(1)}h na semana (seg–dom, limite: ${rules.maxWeeklyHoursPerUser}h).`
        );
        acc[index].threshold = earliestThreshold(acc[index].threshold, weekly.threshold);
      }

      used += hours;
    }
  }

  return reservations.map((r, i) => {
    if (r.status === 'cancelled') {
      return {
        ...r,
        isNonFairUse: false,
        nonFairUseThreshold: undefined,
        nonFairUseReasons: undefined,
      };
    }

    const { violations, threshold } = acc[i];
    // Dedupe violation messages (same week touched twice shouldn't duplicate)
    const unique = [...new Set(violations)];
    const isNonFairUse = unique.length > 0;

    return {
      ...r,
      isNonFairUse,
      nonFairUseThreshold: isNonFairUse && threshold ? threshold.toISOString() : undefined,
      nonFairUseReasons: isNonFairUse ? unique : undefined,
    };
  });
}
