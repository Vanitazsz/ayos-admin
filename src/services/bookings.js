import { supabase, status, identity } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';
import { getSignedUrls } from '../lib/signedUrlCache';

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

export async function resolveBookingMedia(booking) {
  const paths = (booking.media ?? []).map((item) => item.path);
  if (!paths.length) return { images: [], audio: [] };

  const cached = mediaCache.get(booking.id);
  if (cached && Date.now() - cached.signedAt < MEDIA_CACHE_TTL_MS) {
    return cached.result;
  }

  const urlByPath = await getSignedUrls('request-media', paths);

  const result = (booking.media ?? []).reduce(
    (acc, item) => {
      const url = urlByPath.get(item.path);
      if (!url) return acc;
      if (item.contentType?.startsWith('image/')) {
        acc.images.push({ path: item.path, url, contentType: item.contentType });
      } else {
        acc.audio.push({ path: item.path, url, contentType: item.contentType });
      }
      return acc;
    },
    { images: [], audio: [] },
  );

  mediaCache.set(booking.id, { signedAt: Date.now(), result });
  return result;
}

export const mapBooking = (row) => ({
  id: row.id,
  requestId: row.service_request_id,
  version: row.version,
  customer: identity(row.user_profiles?.display_name, 'Booking customer'),
  worker: row.worker_profiles?.display_name ?? '',
  workerId: row.worker_account_id ?? '',
  service: identity(row.service_requests?.description, 'Booking request'),
  category: identity(row.service_requests?.service_categories?.name, 'Booking category'),
  address: [
    row.service_requests?.addresses?.line1,
    row.service_requests?.addresses?.barangay,
    row.service_requests?.addresses?.city,
  ]
    .filter(Boolean)
    .join(', '),
  date: new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleDateString(),
  schedule: new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleTimeString(),
  duration: '',
  price: row.agreed_service_amount == null ? null : Number(row.agreed_service_amount),
  payment: status(row.payments?.[0]?.method),
  status: status(row.status),
  events: (row.booking_status_events ?? []).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  ),
  cancellation: row.cancellations?.[0] ?? null,
  refund: row.payments?.[0]?.refunds?.[0] ?? null,
  candidates: (row.service_requests?.match_candidates ?? [])
    .filter((item) => item.eligible)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .map((item) => ({
      id: item.worker_id,
      name: item.worker_profiles?.display_name ?? item.worker_id,
      score: Number(item.score),
    })),
  media: dedupeByPath(
    (row.service_requests?.request_media ?? []).map((item) => ({
      path: item.storage_path,
      contentType: item.content_type,
    })),
  ),
  workerProofRating: row.worker_proof_rating ?? null,
  workerProofComment: row.worker_proof_comment ?? '',
});

const BOOKING_PAGE_SELECT =
  'id,service_request_id,status,version,created_at,agreed_service_amount,worker_proof_rating,worker_proof_comment,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),service_requests(description,scheduled_at,addresses(line1,barangay,city),service_categories(name),match_candidates(worker_id,score,eligible,worker_profiles:worker_id(display_name)),request_media(storage_path,content_type)),payments(method,status,service_amount,homeowner_platform_charge,refunds(status,reason)),cancellations(reason,fee_amount,refund_amount,resolution_status),booking_status_events(from_status,to_status,reason,created_at)';

export const loadBookingStats = cacheable(
  'bookings',
  { ttl: 60_000, key: 'stats' },
  async () => {
    const { data, error } = await supabase.rpc('get_booking_stats');
    if (error) throw error;
    const [row] = data ?? [];
    return {
      total: Number(row?.total ?? 0),
      today: Number(row?.today ?? 0),
      pending: Number(row?.pending ?? 0),
      ongoing: Number(row?.ongoing ?? 0),
      completedToday: Number(row?.completed_today ?? 0),
    };
  },
);

const loadTrashedBookingIds = cacheable(
  'bookings',
  { ttl: 60_000, key: 'trashed' },
  async () => {
    const { data, error } = await supabase
      .from('trash_entries')
      .select('entity_id, id')
      .eq('entity_type', 'booking')
      .is('restored_at', null);
    if (error) throw error;
    return (data ?? []).map((row) => ({ entityId: row.entity_id, entryId: row.id }));
  },
);

