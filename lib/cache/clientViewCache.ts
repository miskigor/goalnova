/**
 * Tiny in-memory stale-while-revalidate cache for client list views.
 *
 * Scope: module singleton — survives client-side navigations between pages, cleared on a full
 * page reload. Lets the user return to a previously visited page (rankings, explore, challenges)
 * and see the last result instantly while a fresh fetch runs in the background.
 */

type CacheEntry<T> = { value: T; savedAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export function readViewCache<T>(key: string, maxAgeMs = Infinity): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (maxAgeMs !== Infinity && Date.now() - entry.savedAt > maxAgeMs) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function hasFreshViewCache(key: string, maxAgeMs = Infinity): boolean {
  return readViewCache(key, maxAgeMs) !== undefined;
}

export function writeViewCache<T>(key: string, value: T): void {
  store.set(key, { value, savedAt: Date.now() });
}

export function clearViewCache(key: string): void {
  store.delete(key);
}
