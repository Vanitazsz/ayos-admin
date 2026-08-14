-- Admin Notifications: propagate read_at from per-recipient notifications rows
-- to notification_deliveries so open rate tracking is accurate.
-- Run AFTER admin-notifications-rpc.sql (tables). Idempotent / re-runnable.
--
-- notification_deliveries are keyed by campaign_id; the per-recipient
-- notifications row marks reads. This file syncs the two and backfills history.

-- 1) One-time backfill: mark deliveries read for already-read campaign notifications.
update public.notification_deliveries d
set read_at = n.read_at
from public.notifications n
where n.id = d.notification_id
  and n.read_at is not null
  and d.read_at is null;

-- 2) Trigger: keep notification_deliveries.read_at in sync going forward.
-- Fires only on an actual read transition and updates a single row, so the
-- recurring cost per open is bounded.
create or replace function public.sync_notification_delivery_read_at()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.read_at is not null then
    update public.notification_deliveries
    set read_at = new.read_at
    where notification_id = new.id
      and read_at is null;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_notification_delivery_read_at on public.notifications;

create trigger trg_sync_notification_delivery_read_at
after update of read_at on public.notifications
for each row
when (new.read_at is not null and new.read_at is distinct from old.read_at)
execute function public.sync_notification_delivery_read_at();

revoke all on function public.sync_notification_delivery_read_at() from public, anon;
grant execute on function public.sync_notification_delivery_read_at() to authenticated;

notify pgrst, 'reload schema';
