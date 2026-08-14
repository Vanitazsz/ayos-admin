import { supabase, identity } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';
import { getSignedUrls } from '../lib/signedUrlCache';

const PROOF_CACHE_SCOPE = 'proof-of-work';

const asMediaList = (value) =>
  Array.isArray(value) ? value : value ? [value] : [];

export const mapProofOfWork = (row) => {
  const toPhoto = (item) => ({
    path: item.path,
    contentType: item.content_type,
    submittedBy: item.submitted_by ?? null,
    createdAt: item.created_at ?? null,
  });
  return {
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
    workerPhotos: asMediaList(row.worker_media).map(toPhoto),
    customerPhotos: asMediaList(row.customer_media).map(toPhoto),
    date: row.completed_at
      ? new Date(row.completed_at).toLocaleDateString()
      : new Date(row.created_at).toLocaleDateString(),
    created_at: row.created_at,
    completed_at: row.completed_at ?? null,
  };
};

export const hasWorkerProof = (record) =>
  record.workerPhotos.length > 0 || Boolean(record.rating) || (record.comment ?? '').trim() !== '';

export const hasCustomerProof = (record) =>
  record.customerPhotos.length > 0 ||
  Boolean(record.rating) ||
  (record.comment ?? '').trim() !== '';

export async function loadProofOfWorkRaw() {
  const { data: rows, error } = await supabase.rpc('admin_list_proof_of_work');
  if (error) throw error;

  const { data: trashed, error: trashError } = await supabase
    .from('trash_entries')
    .select('id, entity_id')
    .eq('entity_type', 'booking_proof')
    .is('restored_at', null);
  if (trashError) throw trashError;
  const trashById = new Map((trashed ?? []).map((row) => [row.entity_id, row.id]));

  return (rows ?? []).map((row) => {
    const proof = mapProofOfWork(row);
    const trashEntryId = trashById.get(proof.bookingId) ?? null;
    return { ...proof, isTrashed: Boolean(trashEntryId), trashEntryId };
  });
}

export const loadProofOfWork = cacheable(
  PROOF_CACHE_SCOPE,
  { ttl: 60_000 },
  loadProofOfWorkRaw,
);

export async function moveBookingProofToTrash(bookingId, reason) {
  const { data, error } = await supabase.rpc('admin_move_booking_proof_to_trash', {
    p_booking_id: bookingId,
    p_reason: reason,
  });
  if (error) throw error;
  invalidate(PROOF_CACHE_SCOPE);
  invalidate('trash');
  return data;
}

export async function restoreBookingProofFromTrash(trashId) {
  const { data, error } = await supabase.rpc('admin_restore_booking_proof_from_trash', {
    p_trash_id: trashId,
  });
  if (error) throw error;
  invalidate(PROOF_CACHE_SCOPE);
  invalidate('trash');
  return data;
}

export async function hardDeleteBookingProofFromTrash(trashId, bookingId) {
  const { data, error } = await supabase.rpc(
    'admin_hard_delete_booking_proof_from_trash',
    {
      p_trash_id: trashId,
      p_confirmation: `DELETE ${bookingId}`,
    },
  );
  if (error) throw error;
  invalidate(PROOF_CACHE_SCOPE);
  invalidate('trash');
  return data;
}

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
  const workerItems = dedupeByPath(proof?.workerPhotos ?? []);
  const customerItems = dedupeByPath(proof?.customerPhotos ?? []);
  const items = [...workerItems, ...customerItems];
  if (!items.length) return { workerImages: [], customerImages: [] };

  const cached = mediaCache.get(proof.bookingId);
  if (cached && Date.now() - cached.signedAt < MEDIA_CACHE_TTL_MS) {
    return cached.result;
  }

  const urlByPath = await getSignedUrls(
    'booking-proof',
    items.map((item) => item.path),
  );
  const toImage = (item) => {
    const url = urlByPath.get(item.path);
    if (!url) return null;
    return {
      path: item.path,
      url,
      contentType: item.contentType,
      submittedBy: item.submittedBy,
    };
  };

  const result = {
    workerImages: workerItems.map(toImage).filter(Boolean),
    customerImages: customerItems.map(toImage).filter(Boolean),
  };
  mediaCache.set(proof.bookingId, { signedAt: Date.now(), result });
  return result;
}
