-- Admin report-export trash RPCs.
-- Move report exports to the Trash page, restore them, or permanently delete
-- them. Follows the same trash_entries convention as accounts/bookings/messages:
-- a deleted_at marker on the entity row (hidden from the Reports page) plus a
-- trash_entries row carrying a snapshot for display and restore.
--
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--
-- admin_move_report_export_to_trash(p_report_id)          -> marks deleted + inserts trash_entries
-- admin_restore_report_export_from_trash(p_trash_id)      -> unhides row + marks restored_at
-- admin_hard_delete_report_export_from_trash(p_trash_id, p_confirmation)
--   -> purges the row + storage file + trash entry (requires 'DELETE <entity_id>')

alter table public.report_exports add column if not exists deleted_at timestamptz;

-- Move a report export to trash: hides it from the Reports page and records a
-- trash_entries row so admins can restore or permanently delete it.
create or replace function public.admin_move_report_export_to_trash(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.report_exports%rowtype;
  v_label text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  -- Idempotent: if there's already an active trash entry, just keep it hidden.
  if exists (
    select 1 from public.trash_entries
    where entity_type = 'report_export'
      and entity_id = p_report_id::text
      and restored_at is null
  ) then
    update public.report_exports set deleted_at = now() where id = p_report_id;
    return;
  end if;

  select * into v_report from public.report_exports where id = p_report_id;
  if v_report.id is null then
    raise exception using errcode = 'P0002', message = 'REPORT_EXPORT_NOT_FOUND';
  end if;

  v_label := case v_report.report_type
    when 'FINANCIAL' then 'Financial Summary'
    when 'WORKERS' then 'Worker Performance'
    when 'CUSTOMERS' then 'Customer Activity'
    when 'SERVICES' then 'Service Popularity'
    when 'REVIEWS' then 'Review Sentiment'
    else v_report.report_type
  end;

  update public.report_exports set deleted_at = now() where id = p_report_id;

  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values (
    'report_export',
    p_report_id::text,
    jsonb_build_object('report_export', jsonb_build_object(
      'name', v_label,
      'report_type', v_report.report_type,
      'format', coalesce(v_report.parameters->>'format', 'PDF'),
      'storage_path', v_report.storage_path
    )),
    auth.uid()
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'REPORT_EXPORT_TRASHED', 'report_export', p_report_id::text);
end $$;

-- Restore a trashed report export: unhides the row and marks the trash entry restored.
create or replace function public.admin_restore_report_export_from_trash(p_trash_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_entity text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entity_id::uuid, entity_type into v_report_id, v_entity
  from public.trash_entries
  where id = p_trash_id
    and restored_at is null;
  if v_report_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;
  if v_entity <> 'report_export' then
    raise exception using errcode = '22023', message = 'NOT_REPORT_EXPORT_TRASH_ENTRY';
  end if;

  update public.report_exports set deleted_at = null where id = v_report_id;
  update public.trash_entries set restored_at = now() where id = p_trash_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'REPORT_EXPORT_RESTORED', 'report_export', v_report_id::text);
end $$;

-- Permanently delete a trashed report export and its storage file.
-- Requires typing DELETE <entity_id> (same contract as the other trash RPCs).
create or replace function public.admin_hard_delete_report_export_from_trash(
  p_trash_id uuid,
  p_confirmation text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_entity text;
  v_storage_path text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entity_id::uuid, entity_type into v_report_id, v_entity
  from public.trash_entries
  where id = p_trash_id
    and restored_at is null;
  if v_report_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;
  if v_entity <> 'report_export' then
    raise exception using errcode = '22023', message = 'NOT_REPORT_EXPORT_TRASH_ENTRY';
  end if;

  if trim(coalesce(p_confirmation, '')) is distinct from 'DELETE ' || v_report_id::text then
    raise exception using errcode = '22023', message = 'CONFIRMATION_MISMATCH';
  end if;

  select storage_path into v_storage_path from public.report_exports where id = v_report_id;

  -- Remove the report file from storage (best effort).
  if v_storage_path is not null then
    delete from storage.objects
    where bucket_id = 'report-exports' and name = v_storage_path;
  end if;

  delete from public.report_exports where id = v_report_id;
  delete from public.trash_entries where id = p_trash_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'REPORT_EXPORT_HARD_DELETED_FROM_TRASH', 'report_export', v_report_id::text);
end $$;

revoke all on function public.admin_move_report_export_to_trash(uuid) from public, anon;
grant execute on function public.admin_move_report_export_to_trash(uuid) to authenticated;
revoke all on function public.admin_restore_report_export_from_trash(uuid) from public, anon;
grant execute on function public.admin_restore_report_export_from_trash(uuid) to authenticated;
revoke all on function public.admin_hard_delete_report_export_from_trash(uuid, text) from public, anon;
grant execute on function public.admin_hard_delete_report_export_from_trash(uuid, text) to authenticated;

-- Force PostgREST to reload its schema cache so the new RPCs are visible
-- immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
