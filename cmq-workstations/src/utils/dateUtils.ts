import { Reservation } from '../types';

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export function formatDateShort(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '--/--';
  }
}

export function formatDateFull(date: Date): string {
  try {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return '';
  }
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function getTimeRemaining(endIso: string): {
  totalMs: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isExpired: boolean;
} {
  const now = new Date().getTime();
  const end = new Date(endIso).getTime();
  const totalMs = end - now;

  if (totalMs <= 0) {
    return {
      totalMs: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Finalizado',
      isExpired: true,
    };
  }

  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`;
  } else {
    formatted = `${seconds}s`;
  }

  return { totalMs, hours, minutes, seconds, formatted, isExpired: false };
}

export function getCurrentActiveReservation(
  workstationId: string,
  reservations: Reservation[]
): Reservation | null {
  const now = new Date();
  return (
    reservations.find((res) => {
      if (res.workstationId !== workstationId) return false;
      if (res.status !== 'active') return false;
      const start = new Date(res.startTime);
      const end = new Date(res.endTime);
      return now >= start && now <= end;
    }) || null
  );
}

export function getNextUpcomingReservation(
  workstationId: string,
  reservations: Reservation[]
): Reservation | null {
  const now = new Date();
  const upcoming = reservations
    .filter((res) => {
      if (res.workstationId !== workstationId) return false;
      if (res.status !== 'active') return false;
      const start = new Date(res.startTime);
      return start > now;
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  return upcoming[0] || null;
}

export function calculateDurationHours(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, (end - start) / (1000 * 60 * 60));
}

export function formatBayNumber(bay: number | string): string {
  const num = typeof bay === 'number' ? bay : Number(bay);
  if (isNaN(num)) return String(bay);
  return num < 10 ? `0${num}` : `${num}`;
}
