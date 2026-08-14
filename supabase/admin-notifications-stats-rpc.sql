-- Admin Notifications: per-campaign delivery aggregates.
-- Run in the Supabase SQL editor AFTER admin-rbac-permissions.sql (defines
-- is_admin()) and admin-notifications-rpc.sql (tables). Idempotent / re-runnable.
--
-- Returns one row per campaign with total delivery count and how many were
-- read, so the admin list no longer pulls every notification_deliveries row.

drop function if exists public.admin_get_notification_campaign_stats(uuid[]);

create or replace function public.admin_get_notification_campaign_stats(
  p_campaign_ids uuid[]
)
returns table (
  campaign_id uuid,
  total bigint,
  read bigint
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_campaign_ids is null or array_length(p_campaign_ids, 1) = 0 then
    return;
  end if;
  return query
    select d.campaign_id,
           count(*)::bigint as total,
           count(*) filter (where d.read_at is not null)::bigint as read
    from public.notification_deliveries d
    where d.campaign_id = any(p_campaign_ids)
    group by d.campaign_id;
end $$;

revoke all on function public.admin_get_notification_campaign_stats(uuid[]) from public, anon;
grant execute on function public.admin_get_notification_campaign_stats(uuid[]) to authenticated;

notify pgrst, 'reload schema';
