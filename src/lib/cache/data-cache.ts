/**
 * Lightweight client-side data caching utility.
 * Caches asynchronous queries in-memory (with sessionStorage persistence for instant page transitions)
 * to avoid repeated database hits when switching between admin tabs and public pages.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 3 * 60 * 1000; // 3 minutes default

/**
 * Retrieve cached data or execute fetcher function and cache the result.
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
  forceRefresh: boolean = false
): Promise<T> {
  const now = Date.now();

  if (!forceRefresh) {
    // 1. Check in-memory store
    const mem = memoryStore.get(key);
    if (mem && now - mem.timestamp < mem.ttlMs) {
      return mem.data as T;
    }

    // 2. Check sessionStorage fallback
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(`mt_cache_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw) as CacheEntry<T>;
          if (now - parsed.timestamp < parsed.ttlMs) {
            memoryStore.set(key, parsed);
            return parsed.data;
          }
        }
      } catch {
        // Ignore session storage errors
      }
    }
  }

  // 3. Fetch fresh data
  const freshData = await fetcher();
  const entry: CacheEntry<T> = {
    data: freshData,
    timestamp: now,
    ttlMs,
  };

  memoryStore.set(key, entry);

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(`mt_cache_${key}`, JSON.stringify(entry));
    } catch {
      // Storage might be full or quota exceeded, ignore
    }
  }

  return freshData;
}

/**
 * Invalidate cache entries matching a prefix pattern or clear all.
 */
export function invalidateCache(prefixPattern?: string): void {
  if (!prefixPattern) {
    memoryStore.clear();
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k?.startsWith("mt_cache_")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
    return;
  }

  // Remove matching from memory
  for (const k of Array.from(memoryStore.keys())) {
    if (k.startsWith(prefixPattern) || k.includes(prefixPattern)) {
      memoryStore.delete(k);
    }
  }

  // Remove matching from sessionStorage
  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k?.startsWith(`mt_cache_${prefixPattern}`) || k?.includes(prefixPattern)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}
