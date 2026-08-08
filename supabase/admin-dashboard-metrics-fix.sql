-- Replaces the pre-existing admin_dashboard_metrics RPC.
-- The old one was unguarded and failed with 42702 "column reference revenue/status is ambiguous".
-- Returns exactly the columns the Dashboard page reads, guarded to ADMIN accounts only.
-- Run in the Supabase SQL editor after admin-rbac-permissions.sql.

-- The pre-existing function has a different return type, so create or replace refuses
-- (42P13). Drop it first.
drop function if exists public.admin_dashboard_metrics();

create or replace function public.admin_dashboard_metrics()
returns table (
  successful_payment_total numeric,
  active_bookings          bigint,
  accounts                 bigint,
  active_workers           bigint,
  queued_ai_jobs           bigint,
  open_support             bigint
)
language plpgsql security definer set search_path = public as $$
declare
  ai_jobs_count bigint := 0;
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;

  -- ai_jobs may not exist; the IF is planned lazily (only when reached), so this
  -- stays safe while counting the table if/when it is added.
  if to_regclass('public.ai_jobs') is not null then
    select count(*) into ai_jobs_count from public.ai_jobs;
  end if;

  return query
    select
      coalesce((select sum(service_amount) from payments
                where status = 'SUCCESSFUL' and created_at is not null), 0),
      (select count(*) from bookings where status not in ('COMPLETED', 'CANCELLED')),
      (select count(*) from accounts where role = 'USER' and deleted_at is null),
      (select count(*) from worker_profiles where approval_status = 'APPROVED'),
      ai_jobs_count,
      (select count(*) from support_tickets where status <> 'CLOSED');
end $$;

revoke execute on function public.admin_dashboard_metrics() from public;
grant execute on function public.admin_dashboard_metrics() to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPC is
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
