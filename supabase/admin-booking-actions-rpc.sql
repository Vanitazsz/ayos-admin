-- Admin RPCs for cancelling, trashing, restoring, and reassigning bookings and payments.
-- Allows trashing any booking or payment transaction.
-- Run this SQL in the Supabase SQL Editor.

create or replace function public.admin_cancel_booking(
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
  customer_name text;
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

  -- Update status to CANCELLED for active bookings
  if upper(target_booking.status::text) not in ('COMPLETED', 'CANCELLED') then
    update public.bookings
    set status = 'CANCELLED',
        cancelled_at = coalesce(cancelled_at, now()),
        version = coalesce(version, 0) + 1
    where id = target_booking.id;

    if target_booking.service_request_id is not null then
      update public.service_requests
      set status = 'CANCELLED',
          updated_at = now()
      where id = target_booking.service_request_id;
    end if;

    if not exists (select 1 from public.cancellations where booking_id = target_booking.id) then
      insert into public.cancellations(
        booking_id,
        cancelled_by,
        reason,
        reason_code,
        initiator_role,
        job_stage,
        policy_version,
        resolution_status
      ) values (
        target_booking.id,
        auth.uid(),
        normalized_reason,
        'ADMIN_CANCELLED',
        'ADMIN',
        'BEFORE_TRAVEL',
        'v1.0',
        'CONFIRMED'
      );
    end if;

    insert into public.booking_status_events(
      booking_id,
      from_status,
      to_status,
      actor_id,
      reason
    ) values (
      target_booking.id,
      target_booking.status,
      'CANCELLED',
      auth.uid(),
      normalized_reason
    );
  end if;

  -- Get customer display name for trash entry item description
  select display_name into customer_name
  from public.user_profiles
  where account_id = target_booking.user_account_id;

  -- Add entry to Trash table (trash_entries)
  if not exists (
    select 1 from public.trash_entries
    where entity_id = target_booking.id::text
      and entity_type = 'booking'
      and restored_at is null
  ) then
    insert into public.trash_entries(
      entity_type,
      entity_id,
      snapshot,
      deleted_by
    ) values (
      'booking',
      target_booking.id::text,
      jsonb_build_object(
        'booking', jsonb_build_object(
          'name', 'Booking ' || substring(target_booking.id::text, 1, 8) || coalesce(' (' || customer_name || ')', ''),
          'status', target_booking.status,
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
    'BOOKING_TRASHED_BY_ADMIN',
    'booking',
    target_booking.id::text,
    jsonb_build_object(
      'reason', normalized_reason,
      'status', target_booking.status
    )
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', target_booking.id,
    'status', target_booking.status
  );
end;
$$;


create or replace function public.admin_restore_booking_from_trash(
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
    and entity_type = 'booking'
    and restored_at is null;

  if v_booking_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  update public.bookings
  set status = 'PENDING',
      cancelled_at = null,
      version = coalesce(version, 0) + 1
  where id = v_booking_id;

  update public.trash_entries
  set restored_at = now()
  where id = p_trash_id;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id
  ) values (
    auth.uid(),
    'BOOKING_RESTORED_FROM_TRASH',
    'booking',
    v_booking_id::text
  );
end;
$$;


create or replace function public.admin_move_payment_to_trash(
  p_payment_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment public.payments;
  normalized_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_payment_id is null then
    raise exception using errcode = '22004', message = 'INVALID_PAYMENT_ID';
  end if;

  if normalized_reason is null or length(normalized_reason) < 3 then
    raise exception using errcode = '22023', message = 'REASON_TOO_SHORT';
  end if;

  select * into target_payment
  from public.payments
  where id = p_payment_id
  for update;

  if target_payment.id is null then
    raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_FOUND';
  end if;

  -- Add entry to Trash table (trash_entries)
  if not exists (
    select 1 from public.trash_entries
    where entity_id = target_payment.id::text
      and entity_type = 'payment'
      and restored_at is null
  ) then
    insert into public.trash_entries(
      entity_type,
      entity_id,
      snapshot,
      deleted_by
    ) values (
      'payment',
      target_payment.id::text,
      jsonb_build_object(
        'payment', jsonb_build_object(
          'name', 'Transaction ' || substring(target_payment.id::text, 1, 8),
          'amount', target_payment.service_amount,
          'status', target_payment.status,
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
    'PAYMENT_TRASHED_BY_ADMIN',
    'payment',
    target_payment.id::text,
    jsonb_build_object(
      'reason', normalized_reason,
      'amount', target_payment.service_amount,
      'status', target_payment.status
    )
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', target_payment.id
  );
end;
$$;


create or replace function public.admin_restore_payment_from_trash(
  p_trash_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entity_id::uuid into v_payment_id
  from public.trash_entries
  where id = p_trash_id
    and entity_type = 'payment'
    and restored_at is null;

  if v_payment_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  update public.trash_entries
  set restored_at = now()
  where id = p_trash_id;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id
  ) values (
    auth.uid(),
    'PAYMENT_RESTORED_FROM_TRASH',
    'payment',
    v_payment_id::text
  );
end;
$$;


create or replace function public.admin_reassign_booking(
  p_booking_id uuid,
  p_worker_id uuid,
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
  worker_exists boolean;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_booking_id is null then
    raise exception using errcode = '22004', message = 'INVALID_BOOKING_ID';
  end if;

  if p_worker_id is null then
    raise exception using errcode = '22004', message = 'INVALID_WORKER_ID';
  end if;

  if normalized_reason is null or length(normalized_reason) < 3 then
    raise exception using errcode = '22023', message = 'REASON_TOO_SHORT';
  end if;

  select exists (
    select 1 from public.accounts where id = p_worker_id and role = 'WORKER'
  ) into worker_exists;

  if not worker_exists then
    raise exception using errcode = 'P0002', message = 'WORKER_NOT_FOUND';
  end if;

  select * into target_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if target_booking.id is null then
    raise exception using errcode = 'P0002', message = 'BOOKING_NOT_FOUND';
  end if;

  if upper(target_booking.status::text) in ('COMPLETED', 'CANCELLED') then
    raise exception using errcode = '55000', message = 'BOOKING_CANNOT_BE_REASSIGNED';
  end if;

  update public.bookings
  set worker_account_id = p_worker_id,
      version = coalesce(version, 0) + 1
  where id = target_booking.id;

  if target_booking.service_request_id is not null then
    update public.service_requests
    set selected_worker_id = p_worker_id,
        updated_at = now()
    where id = target_booking.service_request_id;
  end if;

  -- Give the new customer <-> worker pair a fresh conversation. The previous
  -- thread (if any) stays in the DB as unmatched history, hidden from the
  -- participants by chat_can_read/chat_can_send.
  perform public.chat_ensure_booking_conversation(target_booking.id);

  insert into public.booking_status_events(
    booking_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    target_booking.id,
    target_booking.status,
    target_booking.status,
    auth.uid(),
    'REASSIGNED: ' || normalized_reason
  );

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_REASSIGNED_BY_ADMIN',
    'booking',
    target_booking.id::text,
    jsonb_build_object(
      'previous_worker_id', target_booking.worker_account_id,
      'new_worker_id', p_worker_id,
      'reason', normalized_reason
    )
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', target_booking.id,
    'worker_account_id', p_worker_id
  );
end;
$$;

create or replace function public.admin_hard_delete_booking_from_trash(
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
  v_service_request_id uuid;
  v_payment_ids uuid[];
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'booking' then
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
    values (auth.uid(), 'BOOKING_HARD_DELETED_FROM_TRASH', 'booking', entry.entity_id);
    return;
  end if;

  select service_request_id into v_service_request_id
  from public.bookings where id = v_booking_id;

  select coalesce(array_agg(id), '{}') into v_payment_ids
  from public.payments where booking_id = v_booking_id;

  perform public._admin_hard_delete_triggers(true);

  -- leaves under payments
  delete from cash_confirmations where payment_id = any(v_payment_ids);
  delete from receipts where payment_id = any(v_payment_ids);
  delete from refunds where payment_id = any(v_payment_ids);
  -- leaves under bookings
  delete from account_reports where booking_id = v_booking_id;
  delete from booking_disputes where booking_id = v_booking_id;
  delete from booking_proof_media where booking_id = v_booking_id;
  delete from booking_status_events where booking_id = v_booking_id;
  delete from cancellations where booking_id = v_booking_id;
  delete from location_updates where booking_id = v_booking_id;
  delete from route_snapshots where booking_id = v_booking_id;
  delete from support_tickets where booking_id = v_booking_id;
  delete from wallet_transactions where booking_id = v_booking_id;
  delete from worker_feedback where booking_id = v_booking_id;
  delete from payments where booking_id = v_booking_id;
  delete from conversations where booking_id = v_booking_id;
  -- children of the linked service request
  delete from ai_analysis_jobs where service_request_id = v_service_request_id;
  delete from live_dispatch_sessions where service_request_id = v_service_request_id;
  delete from match_candidates where service_request_id = v_service_request_id;
  delete from request_bids where service_request_id = v_service_request_id;
  delete from request_media where service_request_id = v_service_request_id;
  delete from service_request_dispatches where service_request_id = v_service_request_id;
  delete from bookings where id = v_booking_id;
  delete from service_requests where id = v_service_request_id;

  perform public._admin_hard_delete_triggers(false);

  delete from public.trash_entries where id = entry.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'BOOKING_HARD_DELETED_FROM_TRASH', 'booking', entry.entity_id);
end
$$;


create or replace function public.admin_hard_delete_payment_from_trash(
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
  v_payment_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'payment' then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  if trim(coalesce(p_confirmation, '')) <> 'DELETE ' || entry.entity_id then
    raise exception using errcode = '22023', message = 'DELETE_CONFIRMATION_MISMATCH';
  end if;

  select p.id into v_payment_id
  from public.payments p
  where p.id = entry.entity_id::uuid;

  if v_payment_id is null then
    -- Payment row is already gone; remove the orphaned trash entry.
    delete from public.trash_entries where id = entry.id;

    insert into public.audit_logs(actor_id, action, entity_type, entity_id)
    values (auth.uid(), 'PAYMENT_HARD_DELETED_FROM_TRASH', 'payment', entry.entity_id);
    return;
  end if;

  perform public._admin_hard_delete_triggers(true);

  delete from cash_confirmations where payment_id = v_payment_id;
  delete from receipts where payment_id = v_payment_id;
  delete from refunds where payment_id = v_payment_id;
  delete from payments where id = v_payment_id;

  perform public._admin_hard_delete_triggers(false);

  delete from public.trash_entries where id = entry.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'PAYMENT_HARD_DELETED_FROM_TRASH', 'payment', entry.entity_id);
end
$$;

revoke execute on function public.admin_cancel_booking(uuid, text) from public, anon;
grant execute on function public.admin_cancel_booking(uuid, text) to authenticated;

revoke execute on function public.admin_restore_booking_from_trash(uuid) from public, anon;
grant execute on function public.admin_restore_booking_from_trash(uuid) to authenticated;

revoke execute on function public.admin_move_payment_to_trash(uuid, text) from public, anon;
grant execute on function public.admin_move_payment_to_trash(uuid, text) to authenticated;

revoke execute on function public.admin_restore_payment_from_trash(uuid) from public, anon;
grant execute on function public.admin_restore_payment_from_trash(uuid) to authenticated;

revoke execute on function public.admin_reassign_booking(uuid, uuid, text) from public, anon;
grant execute on function public.admin_reassign_booking(uuid, uuid, text) to authenticated;

revoke execute on function public.admin_hard_delete_booking_from_trash(uuid, text) from public, anon;
grant execute on function public.admin_hard_delete_booking_from_trash(uuid, text) to authenticated;

revoke execute on function public.admin_hard_delete_payment_from_trash(uuid, text) from public, anon;
grant execute on function public.admin_hard_delete_payment_from_trash(uuid, text) to authenticated;

notify pgrst, 'reload schema';
