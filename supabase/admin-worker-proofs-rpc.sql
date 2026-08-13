-- Admin worker proof-of-work listing.
-- Run in the Supabase SQL editor AFTER admin-rbac-permissions.sql (defines
-- is_admin()) and the worker proof migration
-- 20260814030000_worker_proof_rating_comment.sql (adds
-- bookings.worker_proof_rating/comment and booking_proof_media.submitted_by).
-- Idempotent / re-runnable.
--
-- The customer review feature was deprecated (reviews/review_media dropped).
-- Worker feedback and proof-of-work photos now live on completed bookings:
--   * bookings.worker_proof_rating  (1-5)
--   * bookings.worker_proof_comment
--   * booking_proof_media           (photo metadata, incl. submitted_by)

create or replace function public.admin_list_worker_proofs()
returns table (
  booking_id uuid,
  worker_account_id uuid,
  worker_name text,
  customer_account_id uuid,
  customer_name text,
  service_category text,
  service_description text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  rating smallint,
  comment text,
  proof_media jsonb,
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select
      b.id,
      b.worker_account_id,
      wp.display_name,
      b.user_account_id,
      up.display_name,
      sc.name,
      sr.description,
      sr.scheduled_at,
      b.completed_at,
      b.worker_proof_rating,
      b.worker_proof_comment,
      coalesce(media.proof_media, '[]'::jsonb),
      b.created_at
    from public.bookings b
    left join public.worker_profiles wp on wp.account_id = b.worker_account_id
    left join public.user_profiles up on up.account_id = b.user_account_id
    left join public.service_requests sr on sr.id = b.service_request_id
    left join public.service_categories sc on sc.id = sr.category_id
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'path', m.storage_path,
          'content_type', m.content_type,
          'submitted_by', m.submitted_by,
          'created_at', m.created_at
        ) order by m.created_at
      ) as proof_media
      from public.booking_proof_media m
      where m.booking_id = b.id
    ) media on true
    where b.status = 'COMPLETED'
      and (b.worker_proof_rating is not null or media.proof_media is not null)
    order by coalesce(b.completed_at, b.created_at) desc;
end $$;

revoke all on function public.admin_list_worker_proofs() from public, anon;
grant execute on function public.admin_list_worker_proofs() to authenticated;

notify pgrst, 'reload schema';
