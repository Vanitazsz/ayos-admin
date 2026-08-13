-- Report Center RPCs.
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--
-- Read side (page never pulls the whole report_exports table):
--   * admin_report_exports_page - one page of exports + total, server-side filters.
--   * admin_report_stats        - single aggregated row of status counts.
-- Write side (consumed by the report-export edge function):
--   * admin_report_workers/customers/services/reviews - tabular detail per report type.
--   * Financial reuses admin_analytics_summary / admin_revenue_series.

drop function if exists public.admin_report_exports_page(int, int, text, timestamptz, timestamptz, text, text);
drop function if exists public.admin_report_exports_page(int, int, text, timestamptz, timestamptz, text);
create or replace function public.admin_report_exports_page(
  p_page int default 1,
  p_page_size int default 10,
  p_type text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_query text default null,
  p_sort text default 'newest'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_page_size int := least(greatest(coalesce(p_page_size, 10), 1), 50);
  v_offset int := (v_page - 1) * v_page_size;
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;

  with base as (
    select e.id,
           e.report_type,
           e.parameters,
           e.storage_path,
           e.status,
           e.requested_by,
           e.failure_reason,
           e.created_at,
           e.completed_at,
           coalesce(up.display_name, wp.display_name, ap.display_name) as requester_name
    from report_exports e
    left join accounts ac on ac.id = e.requested_by
    left join user_profiles up on up.account_id = ac.id
    left join worker_profiles wp on wp.account_id = ac.id
    left join admin_profiles ap on ap.account_id = ac.id
    where (p_type is null or e.report_type = p_type)
      and (p_from is null or e.created_at >= p_from)
      and (p_to is null or e.created_at <= p_to)
      and (
        p_query is null
        or lower(e.report_type) like '%' || lower(p_query) || '%'
        or lower(coalesce(up.display_name, wp.display_name, ap.display_name, ''))
           like '%' || lower(p_query) || '%'
      )
      and e.deleted_at is null
  ),
  total as (select count(*) as n from base)
  select jsonb_build_object(
    'total', (select n from total),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'report_type', b.report_type,
      'parameters', b.parameters,
      'storage_path', b.storage_path,
      'status', b.status,
      'requested_by', b.requested_by,
      'requester_name', b.requester_name,
      'failure_reason', b.failure_reason,
      'created_at', b.created_at,
      'completed_at', b.completed_at
    ) order by b.created_at desc), '[]'::jsonb)
  ) into result
  from (select * from base order by case when p_sort = 'oldest' then created_at end asc,
                                       case when p_sort <> 'oldest' then created_at end desc
        limit v_page_size offset v_offset) b;

  return result;
end $$;

-- Stats: single aggregated row so the page never loads the full table to count.
create or replace function public.admin_report_stats()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'total', count(*),
    'completed', count(*) filter (where status = 'completed'),
    'processing', count(*) filter (where status in ('pending', 'processing')),
    'failed', count(*) filter (where status = 'failed')
  ) into result
  from report_exports
  where deleted_at is null;
  return result;
end $$;

-- Worker Performance detail (per worker row).
create or replace function public.admin_report_workers(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  worker_name text,
  worker_email text,
  completed_bookings bigint,
  total_revenue numeric,
  total_payout numeric,
  avg_rating numeric
)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    select coalesce(wp.display_name, a.email),
           a.email,
           count(distinct b.id) filter (where b.status = 'COMPLETED'),
           coalesce(sum(p.service_amount), 0),
           coalesce(sum(p.worker_net_amount), 0),
           0::numeric
    from worker_profiles wp
    join accounts a on a.id = wp.account_id and a.deleted_at is null
    left join bookings b on b.worker_account_id = wp.account_id
       and (p_from is null or b.created_at >= p_from)
       and (p_to is null or b.created_at <= p_to)
    left join payments p on p.booking_id = b.id and p.status = 'SUCCESSFUL'
    group by wp.account_id, wp.display_name, a.email
    order by total_revenue desc;
end $$;

-- Customer Activity detail (per customer row).
create or replace function public.admin_report_customers(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  customer_name text,
  customer_email text,
  total_bookings bigint,
  completed_bookings bigint,
  total_spend numeric,
  repeat_bookings bigint,
  avg_rating_given numeric
)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    select coalesce(up.display_name, a.email),
           a.email,
           count(b.id),
           count(b.id) filter (where b.status = 'COMPLETED'),
           coalesce(sum(b.agreed_service_amount) filter (where b.status = 'COMPLETED'), 0),
           greatest(count(b.id) - 1, 0),
           0::numeric
    from user_profiles up
    join accounts a on a.id = up.account_id and a.deleted_at is null and a.role = 'USER'
    left join bookings b on b.user_account_id = up.account_id
       and (p_from is null or b.created_at >= p_from)
       and (p_to is null or b.created_at <= p_to)
    group by up.account_id, up.display_name, a.email
    order by total_spend desc;
end $$;

-- Service Popularity detail (per category row).
create or replace function public.admin_report_services(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  category_name text,
  request_count bigint,
  completed_bookings bigint,
  completion_rate numeric,
  revenue numeric
)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    select c.name,
           count(distinct rq.id),
           count(distinct b.id) filter (where b.status = 'COMPLETED'),
           round(count(distinct b.id) filter (where b.status = 'COMPLETED')::numeric
                 / nullif(count(distinct rq.id), 0) * 100, 1),
           coalesce(sum(p.service_amount), 0)
    from service_categories c
    left join service_requests rq on rq.category_id = c.id
       and (p_from is null or rq.created_at >= p_from)
       and (p_to is null or rq.created_at <= p_to)
    left join bookings b on b.service_request_id = rq.id
    left join payments p on p.booking_id = b.id and p.status = 'SUCCESSFUL'
    group by c.id, c.name
    order by request_count desc;
end $$;

-- Review Sentiment detail (per review row).
drop function if exists public.admin_report_reviews(timestamptz, timestamptz);
create or replace function public.admin_report_reviews(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  reviewer text,
  worker text,
  service text,
  rating int,
  comment text,
  reviewed_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    select coalesce(up.display_name, 'Unknown reviewer'),
           coalesce(wp.display_name, 'Unknown worker'),
           c.name,
           r.stars,
           r.body,
           r.created_at
    from reviews r
    join bookings b on b.id = r.booking_id
    join service_requests sr on sr.id = b.service_request_id
    join service_categories c on c.id = sr.category_id
    left join user_profiles up on up.account_id = r.user_account_id
    left join worker_profiles wp on wp.account_id = r.worker_account_id
    where (p_from is null or r.created_at >= p_from)
      and (p_to is null or r.created_at <= p_to)
    order by r.created_at desc;
end $$;

-- grants
revoke execute on function public.admin_report_exports_page(int, int, text, timestamptz, timestamptz, text, text) from public;
revoke execute on function public.admin_report_stats() from public;
revoke execute on function public.admin_report_workers(timestamptz, timestamptz) from public;
revoke execute on function public.admin_report_customers(timestamptz, timestamptz) from public;
revoke execute on function public.admin_report_services(timestamptz, timestamptz) from public;
revoke execute on function public.admin_report_reviews(timestamptz, timestamptz) from public;

grant execute on function public.admin_report_exports_page(int, int, text, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.admin_report_stats() to authenticated;
grant execute on function public.admin_report_workers(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_report_customers(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_report_services(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_report_reviews(timestamptz, timestamptz) to authenticated;

-- Force PostgREST to reload its schema cache so the fresh RPCs are visible
-- immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
