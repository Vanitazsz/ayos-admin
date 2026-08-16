-- Admin bookings page header stats RPC.
-- Replaces the client-side computation that previously pulled every booking
-- key into the browser just to render the four KPI cards. SECURITY DEFINER +
-- admin guard, mirroring get_payment_stats.
--
-- "Today" uses Asia/Manila so it matches the browser-local day the admin app
-- showed before (the DB runs in UTC). Adjust the zone here if the deployment
-- audience changes.

create or replace function public.get_booking_stats()
returns table (total bigint, today bigint, pending bigint, ongoing bigint, completed_today bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select
      count(*) as total,
      count(*) filter (where (coalesce(sr.scheduled_at, b.created_at) at time zone 'Asia/Manila')::date = v_today) as today,
      count(*) filter (where upper(b.status::text) = 'PENDING') as pending,
      count(*) filter (where upper(b.status::text) = 'ONGOING') as ongoing,
      count(*) filter (where upper(b.status::text) = 'COMPLETED'
        and (coalesce(sr.scheduled_at, b.created_at) at time zone 'Asia/Manila')::date = v_today) as completed_today
    from public.bookings b
    left join public.service_requests sr on sr.id = b.service_request_id;
end $$;

revoke all on function public.get_booking_stats() from public, anon;
grant execute on function public.get_booking_stats() to authenticated;

notify pgrst, 'reload schema';
