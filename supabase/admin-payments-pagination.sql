-- Admin payments list RPC (Fix #2)
-- Run in the Supabase SQL editor. Mirrors the existing admin-aggregation RPCs:
-- SECURITY DEFINER + ADMIN-only guard. Returns the payments page-header stats
-- as a single aggregate row so the admin app no longer pulls the whole
-- payments table just to compute the KPI cards. The list itself is paginated
-- server-side from the client via range()/count filters (see payments.js).

create or replace function public.get_payment_stats()
returns table (revenue numeric, commission numeric, pending numeric, failed bigint)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role::text from public.accounts where id = auth.uid()), '') <> 'ADMIN'
  then raise exception 'Not authorized'; end if;
  return query
    select
      coalesce(sum(service_amount)   filter (where status = 'SUCCESSFUL'), 0) as revenue,
      coalesce(sum(commission_amount) filter (where status = 'SUCCESSFUL'), 0) as commission,
      coalesce(sum(service_amount)   filter (where status = 'PENDING'), 0)    as pending,
      count(*) filter (where status = 'FAILED')                                as failed
    from payments p
    where not exists (
      select 1
      from trash_entries t
      where t.entity_type = 'payment'
        and t.entity_id = p.id
        and t.restored_at is null
    );
end $$;

revoke execute on function public.get_payment_stats() from public;
grant execute on function public.get_payment_stats() to authenticated;

-- Force PostgREST to reload its schema cache so the new RPC is visible immediately.
notify pgrst, 'reload schema';
