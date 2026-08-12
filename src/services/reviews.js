import { supabase, status, identity } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';

const REVIEW_SELECT =
  'id,booking_id,user_account_id,worker_account_id,stars,body,recommend_worker,moderation_status,moderated_by,moderated_at,created_at,updated_at,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),bookings(id,status,created_at,service_requests(description,scheduled_at,addresses(line1,barangay,city),service_categories(name))),review_media(storage_path,content_type)';

const asMediaList = (value) =>
  Array.isArray(value) ? value : value ? [value] : [];

export const mapReview = (row) => {
  const service = row.bookings?.service_requests;
  return {
    id: row.id,
    bookingId: row.booking_id,
    customer: identity(row.user_profiles?.display_name, 'Review customer'),
    worker: identity(row.worker_profiles?.display_name, 'Review worker'),
    service: identity(service?.service_categories?.name, 'Reviewed service'),
    serviceDetails: {
      description: service?.description ?? '',
      schedule: service?.scheduled_at ?? null,
      address: [service?.addresses?.line1, service?.addresses?.barangay, service?.addresses?.city]
        .filter(Boolean)
        .join(', '),
      bookingStatus: status(row.bookings?.status),
    },
    rating: row.stars,
    comment: row.body,
    recommendWorker: row.recommend_worker,
    date: new Date(row.created_at).toLocaleDateString(),
    status: status(row.moderation_status),
    moderatedAt: row.moderated_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    media: asMediaList(row.review_media).map((item) => ({
      path: item.storage_path,
      contentType: item.content_type,
    })),
  };
};

export async function loadReviewsRaw() {
  const { data: rows, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const accountIds = [
    ...new Set((rows ?? []).flatMap((row) => [row.user_account_id, row.worker_account_id])),
  ];
  const emailById = new Map();
  if (accountIds.length) {
    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select('id,email')
      .in('id', accountIds);
    if (accountError) throw accountError;
    for (const account of accounts ?? []) {
      if (account?.email) emailById.set(account.id, account.email);
    }
  }

  const { data: trashed, error: trashError } = await supabase
    .from('trash_entries')
    .select('id, entity_id')
    .eq('entity_type', 'review')
    .is('restored_at', null);
  if (trashError) throw trashError;
  const trashById = new Map((trashed ?? []).map((row) => [row.entity_id, row.id]));

  return (rows ?? []).map((row) => ({
    ...mapReview(row),
    customerEmail: emailById.get(row.user_account_id) ?? '',
    workerEmail: emailById.get(row.worker_account_id) ?? '',
    isTrashed: trashById.has(row.id),
    trashEntryId: trashById.get(row.id) ?? null,
  }));
}

export const loadReviews = cacheable('reviews', { ttl: 60_000 }, loadReviewsRaw);

export async function moderateReview(id, decision) {
  const { data, error } = await supabase.rpc('moderate_review', { review_id: id, decision });
  if (error) throw error;
  invalidate('reviews');
  return data;
}

export async function moveReviewToTrash(id) {
  const { data, error } = await supabase.rpc('admin_move_review_to_trash', {
    p_review_id: id,
  });
  if (error) throw error;
  invalidate('reviews');
  return data;
}

const MEDIA_CACHE_TTL_MS = 55 * 60 * 1000;
const mediaCache = new Map();

export async function resolveReviewMedia(review) {
  const paths = (review.media ?? []).map((item) => item.path);
  if (!paths.length) return { images: [] };

  const cached = mediaCache.get(review.id);
  if (cached && Date.now() - cached.signedAt < MEDIA_CACHE_TTL_MS) {
    return cached.result;
  }

  const { data, error } = await supabase.storage
    .from('review-media')
    .createSignedUrls(paths, 3600);
  if (error) throw error;

  const urlByPath = new Map();
  (data ?? []).forEach((item) => {
    if (item?.path && item.signedUrl && !item.error) urlByPath.set(item.path, item.signedUrl);
  });

  const images = (review.media ?? []).reduce((acc, item) => {
    const url = urlByPath.get(item.path);
    if (url) acc.push({ path: item.path, url, contentType: item.contentType });
    return acc;
  }, []);

  const result = { images };
  mediaCache.set(review.id, { signedAt: Date.now(), result });
  return result;
}
