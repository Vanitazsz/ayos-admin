import { supabase, identity } from './adminShared';
import { cacheable } from '../lib/cacheable';
import { getSignedUrls } from '../lib/signedUrlCache';

const PROOF_CACHE_SCOPE = 'worker-proofs';

export const mapWorkerProof = (row) => ({
  bookingId: row.booking_id,
  worker: identity(row.worker_name, 'Worker'),
  customer: identity(row.customer_name, 'Customer'),
  service: identity(row.service_category, 'Service'),
  serviceDetails: {
    category: row.service_category ?? '',
    description: row.service_description ?? '',
    schedule: row.scheduled_at ?? null,
  },
  rating: row.rating,
  comment: row.comment ?? '',
  date: row.completed_at
    ? new Date(row.completed_at).toLocaleDateString()
    : new Date(row.created_at).toLocaleDateString(),
  proofMedia: (row.proof_media ?? []).map((item) => ({
    path: item.path,
    contentType: item.content_type,
    submittedBy: item.submitted_by ?? null,
    createdAt: item.created_at ?? null,
  })),
  created_at: row.created_at,
  completed_at: row.completed_at ?? null,
});

export async function loadWorkerProofsRaw() {
  const { data: rows, error } = await supabase.rpc('admin_list_worker_proofs');
  if (error) throw error;
  return (rows ?? []).map(mapWorkerProof);
}

export const loadWorkerProofs = cacheable(
  PROOF_CACHE_SCOPE,
  { ttl: 60_000 },
  loadWorkerProofsRaw,
);

const dedupeByPath = (items) => {
  const seen = new Set();
  const out = [];
  items.forEach((item) => {
    if (item.path && !seen.has(item.path)) {
      seen.add(item.path);
      out.push(item);
    }
  });
  return out;
};

const MEDIA_CACHE_TTL_MS = 55 * 60 * 1000;
const mediaCache = new Map();

export async function resolveProofMedia(proof) {
  const items = dedupeByPath(proof?.proofMedia ?? []);
  if (!items.length) return { images: [] };

  const cached = mediaCache.get(proof.bookingId);
  if (cached && Date.now() - cached.signedAt < MEDIA_CACHE_TTL_MS) {
    return cached.result;
  }

  const urlByPath = await getSignedUrls(
    'booking-proof',
    items.map((item) => item.path),
  );

  const images = items.reduce((acc, item) => {
    const url = urlByPath.get(item.path);
    if (url) {
      acc.push({
        path: item.path,
        url,
        contentType: item.contentType,
        submittedBy: item.submittedBy,
      });
    }
    return acc;
  }, []);

  const result = { images };
  mediaCache.set(proof.bookingId, { signedAt: Date.now(), result });
  return result;
}
