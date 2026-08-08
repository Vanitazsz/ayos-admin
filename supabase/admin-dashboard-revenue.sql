-- Revenue Overview series for the dashboard chart.
-- Run in the Supabase SQL editor. SECURITY DEFINER, restricted to ADMIN accounts
-- (mirrors the iam_admin() guard used by the other admin-dashboard files).
--
-- Returns a JSONB payload with a zero-filled, continuous monthly series so the
-- chart axis never has gaps and window totals/deltas can be computed client-side
-- from one request:
--   { "series": [{ "month": "2025-09-01", "period": "Sep", "revenue": 0, "profit": 0 }] }
--
-- revenue = sum(service_amount)   from SUCCESSFUL payments
-- profit  = sum(commission_amount) from SUCCESSFUL payments
-- The current (partial) month is included as the last point; the caller slices
-- 3M/6M/12M windows from this single 12-month series (no per-range requests).

create or replace function public.admin_dashboard_revenue(p_months int default 12)
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  result jsonb;
begin
  if not public.iam_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_build_object(
    'series', coalesce(jsonb_agg(jsonb_build_object(
      'month', m.month,
      'period', to_char(m.month, 'Mon'),
      'revenue', coalesce(p.revenue, 0),
      'profit', coalesce(p.profit, 0)
    ) order by m.month), '[]'::jsonb)
  ), '{}'::jsonb) into result
  from (
    select generate_series(
             date_trunc('month', now()) - (greatest(p_months, 1) - 1) * interval '1 month',
             date_trunc('month', now()),
             interval '1 month'
           ) as month
  ) m
  left join (
    select date_trunc('month', created_at) as month,
           sum(service_amount)    as revenue,
           sum(commission_amount) as profit
    from payments
    where status = 'SUCCESSFUL' and created_at is not null
    group by 1
  ) p on p.month = m.month;

  return result;
end $$;

revoke execute on function public.admin_dashboard_revenue(int) from public;
grant execute on function public.admin_dashboard_revenue(int) to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPC is
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
