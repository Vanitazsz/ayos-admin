-- Analytics RPCs with optional date range filtering.
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--
-- Extends the analytics aggregation RPCs with optional (p_from, p_to)
-- timestamptz bounds so the Analytics page can filter by a selected period.
-- Null bounds keep the original all-time behaviour.

-- Drop the zero-arg signatures replaced below.
drop function if exists public.admin_revenue_series();
drop function if exists public.admin_analytics_summary();
drop function if exists public.admin_top_services();

-- 1. Revenue + profit for a range as three zero-filled, continuous series
--    (day/month/year) so granularity switching never triggers a new request.
--    Bounded by the selected range (null bounds = all time). Payload shape
--    mirrors admin_dashboard_revenue():
--      { "day":   [{ "month": "2026-02-09", "period": "Feb 09", "revenue": 0, "profit": 0 }],
--        "month": [{ "month": "2025-09-01", "period": "Sep",     "revenue": 0, "profit": 0 }],
--        "year":  [{ "month": "2021-01-01", "period": "2021",    "revenue": 0, "profit": 0 }] }
drop function if exists public.admin_revenue_series(timestamptz, timestamptz);
create or replace function public.admin_revenue_series(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
  start_at timestamptz;
  end_at timestamptz;
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;

  select coalesce(p_from, min(created_at), now()), coalesce(p_to, now())
  into start_at, end_at
  from payments
  where status = 'SUCCESSFUL' and created_at is not null;

  with paid as (
    select created_at, service_amount, commission_amount
    from payments
    where status = 'SUCCESSFUL'
      and created_at is not null
      and (p_from is null or created_at >= p_from)
      and (p_to is null or created_at <= p_to)
  ),
  days as (
    select generate_series(start_at::date, end_at::date, interval '1 day')::date as bucket
  ),
  months as (
    select generate_series(date_trunc('month', start_at), date_trunc('month', end_at), interval '1 month') as bucket
  ),
  years as (
    select generate_series(date_trunc('year', start_at), date_trunc('year', end_at), interval '1 year') as bucket
  ),
  day_agg as (
    select d.bucket,
           sum(p.service_amount)    as revenue,
           sum(p.commission_amount) as profit
    from days d
    left join paid p on p.created_at::date = d.bucket
    group by d.bucket
  ),
  month_agg as (
    select m.bucket,
           sum(p.service_amount)    as revenue,
           sum(p.commission_amount) as profit
    from months m
    left join paid p on date_trunc('month', p.created_at) = m.bucket
    group by m.bucket
  ),
  year_agg as (
    select y.bucket,
           sum(p.service_amount)    as revenue,
           sum(p.commission_amount) as profit
    from years y
    left join paid p on date_trunc('year', p.created_at) = y.bucket
    group by y.bucket
  )
  select jsonb_build_object(
    'day', (select coalesce(jsonb_agg(jsonb_build_object(
      'month', d.bucket,
      'period', to_char(d.bucket, 'Mon DD'),
      'revenue', coalesce(d.revenue, 0),
      'profit', coalesce(d.profit, 0)
    ) order by d.bucket), '[]'::jsonb) from day_agg d),
    'month', (select coalesce(jsonb_agg(jsonb_build_object(
      'month', m.bucket,
      'period', to_char(m.bucket, 'Mon'),
      'revenue', coalesce(m.revenue, 0),
      'profit', coalesce(m.profit, 0)
    ) order by m.bucket), '[]'::jsonb) from month_agg m),
    'year', (select coalesce(jsonb_agg(jsonb_build_object(
      'month', y.bucket,
      'period', to_char(y.bucket, 'YYYY'),
      'revenue', coalesce(y.revenue, 0),
      'profit', coalesce(y.profit, 0)
    ) order by y.bucket), '[]'::jsonb) from year_agg y)
  ) into result;

  return result;
end $$;

-- 2. Analytics KPIs as a single row (replaces full pulls of payments/bookings/accounts)
create or replace function public.admin_analytics_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  total_revenue         numeric,
  completed_bookings    bigint,
  total_bookings        bigint,
  completed_value       numeric,
  user_count            bigint,
  completed_users       bigint,
  repeat_users          bigint,
  revenue_per_user      numeric,
  avg_booking_value     numeric,
  mau                   bigint,
  worker_earnings_total numeric,
  workers_with_earnings bigint
) language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    with p as (
      select coalesce(sum(service_amount), 0) as rev
      from payments
      where status = 'SUCCESSFUL'
        and created_at is not null
        and (p_from is null or created_at >= p_from)
        and (p_to is null or created_at <= p_to)
    ),
    b as (
      select count(*) filter (where status = 'COMPLETED') as completed,
             count(*) as total,
             coalesce(sum(agreed_service_amount) filter (where status = 'COMPLETED'), 0) as value
      from bookings
      where created_at is not null
        and (p_from is null or created_at >= p_from)
        and (p_to is null or created_at <= p_to)
    ),
    u as (
      select count(*) as n
      from accounts
      where role = 'USER'
        and (p_from is null or created_at >= p_from)
        and (p_to is null or created_at <= p_to)
    ),
    cu as (
      select count(distinct user_account_id) as done,
             count(*) filter (where n > 1) as repeat
      from (
        select user_account_id, count(*) as n
        from bookings
        where status = 'COMPLETED'
          and (p_from is null or created_at >= p_from)
          and (p_to is null or created_at <= p_to)
        group by user_account_id
      ) t
    ),
    e as (
      select coalesce(sum(p.worker_net_amount), 0) as total,
             count(distinct b.worker_account_id) as workers
      from payments p
      join bookings b on b.id = p.booking_id
      where p.status = 'SUCCESSFUL'
        and p.worker_net_amount is not null
        and p.created_at is not null
        and (p_from is null or p.created_at >= p_from)
        and (p_to is null or p.created_at <= p_to)
    )
    select p.rev,
           b.completed,
           b.total,
           b.value,
           u.n,
           cu.done,
           cu.repeat,
           round(p.rev / nullif(u.n, 0), 2),
           round(b.value / nullif(b.completed, 0), 2),
           (select count(*) from accounts
            where role = 'USER' and created_at >= now() - interval '30 days'),
           e.total,
           e.workers
    from p, b, u, cu, e;
end $$;

-- 3. Service requests grouped by category (replaces full service_requests pull)
create or replace function public.admin_top_services(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (name text, request_count bigint)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    select c.name, count(*)
    from service_requests r
    join service_categories c on c.id = r.category_id
    where r.created_at is not null
      and (p_from is null or r.created_at >= p_from)
      and (p_to is null or r.created_at <= p_to)
    group by c.name;
end $$;

-- 4. grants (parameterized signatures)
revoke execute on function public.admin_revenue_series(timestamptz, timestamptz) from public;
revoke execute on function public.admin_analytics_summary(timestamptz, timestamptz) from public;
revoke execute on function public.admin_top_services(timestamptz, timestamptz) from public;
grant execute on function public.admin_revenue_series(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_analytics_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_top_services(timestamptz, timestamptz) to authenticated;

-- Force PostgREST to reload its schema cache so the recreated RPCs are
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
