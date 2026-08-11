import {
  getCache,
  setCache,
  invalidateCache,
  invalidateCacheForTables,
} from './dataCache';

export function cacheable(scope, { ttl = 60_000, persist = true, key = '' } = {}, loader) {
  const wrapped = async (args) => {
    const hit = getCache(scope, args, key);
    if (hit !== undefined) return hit;
    const value = await loader(args);
    setCache(scope, args, value, { ttl, persist, subkey: key });
    return value;
  };
  wrapped.invalidate = () => invalidateCache(scope);
  wrapped.scope = scope;
  return wrapped;
}

export const invalidate = invalidateCache;
export const invalidateForTables = invalidateCacheForTables;
