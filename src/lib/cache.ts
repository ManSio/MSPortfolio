// localStorage cache with TTL — used by all metric fetchers.

const PREFIX = 'msp-portfolio:';

export interface Cached<T> {
  data: T;
  fetchedAt: number;
}

export function readCache<T>(key: string, ttlMs: number): Cached<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    if (Date.now() - parsed.fetchedAt > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): Cached<T> {
  const entry: Cached<T> = { data, fetchedAt: Date.now() };
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // storage full / private mode — cache is best-effort
  }
  return entry;
}
