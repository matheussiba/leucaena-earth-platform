import { Reservation } from '../types';
import { isOverlapping } from './fairUseValidator';

export type SharedUseFields = {
  startTime: string;
  endTime: string;
  isSharedUse?: boolean;
  /** ISO: from this instant until endTime the slot is half-height / shareable. */
  sharedFrom?: string;
};

/** Exclusive (full-height) window; null if the booking is fully shared. */
export function getHardInterval(
  res: SharedUseFields
): { start: Date; end: Date } | null {
  const start = new Date(res.startTime);
  const end = new Date(res.endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

  if (!res.isSharedUse) return { start, end };

  const from = res.sharedFrom ? new Date(res.sharedFrom) : start;
  if (isNaN(from.getTime())) return { start, end };

  // sharedFrom <= start → entire booking is shared
  if (from.getTime() <= start.getTime() + 500) return null;

  const hardEnd = new Date(Math.min(from.getTime(), end.getTime()));
  if (hardEnd <= start) return null;
  return { start, end: hardEnd };
}

/** Shareable (half-height) window; null if not shared. */
export function getSoftInterval(
  res: SharedUseFields
): { start: Date; end: Date } | null {
  const start = new Date(res.startTime);
  const end = new Date(res.endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
  if (!res.isSharedUse) return null;

  const from = res.sharedFrom ? new Date(res.sharedFrom) : start;
  if (isNaN(from.getTime())) return { start, end };

  const softStart = new Date(Math.max(from.getTime(), start.getTime()));
  if (softStart >= end) return null;
  return { start: softStart, end };
}

function modeAt(res: SharedUseFields, tMs: number): 'exclusive' | 'shared' | 'none' {
  const start = new Date(res.startTime).getTime();
  const end = new Date(res.endTime).getTime();
  if (tMs < start || tMs >= end) return 'none';
  if (!res.isSharedUse) return 'exclusive';
  const from = res.sharedFrom ? new Date(res.sharedFrom).getTime() : start;
  if (tMs < from) return 'exclusive';
  return 'shared';
}

/** Weight at time t given the other overlapping booking (0, 0.5, or 1). */
function usageAt(res: SharedUseFields, tMs: number, peer: SharedUseFields): number {
  const mode = modeAt(res, tMs);
  if (mode === 'none') return 0;
  if (mode === 'shared') return 0.5;
  // exclusive: half if peer is offering share at t
  if (modeAt(peer, tMs) === 'shared') return 0.5;
  return 1;
}

/**
 * Hard conflict respecting uso compartilhado:
 * exclusive blocks everyone; during a shared window a second booking may coexist (both at 50%).
 */
export function reservationsHardConflict(
  a: SharedUseFields,
  b: SharedUseFields
): boolean {
  const a0 = new Date(a.startTime).getTime();
  const a1 = new Date(a.endTime).getTime();
  const b0 = new Date(b.startTime).getTime();
  const b1 = new Date(b.endTime).getTime();
  if (!(a0 < b1 && a1 > b0)) return false;

  const points = new Set<number>();
  points.add(Math.max(a0, b0));
  points.add(Math.min(a1, b1));
  for (const res of [a, b]) {
    const h = getHardInterval(res);
    const s = getSoftInterval(res);
    if (h) {
      points.add(h.start.getTime());
      points.add(h.end.getTime());
    }
    if (s) {
      points.add(s.start.getTime());
      points.add(s.end.getTime());
    }
  }

  const sorted = [...points].filter((t) => t >= Math.max(a0, b0) && t <= Math.min(a1, b1)).sort((x, y) => x - y);

  for (let i = 0; i < sorted.length - 1; i++) {
    const mid = (sorted[i] + sorted[i + 1]) / 2;
    if (mid < Math.max(a0, b0) || mid >= Math.min(a1, b1)) continue;
    const sum = usageAt(a, mid, b) + usageAt(b, mid, a);
    if (sum > 1 + 1e-9) return true;
  }
  return false;
}

export function findHardConflicts(
  candidate: SharedUseFields & { workstationId: string },
  existing: Reservation[],
  excludeId?: string
): Reservation[] {
  return existing.filter((res) => {
    if (res.id === excludeId) return false;
    if (res.workstationId !== candidate.workstationId) return false;
    if (res.status !== 'active') return false;
    return reservationsHardConflict(candidate, res);
  });
}

/** Normalize sharedFrom to lie within [start, end]; clear if not shared. */
export function normalizeSharedFields(
  startIso: string,
  endIso: string,
  isSharedUse: boolean,
  sharedFromIso?: string
): { isSharedUse?: boolean; sharedFrom?: string } {
  if (!isSharedUse) return { isSharedUse: false, sharedFrom: undefined };
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  let from = sharedFromIso ? new Date(sharedFromIso).getTime() : start;
  if (isNaN(from)) from = start;
  from = Math.min(Math.max(from, start), end);
  return {
    isSharedUse: true,
    sharedFrom: new Date(from).toISOString(),
  };
}

export function overlapsInterval(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return isOverlapping(startA, endA, startB, endB);
}
