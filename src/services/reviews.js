import { supabase, status, identity } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';

const REVIEW_SELECT =
  'id,booking_id,stars,body,recommend_worker,moderation_status,moderated_by,moderated_at,created_at,updated_at,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),bookings(id,status,created_at,service_requests(description,scheduled_at,addresses(line1,barangay,city),service_categories(name))),review_media(storage_path,content_type)';

export const loadReviews = cacheable('reviews', { ttl: 60_000 }, async () => {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
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
      media: (row.review_media ?? []).map((item) => ({
        path: item.storage_path,
        contentType: item.content_type,
      })),
    };
  });
});

export async function moderateReview(id, decision) {
  const { data, error } = await supabase.rpc('moderate_review', { review_id: id, decision });
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
