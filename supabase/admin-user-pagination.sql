-- Admin users list pagination RPC.
-- Returns only the ids of the current page plus the total count; the admin app
-- then fetches the visible rows by id. Pushes search / status / verified /
-- location / date filters into the database instead of loading every user key.
--
-- The previous PostgREST ids query filtered on embedded resources
-- (user_profiles.verification_status, locations.name) which PostgREST rejects
-- with a 400 (PGRST108 / PGRST100): embedded resources must be listed in the
-- select and `or` cannot nest embedded tables. Doing the filtering in SQL here
-- sidesteps those limitations.
--
-- p_status:   'All' | 'Trashed' | <account status like 'ACTIVE' | 'SUSPENDED'>
-- p_verified: 'All' | 'verified' | 'unverified'
--             ('All' preserves the legacy behaviour of excluding only 'pending')
-- p_location: 'All' or a location name (joins user_profiles -> locations)
-- p_field:    'created' -> accounts.created_at, 'modified' -> accounts.updated_at

create or replace function public.admin_list_user_page(
  p_search text default null,
  p_status text default 'All',
  p_verified text default 'All',
  p_location text default 'All',
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
  v_ids uuid[];
  v_total bigint;
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  with matching as (
    select a.id,
           case when coalesce(p_field, 'created') = 'modified' then a.updated_at else a.created_at end as dcol
    from public.accounts a
    left join lateral (
      select up.verification_status, up.display_name, up.location_id
      from public.user_profiles up
      where up.account_id = a.id
      order by up.created_at
      limit 1
    ) up on true
    left join public.locations loc on loc.id = up.location_id
    where a.role = 'USER' and a.deleted_at is null
      and (p_status = 'All' or
           (p_status = 'Trashed' and exists (
              select 1 from public.trash_entries t
              where t.entity_type = 'user' and t.entity_id = a.id::text and t.restored_at is null)) or
           (p_status <> 'All' and p_status <> 'Trashed' and upper(a.status::text) = upper(p_status)))
      and (p_verified = 'All' or
           (p_verified = 'verified' and lower(coalesce(up.verification_status, '')) in ('verified', 'approved')) or
           (p_verified = 'unverified' and lower(coalesce(up.verification_status, '')) in ('', 'unverified', 'rejected')))
      and (p_location = 'All' or p_location is null or lower(loc.name) = lower(p_location))
      and (v_search is null
           or a.id::text ilike '%' || v_search || '%'
           or a.email ilike '%' || v_search || '%'
           or up.display_name ilike '%' || v_search || '%')
      and (p_from is null or (case when coalesce(p_field, 'created') = 'modified' then a.updated_at else a.created_at end) >= p_from)
      and (p_to is null or (case when coalesce(p_field, 'created') = 'modified' then a.updated_at else a.created_at end) <= p_to)
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

revoke all on function public.admin_list_user_page(text, text, text, text, text, timestamptz, timestamptz, text, integer, integer) from public, anon;
grant execute on function public.admin_list_user_page(text, text, text, text, text, timestamptz, timestamptz, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
