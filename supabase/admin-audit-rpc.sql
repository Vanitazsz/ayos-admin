-- Admin audit log listing.
--
-- Single round-trip for the admin Security Audit Logs page: returns each audit
-- row denormalized with the actor's display name and the IP address / user agent
-- of their latest SIGNED_IN event (from authentication_events). The audit_logs
-- rows themselves do not store ip/device, so a lateral join is used instead of
-- one query per row.

create or replace function public.admin_list_audit_logs(p_limit integer default 500)
returns table (
  id uuid,
  created_at timestamptz,
  action text,
  entity_type text,
  entity_id text,
  metadata jsonb,
  admin_name text,
  ip_address inet,
  user_agent text
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select l.id,
           l.created_at,
           l.action,
           l.entity_type,
           l.entity_id,
           l.metadata,
           coalesce(up.display_name, wp.display_name, ap.display_name) as admin_name,
           sess.ip_address,
           sess.user_agent
    from public.audit_logs l
    left join public.accounts a on a.id = l.actor_id
    left join public.user_profiles up on up.account_id = a.id
    left join public.worker_profiles wp on wp.account_id = a.id
    left join public.admin_profiles ap on ap.account_id = a.id
    left join lateral (
      select e.ip_address,
             e.user_agent
      from public.authentication_events e
      where e.account_id = l.actor_id
        and e.event_type = 'SIGNED_IN'
        and e.ip_address is not null
      order by e.created_at desc
      limit 1
    ) sess on true
    order by l.created_at desc
    limit greatest(1, p_limit);
end $$;

revoke all on function public.admin_list_audit_logs(integer) from public, anon;
grant execute on function public.admin_list_audit_logs(integer) to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPC is
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
