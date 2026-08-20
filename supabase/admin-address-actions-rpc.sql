-- Admin RPCs for deleting customer addresses and clearing worker locations.
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--   admin_check_address_deletable(p_address_id)  -> jsonb (read-only)
--   admin_delete_user_address(p_address_id)      -> jsonb
--   admin_clear_worker_location(p_worker_id)     -> void

-- Hard-delete a customer address and its entire dependency tree using manual
-- leaf-to-root deletion (matching admin_hard_delete_skill pattern). Also
-- resets the user's verification status, sends them a notification, and
-- invalidates their auth session. Requires active bookings to be cancelled
-- first via admin_cancel_booking.
--
-- Requires: public._admin_hard_delete_triggers(boolean) (admin-hard-delete-rpcs.sql)
-- Requires: DELETE on auth.refresh_tokens for postgres role (run GRANT in SQL editor)
-- Returns:  jsonb { address_deleted, bookings_deleted, service_requests_deleted }
create or replace function public.admin_delete_user_address(
  p_address_id uuid
)
returns jsonb
language plpgsql  
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_req_ids uuid[];
  v_booking_ids uuid[];
  v_payment_ids uuid[];
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select account_id into v_owner
  from public.addresses
  where id = p_address_id;

  if v_owner is null then
    raise exception using errcode = 'P0002', message = 'ADDRESS_NOT_FOUND';
  end if;

  -- Collect IDs for the dependency tree
  select coalesce(array_agg(id), '{}') into v_req_ids
  from public.service_requests
  where address_id = p_address_id;

  select coalesce(array_agg(b.id), '{}') into v_booking_ids
  from public.bookings b
  where b.service_request_id = any(v_req_ids);

  select coalesce(array_agg(p.id), '{}') into v_payment_ids
  from public.payments p
  where p.booking_id = any(v_booking_ids);

  -- Safety: refuse if active bookings remain (caller must cancel first)
  if exists (
    select 1 from public.bookings
    where id = any(v_booking_ids)
      and status not in ('COMPLETED', 'CANCELLED')
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'ADDRESS_HAS_ACTIVE_BOOKINGS',
      detail = 'Active bookings still exist. Cancel them before deleting.';
  end if;

  -- Disable user-defined triggers (RI/constraint triggers stay active)
  perform public._admin_hard_delete_triggers(true);

  -- Payment leaves
  delete from public.cash_confirmations where payment_id = any(v_payment_ids);
  delete from public.receipts where payment_id = any(v_payment_ids);
  delete from public.refunds where payment_id = any(v_payment_ids);
  -- Booking leaves
  delete from public.account_reports where booking_id = any(v_booking_ids);
  delete from public.booking_disputes where booking_id = any(v_booking_ids);
  delete from public.booking_proof_media where booking_id = any(v_booking_ids);
  delete from public.booking_status_events where booking_id = any(v_booking_ids);
  delete from public.cancellations where booking_id = any(v_booking_ids);
  delete from public.location_updates where booking_id = any(v_booking_ids);
  delete from public.route_snapshots where booking_id = any(v_booking_ids);
  delete from public.support_tickets where booking_id = any(v_booking_ids);
  delete from public.wallet_transactions where booking_id = any(v_booking_ids);
  delete from public.worker_feedback where booking_id = any(v_booking_ids);
  delete from public.payments where booking_id = any(v_booking_ids);
  -- Cross-refs
  delete from public.conversations
    where booking_id = any(v_booking_ids) or service_request_id = any(v_req_ids);
  -- Service request children
  delete from public.ai_analysis_jobs where service_request_id = any(v_req_ids);
  delete from public.live_dispatch_sessions where service_request_id = any(v_req_ids);
  delete from public.match_candidates where service_request_id = any(v_req_ids);
  delete from public.request_bids where service_request_id = any(v_req_ids);
  delete from public.request_media where service_request_id = any(v_req_ids);
  delete from public.service_request_dispatches where service_request_id = any(v_req_ids);
  -- Bookings
  delete from public.bookings where service_request_id = any(v_req_ids);
  -- Service requests
  delete from public.service_requests where id = any(v_req_ids);
  -- Address itself
  delete from public.addresses where id = p_address_id;

  -- Re-enable triggers
  perform public._admin_hard_delete_triggers(false);

  -- Reset verification status
  update public.user_profiles
  set verification_status = 'unverified'
  where account_id = v_owner;

  -- Send notification to user
  insert into public.notifications (recipient_id, title, body, category, status, sent_at, source_key)
  values (
    v_owner,
    'Address Removed',
    'An administrator has permanently removed your saved address. Your verification status has been reset. Please log in again and update your location information.',
    'ACCOUNT',
    'SENT',
    now(),
    'admin_delete_address_' || p_address_id
  );

  -- Invalidate auth session (force logout on next API call)
  delete from auth.refresh_tokens where user_id = v_owner;

  -- Audit log
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ADMIN_DELETED_USER_ADDRESS',
    'account',
    v_owner::text,
    jsonb_build_object(
      'address_id', p_address_id,
      'bookings_deleted', cardinality(v_booking_ids),
      'service_requests_deleted', cardinality(v_req_ids)
    )
  );

  return jsonb_build_object(
    'address_deleted', true,
    'bookings_deleted', cardinality(v_booking_ids),
    'service_requests_deleted', cardinality(v_req_ids)
  );
