-- Admin audit actor roster.
--
-- One aggregate round-trip for the admin Security Audit Logs page roster tabs
-- (Users / Workers). Returns one row per actor who has audit activity, grouped
-- by accounts.role, so the admin can drill into a single actor's log list.
--
-- Requires admin_list_audit_logs(integer, uuid) (admin-audit-rpc.sql) for the
-- per-actor detail view.

create or replace function public.admin_list_audit_actors(p_role text)
returns table (
  actor_id uuid,
  name text,
  email text,
  role text,
  action_count bigint,
  last_activity timestamptz,
  modules text[]
)
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := upper(trim(coalesce(p_role, '')));
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if v_role not in ('USER', 'WORKER') then
    raise exception using errcode = '22023', message = 'INVALID_ROLE';
  end if;

  return query
    select l.actor_id,
           coalesce(up.display_name, wp.display_name) as name,
           a.email,
           a.role,
           count(*)::bigint as action_count,
           max(l.created_at) as last_activity,
           array_agg(distinct l.entity_type order by l.entity_type) filter (where l.entity_type is not null) as modules
    from public.audit_logs l
    join public.accounts a on a.id = l.actor_id and a.role::text = v_role
    left join public.user_profiles up on up.account_id = a.id
    left join public.worker_profiles wp on wp.account_id = a.id
    group by l.actor_id, a.email, a.role, up.display_name, wp.display_name
    order by last_activity desc
    limit 1000;
end $$;

revoke all on function public.admin_list_audit_actors(text) from public, anon;
grant execute on function public.admin_list_audit_actors(text) to authenticated;

-- Force PostgREST to reload its schema cache so the new RPC is visible
-- immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