async function loadBookingPageIds({
  search = '',
  status: filterStatus = 'All',
  media = [],
  sort = 'newest',
  field = 'created',
  dateRange = null,
  page = 1,
  pageSize = 10,
} = {}) {
  const { data, error } = await supabase.rpc('admin_list_booking_page', {
    p_search: search?.trim() || null,
    p_status: filterStatus,
    p_media: media.length ? media : null,
    p_field: field,
    p_from: dateRange?.from ? dateRange.from.toISOString() : null,
    p_to: dateRange?.to ? dateRange.to.toISOString() : null,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  const [row] = data ?? [];
  return { ids: row?.ids ?? [], count: Number(row?.total_count ?? 0) };
}

export const loadBookingPageRows = cacheable('bookings', { ttl: 60_000 }, async (ids) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_PAGE_SELECT)
    .in('id', ids);
  if (error) throw error;
  return data ?? [];
});

export async function loadBookingsPageRaw({
  search = '',
  status: filterStatus = 'All',
  media = [],
  sort = 'newest',
  field = 'created',
  dateRange = null,
  page = 1,
  pageSize = 10,
} = {}) {
  const [stats, pageResult, trashed] = await Promise.all([
    loadBookingStats(),
    loadBookingPageIds({ search, status: filterStatus, media, sort, field, dateRange, page, pageSize }),
    loadTrashedBookingIds(),
  ]);

  if (!pageResult.ids.length) return { rows: [], count: pageResult.count, stats };

  const data = await loadBookingPageRows(pageResult.ids);

  const byId = new Map(data.map((row) => [row.id, row]));
  const trashEntryIdByEntity = new Map(trashed.map((entry) => [entry.entityId, entry.entryId]));
  return {
    rows: pageResult.ids
      .map((id) => {
        const row = byId.get(id);
        if (!row) return null;
        const booking = mapBooking(row);
        const trashEntryId = trashEntryIdByEntity.get(booking.id) ?? null;
        return { ...booking, isTrashed: Boolean(trashEntryId), trashEntryId };
      })
      .filter(Boolean),
    count: pageResult.count,
    stats,
  };
}

export const loadBookingsPage = cacheable('bookings', { ttl: 60_000 }, loadBookingsPageRaw);

export const loadBookingsForUser = cacheable(
  'bookings',
  { ttl: 30_000 },
  async (userId, { limit = 10 } = {}) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(BOOKING_PAGE_SELECT)
      .eq('user_account_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapBooking);
  },
);

export const loadBookingsForWorker = cacheable(
  'bookings',
  { ttl: 30_000 },
  async (workerId, { limit = 10 } = {}) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(BOOKING_PAGE_SELECT)
      .eq('worker_account_id', workerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapBooking);
  },
);

async function signProofPaths(paths) {
  if (!paths.length) return new Map();
  return getSignedUrls('booking-proof', paths);
}

async function fetchProofPhotos(bookingId, submittedBy) {
  const { data, error } = await supabase
    .from('booking_proof_media')
    .select('storage_path,content_type,created_at')
    .eq('booking_id', bookingId)
    .eq('submitted_by', submittedBy)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return dedupeByPath(
    (data ?? []).map((item) => ({
      path: item.storage_path,
      contentType: item.content_type,
    })),
  );
}

const resolveProofSet = async (fetchItems) => {
  try {
    const items = await fetchItems();
    const urls = await signProofPaths(items.map((item) => item.path));
    return items
      .map((item) => ({ ...item, url: urls.get(item.path) }))
      .filter((item) => item.url);
  } catch {
    return null;
  }
};

export async function resolveBookingProofs(bookingId) {
  const cached = mediaCache.get(`proof-${bookingId}`);
  if (cached && Date.now() - cached.signedAt < MEDIA_CACHE_TTL_MS) {
    return cached.result;
  }

  const [workerProof, userProof] = await Promise.all([
    resolveProofSet(() => fetchProofPhotos(bookingId, 'worker')),
    resolveProofSet(() => fetchProofPhotos(bookingId, 'customer')),
  ]);

  const result = { workerProof, userProof };
  mediaCache.set(`proof-${bookingId}`, { signedAt: Date.now(), result });
  return result;
}

export async function cancelBookingAsAdmin(id, reason) {
  const { data, error } = await supabase.rpc('admin_cancel_booking', {
    p_booking_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  invalidate('bookings');
  return data;
}

export async function reassignBookingAsAdmin(id, workerId, reason) {
  const { data, error } = await supabase.rpc('admin_reassign_booking', {
    p_booking_id: id,
    p_worker_id: workerId,
    p_reason: reason,
  });
  if (error) throw error;
  invalidate('bookings');
  return data;
}
