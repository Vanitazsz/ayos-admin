import { supabase, status, identity } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';
import { applyDateFilter, getRowDate } from '../lib/dateFilter';

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

  const { data, error } = await supabase.storage
    .from('request-media')
    .createSignedUrls(paths, 3600);
  if (error) throw error;

  const urlByPath = new Map();
  (data ?? []).forEach((item) => {
    if (item?.path && item.signedUrl && !item.error) urlByPath.set(item.path, item.signedUrl);
  });

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
});

const BOOKING_PAGE_SELECT =
  'id,service_request_id,status,version,created_at,agreed_service_amount,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),service_requests(description,scheduled_at,addresses(line1,barangay,city),service_categories(name),match_candidates(worker_id,score,eligible,worker_profiles:worker_id(display_name)),request_media(storage_path,content_type)),payments(method,status,service_amount,homeowner_platform_charge,refunds(status,reason)),cancellations(reason,fee_amount,refund_amount,resolution_status),booking_status_events(from_status,to_status,reason,created_at)';

const BOOKING_KEY_SELECT =
  'id,status,created_at,updated_at,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),service_requests(description,scheduled_at,request_media(storage_path,content_type))';

const bookingStats = (keys, todayStr) => ({
  today: keys.filter(
    (row) =>
      new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleDateString() ===
      todayStr,
  ).length,
  pending: keys.filter((row) => status(row.status) === 'Pending').length,
  ongoing: keys.filter((row) => status(row.status) === 'Ongoing').length,
  completedToday: keys.filter(
    (row) =>
      status(row.status) === 'Completed' &&
      new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleDateString() ===
        todayStr,
  ).length,
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
  const todayStr = new Date().toLocaleDateString();
  const { data: keys, error: keyError } = await supabase
    .from('bookings')
    .select(BOOKING_KEY_SELECT)
    .order('created_at', { ascending: false });
  if (keyError) throw keyError;

  const { data: trashed, error: trashError } = await supabase
    .from('trash_entries')
    .select('id, entity_id')
    .eq('entity_type', 'booking')
    .is('restored_at', null);
  if (trashError) throw trashError;
  const trashById = new Map((trashed ?? []).map((row) => [row.entity_id, row.id]));

  const rows = keys ?? [];
  const stats = bookingStats(rows, todayStr);
  const term = search.trim().toLowerCase();

  const matched = term
    ? rows.filter((row) => {
        const customer = row.user_profiles?.display_name ?? '';
        const worker = row.worker_profiles?.display_name ?? '';
        const service = row.service_requests?.description ?? '';
        return (
          customer.toLowerCase().includes(term) ||
          worker.toLowerCase().includes(term) ||
          row.id.toLowerCase().includes(term) ||
          service.toLowerCase().includes(term)
        );
      })
    : rows;
  const statusFiltered =
    filterStatus === 'All'
      ? matched
      : filterStatus === 'Trashed'
        ? matched.filter((row) => trashById.has(row.id))
        : matched.filter((row) => status(row.status) === filterStatus);
  const mediaFiltered =
    media.length === 0
      ? statusFiltered
      : statusFiltered.filter((row) => {
          const items = row.service_requests?.request_media ?? [];
          const hasImage = items.some((item) => item.content_type?.startsWith('image/'));
          const hasVoice = items.some(
            (item) => item.content_type && !item.content_type.startsWith('image/'),
          );
          return (
            (media.includes('image') && hasImage) || (media.includes('voice') && hasVoice)
          );
        });
  const ordered = applyDateFilter(mediaFiltered, {
    field,
    range: dateRange,
    sort,
    getDate: (row) => getRowDate(row, field) ?? getRowDate(row, 'created'),
  });
  const count = ordered.length;
  const pageIds = ordered
    .slice((page - 1) * pageSize, page * pageSize)
    .map((row) => row.id);

  if (!pageIds.length) return { rows: [], count, stats };

  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_PAGE_SELECT)
    .in('id', pageIds);
  if (error) throw error;

  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return {
    rows: pageIds
      .map((id) => {
        const booking = mapBooking(byId.get(id));
        if (!booking) return null;
        const trashEntryId = trashById.get(booking.id) ?? null;
        return { ...booking, isTrashed: Boolean(trashEntryId), trashEntryId };
      })
      .filter(Boolean),
    count,
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
