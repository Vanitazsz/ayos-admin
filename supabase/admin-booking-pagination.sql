-- Admin bookings list pagination RPC.
-- Returns only the ids of the current page plus the total count so the admin
-- app can fetch the visible rows (and only those) by id. Handles the messy
-- to-many filters (media, name search across customer/worker/service) that
-- were previously done by pulling every booking key into the browser.
--
-- p_status: 'All' | 'Trashed' | <display status like 'Pending'>
-- p_media: array of 'image' / 'voice' (the existing client filter was an OR:
--         show a booking if it has an image and/or a voice note as selected).
-- p_field: 'created' -> bookings.created_at, 'modified' -> bookings.updated_at

create or replace function public.admin_list_booking_page(
  p_search text default null,
  p_status text default 'All',
  p_media text[] default null,
  p_field text default 'created',
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_sort text default 'newest',
  p_page integer default 1,
  p_page_size integer default 10
)
returns table (ids uuid[], total_count bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_limit int := greatest(1, coalesce(p_page_size, 10));
  v_offset int := greatest(0, coalesce(p_page, 1) - 1) * greatest(1, coalesce(p_page_size, 10));
  v_has_image boolean := p_media is not null and p_media @> array['image']::text[];
  v_has_voice boolean := p_media is not null and p_media @> array['voice']::text[];
  v_ids uuid[];
  v_total bigint;
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  with matching as (
    select b.id,
           case when coalesce(p_field, 'created') = 'modified' then b.updated_at else b.created_at end as dcol
    from public.bookings b
    where
      (p_status = 'All' or
       (p_status = 'Trashed' and exists (
          select 1 from public.trash_entries t
          where t.entity_type = 'booking' and t.entity_id = b.id::text and t.restored_at is null)) or
       (p_status <> 'All' and p_status <> 'Trashed' and upper(b.status::text) = upper(p_status)))
      and (
        (not v_has_image and not v_has_voice)
        or (v_has_image and exists (
              select 1 from public.request_media rm
              where rm.service_request_id = b.service_request_id and rm.content_type ilike 'image/%'))
        or (v_has_voice and exists (
              select 1 from public.request_media rm
              where rm.service_request_id = b.service_request_id and rm.content_type is not null
                and rm.content_type not ilike 'image/%'))
      )
      and (v_search is null
           or b.id::text ilike '%' || v_search || '%'
           or exists (select 1 from public.user_profiles up where up.account_id = b.user_account_id and up.display_name ilike '%' || v_search || '%')
           or exists (select 1 from public.worker_profiles wp where wp.account_id = b.worker_account_id and wp.display_name ilike '%' || v_search || '%')
           or exists (select 1 from public.service_requests sr where sr.id = b.service_request_id and sr.description ilike '%' || v_search || '%'))
      and (p_from is null or (case when coalesce(p_field, 'created') = 'modified' then b.updated_at else b.created_at end) >= p_from)
      and (p_to is null or (case when coalesce(p_field, 'created') = 'modified' then b.updated_at else b.created_at end) <= p_to)
  )
  select count(*),
         coalesce(
           (select array_agg(m.id) from (
              select m.id
              from matching m
              order by case when coalesce(p_sort, 'newest') = 'oldest' then m.dcol end asc,
                       case when coalesce(p_sort, 'newest') <> 'oldest' then m.dcol end desc,
                       m.id
              limit v_limit
              offset v_offset
            ) m),
           '{}'
         )
  into v_total, v_ids;

  return query select v_ids, v_total;
end $$;

revoke all on function public.admin_list_booking_page(text, text, text[], text, timestamptz, timestamptz, text, integer, integer) from public, anon;
grant execute on function public.admin_list_booking_page(text, text, text[], text, timestamptz, timestamptz, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
