/** Silent prefs (no cookie banner). Cookie + localStorage for last selected user. */

const USER_KEY = 'cmq_last_user';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

export function getLastSelectedUser(): string | null {
  try {
    const fromLs = localStorage.getItem(USER_KEY);
    if (fromLs && fromLs.trim()) return fromLs.trim();
  } catch {
    /* ignore */
  }
  const fromCookie = readCookie(USER_KEY);
  return fromCookie && fromCookie.trim() ? fromCookie.trim() : null;
}

export function setLastSelectedUser(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(USER_KEY, trimmed);
  } catch {
    /* ignore */
  }
  writeCookie(USER_KEY, trimmed);
}
