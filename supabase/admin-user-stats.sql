-- Admin users page header stats RPC.
-- Point-in-time counts for the KPI cards, computed server-side instead of
-- pulling every user key into the browser.

create or replace function public.get_user_stats()
returns table (total bigint, active bigint, suspended bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select
      count(*) as total,
      count(*) filter (where upper(status::text) = 'ACTIVE') as active,
      count(*) filter (where upper(status::text) = 'SUSPENDED') as suspended
    from public.accounts
    where role = 'USER' and deleted_at is null;
end $$;

revoke all on function public.get_user_stats() from public, anon;
grant execute on function public.get_user_stats() to authenticated;

notify pgrst, 'reload schema';
