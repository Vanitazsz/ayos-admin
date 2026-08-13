-- Admin Notifications Engine (campaign) RPCs.
-- Run in the Supabase SQL editor AFTER admin-rbac-permissions.sql (defines
-- is_admin()) and after admin-bootstrap.sql (notification_campaigns /
-- notification_deliveries tables). Idempotent / re-runnable.
--
-- Design:
--   * The admin "Notifications Engine" manages notification_campaigns rows
--     (drafts). admin_publish_campaign fans a campaign out to per-recipient
--     notifications + notification_deliveries.
--   * Campaigns are soft-deleted ("moved to trash") via new deleted_at /
--     deleted_by columns AND a trash_entries row (entity_type =
--     'notification_campaign') so the Trash page can restore or permanently
--     delete them. The admin list filters deleted rows out.
--   * Drafts can be edited via admin_update_notification_draft (DRAFT only).
--   * All admin writes go through SECURITY DEFINER RPCs guarded by is_admin().

-- 1) Soft-delete columns on notification_campaigns
alter table public.notification_campaigns add column if not exists deleted_at timestamptz;
alter table public.notification_campaigns add column if not exists deleted_by uuid references public.accounts(id) on delete set null;

-- 2) RPC: create a campaign draft. Returns the inserted row so the client can
--    immediately publish it.
create or replace function public.admin_create_notification_draft(
  p_title text,
  p_body text,
  p_audience public.notification_audience
)
returns public.notification_campaigns
language plpgsql security definer set search_path = '' as $$
declare
  v_campaign public.notification_campaigns;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if trim(coalesce(p_title, '')) = '' then
    raise exception using errcode = '22023', message = 'TITLE_REQUIRED';
  end if;
  if trim(coalesce(p_body, '')) = '' then
    raise exception using errcode = '22023', message = 'BODY_REQUIRED';
  end if;

  insert into public.notification_campaigns(title, body, audience, status, created_by)
  values (trim(p_title), trim(p_body), p_audience, 'DRAFT', auth.uid())
  returning * into v_campaign;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'NOTIFICATION_CAMPAIGN_CREATED',
    'notification_campaign',
    v_campaign.id::text,
    jsonb_build_object(
      'title', v_campaign.title,
      'audience', v_campaign.audience,
      'status', v_campaign.status
    )
  );

  return v_campaign;
end $$;

-- 3) RPC: update a campaign draft (DRAFT only).
create or replace function public.admin_update_notification_draft(
  p_campaign_id uuid,
  p_title text,
  p_body text,
  p_audience public.notification_audience
)
returns public.notification_campaigns
language plpgsql security definer set search_path = '' as $$
declare
  v_campaign public.notification_campaigns;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if trim(coalesce(p_title, '')) = '' then
    raise exception using errcode = '22023', message = 'TITLE_REQUIRED';
  end if;
  if trim(coalesce(p_body, '')) = '' then
    raise exception using errcode = '22023', message = 'BODY_REQUIRED';
  end if;

  update public.notification_campaigns
     set title = trim(p_title),
         body = trim(p_body),
         audience = p_audience,
         updated_at = now()
   where id = p_campaign_id
     and deleted_at is null
     and status = 'DRAFT'
  returning * into v_campaign;

  if v_campaign.id is null then
    raise exception using errcode = '45001', message = 'CAMPAIGN_NOT_EDITABLE';
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'NOTIFICATION_CAMPAIGN_UPDATED',
    'notification_campaign',
    v_campaign.id::text,
    jsonb_build_object(
      'title', v_campaign.title,
      'audience', v_campaign.audience,
      'status', v_campaign.status
    )
  );

  return v_campaign;
end $$;

-- 4) RPC: move a campaign to trash. Creates a trash_entries row (so the Trash
--    page can restore / permanently delete) and soft-deletes the campaign so
--    it disappears from the admin list.
create or replace function public.admin_archive_notification(p_notification_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_campaign public.notification_campaigns;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select c.* into v_campaign
  from public.notification_campaigns c
  where c.id = p_notification_id
    and c.deleted_at is null
  for update;

  if v_campaign.id is null then
    raise exception using errcode = 'P0002', message = 'CAMPAIGN_NOT_FOUND';
  end if;

  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values (
    'notification_campaign',
    v_campaign.id::text,
    jsonb_build_object(
      'notification_campaign',
      jsonb_build_object(
        'name', v_campaign.title,
        'audience', v_campaign.audience,
        'status', v_campaign.status
      )
    ),
    auth.uid()
  );

  update public.notification_campaigns
     set deleted_at = now(),
         deleted_by = auth.uid(),
         updated_at = now()
   where id = v_campaign.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'NOTIFICATION_CAMPAIGN_TRASHED', 'notification_campaign', v_campaign.id::text);

  return true;
end $$;

-- 5) RPC: restore a campaign from trash.
create or replace function public.admin_restore_notification_campaign_from_trash(p_trash_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_campaign_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entity_id::uuid into v_campaign_id
  from public.trash_entries
  where id = p_trash_id
    and entity_type = 'notification_campaign'
    and restored_at is null;

  if v_campaign_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  update public.notification_campaigns
     set deleted_at = null,
         deleted_by = null,
         updated_at = now()
   where id = v_campaign_id;

  update public.trash_entries
     set restored_at = now()
   where id = p_trash_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'NOTIFICATION_CAMPAIGN_RESTORED', 'notification_campaign', v_campaign_id::text);
end $$;

-- 6) RPC: permanently delete a campaign from trash. Requires the admin to
--    type 'DELETE <campaign_id>' to confirm. Children (deliveries) go via FK
--    cascade; per-recipient notifications published from the campaign are
--    removed by source_key so no orphaned notifications remain.
create or replace function public.admin_hard_delete_notification_campaign_from_trash(
  p_trash_id uuid,
  p_confirmation text
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  entry public.trash_entries;
  v_campaign_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'notification_campaign' then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  if trim(coalesce(p_confirmation, '')) <> 'DELETE ' || entry.entity_id then
    raise exception using errcode = '22023', message = 'DELETE_CONFIRMATION_MISMATCH';
  end if;

  select id into v_campaign_id
  from public.notification_campaigns
  where id = entry.entity_id::uuid;

  if v_campaign_id is not null then
    delete from public.notifications
    where source_key = 'campaign:' || v_campaign_id::text
       or source_key like 'campaign:' || v_campaign_id::text || ':%';
    delete from public.notification_campaigns where id = v_campaign_id;
  end if;

  delete from public.trash_entries where id = entry.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'NOTIFICATION_CAMPAIGN_HARD_DELETED', 'notification_campaign', entry.entity_id);
end $$;

-- 7) grants
revoke all on function public.admin_create_notification_draft(text, text, public.notification_audience) from public, anon;
grant execute on function public.admin_create_notification_draft(text, text, public.notification_audience) to authenticated;

revoke all on function public.admin_update_notification_draft(uuid, text, text, public.notification_audience) from public, anon;
grant execute on function public.admin_update_notification_draft(uuid, text, text, public.notification_audience) to authenticated;

revoke all on function public.admin_archive_notification(uuid) from public, anon;
grant execute on function public.admin_archive_notification(uuid) to authenticated;

revoke all on function public.admin_restore_notification_campaign_from_trash(uuid) from public, anon;
grant execute on function public.admin_restore_notification_campaign_from_trash(uuid) to authenticated;

revoke all on function public.admin_hard_delete_notification_campaign_from_trash(uuid, text) from public, anon;
grant execute on function public.admin_hard_delete_notification_campaign_from_trash(uuid, text) to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPCs are
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
