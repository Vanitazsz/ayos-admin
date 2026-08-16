-- Admin workers page header stats RPC.
-- Point-in-time counts for the KPI cards, computed server-side instead of
-- pulling every worker profile into the browser.
--
-- pending_review mirrors the old client-side "needsReview": the worker has at
-- least one verification whose status is not APPROVED.

create or replace function public.get_worker_stats()
returns table (total bigint, active bigint, pending_review bigint, suspended bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select
      count(*) as total,
      count(*) filter (where upper(a.status::text) = 'ACTIVE') as active,
      count(*) filter (where exists (
        select 1 from public.worker_verifications wv
        where wv.worker_id = wp.account_id and wv.status is distinct from 'APPROVED')) as pending_review,
      count(*) filter (where upper(a.status::text) = 'SUSPENDED') as suspended
    from public.worker_profiles wp
    join public.accounts a on a.id = wp.account_id and a.role = 'WORKER' and a.deleted_at is null;
end $$;

revoke all on function public.get_worker_stats() from public, anon;
grant execute on function public.get_worker_stats() to authenticated;

notify pgrst, 'reload schema';
