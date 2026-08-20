-- Admin audit log listing.
--
-- Single round-trip for the admin Security Audit Logs page: returns each audit
-- row denormalized with the actor's display name and the IP address / user agent
-- of their latest SIGNED_IN event (from authentication_events). The audit_logs
-- rows themselves do not store ip/device, so a lateral join is used instead of
-- one query per row.
--
-- Passing p_actor_id narrows the result to a single actor (the roster drawer
-- detail view); omitting it returns the full feed.

-- ---------------------------------------------------------------------------
-- Server-side pagination (replaces the old p_limit:500 fetch-all). The page
-- now pushes search / module / date / page to the database and only pulls the
-- visible page of rows. The lookback window is clamped to 7 days to match the
-- retention window (admin-audit-log-retention.sql).
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_audit_logs_page(
  p_page integer default 1,
  p_page_size integer default 12,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_search text default null,
  p_module text default null,
  p_actor_id uuid default null
)
returns table (
  id uuid,
  created_at timestamptz,
  action text,
  entity_type text,
  entity_id text,
  metadata jsonb,
  admin_name text,
  ip_address inet,
  user_agent text,
  total_count bigint
)
language plpgsql security definer set search_path = '' as $$
declare
  v_from timestamptz := greatest(coalesce(p_from, now() - interval '7 days'), now() - interval '7 days');
  v_to timestamptz := least(coalesce(p_to, now()), now());
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_limit int := greatest(1, coalesce(p_page_size, 12));
  v_offset int := greatest(0, coalesce(p_page, 1) - 1) * greatest(1, coalesce(p_page_size, 12));
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  return query
    with matching as (
      select l.id
      from public.audit_logs l
      left join public.accounts a on a.id = l.actor_id
      left join public.user_profiles up on up.account_id = a.id
      left join public.worker_profiles wp on wp.account_id = a.id
      left join public.admin_profiles ap on ap.account_id = a.id
      left join lateral (
        select e.ip_address
        from public.authentication_events e
        where e.account_id = l.actor_id
          and e.event_type = 'SIGNED_IN'
          and e.ip_address is not null
        order by e.created_at desc
        limit 1
      ) sess on true
      where l.created_at between v_from and v_to
        and (p_actor_id is null or l.actor_id = p_actor_id)
        and (v_search is null
             or coalesce(up.display_name, wp.display_name, ap.display_name) ilike '%' || v_search || '%'
             or l.action ilike '%' || v_search || '%'
             or sess.ip_address::text ilike '%' || v_search || '%')
        and (p_module is null or lower(l.entity_type) ilike lower(p_module) || '%')
    ),
    paged as (
      select m.id
      from matching m
      order by m.id
      limit v_limit
      offset v_offset
    )
    select l.id,
           l.created_at,
           l.action,
           l.entity_type,
           l.entity_id,
           l.metadata,
           coalesce(up.display_name, wp.display_name, ap.display_name) as admin_name,
           sess.ip_address,
           sess.user_agent,
           (select count(*) from matching) as total_count
    from paged p
    join public.audit_logs l on l.id = p.id
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
    order by l.created_at desc;
end $$;

revoke all on function public.admin_list_audit_logs_page(integer, integer, timestamptz, timestamptz, text, text, uuid) from public, anon;
grant execute on function public.admin_list_audit_logs_page(integer, integer, timestamptz, timestamptz, text, text, uuid) to authenticated;

-- Aggregate counts over the same bounded window so the KPI cards no longer
-- depend on whatever rows happened to be fetched for the feed.
create or replace function public.admin_audit_logs_stats(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (recent_activities bigint, failed bigint, critical bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_from timestamptz := greatest(coalesce(p_from, now() - interval '7 days'), now() - interval '7 days');
  v_to timestamptz := least(coalesce(p_to, now()), now());
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select
      count(*) as recent_activities,
      count(*) filter (where lower(coalesce(metadata->>'status', '')) = 'failed') as failed,
      count(*) filter (where upper(coalesce(metadata->>'severity', '')) = 'CRITICAL') as critical
    from public.audit_logs l
    where l.created_at between v_from and v_to;
end $$;

revoke all on function public.admin_audit_logs_stats(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_audit_logs_stats(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';
