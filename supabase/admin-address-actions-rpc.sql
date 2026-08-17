-- Admin RPCs for deleting customer addresses and clearing worker locations.
-- Run in the Supabase SQL editor. Idempotent / re-runnable.

-- Hard-delete a customer address and reset their verification status.
-- WARNING: service_requests.address_id has ON DELETE CASCADE, so any
-- service_requests linked to this address will also be deleted.
create or replace function public.admin_delete_user_address(
  p_address_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select account_id into target_owner
  from public.addresses
  where id = p_address_id;

  if target_owner is null then
    raise exception using errcode = 'P0002', message = 'ADDRESS_NOT_FOUND';
  end if;

  delete from public.addresses where id = p_address_id;

  update public.user_profiles
  set verification_status = 'unverified'
  where account_id = target_owner;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ADMIN_DELETED_USER_ADDRESS',
    'account',
    target_owner::text,
    jsonb_build_object('address_id', p_address_id)
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

notify pgrst, 'reload schema';
