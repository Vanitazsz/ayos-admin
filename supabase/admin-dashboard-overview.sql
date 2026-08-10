-- Consolidated dashboard RPC (replaces the 9-request dashboard load with one call).
-- Run in the Supabase SQL editor after admin-rbac-permissions.sql,
-- admin-aggregation-functions.sql and admin-dashboard-metrics-fix.sql.
--
-- Returns a single JSONB payload the Dashboard page maps into:
--   metrics              - the admin_dashboard_metrics() row
--   revenue              - [{ period, revenue, profit }]     (admin_revenue_series)
--   bookings             - [{ day, status, booking_count }]  (daily, zero-filled, last 14 days)
--   activities           - [{ id, action, entity_type, created_at }]  (audit_logs, 5)
--   pending_workers      - [{ id, name, email, category, registeredDate, verificationId }]
--   recent_users         - [{ id, name, registeredAt }]
--   system_notifications - [{ id, title, message }]
--
-- SECURITY DEFINER so it bypasses per-table RLS; the ADMIN check is the same
-- iam_admin() helper used by the admin_full_access policies (recursion-free).

create or replace function public.admin_dashboard_overview()
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  result jsonb;
  ai_jobs_count bigint := 0;
begin
  if not public.iam_admin() then
    raise exception 'Not authorized';
  end if;

  -- ai_jobs may not exist; the IF is planned lazily (only when reached), so this
  -- stays safe while counting the table if/when it is added.
  if to_regclass('public.ai_jobs') is not null then
    select count(*) into ai_jobs_count from public.ai_jobs;
  end if;

  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'successful_payment_total',
        coalesce((select sum(service_amount) from payments
                  where status = 'SUCCESSFUL' and created_at is not null), 0),
      'commission_total',
        coalesce((select sum(commission_amount) from payments
                  where status = 'SUCCESSFUL' and created_at is not null), 0),
      'active_bookings',
        (select count(*) from bookings where status not in ('COMPLETED', 'CANCELLED')),
      'accounts',
        (select count(*) from accounts where role = 'USER' and deleted_at is null),
      'active_workers',
        (select count(*) from worker_profiles where approval_status = 'APPROVED'),
      'queued_ai_jobs', ai_jobs_count,
      'open_support',
        (select count(*) from support_tickets where status <> 'CLOSED')
    ),
    'revenue', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'period', period, 'revenue', revenue, 'profit', profit) order by month), '[]'::jsonb)
      from (
        select date_trunc('month', created_at) as month,
               to_char(date_trunc('month', created_at), 'Mon') as period,
               sum(service_amount)    as revenue,
               sum(commission_amount) as profit
        from payments
        where status = 'SUCCESSFUL' and created_at is not null
        group by 1
      ) r
    ),
    'bookings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', day, 'status', status, 'booking_count', booking_count)), '[]'::jsonb)
      from (
        select to_char(d.day, 'Mon DD') as day,
               s.status as status,
               count(b.id) as booking_count
        from generate_series(
               date_trunc('day', now()) - interval '13 days',
               date_trunc('day', now()), interval '1 day'
             ) d(day)
        cross join (values ('completed'), ('pending'), ('cancelled')) s(status)
        left join bookings b
          on date_trunc('day', b.created_at) = d.day
         and case when b.status = 'COMPLETED' then 'completed'
                  when b.status = 'CANCELLED' then 'cancelled'
                  else 'pending' end = s.status
        group by d.day, s.status
        order by d.day, s.status
      ) b
    ),
    'activities', (
      select case when to_regclass('public.audit_logs') is not null
        then (select coalesce(jsonb_agg(jsonb_build_object(
                'id', id, 'action', action, 'entity_type', entity_type,
                'created_at', created_at) order by created_at desc), '[]'::jsonb)
              from (select id, action, entity_type, created_at
                    from audit_logs order by created_at desc limit 5) al)
        else '[]'::jsonb end
    ),
    'pending_workers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', account_id,
        'name', name,
        'email', email,
        'category', category,
        'registeredDate', to_char(created_at, 'Mon DD, YYYY'),
        'verificationId', verification_id) order by created_at desc), '[]'::jsonb)
      from (
        select wp.account_id as account_id,
               coalesce(nullif(trim(wp.display_name), ''), a.email) as name,
               a.email as email,
               wp.created_at as created_at,
               (select sc.name
                  from worker_skills ws
                  join service_categories sc on sc.id = ws.category_id
                 where ws.worker_id = wp.account_id
                 limit 1) as category,
               (select wv.id
                  from worker_verifications wv
                 where wv.worker_id = wp.account_id
                 limit 1) as verification_id
        from worker_profiles wp
        join accounts a on a.id = wp.account_id
        where wp.approval_status <> 'APPROVED'
          and a.deleted_at is null
        order by wp.created_at desc
        limit 4
      ) pw
    ),
    'recent_users', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'registeredAt', to_char(created_at, 'Mon DD, YYYY')) order by created_at desc), '[]'::jsonb)
      from (
        select a.id as id,
               coalesce(nullif(trim(up.display_name), ''), a.email) as name,
               a.created_at as created_at
        from accounts a
        left join user_profiles up on up.account_id = a.id
        where a.role = 'USER' and a.deleted_at is null
        order by a.created_at desc
        limit 3
      ) ru
    ),
    'system_notifications', (
      select case when to_regclass('public.notifications') is not null
        then (select coalesce(jsonb_agg(jsonb_build_object(
                'id', id, 'title', title, 'message', body)
                order by created_at desc), '[]'::jsonb)
              from (select id, title, body, created_at
                    from notifications
                    where audience is not null
                    order by created_at desc limit 3) n)
        else '[]'::jsonb end
    )
  ) into result;

  return result;
end $$;

revoke execute on function public.admin_dashboard_overview() from public;
grant execute on function public.admin_dashboard_overview() to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPC is
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
