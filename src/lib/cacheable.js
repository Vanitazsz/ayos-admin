import {
  getCache,
  setCache,
  invalidateCache,
  invalidateCacheForTables,
  cacheKey,
} from './dataCache';

export function cacheable(scope, { ttl = 60_000, persist = true, key = '' } = {}, loader) {
  const inFlight = new Map();
  const wrapped = async (args) => {
    const hit = getCache(scope, args, key);
    if (hit !== undefined) return hit;
    const cacheEntryKey = cacheKey(scope, args, key);
    if (inFlight.has(cacheEntryKey)) return inFlight.get(cacheEntryKey);
    const promise = loader(args)
      .then((value) => {
        setCache(scope, args, value, { ttl, persist, subkey: key });
        return value;
      })
      .finally(() => {
        inFlight.delete(cacheEntryKey);
      });
    inFlight.set(cacheEntryKey, promise);
    return promise;
  };
  wrapped.invalidate = () => {
    inFlight.clear();
    invalidateCache(scope);
  };
  wrapped.scope = scope;
  return wrapped;
}

export const invalidate = invalidateCache;
export const invalidateForTables = invalidateCacheForTables;
