export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RecurrenceUnit = 'days' | 'weeks' | 'months' | 'years';
export type RecurrenceEnd =
  | { type: 'never' }
  | { type: 'on_date'; date: string } // YYYY-MM-DD
  | { type: 'after'; count: number };

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** Used when frequency === 'custom' */
  interval?: number;
  unit?: RecurrenceUnit;
  /** 0=Dom … 6=Sáb — used for weekly / custom-weeks */
  weekdays?: number[];
  end: RecurrenceEnd;
}

export interface OccurrenceWindow {
  startTime: string;
  endTime: string;
}

const ABSOLUTE_MAX = 100;
const NEVER_HORIZON_YEARS = 2;

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addByUnit(date: Date, amount: number, unit: RecurrenceUnit) {
  const next = new Date(date);
  if (unit === 'days') next.setDate(next.getDate() + amount);
  else if (unit === 'weeks') next.setDate(next.getDate() + amount * 7);
  else if (unit === 'months') next.setMonth(next.getMonth() + amount);
  else next.setFullYear(next.getFullYear() + amount);
  return next;
}

function resolveUnit(rule: RecurrenceRule): { interval: number; unit: RecurrenceUnit } {
  if (rule.frequency === 'custom') {
    return {
      interval: Math.max(1, rule.interval || 1),
      unit: rule.unit || 'weeks',
    };
  }
  if (rule.frequency === 'daily') return { interval: 1, unit: 'days' };
  if (rule.frequency === 'weekly') return { interval: 1, unit: 'weeks' };
  if (rule.frequency === 'monthly') return { interval: 1, unit: 'months' };
  return { interval: 1, unit: 'years' };
}

function usesWeekdays(rule: RecurrenceRule, unit: RecurrenceUnit) {
  return (
    rule.frequency === 'weekly' ||
    (rule.frequency === 'custom' && unit === 'weeks')
  );
}

/**
 * Expands a recurrence rule into concrete start/end windows.
 * The first occurrence is always the provided base window.
 * "Never" is capped to 2 years ahead and ABSOLUTE_MAX occurrences.
 */
export function expandRecurrence(
  baseStartIso: string,
  baseEndIso: string,
  rule: RecurrenceRule | null | undefined
): OccurrenceWindow[] {
  const baseStart = new Date(baseStartIso);
  const baseEnd = new Date(baseEndIso);
  if (Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) {
    return [];
  }

  const durationMs = baseEnd.getTime() - baseStart.getTime();
  if (durationMs <= 0) return [];

  if (!rule) {
    return [{ startTime: baseStartIso, endTime: baseEndIso }];
  }

  const { interval, unit } = resolveUnit(rule);
  const weekdays =
    usesWeekdays(rule, unit) && rule.weekdays && rule.weekdays.length > 0
      ? [...new Set(rule.weekdays)].sort((a, b) => a - b)
      : null;

  let maxCount = ABSOLUTE_MAX;
  let until: Date | null = null;

  if (rule.end.type === 'after') {
    maxCount = Math.min(ABSOLUTE_MAX, Math.max(1, Math.floor(rule.end.count)));
  } else if (rule.end.type === 'on_date') {
    until = new Date(`${rule.end.date}T23:59:59`);
    if (Number.isNaN(until.getTime())) until = null;
  } else {
    until = new Date(baseStart);
    until.setFullYear(until.getFullYear() + NEVER_HORIZON_YEARS);
  }

  const results: OccurrenceWindow[] = [];

  const pushOccurrence = (start: Date) => {
    if (until && startOfLocalDay(start) > until) return false;
    if (results.length >= maxCount) return false;
    results.push({
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + durationMs).toISOString(),
    });
    return results.length < maxCount;
  };

  if (!weekdays) {
    let cursor = new Date(baseStart);
    while (pushOccurrence(cursor)) {
      cursor = addByUnit(cursor, interval, unit);
      if (until && cursor > until) break;
    }
    return results;
  }

  // Weekly / custom-weeks with selected weekdays
  const selected = new Set(weekdays);
  // Seed: include base if its weekday is selected; otherwise start scanning from base day
  let dayCursor = startOfLocalDay(baseStart);
  const h = baseStart.getHours();
  const mi = baseStart.getMinutes();
  const s = baseStart.getSeconds();
  const ms = baseStart.getMilliseconds();

  // Walk day by day within each week-interval block
  // Strategy: find all matching weekdays in the "week of" dayCursor, then jump interval weeks
  const firstWeekStart = new Date(dayCursor);
  firstWeekStart.setDate(firstWeekStart.getDate() - firstWeekStart.getDay()); // Sunday of first week

  let weekStart = firstWeekStart;
  const hardStop = until
    ? until
    : addByUnit(baseStart, NEVER_HORIZON_YEARS, 'years');

  while (results.length < maxCount && weekStart <= hardStop) {
    for (const wd of weekdays) {
      const occDay = new Date(weekStart);
      occDay.setDate(weekStart.getDate() + wd);
      if (occDay < startOfLocalDay(baseStart)) continue;
      if (until && occDay > until) continue;
      if (!selected.has(wd)) continue;
      const start = new Date(occDay);
      start.setHours(h, mi, s, ms);
      if (start.getTime() < baseStart.getTime() - 1000) continue;
      if (!pushOccurrence(start)) return results;
    }
    weekStart = addByUnit(weekStart, interval, 'weeks');
  }

  return results;
}

export function describeRecurrenceCap(rule: RecurrenceRule): string | null {
  if (rule.end.type === 'never') {
    return `Sem data final: limitado a ${ABSOLUTE_MAX} ocorrências ou ${NEVER_HORIZON_YEARS} anos.`;
  }
  return null;
}
