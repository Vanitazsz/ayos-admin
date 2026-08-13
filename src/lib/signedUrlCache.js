import { supabase } from './supabase';

const MAX_TTL_MS = 55 * 60 * 1000;
const DEFAULT_TTL_MS = 55 * 60 * 1000;

const store = new Map();

const keyFor = (bucket, path) => `${bucket}\u0000${path}`;

const isRemote = (path) => /^https?:\/\//i.test(path ?? '');

export async function getSignedUrl(bucket, path, { ttl = DEFAULT_TTL_MS } = {}) {
  if (!path) return '';
  if (isRemote(path)) return path;
  const key = keyFor(bucket, path);
  const hit = store.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.url;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  const url = data.signedUrl;
  store.set(key, { url, expiresAt: Date.now() + Math.min(ttl, MAX_TTL_MS) });
  return url;
}

export async function getSignedUrls(bucket, paths, { ttl = DEFAULT_TTL_MS } = {}) {
  const unique = [...new Set((paths ?? []).filter(Boolean))];
  const urlByPath = new Map();
  const missing = [];
  for (const path of unique) {
    if (isRemote(path)) {
      urlByPath.set(path, path);
    } else {
      const hit = store.get(keyFor(bucket, path));
      if (hit && Date.now() < hit.expiresAt) {
        urlByPath.set(path, hit.url);
      } else {
        missing.push(path);
      }
    }
  }
  if (missing.length) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(missing, 3600);
    if (error) throw error;
    for (const item of data ?? []) {
      if (item?.path && item.signedUrl && !item.error) {
        urlByPath.set(item.path, item.signedUrl);
        store.set(keyFor(bucket, item.path), {
          url: item.signedUrl,
          expiresAt: Date.now() + Math.min(ttl, MAX_TTL_MS),
        });
      }
    }
  }
  return urlByPath;
}

export const clearSignedUrlCache = () => store.clear();
