const CACHE_VERSION = 2;
const STORAGE_PREFIX = `ayos:tablecache:v${CACHE_VERSION}`;
const MAX_PERSISTED_BYTES = 256 * 1024;
const MAX_ENTRIES_PER_SCOPE = 25;
const MIN_PERSISTED_MS = 10 * 1000;

const SCOPE_TO_TABLES = {
  users: ['accounts', 'user_profiles', 'customer_verifications'],
  bookings: ['bookings', 'booking_status_events'],
  payments: ['payments'],
  workers: ['worker_profiles', 'worker_verifications'],
  reviews: ['reviews'],
  support: ['support_tickets', 'account_reports', 'booking_disputes'],
  trash: ['trash_entries'],
  notifications: ['notifications', 'notification_campaigns'],
  'audit-logs': ['audit_logs'],
  reports: ['report_exports'],
  catalog: ['industries', 'service_categories'],
  locations: ['locations'],
  settings: ['system_settings'],
  dashboard: ['bookings', 'payments'],
  analytics: ['payments'],
};

const TABLE_TO_SCOPES = new Map();
for (const [scope, tables] of Object.entries(SCOPE_TO_TABLES)) {
  for (const table of tables) {
    if (!TABLE_TO_SCOPES.has(table)) TABLE_TO_SCOPES.set(table, []);
    TABLE_TO_SCOPES.get(table).push(scope);
  }
}

const memoryCache = new Map();
let currentUserId = 'anon';
let storageAvailable = (() => {
  try {
    const probe = `${STORAGE_PREFIX}:probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

export const setCacheUser = (userId) => {
  currentUserId = userId || 'anon';
};

const stableKey = (value) => {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableKey).join(',')}]`;
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableKey(value[key])}`);
  return `{${entries.join(',')}}`;
};

const hashKey = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

const fullKey = (scope, args, subkey = '') =>
  `${STORAGE_PREFIX}:${currentUserId}:${scope}:${subkey}:${hashKey(stableKey(args))}`;

const isFresh = (entry, now) =>
  entry && entry.at > 0 && now - entry.at < entry.ttl;

const readPersisted = (key) => {
  if (!storageAvailable) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writePersisted = (key, entry) => {
  if (!storageAvailable) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    storageAvailable = false;
  }
};

const deletePersisted = (key) => {
  if (!storageAvailable) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const evictScope = (scope) => {
  const prefix = `${STORAGE_PREFIX}:${currentUserId}:${scope}:`;
  const keys = [...memoryCache.keys()].filter((key) => key.startsWith(prefix));
  if (keys.length <= MAX_ENTRIES_PER_SCOPE) return;
  const sorted = keys.sort(
    (a, b) => memoryCache.get(a).at - memoryCache.get(b).at,
  );
  const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES_PER_SCOPE);
  for (const key of toRemove) {
    memoryCache.delete(key);
    deletePersisted(key);
  }
};

export const getCache = (scope, args, subkey) => {
  const key = fullKey(scope, args, subkey);
  const now = Date.now();
  const memory = memoryCache.get(key);
  if (memory) {
    if (isFresh(memory, now)) return memory.data;
    memoryCache.delete(key);
    deletePersisted(key);
    return undefined;
  }
  const persisted = readPersisted(key);
  if (persisted && isFresh(persisted, now)) {
    memoryCache.set(key, persisted);
    return persisted.data;
  }
  if (persisted) deletePersisted(key);
  return undefined;
};

export const setCache = (
  scope,
  args,
  data,
  { ttl = 60_000, persist = true, subkey = '' } = {},
) => {
  if (ttl < MIN_PERSISTED_MS) persist = false;
  const entry = { at: Date.now(), ttl, data };
  const key = fullKey(scope, args, subkey);
  memoryCache.set(key, entry);
  evictScope(scope);
  if (persist) {
    try {
      const serialized = JSON.stringify(entry);
      if (serialized.length <= MAX_PERSISTED_BYTES) writePersisted(key, entry);
    } catch {
      // non-serializable data stays memory-only
    }
  }
};

export const invalidateCache = (scope) => {
  const prefix = `${STORAGE_PREFIX}:${currentUserId}:${scope}:`;
  const keys = [...memoryCache.keys()].filter((key) => key.startsWith(prefix));
  for (const key of keys) {
    memoryCache.delete(key);
    deletePersisted(key);
  }
  if (storageAvailable) {
    try {
      const toRemove = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) toRemove.push(key);
      }
      for (const key of toRemove) window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
};

export const invalidateCacheForTables = (tables) => {
  const scopes = new Set();
  for (const table of tables) {
    for (const scope of TABLE_TO_SCOPES.get(table) ?? []) scopes.add(scope);
  }
  for (const scope of scopes) invalidateCache(scope);
};

export const clearCache = () => {
  memoryCache.clear();
  if (!storageAvailable) return;
  try {
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) toRemove.push(key);
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};
