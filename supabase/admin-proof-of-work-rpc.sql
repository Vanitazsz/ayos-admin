-- Admin RPCs for trashing, restoring, and permanently deleting booking
-- proof-of-work records (worker + customer proof photos plus the worker's
-- rating/comment). Mirrors the booking/payment trash lifecycle in
-- admin-booking-actions-rpc.sql. Trashed proof-of-work appears under the
-- "Reviews" tab of the Trash page.
-- Run this SQL in the Supabase SQL Editor.
-- Requires public.is_admin(boolean) (admin-rbac-permissions.sql) and
-- public._admin_hard_delete_triggers(boolean) (admin-hard-delete-rpcs.sql).
-- Idempotent / re-runnable.

create or replace function public.admin_move_booking_proof_to_trash(
  p_booking_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_booking public.bookings;
  normalized_reason text := nullif(trim(coalesce(p_reason, '')), '');
  worker_name text;
  customer_name text;
  service_name text;
  worker_photo_count integer := 0;
  customer_photo_count integer := 0;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_booking_id is null then
    raise exception using errcode = '22004', message = 'INVALID_BOOKING_ID';
  end if;

  if normalized_reason is null or length(normalized_reason) < 3 then
    raise exception using errcode = '22023', message = 'REASON_TOO_SHORT';
  end if;

  select * into target_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if target_booking.id is null then
    raise exception using errcode = 'P0002', message = 'BOOKING_NOT_FOUND';
  end if;

  select
    count(*) filter (where m.submitted_by = 'worker'),
    count(*) filter (where m.submitted_by = 'customer')
  into worker_photo_count, customer_photo_count
  from public.booking_proof_media m
  where m.booking_id = target_booking.id;

  if target_booking.worker_proof_rating is null
    and target_booking.worker_proof_comment is null
    and worker_photo_count = 0
    and customer_photo_count = 0
  then
    raise exception using errcode = 'P0002', message = 'BOOKING_PROOF_NOT_FOUND';
  end if;

  select display_name into worker_name
  from public.worker_profiles
  where account_id = target_booking.worker_account_id;

  select display_name into customer_name
  from public.user_profiles
  where account_id = target_booking.user_account_id;

  select sc.name into service_name
  from public.service_requests sr
  left join public.service_categories sc on sc.id = sr.category_id
  where sr.id = target_booking.service_request_id;

  -- Add entry to Trash table (trash_entries)
  if not exists (
    select 1 from public.trash_entries
    where entity_id = target_booking.id::text
      and entity_type = 'booking_proof'
      and restored_at is null
  ) then
    insert into public.trash_entries(
      entity_type,
      entity_id,
      snapshot,
      deleted_by
    ) values (
      'booking_proof',
      target_booking.id::text,
      jsonb_build_object(
        'booking_proof', jsonb_build_object(
          'name', 'Booking ' || substring(target_booking.id::text, 1, 8)
            || coalesce(' (' || worker_name || ')', ''),
          'booking_id', target_booking.id,
          'worker', worker_name,
          'customer', customer_name,
          'service', service_name,
          'rating', target_booking.worker_proof_rating,
          'comment', target_booking.worker_proof_comment,
          'worker_photo_count', worker_photo_count,
          'customer_photo_count', customer_photo_count,
          'reason', normalized_reason
        )
      ),
      auth.uid()
    );
  end if;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_PROOF_TRASHED_BY_ADMIN',
    'booking',
    target_booking.id::text,
    jsonb_build_object(
      'reason', normalized_reason,
      'rating', target_booking.worker_proof_rating,
      'worker_photo_count', worker_photo_count,
      'customer_photo_count', customer_photo_count
    )
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', target_booking.id
  );
end;
$$;


create or replace function public.admin_restore_booking_proof_from_trash(
  p_trash_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entity_id::uuid into v_booking_id
  from public.trash_entries
  where id = p_trash_id
    and entity_type = 'booking_proof'
    and restored_at is null;

  if v_booking_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  update public.trash_entries
  set restored_at = now(),
      restored_by = auth.uid()
  where id = p_trash_id;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id
  ) values (
    auth.uid(),
    'BOOKING_PROOF_RESTORED_FROM_TRASH',
    'booking',
    v_booking_id::text
  );
end;
$$;


create or replace function public.admin_hard_delete_booking_proof_from_trash(
  p_trash_id uuid,
  p_confirmation text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  entry public.trash_entries;
  v_booking_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'booking_proof' then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  if trim(coalesce(p_confirmation, '')) <> 'DELETE ' || entry.entity_id then
    raise exception using errcode = '22023', message = 'DELETE_CONFIRMATION_MISMATCH';
  end if;

  select b.id into v_booking_id
  from public.bookings b
  where b.id = entry.entity_id::uuid;

  if v_booking_id is null then
    -- Booking row is already gone; remove the orphaned trash entry.
    delete from public.trash_entries where id = entry.id;

    insert into public.audit_logs(actor_id, action, entity_type, entity_id)
    values (auth.uid(), 'BOOKING_PROOF_HARD_DELETED_FROM_TRASH', 'booking', entry.entity_id);
    return;
  end if;

  perform public._admin_hard_delete_triggers(true);

  delete from public.booking_proof_media
  where booking_id = v_booking_id;

  update public.bookings
  set worker_proof_rating = null,
      worker_proof_comment = null
  where id = v_booking_id;

  perform public._admin_hard_delete_triggers(false);

  delete from public.trash_entries where id = entry.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'BOOKING_PROOF_HARD_DELETED_FROM_TRASH', 'booking', entry.entity_id);
end
$$;

revoke execute on function public.admin_move_booking_proof_to_trash(uuid, text) from public, anon;
grant execute on function public.admin_move_booking_proof_to_trash(uuid, text) to authenticated;

revoke execute on function public.admin_restore_booking_proof_from_trash(uuid) from public, anon;
grant execute on function public.admin_restore_booking_proof_from_trash(uuid) to authenticated;

revoke execute on function public.admin_hard_delete_booking_proof_from_trash(uuid, text) from public, anon;
grant execute on function public.admin_hard_delete_booking_proof_from_trash(uuid, text) to authenticated;

notify pgrst, 'reload schema';