end
$$;

revoke all on function public.admin_delete_user_address(uuid) from public, anon;
grant execute on function public.admin_delete_user_address(uuid) to authenticated;


-- Clear a worker's service area and location coordinates.
create or replace function public.admin_clear_worker_location(
  p_worker_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.worker_profiles;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select * into target
  from public.worker_profiles
  where account_id = p_worker_id
    and exists (select 1 from public.accounts where id = p_worker_id and role = 'WORKER')
  for update;

  if target.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_NOT_FOUND';
  end if;

  update public.worker_profiles
  set service_area = null,
      service_origin = null,
      service_radius_meters = null,
      location_id = null,
      updated_at = now()
  where account_id = p_worker_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ADMIN_CLEARED_WORKER_LOCATION',
    'account',
    p_worker_id::text,
    jsonb_build_object('previous_service_area', target.service_area)
  );
end
$$;

revoke all on function public.admin_clear_worker_location(uuid) from public, anon;
grant execute on function public.admin_clear_worker_location(uuid) to authenticated;

-- Check whether an address can be safely deleted.
-- Returns the list of active bookings (non-COMPLETED / non-CANCELLED) that
-- must be cancelled first, plus a count summary of all data that would be
-- permanently removed. Read-only — no side effects.
-- Optimized: single CTE chain, planner sees the full picture at once.
create or replace function public.admin_check_address_deletable(
  p_address_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_result jsonb;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select account_id into v_owner
  from public.addresses
  where id = p_address_id;

  if v_owner is null then
    raise exception using errcode = 'P0002', message = 'ADDRESS_NOT_FOUND';
  end if;

  with
  req_ids as (
    select coalesce(array_agg(id), '{}') as ids
    from public.service_requests
    where address_id = p_address_id
  ),
  booking_ids as (
    select coalesce(array_agg(b.id), '{}') as ids
    from public.bookings b
    where b.service_request_id = any(select ids from req_ids)
  ),
  active_bookings as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'service', coalesce(sc.name, 'Unknown'),
      'status', b.status::text,
      'date', to_char(b.created_at, 'Mon DD, YYYY'),
      'worker', coalesce(wp.display_name, 'Unassigned')
    )), '[]'::jsonb) as data
    from public.bookings b
    left join public.service_requests sr on sr.id = b.service_request_id
    left join public.service_categories sc on sc.id = sr.category_id
    left join public.worker_profiles wp on wp.account_id = b.worker_account_id
    where b.id = any(select ids from booking_ids)
      and b.status not in ('COMPLETED', 'CANCELLED')
  ),
  counts as (
    select
      (select cardinality(ids) from req_ids) as service_requests,
      (select cardinality(ids) from booking_ids) as bookings,
      (select count(*) from public.payments where booking_id = any(select ids from booking_ids)) as payments,
      (select count(*) from public.wallet_transactions where booking_id = any(select ids from booking_ids)) as wallet_transactions,
      (select count(*) from public.conversations
       where booking_id = any(select ids from booking_ids)
          or service_request_id = any(select ids from req_ids)) as conversations
  )
  select jsonb_build_object(
    'active_bookings', (select data from active_bookings),
    'summary', to_jsonb(counts.*)
  )
  from counts
  into v_result;

  return v_result;
end
$$;

revoke all on function public.admin_check_address_deletable(uuid) from public, anon;
grant execute on function public.admin_check_address_deletable(uuid) to authenticated;

notify pgrst, 'reload schema';
