-- Admin workers list pagination RPC.
-- Returns only the ids of the current page plus the total count; the admin app
-- then fetches the visible rows by id. Pushes search / status / verified /
-- review-queue / date filters into the database instead of loading every
-- worker profile key.
--
-- p_status: 'All' | 'Trashed' | <account status like 'Active' | 'Suspended'>
-- p_verified: 'All' | 'verified' | 'unverified'
-- p_review_only: when true, only workers needing verification review.
-- p_field: 'created' -> worker_profiles.created_at, 'modified' -> updated_at

create or replace function public.admin_list_worker_page(
  p_search text default null,
  p_status text default 'All',
  p_verified text default 'All',
  p_review_only boolean default false,
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
    select wp.account_id as id,
           case when coalesce(p_field, 'created') = 'modified' then wp.updated_at else wp.created_at end as dcol
    from public.worker_profiles wp
    join public.accounts a on a.id = wp.account_id and a.role = 'WORKER' and a.deleted_at is null
    where
      (p_status = 'All' or
       (p_status = 'Trashed' and exists (
          select 1 from public.trash_entries t
          where t.entity_type = 'worker' and t.entity_id = wp.account_id::text and t.restored_at is null)) or
       (p_status <> 'All' and p_status <> 'Trashed' and upper(a.status::text) = upper(p_status)))
      and (p_verified = 'All' or
           (p_verified = 'verified' and wp.approval_status = 'APPROVED') or
           (p_verified = 'unverified' and wp.approval_status is distinct from 'APPROVED'))
      and (not coalesce(p_review_only, false) or exists (
        select 1 from public.worker_verifications wv
        where wv.worker_id = wp.account_id and wv.status is distinct from 'APPROVED'))
      and (v_search is null
           or wp.account_id::text ilike '%' || v_search || '%'
           or wp.display_name ilike '%' || v_search || '%'
           or a.email ilike '%' || v_search || '%'
           or exists (select 1 from public.worker_skills ws
                      join public.service_categories sc on sc.id = ws.category_id
                      where ws.worker_id = wp.account_id and sc.name ilike '%' || v_search || '%'))
      and (p_from is null or (case when coalesce(p_field, 'created') = 'modified' then wp.updated_at else wp.created_at end) >= p_from)
      and (p_to is null or (case when coalesce(p_field, 'created') = 'modified' then wp.updated_at else wp.created_at end) <= p_to)
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

revoke all on function public.admin_list_worker_page(text, text, text, boolean, text, timestamptz, timestamptz, text, integer, integer) from public, anon;
grant execute on function public.admin_list_worker_page(text, text, text, boolean, text, timestamptz, timestamptz, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
