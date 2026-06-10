type CacheEntry<T> = {
  value: T;
  createdAt: number;
  expiresAt: number;
};

type CacheOptions = {
  name: string;
  defaultTtlMs?: number;
  maxEntries?: number;
};

type CacheStats = {
  name: string;
  size: number;
  hits: number;
  misses: number;
  evictions: number;
};

export function buildCacheKey(parts: Array<string | number | null | undefined>): string {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== '')
    .map((part) => String(part))
    .join('|');
}

export function createMemoryCache({ name, defaultTtlMs = 30000, maxEntries = 500 }: CacheOptions) {
  const store = new Map<string, CacheEntry<any>>();
  let hits = 0;
  let misses = 0;
  let evictions = 0;

  const now = () => Date.now();

  const pruneExpired = () => {
    const current = now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= current) {
        store.delete(key);
      }
    }
  };

  const evictIfNeeded = () => {
    pruneExpired();
    if (store.size <= maxEntries) return;
    const entries = Array.from(store.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    while (store.size > maxEntries && entries.length > 0) {
      const [key] = entries.shift() as [string, CacheEntry<any>];
      store.delete(key);
      evictions++;
    }
  };

  const get = <T>(key: string): T | null => {
    const entry = store.get(key);
    if (!entry) {
      misses++;
      return null;
    }
    if (entry.expiresAt <= now()) {
      store.delete(key);
      misses++;
      return null;
    }
    hits++;
    return entry.value as T;
  };

  const set = <T>(key: string, value: T, ttlMs = defaultTtlMs) => {
    if (!ttlMs || ttlMs <= 0) return;
    const current = now();
    store.set(key, {
      value,
      createdAt: current,
      expiresAt: current + ttlMs,
    });
    evictIfNeeded();
  };

  const getOrSet = async <T>(key: string, loader: () => Promise<T>, ttlMs = defaultTtlMs): Promise<T> => {
    const cached = get<T>(key);
    if (cached !== null) return cached;
    const value = await loader();
    if (value !== undefined && value !== null) {
      set(key, value, ttlMs);
    }
    return value;
  };

  const remove = (key: string) => {
    store.delete(key);
  };

  const clear = () => {
    store.clear();
  };

  const stats = (): CacheStats => ({
    name,
    size: store.size,
    hits,
    misses,
    evictions,
  });

  return {
    get,
    set,
    getOrSet,
    delete: remove,
    clear,
    stats,
  };
}
