-- Revenue Overview series for the dashboard chart.
-- Run in the Supabase SQL editor. SECURITY DEFINER, restricted to ADMIN accounts
-- (mirrors the iam_admin() guard used by the other admin-dashboard files).
--
-- Returns a single JSONB payload containing three zero-filled, continuous
-- series (day/month/year) so granularity switching never triggers a new
-- request and the client-side deltas can be computed from one call:
--   { "day":   [{ "month": "2026-02-09", "period": "Feb 09", "revenue": 0, "profit": 0 }],
--     "month": [{ "month": "2025-09-01", "period": "Sep",     "revenue": 0, "profit": 0 }],
--     "year":  [{ "month": "2021-01-01", "period": "2021",    "revenue": 0, "profit": 0 }] }
--
-- Each series is twice as long as its visible window (180d / 24mo / 10y) so
-- the caller can compare the last N periods against the previous N.
--
-- revenue = sum(service_amount)    from SUCCESSFUL payments
-- profit  = sum(commission_amount) from SUCCESSFUL payments

create or replace function public.admin_dashboard_revenue()
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  result jsonb;
begin
  if not public.iam_admin() then
    raise exception 'Not authorized';
  end if;

  with paid as (
    select created_at, service_amount, commission_amount
    from payments
    where status = 'SUCCESSFUL' and created_at is not null
  ),
  days as (
    select generate_series(now()::date - 179, now()::date, interval '1 day')::date as bucket
  ),
  months as (
    select date_trunc('month', now()) - (n - 1) * interval '1 month' as bucket
    from generate_series(1, 24) as n
  ),
  years as (
    select date_trunc('year', now()) - (n - 1) * interval '1 year' as bucket
    from generate_series(1, 10) as n
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

revoke execute on function public.admin_dashboard_revenue() from public;
grant execute on function public.admin_dashboard_revenue() to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPC is
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
