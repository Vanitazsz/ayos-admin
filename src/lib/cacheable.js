import {
  getCache,
  setCache,
  invalidateCache,
  invalidateCacheForTables,
} from './dataCache';

export function cacheable(scope, { ttl = 60_000, persist = true } = {}, loader) {
  const wrapped = async (args) => {
    const hit = getCache(scope, args);
    if (hit !== undefined) return hit;
    const value = await loader(args);
    setCache(scope, args, value, { ttl, persist });
    return value;
  };
  wrapped.invalidate = () => invalidateCache(scope);
  wrapped.scope = scope;
  return wrapped;
}

export const invalidate = invalidateCache;
export const invalidateForTables = invalidateCacheForTables;
