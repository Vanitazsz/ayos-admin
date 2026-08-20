-- Admin aggregation RPCs (Fix #1)
-- Run in the Supabase SQL editor. All functions are SECURITY DEFINER and
-- restricted to ADMIN accounts (mirrors the existing is_admin-style guard).
-- Each returns aggregated rows/scalars so the admin app no longer pulls whole tables.

-- 1. Monthly revenue + profit for the dashboard chart
create or replace function public.admin_revenue_series()
returns table (period text, revenue numeric, profit numeric)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    select to_char(x.month, 'Mon'), x.revenue, x.profit
    from (
      select date_trunc('month', created_at) as month,
             sum(service_amount)    as revenue,
             sum(commission_amount) as profit
      from payments
      where status = 'SUCCESSFUL' and created_at is not null
      group by 1
    ) x
    order by x.month;
end $$;

-- 2. Analytics KPIs as a single row (replaces full pulls of payments/bookings/accounts)
create or replace function public.admin_analytics_summary()
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
      where status = 'SUCCESSFUL' and created_at is not null
    ),
    b as (
      select count(*) filter (where status = 'COMPLETED') as completed,
             count(*) as total,
             coalesce(sum(agreed_service_amount) filter (where status = 'COMPLETED'), 0) as value
      from bookings
    ),
    u as (
      select count(*) as n from accounts where role = 'USER'
    ),
    cu as (
      select count(distinct user_account_id) as done,
             count(*) filter (where n > 1) as repeat
      from (
        select user_account_id, count(*) as n
        from bookings
        where status = 'COMPLETED'
        group by user_account_id
      ) t
    ),
    e as (
      select coalesce(sum(p.worker_net_amount), 0) as total,
             count(distinct b.worker_account_id) as workers
      from payments p
      join bookings b on b.id = p.booking_id
      where p.status = 'SUCCESSFUL' and p.worker_net_amount is not null
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
create or replace function public.admin_top_services()
returns table (name text, request_count bigint)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    select c.name, count(*)
    from service_requests r
    join service_categories c on c.id = r.category_id
    group by c.name;
end $$;

-- 4. Most-booked category name (replaces full bookings pull)
create or replace function public.admin_most_booked_service()
returns text
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return (
    select c.name
    from bookings b
    join service_requests r on r.id = b.service_request_id
    join service_categories c on c.id = r.category_id
    group by c.name
    order by count(*) desc
    limit 1
  );
end $$;

-- 5. Batched worker ratings (customer reviews were removed; rating is 0).
create or replace function public.get_worker_rating_stats(p_worker_ids uuid[])
returns table (worker_id uuid, avg_rating numeric, review_count bigint)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return;
end $$;

-- 6. RBAC: restrict EXECUTE of the admin RPCs to authenticated users only.
--    The in-function role check still enforces that only ADMIN accounts get data.
revoke execute on function public.admin_revenue_series() from public;
revoke execute on function public.admin_analytics_summary() from public;
revoke execute on function public.admin_top_services() from public;
revoke execute on function public.admin_most_booked_service() from public;
revoke execute on function public.get_worker_rating_stats(uuid[]) from public;
grant execute on function public.admin_revenue_series() to authenticated;
grant execute on function public.admin_analytics_summary() to authenticated;
grant execute on function public.admin_top_services() to authenticated;
grant execute on function public.admin_most_booked_service() to authenticated;
grant execute on function public.get_worker_rating_stats(uuid[]) to authenticated;

-- Force PostgREST to reload its schema cache so newly created/replaced RPCs
-- are visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
